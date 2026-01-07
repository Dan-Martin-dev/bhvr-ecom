import { z } from "zod";

// ============================================================================
// PRODUCT VARIANT SCHEMAS
// ============================================================================

export const createProductVariantSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  name: z.string().min(1, "Variant name is required").max(255),
  size: z.string().max(50).optional(),
  color: z.string().max(50).optional(),
  material: z.string().max(50).optional(),
  style: z.string().max(50).optional(),
  sku: z.string().min(1, "SKU is required").max(100),
  barcode: z.string().max(100).optional(),
  price: z.number().int().min(0).optional(), // In centavos
  compareAtPrice: z.number().int().min(0).optional(),
  stock: z.number().int().min(0).default(0),
  weight: z.number().int().min(0).optional(), // In grams
  imageId: z.string().uuid().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateProductVariantSchema = createProductVariantSchema
  .partial()
  .omit({ productId: true });

export const variantQuerySchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  includeInactive: z.boolean().default(false),
});

export const variantIdSchema = z.object({
  id: z.string().uuid("Invalid variant ID"),
});

// ============================================================================
// BULK VARIANT SCHEMAS (for creating multiple variants at once)
// ============================================================================

const bulkVariantItemSchema = createProductVariantSchema.omit({
  productId: true,
});

export const bulkCreateVariantsSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  variants: z
    .array(bulkVariantItemSchema)
    .min(1, "At least one variant is required"),
});

export type BulkVariantItem = z.infer<typeof bulkVariantItemSchema>;

// ============================================================================
// VARIANT OPTION SCHEMAS (for defining available options)
// ============================================================================

export const variantOptionsSchema = z.object({
  sizes: z.array(z.string()).default([]),
  colors: z.array(z.string()).default([]),
  materials: z.array(z.string()).default([]),
  styles: z.array(z.string()).default([]),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateProductVariantInput = z.infer<typeof createProductVariantSchema>;
export type UpdateProductVariantInput = z.infer<typeof updateProductVariantSchema>;
export type VariantQueryInput = z.infer<typeof variantQuerySchema>;
export type BulkCreateVariantsInput = z.infer<typeof bulkCreateVariantsSchema>;
export type VariantOptions = z.infer<typeof variantOptionsSchema>;
