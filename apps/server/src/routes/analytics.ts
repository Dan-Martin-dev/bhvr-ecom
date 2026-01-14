import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { readRateLimit } from "../middleware/rate-limit";
import {
  getDashboardOverview,
  getSalesMetrics,
  getRevenueTimeSeries,
  getTopProducts,
  getLowStockProductsForAnalytics,
  getCustomerMetrics,
  getOrderStatusBreakdown,
  getConversionMetrics,
} from "@bhvr-ecom/core/analytics";

// Admin-only middleware
const adminMiddleware = async (_c: any, next: any) => {
  // TODO: Check if user has admin role
  // For now, we'll allow all authenticated users
  // In production, add: if (user.role !== 'admin') return c.json({ error: "Forbidden" }, 403);
  
  await next();
};

const analytics = new Hono();

// Apply auth + admin middleware + rate limiting to all routes
analytics.use("*", readRateLimit, authMiddleware, adminMiddleware);

// Date range validation schema
const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  period: z.enum(["7d", "30d", "90d", "1y", "all"]).optional().default("30d"),
});

// Helper to get date range from query params
function getDateRange(query: { startDate?: string; endDate?: string; period?: string }) {
  const endDate = query.endDate ? new Date(query.endDate) : new Date();
  let startDate: Date;

  if (query.startDate) {
    startDate = new Date(query.startDate);
  } else {
    const now = new Date();
    switch (query.period) {
      case "7d":
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case "30d":
        startDate = new Date(now.setDate(now.getDate() - 30));
        break;
      case "90d":
        startDate = new Date(now.setDate(now.getDate() - 90));
        break;
      case "1y":
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      case "all":
        startDate = new Date("2020-01-01");
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 30));
    }
  }

  return { startDate, endDate };
}

// ============================================================================
// GET /api/analytics/dashboard - Dashboard overview
// ============================================================================

analytics.get("/dashboard", zValidator("query", dateRangeSchema), async (c) => {
  const query = c.req.valid("query");
  const { startDate, endDate } = getDateRange(query);

  const overview = await getDashboardOverview(startDate, endDate);

  return c.json({ data: overview });
});

// ============================================================================
// GET /api/analytics/sales - Sales metrics
// ============================================================================

analytics.get("/sales", zValidator("query", dateRangeSchema), async (c) => {
  const query = c.req.valid("query");
  const { startDate, endDate } = getDateRange(query);

  const salesMetrics = await getSalesMetrics(startDate, endDate);

  return c.json({ data: salesMetrics });
});

// ============================================================================
// GET /api/analytics/revenue/timeseries - Revenue time series
// ============================================================================

analytics.get(
  "/revenue/timeseries",
  zValidator(
    "query",
    dateRangeSchema.extend({
      interval: z.enum(["day", "week", "month"]).optional().default("day"),
    })
  ),
  async (c) => {
    const query = c.req.valid("query");
    const { startDate, endDate } = getDateRange(query);

    const timeSeries = await getRevenueTimeSeries(
      startDate,
      endDate,
      query.interval as "day" | "week" | "month"
    );

    return c.json({ data: timeSeries });
  }
);

// ============================================================================
// GET /api/analytics/products/top - Top products
// ============================================================================

analytics.get(
  "/products/top",
  zValidator(
    "query",
    dateRangeSchema.extend({
      limit: z.coerce.number().min(1).max(50).optional().default(10),
    })
  ),
  async (c) => {
    const query = c.req.valid("query");
    const { startDate, endDate } = getDateRange(query);

    const topProducts = await getTopProducts(startDate, endDate, query.limit);

    return c.json({ data: topProducts });
  }
);

// ============================================================================
// GET /api/analytics/products/low-stock - Low stock products
// ============================================================================

analytics.get(
  "/products/low-stock",
  zValidator(
    "query",
    z.object({
      threshold: z.coerce.number().min(0).max(100).optional().default(10),
    })
  ),
  async (c) => {
    const query = c.req.valid("query");

    const lowStockProducts = await getLowStockProductsForAnalytics(query.threshold);

    return c.json({ data: lowStockProducts });
  }
);

// ============================================================================
// GET /api/analytics/customers - Customer metrics
// ============================================================================

analytics.get("/customers", zValidator("query", dateRangeSchema), async (c) => {
  const query = c.req.valid("query");
  const { startDate, endDate } = getDateRange(query);

  const customerMetrics = await getCustomerMetrics(startDate, endDate);

  return c.json({ data: customerMetrics });
});

// ============================================================================
// GET /api/analytics/orders/status - Order status breakdown
// ============================================================================

analytics.get("/orders/status", zValidator("query", dateRangeSchema), async (c) => {
  const query = c.req.valid("query");
  const { startDate, endDate } = getDateRange(query);

  const statusBreakdown = await getOrderStatusBreakdown(startDate, endDate);

  return c.json({ data: statusBreakdown });
});

// ============================================================================
// GET /api/analytics/conversion - Conversion metrics
// ============================================================================

analytics.get("/conversion", zValidator("query", dateRangeSchema), async (c) => {
  const query = c.req.valid("query");
  const { startDate, endDate } = getDateRange(query);

  const conversionMetrics = await getConversionMetrics(startDate, endDate);

  return c.json({ data: conversionMetrics });
});

export default analytics;
