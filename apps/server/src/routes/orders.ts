import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createOrderSchema, orderQuerySchema } from "@bhvr-ecom/validations";
import * as orderUseCases from "@bhvr-ecom/core/orders";
import { authMiddleware } from "../middleware/auth";
import type { AppEnv } from "../types";

const orders = new Hono<AppEnv>()
  .use("/*", authMiddleware)
  .get("/", zValidator("query", orderQuerySchema), async (c) => {
    const user = c.get("user");
    const query = c.req.valid("query");
    
    const result = await orderUseCases.getUserOrders(user.id, query);
    return c.json(result);
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const result = await orderUseCases.getOrderById(id);
    
    if (!result) {
      return c.json({ error: "Order not found" }, 404);
    }
    
    return c.json(result);
  })
  .post("/", zValidator("json", createOrderSchema), async (c) => {
    const user = c.get("user");
    const data = c.req.valid("json");
    
    const result = await orderUseCases.createOrder(data, user.id);
    
    return c.json(result, 201);
  });

export default orders;
