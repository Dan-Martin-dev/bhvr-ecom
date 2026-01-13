import { db } from "@bhvr-ecom/db";
import { order, orderItem, cart, cartItem, product, coupon } from "@bhvr-ecom/db/schema/ecommerce";
import { user } from "@bhvr-ecom/db/schema/auth";
import { eq, and, sql, desc } from "drizzle-orm";
import type { CreateOrderInput, UpdateOrderStatusInput, OrderQueryInput } from "@bhvr-ecom/validations/orders";
import { sendOrderConfirmationEmail } from "@bhvr-ecom/email";

// ============================================================================
// SHIPPING COST CALCULATION
// ============================================================================

function calculateShippingCost(zone: string, weightGrams: number = 0): number {
  // Base costs in centavos (ARS)
  const baseCosts: Record<string, number> = {
    amba: 50000, // $500 ARS
    interior: 100000, // $1000 ARS
    pickup: 0, // Free
  };

  let cost = baseCosts[zone] || 100000;

  // Additional cost per kg (for weight > 1kg)
  if (weightGrams > 1000) {
    const additionalKg = (weightGrams - 1000) / 1000;
    cost += Math.ceil(additionalKg) * 20000; // $200 per additional kg
  }

  return cost;
}

// ============================================================================
// GENERATE ORDER NUMBER
// ============================================================================

async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();

  // Get count of orders this year
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(order)
    .where(sql`EXTRACT(YEAR FROM ${order.createdAt}) = ${year}`);

  const count = result[0]?.count || 0;
  const orderNum = (count + 1).toString().padStart(4, "0");
  return `ORD-${year}-${orderNum}`;
}

// ============================================================================
// CREATE ORDER
// ============================================================================

