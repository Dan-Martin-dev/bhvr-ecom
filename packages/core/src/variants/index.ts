import { db } from "@bhvr-ecom/db";
import { productVariant, product } from "@bhvr-ecom/db/schema/ecommerce";
import { eq, and, desc } from "drizzle-orm";
import type {
  CreateProductVariantInput,
  UpdateProductVariantInput,
  VariantQueryInput,
  BulkCreateVariantsInput,
  BulkVariantItem,
} from "@bhvr-ecom/validations";

// ============================================================================
// CREATE VARIANT
// ============================================================================

export async function createVariant(input: CreateProductVariantInput) {
  // Verify product exists
  const productExists = await db.query.product.findFirst({
    where: eq(product.id, input.productId),
  });

  if (!productExists) {
    throw new Error("Product not found");
  }

  // Check if SKU already exists
  const existingSku = await db.query.productVariant.findFirst({
    where: eq(productVariant.sku, input.sku),
  });

  if (existingSku) {
    throw new Error(`SKU "${input.sku}" already exists`);
  }

  const [newVariant] = await db
    .insert(productVariant)
    .values(input)
    .returning();

  return newVariant;
}

// ============================================================================
// BULK CREATE VARIANTS
// ============================================================================

export async function bulkCreateVariants(input: BulkCreateVariantsInput) {
  // Verify product exists
  const productExists = await db.query.product.findFirst({
    where: eq(product.id, input.productId),
  });

  if (!productExists) {
    throw new Error("Product not found");
  }

  // Check for duplicate SKUs in the input
  const skus = input.variants.map((v: BulkVariantItem) => v.sku);
  const uniqueSkus = new Set(skus);
  if (skus.length !== uniqueSkus.size) {
    throw new Error("Duplicate SKUs in input");
  }

  // Check if any SKUs already exist
  const existingSkus = await db.query.productVariant.findMany({
    where: (variants, { inArray }) => inArray(variants.sku, skus),
    columns: { sku: true },
  });

  if (existingSkus.length > 0) {
    const duplicates = existingSkus.map((s) => s.sku).join(", ");
    throw new Error(`SKUs already exist: ${duplicates}`);
  }

  // Create all variants
  const variantsWithProductId = input.variants.map((v: BulkVariantItem) => ({
    ...v,
    productId: input.productId,
  }));

  const newVariants = await db
    .insert(productVariant)
    .values(variantsWithProductId)
    .returning();

  return newVariants;
}

// ============================================================================
// GET VARIANTS BY PRODUCT
// ============================================================================

export async function getVariantsByProduct(query: VariantQueryInput) {
  const variants = await db.query.productVariant.findMany({
    where: query.includeInactive
      ? eq(productVariant.productId, query.productId)
      : and(
          eq(productVariant.productId, query.productId),
          eq(productVariant.isActive, true),
        ),
    with: {
      image: true,
    },
    orderBy: [desc(productVariant.sortOrder), desc(productVariant.createdAt)],
  });

  return variants;
}

// ============================================================================
// GET VARIANT BY ID
// ============================================================================

export async function getVariantById(id: string) {
  const variant = await db.query.productVariant.findFirst({
    where: eq(productVariant.id, id),
    with: {
      product: {
        columns: {
          id: true,
          name: true,
          slug: true,
          price: true,
        },
      },
      image: true,
    },
  });

  return variant;
}

// ============================================================================
// UPDATE VARIANT
// ============================================================================

export async function updateVariant(
  id: string,
  input: UpdateProductVariantInput,
) {
  // If SKU is being updated, check it doesn't already exist
  if (input.sku) {
    const sku = input.sku; // Type narrowing
    const existingSku = await db.query.productVariant.findFirst({
      where: (variants, { and, eq, ne }) =>
        and(eq(variants.sku, sku), ne(variants.id, id)),
    });

    if (existingSku) {
      throw new Error(`SKU "${sku}" already exists`);
    }
  }

  const [updated] = await db
    .update(productVariant)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(productVariant.id, id))
    .returning();

  if (!updated) {
    throw new Error("Variant not found");
  }

  return updated;
}

// ============================================================================
// DELETE VARIANT
// ============================================================================

export async function deleteVariant(id: string) {
  const [deleted] = await db
    .delete(productVariant)
    .where(eq(productVariant.id, id))
    .returning();

  if (!deleted) {
    throw new Error("Variant not found");
  }

  return deleted;
}

// ============================================================================
// CHECK VARIANT STOCK
// ============================================================================

export async function checkVariantStock(id: string, quantity: number) {
  const variant = await db.query.productVariant.findFirst({
    where: eq(productVariant.id, id),
    columns: {
      id: true,
      stock: true,
      isActive: true,
    },
  });

  if (!variant) {
    throw new Error("Variant not found");
  }

  if (!variant.isActive) {
    throw new Error("Variant is not active");
  }

  return variant.stock >= quantity;
}

// ============================================================================
// UPDATE VARIANT STOCK
// ============================================================================

export async function updateVariantStock(
  id: string,
  quantity: number,
  operation: "increment" | "decrement",
) {
  const variant = await db.query.productVariant.findFirst({
    where: eq(productVariant.id, id),
    columns: { stock: true },
  });

  if (!variant) {
    throw new Error("Variant not found");
  }

  const newStock =
    operation === "increment"
      ? variant.stock + quantity
      : Math.max(0, variant.stock - quantity);

  const [updated] = await db
    .update(productVariant)
    .set({ stock: newStock })
    .where(eq(productVariant.id, id))
    .returning();

  return updated;
}

// ============================================================================
// GET AVAILABLE VARIANT OPTIONS FOR PRODUCT
// ============================================================================

export async function getVariantOptions(productId: string) {
  const variants = await db.query.productVariant.findMany({
    where: and(
      eq(productVariant.productId, productId),
      eq(productVariant.isActive, true),
    ),
    columns: {
      size: true,
      color: true,
      material: true,
      style: true,
    },
  });

  // Extract unique values for each option type
  const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];
  const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))];
  const materials = [...new Set(variants.map((v) => v.material).filter(Boolean))];
  const styles = [...new Set(variants.map((v) => v.style).filter(Boolean))];

  return {
    sizes,
    colors,
    materials,
    styles,
  };
}
