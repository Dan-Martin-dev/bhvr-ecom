# Password Reset Implementation

## Overview

The Password Reset feature provides a secure way for users to recover their accounts when they forget their passwords. It implements industry-standard security practices including token-based verification, email confirmation, and password strength requirements.

## Architecture

### Authentication Layer

The implementation uses **Better Auth's** built-in password reset functionality with custom email handling:

```typescript
// packages/auth/src/index.ts
export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      // Email service integration
      // Currently logs to console for development
      console.log(`Password reset for ${user.email}: ${url}`);
    },
  },
});
```

### Validation Schemas

```typescript
// Forgot Password - Request reset link
export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// Reset Password - Set new password
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Must contain uppercase, lowercase, and number"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
```

## User Flow

### 1. Request Password Reset

**Route:** `/forgot-password`

```
User enters email → Validation → Generate reset token → Send email → Confirmation
```

**Key Features:**
- Email validation
- User-friendly error messages
- Success confirmation screen
- Link to return to login

### 2. Receive Reset Email

The system sends an email with a secure reset link:

```
https://example.com/reset-password?token=<secure-token>
```

**Token Properties:**
- Time-limited (expires after set duration)
- Single-use only
- Cryptographically secure
- Tied to specific user account

### 3. Reset Password

**Route:** `/reset-password?token=<token>`

```
User clicks link → Token validation → Enter new password → Confirmation → Redirect to login
```

**Security Features:**
- Token expiration check
- Password strength validation
- Password confirmation
- Secure password hashing
- Automatic login redirect

## Frontend Implementation

### Forgot Password Page

```typescript
// apps/web/src/routes/forgot-password.tsx
export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  // Form handling with validation
  const onSubmit = async (data: ForgotPasswordInput) => {
    await authClient.forgetPassword({
      email: data.email,
      redirectTo: `${window.location.origin}/reset-password`,
    });
  };
}
```

**UI Components:**
- Email input field
- Submit button with loading state
- Error display
- Success confirmation
- Back to login link

### Reset Password Page

```typescript
// apps/web/src/routes/reset-password.tsx
export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  validateSearch: searchSchema, // Validates token parameter
});

function ResetPasswordPage() {
  const search = useSearch({ from: "/reset-password" });
  
  const onSubmit = async (data: ResetPasswordFormInput) => {
    await authClient.resetPassword({
      newPassword: data.password,
    });
  };
}
```

**UI Components:**
- Password input with show/hide toggle
- Confirm password input
- Password strength indicator
- Submit button with loading state
- Success confirmation with auto-redirect

### Login Form Enhancement

Added "Forgot Password?" link to the login form:

```tsx
<div className="flex items-center justify-between">
  <Label htmlFor="password">Password</Label>
  <Link to="/forgot-password" className="text-sm text-primary hover:underline">
    Forgot password?
  </Link>
</div>
```

## Security Considerations

### Token Security

- **Time-Limited**: Tokens expire after a configurable period (typically 1 hour)
- **Single-Use**: Tokens are invalidated after use
- **Secure Generation**: Cryptographically secure random token generation
- **Database Storage**: Tokens stored securely with user association

### Password Requirements

- **Minimum Length**: 8 characters
- **Complexity**: Must contain:
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
- **Client & Server Validation**: Validated on both frontend and backend

### Attack Prevention

- **Rate Limiting**: Prevents brute force attacks (to be implemented with email service)
- **No User Enumeration**: Same response whether email exists or not
- **Token Expiration**: Limits attack window
- **Secure Transport**: HTTPS required for reset links

## Email Integration

### Current Implementation (Development)

```typescript
sendResetPassword: async ({ user, url }) => {
  console.log(`Password reset for ${user.email}:`);
  console.log(`Reset URL: ${url}`);
}
```

### Production Implementation (Future)

Will integrate with email service:

```typescript
sendResetPassword: async ({ user, url }) => {
  await emailService.send({
    to: user.email,
    subject: "Reset Your Password",
    template: "password-reset",
    data: {
      userName: user.name,
      resetUrl: url,
      expiresIn: "1 hour",
    },
  });
}
```

**Recommended Email Services:**
- Resend
- SendGrid
- Mailgun
- Amazon SES

## User Experience

### Visual Design

