/**
 * Email Package
 * 
 * Provides email functionality using Nodemailer + Brevo SMTP
 * 
 * Features:
 * - Password reset emails
 * - Order confirmation emails
 * - Welcome emails
 * - Development mode (logs to console)
 * - Production mode (sends via Brevo)
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
} from "./service";
export * from "./templates";
