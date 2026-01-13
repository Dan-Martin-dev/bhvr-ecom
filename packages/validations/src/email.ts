import { z } from "zod";

// ============================================================================
// Email Validations
// ============================================================================

/**
 * Base email parameters schema
 */
export const baseEmailSchema = z.object({
  to: z.string().email("Invalid email address"),
  replyTo: z.string().email("Invalid reply-to email address").optional(),
});

/**
 * Password reset email parameters
 */
export const passwordResetEmailSchema = baseEmailSchema.extend({
  userName: z.string().min(1, "User name is required"),
  resetUrl: z.string().url("Invalid reset URL"),
  expiresIn: z.string().default("1 hour"),
});

/**
 * Order item schema for email
 */
export const orderItemEmailSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  quantity: z.number().int().positive("Quantity must be positive"),
  price: z.number().int().nonnegative("Price must be non-negative"),
  imageUrl: z.string().url().optional(),
});

/**
 * Shipping address schema for email
 */
export const shippingAddressEmailSchema = z.object({
  street: z.string().min(1, "Street is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
});

/**
 * Order confirmation email parameters
 */
export const orderConfirmationEmailSchema = baseEmailSchema.extend({
  customerName: z.string().min(1, "Customer name is required"),
  orderNumber: z.string().min(1, "Order number is required"),
  orderDate: z.string().min(1, "Order date is required"),
  items: z.array(orderItemEmailSchema).min(1, "At least one item is required"),
  subtotal: z.number().int().nonnegative("Subtotal must be non-negative"),
  shipping: z.number().int().nonnegative("Shipping cost must be non-negative"),
  total: z.number().int().nonnegative("Total must be non-negative"),
  shippingAddress: shippingAddressEmailSchema,
  trackingUrl: z.string().url().optional(),
});

/**
 * Welcome email parameters
 */
export const welcomeEmailSchema = baseEmailSchema.extend({
  userName: z.string().min(1, "User name is required"),
  loginUrl: z.string().url("Invalid login URL"),
});

// ============================================================================
// Inferred Types
// ============================================================================

export type BaseEmailParams = z.infer<typeof baseEmailSchema>;
export type PasswordResetEmailParams = z.infer<typeof passwordResetEmailSchema>;
export type OrderItemEmail = z.infer<typeof orderItemEmailSchema>;
export type ShippingAddressEmail = z.infer<typeof shippingAddressEmailSchema>;
export type OrderConfirmationEmailParams = z.infer<typeof orderConfirmationEmailSchema>;
export type WelcomeEmailParams = z.infer<typeof welcomeEmailSchema>;
