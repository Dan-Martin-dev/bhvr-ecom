/**
 * Order Confirmation Email Template
 * 
 * Sent when a customer successfully places an order
 */

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
}

interface OrderConfirmationEmailParams {
  customerName: string;
  orderNumber: string;
  orderDate: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  trackingUrl?: string;
}

export function generateOrderConfirmationEmail({
  customerName,
  orderNumber,
  orderDate,
  items,
  subtotal,
  shipping,
  total,
  shippingAddress,
  trackingUrl,
}: OrderConfirmationEmailParams) {
  const subject = `Order Confirmation - ${orderNumber}`;

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(cents / 100);
  };

  const itemsHtml = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 15px; border-bottom: 1px solid #e5e5e5;">
        <div style="display: flex; align-items: center;">
          <div>
            <strong style="color: #1a1a1a; font-size: 14px;">${item.name}</strong>
            <p style="margin: 5px 0 0; color: #6b6b6b; font-size: 13px;">Quantity: ${item.quantity}</p>
          </div>
        </div>
      </td>
      <td style="padding: 15px; border-bottom: 1px solid #e5e5e5; text-align: right;">
        <strong style="color: #1a1a1a; font-size: 14px;">${formatCurrency(item.price)}</strong>
      </td>
    </tr>
  `
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background-color: #0066ff; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">✓ Order Confirmed!</h1>
            </td>
          </tr>
          
          <!-- Order Info -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                Hi ${customerName},
              </p>
              
              <p style="margin: 0 0 30px; color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                Thank you for your order! We're getting it ready for shipment.
              </p>
              
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 15px; background-color: #f9f9f9; border-radius: 6px;">
                    <table style="width: 100%;">
                      <tr>
                        <td>
                          <p style="margin: 0; color: #6b6b6b; font-size: 13px;">Order Number</p>
                          <p style="margin: 5px 0 0; color: #1a1a1a; font-size: 16px; font-weight: 600;">${orderNumber}</p>
                        </td>
                        <td style="text-align: right;">
                          <p style="margin: 0; color: #6b6b6b; font-size: 13px;">Order Date</p>
                          <p style="margin: 5px 0 0; color: #1a1a1a; font-size: 14px;">${orderDate}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Items -->
              <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 18px; font-weight: 600;">Order Details</h2>
              
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                ${itemsHtml}
                
                <!-- Totals -->
                <tr>
                  <td style="padding: 15px; text-align: right; color: #6b6b6b; font-size: 14px;">Subtotal:</td>
                  <td style="padding: 15px; text-align: right; color: #1a1a1a; font-size: 14px;">${formatCurrency(subtotal)}</td>
                </tr>
                <tr>
                  <td style="padding: 15px; text-align: right; color: #6b6b6b; font-size: 14px;">Shipping:</td>
                  <td style="padding: 15px; text-align: right; color: #1a1a1a; font-size: 14px;">${formatCurrency(shipping)}</td>
                </tr>
                <tr>
                  <td style="padding: 15px; border-top: 2px solid #1a1a1a; text-align: right; color: #1a1a1a; font-size: 16px; font-weight: 600;">Total:</td>
                  <td style="padding: 15px; border-top: 2px solid #1a1a1a; text-align: right; color: #1a1a1a; font-size: 16px; font-weight: 700;">${formatCurrency(total)}</td>
                </tr>
              </table>
              
              <!-- Shipping Address -->
              <h2 style="margin: 0 0 15px; color: #1a1a1a; font-size: 18px; font-weight: 600;">Shipping Address</h2>
              <div style="padding: 20px; background-color: #f9f9f9; border-radius: 6px; margin-bottom: 30px;">
                <p style="margin: 0; color: #1a1a1a; font-size: 14px; line-height: 1.6;">
                  ${shippingAddress.street}<br>
                  ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}<br>
                  ${shippingAddress.country}
                </p>
              </div>
              
              ${
                trackingUrl
                  ? `
              <!-- Track Order Button -->
              <table role="presentation" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 6px; background-color: #0066ff;">
                    <a href="${trackingUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      Track Your Order
                    </a>
                  </td>
                </tr>
              </table>
              `
                  : ""
              }
              
              <p style="margin: 30px 0 0; color: #6b6b6b; font-size: 14px; line-height: 1.5; text-align: center;">
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
Order Confirmation - ${orderNumber}

Hi ${customerName},

Thank you for your order! We're getting it ready for shipment.

Order Number: ${orderNumber}
Order Date: ${orderDate}

Order Details:
${items.map((item) => `- ${item.name} x${item.quantity} - ${formatCurrency(item.price)}`).join("\n")}

Subtotal: ${formatCurrency(subtotal)}
Shipping: ${formatCurrency(shipping)}
Total: ${formatCurrency(total)}

Shipping Address:
${shippingAddress.street}
${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}
${shippingAddress.country}

${trackingUrl ? `Track your order: ${trackingUrl}` : ""}

Questions? Contact us at support@bhvr-ecom.com

---
This is an automated message from BHVR E-commerce. Please do not reply to this email.
© ${new Date().getFullYear()} BHVR E-commerce. All rights reserved.
`;

  return { subject, html, text };
}
