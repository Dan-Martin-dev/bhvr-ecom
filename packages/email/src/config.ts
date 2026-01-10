import { env } from "@bhvr-ecom/env/server";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

/**
 * Brevo (formerly Sendinblue) SMTP Configuration
 * 
 * Brevo SMTP Settings:
 * - Host: smtp-relay.brevo.com
 * - Port: 587 (TLS) or 465 (SSL)
 * - Authentication: Required
 * 
 * Get your credentials at: https://app.brevo.com/settings/keys/smtp
 */

let transporter: Transporter | null = null;

export function getEmailTransporter(): Transporter {
  if (transporter) {
    return transporter;
  }

  // Create transporter based on environment
  if (env.NODE_ENV === "production") {
    // Production: Use Brevo SMTP
    transporter = nodemailer.createTransport({
      host: env.BREVO_SMTP_HOST,
      port: env.BREVO_SMTP_PORT,
      secure: env.BREVO_SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: env.BREVO_SMTP_USER,
        pass: env.BREVO_SMTP_PASSWORD,
      },
    });
  } else {
    // Development: Log emails to console
    transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: "unix",
      buffer: true,
    });
  }

  return transporter;
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
 * Verify email transporter connection
 * Call this on server startup to catch configuration errors early
 */
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    const transport = getEmailTransporter();
    
    if (env.NODE_ENV === "production") {
      await transport.verify();
      console.log("✓ Email transporter ready (Brevo SMTP)");
    } else {
      console.log("✓ Email transporter ready (Development - Console logging)");
    }
    
    return true;
  } catch (error) {
    console.error("✗ Email transporter error:", error);
    return false;
  }
}
