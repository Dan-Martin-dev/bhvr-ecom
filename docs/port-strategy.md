# Port Strategy & Configuration for BHVR Stack

> Best practices for port configuration in development and production for the BHVR e-commerce stack

**Version:** 1.0.0  
**Date:** January 2026  
**Author:** Solution Architecture Team  

---

## Table of Contents

1. [Overview](#overview)
2. [Development Setup](#development-setup)
3. [Production Setup](#production-setup)
4. [Configuration Files](#configuration-files)
5. [Environment Variables](#environment-variables)
6. [Testing the Setup](#testing-the-setup)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The BHVR stack uses a **separate ports strategy in development** and **single port strategy in production**. This provides the best developer experience while maintaining simplicity for deployment.

### Key Benefits

- **Development:** Fast HMR, separate logs, no CORS issues
- **Production:** Single port, simpler SSL, easier deployment
- **Type Safety:** Hono RPC works seamlessly in both environments

---

## Development Setup

### Architecture

```
┌─────────────────────────────────────────┐
│  Browser: http://localhost:3001         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Vite Dev Server (Port 3001)            │
│  - Serves React app                     │
│  - Hot Module Replacement               │
│  - Proxies /api/* → localhost:3000      │
└──────────────┬──────────────────────────┘
               │ Proxy /api/*
               ▼
┌─────────────────────────────────────────┐
│  Hono Server (Port 3000)                │
│  - API endpoints                        │
│  - Better Auth                          │
│  - Business logic                       │
└─────────────────────────────────────────┘
```

### Configuration

#### Vite Proxy Configuration (`apps/web/vite.config.ts`)

```typescript
export default defineConfig({
  plugins: [tailwindcss(), tanstackRouter({}), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3001,
    proxy: {
      // Proxy API requests to backend server
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
```

#### Server Configuration (`apps/server/src/index.ts`)

```typescript
// Development: Just return a message (Vite serves frontend)
app.get("/", (c) => {
  return c.text("🚀 BHVR Stack API Server - Development Mode");
});
```

---

## Production Setup

### Architecture

```
┌─────────────────────────────────────────┐
│  Browser: https://yourdomain.com        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Hono Server (Port 3000)                │
│  ├─ /api/* → API endpoints              │
│  ├─ /api/auth/* → Better Auth           │
│  └─ /* → Static files (Vite build)      │
└─────────────────────────────────────────┘
```

### Configuration

#### Server Static File Serving (`apps/server/src/index.ts`)

```typescript
// Serve static files in production (after API routes)
if (process.env.NODE_ENV === "production") {
  app.use("/*", serveStatic({ root: "./public" }));
  // Fallback to index.html for client-side routing
  app.get("/*", serveStatic({ path: "./public/index.html" }));
}
```

#### Build Process

```bash
# Build frontend
cd apps/web && bun run build

# Copy build to server's public folder
cp -r dist ../../apps/server/public

# Start server (serves frontend + API)
NODE_ENV=production bun run apps/server/src/index.ts
```

---

## Configuration Files

### Root `.env` File

```bash
# Database
POSTGRES_PASSWORD=dev_password_change_in_prod_2026
DATABASE_URL=postgresql://postgres:dev_password_change_in_prod_2026@localhost:5432/bhvr_ecom

# Redis
REDIS_URL=redis://localhost:6379

# Server
PORT=3000

# Authentication
BETTER_AUTH_SECRET=dev-secret-key-change-in-production-min-32-chars
BETTER_AUTH_URL=http://localhost:3000

# CORS - Allow frontend origin (Development: Vite dev server on 3001)
CORS_ORIGIN=http://localhost:3001

# Frontend - Server URL for API calls (Development: empty uses Vite proxy)
VITE_SERVER_URL=

# Mercado Pago (Argentina Payment Gateway)
MERCADO_PAGO_ACCESS_TOKEN=your-access-token
MERCADO_PAGO_PUBLIC_KEY=your-public-key
```

### Production Environment Variables

```bash
# Production .env
NODE_ENV=production
PORT=3000
BETTER_AUTH_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com
VITE_SERVER_URL=https://yourdomain.com
```

---

## Environment Variables

### Development vs Production

| Variable | Development | Production | Purpose |
|----------|-------------|------------|---------|
| `PORT` | 3000 | 3000 | Server port |
| `BETTER_AUTH_URL` | http://localhost:3000 | https://yourdomain.com | Auth callback URL |
| `CORS_ORIGIN` | http://localhost:3001 | https://yourdomain.com | Allowed frontend origin |
| `VITE_SERVER_URL` | (empty) | https://yourdomain.com | API base URL for frontend |

### API Client Configuration

The frontend API client automatically adapts:

```typescript
// apps/web/src/lib/api.ts
export const api = hc<AppType>(env.VITE_SERVER_URL || "");
// Empty string = same origin (works with Vite proxy in dev)
```

---

## Testing the Setup

### Development Testing

```bash
# Terminal 1: Start backend
cd apps/server && bun run dev

# Terminal 2: Start frontend
cd apps/web && bun run dev

# Access:
# Frontend: http://localhost:3001
# Backend: http://localhost:3000/api/health
```

### API Health Check

```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok","timestamp":"2026-01-04T..."}
```

### CORS Testing

```bash
# From frontend console:
fetch('/api/health').then(r => r.json())
# Should work without CORS errors
```

---

## Deployment

### Docker Compose (Recommended)

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - BETTER_AUTH_URL=https://yourdomain.com
      - CORS_ORIGIN=https://yourdomain.com
      - VITE_SERVER_URL=https://yourdomain.com
    volumes:
      - ./apps/server/public:/app/public
```

### VPS Deployment

```bash
# On your server
cd /opt/bhvr-ecom

# Build and deploy
make build-prod
make deploy

# Check health
curl https://yourdomain.com/api/health
```

---

## Troubleshooting

### Common Issues

#### 1. CORS Errors in Development

**Problem:** Frontend can't call API
**Solution:** Check Vite proxy configuration

```typescript
// apps/web/vite.config.ts
proxy: {
  "/api": {
    target: "http://localhost:3000",
    changeOrigin: true,
  },
},
```

#### 2. API Calls Fail in Production

**Problem:** Frontend can't reach API
**Solution:** Check `VITE_SERVER_URL` environment variable

```bash
# Production .env
VITE_SERVER_URL=https://yourdomain.com
```

#### 3. Static Files Not Served

**Problem:** React app shows blank page
**Solution:** Ensure build files are in `apps/server/public/`

```bash
# Build and copy
cd apps/web && bun run build
cp -r dist ../server/public/
```

#### 4. Auth Redirects Fail

**Problem:** Better Auth callbacks don't work
**Solution:** Update `BETTER_AUTH_URL` for production

```bash
BETTER_AUTH_URL=https://yourdomain.com
```

### Debug Commands

```bash
# Check server logs
cd apps/server && bun run dev

# Check frontend build
cd apps/web && bun run build

# Test API directly
curl http://localhost:3000/api/health

# Check environment variables
cd apps/server && bun run -e 'console.log(process.env)'
```

---

## Best Practices

### Development
- ✅ Keep separate ports (3000 server, 3001 frontend)
- ✅ Use Vite proxy for API calls
- ✅ Enable HMR for fast development
- ✅ Separate terminals for frontend/backend logs

### Production
- ✅ Single port (3000) for everything
- ✅ Serve static files from server
- ✅ Use HTTPS everywhere
- ✅ Set proper environment variables

### General
- ✅ Use environment variables, never hardcode URLs
- ✅ Test both development and production builds
- ✅ Monitor API health endpoints
- ✅ Keep CORS configuration minimal

---

## Migration Guide

### From Single Port Development

If you were using single port in development:

1. **Update Vite config** to add proxy
2. **Update .env** to use empty `VITE_SERVER_URL`
3. **Update CORS_ORIGIN** to allow localhost:3001
4. **Test both environments**

### From Different Ports

If you were using different ports:

1. **Standardize on 3000/3001**
2. **Add Vite proxy configuration**
3. **Update environment variables**
4. **Test API calls work through proxy**

---

**This configuration provides the best balance of developer experience and production simplicity for the BHVR stack.**