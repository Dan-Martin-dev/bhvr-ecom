# API Rate Limiting Implementation

## Overview

Redis-based rate limiting middleware to protect API endpoints from abuse and ensure fair resource allocation. Uses a sliding window algorithm for accurate request counting.

## Architecture

### Rate Limiter Middleware

**File:** `apps/server/src/middleware/rate-limit.ts`

- **Algorithm:** Sliding window with Redis counters
- **Storage:** Redis with automatic TTL expiration
- **Key Format:** `ratelimit:{identifier}:{path}`
- **Headers:** Standard `X-RateLimit-*` headers
- **Graceful Degradation:** Falls back to no rate limiting if Redis fails

## Rate Limit Tiers

| Tier | Limit | Window | Use Case |
|------|-------|--------|----------|
| **Auth** | 5 req/min | 60s | Login, signup, password reset |
| **Checkout** | 10 req/min | 60s | Payment creation, order submission |
| **Admin** | 30 req/min | 60s | Admin dashboard operations |
| **Write** | 20 req/min | 60s | Cart updates, product creation |
| **Read** | 200 req/min | 60s | Product listing, cart retrieval |
| **API** | 100 req/min | 60s | General API endpoints |

## Implementation

### Basic Usage

```typescript
import { rateLimit } from "../middleware/rate-limit";

// Custom rate limit
const customLimit = rateLimit({
  windowMs: 60,          // 60 seconds
  max: 50,               // 50 requests
  message: "Too many requests",
  keyGenerator: (c) => c.get("user")?.id || "anonymous",
});

// Apply to route
app.get("/api/sensitive", customLimit, async (c) => {
  return c.json({ data: "protected" });
});
```

### Predefined Rate Limiters

```typescript
import { 
  authRateLimit,
  checkoutRateLimit,
  adminRateLimit,
  writeRateLimit,
  readRateLimit,
} from "../middleware/rate-limit";

// Apply to routes
checkout.post("/", checkoutRateLimit, handler);
cart.post("/items", writeRateLimit, handler);
products.get("/", readRateLimit, handler);
```

## Applied Endpoints

### Checkout Routes
- `POST /api/checkout/mercadopago` → `checkoutRateLimit` (10 req/min)

### Cart Routes
- `GET /api/cart` → `readRateLimit` (200 req/min)
- `POST /api/cart/items` → `writeRateLimit` (20 req/min)
- `PUT /api/cart/items/:id` → `writeRateLimit` (20 req/min)
- `DELETE /api/cart/items/:id` → `writeRateLimit` (20 req/min)

### Product Routes
- `GET /api/products` → `readRateLimit` (200 req/min)
- `GET /api/products/:id` → `readRateLimit` (200 req/min)
- `POST /api/products` → `writeRateLimit` (20 req/min)
- `PUT /api/products/:id` → `writeRateLimit` (20 req/min)
- `DELETE /api/products/:id` → `writeRateLimit` (20 req/min)

### Admin Routes
- `ALL /api/admin/*` → `adminRateLimit` (30 req/min)

## Response Headers

Rate limit information is included in response headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2026-01-14T15:30:00.000Z
```

When rate limit is exceeded (HTTP 429):

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2026-01-14T15:30:00.000Z

{
  "error": "Too many requests, please try again later",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

## Key Generation Strategies

### IP-Based (Default)
```typescript
// Format: {ip}:{path}
// Example: 192.168.1.1:/api/products
```

Extracts real IP from headers:
1. `x-forwarded-for` (first IP)
2. `x-real-ip`
3. Falls back to "unknown"

### User-Based (Authenticated)
```typescript
// Format: {userId}:{path}
// Example: user-123:/api/admin/orders
```

Used for admin routes to track authenticated users.

### Custom
```typescript
const customLimit = rateLimit({
  keyGenerator: (c) => {
    const apiKey = c.req.header("x-api-key");
    return `apikey:${apiKey}`;
  },
});
```

## Configuration Options

```typescript
interface RateLimitOptions {
  /**
   * Time window in seconds
   */
  windowMs: number;
  
  /**
   * Maximum number of requests per window
   */
  max: number;
  
  /**
   * Key generator function (default: IP address)
   */
  keyGenerator?: (c: Context) => string;
  
