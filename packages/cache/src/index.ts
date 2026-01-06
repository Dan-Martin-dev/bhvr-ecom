import Redis from "ioredis";
import type { RedisOptions } from "ioredis";

const getRedisConfig = (): string | RedisOptions => {
  // Check for REDIS_URL first (full connection string)
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }

  // Fall back to individual components
  const host = process.env.REDIS_HOST || "localhost";
  const port = parseInt(process.env.REDIS_PORT || "6379", 10);
  const password = process.env.REDIS_PASSWORD;
  const db = parseInt(process.env.REDIS_DB || "0", 10);

  return {
    host,
    port,
    password,
    db,
  };
};

// Create Redis client
const redisConfig = getRedisConfig();
export const redis = typeof redisConfig === "string" 
  ? new Redis(redisConfig, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err) {
        const targetErrors = ["READONLY", "ECONNRESET"];
        return targetErrors.some((targetError) =>
          err.message.includes(targetError)
        );
      },
    })
  : new Redis({
      ...redisConfig,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err) {
        const targetErrors = ["READONLY", "ECONNRESET"];
        return targetErrors.some((targetError) =>
          err.message.includes(targetError)
        );
      },
    });

// Handle connection events
redis.on("connect", () => {
  console.log("✅ Redis: Connected");
});

redis.on("ready", () => {
  console.log("✅ Redis: Ready");
});

redis.on("error", (error) => {
  console.error("❌ Redis Error:", error.message);
});

redis.on("close", () => {
  console.log("⚠️  Redis: Connection closed");
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await redis.quit();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await redis.quit();
  process.exit(0);
});

// Cache helper functions
export const cache = {
  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  },

  /**
   * Set value in cache with optional TTL (in seconds)
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    if (ttl) {
      await redis.setex(key, ttl, serialized);
    } else {
      await redis.set(key, serialized);
    }
  },

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<void> {
    await redis.del(key);
  },

  /**
   * Delete multiple keys matching pattern
   */
  async delPattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await redis.exists(key);
    return result === 1;
  },

  /**
   * Set expiry on existing key
   */
  async expire(key: string, seconds: number): Promise<void> {
    await redis.expire(key, seconds);
  },

  /**
   * Increment counter
   */
  async incr(key: string): Promise<number> {
    return await redis.incr(key);
  },

  /**
   * Decrement counter
   */
  async decr(key: string): Promise<number> {
    return await redis.decr(key);
  },
};

// Session helper functions
export const session = {
  /**
   * Get session data
   */
  async get<T = any>(sessionId: string): Promise<T | null> {
    return cache.get<T>(`session:${sessionId}`);
  },

  /**
   * Set session data with 30 day TTL
   */
  async set(sessionId: string, data: any): Promise<void> {
    await cache.set(`session:${sessionId}`, data, 60 * 60 * 24 * 30);
  },

  /**
   * Delete session
   */
  async delete(sessionId: string): Promise<void> {
    await cache.del(`session:${sessionId}`);
  },

  /**
   * Touch session to extend TTL
   */
  async touch(sessionId: string): Promise<void> {
    await cache.expire(`session:${sessionId}`, 60 * 60 * 24 * 30);
  },
};

export default redis;
