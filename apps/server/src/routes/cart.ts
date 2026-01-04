import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { addToCartSchema, updateCartItemSchema } from "@bhvr-ecom/validations";
import * as cartUseCases from "@bhvr-ecom/core/cart";
import { authMiddleware } from "../middleware/auth";
import type { AppEnv } from "../types";

const cart = new Hono<AppEnv>()
  .use("/*", authMiddleware)
  .get("/", async (c) => {
    const user = c.get("user");
    const result = await cartUseCases.getOrCreateCart(user.id);
    return c.json(result);
  })
  .post("/items", zValidator("json", addToCartSchema), async (c) => {
    const user = c.get("user");
    const data = c.req.valid("json");
    
    const result = await cartUseCases.addToCart(data, user.id);
    return c.json(result, 201);
  })
  .put("/items/:cartItemId", zValidator("json", updateCartItemSchema.omit({ cartItemId: true })), async (c) => {
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
    await cartUseCases.clearCart(user.id);
    return c.json({ success: true });
  });

export default cart;
