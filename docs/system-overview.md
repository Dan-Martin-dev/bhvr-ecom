# System Overview — BHVR Stack E-Commerce

> A comprehensive technical guide to the architecture, data flow, self-hosting infrastructure, and caching strategy of the bhvr-ecom project.

**Version:** 1.0.0  
**Date:** January 2026

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Data Flow: "Add to Cart" Request Lifecycle](#2-data-flow-add-to-cart-request-lifecycle)
3. [Self-Hosting Infrastructure](#3-self-hosting-infrastructure)
4. [Performance & Caching](#4-performance--caching)

---

## 1. High-Level Architecture

The BHVR stack follows a **Clean Architecture** pattern with clearly separated layers. Each layer has a single responsibility, improving testability and maintainability.

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                              │
└───────────────────────────────────┬────────────────────────────────────────┘
                                    │ HTTP / Hono RPC
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER (apps/)                         │
│  ┌─────────────────────────────┐    ┌─────────────────────────────────┐   │
│  │  apps/web (Vite + React)    │    │   apps/server (Hono + Bun)      │   │
│  │  - TanStack Router          │    │   - REST/RPC Endpoints          │   │
│  │  - TanStack Query           │◀──▶│   - Authentication Middleware   │   │
│  │  - UI Components            │    │   - Request Validation (Zod)    │   │
│  │  - Client-side Caching      │    │   - Error Handling              │   │
│  └─────────────────────────────┘    └────────────┬────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘
                                                   │ Use Case Calls
                                                   ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER (packages/core/)                  │
│  ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────────┐ │
│  │  products/         │ │  cart/             │ │  orders/               │ │
│  │  - listProducts()  │ │  - getOrCreate()   │ │  - createOrder()       │ │
│  │  - createProduct() │ │  - addToCart()     │ │  - updateStatus()      │ │
│  │  - updateStock()   │ │  - mergeGuestCart()│ │  - getOrderHistory()   │ │
│  └────────────────────┘ └────────────────────┘ └────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┬┘
                                                                            │
                                                                            ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER (packages/)                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐ │
│  │  packages/db     │  │  packages/cache  │  │  packages/auth           │ │
│  │  - Drizzle ORM   │  │  - Redis Client  │  │  - Better Auth           │ │
│  │  - Schema Defs   │  │  - Session Mgmt  │  │  - Session Store         │ │
│  │  - Migrations    │  │  - Cache Helpers │  │  - Role Guards           │ │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────────────────────┘ │
└───────────┼─────────────────────┼──────────────────────────────────────────┘
            │                     │
            ▼                     ▼
┌────────────────────┐   ┌────────────────────┐
│  PostgreSQL 16     │   │  Redis 7           │
│  - Persistent data │   │  - Sessions        │
│  - ACID compliance │   │  - Cache           │
└────────────────────┘   └────────────────────┘
```

### Layer Responsibilities

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Presentation** | `apps/web`, `apps/server` | HTTP handling, routing, UI, validation, auth middleware |
| **Application** | `packages/core` | Business logic, use cases, orchestration |
| **Infrastructure** | `packages/db`, `packages/cache`, `packages/auth` | Data access, caching, authentication |
| **Shared** | `packages/validations`, `packages/env` | Zod schemas, environment config |

### Key Technologies

| Component | Technology | Purpose |
|-----------|------------|---------|
| Runtime | **Bun** | Fast JavaScript runtime (~3x faster than Node.js cold starts) |
| Backend | **Hono** | Lightweight web framework with RPC client generation |
| Frontend | **Vite + React 19** | Fast HMR, modern React with TanStack ecosystem |
| Router | **TanStack Router** | Type-safe file-based routing |
| Data Fetching | **TanStack Query** | Caching, deduplication, background refetching |
| Database | **Drizzle ORM + PostgreSQL** | Type-safe SQL queries, migrations |
| Cache | **Redis (ioredis)** | Sessions, ephemeral cache, rate limiting |
| Auth | **Better Auth** | Session-based authentication with role support |

---

## 2. Data Flow: "Add to Cart" Request Lifecycle

This section walks through exactly what happens when a user clicks "Add to Cart" on a product page.

### 2.1 Client-Side (React + TanStack Query)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ProductCard Component                                                  │
│  └─► User clicks "Add to Cart" button                                   │
│        │                                                                │
│        ▼                                                                │
│  useCart() Hook (apps/web/src/lib/use-cart.ts)                         │
│  └─► addToCartMutation.mutate({ productId, quantity: 1 })              │
│        │                                                                │
│        ▼                                                                │
│  TanStack Query useMutation                                            │
│  └─► Calls cartApi.addItem(productId, quantity, sessionId?)            │
│        │                                                                │
│        ▼                                                                │
│  cartApi (apps/web/src/lib/api.ts)                                     │
│  └─► fetch("/api/cart/items", { method: "POST", body: {...} })         │
│        │                                                                │
│        │  Headers: x-session-id (for guests) OR session cookie (auth)  │
└────────┼────────────────────────────────────────────────────────────────┘
         │
         │  HTTP POST /api/cart/items
         ▼
```

**Key Client Behaviors:**
- **Optimistic Updates**: TanStack Query can show immediate feedback before server confirms
- **Query Invalidation**: On success, `queryClient.invalidateQueries({ queryKey: ["cart"] })` triggers refetch
- **Toast Notifications**: Sonner shows success/error messages
- **Guest Support**: `x-session-id` header identifies anonymous users

### 2.2 Server-Side (Hono Router)

```
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Hono Server (apps/server/src/index.ts)                                │
│  └─► Middleware Pipeline:                                              │
│        1. logger() — logs request                                      │
│        2. cors() — validates origin                                    │
│        3. optionalAuth — extracts user OR allows guest                 │
│        │                                                                │
│        ▼                                                                │
│  Cart Route (apps/server/src/routes/cart.ts)                           │
│  └─► POST /items handler:                                              │
│        1. zValidator("json", addToCartSchema) — validates request body │
│        2. Extracts user from context OR sessionId from header          │
│        3. Calls cartUseCases.addToCart(data, userId?, sessionId?)     │
│        │                                                                │
│        ▼                                                                │
│  Validation Schema (@bhvr-ecom/validations)                            │
│  └─► addToCartSchema = z.object({ productId: z.string().uuid(),       │
│                                   quantity: z.number().int().min(1) }) │
└────────┼────────────────────────────────────────────────────────────────┘
         │
         │  Use Case Call
         ▼
```

**Server Responsibilities:**
- **Middleware**: Auth, CORS, logging execute before route handler
- **Validation**: Zod schema rejects invalid payloads with 400 error
- **Authorization**: `optionalAuth` supports both logged-in and guest users

### 2.3 Application Layer (Core Business Logic)

```
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  cartUseCases.addToCart() (packages/core/src/cart/index.ts)            │
│                                                                         │
│  Step 1: Get or Create Cart                                            │
│  └─► Find cart by userId OR sessionId                                  │
│      └─► If not found: INSERT INTO cart (...) RETURNING *              │
│                                                                         │
│  Step 2: Validate Product                                              │
│  └─► SELECT * FROM product WHERE id = ? AND is_active = true           │
│      └─► If not found: throw Error("Product not found")                │
│                                                                         │
│  Step 3: Check Stock                                                   │
│  └─► If product.trackInventory && !product.allowBackorder:             │
│      └─► If stock < quantity: throw Error("Only X items available")    │
│                                                                         │
│  Step 4: Upsert Cart Item                                              │
│  └─► Check if product already in cart:                                 │
│      ├─► YES: UPDATE cart_item SET quantity = quantity + ?             │
│      └─► NO:  INSERT INTO cart_item (...) RETURNING *                  │
│                                                                         │
│  Step 5: Return Updated Item                                           │
│  └─► { id, cartId, productId, quantity, priceAtAdd }                   │
└────────┼────────────────────────────────────────────────────────────────┘
         │
         │  Drizzle ORM Queries
         ▼
```

**Business Rules Enforced:**
- Cart is created lazily on first item add
- Inactive products cannot be added
- Stock validation prevents overselling
- Price captured at add time (`priceAtAdd`) for audit trail

### 2.4 Database Layer (Drizzle + PostgreSQL)

```
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Drizzle ORM (packages/db)                                             │
│                                                                         │
│  Query: Find existing cart                                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  SELECT c.*, ci.*, p.*                                          │   │
│  │  FROM cart c                                                    │   │
│  │  LEFT JOIN cart_item ci ON ci.cart_id = c.id                    │   │
│  │  LEFT JOIN product p ON p.id = ci.product_id                    │   │
│  │  WHERE c.user_id = ? OR c.session_id = ?                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Query: Insert cart item                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  INSERT INTO cart_item (cart_id, product_id, quantity, price)   │   │
│  │  VALUES (?, ?, ?, ?)                                            │   │
│  │  RETURNING *                                                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Schema (packages/db/src/schema/ecommerce.ts)                          │
│  └─► cart: { id, userId?, sessionId?, createdAt, updatedAt }          │
│  └─► cart_item: { id, cartId, productId, quantity, priceAtAdd }       │
│  └─► Relations: cart → items → product → images                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.5 Response Flow (Back to Client)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Response Chain                                                         │
│                                                                         │
│  Database → Core → Server → Client                                     │
│                                                                         │
│  1. Drizzle returns: { id, cartId, productId, quantity, priceAtAdd }   │
│  2. Core passes through (no transformation needed)                     │
│  3. Hono: return c.json(result, 201)                                   │
│  4. TanStack Query:                                                    │
│     └─► onSuccess: invalidateQueries(["cart"]) → triggers refetch     │
│     └─► toast.success("Added to cart")                                │
│  5. UI re-renders with updated cart count                              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Self-Hosting Infrastructure

### 3.1 Deployment Architecture

The project is designed for **single-VPS deployment** with Docker Compose, targeting €5–10/month hosting costs.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           INTERNET                                      │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTPS (443)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Reverse Proxy (Caddy / Nginx)                                         │
│  - Automatic SSL via Let's Encrypt                                     │
│  - Serves static assets (Vite build output)                            │
│  - Proxies /api/* to Hono server                                       │
│  - Compression, caching headers                                        │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTP (3000)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Docker Network: bhvr-network                                          │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  bhvr-ecom-server (Bun + Hono)                                   │  │
│  │  - Handles API requests                                          │  │
│  │  - Runs on internal port 3000                                    │  │
│  │  - Connects to postgres:5432 and redis:6379                      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │  PostgreSQL 16          │  │  Redis 7                            │  │
│  │  - Port 5432 (internal) │  │  - Port 6379 (internal)             │  │
│  │  - Volume: postgres_data│  │  - Volume: redis_data               │  │
│  │  - Healthcheck enabled  │  │  - AOF persistence                  │  │
│  └─────────────────────────┘  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Reverse Proxy Configuration

#### Caddy (Recommended — Auto SSL)

```caddyfile
shop.example.com {
    # Serve static frontend files
    root * /var/www/bhvr-ecom/dist
    file_server

    # Proxy API to Hono server
    handle /api/* {
        reverse_proxy bhvr-ecom-server:3000
    }

    # SPA fallback
    try_files {path} /index.html
    
    # Enable compression
    encode gzip zstd
}
```

#### Nginx Alternative

```nginx
server {
    listen 443 ssl http2;
    server_name shop.example.com;

    ssl_certificate /etc/letsencrypt/live/shop.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/shop.example.com/privkey.pem;

    # Static assets with long cache
    location /assets/ {
        root /var/www/bhvr-ecom/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA fallback
    location / {
        root /var/www/bhvr-ecom/dist;
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/plain application/json application/javascript text/css;
}
```

### 3.3 Docker Build Strategy

The Dockerfile uses a **multi-stage build** for minimal production images:

```dockerfile
# Stage 1: PRUNE — Extract only server package and dependencies
FROM oven/bun:1 AS pruner
RUN bun x turbo prune --scope=server --docker

# Stage 2: BUILD — Install deps and compile
FROM oven/bun:1 AS builder
COPY --from=pruner /app/out/json/ .
RUN bun install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN bun run build --filter=server

# Stage 3: RUNNER — Production image
FROM oven/bun:1 AS runner
ENV NODE_ENV=production
USER appuser  # Non-root for security
CMD ["bun", "apps/server/src/index.ts"]
```

**Benefits:**
- **Smaller Image**: Only production dependencies included
- **Layer Caching**: Package changes don't invalidate source layer
- **Security**: Non-root user, no dev tools in production

### 3.4 Deployment Commands

```bash
# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f server

# Run database migrations
docker compose exec server bun run db:migrate

# Scale horizontally (if needed)
docker compose up -d --scale server=3
```

---

## 4. Performance & Caching

### 4.1 Caching Layers Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CACHING ARCHITECTURE                           │
│                                                                         │
│  Layer 1: Browser Cache                                                │
│  └─► Static assets (JS/CSS/images) with Cache-Control: max-age=31536000│
│                                                                         │
│  Layer 2: TanStack Query (Client)                                      │
│  └─► In-memory cache with staleTime/gcTime                             │
│  └─► Automatic deduplication of concurrent requests                    │
│  └─► Background refetching when data becomes stale                     │
│                                                                         │
│  Layer 3: Redis (Server)                                               │
│  └─► Session storage (30-day TTL)                                      │
│  └─► Frequently accessed data (products, categories)                   │
│  └─► Rate limiting counters                                            │
│                                                                         │
│  Layer 4: PostgreSQL                                                   │
│  └─► Indexed queries, connection pooling                               │
│  └─► Query result caching (pg_stat_statements)                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 TanStack Query Configuration

TanStack Query is the primary client-side caching solution, providing:

```typescript
// apps/web/src/lib/use-cart.ts
const { data: cart, isLoading, error } = useQuery<Cart>({
  queryKey: ["cart", isAuthenticated ? "auth" : sessionId],
  queryFn: async () => cartApi.get(sessionId),
  // staleTime: Data considered fresh for 30 seconds
  // gcTime: Cached data kept for 5 minutes after last use
});

// Invalidate cache after mutations
const addToCartMutation = useMutation({
  mutationFn: (data) => cartApi.addItem(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["cart"] });
  },
});
```

**TanStack Query Benefits:**
| Feature | Benefit |
|---------|---------|
| **Deduplication** | Multiple components requesting `["cart"]` make only 1 network request |
| **Background Refetch** | Data refreshes automatically when window regains focus |
| **Optimistic Updates** | UI updates immediately, rolls back on error |
| **Garbage Collection** | Unused cache entries are automatically cleaned up |
| **DevTools** | Visual debugging of cache state |

### 4.3 Redis Caching Strategy

The `@bhvr-ecom/cache` package provides type-safe Redis helpers:

```typescript
// packages/cache/src/index.ts
export const cache = {
  // Generic cache operations
  async get<T>(key: string): Promise<T | null>,
  async set(key: string, value: any, ttl?: number): Promise<void>,
  async del(key: string): Promise<void>,
  async delPattern(pattern: string): Promise<void>,
};

// Session-specific operations (30-day TTL)
export const session = {
  async get<T>(sessionId: string): Promise<T | null>,
  async set(sessionId: string, data: any): Promise<void>,
  async delete(sessionId: string): Promise<void>,
  async touch(sessionId: string): Promise<void>,  // Extend TTL
};
```

**Cache Key Patterns:**

| Key Pattern | TTL | Purpose |
|-------------|-----|---------|
| `session:{id}` | 30 days | User/guest session data |
| `products:list:{hash}` | 5 min | Product listing cache |
| `product:{id}` | 10 min | Single product cache |
| `cart:{userId}` | 1 hour | Cart cache (for quick reads) |
| `ratelimit:{ip}:{endpoint}` | 1 min | API rate limiting |

### 4.4 Cache Invalidation

```typescript
// When a product is updated, invalidate related caches
async function updateProduct(id: string, data: UpdateProductInput) {
  // Update database
  const product = await db.update(product).set(data).where(eq(product.id, id));
  
  // Invalidate caches
  await cache.del(`product:${id}`);
  await cache.delPattern(`products:list:*`);  // Invalidate all list variants
  
  return product;
}
```

### 4.5 Performance Targets

| Metric | Target | How Achieved |
|--------|--------|--------------|
| API Response (p95) | < 50ms | Bun runtime, Redis caching, indexed queries |
| Time to First Byte | < 100ms | Edge caching, gzip compression |
| Lighthouse Score | > 90 | Code splitting, lazy loading, image optimization |
| Cold Start | < 500ms | Bun's fast startup, minimal dependencies |
| Database Query | < 10ms | Drizzle ORM, proper indexes, connection pooling |

### 4.6 Monitoring & Observability

```typescript
// Built-in health check
app.get("/api/health", (c) => {
  return c.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    // Could add: redis ping, db ping, memory usage
  });
});

// Hono logger middleware
app.use(logger());  // Logs: --> GET /api/products 200 12ms
```

**Recommended additions for production:**
- Prometheus metrics endpoint (`/metrics`)
- Structured JSON logging
- Error tracking (Sentry/LogTail)
- APM traces for slow queries

---

## Summary

The BHVR stack provides a complete, production-ready e-commerce foundation:

1. **Clean Architecture** separates concerns across presentation, application, and infrastructure layers
2. **Type Safety** flows from database schema → Zod validation → Hono RPC → React components
3. **Self-Hosting** via Docker Compose with Caddy/Nginx reverse proxy keeps costs under €10/month
4. **Multi-Layer Caching** (TanStack Query + Redis) delivers sub-50ms API responses

For more details, see:
- [Clean Architecture](clean-architecture.md)
- [Port Strategy](port-strategy.md)
- [Database Schema](database-schema.md)
