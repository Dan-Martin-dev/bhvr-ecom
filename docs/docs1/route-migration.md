# Route Structure Migration Guide

**Date:** January 6, 2026  
**Migrations:**
- Dashboard Routes: Flat Routes → Nested Route Groups  
- Shop Routes: Flat Routes → Nested Route Groups

---

## Dashboard Migration

### Before (Flat Structure)

```
routes/
├── dashboard.tsx                          # 🔴 Flat, auth check inline
├── dashboard.orders.tsx                   # 🔴 Dot notation
├── dashboard.orders.$orderId.tsx          # 🔴 Hard to find
├── dashboard.admin.orders.tsx
└── dashboard.admin.orders.$orderId.tsx
```

### After (Nested Structure)

```
routes/
└── (authenticated)/                       # ✅ Auth group
    ├── route.tsx                          # ✅ Auth check ONCE
    └── dashboard/
        ├── route.tsx                      # ✅ Layout with nav
        ├── index.tsx                      # ✅ Dashboard home
        ├── orders/
        │   ├── index.tsx                  # ✅ Orders list
        │   └── $orderId.tsx               # ✅ Order detail
        └── admin/
            └── orders/
                ├── index.tsx              # ✅ Admin list
                └── $orderId.tsx           # ✅ Admin detail
```

---

## Shop Migration

### Before (Flat Structure)

```
routes/
├── shop.tsx                               # 🔴 Flat layout
├── shop.products.tsx                      # 🔴 Dot notation
├── shop.products.$slug.tsx                # 🔴 Hard to organize
├── shop.cart.tsx
├── shop.checkout.tsx
├── shop.order.success.tsx
├── shop.order.pending.tsx
└── shop.order.failure.tsx
```

### After (Nested Structure)

```
routes/
└── (shop)/                                # ✅ Shop group
    ├── route.tsx                          # ✅ Shared layout
    ├── cart.tsx                           # ✅ Shopping cart
    ├── checkout.tsx                       # ✅ Checkout flow
    ├── products/
    │   ├── index.tsx                      # ✅ Products list
    │   └── $slug.tsx                      # ✅ Product detail
    └── order/
        ├── success.tsx                    # ✅ Order success
        ├── pending.tsx                    # ✅ Order pending
        └── failure.tsx                    # ✅ Order failure
```

---

## Benefits

### 1. Auth Check in One Place

**Before:** Auth logic duplicated across 5 files
```tsx
// In EVERY dashboard route:
export const Route = createFileRoute("/dashboard/orders")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) throw redirect({ to: "/login" });
    return { session };
  },
});
```

**After:** Auth logic in ONE file
```tsx
// apps/web/src/routes/(authenticated)/route.tsx
export const Route = createFileRoute("/(authenticated)")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) throw redirect({ to: "/login" });
    return { session };  // Available to all child routes
  },
  component: () => <Outlet />,
});
```

### 2. Shared Layout

**Before:** Navigation duplicated or missing
```tsx
// Each route handles its own nav 😫
```

**After:** Layout in ONE file
```tsx
// apps/web/src/routes/(authenticated)/dashboard/route.tsx
function DashboardLayout() {
  const { session } = Route.useRouteContext();  // From parent!
  
  return (
    <div>
      <h1>Welcome, {session.data?.user.name}!</h1>
      <nav>
        <Link to="/dashboard">Overview</Link>
        <Link to="/dashboard/orders">My Orders</Link>
      </nav>
      <Outlet />  {/* Child routes */}
    </div>
  );
}
```

### 3. Better Organization

**Before:**
- Hard to find related routes
- No visual grouping
- Naming collisions possible

**After:**
- Clear hierarchy
- Related routes together
- Impossible to have naming conflicts

---

## Route Paths (Unchanged)

The **URL paths remain exactly the same**:

| Route File | URL Path |
|------------|----------|
| `(authenticated)/dashboard/index.tsx` | `/dashboard` |
| `(authenticated)/dashboard/orders/index.tsx` | `/dashboard/orders` |
| `(authenticated)/dashboard/orders/$orderId.tsx` | `/dashboard/orders/123` |
| `(authenticated)/dashboard/admin/orders/index.tsx` | `/dashboard/admin/orders` |

**Note:** `(authenticated)` is a **route group** (parentheses) - it doesn't affect URLs!

---

## Files Created

### 1. Auth Guard
```tsx
// apps/web/src/routes/(authenticated)/route.tsx
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/(authenticated)")({
  component: AuthenticatedLayout,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login", throw: true });
    }
    return { session };
  },
});

function AuthenticatedLayout() {
  return <Outlet />;  // Pass through to children
}
```

### 2. Dashboard Layout
```tsx
// apps/web/src/routes/(authenticated)/dashboard/route.tsx
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(authenticated)/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const { session } = Route.useRouteContext();  // From auth guard
  
  return (
    <div className="container py-8">
      <h1>Dashboard - {session.data?.user.name}</h1>
      
      <nav className="flex gap-2 mb-6 border-b pb-4">
        <Link to="/dashboard">Overview</Link>
        <Link to="/dashboard/orders">My Orders</Link>
        <Link to="/dashboard/admin/orders">Admin</Link>
      </nav>
      
      <Outlet />  {/* Child routes render here */}
    </div>
  );
}
```

