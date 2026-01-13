# Email Setup Guide

## Overview

The email package (`@bhvr-ecom/email`) provides transactional email functionality using **Nodemailer** with **Brevo** (formerly Sendinblue) as the SMTP provider.

## Features

- ✅ Password reset emails
- ✅ Order confirmation emails
- ✅ Welcome emails (ready to use)
- ✅ Development mode (console logging)
- ✅ Production mode (Brevo SMTP)
- ✅ Clean HTML templates
- ✅ Automatic fallback to text-only

---

## Setup Instructions

### 1. Create a Brevo Account

1. Go to [Brevo](https://www.brevo.com/) and sign up for a free account
2. Navigate to **Settings** → **SMTP & API** → **SMTP**
3. Copy your SMTP credentials:
   - **Host**: `smtp-relay.brevo.com`
   - **Port**: `587` (TLS) or `465` (SSL)
   - **Login**: Your SMTP login (usually your email)
   - **SMTP Key**: Generate a new SMTP key

### 2. Configure Environment Variables

Add the following to your `.env` file:

```bash
# Email (Brevo SMTP)
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USER=your-brevo-smtp-login@example.com
BREVO_SMTP_PASSWORD=your-brevo-smtp-key-here
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_FROM_NAME=BHVR E-commerce
```

### 3. Install Dependencies

```bash
# From project root
bun install
```

The email package dependencies are already configured in `packages/email/package.json`:
- `nodemailer` - Email sending library
- `@types/nodemailer` - TypeScript types

### 4. Verify Setup

Start the server and check the console output:

```bash
make dev
```

You should see:
```
✓ Email transporter ready (Development - Console logging)
```

In production, you'll see:
```
✓ Email transporter ready (Brevo SMTP)
```

---

## Package Structure

```
packages/email/
├── src/
│   ├── index.ts              # Public API exports
│   ├── config.ts             # Email transporter configuration
│   ├── service.ts            # Email sending functions
│   └── templates/
│       ├── index.ts          # Template exports
│       ├── password-reset.ts # Password reset email
│       ├── order-confirmation.ts # Order confirmation email
│       └── welcome.ts        # Welcome email
├── package.json
└── tsconfig.json
```

---

## Usage Examples

### Password Reset Email

The password reset email is automatically sent by the auth package when a user requests a password reset:

```typescript
// packages/auth/src/index.ts
import { sendPasswordResetEmail } from '@bhvr-ecom/email';

sendResetPassword: async ({ user, url }) => {
  await sendPasswordResetEmail({
    to: user.email,
    userName: user.name || user.email.split('@')[0],
    resetUrl: url,
    expiresIn: "1 hour",
  });
}
```

### Order Confirmation Email

The order confirmation email is automatically sent when an order is created:

```typescript
// packages/core/src/orders/index.ts
import { sendOrderConfirmationEmail } from '@bhvr-ecom/email';

await sendOrderConfirmationEmail({
  to: customerEmail,
  customerName: "John Doe",
  orderNumber: "ORD-2026-0001",
  orderDate: "2026-01-11",
  items: [
    {
      name: "Product Name",
      quantity: 2,
      price: 1999, // in centavos
      imageUrl: "https://...",
    }
  ],
  subtotal: 3998,
  shipping: 500,
  total: 4498,
  shippingAddress: {
    street: "Av. Corrientes 1234",
    city: "Buenos Aires",
    state: "CABA",
    postalCode: "1043",
    country: "Argentina",
  },
  trackingUrl: "https://...", // optional
});
```

### Welcome Email

To send a welcome email when a user signs up:

```typescript
import { sendWelcomeEmail } from '@bhvr-ecom/email';

await sendWelcomeEmail({
  to: "user@example.com",
  userName: "John Doe",
  loginUrl: "https://yourdomain.com/login",
});
```

---

## Development vs Production

### Development Mode

- Emails are **logged to console** instead of being sent
- No SMTP credentials required
- Useful for testing email content and flow
- Set `NODE_ENV=development` (default)

Console output example:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 EMAIL (Development Mode - Not Sent)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
From: BHVR E-commerce <noreply@example.com>
To: user@example.com
Subject: Reset Your Password

--- TEXT VERSION ---
Hi John Doe,
...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Production Mode

- Emails are sent via **Brevo SMTP**
- Requires valid SMTP credentials
- Set `NODE_ENV=production`

---

## Email Templates

All email templates include:
- ✅ **Responsive HTML** - Works on all devices
- ✅ **Plain text version** - For email clients that don't support HTML
- ✅ **Clean design** - Professional appearance
- ✅ **Branded** - Uses your company name and URL

### Template Customization

To customize email templates, edit the files in `packages/email/src/templates/`:

```typescript
// packages/email/src/templates/password-reset.ts
export function generatePasswordResetEmail({ userName, resetUrl }) {
  const subject = "Reset Your Password - BHVR E-commerce";
  
  const html = `
    <!DOCTYPE html>
    <html>
      <!-- Your custom HTML here -->
    </html>
  `;
  
  const text = `
    Hi ${userName},
    
    Click here to reset your password: ${resetUrl}
  `;
  
  return { subject, html, text };
}
```

---

## Error Handling

Email sending is designed to **never block** the main flow:

```typescript
// In auth - password reset continues even if email fails
try {
  await sendPasswordResetEmail({ ... });
} catch (error) {
  console.error("Failed to send password reset email:", error);
  // Don't throw - allow reset flow to continue
}

// In orders - order is created even if email fails
sendOrderConfirmationEmail({ ... }).catch((error) => {
  console.error("Failed to send order confirmation email:", error);
  // Don't throw - order was created successfully
});
```

---

## Troubleshooting

### Email not being sent in production

1. **Check environment variables**:
   ```bash
   echo $NODE_ENV
   echo $BREVO_SMTP_USER
   echo $BREVO_SMTP_PASSWORD
   ```

2. **Verify Brevo credentials**:
   - Log into Brevo dashboard
   - Check SMTP key is active
   - Ensure sending domain is verified

3. **Check server logs**:
   ```bash
   # Look for email-related errors
   make logs
   ```

### Email verification fails on startup

- Check if you have network connectivity to `smtp-relay.brevo.com`
- Verify port 587 is not blocked by firewall
- Try using port 465 (SSL) instead:
  ```bash
  BREVO_SMTP_PORT=465
  ```

### Emails go to spam

1. **Add SPF record** to your domain DNS:
   ```
   v=spf1 include:spf.brevo.com ~all
   ```

2. **Add DKIM record** (provided by Brevo in dashboard)

3. **Verify sending domain** in Brevo dashboard

4. **Use a custom domain** instead of generic addresses

---

## Brevo Free Plan Limits

- **300 emails/day** - Free forever
- **Unlimited contacts**
- **Email campaigns**
- **SMTP relay**

For higher volume:
- **Lite**: €25/month - 40,000 emails/month
- **Premium**: Custom pricing

See [Brevo Pricing](https://www.brevo.com/pricing/) for details.

---

## Testing

### Test Email Sending Locally

```typescript
// Create a test script: scripts/test-email.ts
import { sendPasswordResetEmail } from '@bhvr-ecom/email';

await sendPasswordResetEmail({
  to: 'your-email@example.com',
  userName: 'Test User',
  resetUrl: 'https://example.com/reset?token=test123',
});

console.log('Test email sent!');
```

Run it:
```bash
NODE_ENV=production bun run scripts/test-email.ts
```

### Check Console in Development

When `NODE_ENV=development`, emails are logged to console with full content.

---

## Architecture Notes

Following **Clean Architecture** principles:

1. **Email package is independent** - No dependencies on auth or core
2. **Auth and Core depend on email** - They import and use the email service
3. **Configuration is centralized** - All email config in `packages/email/src/config.ts`
4. **Templates are separate** - Easy to customize without touching logic
5. **Error handling is graceful** - Email failures don't break app flow

---

## Future Enhancements

Potential additions:

- [ ] Email templates for:
  - Order shipped notification
  - Order delivered notification
  - Abandoned cart recovery
  - Product back in stock alerts
  - Review requests
- [ ] Email queuing (using Redis)
- [ ] Email analytics (open rates, click rates)
- [ ] HTML preview tool for templates
- [ ] A/B testing for email content
- [ ] Multiple language support

---

## Related Documentation

- [CONTEXT.md](../CONTEXT.md) - Architecture guidelines
- [Clean Architecture](./clean-architecture.md) - Code structure
- [Password Reset Implementation](./password-reset-implementation.md)
- [Brevo Documentation](https://developers.brevo.com/docs/send-email-via-smtp)

---

**Questions?** Check the Brevo documentation or review the code in `packages/email/`.
