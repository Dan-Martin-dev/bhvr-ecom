# bhvr-ecom

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React, TanStack Router, Hono, and more.

## Features

### ✅ Completed E-Commerce Features

- **Product Catalog** - Browse products with search, filters, and pagination
- **Product Details** - Individual product pages with images and add-to-cart
- **Shopping Cart** - Full cart management with quantity controls
- **User Authentication** - Better-Auth integration with session management
- **Checkout Flow** - Multi-step checkout with shipping address and payment method
- **Mercado Pago Integration** - Complete payment processing for Argentina/LATAM
  - Payment preferences creation
  - Webhook handling for payment notifications
  - Order status updates based on payment status
- **Order Management** - Complete order history and tracking
  - Customer order list and detail views
  - Admin order management with status updates
  - Tracking number and URL support
- **Admin Dashboard** - Order management interface for administrators
- **Redis Caching** - Session and cart caching for performance

### 🛠️ Technical Stack

- **TypeScript** - For type safety and improved developer experience
- **TanStack Router** - File-based routing with full type safety
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **Hono** - Lightweight, performant server framework
- **Hono RPC** - Type-safe API communication (✅ Implemented!)
- **Bun** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
 # bhvr-ecom

Lightweight, self-hostable e-commerce boilerplate built with the BHVR stack (Bun, Hono, Vite, React, Drizzle, Redis).

This README summarizes quick-start steps, development commands, and links to the project's docs for deeper reading.

Quick links
- Docs: ./docs/
- Architecture: ./docs/clean-architecture.md
- System overview: ./docs/system-overview.md
- Port strategy & deployment: ./docs/port-strategy.md
- Implementation summary: ./docs/implementation-summary-2026-01-08.md

Requirements
- Bun (runtime)
- Docker & Docker Compose (recommended for Postgres + Redis)
- Git (for cloning)

Quick Start (local development)

1) Start Postgres + Redis (recommended):

```bash
# from repo root
make docker-up
```

2) Install dependencies (once):

```bash
make install
# or
bun install
```

3) Initialize database (first time):

```bash
make db-setup   # runs docker-up + db push + seed
```

4) Start development servers (server + web):

```bash
make dev
```

5) Verify health:

```bash
curl http://localhost:3000/api/health
```

Notes
- The server typically runs on port `3000` and the web app on `3001` (Vite may pick another free port).
- Required env vars include `POSTGRES_PASSWORD`, `BETTER_AUTH_SECRET`, and optional payment envs (`MERCADO_PAGO_*`). See `apps/server/.env.example` and `apps/web/.env.example`.

Commands (common)

- `make docker-up` — Start Postgres + Redis (dev)
- `make install` — Install dependencies (Bun)
- `make db-push` / `make db-seed` — Apply schema / seed database
- `make db-reset` — Reset DB (drop + push + seed)
- `make dev` — Start development servers (uses `turbo dev` to run packages)
- `make check` — TypeScript checks across the monorepo
- `make test` — Run test suite

Development pointers
- Use `make db-reset` to return the database to a clean state when tests or seeds conflict.
- When ports conflict, kill processes on ports `3000`, `3001`, `3002` or let Vite select a free port.
- For production, use the multi-stage `Dockerfile` and a reverse proxy (Caddy/Nginx) as described in `./docs/port-strategy.md`.

Project layout

```
bhvr-ecom/
├── apps/         # Deployable apps (web, server)
├── packages/     # Shared packages (db, cache, validations, core)
├── docs/         # Project documentation
├── Dockerfile    # Production multi-stage build
├── docker-compose.dev.yml
└── Makefile      # Common dev commands
```

Need help?
- Read the docs in `./docs/` (system-overview, clean-architecture, port-strategy).
- Want me to run the full dev startup for you (docker-up → db-setup → make dev)? Reply and I'll run it.
