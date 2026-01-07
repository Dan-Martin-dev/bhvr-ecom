# Shipping Methods Implementation

## Overview

The Shipping Methods feature provides a comprehensive shipping management system that supports multiple shipping options with dynamic cost calculations, zone-based availability, and delivery time estimates. This enables flexible shipping configurations for different customer locations and order values.

## Architecture

### Database Schema

#### Shipping Method Table

```sql
CREATE TABLE shipping_method (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  base_cost INTEGER NOT NULL, -- Base cost in centavos (ARS)
  cost_per_kg INTEGER DEFAULT 0, -- Additional cost per kg
  zones shipping_zone[] NOT NULL, -- Array of zones: ['amba', 'interior', 'pickup']
  min_delivery_days INTEGER NOT NULL,
  max_delivery_days INTEGER NOT NULL,
  free_shipping_threshold INTEGER, -- Free shipping over this amount (centavos)
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX shipping_method_active_idx ON shipping_method(is_active);
CREATE INDEX shipping_method_sort_idx ON shipping_method(sort_order);
```

#### Order Table Updates

```sql
-- Added shipping method reference to orders
ALTER TABLE "order" ADD COLUMN shipping_method_id UUID REFERENCES shipping_method(id);
ALTER TABLE "order" ADD COLUMN shipping_method_name VARCHAR(100);
ALTER TABLE "order" ADD COLUMN shipping_estimated_days INTEGER;
```

### Validation Schemas

#### Core Types

```typescript
export const shippingZoneEnum = z.enum(["amba", "interior", "pickup"]);

export type ShippingZone = z.infer<typeof shippingZoneEnum>;
export type CreateShippingMethodInput = z.infer<typeof createShippingMethodSchema>;
export type UpdateShippingMethodInput = z.infer<typeof updateShippingMethodSchema>;
export type CalculateShippingInput = z.infer<typeof calculateShippingSchema>;
```

#### Shipping Method Schemas

```typescript
export const createShippingMethodSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  baseCost: z.number().int().min(0, "Base cost must be non-negative"),
  costPerKg: z.number().int().min(0).default(0),
  zones: z.array(shippingZoneEnum).min(1, "At least one zone is required"),
  minDeliveryDays: z.number().int().min(0, "Min delivery days must be non-negative"),
  maxDeliveryDays: z.number().int().min(0, "Max delivery days must be non-negative"),
  freeShippingThreshold: z.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
}).refine(
  (data) => data.maxDeliveryDays >= data.minDeliveryDays,
  {
    message: "Max delivery days must be greater than or equal to min delivery days",
    path: ["maxDeliveryDays"],
  }
);
```

### Business Logic Layer

#### Core Use Cases (`packages/core/src/shipping/index.ts`)

```typescript
// Create new shipping method
export async function createShippingMethod(input: CreateShippingMethodInput)

// Update existing shipping method
export async function updateShippingMethod(input: UpdateShippingMethodInput)

// Delete shipping method
export async function deleteShippingMethod(id: string)

// Get shipping method by ID
export async function getShippingMethodById(id: string)

// Get shipping methods with filtering
export async function getShippingMethods(input?: GetShippingMethodsInput)

// Calculate shipping cost for specific method
export async function calculateShippingCost(input: CalculateShippingInput)

// Get available shipping methods for zone and cart total
export async function getAvailableShippingMethods(zone: ShippingZone, cartTotal: number)
```

#### Cost Calculation Logic

```typescript
export async function calculateShippingCost(input: CalculateShippingInput) {
  const { shippingMethodId, cartTotal, weight = 0, zone } = input;

  const method = await getShippingMethodById(shippingMethodId);

  // Validate method is active and available for zone
  if (!method.isActive) {
    throw new Error("Shipping method is not active");
  }

  if (!method.zones.includes(zone)) {
    throw new Error("Shipping method not available for this zone");
  }

  // Check for free shipping
  if (method.freeShippingThreshold && cartTotal >= method.freeShippingThreshold) {
    return {
      cost: 0,
      isFree: true,
      methodName: method.name,
      estimatedDays: `${method.minDeliveryDays}-${method.maxDeliveryDays}`,
    };
  }

  // Calculate cost: base cost + weight-based cost
  const cost = method.baseCost + Math.round(weight * method.costPerKg);

  return {
    cost,
    isFree: false,
    methodName: method.name,
    estimatedDays: `${method.minDeliveryDays}-${method.maxDeliveryDays}`,
  };
}
```

## API Endpoints

### Public Endpoints

#### Get Available Shipping Methods
```http
GET /api/shipping/available?zone=amba&cartTotal=150000
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Correo Argentino - Standard",
    "description": "Envío estándar a todo el país",
    "cost": 150000,
    "isFree": false,
    "estimatedDays": "5-10",
    "minDeliveryDays": 5,
    "maxDeliveryDays": 10
  }
]
```

#### Calculate Shipping Cost
```http
POST /api/shipping/calculate
Content-Type: application/json

{
  "shippingMethodId": "uuid",
  "cartTotal": 150000,
  "weight": 2.5,
  "zone": "amba"
}
```

**Response:**
```json
{
  "cost": 175000,
  "isFree": false,
  "methodName": "Correo Argentino - Standard",
  "estimatedDays": "5-10"
}
```

