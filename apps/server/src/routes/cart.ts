import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import * as cartUseCases from "@bhvr-ecom/core/cart";

// TODO: Replace with actual auth middleware to get userId
const getUserId = (c: any) => {
  // For now, get from header or use a test user
  return c.req.header("x-user-id") || "test-user-id";
};

const addToCartSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
});

const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0),
});

const cart = new Hono()
  .get("/", async (c) => {
    const userId = getUserId(c);
    const result = await cartUseCases.getOrCreateCart(userId);
    return c.json(result);
  })
  .post("/items", zValidator("json", addToCartSchema), async (c) => {
    const userId = getUserId(c);
    const data = c.req.valid("json");
    
    const result = await cartUseCases.addToCart(data, userId);
    return c.json(result, 201);
  })
  .put("/items/:cartItemId", zValidator("json", updateCartItemSchema), async (c) => {
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
    const userId = getUserId(c);
    await cartUseCases.clearCart(userId);
    return c.json({ success: true });
  });

export default cart;
