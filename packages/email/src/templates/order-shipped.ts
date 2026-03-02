/**
 * Order Shipped Email Template
 *
 * Sent when an admin marks an order as shipped.
 */

interface OrderShippedEmailParams {
  customerName: string;
  orderNumber: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
}

export function generateOrderShippedEmail({
  customerName,
  orderNumber,
  trackingNumber,
  trackingUrl,
  estimatedDelivery,
}: OrderShippedEmailParams) {
  const subject = `Your Order ${orderNumber} Has Shipped!`;

  const trackingSection = trackingNumber
    ? `
      <div style="background-color: #f0f7ff; border-left: 4px solid #0066ff; border-radius: 4px; padding: 20px; margin-bottom: 30px;">
        <p style="margin: 0 0 8px; color: #1a1a1a; font-size: 14px; font-weight: 600;">Tracking Number</p>
        <p style="margin: 0; color: #0066ff; font-size: 18px; font-weight: 700; font-family: monospace;">${trackingNumber}</p>
        ${estimatedDelivery ? `<p style="margin: 10px 0 0; color: #6b6b6b; font-size: 13px;">Estimated delivery: <strong>${estimatedDelivery}</strong></p>` : ""}
      </div>
      ${trackingUrl ? `
      <table role="presentation" style="margin: 0 auto 30px;">
        <tr>
          <td style="border-radius: 6px; background-color: #0066ff;">
            <a href="${trackingUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
              Track Your Package
            </a>
          </td>
        </tr>
      </table>` : ""}
    `
    : estimatedDelivery
    ? `<p style="margin: 0 0 30px; color: #4a4a4a; font-size: 16px; line-height: 1.5;">Estimated delivery: <strong>${estimatedDelivery}</strong></p>`
    : "";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Order Has Shipped</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background-color: #10b981; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Your order is on its way!</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                Hi ${customerName},
              </p>

              <p style="margin: 0 0 30px; color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                Great news! Your order <strong>${orderNumber}</strong> has been shipped and is heading your way.
              </p>

              ${trackingSection}

              <p style="margin: 0 0 0; color: #6b6b6b; font-size: 14px; line-height: 1.5; text-align: center;">
                Questions? Contact us at support@bhvr-ecom.com
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
Your Order Has Shipped!

Hi ${customerName},

Your order ${orderNumber} has been shipped and is heading your way.

${trackingNumber ? `Tracking Number: ${trackingNumber}` : ""}
${estimatedDelivery ? `Estimated Delivery: ${estimatedDelivery}` : ""}
${trackingUrl ? `Track your package: ${trackingUrl}` : ""}

Questions? Contact us at support@bhvr-ecom.com

---
This is an automated message from BHVR E-commerce. Please do not reply to this email.
© ${new Date().getFullYear()} BHVR E-commerce. All rights reserved.
`;

  return { subject, html, text };
}
