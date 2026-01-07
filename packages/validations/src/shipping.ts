import { z } from "zod";

// ============================================================================
// SHIPPING ZONE ENUM (Shared across validations)
// ============================================================================

export const shippingZoneEnum = z.enum(["amba", "interior", "pickup"]);
export type ShippingZone = z.infer<typeof shippingZoneEnum>;

// ============================================================================
// SHIPPING METHOD SCHEMAS
// ============================================================================

export const createShippingMethodSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  baseCost: z.number().int().min(0, "Base cost must be non-negative"),
  costPerKg: z.number().int().min(0).default(0),
  zones: z.array(shippingZoneEnum).min(1, "At least one zone is required"),
  minDeliveryDays: z.number().int().min(0, "Min delivery days must be non-negative"),
  maxDeliveryDays: z.number().int().min(0, "Max delivery days must be non-negative"),
  freeShippingThreshold: z.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
}).refine(
  (data) => data.maxDeliveryDays >= data.minDeliveryDays,
  {
    message: "Max delivery days must be greater than or equal to min delivery days",
    path: ["maxDeliveryDays"],
  }
);

export const updateShippingMethodSchema = createShippingMethodSchema.partial().extend({
  id: z.string().uuid("Invalid shipping method ID"),
});

export const shippingMethodIdSchema = z.object({
  id: z.string().uuid("Invalid shipping method ID"),
});

export const getShippingMethodsSchema = z.object({
  zone: shippingZoneEnum.optional(),
  isActive: z.boolean().optional(),
  sortBy: z.enum(["sortOrder", "name", "baseCost"]).default("sortOrder"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export const calculateShippingSchema = z.object({
  shippingMethodId: z.string().uuid("Invalid shipping method ID"),
  cartTotal: z.number().int().min(0, "Cart total must be non-negative"),
  weight: z.number().min(0, "Weight must be non-negative").optional(),
  zone: shippingZoneEnum,
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateShippingMethodInput = z.infer<typeof createShippingMethodSchema>;
export type UpdateShippingMethodInput = z.infer<typeof updateShippingMethodSchema>;
export type GetShippingMethodsInput = z.infer<typeof getShippingMethodsSchema>;
export type CalculateShippingInput = z.infer<typeof calculateShippingSchema>;
