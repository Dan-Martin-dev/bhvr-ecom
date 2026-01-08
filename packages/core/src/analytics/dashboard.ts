import { db } from "@bhvr-ecom/db";
import { user } from "@bhvr-ecom/db/schema/auth";
import { order, orderItem, product } from "@bhvr-ecom/db/schema/ecommerce";
import { sql, desc, eq, and, gte, lte, count } from "drizzle-orm";

// ============================================================================
// SALES METRICS
// ============================================================================

export async function getSalesMetrics(startDate: Date, endDate: Date) {
  // Total revenue and order count
  const [revenueData = { totalRevenue: 0, totalOrders: 0, averageOrderValue: 0 }] = await db
    .select({
      totalRevenue: sql<number>`coalesce(sum(${order.total}), 0)`,
      totalOrders: count(order.id),
      averageOrderValue: sql<number>`coalesce(avg(${order.total}), 0)`,
    })
    .from(order)
    .where(
      and(
        gte(order.createdAt, startDate),
        lte(order.createdAt, endDate),
        eq(order.status, "delivered")
      )
    );

  // Previous period for comparison
  const periodDiff = endDate.getTime() - startDate.getTime();
  const prevStartDate = new Date(startDate.getTime() - periodDiff);
  const prevEndDate = new Date(endDate.getTime() - periodDiff);

  const [prevRevenueData = { totalRevenue: 0, totalOrders: 0 }] = await db
    .select({
      totalRevenue: sql<number>`coalesce(sum(${order.total}), 0)`,
      totalOrders: count(order.id),
    })
    .from(order)
    .where(
      and(
        gte(order.createdAt, prevStartDate),
        lte(order.createdAt, prevEndDate),
        eq(order.status, "delivered")
      )
    );

  const revenueGrowth =
    prevRevenueData.totalRevenue > 0
      ? ((revenueData.totalRevenue - prevRevenueData.totalRevenue) /
          prevRevenueData.totalRevenue) *
        100
      : 0;

  const ordersGrowth =
    prevRevenueData.totalOrders > 0
      ? ((revenueData.totalOrders - prevRevenueData.totalOrders) /
          prevRevenueData.totalOrders) *
        100
      : 0;

  return {
    totalRevenue: revenueData.totalRevenue,
    totalOrders: revenueData.totalOrders,
    averageOrderValue: Math.round(revenueData.averageOrderValue),
    revenueGrowth: Math.round(revenueGrowth * 100) / 100,
    ordersGrowth: Math.round(ordersGrowth * 100) / 100,
  };
}

// ============================================================================
// REVENUE TIME SERIES
// ============================================================================

export async function getRevenueTimeSeries(
  startDate: Date,
  endDate: Date,
  interval: "day" | "week" | "month" = "day"
) {
  const dateFormat =
    interval === "day"
      ? "YYYY-MM-DD"
      : interval === "week"
      ? "IYYY-IW"
      : "YYYY-MM";

  const timeSeries = await db
    .select({
      date: sql<string>`to_char(${order.createdAt}, ${dateFormat})`,
      revenue: sql<number>`coalesce(sum(${order.total}), 0)`,
      orders: count(order.id),
    })
    .from(order)
    .where(
      and(
        gte(order.createdAt, startDate),
        lte(order.createdAt, endDate),
        eq(order.status, "delivered")
      )
    )
    .groupBy(sql`to_char(${order.createdAt}, ${dateFormat})`)
    .orderBy(sql`to_char(${order.createdAt}, ${dateFormat})`);

  return timeSeries;
}

// ============================================================================
// TOP PRODUCTS
// ============================================================================

export async function getTopProducts(
  startDate: Date,
  endDate: Date,
  limit: number = 10
) {
  const topProducts = await db
    .select({
      productId: product.id,
      productName: product.name,
      slug: product.slug,
      image: sql<string | null>`(
        SELECT MIN(url) FROM product_image WHERE product_id = ${product.id} AND is_primary = true
      )`,
      quantitySold: sql<number>`coalesce(sum(${orderItem.quantity}), 0)`,
      revenue: sql<number>`coalesce(sum(${orderItem.total}), 0)`,
      ordersCount: count(sql`distinct ${order.id}`),
    })
    .from(orderItem)
    .innerJoin(product, eq(orderItem.productId, product.id))
    .innerJoin(order, eq(orderItem.orderId, order.id))
    .where(
      and(
        gte(order.createdAt, startDate),
        lte(order.createdAt, endDate),
        eq(order.status, "delivered")
      )
    )
    .groupBy(product.id, product.name, product.slug)
    .orderBy(desc(sql`sum(${orderItem.total})`))
    .limit(limit);

  return topProducts;
}

