import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createOrderSchema } from "@bhvr-ecom/validations";
import { db } from "@bhvr-ecom/db";
import { cart, cartItem, product, order, orderItem } from "@bhvr-ecom/db/schema/ecommerce";
import { eq, sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { env } from "@bhvr-ecom/env/server";
import type { AppEnv } from "../types";

const checkout = new Hono<AppEnv>();

// Interface for Mercado Pago SDK (if installed)
interface MercadoPagoItem {
  id: string;
  title: string;
  description?: string;
  quantity: number;
  unit_price: number;
  currency_id: "ARS";
}

interface MercadoPagoBackUrls {
  success: string;
  failure: string;
  pending: string;
}

// Calculate shipping cost based on zone
function calculateShippingCost(zone: string, weightGrams: number = 0): number {
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

// Generate order number
async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(order)
    .where(sql`EXTRACT(YEAR FROM ${order.createdAt}) = ${year}`);

  const count = result[0]?.count || 0;
  const orderNum = (count + 1).toString().padStart(4, "0");
  return `ORD-${year}-${orderNum}`;
}

/**
 * POST /api/checkout/mercadopago
 * Create Mercado Pago payment preference and return init_point
 */
checkout.post(
  "/mercadopago",
  authMiddleware,
  zValidator("json", createOrderSchema),
  async (c) => {
    const user = c.get("user");
    const input = c.req.valid("json");

    try {
      // 1. Fetch cart with items
      const userCart = await db.query.cart.findFirst({
        where: eq(cart.id, input.cartId),
        with: {
          items: {
            with: {
              product: true,
            },
          },
        },
      });

      if (!userCart || !userCart.items?.length) {
        return c.json({ error: "Cart is empty" }, 400);
      }

      // 2. Validate stock for all items
      for (const item of userCart.items) {
        if (item.product.trackInventory && !item.product.allowBackorder) {
          if (item.product.stock < item.quantity) {
            return c.json(
              { error: `Insufficient stock for ${item.product.name}` },
              400
            );
          }
        }
      }

      // 3. Calculate totals
      const subtotal = userCart.items.reduce(
        (sum, item) => sum + item.priceAtAdd * item.quantity,
        0
      );

      const totalWeight = userCart.items.reduce(
        (sum, item) => sum + (item.product.weight || 0) * item.quantity,
        0
      );

      const shippingCost = calculateShippingCost(input.shippingZone, totalWeight);
      const total = subtotal + shippingCost;

      // 4. Generate order number
      const orderNumber = await generateOrderNumber();

      // 5. Create order in database
      const [newOrder] = await db
        .insert(order)
        .values({
          orderNumber,
          userId: user.id,
          status: "pending",
          subtotal,
          shippingCost,
          total,
          paymentMethod: "mercadopago",
          shippingFullName: `${input.shippingAddress.firstName} ${input.shippingAddress.lastName}`,
          shippingPhone: input.shippingAddress.phone,
          shippingStreet: input.shippingAddress.address1,
          shippingNumber: input.shippingAddress.address2 || "",
          shippingCity: input.shippingAddress.city,
          shippingProvince: input.shippingAddress.province,
          shippingPostalCode: input.shippingAddress.postalCode,
          shippingZone: input.shippingZone,
          customerNotes: input.notes,
        })
        .returning();

      // 6. Create order items
      const orderItems = userCart.items.map((item) => ({
        orderId: newOrder.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.priceAtAdd,
        total: item.priceAtAdd * item.quantity,
        productName: item.product.name,
        productSku: item.product.sku,
        productImage: item.product.images?.[0]?.url,
      }));

      await db.insert(orderItem).values(orderItems);

      // 7. Create Mercado Pago preference
      const mercadoPagoAccessToken = env.MERCADO_PAGO_ACCESS_TOKEN;

      if (!mercadoPagoAccessToken) {
        return c.json(
          { error: "Mercado Pago not configured. Please contact support." },
          500
        );
      }

      // Prepare items for Mercado Pago
      const mpItems: MercadoPagoItem[] = userCart.items.map((item) => ({
        id: item.product.id,
        title: item.product.name,
        description: item.product.description?.substring(0, 100),
        quantity: item.quantity,
        unit_price: item.priceAtAdd / 100, // Convert centavos to pesos
        currency_id: "ARS",
      }));

      // Add shipping as item if > 0
      if (shippingCost > 0) {
        mpItems.push({
          id: "shipping",
          title: `Envío - ${input.shippingZone.toUpperCase()}`,
          quantity: 1,
          unit_price: shippingCost / 100,
          currency_id: "ARS",
        });
      }

      const backUrls: MercadoPagoBackUrls = {
        success: `${env.BETTER_AUTH_URL}/shop/order/success?orderId=${newOrder.id}`,
        failure: `${env.BETTER_AUTH_URL}/shop/order/failure?orderId=${newOrder.id}`,
        pending: `${env.BETTER_AUTH_URL}/shop/order/pending?orderId=${newOrder.id}`,
      };

      // Create preference via Mercado Pago API
      const preferenceResponse = await fetch(
        "https://api.mercadopago.com/checkout/preferences",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${mercadoPagoAccessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: mpItems,
            back_urls: backUrls,
            auto_return: "approved",
            external_reference: newOrder.id,
            statement_descriptor: "BHVR-ECOM",
            payer: {
              name: input.shippingAddress.firstName,
              surname: input.shippingAddress.lastName,
              email: user.email,
              phone: {
                number: input.shippingAddress.phone,
              },
              address: {
                street_name: input.shippingAddress.address1,
                street_number: "",
                zip_code: input.shippingAddress.postalCode,
              },
            },
            notification_url: `${env.BETTER_AUTH_URL}/api/webhooks/mercadopago`,
          }),
        }
      );

      if (!preferenceResponse.ok) {
        const errorData = await preferenceResponse.json();
        console.error("Mercado Pago API Error:", errorData);
        return c.json(
          { error: "Failed to create payment preference" },
          500
        );
      }

      const preference = await preferenceResponse.json();

      // 8. Update order with preference ID (add paymentPreferenceId column or store in paymentId)
      await db
        .update(order)
        .set({ paymentId: preference.id })
        .where(eq(order.id, newOrder.id));

      // 9. Return init_point for redirect
      return c.json({
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        preferenceId: preference.id,
        initPoint: preference.init_point,
        sandboxInitPoint: preference.sandbox_init_point,
      });
    } catch (error) {
      console.error("Checkout error:", error);
      return c.json(
        { error: "Failed to process checkout", message: error instanceof Error ? error.message : "Unknown error" },
        500
      );
    }
  }
);

export default checkout;
