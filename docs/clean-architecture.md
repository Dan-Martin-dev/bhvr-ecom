# Clean Architecture Implementation

## Overview

This document describes the Clean Architecture implementation for the BHVR E-commerce project, following Domain-Driven Design (DDD) principles and Clean Architecture patterns.

## Architecture Layers

### 1. Presentation Layer (`apps/`)

- **Server** (`apps/server/`): Hono API endpoints
- **Web** (`apps/web/`): React frontend with TanStack Router

### 2. Application Layer (`packages/core/`)

Business logic layer containing use cases that orchestrate domain operations.

#### Core Package Structure

```bash
packages/core/
├── src/
│   ├── index.ts           # Exports all use cases
│   ├── products/          # Product management use cases
│   │   └── index.ts
│   ├── cart/             # Shopping cart use cases
│   │   └── index.ts
│   └── orders/           # Order processing use cases
│       └── index.ts
├── package.json
└── tsconfig.json
```

#### Use Cases Implemented

**Products (`packages/core/src/products/index.ts`)**

- `getProducts()` - Retrieve all products with pagination
- `getProductById(id)` - Get single product details
- `getProductsByCategory(categoryId)` - Filter products by category
- `getCategories()` - Retrieve all product categories

**Cart (`packages/core/src/cart/index.ts`)**

- `getCart(userId)` - Retrieve user's cart with items
- `addToCart(userId, productId, quantity)` - Add product to cart
- `updateCartItem(userId, productId, quantity)` - Update cart item quantity
- `removeFromCart(userId, productId)` - Remove item from cart
- `clearCart(userId)` - Empty user's cart

**Orders (`packages/core/src/orders/index.ts`)**

- `createOrder(userId, items, address, couponCode?)` - Create new order
- `getOrderById(orderId)` - Retrieve order details
- `getUserOrders(userId)` - Get user's order history
- `updateOrderStatus(orderId, status)` - Update order status
- `validateCoupon(code)` - Validate coupon code and discount

### 3. Domain Layer (`packages/validations/`)

Validation schemas and domain rules using Zod for type-safe data validation.

#### Validations Package Structure

```bash
packages/validations/
├── src/
│   ├── index.ts           # Exports all schemas and types
│   ├── products.ts        # Product and category schemas
│   ├── cart.ts           # Cart item schemas
│   ├── orders.ts         # Order, address, coupon schemas
│   └── auth.ts           # Authentication schemas
├── package.json
└── tsconfig.json
```

#### Schema Categories

**Products (`packages/validations/src/products.ts`)**

- `createProductSchema` - Product creation validation
- `updateProductSchema` - Product update validation
- `productSchema` - Full product schema
- `categorySchema` - Product category schema

**Cart (`packages/validations/src/cart.ts`)**

- `cartItemSchema` - Individual cart item validation
- `cartSchema` - Complete cart structure

**Orders (`packages/validations/src/orders.ts`)**

- `addressSchema` - Shipping/billing address validation
- `couponSchema` - Discount coupon validation
- `orderItemSchema` - Order line item validation
- `createOrderSchema` - Order creation validation
- `orderSchema` - Complete order schema

**Auth (`packages/validations/src/auth.ts`)**

- `loginSchema` - User login validation
- `registerSchema` - User registration validation

### 4. Infrastructure Layer (`packages/db/`, `packages/env/`, `packages/auth/`)

- **Database** (`packages/db/`): Drizzle ORM schemas and database operations
- **Environment** (`packages/env/`): Configuration management
- **Auth** (`packages/auth/`): Authentication services

## Dependency Flow

```mermaid
apps/server ──┐
apps/web ─────┼─► packages/core ──┐
              │                   │
              └─► packages/validations ──► packages/db
                                    │
                                    └─► packages/env
                                        │
                                        └─► packages/auth
```

## Key Principles Applied

### 1. Dependency Inversion

- Higher-level modules (core) don't depend on lower-level modules (db)
- Both depend on abstractions (interfaces/schemas)

### 2. Single Responsibility

- Each use case handles one business operation
- Each schema validates one domain concept

### 3. Type Safety

- End-to-end TypeScript types from database to API
- Zod schemas provide runtime validation and TypeScript inference

### 4. Testability

- Business logic isolated from infrastructure concerns
- Use cases can be tested independently with mocked dependencies

## Usage Examples

### In Server Routes

```typescript
import { productUseCases } from '@bhvr-ecom/core';
import { createProductSchema } from '@bhvr-ecom/validations';

// API endpoint using Clean Architecture
app.post('/api/products', async (c) => {
  const body = await c.req.json();
  const validatedData = createProductSchema.parse(body);

  const product = await productUseCases.createProduct(validatedData);
  return c.json(product);
});
```

### In React Components

```typescript
import { cartItemSchema } from '@bhvr-ecom/validations';

// Type-safe component props
interface CartItemProps {
  item: z.infer<typeof cartItemSchema>;
}

function CartItem({ item }: CartItemProps) {
  // Component logic with full type safety
}
```

## Build Configuration

Enhanced `turbo.json` with proper task dependencies:

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "dependsOn": ["^build"],
      "persistent": true
    },
    "check-types": {
      "dependsOn": ["^build"]
    }
  }
}
```

## Benefits Achieved

1. **Maintainability**: Clear separation of concerns makes code easier to modify
2. **Testability**: Business logic can be unit tested without database dependencies
3. **Type Safety**: End-to-end type checking from database to frontend
4. **Scalability**: New features can be added without affecting existing code
5. **Reusability**: Use cases and validations can be shared across different applications

## Migration Notes

This implementation replaces direct database calls in API routes with use case orchestration, providing better separation of concerns and improved testability. All existing functionality is preserved while adding architectural benefits.
