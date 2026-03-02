/**
 * Email Package
 *
 * Transactional email via Resend (free tier: 3,000/month, 100/day).
 * In development without RESEND_API_KEY, emails are logged to console.
 *
 * Usage:
 * ```typescript
 * import { sendPasswordResetEmail } from '@bhvr-ecom/email';
 *
 * await sendPasswordResetEmail({
 *   to: 'user@example.com',
 *   userName: 'John Doe',
 *   resetUrl: 'https://example.com/reset?token=xyz',
 * });
 * ```
 */

export { verifyEmailConnection, emailConfig } from "./config";
export {
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendWelcomeEmail,
  sendOrderShippedEmail,
  sendOrderStatusEmail,
} from "./service";
export * from "./templates";
