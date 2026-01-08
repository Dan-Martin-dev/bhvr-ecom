import { z } from "zod";

// ============================================================================
// CART SCHEMAS
// ============================================================================

export const addToCartSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  quantity: z.number().int().min(1, "Quantity must be at least 1").default(1),
});

export const updateCartItemSchema = z.object({
  cartItemId: z.string().uuid("Invalid cart item ID"),
  quantity: z.number().int().min(0, "Quantity cannot be negative"),
});

export const removeFromCartSchema = z.object({
  cartItemId: z.string().uuid("Invalid cart item ID"),
});

export const cartIdSchema = z.object({
  cartId: z.string().uuid("Invalid cart ID"),
});

export const sessionCartSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
});

// ============================================================================
// GUEST CART (localStorage sync)
// ============================================================================

export const guestCartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
  addedAt: z.string().datetime(),
});

export const syncGuestCartSchema = z.object({
  items: z.array(guestCartItemSchema),
});

// ============================================================================
// CART RESPONSE TYPES
// ============================================================================

export const cartItemResponseSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int(),
  priceAtAdd: z.number().int(),
  product: z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    price: z.number().int(),
    stock: z.number().int(),
    images: z.array(z.object({
      url: z.string(),
      alt: z.string().nullable().optional(),
    })).optional(),
  }),
});

export const cartResponseSchema = z.object({
  id: z.string().uuid(),
  items: z.array(cartItemResponseSchema),
  subtotal: z.number().int(),
  total: z.number().int(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type RemoveFromCartInput = z.infer<typeof removeFromCartSchema>;
export type GuestCartItem = z.infer<typeof guestCartItemSchema>;
export type SyncGuestCartInput = z.infer<typeof syncGuestCartSchema>;
export type CartItem = z.infer<typeof cartItemResponseSchema>;
export type Cart = z.infer<typeof cartResponseSchema>;
