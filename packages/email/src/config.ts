import { env } from "@bhvr-ecom/env/server";
import { Resend } from "resend";

/**
 * Resend Email Configuration
 *
 * Free tier: 3,000 emails/month, 100/day
 * Get your API key at: https://resend.com/api-keys
 */

let resendClient: Resend | null = null;

export function getResendClient(): Resend {
  if (resendClient) {
    return resendClient;
  }
  resendClient = new Resend(env.RESEND_API_KEY);
  return resendClient;
}

/**
 * Email configuration and defaults
 */
export const emailConfig = {
  from: {
    name: env.EMAIL_FROM_NAME || "BHVR E-commerce",
    address: env.EMAIL_FROM_ADDRESS,
  },
  // Base URL for email links (reset password, order tracking, etc.)
  baseUrl: env.BETTER_AUTH_URL,
} as const;

/**
 * Verify Resend client is configured
 * Call this on server startup to catch configuration errors early
 */
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    if (!env.RESEND_API_KEY) {
      if (env.NODE_ENV === "production") {
        console.error("✗ Email: RESEND_API_KEY is not set");
        return false;
      }
      console.log("✓ Email transporter ready (Development - Console logging, no API key)");
      return true;
    }

    // Resend doesn't have a standalone verify endpoint on free tier,
    // but we can confirm the client initializes correctly.
    getResendClient();
    console.log("✓ Email transporter ready (Resend)");
    return true;
  } catch (error) {
    console.error("✗ Email transporter error:", error);
    return false;
  }
}
