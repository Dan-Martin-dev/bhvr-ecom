# CONTEXT.md

> **Purpose:** Provide AI assistants with project context. Keep this file updated.

## Project

**Name:** bhvr-ecom  
**Type:** E-commerce monorepo  
**Stack:** Bun, Hono, Vite, React, TanStack Router, Drizzle, PostgreSQL, Redis  

## Structure

```
apps/
  server/     # Hono API server
  web/        # React frontend (TanStack Router)
packages/
  core/       # Business logic (clean architecture)
  db/         # Drizzle schema & migrations
  auth/       # Better-Auth config
  validations/ # Zod schemas
  cache/      # Redis utilities
  env/        # Environment validation
```

## Key Docs

| Doc | Purpose |
|-----|---------|
| `docs/PRD.md` | Product requirements |
| `docs/clean-architecture.md` | Core package patterns |
| `docs/hono-rpc-guide.md` | API usage |
| `docs/frontend-structure.md` | Route & component patterns |
| `docs/route-migration.md` | Route refactoring history |

## Current State

- ✅ Products, Cart, Checkout, Orders implemented
- ✅ Product Variants (size, color, material, style) with separate inventory
- ✅ Mercado Pago payments integrated
- ✅ Admin dashboard functional
- ✅ Admin product management (CRUD interface) implemented
- ✅ Inventory management UI with stock adjustments and low stock alerts
- ✅ Guest cart with localStorage and auto-merge on login
- ✅ Shipping methods with cost calculations and delivery estimates
- ✅ Password reset with email verification flow
- ✅ Routes migrated to nested structure with route groups
- ✅ API rate limiting with Redis
- ✅ Analytics dashboard with metrics

## Rules

### Architecture & Dependencies

1. **Read before writing** — Check existing code patterns first
2. **Follow Clean Architecture** — Domain → Application → Infrastructure → Presentation
3. **Core logic in packages/core** — Keep routes thin, business logic isolated
4. **No circular dependencies** — Packages can't import from apps, only other packages
5. **Validate at boundaries** — Use Zod schemas from `@bhvr-ecom/validations` for all external inputs

### Database & Caching

6. **Schema changes require migrations** — Never modify DB directly, use `bun run db:push` or `bun run db:generate`
7. **Cache invalidation is explicit** — When mutating data, invalidate related Redis keys
8. **Use transactions for multi-step operations** — Drizzle transactions for orders, cart updates, etc.
9. **Index frequently queried fields** — Add indexes in schema for performance-critical queries

### Type Safety & Validation

10. **Type-safe API calls** — Use Hono RPC client, not raw fetch
11. **Infer types from schemas** — `z.infer<typeof schema>`, don't duplicate types
12. **Runtime validation on server** — Parse with Zod in API handlers before business logic
13. **Validate environment variables** — All env vars must be in `packages/env` with Zod schemas

### Frontend (React + TanStack Router)

14. **Use route groups** — `(authenticated)/`, `(shop)/` for organization
15. **No flat routes** — Use nested folders, not `shop.cart.tsx`
16. **Links use URL paths** — `to="/products"` not `to="/(shop)/products"`
17. **Loader data for server state** — Use TanStack Router loaders, not useEffect fetching
18. **Suspense boundaries** — Wrap async components with `<Suspense>` for better UX
19. **Error boundaries at route level** — Each route group needs error boundary

### Code Quality & Performance

20. **Run `make check`** — Verify types before committing
21. **Lazy load heavy components** — Use `React.lazy()` for charts, editors, admin features
22. **Debounce search inputs** — Use `useDebouncedValue` for real-time search
23. **Optimize images** — Serve WebP/AVIF, use proper sizing
24. **Bundle analysis before deploy** — Check bundle size with `bun run build --analyze`

### Bun-Specific

25. **Use bun APIs when available** — `Bun.file()`, `Bun.password.hash()` instead of Node.js equivalents
26. **Test with `bun test`** — Use Bun's built-in test runner, not Jest
27. **Native SQLite for tests** — Use `bun:sqlite` for fast in-memory test databases

