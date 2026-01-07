import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import * as customerService from "@bhvr-ecom/core/customers";
import { authMiddleware } from "../middleware/auth";
import type { AppEnv } from "../types";

// Admin-only middleware
const adminMiddleware = async (_c: any, next: any) => {
  // TODO: Check if user has admin role
  // For now, we'll allow all authenticated users
  // In production, add: if (user.role !== 'admin') return c.json({ error: "Forbidden" }, 403);
  
  await next();
};

const customerQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.enum(["createdAt", "name", "email"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const customerStatsSchema = z.object({
  days: z.coerce.number().min(1).max(365).default(30),
});

const app = new Hono<AppEnv>()
  .use("/*", authMiddleware, adminMiddleware)

  // ============================================================================
  // GET ALL CUSTOMERS
  // ============================================================================
  .get(
    "/",
    zValidator("query", customerQuerySchema),
    async (c) => {
      const query = c.req.valid("query");
      const result = await customerService.getAllCustomers(query);
      return c.json(result);
    }
  )

  // ============================================================================
  // GET CUSTOMER BY ID
  // ============================================================================
  .get(
    "/:id",
    async (c) => {
      const id = c.req.param("id");
      const customer = await customerService.getCustomerById(id);
      
      if (!customer) {
        return c.json({ error: "Customer not found" }, 404);
      }
      
      return c.json(customer);
    }
  )

  // ============================================================================
  // GET CUSTOMER STATS
  // ============================================================================
  .get(
    "/:id/stats",
    zValidator("query", customerStatsSchema),
    async (c) => {
      const id = c.req.param("id");
      const { days } = c.req.valid("query");
      
      const stats = await customerService.getCustomerStats({
        userId: id,
        days,
      });
      
      return c.json(stats);
    }
  )

  // ============================================================================
  // GET CUSTOMER ORDERS
  // ============================================================================
  .get(
    "/:id/orders",
    zValidator("query", z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(10),
    })),
    async (c) => {
      const id = c.req.param("id");
      const { page, limit } = c.req.valid("query");
      
      const result = await customerService.getCustomerOrders(id, page, limit);
      return c.json(result);
    }
  )

  // ============================================================================
  // GET CUSTOMER REVIEWS
  // ============================================================================
  .get(
    "/:id/reviews",
    zValidator("query", z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(10),
    })),
    async (c) => {
      const id = c.req.param("id");
      const { page, limit } = c.req.valid("query");
      
      const result = await customerService.getCustomerReviews(id, page, limit);
      return c.json(result);
    }
  )

  // ============================================================================
  // GET PLATFORM ANALYTICS
  // ============================================================================
  .get(
    "/analytics/platform",
    async (c) => {
      const analytics = await customerService.getPlatformAnalytics();
      return c.json(analytics);
    }
  );

export default app;
