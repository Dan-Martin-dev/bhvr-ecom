# Frontend Structure & Best Practices

> Best practices for organizing routes, components, and maintaining clean architecture in the BHVR stack

**Version:** 1.0.0  
**Date:** January 2026  
**Stack:** Bun + Hono + Vite + React + TanStack Router  

---

## Table of Contents

1. [File Organization](#1-file-organization)
2. [Route Structure](#2-route-structure)
3. [Component Extraction](#3-component-extraction)
4. [API Integration Patterns](#4-api-integration-patterns)
5. [Type Safety](#5-type-safety)
6. [Common Pitfalls](#6-common-pitfalls)
7. [Quick Wins](#7-quick-wins)

---

## 1. File Organization

### Current Structure (After Refactoring)

```
apps/web/src/
├── routes/
│   ├── __root.tsx                    # Root layout with header/footer
│   ├── index.tsx                     # Home/landing page
│   ├── login.tsx                     # Auth page
│   │
│   ├── (authenticated)/              # 🔐 Auth-required route group
│   │   ├── route.tsx                 # Auth check wrapper
│   │   └── dashboard/
│   │       ├── route.tsx             # Dashboard layout with nav
│   │       ├── index.tsx             # Dashboard home/overview
│   │       ├── orders/
│   │       │   ├── index.tsx         # User orders list
│   │       │   └── $orderId.tsx      # Order detail
│   │       └── admin/
│   │           └── orders/
│   │               ├── index.tsx     # Admin orders list
│   │               └── $orderId.tsx  # Admin order detail
│   │
│   ├── shop.tsx                      # Shop layout (Outlet wrapper)
│   ├── shop.products.tsx             # Product list
│   ├── shop.products.$slug.tsx       # Product detail
│   ├── shop.cart.tsx                 # Cart page
│   ├── shop.checkout.tsx             # Checkout flow
│   ├── shop.order.success.tsx        # Order success
│   ├── shop.order.failure.tsx        # Order failure
│   └── shop.order.pending.tsx        # Order pending
│
├── components/
│   ├── header.tsx                    # Site header
│   ├── user-menu.tsx                 # User dropdown
│   ├── sign-in-form.tsx              # Auth forms
│   ├── sign-up-form.tsx
│   │
│   ├── shop/                         # Shop-specific components
│   │   ├── product-card.tsx
│   │   ├── product-filters.tsx
│   │   ├── cart-item.tsx
│   │   └── checkout-form.tsx
│   │
│   └── ui/                           # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── badge.tsx
│       ├── separator.tsx
│       ├── table.tsx
│       └── select.tsx
│
└── lib/
    ├── api.ts                        # RPC client + helper methods
    ├── auth-client.ts                # Better Auth client
    └── utils.ts                      # cn() utility
```

### Principles

1. **Route groups for auth** - Use `(authenticated)/` for protected routes
2. **Nested folders, not flat dots** - `dashboard/orders/` not `dashboard.orders.tsx`
3. **Layout components** - Use `route.tsx` files with `<Outlet />` for nested layouts
4. **One job per file** - Route = data loading + page composition, Component = UI logic

---

## 2. Route Structure

### ✅ Good: Route Group with Auth Check

```tsx
// apps/web/src/routes/(authenticated)/route.tsx
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/(authenticated)")({
  component: AuthenticatedLayout,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }
    return { session };
  },
});

function AuthenticatedLayout() {
  return <Outlet />;  {/* All child routes are now auth-protected */}
}
```

### Good: Nested Dashboard Layout

```tsx
// apps/web/src/routes/(authenticated)/dashboard/route.tsx
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(authenticated)/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const { session } = Route.useRouteContext();
  
  return (
    <div className="container py-8">
      <h1>Dashboard - {session.data?.user.name}</h1>
      
      {/* Navigation */}
      <nav className="flex gap-2 mb-6">
        <Link to="/dashboard">Overview</Link>
        <Link to="/dashboard/orders">My Orders</Link>
        <Link to="/dashboard/admin/orders">Admin</Link>
      </nav>
      
      <Outlet />  {/* Child routes render here */}
    </div>
  );
}
```

```tsx
// apps/web/src/routes/(authenticated)/dashboard/index.tsx
export const Route = createFileRoute("/(authenticated)/dashboard/")({
  component: DashboardOverview,
});

function DashboardOverview() {
  return <div>Dashboard home content</div>;
}
```

```tsx
// apps/web/src/routes/(authenticated)/dashboard/orders/index.tsx
export const Route = createFileRoute("/(authenticated)/dashboard/orders/")({
  component: OrdersList,
});
```

---

## 3. Component Extraction

### When to Extract

- **File > 200 lines** → Extract logical sections
- **Repeated JSX** → Extract reusable component
- **Complex logic** → Extract custom hook
- **Multiple responsibilities** → Split into smaller components

### Before: Bloated Route

```tsx
// ❌ 378 lines in shop.cart.tsx
function CartPage() {
  const { data: cart } = useQuery({ ... });
  const updateMutation = useMutation({ ... });
  const removeMutation = useMutation({ ... });

  return (
    <div>
      {/* 300+ lines of JSX */}
      {cart.items.map(item => (
        <div>
          {/* Complex cart item UI */}
          <img src={item.image} />
          <div>{item.name}</div>
          <button onClick={() => update(item)}>+</button>
          <button onClick={() => update(item)}>-</button>
          <button onClick={() => remove(item)}>X</button>
        </div>
      ))}
    </div>
  );
}
```

### After: Clean Route + Components

```tsx
// ✅ apps/web/src/routes/shop.cart.tsx (50 lines)
import { CartContent } from "@/components/shop/cart-content";
import { useCart } from "@/hooks/use-cart";

function CartPage() {
  const cart = useCart();
  return <CartContent cart={cart} />;
}
```

```tsx
// ✅ apps/web/src/components/shop/cart-content.tsx
import { CartItem } from "./cart-item";
import { CartSummary } from "./cart-summary";

export function CartContent({ cart }) {
  if (cart.isEmpty) return <EmptyCart />;
  
  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        {cart.items.map(item => (
          <CartItem key={item.id} item={item} />
        ))}
      </div>
      <CartSummary cart={cart} />
    </div>
  );
}
```

```tsx
// ✅ apps/web/src/components/shop/cart-item.tsx
export function CartItem({ item }) {
  const { updateQuantity, removeItem } = useCartActions();
  
  return (
    <Card>
      <CartItemImage image={item.product.images[0]} />
      <CartItemDetails item={item} />
      <CartItemQuantity
        quantity={item.quantity}
        onUpdate={updateQuantity}
        onRemove={removeItem}
      />
    </Card>
  );
}
```

---

## 4. API Integration Patterns

### Use RPC Helper Methods

```tsx
// ✅ GOOD: Type-safe RPC with helpers
import { productApi, cartApi } from "@/lib/api";

const { data } = useQuery({
  queryKey: ["products"],
  queryFn: () => productApi.list({ page: 1, limit: 20 }),
});

const addToCart = useMutation({
  mutationFn: (productId) => cartApi.addItem({ productId, quantity: 1 }),
});
```

```tsx
// ❌ BAD: Raw fetch() calls
const { data } = useQuery({
  queryFn: async () => {
    const res = await fetch("/api/products");
    return res.json();
  },
});
```

### Type Alignment

```tsx
// ✅ GOOD: Use API response types
import type { InferResponseType } from "hono/client";
import type { AppType } from "@/../../server/src/index";

type ProductsResponse = InferResponseType<
  typeof AppType.api.products.$get
>;

const { data } = useQuery<ProductsResponse>({
  queryFn: () => productApi.list(),
});
```

---

## 5. Type Safety

### Common Issue: null vs undefined

Database returns `null`, TypeScript expects `undefined`.

```tsx
// ❌ Type mismatch
interface Order {
  paymentStatus?: string;  // TypeScript
}

// But API returns:
{
  paymentStatus: null  // PostgreSQL
}
```

**Solution:** Use type assertion or transform

```tsx
// ✅ Transform in API helper
export const ordersApi = {
  get: async (id: string) => {
    const response = await api.api.orders[":id"].$get({ param: { id } });
    const data = await response.json();
    
    // Transform null to undefined
    return {
      ...data,
      paymentStatus: data.paymentStatus ?? undefined,
      trackingUrl: data.trackingUrl ?? undefined,
    };
  },
};
```

---

## 6. Common Pitfalls

### ❌ Don't Use Flat Dot Notation for Nested Routes

```tsx
// ❌ BAD: Flat structure with dots (old TanStack Router style)
routes/
  dashboard.tsx
  dashboard.orders.tsx
  dashboard.orders.$orderId.tsx
  dashboard.admin.orders.tsx
```

```tsx
// ✅ GOOD: Use nested folders with route groups
routes/
  (authenticated)/
    route.tsx                    # Auth check
    dashboard/
      route.tsx                  # Layout with nav
      index.tsx                  # Dashboard home
      orders/
        index.tsx                # Orders list
        $orderId.tsx             # Order detail
```

**Why?**
- Better organization and discoverability
- Shared layouts are explicit (`route.tsx`)
- Auth checks applied at group level
- Follows modern TanStack Router conventions

### ❌ Don't Use `asChild` with Base UI

```tsx
// ❌ WRONG: Button from @base-ui doesn't support asChild
<Button asChild>
  <Link to="/products">Shop</Link>
</Button>
```

```tsx
// ✅ CORRECT: Wrap Button with Link
<Link to="/products">
  <Button>Shop</Button>
</Link>
```

### ❌ Don't Inline Complex Components

```tsx
// ❌ BAD: 200 lines in route
function OrderDetail() {
  return (
    <div>
      {/* OrderHeader */}
      <div className="mb-6">
        <Button>Back</Button>
        <h1>Order {order.id}</h1>
        <Badge>{order.status}</Badge>
      </div>
      
      {/* OrderItems */}
      <Card>
        {order.items.map(...)} {/* 100 lines */}
      </Card>
      
      {/* OrderSummary */}
      <div>{/* 50 lines */}</div>
    </div>
  );
}
```

```tsx
// ✅ GOOD: Extract components
function OrderDetail() {
  return (
    <>
      <OrderHeader order={order} />
      <OrderItems items={order.items} />
      <OrderSummary order={order} />
    </>
  );
}
```

### ❌ Don't Duplicate UI Code

```tsx
// ❌ BAD: Same badge logic everywhere
<Badge className={order.status === 'paid' ? 'bg-green-500' : 'bg-red-500'}>
  {order.status}
</Badge>
```

```tsx
// ✅ GOOD: Reusable component
export function OrderStatusBadge({ status }) {
  return (
    <Badge variant="secondary" className={statusColors[status]}>
      {statusLabels[status] || status}
    </Badge>
  );
}
```

---

## 7. Quick Wins

### Immediate Improvements

1. **Extract Cart UI** → `components/shop/cart-*.tsx` (saves 200+ lines in route)
2. **Extract Order Detail** → `components/dashboard/order-detail.tsx` (saves 150+ lines)
3. **Extract Admin Table** → `components/admin/orders-table.tsx` (saves 100+ lines)
4. **Create shared hooks** → `hooks/use-cart.ts`, `hooks/use-orders.ts`
5. **Add OrderStatusBadge** → Reuse across 4 files

### File Size Guidelines

- **Route files:** < 100 lines (ideal), < 200 lines (max)
- **Component files:** < 200 lines (ideal), < 300 lines (max)
- **Hook files:** < 100 lines

### Refactoring Checklist

When you see a route file > 200 lines:

- [ ] Extract page sections to components
- [ ] Move mutations/queries to custom hooks
- [ ] Extract repeated UI patterns
- [ ] Create feature-specific folders (`shop/`, `dashboard/`)
- [ ] Use composition over props drilling

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| Route files | 300-400 lines | < 100 lines |
| Components | Inline in routes | Extracted to components/ |
| API calls | Raw fetch() | RPC helpers from api.ts |
| Type safety | Mixed null/undefined | Consistent types |
| Reusability | Copy-paste | Shared components |
| Testability | Hard to test | Easy to test |

**Next steps:** Apply these patterns to existing routes, starting with the largest files first.

