/**
 * Welcome Email Template
 * 
 * Sent when a new user registers
 */

interface WelcomeEmailParams {
  userName: string;
  userEmail: string;
  loginUrl: string;
}

export function generateWelcomeEmail({
  userName,
  userEmail,
  loginUrl,
}: WelcomeEmailParams) {
  const subject = "Welcome to BHVR E-commerce!";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to BHVR E-commerce</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <h1 style="margin: 0; color: #1a1a1a; font-size: 28px; font-weight: 700;">Welcome to BHVR E-commerce! 🎉</h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                Hi ${userName},
              </p>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                Welcome to BHVR E-commerce! We're thrilled to have you join our community.
              </p>
              
              <p style="margin: 0 0 30px; color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                Your account (<strong>${userEmail}</strong>) is now active and ready to use.
              </p>
              
              <!-- Features -->
              <div style="background-color: #f9f9f9; border-radius: 6px; padding: 30px; margin-bottom: 30px;">
                <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 18px; font-weight: 600;">What you can do:</h2>
                <ul style="margin: 0; padding: 0 0 0 20px; color: #4a4a4a; font-size: 15px; line-height: 1.8;">
                  <li>Browse our complete product catalog</li>
                  <li>Add items to your cart and checkout securely</li>
                  <li>Track your orders in real-time</li>
                  <li>Manage your account and shipping addresses</li>
                  <li>Save your favorite products</li>
                </ul>
              </div>
              
              <!-- CTA Button -->
              <table role="presentation" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 6px; background-color: #0066ff;">
                    <a href="${loginUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      Start Shopping
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; color: #6b6b6b; font-size: 14px; line-height: 1.5; text-align: center;">
                Need help? Contact us at support@bhvr-ecom.com
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
Welcome to BHVR E-commerce!

Hi ${userName},

Welcome to BHVR E-commerce! We're thrilled to have you join our community.

Your account (${userEmail}) is now active and ready to use.

What you can do:
- Browse our complete product catalog
- Add items to your cart and checkout securely
- Track your orders in real-time
- Manage your account and shipping addresses
- Save your favorite products

Start shopping: ${loginUrl}

Need help? Contact us at support@bhvr-ecom.com

---
This is an automated message from BHVR E-commerce. Please do not reply to this email.
© ${new Date().getFullYear()} BHVR E-commerce. All rights reserved.
`;

  return { subject, html, text };
}