### Security

28. **Never expose env vars to client** — Only import from `packages/env/client.ts` in frontend
29. **Validate user permissions** — Check auth in loaders/middleware, not just UI
30. **Sanitize user content** — Escape HTML in user-generated content (reviews, comments)
31. **Rate limit sensitive endpoints** — Use Redis-based rate limiting for auth, checkout

### Hono RPC & API Patterns

32. **Use `api` client from `lib/api.ts`** — Already configured with type safety, don't create new clients
33. **Chain routes with method syntax** — `.get(...).post(...).put(...)` for RPC type inference
34. **Use `zValidator` middleware** — `zValidator("json", schema)` not manual `c.req.json()` parsing
35. **Export route handlers as default** — `export default products` for clean imports in main app
36. **Return consistent error shapes** — `{ error: string, code?: string }` with proper HTTP status

### TanStack Query Integration

37. **Query keys follow convention** — `["resource", params]` e.g. `["products", { page, search }]`
38. **Invalidate on mutations** — Always `queryClient.invalidateQueries({ queryKey: ["resource"] })`
39. **Use mutations for side effects** — `useMutation` for POST/PUT/DELETE, not `useQuery`
40. **Handle loading and error states** — Every query needs `isLoading` and `error` handling in UI

### File & Component Naming

41. **Route files are lowercase** — `products/index.tsx`, `$slug.tsx`, not `Products.tsx`
42. **Components are PascalCase** — `ProductCard.tsx`, `CartItem.tsx`
43. **Dynamic routes use `$` prefix** — `$slug.tsx`, `$id.tsx` (TanStack Router convention)
44. **UI components go in `components/ui/`** — shadcn components only
45. **Feature components alongside routes** — Put `ProductCard` near `/products` route, not global

### Imports & Exports

46. **Use path aliases** — `@/components`, `@bhvr-ecom/core`, not relative `../../`
47. **Barrel exports in packages** — Each package has `index.ts` exporting public API
48. **Named exports for use cases** — `export async function getProducts()`, not default export
49. **Type imports use `type` keyword** — `import type { User }` to avoid bundling issues

### Type Organization

50. **Domain types live in packages** — `Product`, `Order`, `Cart` types in `@bhvr-ecom/validations` (inferred from Zod) or `@bhvr-ecom/core/types`
51. **Infer types from Zod schemas** — `export type Product = z.infer<typeof productSchema>`, never duplicate
52. **No duplicate interfaces** — If a type exists in packages, import it; don't redefine locally
53. **Component-only props stay local** — `interface ButtonProps` can live in button file, but domain types cannot
54. **API response types derived from RPC** — Use `Awaited<ReturnType<typeof api.endpoint.$get>>` for response types when possible

### Error Handling

55. **Global error handler in server** — HTTPException and ZodError already handled in `index.ts`
56. **Toast for user-facing errors** — Use `toast.error()` from sonner in mutations
57. **Log errors server-side** — `console.error` with stack trace for debugging
58. **Never expose internal errors to client** — Return generic "Internal error" for unexpected failures

## Commands

```bash
make dev      # Start all services
make check    # Type check
make test     # Run tests
make db-push  # Push schema changes
```

## Recent Changes

- Migrated dashboard routes to `(authenticated)/dashboard/`
- Migrated shop routes to `(shop)/` with nested `products/` and `order/`
- URLs simplified: `/shop/products` → `/products`
- Implemented admin product management UI at `/dashboard/admin/products`
  - Product list with search, pagination, and filters
  - Create product form with validation
  - Edit product form with real-time updates
  - Delete functionality with confirmation
- Implemented guest cart with localStorage
  - `lib/guest-cart.ts` service for client-side cart management
  - `lib/use-cart.ts` hook supporting both guest and authenticated users
  - Cart routes updated to accept `x-session-id` header for guests
  - Auto-merge guest cart with user cart on login via `/api/cart/merge`
  - Session ID persisted across page refreshes

---

*Last updated: January 7, 2026*
