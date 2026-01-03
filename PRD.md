# OpenCommercium - Product Definition Report (PDR)

> A High-Performance, Self-Hosted E-Commerce Boilerplate

**Version:** 1.0.0
**Date:** January 2026
**Author:** Solution Architecture Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Functional Requirements](#2-functional-requirements)
3. [Technical Specification](#3-technical-specification)
4. [Infrastructure Design](#4-infrastructure-design)
5. [Roadmap](#5-roadmap)
6. [Appendix](#6-appendix)

---

## 1. Executive Summary

### 1.1 Vision

bhvr-ecom is an open-source, high-performance e-commerce boilerplate designed for developers and businesses seeking complete control over their online store infrastructure. Built on the modern BHVR stack (Bun, Hono, Vite, Redis/PostgreSQL), it prioritizes speed, developer experience, and self-hosting capabilities.

### 1.2 Value Proposition

| For | Value |
|-----|-------|
| **Developers** | Type-safe, modern stack with excellent DX. No vendor lock-in. Full codebase ownership. |
| **Small Businesses** | Cost-effective alternative to SaaS platforms. One-time setup, no monthly platform fees. |
| **Enterprises** | Customizable foundation for complex requirements. Complete data sovereignty. |
| **Open Source Community** | Reference implementation of Clean Architecture with BHVR stack. |

### 1.3 Key Differentiators

- **🚀 Performance First**: Bun runtime + Hono framework = sub-10ms API responses
- **🔒 Self-Hosted**: Deploy anywhere, own your data, no vendor lock-in
- **🏗️ Clean Architecture**: Maintainable, testable, scalable codebase
- **🐳 Docker Native**: One command deployment with `docker-compose up`
- **💰 Cost Effective**: Runs on $5/month VPS (Hetzner CX22)
- **🔧 Developer First**: TypeScript end-to-end, hot reload, excellent tooling

### 1.4 Success Metrics

| Metric | Target |
|--------|--------|
| Time to First Store | < 30 minutes |
| API Response Time (p95) | < 50ms |
| Lighthouse Performance Score | > 90 |
| Docker Image Size | < 200MB |
| Monthly Hosting Cost (MVP) | < €10 |

---

## 2. Functional Requirements

### 2.1 MVP Feature Matrix

#### 2.1.1 Authentication & Authorization

| Feature | Priority | Description |
|---------|----------|-------------|
| Email/Password Auth | P0 | Basic registration and login |
| OAuth Providers | P1 | Google, GitHub integration |
| Session Management | P0 | Secure cookie-based sessions |
| Password Reset | P0 | Email-based password recovery |
| Role-Based Access | P0 | Admin, Customer, Guest roles |
| Account Management | P1 | Profile updates, email change |

**User Stories:**

```gherkin
Feature: User Authentication
  Scenario: Customer Registration
    Given I am on the registration page
    When I submit valid email and password
    Then I receive a verification email
    And I am redirected to the storefront

  Scenario: Admin Login
    Given I am an admin user
    When I login with valid credentials
    Then I am redirected to the admin dashboard
    And I have access to admin-only features
```

#### 2.1.2 Product Management

| Feature | Priority | Description |
|---------|----------|-------------|
| Product CRUD | P0 | Create, read, update, delete products |
| Product Variants | P1 | Size, color, material variations |
| Categories | P0 | Hierarchical category tree |
| Product Images | P0 | Multiple images per product |
| Inventory Tracking | P0 | Stock levels, low stock alerts |
| Product Search | P1 | Full-text search with filters |
| SEO Metadata | P1 | Meta titles, descriptions, slugs |

**Data Model:**

```typescript
interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;           // In cents (integer)
  compareAtPrice?: number; // Original price for sales
  sku: string;
  barcode?: string;
  inventory: number;
  isActive: boolean;
  categoryId: string;
  images: ProductImage[];
  variants: ProductVariant[];
  metadata: ProductMetadata;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 2.1.3 Shopping Cart

| Feature | Priority | Description |
|---------|----------|-------------|
| Add to Cart | P0 | Add products with quantity |
| Update Quantity | P0 | Increment/decrement items |
| Remove Items | P0 | Delete items from cart |
| Cart Persistence | P0 | Survive page refresh/session |
| Guest Cart | P1 | Cart for non-authenticated users |
| Cart Merge | P1 | Merge guest cart on login |
| Cart Summary | P0 | Subtotal, taxes, shipping estimate |

**State Management Strategy:**

- **Authenticated Users**: Server-side cart (PostgreSQL)
- **Guest Users**: Client-side cart (localStorage + Redis for session)
- **Merge Strategy**: On login, merge client cart → server cart (newer wins)

#### 2.1.4 Checkout & Orders

| Feature | Priority | Description |
|---------|----------|-------------|
| Checkout Flow | P0 | Multi-step or single-page checkout |
| Shipping Address | P0 | Address collection and validation |
| Shipping Methods | P1 | Multiple shipping options |
| Payment Integration | P0 | Mercado Pago (Argentina) |
| Order Creation | P0 | Convert cart to order |
| Order Confirmation | P0 | Email + confirmation page |
| Order History | P1 | Customer order list |
| Order Status | P0 | Pending, Paid, Shipped, Delivered |

**Checkout State Machine:**

```
┌─────────┐    ┌──────────┐    ┌─────────┐    ┌──────────┐    ┌───────────┐
│  Cart   │───▶│ Shipping │───▶│ Payment │───▶│ Confirm  │───▶│ Completed │
└─────────┘    └──────────┘    └─────────┘    └──────────┘    └───────────┘
     │              │               │              │
     └──────────────┴───────────────┴──────────────┘
                    (Can go back)
```

#### 2.1.5 Admin Dashboard

| Feature | Priority | Description |
|---------|----------|-------------|
| Dashboard Overview | P1 | Sales, orders, visitors stats |
| Product Management | P0 | CRUD interface for products |
| Order Management | P0 | View, update order status |
| Customer Management | P1 | View customer list and details |
| Settings | P1 | Store configuration |

### 2.2 Non-Functional Requirements

| Requirement | Specification |
|-------------|---------------|
| **Performance** | API p95 < 50ms, TTFB < 200ms |
| **Scalability** | Handle 1000 concurrent users on single VPS |
| **Security** | OWASP Top 10 compliance, HTTPS enforced |
| **Availability** | 99.5% uptime target |
| **Data Integrity** | ACID transactions for orders |
| **Observability** | Structured logging, health checks |

---

## 3. Technical Specification

### 3.1 BHVR Stack Deep Dive

#### 3.1.1 Bun (Runtime)

**Why Bun:**

- 4x faster than Node.js for most operations
- Built-in TypeScript support (no transpilation step)
- Native SQLite driver (useful for testing)
- Faster package installation than npm/yarn/pnpm
- Drop-in Node.js replacement

**Configuration:**

```toml
# bunfig.toml
[install]
optional = false

[install.lockfile]
print = "yarn"
```

#### 3.1.2 Hono (Backend Framework)

**Why Hono:**

- Fastest web framework for edge/serverless
- Express-like API, easy learning curve
- Built-in middleware ecosystem
- First-class TypeScript support
- Works with any runtime (Bun, Deno, Node, Cloudflare)

**Server Structure:**

```typescript
// apps/server/src/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "@opencommercium/auth";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", cors({ origin: env.CORS_ORIGIN, credentials: true }));

// Routes
app.route("/api/auth", auth.handler);
app.route("/api/products", productsRouter);
app.route("/api/cart", cartRouter);
app.route("/api/orders", ordersRouter);
app.route("/api/admin", adminRouter);

// Health check
app.get("/health", (c) => c.json({ status: "ok", timestamp: Date.now() }));

export default app;
```

#### 3.1.3 Vite + React (Frontend)

**Why Vite:**

- Instant dev server startup (ESM-based)
- Lightning-fast HMR
- Optimized production builds
- Rich plugin ecosystem

**Frontend Stack:**

| Layer | Technology |
|-------|------------|
| UI Framework | React 19 |
| Routing | TanStack Router (file-based, type-safe) |
| State (Server) | TanStack Query |
| State (Client) | React Context / Zustand (if needed) |
| Forms | TanStack Form + Zod |
| Styling | Tailwind CSS 4 |
| Components | shadcn/ui |

#### 3.1.4 PostgreSQL + Redis

**PostgreSQL (Primary Database):**

- ACID compliance for order transactions
- Rich query capabilities (JSONB for metadata)
- Excellent Drizzle ORM support
- Battle-tested at scale

**Redis (Cache & Sessions):**

- Session storage for Better Auth
- Cart storage for guest users
- API response caching
- Rate limiting

### 3.2 Monorepo Structure

```bash
opencommercium/
├── apps/
│   ├── web/                          # React storefront
│   │   ├── src/
│   │   │   ├── components/           # UI components
│   │   │   │   ├── ui/               # shadcn primitives
│   │   │   │   ├── shop/             # Store components
│   │   │   │   └── admin/            # Admin components
│   │   │   ├── routes/               # TanStack Router pages
│   │   │   │   ├── __root.tsx
│   │   │   │   ├── (shop)/           # Public store routes
│   │   │   │   ├── (auth)/           # Auth pages
│   │   │   │   └── admin/            # Admin dashboard
│   │   │   ├── lib/                  # Frontend utilities
│   │   │   │   ├── api.ts            # API client
│   │   │   │   ├── auth-client.ts    # Better Auth client
│   │   │   │   └── utils.ts
│   │   │   └── hooks/                # Custom React hooks
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── server/                       # Hono API server
│       ├── src/
│       │   ├── index.ts              # Entry point
│       │   ├── routes/               # API routes (Controllers)
│       │   │   ├── products.ts
│       │   │   ├── cart.ts
│       │   │   ├── orders.ts
│       │   │   └── admin/
│       │   └── middleware/           # Hono middleware
│       │       ├── auth.ts
│       │       └── error.ts
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── auth/                         # Better Auth configuration
│   │   └── src/
│   │       └── index.ts
│   │
│   ├── db/                           # Database layer
│   │   ├── src/
│   │   │   ├── index.ts              # Drizzle client export
│   │   │   ├── schema/               # Drizzle schemas (Entities)
│   │   │   │   ├── index.ts
│   │   │   │   ├── auth.ts
│   │   │   │   ├── products.ts
│   │   │   │   ├── orders.ts
│   │   │   │   └── cart.ts
│   │   │   └── migrations/           # Drizzle migrations
│   │   ├── scripts/
│   │   │   ├── init.sql
│   │   │   └── seed.ts
│   │   └── drizzle.config.ts
│   │
│   ├── core/                         # Business Logic (Use Cases)
│   │   └── src/
│   │       ├── products/
│   │       │   ├── create-product.ts
│   │       │   ├── get-products.ts
│   │       │   └── update-inventory.ts
│   │       ├── cart/
│   │       │   ├── add-to-cart.ts
│   │       │   ├── update-cart.ts
│   │       │   └── get-cart.ts
│   │       ├── orders/
│   │       │   ├── create-order.ts
│   │       │   ├── process-payment.ts
│   │       │   └── update-status.ts
│   │       └── types/                # Shared types/interfaces
│   │           └── index.ts
│   │
│   ├── validations/                  # Zod schemas
│   │   └── src/
│   │       ├── index.ts
│   │       ├── products.ts
│   │       ├── cart.ts
│   │       ├── orders.ts
│   │       └── auth.ts
│   │
│   ├── env/                          # Environment validation
│   │   └── src/
│   │       ├── server.ts
│   │       └── web.ts
│   │
│   └── config/                       # Shared configs
│       ├── tsconfig.base.json
│       └── package.json
│
├── infrastructure/                   # Deployment configs
│   ├── docker/
│   │   ├── Dockerfile.web
│   │   ├── Dockerfile.server
│   │   └── docker-compose.prod.yml
│   ├── traefik/
│   │   └── traefik.yml
│   └── scripts/
│       ├── deploy.sh
│       └── backup.sh
│
├── docker-compose.yml                # Development
├── docker-compose.prod.yml           # Production
├── turbo.json
├── package.json
└── README.md
```

### 3.3 Clean Architecture Implementation

#### Layer Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│  │   React Web     │  │   Hono Routes   │  │   Admin Panel   │   │
│  │   (apps/web)    │  │  (Controllers)  │  │   (apps/web)    │   │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘   │
└───────────┼────────────────────┼────────────────────┼────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                          │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Use Cases (packages/core)                 │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │ │
│  │  │ CreateOrder  │ │ AddToCart    │ │ ProcessPayment       │ │ │
│  │  └──────────────┘ └──────────────┘ └──────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                         DOMAIN LAYER                              │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Entities & Business Rules                       │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐│ │
│  │  │ Product  │ │  Order   │ │   Cart   │ │      User        ││ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘│ │
│  └─────────────────────────────────────────────────────────────┘ │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                      INFRASTRUCTURE LAYER                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │  PostgreSQL  │ │    Redis     │ │ Mercado Pago │             │
│  │   (Drizzle)  │ │  (Sessions)  │ │   (Gateway)  │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
└──────────────────────────────────────────────────────────────────┘
```

#### Example: Order Creation Use Case

```typescript
// packages/core/src/orders/create-order.ts
import { db } from "@opencommercium/db";
import { orders, orderItems, products } from "@opencommercium/db/schema";
import { CreateOrderInput, Order } from "@opencommercium/validations";

interface CreateOrderDeps {
  db: typeof db;
  paymentGateway: PaymentGateway;
  emailService: EmailService;
}

export async function createOrder(
  input: CreateOrderInput,
  deps: CreateOrderDeps
): Promise<Order> {
  const { db, paymentGateway, emailService } = deps;

  // 1. Validate cart items exist and have stock
  const cartItems = await db.query.cartItems.findMany({
    where: eq(cartItems.cartId, input.cartId),
    with: { product: true },
  });

  if (cartItems.length === 0) {
    throw new Error("Cart is empty");
  }

  // 2. Check inventory
  for (const item of cartItems) {
    if (item.quantity > item.product.inventory) {
      throw new Error(`Insufficient stock for ${item.product.name}`);
    }
  }

  // 3. Calculate totals
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const shipping = calculateShipping(input.shippingAddress);
  const tax = calculateTax(subtotal, input.shippingAddress);
  const total = subtotal + shipping + tax;

  // 4. Create order in transaction
  const order = await db.transaction(async (tx) => {
    // Create order
    const [newOrder] = await tx.insert(orders).values({
      userId: input.userId,
      status: "pending",
      subtotal,
      shipping,
      tax,
      total,
      shippingAddress: input.shippingAddress,
      billingAddress: input.billingAddress,
    }).returning();

    // Create order items
    await tx.insert(orderItems).values(
      cartItems.map((item) => ({
        orderId: newOrder.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.product.price,
      }))
    );

    // Decrement inventory
    for (const item of cartItems) {
      await tx
        .update(products)
        .set({ inventory: sql`${products.inventory} - ${item.quantity}` })
        .where(eq(products.id, item.productId));
    }

    // Clear cart
    await tx.delete(cartItems).where(eq(cartItems.cartId, input.cartId));

    return newOrder;
  });

  // 5. Send confirmation email (async, don't block)
  emailService.sendOrderConfirmation(order).catch(console.error);

  return order;
}
```

### 3.4 Database Schema

```typescript
// packages/db/src/schema/products.ts
import { pgTable, uuid, varchar, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  price: integer("price").notNull(), // In cents
  compareAtPrice: integer("compare_at_price"),
  sku: varchar("sku", { length: 100 }).unique(),
  barcode: varchar("barcode", { length: 100 }),
  inventory: integer("inventory").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  categoryId: uuid("category_id").references(() => categories.id),
  metadata: jsonb("metadata").$type<ProductMetadata>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  parentId: uuid("parent_id").references(() => categories.id),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const productImages = pgTable("product_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  alt: varchar("alt", { length: 255 }),
  sortOrder: integer("sort_order").default(0),
});

// packages/db/src/schema/orders.ts
export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
  userId: uuid("user_id").references(() => user.id),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  subtotal: integer("subtotal").notNull(),
  shipping: integer("shipping").notNull().default(0),
  tax: integer("tax").notNull().default(0),
  total: integer("total").notNull(),
  shippingAddress: jsonb("shipping_address").$type<Address>().notNull(),
  billingAddress: jsonb("billing_address").$type<Address>(),
  paymentMethod: varchar("payment_method", { length: 50 }),
  paymentId: varchar("payment_id", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  variantId: uuid("variant_id").references(() => productVariants.id),
  name: varchar("name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 100 }),
  quantity: integer("quantity").notNull(),
  price: integer("price").notNull(),
});

// packages/db/src/schema/cart.ts
export const carts = pgTable("carts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => user.id),
  sessionId: varchar("session_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cartItems = pgTable("cart_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  cartId: uuid("cart_id").references(() => carts.id).notNull(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  variantId: uuid("variant_id").references(() => productVariants.id),
  quantity: integer("quantity").notNull().default(1),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});
```

### 3.5 API Design

#### RESTful Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| **Products** ||||
| GET | `/api/products` | List products (paginated) | Public |
| GET | `/api/products/:slug` | Get product by slug | Public |
| POST | `/api/products` | Create product | Admin |
| PATCH | `/api/products/:id` | Update product | Admin |
| DELETE | `/api/products/:id` | Delete product | Admin |
| PATCH | `/api/admin/products/:id/inventory` | Update inventory | Admin |
| **Categories** ||||
| GET | `/api/categories` | List categories | Public |
| GET | `/api/categories/:slug` | Get category with products | Public |
| POST | `/api/categories` | Create category | Admin |
| PATCH | `/api/categories/:id` | Update category | Admin |
| DELETE | `/api/categories/:id` | Delete category | Admin |
| **Cart** ||||
| GET | `/api/cart` | Get current cart | User/Guest |
| POST | `/api/cart/items` | Add item to cart | User/Guest |
| PATCH | `/api/cart/items/:id` | Update item quantity | User/Guest |
| DELETE | `/api/cart/items/:id` | Remove item | User/Guest |
| **Orders** | | | |
| POST | `/api/orders` | Create order | User |
| GET | `/api/orders` | List user orders | User |
| GET | `/api/orders/:id` | Get order details | User |
| **Checkout** | | | |
| POST | `/api/checkout/mercadopago` | Create payment preference | User |
| **Webhooks** | | | |
| POST | `/api/webhooks/mercadopago` | Payment notification | Public* |
| **Admin** | | | |
| GET | `/api/admin/orders` | List all orders | Admin |
| PATCH | `/api/admin/orders/:id/status` | Update order status | Admin |
| GET | `/api/admin/dashboard` | Dashboard stats | Admin |

### 3.6 Payment Integration: Mercado Pago

Mercado Pago is integrated as the primary payment gateway for Argentina and Latin America. This section covers the complete implementation architecture.

#### 3.6.1 Mercado Pago Credentials & Setup

**Required Credentials:**

- **Access Token** (long-lived) - For server-side API calls
- **Public Key** - For client-side integrations (if needed)
- **Webhook Secret** - For signature verification (optional but recommended)

**Getting Credentials:**

1. Go to [Mercado Pago Developer Panel](https://www.mercadopago.com.ar/developers/panel/app)
2. Create or select your application
3. Copy credentials to `.env`:

```bash
MERCADO_PAGO_ACCESS_TOKEN=APP_USR_...
MERCADO_PAGO_PUBLIC_KEY=APP_USR_...
MERCADO_PAGO_WEBHOOK_SECRET=your-webhook-secret
```

#### 3.6.2 Payment Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      CHECKOUT FLOW                               │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  1. CUSTOMER CHECKOUT (React Frontend)                    │   │
│  │     - Fill shipping & billing address                     │   │
│  │     - Select payment method (Mercado Pago)               │   │
│  │     - Click "Checkout" button                            │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  2. CREATE PAYMENT PREFERENCE (Hono Server)              │   │
│  │     POST /api/checkout/mercadopago                       │   │
│  │     - Validate cart & inventory                          │   │
│  │     - Calculate shipping, tax, total                     │   │
│  │     - Call Mercado Pago API                             │   │
│  │     - Save preference_id to database                     │   │
│  │     - Return init_point URL                             │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  3. REDIRECT TO MERCADO PAGO                             │   │
│  │     - Frontend redirects to init_point URL               │   │
│  │     - Customer completes payment at MP checkout          │   │
│  │     - MP handles payment processing                      │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         │                                        │
│        ┌────────────────┼────────────────┐                      │
│        │                │                │                      │
│   APPROVED         REJECTED           PENDING                   │
│        │                │                │                      │
│        ▼                ▼                ▼                      │
│  ┌────────────┐   ┌───────────┐   ┌──────────┐               │
│  │ Redirect   │   │ Redirect  │   │ Redirect │               │
│  │ to success │   │ to error  │   │ to pend  │               │
│  │ page       │   │ page      │   │ page     │               │
│  └────────────┘   └───────────┘   └──────────┘               │
│        │                │                │                      │
│        └────────────────┼────────────────┘                      │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  4. WEBHOOK NOTIFICATION (Async)                         │   │
│  │     POST /api/webhooks/mercadopago                       │   │
│  │     - MP sends payment status update                     │   │
│  │     - Verify webhook signature                          │   │
│  │     - Fetch payment details from MP API                 │   │
│  │     - Update order status in database                   │   │
│  │     - Send confirmation email to customer              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 3.6.3 Server-Side Implementation

**Create Payment Preference:**

```typescript
// apps/server/src/routes/checkout.ts
import { Hono } from "hono";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { db } from "@opencommercium/db";
import { 
  CreateOrderInput, 
  createOrderSchema 
} from "@opencommercium/validations";
import { env } from "@opencommercium/env/server";
import { authMiddleware } from "../middleware/auth";

const checkout = new Hono();

// Initialize Mercado Pago client
const mpClient = new MercadoPagoConfig({
  accessToken: env.MERCADO_PAGO_ACCESS_TOKEN,
  options: {
    timeout: 5000,
  },
});

const preferenceClient = new Preference(mpClient);

interface MercadoPagoItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number; // In pesos (float)
  currency_id: "ARS" | "USD";
}

/**
 * POST /api/checkout/mercadopago
 * Create Mercado Pago payment preference
 */
checkout.post("/mercadopago", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();

  try {
    // Validate input
    const input = createOrderSchema.parse({
      ...body,
      userId,
    });

    // Fetch cart items
    const cart = await db.query.carts.findFirst({
      where: (carts, { eq }) => eq(carts.userId, userId),
      with: {
        items: {
          with: { product: true },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return c.json({ error: "Cart is empty" }, 400);
    }

    // Validate inventory
    for (const item of cart.items) {
      if (item.quantity > item.product.inventory) {
        return c.json(
          {
            error: `Insufficient stock for ${item.product.name}`,
          },
          400
        );
      }
    }

    // Calculate totals
    const subtotal = cart.items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    const shippingCost = input.shippingMethod?.cost || 0;
    const taxAmount = Math.round(subtotal * 0.21); // 21% VAT (ARS)
    const total = subtotal + shippingCost + taxAmount;

    // Convert to pesos (prices are stored in cents)
    const items: MercadoPagoItem[] = cart.items.map((item) => ({
      id: item.product.id,
      title: item.product.name,
      quantity: item.quantity,
      unit_price: item.product.price / 100, // Convert cents to pesos
      currency_id: "ARS",
    }));

    // Generate order number (e.g., ORD-2026-0001)
    const orderCount = await db.query.orders.findMany({
      where: (orders, { eq }) => eq(orders.userId, userId),
    });
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(orderCount.length + 1).padStart(4, "0")}`;

    // Create pending order in database
    const [order] = await db
      .insert(orders)
      .values({
        userId,
        orderNumber,
        status: "pending",
        subtotal,
        shipping: shippingCost,
        tax: taxAmount,
        total,
        shippingAddress: input.shippingAddress,
        billingAddress: input.billingAddress || input.shippingAddress,
      })
      .returning();

    // Create order items
    await db.insert(orderItems).values(
      cart.items.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        name: item.product.name,
        sku: item.product.sku,
        quantity: item.quantity,
        price: item.product.price,
      }))
    );

    // Create Mercado Pago preference
    const preference = await preferenceClient.create({
      body: {
        items: [
          ...items,
          {
            id: "shipping",
            title: "Shipping",
            quantity: 1,
            unit_price: shippingCost / 100,
            currency_id: "ARS",
          },
          {
            id: "tax",
            title: "VAT (21%)",
            quantity: 1,
            unit_price: taxAmount / 100,
            currency_id: "ARS",
          },
        ],
        payer: {
          email: input.payer.email,
          name: input.payer.name,
          phone: input.payer.phone
            ? {
                number: input.payer.phone,
              }
            : undefined,
          address: {
            street_name: input.shippingAddress.street,
            street_number: parseInt(input.shippingAddress.streetNumber || "0"),
            zip_code: input.shippingAddress.postalCode,
          },
        },
        back_urls: {
          success: `${env.VITE_BASE_URL}/order-confirmation?orderId=${order.id}`,
          failure: `${env.VITE_BASE_URL}/checkout?error=payment_failed`,
          pending: `${env.VITE_BASE_URL}/order-confirmation?orderId=${order.id}`,
        },
        auto_return: "approved",
        external_reference: order.id,
        notification_url: `${env.VITE_BASE_URL}/api/webhooks/mercadopago`,
        statement_descriptor: "OpenCommercium Store",
        payment_methods: {
          excluded_payment_methods: [],
          excluded_payment_types: [],
          installments: 12,
        },
      },
    });

    if (!preference.id) {
      throw new Error("Failed to create Mercado Pago preference");
    }

    // Save preference ID to order
    await db
      .update(orders)
      .set({
        paymentMethod: "mercadopago",
        paymentId: preference.id,
      })
      .where((o) => o.id === order.id);

    return c.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors }, 400);
    }

    return c.json(
      { error: "Failed to create checkout" },
      500
    );
  }
});

