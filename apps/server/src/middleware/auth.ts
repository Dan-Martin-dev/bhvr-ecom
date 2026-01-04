import { auth } from "@bhvr-ecom/auth";
import type { Context, Next } from "hono";

/**
 * Hono middleware to protect routes and inject user session
 */
export const authMiddleware = async (c: Context, next: Next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Inject user into context
  c.set("user", session.user);
  c.set("session", session.session);

  await next();
};

/**
 * Optional auth middleware (doesn't block, but injects user if present)
 */
export const optionalAuth = async (c: Context, next: Next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (session) {
    c.set("user", session.user);
    c.set("session", session.session);
  }

  await next();
};
