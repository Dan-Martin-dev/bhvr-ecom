/**
 * Password Reset Email Template
 * 
 * Provides a clean, professional email for password reset requests
 */

interface PasswordResetEmailParams {
  userName: string;
  userEmail: string;
  resetUrl: string;
  expiresIn?: string;
}

export function generatePasswordResetEmail({
  userName,
  userEmail,
  resetUrl,
  expiresIn = "1 hour",
}: PasswordResetEmailParams) {
  const subject = "Reset Your Password - BHVR E-commerce";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <h1 style="margin: 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">Password Reset Request</h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                Hi ${userName},
              </p>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                We received a request to reset your password for your BHVR E-commerce account (<strong>${userEmail}</strong>).
              </p>
              
              <p style="margin: 0 0 30px; color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                Click the button below to create a new password:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 6px; background-color: #0066ff;">
                    <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 20px; color: #6b6b6b; font-size: 14px; line-height: 1.5;">
                This link will expire in <strong>${expiresIn}</strong>. If you didn't request a password reset, you can safely ignore this email.
              </p>
              
              <p style="margin: 20px 0 0; color: #6b6b6b; font-size: 14px; line-height: 1.5;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              
              <p style="margin: 10px 0 0; color: #0066ff; font-size: 14px; word-break: break-all;">
                ${resetUrl}
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9f9f9; border-top: 1px solid #e5e5e5; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; color: #8a8a8a; font-size: 12px;">
                This is an automated message from BHVR E-commerce. Please do not reply to this email.
              </p>
              <p style="margin: 0; color: #8a8a8a; font-size: 12px;">
                © ${new Date().getFullYear()} BHVR E-commerce. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const text = `
Password Reset Request

Hi ${userName},

We received a request to reset your password for your BHVR E-commerce account (${userEmail}).

Click the link below to create a new password:
${resetUrl}

This link will expire in ${expiresIn}. If you didn't request a password reset, you can safely ignore this email.

---
This is an automated message from BHVR E-commerce. Please do not reply to this email.
© ${new Date().getFullYear()} BHVR E-commerce. All rights reserved.
`;

  return { subject, html, text };
}