// ============================================================================
// LOW STOCK PRODUCTS FOR ANALYTICS
// ============================================================================

export async function getLowStockProductsForAnalytics(threshold: number = 10) {
  const lowStockProducts = await db
    .select({
      id: product.id,
      name: product.name,
      slug: product.slug,
      stock: product.stock,
      price: product.price,
      isActive: product.isActive,
    })
    .from(product)
    .where(
      and(
        lte(product.stock, threshold),
        eq(product.isActive, true)
      )
    )
    .orderBy(product.stock)
    .limit(20);

  return lowStockProducts;
}

// ============================================================================
// CUSTOMER METRICS
// ============================================================================

export async function getCustomerMetrics(startDate: Date, endDate: Date) {
  // New customers in period
  const [newCustomersData = { newCustomers: 0 }] = await db
    .select({
      newCustomers: count(user.id),
    })
    .from(user)
    .where(and(gte(user.createdAt, startDate), lte(user.createdAt, endDate)));

  // Total customers
  const [totalCustomersData = { totalCustomers: 0 }] = await db
    .select({
      totalCustomers: count(user.id),
    })
    .from(user);

  // Repeat customers (customers with more than 1 order in period)
  const repeatCustomers = await db
    .select({
      userId: order.userId,
      orderCount: count(order.id),
    })
    .from(order)
    .where(
      and(
        gte(order.createdAt, startDate),
        lte(order.createdAt, endDate),
        eq(order.status, "delivered")
      )
    )
    .groupBy(order.userId)
    .having(sql`count(${order.id}) > 1`);

  return {
    newCustomers: newCustomersData.newCustomers,
    totalCustomers: totalCustomersData.totalCustomers,
    repeatCustomers: repeatCustomers.length,
    retentionRate:
      totalCustomersData.totalCustomers > 0
        ? Math.round(
            (repeatCustomers.length / totalCustomersData.totalCustomers) * 10000
          ) / 100
        : 0,
  };
}

// ============================================================================
// ORDER STATUS BREAKDOWN
// ============================================================================

export async function getOrderStatusBreakdown(startDate: Date, endDate: Date) {
  const statusBreakdown = await db
    .select({
      status: order.status,
      count: count(order.id),
      revenue: sql<number>`coalesce(sum(${order.total}), 0)`,
    })
    .from(order)
    .where(and(gte(order.createdAt, startDate), lte(order.createdAt, endDate)))
    .groupBy(order.status)
    .orderBy(desc(count(order.id)));

  return statusBreakdown;
}

// ============================================================================
// CONVERSION METRICS
// ============================================================================

export async function getConversionMetrics(startDate: Date, endDate: Date) {
  // Total orders (pending + delivered)
  const [ordersData = { totalOrders: 0, completedOrders: 0, cancelledOrders: 0 }] = await db
    .select({
      totalOrders: count(order.id),
      completedOrders: sql<number>`count(case when ${order.status} = 'delivered' then 1 end)`,
      cancelledOrders: sql<number>`count(case when ${order.status} = 'cancelled' then 1 end)`,
    })
    .from(order)
    .where(and(gte(order.createdAt, startDate), lte(order.createdAt, endDate)));

  const conversionRate =
    ordersData.totalOrders > 0
      ? Math.round((ordersData.completedOrders / ordersData.totalOrders) * 10000) / 100
      : 0;

  const cancellationRate =
    ordersData.totalOrders > 0
      ? Math.round((ordersData.cancelledOrders / ordersData.totalOrders) * 10000) / 100
      : 0;

  return {
    totalOrders: ordersData.totalOrders,
    completedOrders: ordersData.completedOrders,
    cancelledOrders: ordersData.cancelledOrders,
    conversionRate,
    cancellationRate,
  };
}

// ============================================================================
// DASHBOARD OVERVIEW
// ============================================================================

export async function getDashboardOverview(startDate: Date, endDate: Date) {
  const [salesMetrics, customerMetrics, conversionMetrics] = await Promise.all([
    getSalesMetrics(startDate, endDate),
    getCustomerMetrics(startDate, endDate),
    getConversionMetrics(startDate, endDate),
  ]);

  return {
    sales: salesMetrics,
    customers: customerMetrics,
    conversion: conversionMetrics,
  };
}
