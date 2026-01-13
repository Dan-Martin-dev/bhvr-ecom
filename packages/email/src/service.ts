import { getEmailTransporter, emailConfig } from "./config";
import type { SendMailOptions } from "nodemailer";
import {
  generatePasswordResetEmail,
  generateOrderConfirmationEmail,
  generateWelcomeEmail,
} from "./templates";
import { env } from "@bhvr-ecom/env/server";
import {
  passwordResetEmailSchema,
  orderConfirmationEmailSchema,
  welcomeEmailSchema,
  type PasswordResetEmailParams,
  type OrderConfirmationEmailParams,
  type WelcomeEmailParams,
} from "@bhvr-ecom/validations/email";

/**
 * Email Service
 * 
 * Handles sending emails through Brevo SMTP.
 * In development, emails are logged to console instead of being sent.
 */

/**
 * Send an email using the configured transporter
 */
async function sendEmail(options: SendMailOptions): Promise<void> {
  const transporter = getEmailTransporter();

  try {
    if (env.NODE_ENV === "production") {
      // Production: Send via Brevo SMTP
      await transporter.sendMail({
        from: `${emailConfig.from.name} <${emailConfig.from.address}>`,
        ...options,
      });
      console.log(`✓ Email sent to ${options.to}: ${options.subject}`);
    } else {
      // Development: Log to console
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📧 EMAIL (Development Mode - Not Sent)");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`From: ${emailConfig.from.name} <${emailConfig.from.address}>`);
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      if (options.replyTo) {
        console.log(`Reply-To: ${options.replyTo}`);
      }
      console.log("\n--- TEXT VERSION ---");
      console.log(options.text);
      console.log("\n--- HTML VERSION ---");
      console.log("(HTML email content available)");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    }
  } catch (error) {
    console.error("Failed to send email:", error);
    throw new Error(`Email delivery failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  params: PasswordResetEmailParams
): Promise<void> {
  // Validate parameters at boundary (Rule 5 & 12)
  const validated = passwordResetEmailSchema.parse(params);
  const { to, userName, resetUrl, expiresIn, replyTo } = validated;
  const { subject, html, text } = generatePasswordResetEmail({
    userName,
    userEmail: to,
    resetUrl,
    expiresIn,
  });

  await sendEmail({
    to,
    subject,
    html,
    text,
    replyTo,
  });
}

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmationEmail(
  params: OrderConfirmationEmailParams
): Promise<void> {
  // Validate parameters at boundary (Rule 5 & 12)
  const validated = orderConfirmationEmailSchema.parse(params);
  const {
    to,
    customerName,
    orderNumber,
    orderDate,
    items,
    subtotal,
    shipping,
    total,
    shippingAddress,
    trackingUrl,
    replyTo,
  } = validated;
  const { subject, html, text } = generateOrderConfirmationEmail({
    customerName,
    orderNumber,
    orderDate,
    items,
    subtotal,
    shipping,
    total,
    shippingAddress,
    trackingUrl,
  });

  await sendEmail({
    to,
    subject,
    html,
    text,
    replyTo,
  });
}

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(
  params: WelcomeEmailParams
): Promise<void> {
  // Validate parameters at boundary (Rule 5 & 12)
  const validated = welcomeEmailSchema.parse(params);
  const { to, userName, loginUrl, replyTo } = validated;
  const { subject, html, text } = generateWelcomeEmail({
    userName,
    userEmail: to,
    loginUrl,
  });

  await sendEmail({
    to,
    subject,
    html,
    text,
    replyTo,
  });
}
