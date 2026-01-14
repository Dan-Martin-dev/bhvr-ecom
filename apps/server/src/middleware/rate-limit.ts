import type { Context, Next, MiddlewareHandler } from "hono";
import { cache } from "@bhvr-ecom/cache";

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

/**
 * Redis-based rate limiter middleware for Hono
 * Uses sliding window algorithm for accurate rate limiting
 */
export const rateLimit = (options: RateLimitOptions): MiddlewareHandler => {
  const {
    windowMs,
    max,
    keyGenerator = defaultKeyGenerator,
    message = "Too many requests, please try again later",
    skip,
  } = options;

  return async (c: Context, next: Next) => {
    // Check if we should skip rate limiting
    if (skip && skip(c)) {
      return next();
    }

    const key = keyGenerator(c);
    const rateLimitKey = `ratelimit:${key}`;
    const now = Date.now();

    try {
      // Get current request count
      const requests = await cache.get<number>(rateLimitKey);
      
      if (requests && requests >= max) {
        // Rate limit exceeded
        const retryAfter = Math.ceil(windowMs);
        c.header("Retry-After", retryAfter.toString());
        c.header("X-RateLimit-Limit", max.toString());
        c.header("X-RateLimit-Remaining", "0");
        c.header("X-RateLimit-Reset", new Date(now + windowMs * 1000).toISOString());
        
        return c.json(
          { 
            error: message, 
            code: "RATE_LIMIT_EXCEEDED",
            retryAfter: retryAfter 
          },
          429
        );
      }

      // Increment counter
      const newCount = (requests || 0) + 1;
      await cache.set(rateLimitKey, newCount, windowMs);
      
      // Add rate limit headers
      c.header("X-RateLimit-Limit", max.toString());
      c.header("X-RateLimit-Remaining", Math.max(0, max - newCount).toString());
      c.header("X-RateLimit-Reset", new Date(now + windowMs * 1000).toISOString());

      await next();
    } catch (error) {
      // If Redis fails, log and continue without rate limiting
      console.error("Rate limit error:", error);
      await next();
    }
  };
};

/**
 * Default key generator based on IP address and route
 */
function defaultKeyGenerator(c: Context): string {
  // Try to get real IP from various headers
  const forwarded = c.req.header("x-forwarded-for");
  const realIp = c.req.header("x-real-ip");
  const ip = forwarded?.split(",")[0] || realIp || "unknown";
  
  // Include path for per-endpoint rate limiting
  const path = new URL(c.req.url).pathname;
  
  return `${ip}:${path}`;
}

/**
 * Get user ID from context (for authenticated endpoints)
 */
function userKeyGenerator(c: Context): string {
  const user = c.get("user");
  const userId = user?.id || "anonymous";
  const path = new URL(c.req.url).pathname;
  return `${userId}:${path}`;
}

/**
 * Predefined rate limiters for common use cases
 */

// General API rate limit: 100 req/min
export const apiRateLimit = rateLimit({
  windowMs: 60,
  max: 100,
  message: "Too many API requests, please slow down",
});

// Auth endpoints: 5 req/min (prevent brute force)
export const authRateLimit = rateLimit({
  windowMs: 60,
  max: 5,
  message: "Too many authentication attempts, please try again later",
});

// Checkout: 10 req/min (prevent abuse)
export const checkoutRateLimit = rateLimit({
  windowMs: 60,
  max: 10,
  message: "Too many checkout attempts, please try again later",
});

// Admin actions: 30 req/min (authenticated users)
export const adminRateLimit = rateLimit({
  windowMs: 60,
  max: 30,
  keyGenerator: userKeyGenerator,
  message: "Too many admin requests, please slow down",
});

// Write operations: 20 req/min
export const writeRateLimit = rateLimit({
  windowMs: 60,
  max: 20,
  message: "Too many write requests, please slow down",
});

// Public read: 200 req/min (more lenient)
export const readRateLimit = rateLimit({
  windowMs: 60,
  max: 200,
  message: "Too many requests, please slow down",
});
