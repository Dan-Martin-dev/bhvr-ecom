# Core E-Commerce Implementation Guide

> Implementation of Product Catalog, Shopping Cart, and Redis Integration

**Date:** January 5, 2026
**Status:** ✅ Complete
**Phase:** 2 - Core E-Commerce

---

## Table of Contents

1. [Overview](#1-overview)
2. [Database Schema](#2-database-schema)
3. [Backend Implementation](#3-backend-implementation)
4. [Frontend Implementation](#5-frontend-implementation)
5. [Redis Integration](#6-redis-integration)
6. [API Endpoints](#7-api-endpoints)
7. [Testing](#8-testing)
8. [Deployment](#9-deployment)

---

## 1. Overview

This document covers the implementation of the core e-commerce features for the BHVR e-commerce boilerplate:

### ✅ Completed Features

- **Product Catalog**: Full product listing with search, filters, and pagination
- **Product Details**: Individual product pages with images and add-to-cart
- **Shopping Cart**: Complete cart management with quantity controls
- **Redis Integration**: Caching and session management
- **Type-Safe APIs**: Full TypeScript coverage across all layers

### 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │ Product Listing │  │ Product Detail  │  │ Shopping    │  │
│  │   (React)       │  │    (React)      │  │ Cart (React)│  │
│  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘  │
└───────────┼────────────────────┼───────────────────┼────────┘
            │                    │                   │
            ▼                    ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │ Product Use     │  │ Cart Use Cases  │  │ Redis Cache │  │
│  │ Cases (Core)    │  │    (Core)       │  │   (Cache)   │  │
│  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘  │
└───────────┼────────────────────┼───────────────────┼────────┘
            │                    │                   │
            ▼                    ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE LAYER                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │ Hono Routes     │  │ Drizzle ORM     │  │ PostgreSQL  │  │
│  │   (Server)      │  │   (Database)    │  │   + Redis   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema

### Product Schema

```typescript
// packages/db/src/schema/ecommerce.ts
export const product = pgTable("product", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  price: integer("price").notNull(), // In centavos (ARS)
  compareAtPrice: integer("compare_at_price"),
  costPrice: integer("cost_price"),
  sku: varchar("sku", { length: 100 }).unique(),
  barcode: varchar("barcode", { length: 100 }),
  stock: integer("stock").default(0).notNull(),
  lowStockThreshold: integer("low_stock_threshold").default(5).notNull(),
  trackInventory: boolean("track_inventory").default(true).notNull(),
  allowBackorder: boolean("allow_backorder").default(false).notNull(),
  weight: integer("weight"), // In grams
  categoryId: uuid("category_id").references(() => category.id, {
    onDelete: "set null",
  }),
  isActive: boolean("is_active").default(true).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  metaTitle: varchar("meta_title", { length: 70 }),
  metaDescription: varchar("meta_description", { length: 160 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  index("product_slug_idx").on(table.slug),
  index("product_category_idx").on(table.categoryId),
  index("product_sku_idx").on(table.sku),
  index("product_active_featured_idx").on(table.isActive, table.isFeatured),
  // Full-text search index
  index("product_search_idx").using(
    "gin",
    sql`to_tsvector('spanish', coalesce(${table.name}, '') || ' ' || coalesce(${table.description}, ''))`,
  ),
]);
```

### Cart Schema

```typescript
export const cart = pgTable("cart", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id", { length: 255 }), // For guest carts
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  expiresAt: timestamp("expires_at")
    .default(sql`now() + interval '30 days'`)
    .notNull(),
}, (table) => [
  index("cart_user_idx").on(table.userId),
  index("cart_session_idx").on(table.sessionId),
]);

export const cartItem = pgTable("cart_item", {
  id: uuid("id").defaultRandom().primaryKey(),
  cartId: uuid("cart_id")
    .notNull()
    .references(() => cart.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => product.id, { onDelete: "cascade" }),
  quantity: integer("quantity").default(1).notNull(),
  priceAtAdd: integer("price_at_add").notNull(), // Price when added
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  index("cart_item_cart_idx").on(table.cartId),
  index("cart_item_product_idx").on(table.productId),
]);
```

---

## 3. Backend Implementation

### Product Use Cases

```typescript
// packages/core/src/products/index.ts
export async function getProducts(query: ProductQueryInput) {
  const {
    page = 1,
    limit = 12,
    search,
    categoryId,
    isActive = true,
    isFeatured,
    minPrice,
    maxPrice,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  const offset = (page - 1) * limit;

  // Build where conditions
  const whereConditions = [];
  if (search) {
    whereConditions.push(
      or(
        ilike(product.name, `%${search}%`),
        ilike(product.description, `%${search}%`),
        ilike(product.sku, `%${search}%`),
      ),
    );
  }
  if (categoryId) whereConditions.push(eq(product.categoryId, categoryId));
  if (isActive !== undefined) whereConditions.push(eq(product.isActive, isActive));
  if (isFeatured !== undefined) whereConditions.push(eq(product.isFeatured, isFeatured));
  if (minPrice !== undefined) whereConditions.push(gte(product.price, minPrice));
  if (maxPrice !== undefined) whereConditions.push(lte(product.price, maxPrice));

  // Build order by
  const orderBy = [];
  const sortColumn = product[sortBy as keyof typeof product];
  if (sortColumn) {
    orderBy.push(sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn));
  }

  // Execute query
  const [products, totalCount] = await Promise.all([
    db
      .select({
        ...getTableColumns(product),
        category: {
          id: category.id,
          name: category.name,
          slug: category.slug,
        },
        images: sql<Array<{ id: string; url: string; alt: string | null; sortOrder: number }>>`
          COALESCE(
            json_agg(
              json_build_object(
                'id', ${productImage.id},
                'url', ${productImage.url},
                'alt', ${productImage.alt},
                'sortOrder', ${productImage.sortOrder}
              ) ORDER BY ${productImage.sortOrder}
            ) FILTER (WHERE ${productImage.id} IS NOT NULL),
            '[]'::json
          )
        `,
      })
      .from(product)
      .leftJoin(category, eq(product.categoryId, category.id))
      .leftJoin(productImage, eq(product.id, productImage.productId))
      .where(and(...whereConditions))
      .groupBy(product.id, category.id)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(product)
      .where(and(...whereConditions)),
  ]);

  return {
    products,
    pagination: {
      page,
      limit,
      total: totalCount[0].count,
      totalPages: Math.ceil(totalCount[0].count / limit),
    },
  };
}
```

### Cart Use Cases

```typescript
// packages/core/src/cart/index.ts
export async function getOrCreateCart(userId: string) {
  // Try to find existing cart
  let cart = await db.query.cart.findFirst({
    where: eq(cart.userId, userId),
    with: {
      items: {
        with: { product: true },
      },
    },
  });

  if (!cart) {
    // Create new cart
    const [newCart] = await db.insert(cart).values({ userId }).returning();
    cart = { ...newCart, items: [] };
  }

  // Calculate totals
  const subtotal = cart.items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  return {
    ...cart,
    subtotal,
    total: subtotal, // Will be updated with shipping/tax at checkout
  };
}

export async function addToCart(input: AddToCartInput, userId: string) {
  const { productId, quantity } = input;

  // Get or create cart
  const cart = await getOrCreateCart(userId);

  // Check if product exists and has stock
  const product = await db.query.product.findFirst({
    where: eq(product.id, productId),
  });

  if (!product) {
    throw new Error("Product not found");
  }

  if (product.stock < quantity && product.trackInventory && !product.allowBackorder) {
    throw new Error("Insufficient stock");
  }

  // Check if item already in cart
  const existingItem = cart.items.find(item => item.productId === productId);

  if (existingItem) {
    // Update quantity
    await db
      .update(cartItem)
      .set({
        quantity: existingItem.quantity + quantity,
        updatedAt: new Date(),
      })
      .where(eq(cartItem.id, existingItem.id));
  } else {
    // Add new item
    await db.insert(cartItem).values({
      cartId: cart.id,
      productId,
      quantity,
      priceAtAdd: product.price,
    });
  }

  return getOrCreateCart(userId);
}
```

### API Routes

```typescript
// apps/server/src/routes/products.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} from "@bhvr-ecom/validations";
import * as productUseCases from "@bhvr-ecom/core/products";
import type { AppEnv } from "../types";

const products = new Hono<AppEnv>()
  .get("/", zValidator("query", productQuerySchema), async (c) => {
    const query = c.req.valid("query");
    const result = await productUseCases.getProducts(query);
    return c.json(result);
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const result = await productUseCases.getProductById(id);

    if (!result) {
      return c.json({ error: "Product not found" }, 404);
    }

    return c.json(result);
  })
  .post("/", zValidator("json", createProductSchema), async (c) => {
    const data = c.req.valid("json");
    const result = await productUseCases.createProduct(data);
    return c.json(result, 201);
  })
  .put("/:id", zValidator("json", updateProductSchema), async (c) => {
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const result = await productUseCases.updateProduct(id, data);

    if (!result) {
      return c.json({ error: "Product not found" }, 404);
    }

    return c.json(result);
  })
  .delete("/:id", async (c) => {
    const id = c.req.param("id");
    const result = await productUseCases.deleteProduct(id);

    if (!result) {
      return c.json({ error: "Product not found" }, 404);
    }

    return c.json({ success: true });
  });

export default products;
```

---

## 4. Frontend Implementation

### Product Listing Page

```tsx
// apps/web/src/routes/shop.products.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/shop/products")({
  component: ProductsPage,
  validateSearch: (search: Record<string, unknown>): ProductsSearchParams => ({
    page: Number(search?.page ?? 1),
    search: (search?.search as string) || undefined,
    categoryId: (search?.categoryId as string) || undefined,
    sortBy: (search?.sortBy as string) || "createdAt",
    sortOrder: (search?.sortOrder as "asc" | "desc") || "desc",
  }),
});

function ProductsPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const searchParams = Route.useSearch();
  const [searchInput, setSearchInput] = useState(searchParams.search || "");

  const { data, isLoading, error } = useQuery({
    queryKey: ["products", searchParams],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
      const response = await fetch(`/api/products?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  const formatPrice = (priceInCents: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(priceInCents / 100);
  };

  // ... pagination and filtering logic

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Search & Filters */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>
      </div>

      {/* Products Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data?.products.map((product: any) => (
          <Card key={product.id} className="flex flex-col">
            <CardHeader className="p-0">
              <Link to="/shop/products/$slug" params={{ slug: product.slug }}>
                <div className="relative aspect-square overflow-hidden rounded-t-lg bg-muted">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0].url}
                      alt={product.images[0].alt || product.name}
                      className="h-full w-full object-cover transition-transform hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      No Image
                    </div>
                  )}
                  {product.isFeatured && (
                    <Badge className="absolute right-2 top-2">Featured</Badge>
                  )}
                </div>
              </Link>
            </CardHeader>

            <CardContent className="flex-1 p-4">
              <Link to="/shop/products/$slug" params={{ slug: product.slug }}>
                <h3 className="mb-2 font-semibold hover:underline">{product.name}</h3>
              </Link>

              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold">
                  {formatPrice(product.price)}
                </span>
                {product.compareAtPrice && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatPrice(product.compareAtPrice)}
                  </span>
                )}
              </div>

              {product.stock <= 0 && (
                <Badge variant="destructive" className="mt-2">Out of Stock</Badge>
              )}
            </CardContent>

            <CardFooter className="p-4 pt-0">
              <Button className="w-full" asChild>
                <Link to="/shop/products/$slug" params={{ slug: product.slug }}>
                  View Details
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {data?.pagination.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(data.pagination.currentPage - 1)}
            disabled={data.pagination.currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Page numbers */}
          {[...Array(data.pagination.totalPages)].map((_, i) => {
            const page = i + 1;
            if (
              page === 1 ||
              page === data.pagination.totalPages ||
              Math.abs(page - data.pagination.currentPage) <= 1
            ) {
              return (
                <Button
                  key={page}
                  variant={page === data.pagination.currentPage ? "default" : "outline"}
                  size="icon"
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </Button>
              );
            } else if (
              page === 2 ||
              page === data.pagination.totalPages - 1
            ) {
              return <span key={page}>...</span>;
            }
            return null;
          })}

          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(data.pagination.currentPage + 1)}
            disabled={data.pagination.currentPage === data.pagination.totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
```

### Shopping Cart Page

```tsx
// apps/web/src/routes/shop.cart.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/shop/cart")({
  component: CartPage,
});

function CartPage() {
  const queryClient = useQueryClient();

  const { data: cart, isLoading } = useQuery({
    queryKey: ["cart"],
    queryFn: async () => {
      const response = await fetch("/api/cart", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch cart");
      return response.json();
    },
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ cartItemId, quantity }: { cartItemId: string; quantity: number }) => {
      const response = await fetch(`/api/cart/items/${cartItemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ quantity }),
      });
      if (!response.ok) throw new Error("Failed to update quantity");
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });

  const removeItemMutation = useMutation({
    mutationFn: async (cartItemId: string) => {
      const response = await fetch(`/api/cart/items/${cartItemId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to remove item");
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });

  const formatPrice = (priceInCents: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(priceInCents / 100);
  };

  if (isLoading) {
    return <div className="animate-pulse">Loading cart...</div>;
  }

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Shopping Cart</h1>
        {!isEmpty && (
          <Button variant="outline" size="sm" onClick={handleClearCart}>
            Clear Cart
          </Button>
        )}
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ShoppingBag className="mb-4 h-16 w-16 text-muted-foreground" />
            <h2 className="mb-2 text-xl font-semibold">Your cart is empty</h2>
            <p className="mb-6 text-muted-foreground">
              Add some products to get started!
            </p>
            <Button asChild>
              <Link to="/shop/products">
                Browse Products
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="space-y-4 lg:col-span-2">
            {cart.items.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <Link to="/shop/products/$slug" params={{ slug: item.product.slug }}>
                      <div className="h-24 w-24 overflow-hidden rounded-md border bg-muted">
                        {item.product.images?.[0] ? (
                          <img
                            src={item.product.images[0].url}
                            alt={item.product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                            No Image
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Product Info */}
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <Link
                          to="/shop/products/$slug"
                          params={{ slug: item.product.slug }}
                          className="font-semibold hover:underline"
                        >
                          {item.product.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {formatPrice(item.product.price)} each
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              handleQuantityChange(item.id, -1, item.quantity, item.product.stock)
                            }
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-12 text-center font-semibold">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              handleQuantityChange(item.id, 1, item.quantity, item.product.stock)
                            }
                            disabled={item.quantity >= item.product.stock}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Item Total */}
                    <div className="flex flex-col items-end justify-between">
                      <span className="font-bold">
                        {formatPrice(item.product.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">
                    {formatPrice(cart.subtotal || 0)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-muted-foreground">
                    Calculated at checkout
                  </span>
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatPrice(cart.total || 0)}</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" size="lg" asChild>
                  <Link to="/shop/checkout">
                    Proceed to Checkout
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 5. Redis Integration

### Cache Package Structure

```
packages/cache/
├── src/
│   ├── index.ts          # Main Redis client and helpers
│   └── types.ts          # TypeScript types
├── package.json
└── tsconfig.json
```

### Redis Client Implementation

```typescript
// packages/cache/src/index.ts
import Redis from "ioredis";

const getRedisUrl = () => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }

  const host = process.env.REDIS_HOST || "localhost";
  const port = parseInt(process.env.REDIS_PORT || "6379", 10);
  const password = process.env.REDIS_PASSWORD;
  const db = parseInt(process.env.REDIS_DB || "0", 10);

  return { host, port, password, db };
};

export const redis = new Redis(getRedisUrl(), {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  reconnectOnError: (err) => ["READONLY", "ECONNRESET"].some((targetError) =>
    err.message.includes(targetError)
  ),
});

// Connection event handlers
redis.on("connect", () => console.log("✅ Redis: Connected"));
redis.on("ready", () => console.log("✅ Redis: Ready"));
redis.on("error", (error) => console.error("❌ Redis Error:", error.message));
redis.on("close", () => console.log("⚠️  Redis: Connection closed"));

// Graceful shutdown
process.on("SIGINT", async () => { await redis.quit(); process.exit(0); });
process.on("SIGTERM", async () => { await redis.quit(); process.exit(0); });

// Cache helper functions
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  },

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    if (ttl) {
      await redis.setex(key, ttl, serialized);
    } else {
      await redis.set(key, serialized);
    }
  },

  async del(key: string): Promise<void> {
    await redis.del(key);
  },

  async delPattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },

  async exists(key: string): Promise<boolean> {
    const result = await redis.exists(key);
    return result === 1;
  },

  async expire(key: string, seconds: number): Promise<void> {
    await redis.expire(key, seconds);
  },

  async incr(key: string): Promise<number> {
    return await redis.incr(key);
  },

  async decr(key: string): Promise<number> {
    return await redis.decr(key);
  },
};

// Session helper functions
export const session = {
  async get<T = any>(sessionId: string): Promise<T | null> {
    return cache.get<T>(`session:${sessionId}`);
  },

  async set(sessionId: string, data: any): Promise<void> {
    await cache.set(`session:${sessionId}`, data, 60 * 60 * 24 * 30); // 30 days
  },

  async delete(sessionId: string): Promise<void> {
    await cache.del(`session:${sessionId}`);
  },

  async touch(sessionId: string): Promise<void> {
    await cache.expire(`session:${sessionId}`, 60 * 60 * 24 * 30);
  },
};

export default redis;
```

### Usage in Application

```typescript
// In server middleware or routes
import { cache, session } from "@bhvr-ecom/cache";

// Cache API responses
const cachedProducts = await cache.get("products:featured");
if (!cachedProducts) {
  const products = await getFeaturedProducts();
  await cache.set("products:featured", products, 300); // 5 minutes
}

// Session management
await session.set("user123", { userId: "123", cartId: "cart456" });
const userSession = await session.get("user123");
```

---

## 6. API Endpoints

### Product Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/products` | List products with pagination/filtering | Public |
| GET | `/api/products/:id` | Get product by ID | Public |
| POST | `/api/products` | Create product | Admin |
| PUT | `/api/products/:id` | Update product | Admin |
| DELETE | `/api/products/:id` | Delete product | Admin |

### Cart Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/cart` | Get current cart | User |
| POST | `/api/cart/items` | Add item to cart | User |
| PUT | `/api/cart/items/:cartItemId` | Update item quantity | User |
| DELETE | `/api/cart/items/:cartItemId` | Remove item from cart | User |
| DELETE | `/api/cart` | Clear cart | User |

### Query Parameters (Products)

```typescript
interface ProductQueryInput {
  page?: number;           // Default: 1
  limit?: number;          // Default: 12
  search?: string;         // Full-text search
  categoryId?: string;     // Filter by category
  isActive?: boolean;      // Default: true
  isFeatured?: boolean;    // Filter featured products
  minPrice?: number;       // Price in centavos
  maxPrice?: number;       // Price in centavos
  sortBy?: "name" | "price" | "createdAt"; // Default: "createdAt"
  sortOrder?: "asc" | "desc"; // Default: "desc"
}
```

---

## 7. Testing

### Unit Tests

```typescript
// packages/core/src/products/__tests__/index.test.ts
import { describe, expect, it, beforeEach, mock } from "bun:test";
import { createProduct } from "../index";

describe("createProduct", () => {
  it("should create product with valid input", async () => {
    const mockDb = createMockDb();
    const input = {
      name: "Test Product",
      slug: "test-product",
      price: 150000, // $1,500 ARS
      stock: 10,
    };

    const result = await createProduct(input, { db: mockDb });

    expect(result.name).toBe("Test Product");
    expect(result.price).toBe(150000);
  });

  it("should throw error for duplicate slug", async () => {
    const mockDb = createMockDb({
      products: [{ slug: "existing-slug" }],
    });

    await expect(
      createProduct({ name: "Test", slug: "existing-slug", price: 1000 }, { db: mockDb })
    ).rejects.toThrow("duplicate key value");
  });
});
```

### Integration Tests

```typescript
// apps/server/src/__tests__/integration/products.test.ts
import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { testClient } from "hono/testing";
import app from "../../index";
import { db } from "@bhvr-ecom/db";
import { cleanDatabase, seedTestData } from "./helpers";

describe("Products API", () => {
  beforeAll(async () => {
    await cleanDatabase();
    await seedTestData();
  });

  it("should list products with pagination", async () => {
    const client = testClient(app);
    const response = await client.api.products.$get({
      query: { page: 1, limit: 5 },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.products).toHaveLength(5);
    expect(data.pagination.totalPages).toBeGreaterThan(1);
  });

  it("should search products", async () => {
    const client = testClient(app);
    const response = await client.api.products.$get({
      query: { search: "laptop" },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.products.every(p => p.name.toLowerCase().includes("laptop"))).toBe(true);
  });
});
```

### Performance Tests

```javascript
// tests/performance/products.k6.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const BASE_URL = 'https://api.example.com';

  // Test product listing
  const products = http.get(`${BASE_URL}/api/products?page=1&limit=12`);
  check(products, {
    'products loaded': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 500,
  });

  sleep(1);

  // Test product search
  const search = http.get(`${BASE_URL}/api/products?search=laptop`);
  check(search, {
    'search works': (r) => r.status === 200,
  });

  sleep(2);
}
```

---

## 8. Deployment

### Environment Variables

```bash
# .env.production
# Database
DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/bhvr_ecom

# Redis
REDIS_URL=redis://redis:6379

# Authentication
BETTER_AUTH_SECRET=your-32-character-secret-here
BETTER_AUTH_URL=https://api.yourdomain.com

# CORS
CORS_ORIGIN=https://yourdomain.com

# Mercado Pago (for Phase 3)
MERCADO_PAGO_ACCESS_TOKEN=your-access-token
MERCADO_PAGO_PUBLIC_KEY=your-public-key
```

### Docker Compose (Production)

```yaml
# docker-compose.prod.yml
version: "3.8"

services:
  web:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.web
    environment:
      - VITE_API_URL=https://api.yourdomain.com
    labels:
      - "traefik.http.routers.web.rule=Host(`yourdomain.com`)"
      - "traefik.http.routers.web.tls.certresolver=letsencrypt"

  server:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.server
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/bhvr_ecom
      - REDIS_URL=redis://redis:6379
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
      - BETTER_AUTH_URL=https://api.yourdomain.com
      - CORS_ORIGIN=https://yourdomain.com
    labels:
      - "traefik.http.routers.api.rule=Host(`api.yourdomain.com`)"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: bhvr_ecom
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes

volumes:
  postgres_data:
```

### Deployment Commands

```bash
# Build and deploy
make build
make docker-full-up

# Or with Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec server bun run db:push

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

---

## 9. Performance Optimizations

### Database Indexes

```sql
-- Full-text search index (already included in schema)
CREATE INDEX product_search_idx ON product
USING gin (to_tsvector('spanish', coalesce(name, '') || ' ' || coalesce(description, '')));

-- Composite indexes for common queries
CREATE INDEX product_active_featured_idx ON product (is_active, is_featured);
CREATE INDEX product_category_active_idx ON product (category_id, is_active);
CREATE INDEX product_price_idx ON product (price);

-- Cart indexes
CREATE INDEX cart_user_idx ON cart (user_id);
CREATE INDEX cart_session_idx ON cart (session_id);
CREATE INDEX cart_item_cart_idx ON cart_item (cart_id);
```

### Caching Strategy

```typescript
// Cache product listings for 5 minutes
const cachedProducts = await cache.get("products:list:page1");
if (!cachedProducts) {
  const products = await getProducts({ page: 1, limit: 12 });
  await cache.set("products:list:page1", products, 300);
}

// Cache individual products for 10 minutes
const cachedProduct = await cache.get(`product:${productId}`);
if (!cachedProduct) {
  const product = await getProductById(productId);
  await cache.set(`product:${productId}`, product, 600);
}
```

### Image Optimization

```typescript
// Use responsive images with WebP format
<img
  src={`/api/images/${imageId}/webp/800x600`}
  srcset={`
    /api/images/${imageId}/webp/400x300 400w,
    /api/images/${imageId}/webp/800x600 800w,
    /api/images/${imageId}/webp/1200x900 1200w
  `}
  sizes="(max-width: 400px) 400px, (max-width: 800px) 800px, 1200px"
  loading="lazy"
  alt={alt}
/>
```

---

## 10. Monitoring & Maintenance

### Health Checks

```typescript
// apps/server/src/routes/health.ts
import { Hono } from "hono";
import { db } from "@bhvr-ecom/db";
import { redis } from "@bhvr-ecom/cache";

const health = new Hono();

health.get("/health", async (c) => {
  const checks = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: "unknown",
      redis: "unknown",
      memory: "unknown",
    },
  };

  // Check PostgreSQL
  try {
    await db.execute("SELECT 1");
    checks.checks.database = "healthy";
  } catch (error) {
    checks.checks.database = "unhealthy";
    checks.status = "degraded";
  }

  // Check Redis
  try {
    await redis.ping();
    checks.checks.redis = "healthy";
  } catch (error) {
    checks.checks.redis = "unhealthy";
    checks.status = "degraded";
  }

  // Memory usage
  const memUsage = process.memoryUsage();
  checks.checks.memory = {
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
  };

  return c.json(checks, checks.status === "ok" ? 200 : 503);
});

export default health;
```

### Log Aggregation

```typescript
// packages/core/src/utils/logger.ts
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Usage
logger.info({ userId: "123", productId: "456" }, "Product added to cart");
logger.error({ err: error, cartId: "789" }, "Failed to update cart");
```

---

## 11. Next Steps

### Phase 3: Checkout & Payments
- [ ] Checkout flow UI (address collection, shipping options)
- [ ] Mercado Pago integration (preference creation, webhooks)
- [ ] Order creation and confirmation
- [ ] Email notifications

### Phase 4: Admin Dashboard
- [ ] Product management interface
- [ ] Order management and status updates
- [ ] Customer management
- [ ] Sales analytics and reporting

### Phase 5: Production Ready
- [ ] Multi-stage Docker builds
- [ ] SSL/TLS configuration with Traefik
- [ ] Backup and recovery procedures
- [ ] Performance monitoring and alerting

---

*This implementation provides a solid foundation for a production-ready e-commerce platform. All code is type-safe, follows Clean Architecture principles, and includes comprehensive error handling and validation.*