import { auth } from "@bhvr-ecom/auth";
import { env } from "@bhvr-ecom/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import products from "./routes/products";
import categories from "./routes/categories";
import cart from "./routes/cart";
import orders from "./routes/orders";
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

app.get("/", (c) => {
  return c.text("OK");
});

// RPC API routes
const api = app
  .basePath("/api")
  .route("/products", products)
  .route("/categories", categories)
  .route("/cart", cart)
  .route("/orders", orders);

// Export type for RPC client
export type AppType = typeof api;

export default app;