export async function createOrder(input: CreateOrderInput, userId?: string) {
  // Get cart with items
  const userCart = await db.query.cart.findFirst({
    where: eq(cart.id, input.cartId),
    with: {
      items: {
        with: {
          product: {
            with: {
              images: true,
            },
          },
        },
      },
    },
  });

  if (!userCart || !userCart.items?.length) {
    throw new Error("Cart is empty");
  }

  // Validate stock for all items
  for (const item of userCart.items) {
    if (item.product.trackInventory && !item.product.allowBackorder) {
      if (item.product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${item.product.name}`);
      }
    }
  }

  // Calculate totals
  const subtotal = userCart.items.reduce(
    (sum, item) => sum + item.priceAtAdd * item.quantity,
    0
  );

  // Calculate total weight
  const totalWeight = userCart.items.reduce(
    (sum, item) => sum + (item.product.weight || 0) * item.quantity,
    0
  );

  const shippingCost = calculateShippingCost(input.shippingZone, totalWeight);

  // Apply coupon if provided
  let discount = 0;
  let appliedCoupon = null;

  if (input.couponCode) {
    appliedCoupon = await db.query.coupon.findFirst({
      where: and(
        eq(coupon.code, input.couponCode.toUpperCase()),
        eq(coupon.isActive, true)
      ),
    });

    if (appliedCoupon) {
      // Check if coupon is valid
      const now = new Date();
      if (appliedCoupon.startsAt && appliedCoupon.startsAt > now) {
        throw new Error("Coupon is not yet active");
      }
      if (appliedCoupon.expiresAt && appliedCoupon.expiresAt < now) {
        throw new Error("Coupon has expired");
      }
      if (appliedCoupon.usageLimit && appliedCoupon.usedCount >= appliedCoupon.usageLimit) {
        throw new Error("Coupon usage limit reached");
      }
      if (appliedCoupon.minimumOrder && subtotal < appliedCoupon.minimumOrder) {
        throw new Error(`Minimum purchase of ${appliedCoupon.minimumOrder / 100} required`);
      }

      // Calculate discount
      if (appliedCoupon.discountType === "percentage") {
        discount = Math.floor(subtotal * (appliedCoupon.discountValue / 100));
        if (appliedCoupon.maxDiscount && discount > appliedCoupon.maxDiscount) {
          discount = appliedCoupon.maxDiscount;
        }
      } else {
        discount = appliedCoupon.discountValue;
      }
    }
  }

  const total = subtotal + shippingCost - discount;

  // Generate order number
  const orderNumber = await generateOrderNumber();

  // Create order in transaction
  const newOrder = await db.transaction(async (tx) => {
    // Create order
    const [createdOrder] = await tx
      .insert(order)
      .values({
        orderNumber,
        userId: userId || null,
        status: "pending",
        paymentMethod: "mercadopago",
        paymentStatus: "pending",
        subtotal,
        shippingCost,
        discount,
        total,
        shippingZone: input.shippingZone,
        shippingFullName: `${input.shippingAddress.firstName} ${input.shippingAddress.lastName}`,
        shippingPhone: input.shippingAddress.phone,
        shippingStreet: input.shippingAddress.address1,
        shippingNumber: input.shippingAddress.address2 || "",
        shippingCity: input.shippingAddress.city,
        shippingProvince: input.shippingAddress.province,
        shippingPostalCode: input.shippingAddress.postalCode,
        shippingNotes: input.notes,
        customerNotes: input.notes,
      })
      .returning();

    // Create order items
    for (const item of userCart.items) {
      await tx.insert(orderItem).values({
        orderId: createdOrder!.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.priceAtAdd,
        total: item.priceAtAdd * item.quantity,
        productName: item.product.name,
        productSku: item.product.sku || null,
      });

      // Decrement inventory
      if (item.product.trackInventory) {
        await tx
          .update(product)
          .set({
            stock: sql`GREATEST(${product.stock} - ${item.quantity}, 0)`,
          })
          .where(eq(product.id, item.productId));
      }
    }

    // Update coupon usage
    if (appliedCoupon) {
      await tx
        .update(coupon)
        .set({
          usedCount: sql`${coupon.usedCount} + 1`,
        })
        .where(eq(coupon.id, appliedCoupon.id));
    }

    // Clear cart
    await tx.delete(cartItem).where(eq(cartItem.cartId, userCart.id));

    return createdOrder;
  });

  // Send order confirmation email (async, don't block order creation)
  if (newOrder) {
    // Get user email if userId is provided
    let customerEmail = "";
    let customerName = `${input.shippingAddress.firstName} ${input.shippingAddress.lastName}`;

    if (userId && !customerEmail) {
      const userData = await db.query.user.findFirst({
        where: eq(user.id, userId),
        columns: { email: true, name: true },
      });
      if (userData) {
        customerEmail = userData.email;
        if (userData.name) customerName = userData.name;
      }
    }

    // Send email asynchronously (don't await to avoid blocking)
    if (customerEmail) {
      sendOrderConfirmationEmail({
        to: customerEmail,
        customerName,
        orderNumber: newOrder.orderNumber,
        orderDate: newOrder.createdAt.toLocaleDateString(),
        items: userCart.items.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.priceAtAdd,
          imageUrl: item.product.images?.[0]?.url || undefined,
        })),
        subtotal,
        shipping: shippingCost,
        total,
        shippingAddress: {
          street: input.shippingAddress.address1,
          city: input.shippingAddress.city,
          state: input.shippingAddress.province,
          postalCode: input.shippingAddress.postalCode,
          country: "Argentina",
        },
      }).catch((error) => {
        console.error("Failed to send order confirmation email:", error);
        // Don't throw - order was created successfully
      });
    }
  }

  return newOrder;
}

// ============================================================================
// GET ORDER BY ID
// ============================================================================

export async function getOrderById(orderId: string, userId?: string) {
  const conditions = [eq(order.id, orderId)];

  // If userId provided, ensure order belongs to user
  if (userId) {
    conditions.push(eq(order.userId, userId));
  }

  return db.query.order.findFirst({
    where: and(...conditions),
    with: {
      items: true,
    },
  });
}

// ============================================================================
// GET ORDER BY NUMBER
// ============================================================================

export async function getOrderByNumber(orderNumber: string, userId?: string) {
  const conditions = [eq(order.orderNumber, orderNumber)];

  if (userId) {
    conditions.push(eq(order.userId, userId));
  }

  return db.query.order.findFirst({
    where: and(...conditions),
    with: {
      items: true,
    },
  });
}

// ============================================================================
// GET USER ORDERS
// ============================================================================

export async function getUserOrders(userId: string, query: OrderQueryInput) {
  const { page, limit, status } = query;
  const offset = (page - 1) * limit;

  const conditions = [eq(order.userId, userId)];

  if (status) {
    conditions.push(eq(order.status, status));
  }

  const orders = await db.query.order.findMany({
    where: and(...conditions),
    with: {
      items: true,
    },
    orderBy: [desc(order.createdAt)],
    limit,
    offset,
  });

  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(order)
    .where(and(...conditions));

  const count = result[0]?.count || 0;

  return {
    orders,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
}

// ============================================================================
// UPDATE ORDER STATUS (Admin)
// ============================================================================

export async function updateOrderStatus(input: UpdateOrderStatusInput) {
  const [updated] = await db
    .update(order)
    .set({
      status: input.status,
      trackingNumber: input.trackingNumber,
      trackingUrl: input.trackingUrl,
      internalNotes: input.internalNotes,
    })
    .where(eq(order.id, input.orderId))
    .returning();

  return updated;
}

// ============================================================================
// CANCEL ORDER
// ============================================================================

export async function cancelOrder(orderId: string, userId?: string) {
  // Get order
  const existingOrder = await getOrderById(orderId, userId);

  if (!existingOrder) {
    throw new Error("Order not found");
  }

  if (!["pending", "paid"].includes(existingOrder.status)) {
    throw new Error("Order cannot be cancelled");
  }

  // Restore inventory
  await db.transaction(async (tx) => {
    for (const item of existingOrder.items || []) {
      await tx
        .update(product)
        .set({
          stock: sql`${product.stock} + ${item.quantity}`,
        })
        .where(eq(product.id, item.productId));
    }

    // Update order status
    await tx
      .update(order)
      .set({
        status: "cancelled",
      })
      .where(eq(order.id, orderId));
  });

  return { success: true };
}

// ============================================================================
// GET ALL ORDERS (Admin)
// ============================================================================

export async function getAllOrders(query: OrderQueryInput) {
  const { page, limit, status, userId, startDate, endDate } = query;
  const offset = (page - 1) * limit;

  const conditions = [];

  if (status) {
    conditions.push(eq(order.status, status));
  }

  if (userId) {
    conditions.push(eq(order.userId, userId));
  }

  if (startDate) {
    conditions.push(sql`${order.createdAt} >= ${startDate}`);
  }

  if (endDate) {
    conditions.push(sql`${order.createdAt} <= ${endDate}`);
  }

  const orders = await db.query.order.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      items: true,
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [desc(order.createdAt)],
    limit,
    offset,
  });

  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(order)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const count = result[0]?.count || 0;

  return {
    orders,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
}
