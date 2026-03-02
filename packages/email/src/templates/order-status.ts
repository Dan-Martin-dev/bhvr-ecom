/**
 * Order Status Update Email Template
 *
 * Sent on admin-driven status transitions (processing, delivered, cancelled, refunded).
 */

type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

interface OrderStatusEmailParams {
  customerName: string;
  orderNumber: string;
  status: OrderStatus;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  paid: "Payment Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const STATUS_MESSAGES: Record<OrderStatus, string> = {
  pending: "We have received your order and are waiting for payment confirmation.",
  paid: "Your payment has been confirmed and your order is being prepared.",
  processing: "Your order is currently being processed and packed.",
  shipped: "Your order has been shipped and is on its way to you.",
  delivered: "Your order has been delivered. We hope you enjoy your purchase!",
  cancelled: "Your order has been cancelled. If you believe this is an error, please contact our support team.",
  refunded: "Your refund has been processed. Please allow 5-10 business days for it to appear on your statement.",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "#f59e0b",
  paid: "#10b981",
  processing: "#3b82f6",
  shipped: "#8b5cf6",
  delivered: "#10b981",
  cancelled: "#ef4444",
  refunded: "#6b7280",
};

export function generateOrderStatusEmail({
  customerName,
  orderNumber,
  status,
}: OrderStatusEmailParams) {
  const label = STATUS_LABELS[status];
  const message = STATUS_MESSAGES[status];
  const color = STATUS_COLORS[status];
  const subject = `Order ${orderNumber} — ${label}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <h1 style="margin: 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">Order Update</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                Hi ${customerName},
              </p>

              <p style="margin: 0 0 30px; color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                Your order <strong>${orderNumber}</strong> status has been updated.
              </p>

              <!-- Status Badge -->
              <div style="text-align: center; margin-bottom: 30px;">
                <span style="display: inline-block; padding: 10px 24px; background-color: ${color}; color: #ffffff; border-radius: 999px; font-size: 16px; font-weight: 700;">
                  ${label}
                </span>
              </div>

              <p style="margin: 0 0 30px; color: #4a4a4a; font-size: 15px; line-height: 1.6; text-align: center;">
                ${message}
              </p>

              <p style="margin: 0; color: #6b6b6b; font-size: 14px; line-height: 1.5; text-align: center;">
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
Order Update — ${label}

Hi ${customerName},

Your order ${orderNumber} status has been updated to: ${label}

${message}

Questions? Contact us at support@bhvr-ecom.com

---
This is an automated message from BHVR E-commerce. Please do not reply to this email.
© ${new Date().getFullYear()} BHVR E-commerce. All rights reserved.
`;

  return { subject, html, text };
}
