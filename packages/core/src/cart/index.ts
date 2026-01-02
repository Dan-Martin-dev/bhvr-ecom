import { db } from "@bhvr-ecom/db";
import { cart, cartItem, product } from "@bhvr-ecom/db/schema/ecommerce";
import { eq, and } from "drizzle-orm";
import type { AddToCartInput, UpdateCartItemInput } from "@bhvr-ecom/validations/cart";

// ============================================================================
// GET OR CREATE CART
// ============================================================================

export async function getOrCreateCart(userId?: string, sessionId?: string) {
  if (!userId && !sessionId) {
    throw new Error("Either userId or sessionId is required");
  }

  // Try to find existing cart
  let existingCart = await db.query.cart.findFirst({
    where: userId
      ? eq(cart.userId, userId)
      : eq(cart.sessionId, sessionId!),
    with: {
      items: {
        with: {
          product: {
            with: {
              images: {
                limit: 1,
                orderBy: (images, { asc }) => [asc(images.sortOrder)],
              },
            },
          },
        },
      },
    },
  });

  // Create new cart if not found
  if (!existingCart) {
    const [newCart] = await db
      .insert(cart)
      .values({
        userId: userId || null,
        sessionId: userId ? null : sessionId,
      })
      .returning();

    return {
      ...newCart!,
      items: [],
    };
  }

  return existingCart;
}

// ============================================================================
// ADD TO CART
// ============================================================================

export async function addToCart(
  input: AddToCartInput,
  userId?: string,
  sessionId?: string
) {
  const userCart = await getOrCreateCart(userId, sessionId);

  // Check if product exists and is active
  const productData = await db.query.product.findFirst({
    where: and(eq(product.id, input.productId), eq(product.isActive, true)),
  });

  if (!productData) {
    throw new Error("Product not found or inactive");
  }

  // Check stock
  if (productData.trackInventory && !productData.allowBackorder) {
    if (productData.stock < input.quantity) {
      throw new Error(`Only ${productData.stock} items available`);
    }
  }

  // Check if item already in cart
  const existingItem = userCart.items?.find(
    (item) => item.productId === input.productId
  );

  if (existingItem) {
    // Update quantity
    const newQuantity = existingItem.quantity + input.quantity;

    // Check stock for new quantity
    if (productData.trackInventory && !productData.allowBackorder) {
      if (productData.stock < newQuantity) {
        throw new Error(`Only ${productData.stock} items available`);
      }
    }

    const [updated] = await db
      .update(cartItem)
      .set({
        quantity: newQuantity,
        priceAtAdd: productData.price,
      })
      .where(eq(cartItem.id, existingItem.id))
      .returning();

    return updated;
  }

  // Add new item
  const [newItem] = await db
    .insert(cartItem)
    .values({
      cartId: userCart.id,
      productId: input.productId,
      quantity: input.quantity,
      priceAtAdd: productData.price,
    })
    .returning();

  return newItem;
}

// ============================================================================
// UPDATE CART ITEM
// ============================================================================

export async function updateCartItem(input: UpdateCartItemInput) {
  // If quantity is 0, remove the item
  if (input.quantity === 0) {
    return removeFromCart(input.cartItemId);
  }

  // Get current item with product
  const item = await db.query.cartItem.findFirst({
    where: eq(cartItem.id, input.cartItemId),
    with: {
      product: true,
    },
  });

  if (!item) {
    throw new Error("Cart item not found");
  }

  // Check stock
  if (item.product.trackInventory && !item.product.allowBackorder) {
    if (item.product.stock < input.quantity) {
      throw new Error(`Only ${item.product.stock} items available`);
    }
  }

  const [updated] = await db
    .update(cartItem)
    .set({
      quantity: input.quantity,
      priceAtAdd: item.product.price,
    })
    .where(eq(cartItem.id, input.cartItemId))
    .returning();

  return updated;
}

// ============================================================================
// REMOVE FROM CART
// ============================================================================

export async function removeFromCart(cartItemId: string) {
  const [deleted] = await db
    .delete(cartItem)
    .where(eq(cartItem.id, cartItemId))
    .returning();

  return deleted;
}

// ============================================================================
// CLEAR CART
// ============================================================================

export async function clearCart(cartId: string) {
  await db.delete(cartItem).where(eq(cartItem.cartId, cartId));
  return { success: true };
}

// ============================================================================
// GET CART WITH TOTALS
// ============================================================================

export async function getCartWithTotals(userId?: string, sessionId?: string) {
  const userCart = await getOrCreateCart(userId, sessionId);

  // Calculate totals
  const items = userCart.items || [];
  const subtotal = items.reduce(
    (sum, item) => sum + item.priceAtAdd * item.quantity,
    0
  );
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    ...userCart,
    subtotal,
    itemCount,
  };
}

// ============================================================================
// SYNC GUEST CART (merge guest cart into user cart on login)
// ============================================================================

export async function syncGuestCart(
  userId: string,
  guestSessionId: string
) {
  // Get guest cart
  const guestCart = await db.query.cart.findFirst({
    where: eq(cart.sessionId, guestSessionId),
    with: {
      items: true,
    },
  });

  if (!guestCart || !guestCart.items?.length) {
    return; // Nothing to sync
  }

  // Get or create user cart
  const userCart = await getOrCreateCart(userId);

  // Merge items
  for (const item of guestCart.items) {
    const existingItem = userCart.items?.find(
      (i) => i.productId === item.productId
    );

    if (existingItem) {
      // Update quantity (take the higher)
      await db
        .update(cartItem)
        .set({
          quantity: Math.max(existingItem.quantity, item.quantity),
        })
        .where(eq(cartItem.id, existingItem.id));
    } else {
      // Add item to user cart
      await db.insert(cartItem).values({
        cartId: userCart.id,
        productId: item.productId,
        quantity: item.quantity,
        priceAtAdd: item.priceAtAdd,
      });
    }
  }

  // Delete guest cart
  await db.delete(cartItem).where(eq(cartItem.cartId, guestCart.id));
  await db.delete(cart).where(eq(cart.id, guestCart.id));
}

// ============================================================================
// TRANSFER CART (assign session cart to user)
// ============================================================================

export async function transferCartToUser(sessionId: string, userId: string) {
  // Check if user already has a cart
  const existingUserCart = await db.query.cart.findFirst({
    where: eq(cart.userId, userId),
  });

  if (existingUserCart) {
    // Merge carts
    await syncGuestCart(userId, sessionId);
  } else {
    // Transfer session cart to user
    await db
      .update(cart)
      .set({
        userId,
        sessionId: null,
      })
      .where(eq(cart.sessionId, sessionId));
  }
}
