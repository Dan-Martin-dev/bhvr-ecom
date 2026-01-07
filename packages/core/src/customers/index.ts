import { db } from "@bhvr-ecom/db";
import { user } from "@bhvr-ecom/db/schema/auth";
import { order, review, address } from "@bhvr-ecom/db/schema/ecommerce";
import { eq, desc, sql, and, count, gte } from "drizzle-orm";

// ============================================================================
// TYPES
// ============================================================================

export interface CustomerQueryInput {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: "createdAt" | "name" | "email";
  sortOrder?: "asc" | "desc";
}

export interface CustomerStatsInput {
  userId: string;
  days?: number; // Last N days, default 30
}

// ============================================================================
// GET ALL CUSTOMERS (Admin)
// ============================================================================

export async function getAllCustomers(query: CustomerQueryInput) {
  const { page = 1, limit = 20, search, sortBy = "createdAt", sortOrder = "desc" } = query;
  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions = [];
  if (search) {
    conditions.push(
      sql`${user.name} ILIKE ${`%${search}%`} OR ${user.email} ILIKE ${`%${search}%`}`
    );
  }

  // Build order by
  const orderByColumn = sortBy === "createdAt" ? user.createdAt : 
                        sortBy === "name" ? user.name : 
                        user.email;
  const orderDirection = sortOrder === "asc" ? "asc" : "desc";

  // Get customers with order count
  const customers = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      orderCount: sql<number>`COUNT(${order.id})::int`,
      totalSpent: sql<number>`COALESCE(SUM(CASE WHEN ${order.status} = 'paid' THEN ${order.total} ELSE 0 END), 0)::int`,
    })
    .from(user)
    .leftJoin(order, eq(user.id, order.userId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(user.id)
    .orderBy(orderDirection === "desc" ? desc(orderByColumn) : orderByColumn)
    .limit(limit)
    .offset(offset);

  // Get total count
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(user)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const total = result[0]?.count || 0;

  return {
    customers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ============================================================================
// GET CUSTOMER BY ID (Admin)
// ============================================================================

export async function getCustomerById(userId: string) {
  const customer = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!customer) {
    return null;
  }

  // Get order statistics
  const [orderStats] = await db
    .select({
      totalOrders: count(),
      totalSpent: sql<number>`COALESCE(SUM(CASE WHEN ${order.status} = 'paid' THEN ${order.total} ELSE 0 END), 0)::int`,
      pendingOrders: sql<number>`COUNT(CASE WHEN ${order.status} = 'pending' THEN 1 END)::int`,
      lastOrderDate: sql<Date>`MAX(${order.createdAt})`,
    })
    .from(order)
    .where(eq(order.userId, userId));

  // Get recent orders
  const recentOrders = await db.query.order.findMany({
    where: eq(order.userId, userId),
    orderBy: [desc(order.createdAt)],
    limit: 5,
    columns: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
      createdAt: true,
    },
  });

  // Get addresses
  const addresses = await db.query.address.findMany({
    where: eq(address.userId, userId),
    orderBy: [desc(address.isDefault), desc(address.createdAt)],
  });

  // Get review count
  const [reviewStats] = await db
    .select({
      totalReviews: count(),
      avgRating: sql<number>`COALESCE(AVG(${review.rating}), 0)::numeric(3,2)`,
    })
    .from(review)
    .where(eq(review.userId, userId));

  return {
    ...customer,
    stats: {
      totalOrders: orderStats?.totalOrders || 0,
      totalSpent: orderStats?.totalSpent || 0,
      pendingOrders: orderStats?.pendingOrders || 0,
      lastOrderDate: orderStats?.lastOrderDate,
      totalReviews: reviewStats?.totalReviews || 0,
      avgRating: reviewStats?.avgRating || 0,
    },
    recentOrders,
    addresses,
  };
}

// ============================================================================
// GET CUSTOMER STATS (Admin)
// ============================================================================

export async function getCustomerStats(input: CustomerStatsInput) {
  const { userId, days = 30 } = input;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get order statistics for the period
  const [stats] = await db
    .select({
      ordersInPeriod: count(),
      spentInPeriod: sql<number>`COALESCE(SUM(CASE WHEN ${order.status} = 'paid' THEN ${order.total} ELSE 0 END), 0)::int`,
      avgOrderValue: sql<number>`COALESCE(AVG(CASE WHEN ${order.status} = 'paid' THEN ${order.total} END), 0)::int`,
    })
    .from(order)
    .where(
      and(
        eq(order.userId, userId),
        gte(order.createdAt, startDate)
      )
    );

  // Get lifetime stats
  const [lifetimeStats] = await db
    .select({
      lifetimeOrders: count(),
      lifetimeSpent: sql<number>`COALESCE(SUM(CASE WHEN ${order.status} = 'paid' THEN ${order.total} ELSE 0 END), 0)::int`,
    })
    .from(order)
    .where(eq(order.userId, userId));

  return {
    period: {
      days,
      orders: stats?.ordersInPeriod || 0,
      spent: stats?.spentInPeriod || 0,
      avgOrderValue: stats?.avgOrderValue || 0,
    },
    lifetime: {
      orders: lifetimeStats?.lifetimeOrders || 0,
      spent: lifetimeStats?.lifetimeSpent || 0,
    },
  };
}

// ============================================================================
// GET CUSTOMER ORDERS (Admin)
// ============================================================================

export async function getCustomerOrders(userId: string, page = 1, limit = 10) {
  const offset = (page - 1) * limit;

  const orders = await db.query.order.findMany({
    where: eq(order.userId, userId),
    orderBy: [desc(order.createdAt)],
    limit,
    offset,
    with: {
      items: {
        columns: {
          id: true,
          productName: true,
          quantity: true,
          unitPrice: true,
          total: true,
        },
      },
    },
  });

  const [result] = await db
    .select({ count: count() })
    .from(order)
    .where(eq(order.userId, userId));

  const total = result?.count || 0;

  return {
    orders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ============================================================================
// GET CUSTOMER REVIEWS (Admin)
// ============================================================================

export async function getCustomerReviews(userId: string, page = 1, limit = 10) {
  const offset = (page - 1) * limit;

  const reviews = await db.query.review.findMany({
    where: eq(review.userId, userId),
    orderBy: [desc(review.createdAt)],
    limit,
    offset,
    with: {
      product: {
        columns: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  const [result] = await db
    .select({ count: count() })
    .from(review)
    .where(eq(review.userId, userId));

  const total = result?.count || 0;

  return {
    reviews,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ============================================================================
// GET PLATFORM ANALYTICS (Admin)
// ============================================================================

export async function getPlatformAnalytics() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [customerStats] = await db
    .select({
      totalCustomers: count(),
      newCustomersLast30Days: sql<number>`COUNT(CASE WHEN ${user.createdAt} >= ${thirtyDaysAgo} THEN 1 END)::int`,
      verifiedCustomers: sql<number>`COUNT(CASE WHEN ${user.emailVerified} = true THEN 1 END)::int`,
    })
    .from(user);

  // Get top customers by spend
  const topCustomers = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      totalSpent: sql<number>`COALESCE(SUM(CASE WHEN ${order.status} = 'paid' THEN ${order.total} ELSE 0 END), 0)::int`,
      orderCount: sql<number>`COUNT(${order.id})::int`,
    })
    .from(user)
    .leftJoin(order, eq(user.id, order.userId))
    .groupBy(user.id)
    .orderBy(desc(sql`COALESCE(SUM(CASE WHEN ${order.status} = 'paid' THEN ${order.total} ELSE 0 END), 0)`))
    .limit(10);

  return {
    totalCustomers: customerStats?.totalCustomers || 0,
    newCustomersLast30Days: customerStats?.newCustomersLast30Days || 0,
    verifiedCustomers: customerStats?.verifiedCustomers || 0,
    topCustomers,
  };
}
