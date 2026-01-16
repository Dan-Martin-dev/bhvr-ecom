import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import * as productUseCases from "@bhvr-ecom/core/products";
import { adminRateLimit } from "../middleware/rate-limit";
import type { AppEnv } from "../types";

const inventory = new Hono<AppEnv>()
  // Get low stock products
  .get(
    "/low-stock",
    adminRateLimit,
    zValidator(
      "query",
      z.object({
        threshold: z.coerce.number().min(0).max(1000).optional().default(10),
      })
    ),
    async (c) => {
      // Get products where stock is below threshold or low stock threshold
      const products = await productUseCases.getLowStockProducts();
      
      return c.json({ data: products });
    }
  )

  // Bulk update inventory
  .post(
    "/bulk-update",
    adminRateLimit,
    zValidator(
      "json",
      z.object({
        updates: z.array(
          z.object({
            productId: z.string().uuid(),
            quantityChange: z.number().int(),
            operation: z.enum(["add", "subtract", "set"]),
          })
        ),
      })
    ),
    async (c) => {
      const { updates } = c.req.valid("json");

      const results = await Promise.all(
        updates.map(async ({ productId, quantityChange, operation }) => {
          try {
            const updated = await productUseCases.updateInventory(
              productId,
              quantityChange,
              operation
            );
            return {
              success: true,
              productId,
              newStock: updated?.stock,
            };
          } catch (error) {
            return {
              success: false,
              productId,
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }
        })
      );

      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      return c.json({
        success: true,
        summary: {
          total: results.length,
          successful,
          failed,
        },
        results,
      });
    }
  )

  // Update single product inventory
  .patch(
    "/:productId",
    adminRateLimit,
    zValidator(
      "json",
      z.object({
        quantityChange: z.number().int(),
        operation: z.enum(["add", "subtract", "set"]),
      })
    ),
    async (c) => {
      const productId = c.req.param("productId");
      const { quantityChange, operation } = c.req.valid("json");

      const updated = await productUseCases.updateInventory(
        productId,
        quantityChange,
        operation
      );

      if (!updated) {
        return c.json({ error: "Product not found" }, 404);
      }

      return c.json({ success: true, product: updated });
    }
  );

export default inventory;
