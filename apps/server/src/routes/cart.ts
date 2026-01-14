import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { addToCartSchema, updateCartItemSchema, updateCartItemBodySchema } from "@bhvr-ecom/validations";
import * as cartUseCases from "@bhvr-ecom/core/cart";
import { optionalAuth } from "../middleware/auth";
import { writeRateLimit, readRateLimit } from "../middleware/rate-limit";
import type { AppEnv } from "../types";

const cart = new Hono<AppEnv>()
  // Use optionalAuth to support both authenticated and guest users
  .use("/*", optionalAuth)
  .get("/", readRateLimit, async (c) => {
    const user = c.get("user");
    const sessionId = c.req.header("x-session-id");
    
    if (!user && !sessionId) {
      return c.json({ error: "User or session ID required" }, 400);
    }
    
    const result = await cartUseCases.getOrCreateCart(
      user?.id,
      sessionId
    );
    return c.json(result);
  })
  .post("/items", writeRateLimit, zValidator("json", addToCartSchema), async (c) => {
    const user = c.get("user");
    const sessionId = c.req.header("x-session-id");
    const data = c.req.valid("json");
    
    if (!user && !sessionId) {
      return c.json({ error: "User or session ID required" }, 400);
    }
    
    const result = await cartUseCases.addToCart(
      data,
      user?.id,
      sessionId
    );
    return c.json(result, 201);
  })
  .put("/items/:cartItemId", zValidator("json", updateCartItemBodySchema), async (c) => {
    const cartItemId = c.req.param("cartItemId");
    const { quantity } = c.req.valid("json");
    
    const result = await cartUseCases.updateCartItem({
      cartItemId,
      quantity,
    });
    return c.json(result);
  })
  .delete("/items/:cartItemId", async (c) => {
    const cartItemId = c.req.param("cartItemId");
    
    await cartUseCases.removeFromCart(cartItemId);
    return c.json({ success: true });
  })
  .delete("/", async (c) => {
    const user = c.get("user");
    const sessionId = c.req.header("x-session-id");
    
    if (!user && !sessionId) {
      return c.json({ error: "User or session ID required" }, 400);
    }
    
    await cartUseCases.clearCart(user?.id, sessionId);
    return c.json({ success: true });
  })
  // Merge guest cart with user cart on login
  .post("/merge", async (c) => {
    const user = c.get("user");
    
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }
    
    const sessionId = c.req.header("x-session-id");
    
    if (!sessionId) {
      return c.json({ error: "Session ID required" }, 400);
    }
    
    const result = await cartUseCases.mergeGuestCart(user.id, sessionId);
    return c.json(result);
  });

export default cart;
