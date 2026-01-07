import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import * as variantService from "@bhvr-ecom/core/variants";
import {
  createProductVariantSchema,
  updateProductVariantSchema,
  variantQuerySchema,
  variantIdSchema,
  bulkCreateVariantsSchema,
} from "@bhvr-ecom/validations";
import { authMiddleware } from "../middleware/auth";
import { z } from "zod";

const app = new Hono();

// ============================================================================
// PUBLIC ROUTES (no auth required)
// ============================================================================

// Get variants for a product
app.get(
  "/",
  zValidator("query", variantQuerySchema),
  async (c) => {
    const query = c.req.valid("query");
    const variants = await variantService.getVariantsByProduct(query);
    return c.json(variants);
  },
);

// Get variant options (sizes, colors, etc.) for a product
app.get(
  "/options/:productId",
  zValidator("param", z.object({ productId: z.string().uuid() })),
  async (c) => {
    const { productId } = c.req.valid("param");
    const options = await variantService.getVariantOptions(productId);
    return c.json(options);
  },
);

// Get single variant
app.get(
  "/:id",
  zValidator("param", variantIdSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const variant = await variantService.getVariantById(id);
    
    if (!variant) {
      return c.json({ error: "Variant not found" }, 404);
    }
    
    return c.json(variant);
  },
);

// ============================================================================
// ADMIN ROUTES (auth required)
// ============================================================================

// Create variant
app.post(
  "/",
  authMiddleware,
  zValidator("json", createProductVariantSchema),
  async (c) => {
    const data = c.req.valid("json");
    
    try {
      const variant = await variantService.createVariant(data);
      return c.json(variant, 201);
    } catch (error) {
      if (error instanceof Error) {
        return c.json({ error: error.message }, 400);
      }
      return c.json({ error: "Failed to create variant" }, 500);
    }
  },
);

// Bulk create variants
app.post(
  "/bulk",
  authMiddleware,
  zValidator("json", bulkCreateVariantsSchema),
  async (c) => {
    const data = c.req.valid("json");
    
    try {
      const variants = await variantService.bulkCreateVariants(data);
      return c.json(variants, 201);
    } catch (error) {
      if (error instanceof Error) {
        return c.json({ error: error.message }, 400);
      }
      return c.json({ error: "Failed to create variants" }, 500);
    }
  },
);

// Update variant
app.put(
  "/:id",
  authMiddleware,
  zValidator("param", variantIdSchema),
  zValidator("json", updateProductVariantSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    
    try {
      const variant = await variantService.updateVariant(id, data);
      return c.json(variant);
    } catch (error) {
      if (error instanceof Error) {
        return c.json({ error: error.message }, 400);
      }
      return c.json({ error: "Failed to update variant" }, 500);
    }
  },
);

// Delete variant
app.delete(
  "/:id",
  authMiddleware,
  zValidator("param", variantIdSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    
    try {
      await variantService.deleteVariant(id);
      return c.json({ message: "Variant deleted successfully" });
    } catch (error) {
      if (error instanceof Error) {
        return c.json({ error: error.message }, 400);
      }
      return c.json({ error: "Failed to delete variant" }, 500);
    }
  },
);

// Update variant stock
app.patch(
  "/:id/stock",
  authMiddleware,
  zValidator("param", variantIdSchema),
  zValidator(
    "json",
    z.object({
      quantity: z.number().int().min(1),
      operation: z.enum(["increment", "decrement"]),
    }),
  ),
  async (c) => {
    const { id } = c.req.valid("param");
    const { quantity, operation } = c.req.valid("json");
    
    try {
      const variant = await variantService.updateVariantStock(
        id,
        quantity,
        operation,
      );
      return c.json(variant);
    } catch (error) {
      if (error instanceof Error) {
        return c.json({ error: error.message }, 400);
      }
      return c.json({ error: "Failed to update stock" }, 500);
    }
  },
);

export default app;
