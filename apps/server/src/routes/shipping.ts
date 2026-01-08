import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  createShippingMethodSchema,
  updateShippingMethodBodySchema,
  getShippingMethodsSchema,
  calculateShippingSchema,
} from "@bhvr-ecom/validations";
import * as shippingUseCases from "@bhvr-ecom/core";
import { authMiddleware as auth } from "../middleware/auth";
import type { AppEnv } from "../types";

const shipping = new Hono<AppEnv>()
  // Public routes - get methods and calculate costs
  .get("/methods", zValidator("query", getShippingMethodsSchema), async (c) => {
    const query = c.req.valid("query");
    const methods = await shippingUseCases.getShippingMethods(query);
    return c.json(methods);
  })
  .get("/methods/:id", async (c) => {
    const id = c.req.param("id");
    const method = await shippingUseCases.getShippingMethodById(id);
    return c.json(method);
  })
  .post("/calculate", zValidator("json", calculateShippingSchema), async (c) => {
    const data = c.req.valid("json");
    const result = await shippingUseCases.calculateShippingCost(data);
    return c.json(result);
  })
  // Admin routes - create, update, delete
  .use("/methods/*", auth)
  .post("/methods", zValidator("json", createShippingMethodSchema), async (c) => {
    // TODO: Add admin role check when role management is implemented
    // For now, any authenticated user can manage shipping methods
    
    const data = c.req.valid("json");
    const method = await shippingUseCases.createShippingMethod(data);
    return c.json(method, 201);
  })
  .put("/methods/:id", zValidator("json", updateShippingMethodBodySchema), async (c) => {
    const id = c.req.param("id");
    const data = c.req.valid("json");
    
    const method = await shippingUseCases.updateShippingMethod({ id, ...data });
    return c.json(method);
  })
  .delete("/methods/:id", async (c) => {
    const id = c.req.param("id");
    
    const result = await shippingUseCases.deleteShippingMethod(id);
    return c.json(result);
  });

export default shipping;