### Admin Endpoints

#### List Shipping Methods
```http
GET /api/shipping/methods?isActive=true&sortBy=sortOrder&sortOrder=asc
```

#### Create Shipping Method
```http
POST /api/shipping/methods
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Correo Argentino - Express",
  "description": "Envío express a AMBA",
  "baseCost": 300000,
  "costPerKg": 100000,
  "zones": ["amba"],
  "minDeliveryDays": 2,
  "maxDeliveryDays": 4,
  "freeShippingThreshold": 5000000,
  "isActive": true,
  "sortOrder": 1
}
```

#### Update Shipping Method
```http
PUT /api/shipping/methods/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Method Name",
  "baseCost": 350000
}
```

#### Delete Shipping Method
```http
DELETE /api/shipping/methods/{id}
Authorization: Bearer <token>
```

## Default Shipping Methods

The system comes pre-seeded with 4 default shipping methods:

| Method | Zones | Base Cost | Cost/kg | Delivery | Free Shipping |
|--------|-------|-----------|---------|----------|---------------|
| Retiro en tienda | pickup | $0 | $0 | 1-2 days | Always free |
| Correo Argentino - Standard | amba, interior | $1,500 | $500 | 5-10 days | Over $20,000 |
| Correo Argentino - Express | amba, interior | $3,000 | $1,000 | 2-4 days | Over $50,000 |
| Andreani - Standard | amba, interior | $1,800 | $600 | 3-7 days | Over $25,000 |

## Implementation Details

### Zone-Based Shipping

The system supports three shipping zones:

- **AMBA (Buenos Aires Metro Area)**: Faster delivery, higher costs
- **Interior**: Standard delivery across Argentina
- **Pickup**: Store pickup, always free

### Cost Calculation

Shipping costs are calculated using a two-tier system:

1. **Base Cost**: Fixed cost for any order
2. **Weight-Based Cost**: Additional cost per kilogram

**Formula:**
```
Total Cost = Base Cost + (Weight × Cost per kg)
```

### Free Shipping Thresholds

Methods can have free shipping thresholds. When the cart total exceeds this threshold, shipping becomes free.

### Sort Ordering

Shipping methods have a `sortOrder` field (lower numbers appear first) to control display order in the UI.

## Usage Examples

### Frontend Integration

```typescript
// Get available shipping methods for checkout
const methods = await fetch('/api/shipping/available?zone=amba&cartTotal=150000')
  .then(res => res.json());

// Calculate cost for selected method
const cost = await fetch('/api/shipping/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    shippingMethodId: selectedMethod.id,
    cartTotal: 150000,
    weight: 2.5,
    zone: 'amba'
  })
}).then(res => res.json());
```

### Admin Management

```typescript
// Create new shipping method
const newMethod = await fetch('/api/shipping/methods', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: "New Shipping Method",
    baseCost: 200000,
    zones: ["amba", "interior"],
    minDeliveryDays: 3,
    maxDeliveryDays: 5
  })
});
```

## Security Considerations

- **Admin Authentication**: All admin endpoints require authentication
- **Input Validation**: All inputs validated with Zod schemas
- **SQL Injection Prevention**: Parameterized queries
- **Rate Limiting**: Sensitive endpoints should be rate-limited
- **Audit Logging**: Changes to shipping methods should be logged

## Performance Optimizations

- **Database Indexes**: Active status and sort order indexed
- **Caching**: Shipping methods can be cached for public endpoints
- **Efficient Queries**: Zone filtering done at database level
- **Pagination**: Admin listing supports pagination for large datasets

## Testing Strategy

### Unit Tests

- Shipping cost calculation logic
- Zone availability validation
- Free shipping threshold logic
- Input validation schemas

### Integration Tests

- Full CRUD operations for shipping methods
- Cost calculation with different scenarios
- Zone-based filtering
- Free shipping edge cases

### E2E Tests

- Admin shipping method management workflow
- Checkout shipping selection
- Order creation with shipping costs

## Future Enhancements

- **Real-time Shipping Rates**: Integration with carrier APIs
- **Shipping Insurance**: Optional insurance for high-value orders
- **Delivery Scheduling**: Customer-selected delivery dates
- **Shipping Labels**: Automatic label generation
- **Tracking Integration**: Real-time delivery tracking
- **International Shipping**: Support for international zones
- **Volume-Based Pricing**: Discounts for bulk orders
- **Shipping Analytics**: Performance metrics and optimization

## Migration Notes

When deploying this feature:

1. **Database Migration**: Run `bun run db:push` to create the shipping_method table
2. **Seed Data**: Run the shipping seed script to populate default methods
3. **Environment Variables**: Ensure all required env vars are set
4. **API Routes**: Shipping routes are automatically registered
5. **Frontend Integration**: Update checkout flow to use shipping methods

## Related Documentation

- [Clean Architecture](../clean-architecture.md) - Core package patterns
- [Hono RPC Guide](../hono-rpc-guide.md) - API implementation patterns
- [Database Schema](../database-schema.md) - Complete schema reference
- [Frontend Structure](../frontend-structure.md) - Route and component patterns</content>
<parameter name="filePath">/home/vare/project/ecom_202/bhvr-ecom/docs/shipping-methods-implementation.md