# Hono RPC Implementation Guide

## Overview

Hono RPC is now fully implemented in your BHVR e-commerce app, providing **end-to-end type safety** between your server and web applications. This guide shows you how to use it.

## 🏗️ Architecture

```
┌──────────────────┐         Hono RPC          ┌──────────────────┐
│   apps/web       │◄──────────────────────────►│   apps/server    │
│   (React Client) │    Type-Safe API Calls     │   (Hono Routes)  │
└──────────────────┘                            └──────────────────┘
         │                                               │
         │                                               │
         ├──────► packages/validations ◄────────────────┤
         │        (Zod Schemas)                          │
         │                                               │
         └───────────────────────────────► packages/core │
                                          (Business Logic)
```

## 📦 What's Included

### Server Routes (Type Exports)

- **`/api/products`** - Product CRUD operations
- **`/api/categories`** - Category management
- **`/api/cart`** - Shopping cart operations  
- **`/api/orders`** - Order creation and management

### Client API (`apps/web/src/lib/api.ts`)

Type-safe RPC client automatically generated from server routes.

## 🚀 Usage Examples

### 1. Fetch Products

```typescript
import { api } from '@/lib/api';

// Get all products (with optional filters)
const response = await api.api.products.$get({
  query: {
    page: '1',
    limit: '20',
    search: 'laptop',
    categoryId: 'electronics',
    isActive: 'true',
  }
});

if (response.ok) {
  const data = await response.json();
  console.log(data.products); // Fully typed!
}
```

### 2. Get Single Product

```typescript
const response = await api.api.products[':id'].$get({
  param: {
    id: 'product-123'
  }
});

if (response.ok) {
  const product = await response.json();
  console.log(product.name, product.price);
}
```

### 3. Create Product (Admin)

```typescript
const response = await api.api.products.$post({
  json: {
    name: 'Gaming Laptop',
    slug: 'gaming-laptop',
    description: 'High-performance gaming laptop',
    price: 99990, // Price in centavos
    categoryId: 'electronics',
    sku: 'LAP-001',
    stock: 10,
    trackInventory: true,
    isActive: true,
  }
});

if (response.ok) {
  const newProduct = await response.json();
  console.log('Created:', newProduct.id);
}
```

### 4. Add to Cart

```typescript
const response = await api.api.cart.items.$post({
  json: {
    productId: 'product-123',
    quantity: 2
  },
  headers: {
    'x-user-id': 'user-abc' // TODO: Replace with actual auth
  }
});

if (response.ok) {
  const cartItem = await response.json();
  alert('Added to cart!');
}
```

### 5. Get User's Cart

```typescript
const response = await api.api.cart.$get({
  headers: {
    'x-user-id': 'user-abc'
  }
});

if (response.ok) {
  const cart = await response.json();
  console.log('Cart items:', cart.items);
  console.log('Subtotal:', cart.subtotal);
}
```

### 6. Update Cart Item Quantity

```typescript
const response = await api.api.cart.items[':cartItemId'].$put({
  param: {
    cartItemId: 'cart-item-123'
  },
  json: {
    quantity: 5
  }
});

if (response.ok) {
  const updated = await response.json();
  console.log('Updated quantity:', updated.quantity);
}
```

### 7. Remove from Cart

```typescript
const response = await api.api.cart.items[':cartItemId'].$delete({
  param: {
    cartItemId: 'cart-item-123'
  }
});

if (response.ok) {
  console.log('Item removed from cart');
}
```

### 8. Create Order

```typescript
const response = await api.api.orders.$post({
  json: {
    cartId: 'cart-123',
    shippingAddress: {
      firstName: 'John',
      lastName: 'Doe',
      address1: 'Av. Corrientes 1234',
      city: 'Buenos Aires',
      province: 'CABA',
      postalCode: '1234',
      country: 'AR',
      phone: '+5491123456789'
    },
    shippingZone: 'amba',
    couponCode: 'SUMMER2026' // Optional
  },
  headers: {
    'x-user-id': 'user-abc'
  }
});

if (response.ok) {
  const order = await response.json();
  console.log('Order created:', order.orderNumber);
}
```

### 9. Get User Orders

```typescript
const response = await api.api.orders.$get({
  query: {
    page: '1',
    limit: '10'
  },
  headers: {
    'x-user-id': 'user-abc'
  }
});

if (response.ok) {
  const { orders, pagination } = await response.json();
  console.log('Orders:', orders);
  console.log('Total pages:', pagination.totalPages);
}
```

## 🎯 Benefits

### 1. Type Safety

```typescript
// ❌ Compile-time error if you use wrong types
await api.api.products.$post({
  json: {
    name: 123, // Error: Type 'number' is not assignable to type 'string'
    price: 'invalid' // Error: Type 'string' is not assignable to type 'number'
  }
});

// ✅ Auto-complete suggests correct fields
await api.api.products.$post({
  json: {
    name: 'Product', // IDE suggests all required fields
    price: 2999,
    // ...auto-complete shows remaining fields
  }
});
```

### 2. No API Documentation Drift

The client types are **automatically generated** from your server routes. If you change a route, TypeScript will immediately show errors in your frontend code.

### 3. Better Developer Experience

- **Auto-complete** for all API endpoints
- **Inline parameter hints** in your IDE
- **Compile-time validation** instead of runtime errors
- **Refactoring support** - rename a field in Zod schema and get errors everywhere it's used

## 🔧 React Hook Example

```typescript
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.api.products.$get();
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    }
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      const response = await api.api.cart.items.$post({
        json: { productId, quantity }
      });
      if (!response.ok) throw new Error('Failed to add to cart');
      return response.json();
    },
    onSuccess: () => {
      // Invalidate cart query to refetch
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    }
  });
}
```

## 🛠️ Testing Database Connection

Before using the API, make sure your database is set up:

```bash
# 1. Start services
docker-compose up -d

# 2. Push schema to database
bun run db:push

# 3. Seed with sample data
bun run db:seed

# 4. Start development servers
bun run dev
```

## 📝 TODO: Authentication

Currently, routes use a temporary `x-user-id` header for user identification. Replace this with proper authentication:

```typescript
// In routes/cart.ts and routes/orders.ts
const getUserId = (c: any) => {
  // TODO: Replace with actual auth from Better Auth
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) throw new Error('Unauthorized');
  return session.user.id;
};
```

## 🚀 Next Steps

1. **Implement authentication** - Replace `x-user-id` header with Better Auth session
2. **Add error handling** - Create a wrapper around API calls for consistent error handling
3. **Add loading states** - Use TanStack Query for better UX
4. **Test API endpoints** - Use the example component or build your own

## 📚 Reference

- [Hono RPC Documentation](https://hono.dev/guides/rpc)
- [Clean Architecture Docs](../docs/clean-architecture.md)
- [Database Schema](../docs/database-schema.md)
