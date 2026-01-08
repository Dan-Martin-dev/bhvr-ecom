import { auth } from "@bhvr-ecom/auth";
import { env } from "@bhvr-ecom/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { serveStatic } from "hono/bun";
import products from "./routes/products";
import categories from "./routes/categories";
import cart from "./routes/cart";
import orders from "./routes/orders";
import checkout from "./routes/checkout";
import shipping from "./routes/shipping";
import variants from "./routes/variants";
import customers from "./routes/customers";
import analytics from "./routes/analytics";
import webhooks from "./routes/webhooks";
import admin from "./routes/admin";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

// Global error handler
app.onError((err, c) => {
  console.error(`[Error] ${err.message}`, err.stack);
  
  if (err instanceof HTTPException) {
    return c.json(
      { error: err.message, code: "HTTP_ERROR" },
      err.status
    );
  }
  
  // Handle Zod validation errors
  if (err.name === "ZodError") {
    return c.json(
      { error: "Validation failed", code: "VALIDATION_ERROR", details: err },
      400
    );
  }
  
  // Generic server error
  return c.json(
    { error: "Internal server error", code: "INTERNAL_ERROR" },
    500
  );
});

app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "x-user-id"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Health check
app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// RPC API routes
const api = app
  .basePath("/api")
  .route("/products", products)
  .route("/categories", categories)
  .route("/cart", cart)
  .route("/orders", orders)
  .route("/checkout", checkout)
  .route("/shipping", shipping)
  .route("/variants", variants)
  .route("/customers", customers)
  .route("/analytics", analytics)
  .route("/webhooks", webhooks)
  .route("/admin", admin);

// Serve static files in production (after API routes)
if (process.env.NODE_ENV === "production") {
  app.use("/*", serveStatic({ root: "./public" }));
  // Fallback to index.html for client-side routing
  app.get("/*", serveStatic({ path: "./public/index.html" }));
} else {
  // Development: Just return a message (Vite serves frontend)
  app.get("/", (c) => {
    return c.text("🚀 BHVR Stack API Server - Development Mode");
  });
}

// Export type for RPC client
export type AppType = typeof api;

export default app;
