import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Package,
  AlertTriangle
} from "lucide-react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "1y">("30d");

  // Helper to fetch analytics data
  const fetchAnalytics = async (endpoint: string, params?: Record<string, string>) => {
    const query = new URLSearchParams({ period, ...params }).toString();
    const res = await fetch(`/api/analytics/${endpoint}?${query}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`);
    return res.json();
  };

  // Fetch dashboard overview
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["analytics", "dashboard", period],
    queryFn: () => fetchAnalytics("dashboard"),
  });

  // Fetch revenue time series
  const { data: timeSeries } = useQuery({
    queryKey: ["analytics", "revenue", "timeseries", period],
    queryFn: () => fetchAnalytics("revenue/timeseries", { interval: "day" }),
  });

  // Fetch top products
  const { data: topProducts } = useQuery({
    queryKey: ["analytics", "products", "top", period],
    queryFn: () => fetchAnalytics("products/top", { limit: "10" }),
  });

  // Fetch low stock products
  const { data: lowStock } = useQuery({
    queryKey: ["analytics", "products", "low-stock"],
    queryFn: () => fetchAnalytics("products/low-stock", { threshold: "10" }),
  });

  // Fetch order status breakdown
  const { data: orderStatus } = useQuery({
    queryKey: ["analytics", "orders", "status", period],
    queryFn: () => fetchAnalytics("orders/status"),
  });

  // Fetch conversion metrics
  const { data: conversion } = useQuery({
    queryKey: ["analytics", "conversion", period],
    queryFn: () => fetchAnalytics("conversion"),
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(value / 100);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (overviewLoading) {
    return <div className="p-8 text-center">Loading analytics...</div>;
  }

  const stats = overview?.data;
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your store performance
          </p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <SelectTrigger className="w-45">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.totalRevenue || 0)}
            </div>
            {stats?.revenueGrowth !== undefined && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                {stats.revenueGrowth > 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">
                      +{formatPercent(stats.revenueGrowth)}
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 text-red-600" />
                    <span className="text-red-600">
                      {formatPercent(stats.revenueGrowth)}
                    </span>
                  </>
                )}
                <span className="ml-1">from last period</span>
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
            {stats?.ordersGrowth !== undefined && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                {stats.ordersGrowth > 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">
                      +{formatPercent(stats.ordersGrowth)}
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 text-red-600" />
                    <span className="text-red-600">
                      {formatPercent(stats.ordersGrowth)}
                    </span>
                  </>
                )}
                <span className="ml-1">from last period</span>
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.averageOrderValue || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Per order value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCustomers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.newCustomers || 0} new this period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue Trend</TabsTrigger>
          <TabsTrigger value="products">Top Products</TabsTrigger>
          <TabsTrigger value="orders">Order Status</TabsTrigger>
          <TabsTrigger value="conversion">Conversion</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Over Time</CardTitle>
              <CardDescription>Daily revenue for the selected period</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={timeSeries?.data || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value: string) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis 
                    tickFormatter={(value: number) => formatCurrency(value)}
                  />
                  <Tooltip 
                    formatter={(value: number | undefined) => value ? formatCurrency(value) : ""}
                    labelFormatter={(label: string) => new Date(label).toLocaleDateString()}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Products</CardTitle>
                <CardDescription>Best selling products by revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={topProducts?.data || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={formatCurrency} />
                    <YAxis 
                      type="category" 
                      dataKey="productName" 
                      width={150}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip formatter={(value: number | undefined) => value ? formatCurrency(value) : ""} />
                    <Bar dataKey="revenue" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Low Stock Alert</CardTitle>
                  <CardDescription>Products below 10 units</CardDescription>
                </div>
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {lowStock?.data?.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      All products have sufficient stock
                    </p>
                  ) : (
                    lowStock?.data?.slice(0, 8).map((product: any) => (
                      <div 
                        key={product.productId} 
                        className="flex items-center justify-between border-b pb-2"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {product.productName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Stock: {product.stock} units
                          </p>
                        </div>
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Order Status Distribution</CardTitle>
              <CardDescription>Breakdown of orders by status</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={orderStatus?.data || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.status}: ${entry.count}`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {(orderStatus?.data || []).map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Metrics</CardTitle>
              <CardDescription>Customer journey performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Cart Conversion Rate
                  </p>
                  <p className="text-3xl font-bold">
                    {formatPercent(conversion?.data?.cartConversionRate || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {conversion?.data?.cartsCreated || 0} carts created
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Checkout Completion
                  </p>
                  <p className="text-3xl font-bold">
                    {formatPercent(conversion?.data?.checkoutCompletionRate || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {conversion?.data?.checkoutsStarted || 0} checkouts started
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Overall Conversion
                  </p>
                  <p className="text-3xl font-bold">
                    {formatPercent(conversion?.data?.overallConversionRate || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    End-to-end conversion
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
