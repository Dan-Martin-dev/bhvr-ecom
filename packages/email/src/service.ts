import { getResendClient, emailConfig } from "./config";
import {
  generatePasswordResetEmail,
  generateOrderConfirmationEmail,
  generateWelcomeEmail,
  generateOrderShippedEmail,
  generateOrderStatusEmail,
} from "./templates";
import { env } from "@bhvr-ecom/env/server";
import {
  passwordResetEmailSchema,
  orderConfirmationEmailSchema,
  welcomeEmailSchema,
  orderShippedEmailSchema,
  orderStatusEmailSchema,
  type PasswordResetEmailParams,
  type OrderConfirmationEmailParams,
  type WelcomeEmailParams,
  type OrderShippedEmailParams,
  type OrderStatusEmailParams,
} from "@bhvr-ecom/validations/email";

/**
 * Email Service
 *
 * Sends transactional emails via Resend.
 * In development without RESEND_API_KEY, emails are logged to console.
 */

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

async function sendEmail(options: SendEmailOptions): Promise<void> {
  const from = `${emailConfig.from.name} <${emailConfig.from.address}>`;

  // Dev mode without API key: log to console only
  if (!env.RESEND_API_KEY) {
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📧 EMAIL (Dev mode — not sent, no RESEND_API_KEY)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`From:    ${from}`);
    console.log(`To:      ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    if (options.replyTo) console.log(`Reply-To: ${options.replyTo}`);
    console.log("\n--- TEXT ---");
    console.log(options.text);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    return;
  }

  const resend = getResendClient();

  const { error } = await resend.emails.send({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    replyTo: options.replyTo,
  });

  if (error) {
    console.error("Resend delivery error:", error);
    throw new Error(`Email delivery failed: ${error.message}`);
  }

  console.log(`✓ Email sent to ${options.to}: ${options.subject}`);
}

// ============================================================================
// PUBLIC SEND FUNCTIONS
// ============================================================================

/**
 * Password reset email — triggered by Better-Auth sendResetPassword hook
 */
export async function sendPasswordResetEmail(
  params: PasswordResetEmailParams
): Promise<void> {
  const validated = passwordResetEmailSchema.parse(params);
  const { to, userName, resetUrl, expiresIn, replyTo } = validated;
  const { subject, html, text } = generatePasswordResetEmail({
    userName,
    userEmail: to,
    resetUrl,
    expiresIn,
  });
  await sendEmail({ to, subject, html, text, replyTo });
}

/**
 * Order confirmation email — triggered on order creation
 */
export async function sendOrderConfirmationEmail(
  params: OrderConfirmationEmailParams
): Promise<void> {
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
  await sendEmail({ to, subject, html, text, replyTo });
}

/**
 * Welcome email — triggered on new user registration
 */
export async function sendWelcomeEmail(
  params: WelcomeEmailParams
): Promise<void> {
  const validated = welcomeEmailSchema.parse(params);
  const { to, userName, loginUrl, replyTo } = validated;
  const { subject, html, text } = generateWelcomeEmail({
    userName,
    userEmail: to,
    loginUrl,
  });
  await sendEmail({ to, subject, html, text, replyTo });
}

/**
 * Order shipped email — triggered when admin marks order as shipped
 */
export async function sendOrderShippedEmail(
  params: OrderShippedEmailParams
): Promise<void> {
  const validated = orderShippedEmailSchema.parse(params);
  const { to, customerName, orderNumber, trackingNumber, trackingUrl, estimatedDelivery, replyTo } = validated;
  const { subject, html, text } = generateOrderShippedEmail({
    customerName,
    orderNumber,
    trackingNumber,
    trackingUrl,
    estimatedDelivery,
  });
  await sendEmail({ to, subject, html, text, replyTo });
}

/**
 * Order status update email — triggered on any admin status change
 */
export async function sendOrderStatusEmail(
  params: OrderStatusEmailParams
): Promise<void> {
  const validated = orderStatusEmailSchema.parse(params);
  const { to, customerName, orderNumber, status, replyTo } = validated;
  const { subject, html, text } = generateOrderStatusEmail({
    customerName,
    orderNumber,
    status,
  });
  await sendEmail({ to, subject, html, text, replyTo });
}
