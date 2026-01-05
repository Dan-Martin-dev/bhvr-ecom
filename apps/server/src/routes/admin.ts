import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "@bhvr-ecom/db";
import { order } from "@bhvr-ecom/db/schema/ecommerce";
import { eq, desc, and, gte, lte, sql, count } from "drizzle-orm";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import type { AppEnv } from "../types";

const admin = new Hono<AppEnv>();

// Admin-only middleware (check user role)
const adminMiddleware = async (c: any, next: any) => {
  const user = c.get("user");
  
  // TODO: Check if user has admin role
  // For now, we'll allow all authenticated users
  // In production, add: if (user.role !== 'admin') return c.json({ error: "Forbidden" }, 403);
  
  await next();
};

// Apply auth + admin middleware to all routes
admin.use("/*", authMiddleware, adminMiddleware);

// ============================================================================
// ORDERS
// ============================================================================

const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"]),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().url().optional(),
  internalNotes: z.string().optional(),
});

/**
 * GET /api/admin/orders
 * List all orders with filtering
 */
admin.get("/orders", async (c) => {
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");
  const status = c.req.query("status");
  const offset = (page - 1) * limit;

  const whereConditions = [];
  if (status) {
    whereConditions.push(eq(order.status, status as any));
  }

  const [orders, totalCount] = await Promise.all([
    db.query.order.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      orderBy: [desc(order.createdAt)],
      limit,
      offset,
      with: {
        items: {
          with: {
            product: {
              columns: {
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    }),
    db
      .select({ count: count() })
      .from(order)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined),
  ]);

  return c.json({
    orders,
    pagination: {
      page,
      limit,
      total: totalCount[0].count,
      totalPages: Math.ceil(totalCount[0].count / limit),
    },
  });
});

/**
 * GET /api/admin/orders/:id
 * Get single order details
 */
admin.get("/orders/:id", async (c) => {
  const id = c.req.param("id");
  
  const orderData = await db.query.order.findFirst({
    where: eq(order.id, id),
    with: {
      items: {
        with: {
          product: true,
        },
      },
    },
  });

  if (!orderData) {
    return c.json({ error: "Order not found" }, 404);
  }

  return c.json(orderData);
});

/**
 * PATCH /api/admin/orders/:id/status
 * Update order status and tracking info
 */
admin.patch(
  "/orders/:id/status",
  zValidator("json", updateOrderStatusSchema),
  async (c) => {
    const id = c.req.param("id");
    const data = c.req.valid("json");

    // Check if order exists
    const existingOrder = await db.query.order.findFirst({
      where: eq(order.id, id),
    });

    if (!existingOrder) {
      return c.json({ error: "Order not found" }, 404);
    }

    // Update order
    const updateData: any = {
      status: data.status,
      updatedAt: new Date(),
    };

    if (data.trackingNumber) updateData.trackingNumber = data.trackingNumber;
    if (data.trackingUrl) updateData.trackingUrl = data.trackingUrl;
    if (data.internalNotes) updateData.internalNotes = data.internalNotes;

    // Set timestamps based on status
    if (data.status === "shipped" && !existingOrder.shippedAt) {
      updateData.shippedAt = new Date();
    }
    if (data.status === "delivered" && !existingOrder.deliveredAt) {
      updateData.deliveredAt = new Date();
    }

    const [updatedOrder] = await db
      .update(order)
      .set(updateData)
      .where(eq(order.id, id))
      .returning();

    return c.json(updatedOrder);
  }
);

/**
 * GET /api/admin/dashboard
 * Get dashboard statistics
 */
admin.get("/dashboard", async (c) => {
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalOrders,
    pendingOrders,
    totalRevenue,
    recentRevenue,
  ] = await Promise.all([
    db.select({ count: count() }).from(order),
    db.select({ count: count() }).from(order).where(eq(order.status, "pending")),
    db.select({ sum: sql<number>`COALESCE(SUM(${order.total}), 0)::int` }).from(order).where(eq(order.status, "paid")),
    db.select({ sum: sql<number>`COALESCE(SUM(${order.total}), 0)::int` }).from(order).where(
      and(
        eq(order.status, "paid"),
        gte(order.createdAt, thirtyDaysAgo)
      )
    ),
  ]);

  return c.json({
    totalOrders: totalOrders[0].count,
    pendingOrders: pendingOrders[0].count,
    totalRevenue: totalRevenue[0].sum,
    revenueLastMonth: recentRevenue[0].sum,
  });
});

export default admin;
