# Inventory Management UI Implementation

## Overview

A comprehensive admin interface for monitoring and adjusting product stock levels across the e-commerce platform. Built as part of Phase 3 roadmap requirements.

## Features

### Stock Level Monitoring
- **Dashboard Stats**: Total products, low stock alerts, inventory value, out-of-stock count
- **Product Table**: Filterable view of all products with current stock levels
- **Status Badges**: Visual indicators for stock status (In Stock, Low Stock, Out of Stock)
- **Search**: Real-time search by product name or SKU

### Inventory Adjustments
- **Individual Updates**: Adjust stock for any product via dialog
- **Three Operation Types**:
  - **Set**: Set exact stock level
  - **Add**: Increase stock by quantity
  - **Subtract**: Decrease stock by quantity
- **Preview**: Shows calculated result before applying
- **Bulk Updates**: API support for batch inventory changes (UI coming soon)

### Low Stock Alerts
- Automatic detection based on `lowStockThreshold`
- Dedicated filter to view only low-stock items
- Visual warning indicators in product table
- Analytics integration for dashboard widgets

## Architecture

### Backend

**File:** [`apps/server/src/routes/inventory.ts`](../apps/server/src/routes/inventory.ts)

Three main endpoints:

```typescript
GET  /api/inventory/low-stock       // Get products below threshold
POST /api/inventory/bulk-update     // Update multiple products at once
PATCH /api/inventory/:productId     // Update single product stock
```

All endpoints protected with `adminRateLimit` (30 req/min).

### Frontend

**File:** [`apps/web/src/routes/(authenticated)/dashboard/admin/inventory.tsx`](../apps/web/src/routes/(authenticated)/dashboard/admin/inventory.tsx)

**Route:** `/dashboard/admin/inventory`

**Features:**
- React Query for data fetching and cache management
- Shadcn/UI components (Dialog, Table, Select, etc.)
- Real-time search and filtering
- Optimistic updates with automatic cache invalidation

### Core Business Logic

**File:** [`packages/core/src/products/index.ts`](../packages/core/src/products/index.ts)

```typescript
export async function updateInventory(
  productId: string,
  quantityChange: number,
  operation: "add" | "subtract" | "set"
)
```

**Safety Features:**
- Subtract operation uses `GREATEST(stock - quantity, 0)` to prevent negative values
- Validates product existence before update
- Returns updated product data

## Usage

### Accessing the Interface

1. Log in as admin
2. Navigate to Dashboard → Inventory
3. Or visit `/dashboard/admin/inventory` directly

### Adjusting Stock

1. Click "Adjust" button on any product row
2. Choose operation type:
   - **Set to exact value**: Enter new total
   - **Add to current**: Enter quantity to add
   - **Subtract from current**: Enter quantity to remove
3. Preview shows calculated result
4. Click "Update Stock" to apply

### Filtering Low Stock

- Click "Low Stock Only" button to filter
- Shows products where `stock <= lowStockThreshold`
- Button highlighted when filter active

### Search

- Type in search box to filter by name or SKU
- Search is instant, no submit required

## API Examples

### Get Low Stock Products

```typescript
const res = await api.api.inventory["low-stock"].$get({
  query: { threshold: "10" }
});
const { data } = await res.json();
```

### Update Single Product

```typescript
const res = await api.api.inventory[":productId"].$patch({
  param: { productId: "uuid-here" },
  json: {
    quantityChange: 50,
    operation: "add"
  }
});
```

### Bulk Update (Multiple Products)

```typescript
const res = await api.api.inventory["bulk-update"].$post({
  json: {
    updates: [
      { productId: "uuid-1", quantityChange: 100, operation: "set" },
      { productId: "uuid-2", quantityChange: 25, operation: "add" },
      { productId: "uuid-3", quantityChange: 10, operation: "subtract" },
    ]
  }
});

const { summary, results } = await res.json();
// summary: { total: 3, successful: 3, failed: 0 }
```

## Database Schema

Products have built-in inventory fields:

```sql
CREATE TABLE product (
  stock INTEGER DEFAULT 0 NOT NULL,
  low_stock_threshold INTEGER DEFAULT 5 NOT NULL,
  track_inventory BOOLEAN DEFAULT true NOT NULL,
  allow_backorder BOOLEAN DEFAULT false NOT NULL,
  -- ... other fields
);
```

