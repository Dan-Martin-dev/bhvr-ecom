import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.url(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    MERCADO_PAGO_ACCESS_TOKEN: z.string().optional(),
    MERCADO_PAGO_PUBLIC_KEY: z.string().optional(),
    // Email (Resend)
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM_ADDRESS: z.string().email().default("onboarding@resend.dev"),
    EMAIL_FROM_NAME: z.string().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
