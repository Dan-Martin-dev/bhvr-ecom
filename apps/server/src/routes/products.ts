import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  createProductSchema,
  updateProductSchema,
} from "@bhvr-ecom/validations";
import * as productUseCases from "@bhvr-ecom/core/products";

const products = new Hono()
  .get("/", async (c) => {
    const page = Number(c.req.query("page")) || 1;
    const limit = Number(c.req.query("limit")) || 20;
    const search = c.req.query("search");
    const categoryId = c.req.query("categoryId");
    const isActive = c.req.query("isActive") === "true" ? true : undefined;
    const isFeatured = c.req.query("isFeatured") === "true" ? true : undefined;
    const minPrice = c.req.query("minPrice") ? Number(c.req.query("minPrice")) : undefined;
    const maxPrice = c.req.query("maxPrice") ? Number(c.req.query("maxPrice")) : undefined;
    const sortBy = (c.req.query("sortBy") as any) || "createdAt";
    const sortOrder = (c.req.query("sortOrder") as any) || "desc";

    const result = await productUseCases.getProducts({
      page,
      limit,
      search,
      categoryId,
      isActive,
      isFeatured,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder,
    });
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
