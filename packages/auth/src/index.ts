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
  trustedOrigins: [env.CORS_ORIGIN],
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
      sameSite: "none",
      secure: true,
      httpOnly: true,
    },
  },
});
