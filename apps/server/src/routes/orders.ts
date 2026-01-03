import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createOrderSchema } from "@bhvr-ecom/validations";
import * as orderUseCases from "@bhvr-ecom/core/orders";

// TODO: Replace with actual auth middleware to get userId
const getUserId = (c: any) => {
  return c.req.header("x-user-id") || "test-user-id";
};

const orders = new Hono()
  .get("/", async (c) => {
    const userId = getUserId(c);
    const page = Number(c.req.query("page")) || 1;
    const limit = Number(c.req.query("limit")) || 20;
    const status = c.req.query("status") as any;
    
    const result = await orderUseCases.getUserOrders(userId, {
      page,
      limit,
      sortBy: "createdAt",
      sortOrder: "desc",
      status,
    });
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
    const userId = getUserId(c);
    const data = c.req.valid("json");
    
    const result = await orderUseCases.createOrder(data, userId);
    
    return c.json(result, 201);
  });

export default orders;
