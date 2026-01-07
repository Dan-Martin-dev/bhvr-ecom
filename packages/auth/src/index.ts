import { db } from "@bhvr-ecom/db";
import * as schema from "@bhvr-ecom/db/schema/auth";
import { env } from "@bhvr-ecom/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",

    schema: schema,
  }),
  trustedOrigins: [env.CORS_ORIGIN],
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      // TODO: Integrate with email service when notifications are implemented
      console.log(`Password reset for ${user.email}:`);
      console.log(`Reset URL: ${url}`);
      
      // For now, log to console for development
      // In production, this should send an actual email
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