### 3. Dashboard Home
```tsx
// apps/web/src/routes/(authenticated)/dashboard/index.tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(authenticated)/dashboard/")({
  component: DashboardIndex,
});

function DashboardIndex() {
  return (
    <div>
      <h2>Dashboard Overview</h2>
      {/* Stats, recent orders, etc */}
    </div>
  );
}
```

---

## Migration Checklist

- [x] Create `(authenticated)/route.tsx` with auth check
- [x] Create `dashboard/route.tsx` with layout
- [x] Create `dashboard/index.tsx` for home page
- [x] Move `dashboard.orders.tsx` → `dashboard/orders/index.tsx`
- [x] Move `dashboard.orders.$orderId.tsx` → `dashboard/orders/$orderId.tsx`
- [x] Move `dashboard.admin.orders.tsx` → `dashboard/admin/orders/index.tsx`
- [x] Move `dashboard.admin.orders.$orderId.tsx` → `dashboard/admin/orders/$orderId.tsx`
- [x] Delete old `dashboard.tsx`
- [x] Update documentation
- [x] Test all routes still work
- [x] Run `make check` to verify types

---

## How TanStack Router Handles This

### Route Groups (Parentheses)

```
(authenticated)/           # NOT in URL path
  dashboard/              # /dashboard
    orders/               # /dashboard/orders
      $orderId.tsx        # /dashboard/orders/:orderId
```

**Rule:** Folders wrapped in `()` don't create URL segments.

### Layouts (`route.tsx`)

```
dashboard/
  route.tsx              # Layout for all dashboard/* routes
  index.tsx              # Renders at /dashboard
  orders/
    index.tsx            # Renders at /dashboard/orders
```

**Rule:** `route.tsx` = layout with `<Outlet />`, `index.tsx` = index route.

### Context Sharing

```tsx
// Parent route
export const Route = createFileRoute("/(authenticated)")({
  beforeLoad: async () => {
    return { session: await getSession() };
  },
});

// Child route can access parent's context
function ChildComponent() {
  const { session } = Route.useRouteContext();  // ✅ Works!
}
```

---

## Testing the Migration

### 1. Start Dev Server
```bash
cd /home/vare/project/ecom_202/bhvr-ecom
make dev
```

### 2. Test Routes
- [ ] Visit `/dashboard` → Should show dashboard home
- [ ] Click "My Orders" → Should go to `/dashboard/orders`
- [ ] Click an order → Should go to `/dashboard/orders/123`
- [ ] Visit `/dashboard/admin/orders` → Should show admin list
- [ ] All routes should require login
- [ ] Navigation should persist across routes

### 3. Verify Auth
- [ ] Visit `/dashboard` while logged out → Redirects to `/login`
- [ ] Login → Redirects back to `/dashboard`
- [ ] All dashboard routes protected

---

## Common Issues & Solutions

### Issue: "Route not found"
**Cause:** TanStack Router needs to regenerate route tree  
**Solution:** Restart dev server or run `bun run build`

### Issue: "Session not available in child route"
**Cause:** Not using `Route.useRouteContext()`  
**Solution:** 
```tsx
// ❌ Wrong
const session = useSession();

// ✅ Correct
const { session } = Route.useRouteContext();
```

### Issue: "Link doesn't work"
**Cause:** Old path in `Link` component  
**Solution:** Paths are the same! `/dashboard/orders` still works.

---

## Next Steps

### Optional Improvements

1. **Add role-based auth** for admin routes:
```tsx
// In (authenticated)/dashboard/admin/route.tsx
beforeLoad: async ({ context }) => {
  if (context.session.data?.user.role !== 'admin') {
    throw redirect({ to: '/dashboard' });
  }
},
```

2. **Add loading states**:
```tsx
export const Route = createFileRoute("/(authenticated)/dashboard/")({
  pendingComponent: () => <LoadingSkeleton />,
  component: DashboardIndex,
});
```

3. **Add error boundaries**:
```tsx
export const Route = createFileRoute("/(authenticated)")({
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});
```

---

## Summary

### Dashboard Routes

| Aspect | Before | After |
|--------|--------|-------|
| **Structure** | Flat with dots | Nested with folders |
| **Auth check** | 5 duplicate checks | 1 parent guard |
| **Layout** | Inline or missing | Shared `route.tsx` |
| **Navigation** | Per-route | Shared in layout |
| **Discoverability** | Hard to find | Clear hierarchy |
| **Maintainability** | Copy-paste | DRY principle |

### Shop Routes

| Aspect | Before | After |
|--------|--------|-------|
| **Structure** | Flat with dots (`shop.cart.tsx`) | Nested folders (`(shop)/cart.tsx`) |
| **Organization** | 8 files at root level | Organized in subdirectories |
| **Products** | `shop.products.tsx`, `shop.products.$slug.tsx` | `products/index.tsx`, `products/$slug.tsx` |
| **Orders** | `shop.order.success.tsx`, etc. | `order/success.tsx`, `order/pending.tsx`, `order/failure.tsx` |
| **Layout** | Shared via `shop.tsx` | Shared via `(shop)/route.tsx` |
| **URL Paths** | `/shop/products`, `/shop/cart` | `/products`, `/cart` (cleaner!) |

**Result:** Cleaner, more maintainable, follows TanStack Router best practices! 🎉

