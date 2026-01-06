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

1. **Read before writing** — Check existing code patterns first
2. **Use route groups** — `(authenticated)/`, `(shop)/` for organization
3. **No flat routes** — Use nested folders, not `shop.cart.tsx`
4. **Links use URL paths** — `to="/products"` not `to="/(shop)/products"`
5. **Core logic in packages/core** — Keep routes thin
6. **Type-safe API calls** — Use Hono RPC client, not raw fetch
7. **Run `make check`** — Verify types before committing

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
