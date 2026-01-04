import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} from "@bhvr-ecom/validations";
import * as productUseCases from "@bhvr-ecom/core/products";
import type { AppEnv } from "../types";

const products = new Hono<AppEnv>()
  .get("/", zValidator("query", productQuerySchema), async (c) => {
    const query = c.req.valid("query");
    const result = await productUseCases.getProducts(query);
    return c.json(result);
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const result = await productUseCases.getProductById(id);
    
    if (!result) {
      return c.json({ error: "Product not found" }, 404);
    }
    
    return c.json(result);
  })
  .post("/", zValidator("json", createProductSchema), async (c) => {
    const data = c.req.valid("json");
    const result = await productUseCases.createProduct(data);
    return c.json(result, 201);
  })
  .put("/:id", zValidator("json", updateProductSchema), async (c) => {
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const result = await productUseCases.updateProduct(id, data);
    
    if (!result) {
      return c.json({ error: "Product not found" }, 404);
    }
    
    return c.json(result);
  })
  .delete("/:id", async (c) => {
    const id = c.req.param("id");
    const result = await productUseCases.deleteProduct(id);
    
    if (!result) {
      return c.json({ error: "Product not found" }, 404);
    }
    
    return c.json({ success: true });
  });

export default products;
