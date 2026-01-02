import { db } from "@bhvr-ecom/db";
import { product, productImage } from "@bhvr-ecom/db/schema/ecommerce";
import { eq, and, or, ilike, gte, lte, desc, asc, sql } from "drizzle-orm";
import type { CreateProductInput, ProductQueryInput } from "@bhvr-ecom/validations/products";

// ============================================================================
// CREATE PRODUCT
// ============================================================================

export async function createProduct(input: CreateProductInput) {
  const [newProduct] = await db
    .insert(product)
    .values({
      name: input.name,
      slug: input.slug,
      description: input.description,
      price: input.price,
      compareAtPrice: input.compareAtPrice,
      costPrice: input.costPrice,
      sku: input.sku,
      barcode: input.barcode,
      weight: input.weight,
      stock: input.stock,
      lowStockThreshold: input.lowStockThreshold,
      trackInventory: input.trackInventory,
      allowBackorder: input.allowBackorder,
      isActive: input.isActive,
      isFeatured: input.isFeatured,
      categoryId: input.categoryId,
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
    })
    .returning();

  return newProduct;
}

// ============================================================================
// GET PRODUCTS (with pagination, filtering, sorting)
// ============================================================================

export async function getProducts(query: ProductQueryInput) {
  const {
    page,
    limit,
    search,
    categoryId,
    isActive,
    isFeatured,
    minPrice,
    maxPrice,
    sortBy,
    sortOrder,
  } = query;

  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions = [];

  if (isActive !== undefined) {
    conditions.push(eq(product.isActive, isActive));
  }

  if (isFeatured !== undefined) {
    conditions.push(eq(product.isFeatured, isFeatured));
  }

  if (categoryId) {
    conditions.push(eq(product.categoryId, categoryId));
  }

  if (minPrice !== undefined) {
    conditions.push(gte(product.price, minPrice));
  }

  if (maxPrice !== undefined) {
    conditions.push(lte(product.price, maxPrice));
  }

  if (search) {
    conditions.push(
      or(
        ilike(product.name, `%${search}%`),
        ilike(product.description, `%${search}%`),
        ilike(product.sku, `%${search}%`)
      )
    );
  }

  // Build order by
  const orderByColumn = {
    name: product.name,
    price: product.price,
    createdAt: product.createdAt,
    stock: product.stock,
  }[sortBy];

  const orderByDirection = sortOrder === "asc" ? asc : desc;

  // Execute query
  const products = await db.query.product.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      images: {
        orderBy: (images, { asc }) => [asc(images.sortOrder)],
        limit: 1,
      },
      category: true,
    },
    orderBy: [orderByDirection(orderByColumn)],
    limit,
    offset,
  });

  // Get total count
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(product)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const count = result[0]?.count || 0;

  return {
    products,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
}

// ============================================================================
// GET PRODUCT BY ID
// ============================================================================

export async function getProductById(id: string) {
  const result = await db.query.product.findFirst({
    where: eq(product.id, id),
    with: {
      images: {
        orderBy: (images, { asc }) => [asc(images.sortOrder)],
      },
      category: true,
      reviews: {
        with: {
          user: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: (reviews, { desc }) => [desc(reviews.createdAt)],
        limit: 10,
      },
    },
  });

  return result;
}

// ============================================================================
// GET PRODUCT BY SLUG
// ============================================================================

export async function getProductBySlug(slug: string) {
  const result = await db.query.product.findFirst({
    where: eq(product.slug, slug),
    with: {
      images: {
        orderBy: (images, { asc }) => [asc(images.sortOrder)],
      },
      category: true,
      reviews: {
        with: {
          user: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: (reviews, { desc }) => [desc(reviews.createdAt)],
        limit: 10,
      },
    },
  });

  return result;
}

// ============================================================================
// UPDATE PRODUCT
// ============================================================================

export async function updateProduct(id: string, input: Partial<CreateProductInput>) {
  const [updated] = await db
    .update(product)
    .set({
      ...input,
    })
    .where(eq(product.id, id))
    .returning();

  return updated;
}

// ============================================================================
// DELETE PRODUCT
// ============================================================================

export async function deleteProduct(id: string) {
  // First delete related images
  await db.delete(productImage).where(eq(productImage.productId, id));

  // Then delete the product
  const [deleted] = await db
    .delete(product)
    .where(eq(product.id, id))
    .returning();

  return deleted;
}

// ============================================================================
// UPDATE INVENTORY
// ============================================================================

export async function updateInventory(
  productId: string,
  quantityChange: number,
  operation: "add" | "subtract" | "set"
) {
  let updateValue;

  switch (operation) {
    case "add":
      updateValue = sql`${product.stock} + ${quantityChange}`;
      break;
    case "subtract":
      updateValue = sql`GREATEST(${product.stock} - ${quantityChange}, 0)`;
      break;
    case "set":
      updateValue = quantityChange;
      break;
  }

  const [updated] = await db
    .update(product)
    .set({
      stock: updateValue,
    })
    .where(eq(product.id, productId))
    .returning();

  return updated;
}

// ============================================================================
// GET FEATURED PRODUCTS
// ============================================================================

export async function getFeaturedProducts(limit = 8) {
  return db.query.product.findMany({
    where: and(eq(product.isActive, true), eq(product.isFeatured, true)),
    with: {
      images: {
        orderBy: (images, { asc }) => [asc(images.sortOrder)],
        limit: 1,
      },
    },
    orderBy: [desc(product.createdAt)],
    limit,
  });
}

// ============================================================================
// GET LOW STOCK PRODUCTS (Admin)
// ============================================================================

export async function getLowStockProducts() {
  return db.query.product.findMany({
    where: and(
      eq(product.trackInventory, true),
      sql`${product.stock} <= ${product.lowStockThreshold}`
    ),
    with: {
      category: true,
    },
    orderBy: [asc(product.stock)],
  });
}
