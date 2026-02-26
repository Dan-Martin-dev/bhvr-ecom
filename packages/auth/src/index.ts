import { db } from "@bhvr-ecom/db";
import * as schema from "@bhvr-ecom/db/schema/auth";
import { env } from "@bhvr-ecom/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { sendPasswordResetEmail } from "@bhvr-ecom/email";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",

    schema: schema,
  }),
  trustedOrigins: process.env.NODE_ENV !== "production"
    ? [env.CORS_ORIGIN, "http://localhost:3001", "http://127.0.0.1:3001", "http://localhost:5173", "http://127.0.0.1:5173"]
    : [env.CORS_ORIGIN],
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      try {
        await sendPasswordResetEmail({
          to: user.email,
          userName: user.name ?? user.email.split('@')[0],
          resetUrl: url,
          expiresIn: "1 hour",
        });
      } catch (error) {
        console.error("Failed to send password reset email:", error);
        // Don't throw - we still want to allow the reset flow
      }
    },
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    },
  },
});
