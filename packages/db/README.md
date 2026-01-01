# @bhvr-ecom/db

Database package for bhvr-ecom using Drizzle ORM and PostgreSQL.

## 📦 What's Included

- **Schemas**: Complete e-commerce database schema with relations
- **Migrations**: Drizzle Kit migration system
- **Seeds**: Sample data for development
- **Utilities**: Database helper functions

## 🗄️ Database Schema

### Authentication Tables

- `user` - User accounts
- `session` - Active sessions
- `account` - OAuth provider accounts
- `verification` - Email verification tokens

### E-commerce Tables

#### Products & Catalog

- `category` - Product categories (hierarchical)
- `product` - Products with pricing, inventory, SEO
- `product_image` - Product images with sort order

#### Shopping & Orders

- `cart` - Shopping carts (user + guest sessions)
- `cart_item` - Items in cart with quantities
- `order` - Customer orders with full address snapshots
- `order_item` - Order line items with price history
- `address` - Saved shipping/billing addresses

#### Features

- `review` - Product reviews and ratings (1-5 stars)
- `wishlist_item` - Saved products for later
- `coupon` - Discount codes with usage limits

### Key Features

- **Full-text search** on products (Spanish language support)
- **Inventory tracking** with backorder support
- **Guest checkout** via session-based carts
- **Price snapshots** in cart/order items
- **Hierarchical categories** (parent-child relations)
- **Shipping zones** (AMBA, Interior, Pickup)
- **Order status workflow** (pending → paid → processing → shipped → delivered)

## 🚀 Usage

### Push Schema to Database

```bash
bun run db:push
```

### Generate Migrations

```bash
bun run db:generate
```

### Run Migrations

```bash
bun run db:migrate
```

### Open Drizzle Studio

```bash
bun run db:studio
```

### Seed Database

```bash
bun run db:seed
```

## 🔧 Configuration

Database connection is configured via environment variables in `apps/server/.env`:

```bash
DATABASE_URL="postgresql://postgres:password@postgres:5432/bhvr_ecom"
```

See `drizzle.config.ts` for Drizzle Kit configuration.

## 📝 Schema Example

```typescript
import { db } from "@bhvr-ecom/db";
import { product, productImage } from "@bhvr-ecom/db/schema/ecommerce";

// Query products with images
const products = await db.query.product.findMany({
  with: {
    images: true,
    category: true,
  },
  where: (products, { eq }) => eq(products.isActive, true),
});
```

## 🌱 Seed Data

The seed script creates:

- 4 categories (Electronics, Smartphones, Clothing, Home & Kitchen)
- 5 sample products (Samsung Galaxy S24, MacBook Air, T-Shirt, Coffee Maker, PS5)
- 7 product images

Perfect for development and testing!

## 🔒 Type Safety

All schemas are fully typed with TypeScript. Drizzle provides:

- Type-safe queries
- Autocomplete in IDE
- Compile-time error checking
- Inferred types from schema

## 🏗️ Architecture

Follows Clean Architecture principles:

- **Entities** (Domain Layer): Schema definitions in `src/schema/`
- **Data Access**: Drizzle ORM client in `src/index.ts`
- **Migrations**: Version-controlled schema changes

Part of the **Beaver Stack**:
- **B**un runtime
- **H**ono backend
- **V**ite frontend  
- **R**edis + PostgreSQL

## 📚 References

- [Drizzle ORM Docs](https://orm.drizzle.team)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Better Auth](https://www.better-auth.com/)