export default checkout;
```

#### 3.6.4 Webhook Implementation

**Webhook Receiver & Processor:**

```typescript
// apps/server/src/routes/webhooks/mercadopago.ts
import { Hono } from "hono";
import { MercadoPagoConfig, Payment } from "mercadopago";
import crypto from "node:crypto";
import { db } from "@opencommercium/db";
import { orders } from "@opencommercium/db/schema";
import { eq } from "drizzle-orm";
import { env } from "@opencommercium/env/server";

const webhooks = new Hono();

const mpClient = new MercadoPagoConfig({
  accessToken: env.MERCADO_PAGO_ACCESS_TOKEN,
});

const paymentClient = new Payment(mpClient);

/**
 * Verify Mercado Pago webhook signature
 */
function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const hash = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return hash === signature;
}

/**
 * Map Mercado Pago payment status to order status
 */
function mapPaymentStatus(
  mpStatus: string
): "paid" | "cancelled" | "pending" {
  switch (mpStatus) {
    case "approved":
    case "authorized":
      return "paid";
    case "rejected":
    case "cancelled":
    case "expired":
      return "cancelled";
    case "pending":
    case "in_process":
    case "in_mediation":
      return "pending";
    default:
      return "pending";
  }
}

/**
 * POST /api/webhooks/mercadopago
 * Receive and process Mercado Pago payment notifications
 */