  /**
   * Custom error message
   */
  message?: string;
  
  /**
   * Skip rate limiting for certain conditions
   */
  skip?: (c: Context) => boolean;
}
```

## Skip Conditions

```typescript
// Skip rate limiting for internal requests
const limit = rateLimit({
  windowMs: 60,
  max: 100,
  skip: (c) => {
    const internal = c.req.header("x-internal-request");
    return internal === "true";
  },
});
```

## Redis Key Management

### Key Pattern
```
ratelimit:{identifier}:{path}
```

Examples:
- `ratelimit:192.168.1.1:/api/products`
- `ratelimit:user-123:/api/admin/orders`
- `ratelimit:192.168.1.1:/api/cart/items`

### TTL Management
- Keys automatically expire after `windowMs` seconds
- No manual cleanup required
- Memory efficient

### Monitoring
```bash
# Check rate limit keys
redis-cli --scan --pattern "ratelimit:*"

# Get current count
redis-cli GET "ratelimit:192.168.1.1:/api/products"

# Clear rate limit for specific user
redis-cli DEL "ratelimit:192.168.1.1:/api/products"

# Clear all rate limits
redis-cli EVAL "return redis.call('del', unpack(redis.call('keys', 'ratelimit:*')))" 0
```

## Testing

### Manual Testing
```bash
# Test rate limit
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/cart/items \
    -H "Content-Type: application/json" \
    -d '{"productId":"test","quantity":1}'
  echo ""
done

# Should see 429 after 20 requests
```

### Integration Tests
```typescript
describe("Rate Limiting", () => {
  it("should enforce rate limit", async () => {
    const requests = Array.from({ length: 25 }, () =>
      fetch("/api/cart/items", { method: "POST" })
    );
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);
    
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
```

## Performance Considerations

### Overhead
- Redis lookup: ~1-2ms
- Minimal impact on response time
- Async operations don't block request processing

### Scalability
- Distributed rate limiting across multiple server instances
- Shares state via Redis
- No in-memory state required

### Memory Usage
- Keys auto-expire via TTL
- Estimated: ~50 bytes per active key
- 10,000 active users = ~500KB

## Security Benefits

1. **Brute Force Protection** — Limits login/auth attempts
2. **DDoS Mitigation** — Prevents resource exhaustion
3. **API Abuse Prevention** — Stops automated scraping
4. **Cost Control** — Protects payment gateway quota
5. **Fair Usage** — Ensures equitable resource allocation

## Troubleshooting

### Rate Limit Not Working
1. **Check Redis connection:**
   ```bash
   redis-cli PING
   ```

2. **Verify middleware order:**
   ```typescript
   // Rate limit BEFORE other middleware
   app.post("/", rateLimit(...), auth, handler);
   ```

3. **Check for skip conditions:**
   ```typescript
   // Remove skip temporarily
   skip: (c) => false
   ```

### False Positives
1. **Shared IP addresses** (corporate networks, VPNs)
   - Solution: Use user-based limiting for authenticated routes

2. **CDN/Proxy forwarding**
   - Ensure `x-forwarded-for` header is correctly set

### Redis Errors
If Redis is unavailable:
- Rate limiting is **disabled** (fail-open)
- Error logged to console
- Requests proceed normally

## Future Enhancements

### Phase 3 Additions
- [ ] Rate limit dashboard in admin panel
- [ ] Configurable limits per user tier
- [ ] Whitelist/blacklist IP ranges
- [ ] Rate limit analytics and reporting
- [ ] Dynamic rate adjustments based on load

### Advanced Features
- [ ] Token bucket algorithm for burst handling
- [ ] Geographic rate limiting
- [ ] Cost-based rate limiting (heavy operations = more "cost")
- [ ] Webhook rate limiting with exponential backoff

## References

- **Middleware:** [`apps/server/src/middleware/rate-limit.ts`](../apps/server/src/middleware/rate-limit.ts)
- **Redis Cache:** [`packages/cache/src/index.ts`](../packages/cache/src/index.ts)
- **Applied Routes:** Check imports in route files

## Related Documentation

- [System Overview — Performance & Caching](./system-overview.md#4-performance--caching)
- [Database Security](./database-security.md)
- [Clean Architecture](./clean-architecture.md)
