# bhvr-ecom - Product Requirements Document

> A High-Performance, Self-Hosted E-Commerce Boilerplate

**Version:** 1.0.0  
**Date:** January 2026

---

## 1. Executive Summary

### Vision

bhvr-ecom is an open-source e-commerce boilerplate for developers seeking complete control over their store. Built on the BHVR stack (Bun, Hono, Vite, Redis/PostgreSQL), it prioritizes speed, developer experience, and self-hosting.

### Value Proposition

| For | Value |
| --- | ----- |
| Developers | Type-safe, modern stack. No vendor lock-in. |
| Small Businesses | Cost-effective alternative to SaaS platforms. |
| Enterprises | Customizable foundation. Complete data sovereignty. |

### Key Differentiators

- 🚀 **Performance First** — Sub-10ms API responses
- 🔒 **Self-Hosted** — Deploy anywhere, own your data
- 🏗️ **Clean Architecture** — Maintainable, testable codebase
- 🐳 **Docker Native** — One command deployment
- 💰 **Cost Effective** — Runs on €5/month VPS

### Success Metrics

| Metric | Target |
| ------ | ------ |
| Time to First Store | < 30 minutes |
| API Response Time (p95) | < 50ms |
| Lighthouse Score | > 90 |
| Monthly Hosting Cost | < €10 |

---

## 2. Functional Requirements

### 2.1 Authentication & Authorization

| Feature | Priority | Status |
| ------- | -------- | ------ |
| Email/Password Auth | P0 | ✅ |
| OAuth (Google, GitHub) | P1 | ⏳ |
| Session Management | P0 | ✅ |
| Password Reset | P0 | ✅ |
| Role-Based Access (Admin, Customer, Guest) | P0 | ✅ |

### 2.2 Product Management

| Feature | Priority | Status |
| ------- | -------- | ------ |
| Product CRUD | P0 | ✅ |
| Product Variants | P1 | ✅ |
| Categories | P0 | ✅ |
| Product Images | P0 | ✅ |
| Inventory Tracking | P0 | ✅ |
| Product Search | P1 | ✅ |
| SEO Metadata | P1 | ✅ |

### 2.3 Shopping Cart

| Feature | Priority | Status |
| ------- | -------- | ------ |
| Add/Update/Remove Items | P0 | ✅ |
| Cart Persistence | P0 | ✅ |
| Guest Cart | P1 | ✅ |
| Cart Merge on Login | P1 | ✅ |

### 2.4 Checkout & Orders

| Feature | Priority | Status |
| ------- | -------- | ------ |
| Multi-step Checkout | P0 | ✅ |
| Shipping Address | P0 | ✅ |
| Shipping Methods | P1 | ✅ |
| Mercado Pago Integration | P0 | ✅ |
| Order Creation | P0 | ✅ |
| Order History | P1 | ✅ |
| Order Status Tracking | P0 | ✅ |

### 2.5 Admin Dashboard

| Feature | Priority | Status |
| ------- | -------- | ------ |
| Order Management | P0 | ✅ |
| Product Management | P0 | ✅ |
| Customer Management | P1 | ✅ |
| Dashboard Stats | P1 | ✅ |

---

## 3. Technical Stack

| Layer | Technology |
| ----- | ---------- |
| Runtime | Bun |
| Backend | Hono |
| Frontend | React 19 + Vite |
| Routing | TanStack Router |
| Database | PostgreSQL + Drizzle |
| Cache | Redis |
| Auth | Better Auth |
| Payments | Mercado Pago |
| Styling | Tailwind CSS + shadcn/ui |

> **Implementation details** → See `docs/clean-architecture.md` and `docs/hono-rpc-guide.md`

---

## 4. Monorepo Structure

```
apps/
  server/          # Hono API
  web/             # React frontend
packages/
  core/            # Business logic
  db/              # Drizzle schema
  auth/            # Better Auth config
  validations/     # Zod schemas
  cache/           # Redis utilities
  env/             # Environment validation
```

> **Detailed structure** → See `docs/clean-architecture.md`

---

## 5. Non-Functional Requirements

| Requirement | Target |
| ----------- | ------ |
| API p95 Latency | < 50ms |
| Concurrent Users | 1000 on single VPS |
| Uptime | 99.5% |
| Security | OWASP Top 10 compliant |

---

## 6. Deployment Strategy

### 6.1 Infrastructure

**Hosting:** Hetzner Cloud  
**Orchestration:** Dokploy (Docker-based PaaS)

### 6.2 Architecture

```text
Hetzner VPS (CPX21 or better)
├── Dokploy (management layer)
├── PostgreSQL (container)
├── Redis (container)
├── Server (Hono API, port 3000)
└── Web (React frontend, port 5173)
```

### 6.3 Deployment Requirements

| Component | Requirement |
| --------- | ----------- |
| VPS Specs | 3 vCPU, 4GB RAM (Hetzner CPX21 ~€8/mo) |
| Disk Space | 40GB SSD |
| Domains | Custom domain with SSL (Dokploy handles Let's Encrypt) |
| Backups | Automated daily PostgreSQL dumps |

### 6.4 Deployment Process

1. **Provision Hetzner VPS** — Create Ubuntu 22.04 server
2. **Install Dokploy** — One-command installation via script
3. **Configure Project** — Add Git repository to Dokploy
4. **Environment Variables** — Set via Dokploy UI (encrypted storage)
5. **Database Setup** — Dokploy provisions PostgreSQL + Redis containers
6. **Deploy** — Git push triggers automatic build and deployment
7. **SSL & Domains** — Dokploy auto-provisions Let's Encrypt certificates

### 6.5 Monitoring & Maintenance

| Feature | Implementation |
| ------- | -------------- |
| Health Checks | Dokploy monitors container health |
| Logs | Centralized via Dokploy dashboard |
| Backups | Automated PostgreSQL backups to Hetzner volumes |
| Updates | Zero-downtime rolling deployments |
| Rollbacks | One-click rollback to previous version |

> **Implementation guide** → See `docs/deployment-guide.md` (to be created)

---

## 7. Roadmap

### Phase 1: MVP ✅

- Product catalog with search
- Shopping cart
- Checkout with Mercado Pago
- Order management
- Admin dashboard (orders)

### Phase 2: Growth (Current)

- Product variants
- Guest cart + merge
- Email notifications
- Admin product management
- Shipping integrations

### Phase 3: Scale

- Multi-currency support
- Inventory management UI
- Analytics dashboard
- API rate limiting
- CDN for images

---

## Related Documentation

| Document | Purpose |
| -------- | ------- |
| `CONTEXT.md` | AI assistant context |
| `docs/clean-architecture.md` | Code patterns |
| `docs/hono-rpc-guide.md` | API implementation |
| `docs/frontend-structure.md` | Route patterns |
| `docs/database-schema.md` | Schema reference |

---

*PRD focuses on WHAT to build. Implementation details live in technical docs.*