- **Clean Interface**: Minimal, focused design
- **Clear Instructions**: Step-by-step guidance
- **Visual Feedback**: Loading states and success confirmations
- **Error Handling**: User-friendly error messages
- **Responsive**: Works on mobile and desktop

### Accessibility

- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Proper ARIA labels
- **Color Contrast**: WCAG AA compliant
- **Focus Management**: Clear focus indicators

## Error Handling

### Common Error Scenarios

| Error | User Message | Action |
|-------|--------------|--------|
| Email not found | "Check your email for reset instructions" | Same as success (security) |
| Invalid token | "Link expired or invalid" | Request new link |
| Token expired | "Link expired" | Request new link |
| Network error | "Connection error, try again" | Retry |
| Weak password | "Password must meet requirements" | Show requirements |

### Backend Error Responses

```typescript
// Invalid token
{ error: "Invalid or expired reset token" }

// Password too weak
{ error: "Password does not meet security requirements" }

// Rate limit exceeded
{ error: "Too many requests, please try again later" }
```

## Testing Strategy

### Unit Tests

```typescript
describe("Password Reset Validation", () => {
  test("accepts valid email", () => {
    expect(forgotPasswordSchema.parse({
      email: "user@example.com"
    })).toBeDefined();
  });

  test("rejects invalid email", () => {
    expect(() => forgotPasswordSchema.parse({
      email: "invalid-email"
    })).toThrow();
  });

  test("enforces password complexity", () => {
    expect(() => resetPasswordSchema.parse({
      token: "valid-token",
      password: "weak",
      confirmPassword: "weak"
    })).toThrow();
  });
});
```

### Integration Tests

- Request reset link flow
- Token generation and validation
- Password update process
- Email sending (mocked)

### E2E Tests

```typescript
test("complete password reset flow", async () => {
  // Navigate to login
  await page.goto("/login");
  
  // Click forgot password
  await page.click('text="Forgot password?"');
  
  // Enter email
  await page.fill('input[type="email"]', "test@example.com");
  await page.click('button[type="submit"]');
  
  // Verify success message
  await expect(page.locator("text=Check your email")).toBeVisible();
  
  // Get reset token from database/email
  const token = await getResetToken("test@example.com");
  
  // Navigate to reset page
  await page.goto(`/reset-password?token=${token}`);
  
  // Enter new password
  await page.fill('input[name="password"]', "NewPassword123");
  await page.fill('input[name="confirmPassword"]', "NewPassword123");
  await page.click('button[type="submit"]');
  
  // Verify success and redirect
  await expect(page).toHaveURL("/login");
});
```

## Monitoring & Logging

### Key Metrics

- Password reset requests per day
- Success rate of password resets
- Token expiration rate
- Failed reset attempts
- Average time from request to completion

### Audit Log Events

```typescript
{
  event: "password_reset_requested",
  userId: "user-id",
  email: "user@example.com",
  timestamp: "2026-01-07T12:00:00Z",
  ipAddress: "192.168.1.1"
}

{
  event: "password_reset_completed",
  userId: "user-id",
  timestamp: "2026-01-07T12:15:00Z",
  ipAddress: "192.168.1.1"
}
```

## Configuration

### Environment Variables

```env
# Better Auth
BETTER_AUTH_SECRET=<secret-key>
BETTER_AUTH_URL=http://localhost:3000

# Email Service (when implemented)
EMAIL_SERVICE_API_KEY=<api-key>
EMAIL_FROM_ADDRESS=noreply@example.com
```

### Token Expiration

Configure in Better Auth settings:

```typescript
export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
    resetPasswordTimeout: 3600, // 1 hour in seconds
  },
});
```

## Future Enhancements

- **Email Service Integration**: Replace console.log with actual email delivery
- **Rate Limiting**: Implement per-IP and per-user rate limits
- **Multi-Factor Authentication**: Add 2FA support for enhanced security
- **Password History**: Prevent reuse of recent passwords
- **Account Lockout**: Temporary lockout after multiple failed attempts
- **Security Questions**: Optional additional verification
- **SMS Reset**: Alternative to email-based reset
- **Password Strength Meter**: Visual indicator of password strength

## Related Documentation

- [Clean Architecture](./clean-architecture.md) - Authentication patterns
- [Frontend Structure](./frontend-structure.md) - Route organization
- [Database Security](./database-security.md) - Token storage security
- [Testing Guide](./testing-guide.md) - Testing authentication flows