webhooks.post("/mercadopago", async (c) => {
  try {
    // Get request body as string for signature verification
    const body = await c.req.text();
    const signature = c.req.header("x-signature") || "";
    const requestId = c.req.header("x-request-id");
    const timestamp = c.req.header("x-timestamp") || "";

    // Parse body
    let payload: any;
    try {
      payload = JSON.parse(body);
    } catch {
      console.error("Invalid JSON in webhook");
      return c.json({ error: "Invalid JSON" }, 400);
    }

    // Verify signature if secret is configured
    if (env.MERCADO_PAGO_WEBHOOK_SECRET) {
      const signatureData = `${timestamp}.${body}`;
      if (
        !verifyWebhookSignature(
          signatureData,
          signature,
          env.MERCADO_PAGO_WEBHOOK_SECRET
        )
      ) {
        console.error("Invalid webhook signature");
        return c.json({ error: "Invalid signature" }, 401);
      }
    }

    // Handle payment notifications
    if (payload.type === "payment") {
      const paymentId = payload.data.id;

      // Fetch payment details from Mercado Pago
      const payment = await paymentClient.get({ id: paymentId });

      if (!payment.external_reference) {
        console.error("Payment has no external_reference (order ID)");
        return c.json({ success: true }); // Acknowledge webhook
      }

      const orderId = payment.external_reference;
      const paymentStatus = mapPaymentStatus(payment.status);

      // Update order status
      await db
        .update(orders)
        .set({
          status: paymentStatus,
          paymentId: paymentId.toString(),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      console.log(
        `Order ${orderId} status updated to ${paymentStatus} (payment: ${payment.status})`
      );

      // Send confirmation email (async, non-blocking)
      if (paymentStatus === "paid") {
        sendOrderConfirmationEmail(orderId).catch((err) => {
          console.error("Error sending confirmation email:", err);
        });
      }
    }

    // Handle merchant_order notifications (fallback)
    if (payload.type === "merchant_order") {
      const merchantOrderId = payload.data.id;
      console.log(`Merchant order notification received: ${merchantOrderId}`);
      // You can optionally handle merchant_order updates here
    }

    // Always acknowledge webhook reception
    return c.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * Send order confirmation email
 */
async function sendOrderConfirmationEmail(orderId: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      user: true,
      items: {
        with: { product: true },
      },
    },
  });

  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  // Send email via your email service (Resend, SendGrid, etc.)
  // await emailService.send({
  //   to: order.user.email,
  //   subject: `Order Confirmation - ${order.orderNumber}`,
  //   template: 'order-confirmation',
  //   data: { order }
  // });
}

export default webhooks;
```

#### 3.6.5 Frontend Integration

**Checkout Page Component:**

```typescript
// apps/web/src/routes/(shop)/checkout.tsx
import { useCallback, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CheckoutFormData {
  email: string;
  name: string;
  phone: string;
  street: string;
  streetNumber: string;
  city: string;
  province: string;
  postalCode: string;
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const form = useForm<CheckoutFormData>({
    defaultValues: {
      email: "",
      name: "",
      phone: "",
      street: "",
      streetNumber: "",
      city: "",
      province: "Buenos Aires",
      postalCode: "",
    },
    onSubmit: async (values) => {
      setIsProcessing(true);
      try {
        // Create payment preference on backend
        const response = await fetch("/api/checkout/mercadopago", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payer: {
              email: values.email,
              name: values.name,
              phone: values.phone,
            },
            shippingAddress: {
              street: values.street,
              streetNumber: values.streetNumber,
              city: values.city,
              province: values.province,
              postalCode: values.postalCode,
            },
            billingAddress: {
              street: values.street,
              streetNumber: values.streetNumber,
              city: values.city,
              province: values.province,
              postalCode: values.postalCode,
            },
            shippingMethod: {
              id: "standard",
              cost: 500, // $5 ARS shipping
            },
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create checkout");
        }

        const data = await response.json();

        // Redirect to Mercado Pago checkout
        if (data.initPoint) {
          window.location.href = data.initPoint;
        } else if (data.sandboxInitPoint) {
          window.location.href = data.sandboxInitPoint; // For testing
        }
      } catch (error) {
        console.error("Checkout error:", error);
        toast.error("Failed to process checkout");
      } finally {
        setIsProcessing(false);
      }
    },
  });

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        {/* Form fields */}
        <form.Field
          name="email"
          children={(field) => (
            <div className="mb-4">
              <label>Email</label>
              <input
                type="email"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                required
              />
            </div>
          )}
        />

        {/* More fields... */}

        <Button type="submit" disabled={isProcessing} size="lg">
          {isProcessing ? "Processing..." : "Pay with Mercado Pago"}
        </Button>
      </form>
    </div>
  );
}
```

#### 3.6.6 Order Confirmation Page

```typescript
// apps/web/src/routes/(shop)/order-confirmation.tsx
import { useEffect, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle } from "lucide-react";

export function OrderConfirmationPage() {
  const { orderId } = useSearch({ from: "/order-confirmation" });
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrder() {
      try {
        const response = await fetch(`/api/orders/${orderId}`);
        const data = await response.json();
        setOrder(data);
      } catch (error) {
        console.error("Failed to fetch order:", error);
      } finally {
        setLoading(false);
      }
    }

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto p-4">
      {order?.status === "paid" ? (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-6 h-6" />
              Order Confirmed!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Thank you for your purchase. Your order number is:
            </p>
            <p className="text-2xl font-bold mb-4">{order.orderNumber}</p>
            <p className="text-gray-600">
              A confirmation email has been sent to your email address.
            </p>
          </CardContent>
        </Card>
      ) : order?.status === "cancelled" ? (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-6 h-6" />
              Payment Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Your payment was declined. Please try again.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <AlertCircle className="w-6 h-6" />
              Payment Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Your payment is being processed. We'll confirm once it's complete.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

#### 3.6.7 Testing in Sandbox Mode

**Test Credentials:**

```bash
# .env.test or .env.development
MERCADO_PAGO_ACCESS_TOKEN=APP_TEST_...  # Test access token
MERCADO_PAGO_PUBLIC_KEY=APP_TEST_...
```

**Test Credit Cards (Argentina):**

| Card | Number | CVV | Expiration |
| --- | --- | --- | --- |
| Mastercard | 5031 7557 3453 0604 | Any 3 digits | Any future date |
| Visa | 4009 1753 3280 6637 | Any 3 digits | Any future date |
| Amex | 3711 803012 34567 | Any 4 digits | Any future date |

**Test Flow:**

1. Start dev server: `bun run dev`
2. Go to checkout page
3. Fill form with test data
4. Use test credit card above
5. Complete payment in Mercado Pago sandbox
6. Verify webhook received and order updated

#### 3.6.8 Error Handling & Edge Cases

| Scenario | Handling |
| --- | --- |
| **Payment timeout** | Webhook retries automatically; order status checked via polling |
| **Duplicate webhook** | Idempotent updates (only update if status changes) |
| **Payment not matching order** | Verify `external_reference` matches order ID |
| **Inventory mismatch** | Prevent order creation if stock changes during checkout |
| **Webhook signature invalid** | Log and reject (unless secret not configured) |
| **Mercado Pago API down** | Return 502, client retries or uses fallback |

#### 3.6.9 Production Checklist

- [ ] Use production Access Token (not test token)
- [ ] Enable webhook signature verification
- [ ] Set up SSL certificate for webhook endpoint
- [ ] Configure firewall to allow Mercado Pago IPs
- [ ] Set up monitoring for failed payments
- [ ] Test backup payment method (if applicable)
- [ ] Document refund process
- [ ] Set up alerts for payment failures
- [ ] Verify email notifications are sending

---

| **Checkout** | | | |

---

## 4. Infrastructure Design

### 4.1 Development Environment

```yaml
# docker-compose.yml (Development)
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    container_name: bhvr-ecom
    environment:
      POSTGRES_DB: bhvr-ecom
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./packages/db/scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: opencommercium-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Optional: Run app in Docker for consistency
  # Uncomment for containerized development
  # app:
  #   build:
  #     context: .
  #     dockerfile: Dockerfile.dev
  #   volumes:
  #     - .:/app
  #     - /app/node_modules
  #   ports:
  #     - "3000:3000"
  #     - "3001:3001"
  #   depends_on:
  #     postgres:
  #       condition: service_healthy
  #     redis:
  #       condition: service_healthy

volumes:
  postgres_data:
  redis_data:
```

### 4.2 Production Architecture (Hetzner VPS)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          HETZNER VPS (CX22+)                            │
│                        Ubuntu 22.04 / Debian 12                         │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                         TRAEFIK (Reverse Proxy)                     │ │
│  │                    Port 80 (HTTP) → 443 (HTTPS)                     │ │
│  │                    Automatic SSL via Let's Encrypt                  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                          │                    │                         │
│              ┌───────────┴────────┐ ┌────────┴──────────┐               │
│              ▼                    ▼ ▼                   ▼               │
│  ┌─────────────────────┐    ┌─────────────────────┐                     │
│  │   WEB (Frontend)    │    │  SERVER (Backend)   │                     │
│  │  store.example.com  │    │  api.example.com    │                     │
│  │    Nginx + Static   │    │   Bun + Hono        │                     │
│  │      Port 3000      │    │     Port 3001       │                     │
│  └─────────────────────┘    └──────────┬──────────┘                     │
│                                        │                                │
│                    ┌───────────────────┼───────────────────┐            │
│                    ▼                   ▼                   ▼            │
│           ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│           │  PostgreSQL  │    │    Redis     │    │   Volumes    │      │
│           │   Port 5432  │    │  Port 6379   │    │  (Backups)   │      │
│           └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Production Docker Compose

```yaml
# docker-compose.prod.yml
version: "3.8"

services:
  traefik:
    image: traefik:v3.0
    container_name: traefik
    restart: unless-stopped
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=${ACME_EMAIL}"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      # Redirect HTTP to HTTPS
      - "--entrypoints.web.http.redirections.entryPoint.to=websecure"
      - "--entrypoints.web.http.redirections.entryPoint.scheme=https"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik_letsencrypt:/letsencrypt
    networks:
      - web
    labels:
      - "traefik.enable=true"
      # Dashboard (optional, secure it!)
      - "traefik.http.routers.dashboard.rule=Host(`traefik.${DOMAIN}`)"
      - "traefik.http.routers.dashboard.service=api@internal"
      - "traefik.http.routers.dashboard.middlewares=auth"
      - "traefik.http.middlewares.auth.basicauth.users=${TRAEFIK_USERS}"

  web:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.web
    container_name: opencommercium-web
    restart: unless-stopped
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.web.rule=Host(`${DOMAIN}`) || Host(`www.${DOMAIN}`)"
      - "traefik.http.routers.web.entrypoints=websecure"
      - "traefik.http.routers.web.tls.certresolver=letsencrypt"
      - "traefik.http.services.web.loadbalancer.server.port=3000"
      # Redirect www to non-www
      - "traefik.http.middlewares.www-redirect.redirectregex.regex=^https://www\\.(.*)"
      - "traefik.http.middlewares.www-redirect.redirectregex.replacement=https://$${1}"
      - "traefik.http.routers.web.middlewares=www-redirect"

  server:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.server
    container_name: opencommercium-server
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/opencommercium
      - REDIS_URL=redis://redis:6379
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
      - BETTER_AUTH_URL=https://api.${DOMAIN}
      - CORS_ORIGIN=https://${DOMAIN}
      - MERCADO_PAGO_ACCESS_TOKEN=${MERCADO_PAGO_ACCESS_TOKEN}
      - MERCADO_PAGO_PUBLIC_KEY=${MERCADO_PAGO_PUBLIC_KEY}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - web
      - internal
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.${DOMAIN}`)"
      - "traefik.http.routers.api.entrypoints=websecure"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"
      - "traefik.http.services.api.loadbalancer.server.port=3001"

  postgres:
    image: postgres:16-alpine
    container_name: opencommercium-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: opencommercium
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - internal
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: opencommercium-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - internal
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  web:
    external: true
  internal:

volumes:
  postgres_data:
  redis_data:
  traefik_letsencrypt:
```

### 4.4 Hetzner Deployment Script

```bash
#!/bin/bash
# infrastructure/scripts/deploy.sh

set -e

# Configuration
SERVER_IP="${SERVER_IP:-your-server-ip}"
SERVER_USER="${SERVER_USER:-root}"
DOMAIN="${DOMAIN:-example.com}"

echo "🚀 Deploying OpenCommercium to Hetzner..."

# 1. SSH into server and pull latest code
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
  cd /opt/opencommercium

  # Pull latest changes
  git pull origin main

  # Create external network if not exists
  docker network create web 2>/dev/null || true

  # Build and deploy
  docker-compose -f docker-compose.prod.yml pull
  docker-compose -f docker-compose.prod.yml build --no-cache
  docker-compose -f docker-compose.prod.yml up -d

  # Run migrations
  docker-compose -f docker-compose.prod.yml exec -T server bun run db:migrate

  # Cleanup old images
  docker image prune -f

  echo "✅ Deployment complete!"
ENDSSH
```

### 4.5 SSL & Security Configuration

**Automatic SSL with Traefik:**

- Let's Encrypt certificates auto-generated
- HTTP to HTTPS redirect enforced
- Certificate renewal handled automatically

**Security Headers (via Traefik middleware):**

```yaml
# Add to Traefik labels
labels:
  - "traefik.http.middlewares.security-headers.headers.stsSeconds=31536000"
  - "traefik.http.middlewares.security-headers.headers.stsIncludeSubdomains=true"
  - "traefik.http.middlewares.security-headers.headers.contentTypeNosniff=true"
  - "traefik.http.middlewares.security-headers.headers.browserXssFilter=true"
  - "traefik.http.middlewares.security-headers.headers.referrerPolicy=strict-origin-when-cross-origin"
  - "traefik.http.middlewares.security-headers.headers.contentSecurityPolicy=default-src 'self'"
```

### 4.6 Backup Strategy

```bash
#!/bin/bash
# infrastructure/scripts/backup.sh

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# PostgreSQL backup
docker exec opencommercium-postgres \
  pg_dump -U postgres opencommercium | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Keep only last 7 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

# Optional: Upload to S3/Backblaze B2
# aws s3 cp "$BACKUP_DIR/db_$DATE.sql.gz" s3://your-bucket/backups/
```

**Cron job (daily at 3 AM):**

```bash
0 3 * * * /opt/opencommercium/infrastructure/scripts/backup.sh >> /var/log/backup.log 2>&1
```

---

## 5. Roadmap

### Phase 1: Foundation (Weeks 1-2) ✅

**Goal:** Basic infrastructure and authentication

| Task | Status | Notes |
|------|--------|-------|
| Project scaffolding with Turborepo | ✅ | Using better-t-stack CLI |
| PostgreSQL + Docker setup | ✅ | docker-compose.yml created |
| Better Auth integration | ✅ | Email/password, sessions |
| Basic Drizzle schema | ✅ | Auth tables |
| Environment configuration | ✅ | @bhvr-ecom/env package |

### Phase 2: Core E-Commerce (Weeks 3-5)

**Goal:** Product catalog and shopping cart

| Task | Status | Notes |
|------|--------|-------|
| Product schema & CRUD | 🔲 | Drizzle + Hono routes |
| Category management | 🔲 | Hierarchical categories |
| Product listing page | 🔲 | TanStack Query + pagination |
| Product detail page | 🔲 | SEO-optimized |
| Shopping cart (server) | 🔲 | PostgreSQL-backed |
| Shopping cart (guest) | 🔲 | localStorage + merge |
| Redis integration | 🔲 | Sessions, caching |

### Phase 3: Checkout & Payments (Weeks 6-7)

**Goal:** Complete purchase flow

| Task | Status | Notes |
|------|--------|-------|
| Checkout flow UI | 🔲 | Multi-step form |
| Address management | 🔲 | Shipping/billing |
| Mercado Pago integration | 🔲 | Preference API |
| Webhook handling | 🔲 | Payment notifications |
| Order creation | 🔲 | Transaction-safe |
| Order confirmation | 🔲 | Email + page |
| Order history | 🔲 | Customer account |

### Phase 4: Admin Dashboard (Weeks 8-9)

**Goal:** Store management interface

| Task | Status | Notes |
|------|--------|-------|
| Admin authentication | 🔲 | Role-based access |
| Product management UI | 🔲 | CRUD interface |
| Order management | 🔲 | Status updates |
| Dashboard stats | 🔲 | Sales, orders |
| Customer list | 🔲 | Basic CRM |

### Phase 5: Production Ready (Weeks 10-11)

**Goal:** Deploy to Hetzner

| Task | Status | Notes |
|------|--------|-------|
| Production Docker configs | 🔲 | Multi-stage builds |
| Traefik + SSL setup | 🔲 | Let's Encrypt |
| Environment hardening | 🔲 | Secrets, security |
| Monitoring & logging | 🔲 | Health checks |
| Backup automation | 🔲 | Daily backups |
| Documentation | 🔲 | README, deploy guide |

### Phase 6: Enhancements (Post-MVP)

**Goal:** Advanced features

| Feature | Priority | Notes |
|---------|----------|-------|
| Product search (full-text) | P1 | PostgreSQL FTS |
| Product variants | P1 | Size, color, etc. |
| Discount codes | P2 | Coupon system |
| Wishlist | P2 | Save for later |
| Reviews & ratings | P2 | Customer feedback |
| Multi-currency | P3 | ARS, USD, etc. |
| Inventory alerts | P2 | Low stock notifications |
| Analytics | P3 | Sales reports |
| PWA support | P3 | Offline, push notifications |

---

## 6. Appendix

### 6.1 Environment Variables

```bash
# .env.example (Production)

# Domain
DOMAIN=store.example.com
ACME_EMAIL=admin@example.com

# Database
POSTGRES_PASSWORD=your-secure-password-here
DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/opencommercium

# Redis
REDIS_PASSWORD=your-redis-password-here
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

# Authentication
BETTER_AUTH_SECRET=your-32-character-secret-here
BETTER_AUTH_URL=https://api.${DOMAIN}
CORS_ORIGIN=https://${DOMAIN}

# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=your-access-token
MERCADO_PAGO_PUBLIC_KEY=your-public-key
MERCADO_PAGO_WEBHOOK_SECRET=your-webhook-secret

# Traefik (optional, for dashboard auth)
TRAEFIK_USERS=admin:$$apr1$$...  # htpasswd -nb admin password
```

### 6.2 Recommended Hetzner Server Specs

| Environment | Server | Specs | Cost/Month |
|-------------|--------|-------|------------|
| Development | CX22 | 2 vCPU, 4GB RAM, 40GB SSD | €4.51 |
| Production (Small) | CX32 | 4 vCPU, 8GB RAM, 80GB SSD | €8.49 |
| Production (Medium) | CX42 | 8 vCPU, 16GB RAM, 160GB SSD | €16.69 |

### 6.3 Performance Benchmarks (Target)

| Metric | Target | Tool |
|--------|--------|------|
| API Response (p50) | < 20ms | k6 |
| API Response (p95) | < 50ms | k6 |
| API Response (p99) | < 100ms | k6 |
| Homepage TTFB | < 200ms | Lighthouse |
| Lighthouse Performance | > 90 | Lighthouse |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| Time to Interactive | < 3.8s | Lighthouse |

### 6.4 Tech Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Runtime | Bun | Performance, native TS, modern DX |
| Backend | Hono | Fastest, lightweight, works everywhere |
| Frontend | React + Vite | Ecosystem, performance, familiarity |
| Database | PostgreSQL | ACID, JSONB, reliability |
| ORM | Drizzle | Type-safe, performant, great DX |
| Auth | Better Auth | Self-hosted, full control, OAuth support |
| Payments | Mercado Pago | Argentina market, good docs |
| Styling | Tailwind CSS | Rapid development, consistency |
| Components | shadcn/ui | Customizable, accessible, modern |
| Routing | TanStack Router | Type-safe, file-based, SSR-ready |
| State | TanStack Query | Server state management |
| Monorepo | Turborepo | Fast, simple, caching |
| Reverse Proxy | Traefik | Auto SSL, Docker native |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-01 | Architecture Team | Initial release |

---

*This document is part of the OpenCommercium project. Licensed under MIT.*
