# Guest Cart & Cart Merge Implementation

## Overview

The Guest Cart & Cart Merge feature enables anonymous users to add items to their cart before logging in, with seamless cart persistence and automatic merging when they authenticate. This provides a frictionless shopping experience that doesn't require immediate account creation.

## Architecture

### Client-Side Components

#### Guest Cart Service (`apps/web/src/lib/guest-cart.ts`)

The guest cart service manages client-side cart persistence using localStorage:

```typescript
interface GuestCartItem {
  productId: string;
  quantity: number;
  priceAtAdd: number;
}

interface GuestCart {
  sessionId: string;
  items: GuestCartItem[];
  createdAt: string;
  updatedAt: string;
}
```

**Key Functions:**

- `getGuestSessionId()`: Generates/returns unique session ID for guest users
- `getGuestCart()`: Retrieves cart from localStorage or creates new one
- `addToGuestCart()`: Adds items to guest cart with quantity management
- `updateGuestCartItem()`: Updates item quantities or removes items
- `clearGuestCartData()`: Cleans up localStorage after successful merge

#### Unified Cart Hook (`apps/web/src/lib/use-cart.ts`)

The `useCart` hook provides a unified interface for both authenticated and guest users:

```typescript
export function useCart(isAuthenticated: boolean) {
  // Handles both guest and auth cart operations
  // Auto-merges guest cart on login
}
```

**Features:**

- Conditional API calls based on authentication status
- Automatic guest cart merging when user logs in
- Consistent error handling and toast notifications
- Query invalidation for real-time updates

### Server-Side Components

#### Cart Routes (`apps/server/src/routes/cart.ts`)

Updated cart routes with optional authentication support:

```typescript
const cart = new Hono<AppEnv>()
  .use("/*", optionalAuth)  // Supports both auth and guest users
  .get("/", getCartHandler)
  .post("/items", addToCartHandler)
  .post("/merge", mergeCartHandler)  // New merge endpoint
```

**Key Changes:**

- `optionalAuth` middleware allows anonymous access
- `x-session-id` header for guest cart identification
- `/api/cart/merge` endpoint for cart synchronization

#### Cart Business Logic (`packages/core/src/cart/index.ts`)

Enhanced cart use cases with guest cart support:

```typescript
export async function getOrCreateCart(userId?: string, sessionId?: string)
export async function syncGuestCart(userId: string, guestSessionId: string)
export async function mergeGuestCart(userId: string, guestSessionId: string)
```

**Merge Logic:**

1. Retrieves guest cart by session ID
2. Gets or creates user cart
3. Merges items (takes higher quantity for duplicates)
4. Deletes guest cart after successful merge

## Implementation Flow

### Guest User Shopping

1. **Session Creation**: First cart operation generates unique session ID
2. **localStorage Persistence**: Cart data stored locally with session ID
3. **API Calls**: All cart operations include `x-session-id` header
4. **Database**: Guest carts stored with `sessionId` instead of `userId`

### Login & Cart Merge

1. **Authentication**: User logs in successfully
2. **Auto-Merge Trigger**: `useCart` hook detects guest cart items
3. **Merge Request**: POST to `/api/cart/merge` with guest session ID
4. **Synchronization**: Server merges guest items into user cart
5. **Cleanup**: Guest cart data removed from localStorage
6. **UI Update**: Cart reflects merged items with success notification

## Database Schema

```sql
-- Cart table supports both user and session carts
CREATE TABLE cart (
  id TEXT PRIMARY KEY,
  userId TEXT REFERENCES auth_user(id),
  sessionId TEXT,  -- For guest carts
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(userId),  -- One cart per user
  UNIQUE(sessionId)  -- One cart per session
);
```

## Security Considerations

- **Session ID Generation**: Cryptographically secure random IDs
- **Header Validation**: Server validates `x-session-id` format
- **Authentication Checks**: Merge operations require authenticated users
- **Data Isolation**: Guest carts isolated by session ID
- **Cleanup**: Guest data removed after successful merge

## Error Handling

- **Network Failures**: Graceful fallback with user notifications
- **Merge Conflicts**: Server handles duplicate items intelligently
- **Invalid Sessions**: Proper error responses for malformed requests
- **Storage Issues**: localStorage failures don't break functionality

## Testing Strategy

### Unit Tests

- Guest cart service functions
- Cart hook mutations
- Merge logic edge cases

### Integration Tests

- Full guest → auth flow
- Cart persistence across sessions
- Merge conflict resolution

### E2E Tests

- Complete shopping journey
- Login with existing guest cart
- Cart state consistency

## Performance Optimizations

- **localStorage**: Fast client-side storage for immediate UI updates
- **Query Caching**: TanStack Query prevents unnecessary API calls
- **Optimistic Updates**: UI updates immediately, rolls back on errors
- **Background Merging**: Cart merge happens asynchronously on login

## Future Enhancements

- **Cart Expiration**: Automatic cleanup of old guest carts
- **Cross-Device Sync**: Sync carts across user devices
- **Cart Templates**: Save cart configurations for later
- **Abandoned Cart Recovery**: Email reminders for guest carts