**Key Fields:**
- `stock`: Current quantity available
- `low_stock_threshold`: Trigger for low stock alerts
- `track_inventory`: Whether to enforce stock limits
- `allow_backorder`: Allow orders when out of stock

## Integration Points

### Analytics Dashboard

Low stock data feeds into analytics:

```typescript
// packages/core/src/analytics/dashboard.ts
export async function getLowStockProductsForAnalytics(threshold: number)
```

Displayed in admin stats page widget.

### Cart/Checkout

Inventory checks during:
1. Add to cart (validates availability)
2. Checkout (prevents overselling)
3. Order creation (decrements stock)

See [`packages/core/src/cart/index.ts`](../packages/core/src/cart/index.ts) for validation logic.

## Security

### Rate Limiting

All inventory endpoints use `adminRateLimit`:
- **30 requests per minute**
- **Per admin user** (not IP-based)
- Protects against accidental bulk operations

### Authorization

- Requires admin role (enforced in middleware)
- Routes under `/dashboard/admin/*` protected by auth
- No guest or customer access

## Performance

### Caching

- Product list cached with React Query
- Automatic invalidation on updates
- Low stock query separate cache key

### Optimizations

- Table virtualization not needed (paginated data)
- Search is client-side (fast for admin use case)
- Debouncing not required (instant search is fine)

## UI Components

### New Components Added

**Dialog** ([`apps/web/src/components/ui/dialog.tsx`](../apps/web/src/components/ui/dialog.tsx))
- Radix UI Dialog primitive
- Used for stock adjustment modal

### Existing Components Used

- `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardDescription`
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`
- `Badge` (with custom variants for stock status)
- `Button`, `Input`, `Label`
- `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`

## Testing

### Manual Testing Steps

1. **View Inventory**
   ```bash
   make dev
   # Navigate to /dashboard/admin/inventory
   ```

2. **Filter Low Stock**
   - Click "Low Stock Only" button
   - Verify only low stock products shown

3. **Update Stock**
   - Click "Adjust" on any product
   - Test each operation type (set, add, subtract)
   - Verify preview calculation
   - Apply and check table updates

4. **Search**
   - Type product name or SKU
   - Verify filtering works

### API Testing

```bash
# Get low stock
curl -X GET http://localhost:3000/api/inventory/low-stock?threshold=10 \
  -H "Authorization: Bearer <admin-token>"

# Update inventory
curl -X PATCH http://localhost:3000/api/inventory/<product-id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"quantityChange": 50, "operation": "add"}'
```

## Future Enhancements

### Phase 4 Features

- [ ] **Bulk CSV Import**: Upload spreadsheet to update many products
- [ ] **Stock History Log**: Track all inventory changes with timestamp and user
- [ ] **Automatic Reorder Alerts**: Email when stock below reorder point
- [ ] **Variant Inventory**: Separate stock tracking per product variant
- [ ] **Warehouse Management**: Multi-location inventory tracking
- [ ] **Inventory Reports**: Export stock levels, valuation, turnover rate

### Quick Wins

- [ ] **Keyboard Shortcuts**: Quick access to adjust dialog (e.g., `A` to adjust)
- [ ] **Undo Last Change**: Revert recent inventory update
- [ ] **Stock Value Chart**: Visualize inventory value over time
- [ ] **Low Stock Notifications**: Toast/email when products hit threshold

## Troubleshooting

### Routes Not Found (404)

**Symptom:** Inventory page shows 404 or TypeScript errors about route

**Fix:** TanStack Router needs to generate route types. Run dev server once:

```bash
cd apps/web
bun run dev
# Wait for "Routes generated"
# Stop server (Ctrl+C)
make check  # Should pass now
```

### Stock Not Updating

**Check:**
1. Verify product exists and `trackInventory` is true
2. Check browser console for API errors
3. Verify admin authentication
4. Check rate limit not exceeded

### Negative Stock Values

**Not possible!** The update query uses `GREATEST(stock - quantity, 0)` to prevent negatives.

## Related Documentation

- [Admin Product Management](./admin-product-management.md)
- [Database Schema](./database-schema.md)
- [System Overview](./system-overview.md)
- [Rate Limiting](./rate-limiting.md)

---

**Implementation Date:** January 15, 2026  
**Phase:** Phase 3 - Scale  
**Status:** ✅ Complete
