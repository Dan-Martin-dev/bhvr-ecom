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
- ✅ Mercado Pago payments integrated
- ✅ Admin dashboard functional
- ✅ Routes migrated to nested structure with route groups

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

---

*Last updated: January 6, 2026*
