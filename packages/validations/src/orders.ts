import { z } from "zod";
import { shippingZoneEnum, type ShippingZone } from "./shipping";

// ============================================================================
// ADDRESS SCHEMAS
// ============================================================================

export const addressSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  company: z.string().max(100).optional(),
  address1: z.string().min(1, "Address is required").max(255),
  address2: z.string().max(255).optional(),
  city: z.string().min(1, "City is required").max(100),
  province: z.string().min(1, "Province is required").max(100),
  postalCode: z.string().min(1, "Postal code is required").max(20),
  country: z.string().min(2).max(2).default("AR"), // ISO 3166-1 alpha-2
  phone: z.string().min(8, "Phone number is required").max(20),
});

export const savedAddressSchema = addressSchema.extend({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  label: z.string().max(50).optional(), // "Casa", "Trabajo", etc.
  isDefault: z.boolean().default(false),
});

// ============================================================================
// ORDER SCHEMAS
// ============================================================================

export const orderStatusEnum = z.enum([
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

export const paymentStatusEnum = z.enum([
  "pending",
  "approved",
  "rejected",
  "refunded",
  "cancelled",
]);

export const createOrderSchema = z.object({
  cartId: z.string().uuid("Invalid cart ID"),
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  shippingZone: shippingZoneEnum,
  notes: z.string().max(500).optional(),
  couponCode: z.string().max(50).optional(),
});

export const updateOrderStatusSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
  status: orderStatusEnum,
  trackingNumber: z.string().max(100).optional(),
  trackingUrl: z.string().url().optional(),
  internalNotes: z.string().max(1000).optional(),
});

export const orderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: orderStatusEnum.optional(),
  userId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  sortBy: z.enum(["createdAt", "total", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const orderIdSchema = z.object({
  id: z.string().uuid("Invalid order ID"),
});

export const orderNumberSchema = z.object({
  orderNumber: z.string().regex(/^ORD-\d{4}-\d{4}$/, "Invalid order number"),
});

// ============================================================================
// ORDER ITEM SCHEMAS
// ============================================================================

export const orderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
  priceSnapshot: z.number().int().min(0),
  productName: z.string(),
  productSlug: z.string(),
  productSku: z.string().optional(),
});

// ============================================================================
// COUPON SCHEMAS
// ============================================================================

export const discountTypeEnum = z.enum(["percentage", "fixed"]);

export const createCouponSchema = z.object({
  code: z
    .string()
    .min(3, "Code must be at least 3 characters")
    .max(50)
    .toUpperCase(),
  description: z.string().max(255).optional(),
  discountType: discountTypeEnum,
  discountValue: z.number().min(0),
  minimumPurchase: z.number().int().min(0).optional(), // In centavos
  maximumDiscount: z.number().int().min(0).optional(), // In centavos (for percentage)
  usageLimit: z.number().int().min(1).optional(),
  usageLimitPerUser: z.number().int().min(1).optional(),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  isActive: z.boolean().default(true),
});

export const applyCouponSchema = z.object({
  code: z.string().min(1, "Coupon code is required").toUpperCase(),
  cartId: z.string().uuid("Invalid cart ID"),
});

// ============================================================================
// RESPONSE SCHEMAS (for frontend consumption)
// ============================================================================

export const orderResponseSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string(),
  status: orderStatusEnum,
  total: z.number().int(),
  createdAt: z.string(),
  items: z.array(z.object({
    id: z.string().uuid(),
    productName: z.string(),
    quantity: z.number().int(),
  })),
});

export const ordersResponseSchema = z.object({
  orders: z.array(orderResponseSchema),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Address = z.infer<typeof addressSchema>;
export type SavedAddress = z.infer<typeof savedAddressSchema>;
export type { ShippingZone }; // Re-export from shipping module
export type OrderStatus = z.infer<typeof orderStatusEnum>;
export type PaymentStatus = z.infer<typeof paymentStatusEnum>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type OrderQueryInput = z.infer<typeof orderQuerySchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
export type DiscountType = z.infer<typeof discountTypeEnum>;
export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;
export type Order = z.infer<typeof orderResponseSchema>;
export type OrdersResponse = z.infer<typeof ordersResponseSchema>;
