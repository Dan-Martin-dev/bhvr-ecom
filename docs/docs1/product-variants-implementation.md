# Product Variants Implementation

## Overview

Product variants allow a single product to have multiple variations based on attributes like size, color, material, or style. Each variant has its own SKU, inventory tracking, and optional price overrides.

**Implementation Date**: December 2024  
**Priority**: P1  
**Status**: ✅ Complete

---

## Features

### Core Functionality

- ✅ Multiple variant attributes (size, color, material, style)
- ✅ Unique SKU per variant
- ✅ Separate inventory tracking per variant
- ✅ Optional price override per variant
- ✅ Variant-specific images
- ✅ Bulk variant creation
- ✅ Stock management per variant
- ✅ Active/inactive status per variant
- ✅ Sort order for display

### Business Rules

1. **Unique SKUs**: Each variant must have a unique SKU across all variants
2. **Product Reference**: Variants must belong to an existing product
3. **Stock Tracking**: Each variant tracks its own inventory independently
4. **Price Inheritance**: Variants inherit the product's base price unless overridden
5. **Weight Inheritance**: Variants inherit the product's weight unless overridden

---

## Database Schema

### Product Variant Table

```sql
CREATE TABLE product_variant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  
  -- Variant attributes
  name VARCHAR(255) NOT NULL,        -- e.g., "M / Azul"
  size VARCHAR(50),                  -- e.g., "S", "M", "L", "XL", "42"
  color VARCHAR(50),                 -- e.g., "Azul", "Rojo", "Negro"
  material VARCHAR(50),              -- e.g., "Algodón", "Poliéster"
  style VARCHAR(50),                 -- e.g., "Slim Fit", "Regular"
  
  -- Identifiers
  sku VARCHAR(100) NOT NULL UNIQUE,
  barcode VARCHAR(100),
  
  -- Price overrides (in centavos ARS)
  price INTEGER,                     -- If null, use product base price
  compare_at_price INTEGER,
  
  -- Inventory
  stock INTEGER NOT NULL DEFAULT 0,
  
  -- Weight override (in grams)
  weight INTEGER,                    -- If null, use product weight
  
  -- Image reference
  image_id UUID REFERENCES product_image(id) ON DELETE SET NULL,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_product_variant_product_id ON product_variant(product_id);
CREATE INDEX idx_product_variant_sku ON product_variant(sku);
CREATE INDEX idx_product_variant_is_active ON product_variant(is_active);
```

### Relations

- **product** → **variants** (one-to-many)
- **variant** → **product** (many-to-one)
- **variant** → **image** (many-to-one, optional)

---

## API Endpoints

### Public Routes

#### Get Variants for Product

```http
GET /api/variants?productId={uuid}&includeInactive=false
```

Returns all variants for a product.

**Query Parameters:**
- `productId` (required): UUID of the product
- `includeInactive` (optional, default: false): Include inactive variants

**Response:**
```json
[
  {
    "id": "uuid",
    "productId": "uuid",
    "name": "M / Azul",
    "size": "M",
    "color": "Azul",
    "sku": "TSHIRT-001-M-BLUE",
    "stock": 25,
    "price": null,
    "compareAtPrice": null,
    "weight": null,
    "imageId": "uuid",
    "isActive": true,
    "sortOrder": 1,
    "image": {
      "id": "uuid",
      "url": "https://...",
      "alt": "Blue T-shirt"
    }
  }
]
```

#### Get Variant Options

```http
GET /api/variants/options/{productId}
```

Returns available options (sizes, colors, etc.) for a product.

**Response:**
```json
{
  "sizes": ["S", "M", "L", "XL"],
  "colors": ["Rojo", "Azul", "Negro"],
  "materials": [],
  "styles": []
}
```

#### Get Single Variant

```http
GET /api/variants/{id}
```

Returns a single variant with product details.

### Admin Routes (Authentication Required)

#### Create Variant

```http
POST /api/variants
Authorization: Bearer {token}
Content-Type: application/json

{
  "productId": "uuid",
  "name": "M / Azul",
  "size": "M",
  "color": "Azul",
  "sku": "TSHIRT-001-M-BLUE",
  "stock": 25,
  "price": 1500000,  // Optional price override (centavos)
  "sortOrder": 1
}
```

**Response:** 201 Created with variant object

#### Bulk Create Variants

```http
POST /api/variants/bulk
Authorization: Bearer {token}
Content-Type: application/json

{
  "productId": "uuid",
  "variants": [
    {
      "name": "S / Rojo",
      "size": "S",
      "color": "Rojo",
      "sku": "TSHIRT-001-S-RED",
      "stock": 15
    },
    {
      "name": "M / Rojo",
      "size": "M",
      "color": "Rojo",
      "sku": "TSHIRT-001-M-RED",
      "stock": 25
    }
  ]
}
```

**Response:** 201 Created with array of created variants

#### Update Variant

```http
PUT /api/variants/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "stock": 30,
  "price": 1600000,
  "isActive": true
}
```

**Response:** 200 OK with updated variant

#### Delete Variant

```http
DELETE /api/variants/{id}
Authorization: Bearer {token}
```

**Response:** 200 OK with success message

#### Update Variant Stock

```http
PATCH /api/variants/{id}/stock
Authorization: Bearer {token}
Content-Type: application/json

{
  "quantity": 10,
  "operation": "increment"  // or "decrement"
}
```

**Response:** 200 OK with updated variant

---

## Business Logic

### Core Functions

Located in `packages/core/src/variants/index.ts`:

```typescript
// Create single variant
await createVariant({
  productId: "uuid",
  name: "M / Azul",
  size: "M",
  color: "Azul",
  sku: "TSHIRT-001-M-BLUE",
  stock: 25,
});

// Bulk create variants
await bulkCreateVariants({
  productId: "uuid",
  variants: [
    { name: "S / Red", size: "S", color: "Red", sku: "SKU-S-RED", stock: 10 },
    { name: "M / Red", size: "M", color: "Red", sku: "SKU-M-RED", stock: 15 },
  ],
});

// Get variants for product
const variants = await getVariantsByProduct({
  productId: "uuid",
  includeInactive: false,
});

// Get variant by ID
const variant = await getVariantById("uuid");

// Update variant
await updateVariant("uuid", {
  stock: 30,
  price: 1600000,
});

// Delete variant
await deleteVariant("uuid");

// Check if variant has enough stock
const hasStock = await checkVariantStock("uuid", 5);

// Update stock
await updateVariantStock("uuid", 10, "increment");

// Get available options
const options = await getVariantOptions("productId");
// Returns: { sizes: ["S", "M", "L"], colors: ["Red", "Blue"], ... }
```

---

## Validation Schemas

Located in `packages/validations/src/variants.ts`:

```typescript
import { z } from "zod";

// Create variant schema
export const createProductVariantSchema = z.object({
  productId: z.string().uuid(),
  name: z.string().min(1).max(255),
  size: z.string().max(50).optional(),
  color: z.string().max(50).optional(),
  material: z.string().max(50).optional(),
  style: z.string().max(50).optional(),
  sku: z.string().min(1).max(100),
  barcode: z.string().max(100).optional(),
  price: z.number().int().min(0).optional(),
  compareAtPrice: z.number().int().min(0).optional(),
  stock: z.number().int().min(0).default(0),
  weight: z.number().int().min(0).optional(),
  imageId: z.string().uuid().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

// Bulk create schema
export const bulkCreateVariantsSchema = z.object({
  productId: z.string().uuid(),
  variants: z.array(
    createProductVariantSchema.omit({ productId: true })
  ).min(1),
});
```

---

## Usage Examples

### Frontend: Product Page with Variants

```tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

function ProductPage({ productId }) {
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);

  // Fetch variants
  const { data: variants } = useQuery({
    queryKey: ["variants", productId],
    queryFn: () => 
      fetch(`/api/variants?productId=${productId}`).then(r => r.json())
  });

  // Fetch available options
  const { data: options } = useQuery({
    queryKey: ["variantOptions", productId],
    queryFn: () =>
      fetch(`/api/variants/options/${productId}`).then(r => r.json())
  });

  // Find matching variant
  const selectedVariant = variants?.find(
    v => v.size === selectedSize && v.color === selectedColor
  );

  return (
    <div>
      {/* Size selector */}
      <div>
        <h3>Talle</h3>
        {options?.sizes.map(size => (
          <button
            key={size}
            onClick={() => setSelectedSize(size)}
            className={selectedSize === size ? "selected" : ""}
          >
            {size}
          </button>
        ))}
      </div>

      {/* Color selector */}
      <div>
        <h3>Color</h3>
        {options?.colors.map(color => (
          <button
            key={color}
            onClick={() => setSelectedColor(color)}
            className={selectedColor === color ? "selected" : ""}
          >
            {color}
          </button>
        ))}
      </div>

      {/* Stock info */}
      {selectedVariant && (
        <div>
          <p>SKU: {selectedVariant.sku}</p>
          <p>Stock: {selectedVariant.stock} unidades</p>
          {selectedVariant.stock < 5 && (
            <p className="low-stock">¡Últimas unidades!</p>
          )}
        </div>
      )}

      {/* Add to cart */}
      <button
        disabled={!selectedVariant || selectedVariant.stock === 0}
        onClick={() => addToCart(selectedVariant.id)}
      >
        {selectedVariant?.stock === 0 ? "Sin stock" : "Agregar al carrito"}
      </button>
    </div>
  );
}
```

### Admin: Bulk Create Variants

```typescript
import { api } from "~/lib/api";

async function createTshirtVariants(productId: string) {
  const sizes = ["S", "M", "L", "XL"];
  const colors = ["Rojo", "Azul", "Negro"];

  const variants = sizes.flatMap(size =>
    colors.map(color => ({
      name: `${size} / ${color}`,
      size,
      color,
      sku: `TSHIRT-${size}-${color.toUpperCase()}`,
      stock: Math.floor(Math.random() * 30) + 10, // 10-40 units
    }))
  );

  await api.variants.bulk.$post({
    json: {
      productId,
      variants,
    },
  });
}
```

---

## Seed Data

Run the seed script to create sample variants:

```bash
bun run packages/db/scripts/seed-variants.ts
```

**Creates:**
- **T-shirt variants**: 12 variants (S/M/L/XL × Red/Blue/Black)
- **Sneaker variants**: 5 variants (sizes 39-43)

---

## Cart & Order Integration

### Updating Cart to Support Variants

**Current cart schema** references `productId`. For variants support, you have two options:

#### Option 1: Add variantId to cart_item

```sql
ALTER TABLE cart_item
ADD COLUMN variant_id UUID REFERENCES product_variant(id);
```

Then when adding to cart, pass both productId and variantId:

```typescript
await addToCart({
  productId: "uuid",
  variantId: "uuid",  // Optional for backward compatibility
  quantity: 1,
});
```

#### Option 2: Use variantId as productId

Treat variant selection as the primary identifier and deprecate storing base product in cart:

```typescript
// Add variant to cart directly
await addToCart({
  productId: variant.id,  // Use variant ID
  quantity: 1,
});
```

**Recommendation**: Use Option 1 for flexibility - it allows products without variants to still work with the existing flow.

---

## Testing

### Manual Testing Checklist

- [ ] Create a product with multiple variants
- [ ] Verify each variant has unique SKU
- [ ] Test price override (variant price vs product price)
- [ ] Test stock management per variant
- [ ] Verify variant filtering by size/color
- [ ] Test bulk variant creation
- [ ] Test variant activation/deactivation
- [ ] Verify CASCADE delete when product is deleted
- [ ] Test variant-specific images

### Example Test Data

```typescript
// Create product
const product = await createProduct({
  name: "Remera Básica",
  slug: "remera-basica",
  price: 1200000, // $12,000 ARS base price
  sku: "REM-BAS-001",
  stock: 0, // Stock tracked at variant level
  trackInventory: true,
});

// Create variants
await bulkCreateVariants({
  productId: product.id,
  variants: [
    {
      name: "S / Blanco",
      size: "S",
      color: "Blanco",
      sku: "REM-BAS-001-S-WHT",
      stock: 15,
      // No price override - uses product base price
    },
    {
      name: "M / Blanco",
      size: "M",
      color: "Blanco",
      sku: "REM-BAS-001-M-WHT",
      price: 1300000, // $13,000 - price override
      stock: 25,
    },
  ],
});
```

---

## Best Practices

### SKU Naming Convention

Use a consistent format for variant SKUs:

```
{PRODUCT_SKU}-{SIZE}-{COLOR}[-{MATERIAL}]

Examples:
- TSHIRT-001-M-BLUE
- JEANS-042-32-DENIM
- SHOE-RUN-42-BLACK-LEATHER
```

### Inventory Management

1. **Track at variant level** when product has variants
2. **Set product stock to 0** when using variants (all stock is in variants)
3. **Low stock threshold** can be set per variant
4. **Out of stock**: Disable variant (`isActive = false`) rather than delete

### Performance Considerations

1. **Index on productId**: Essential for fetching variants quickly
2. **Index on SKU**: Important for admin searches
3. **Eager load images**: Use `with: { image: true }` when displaying variants
4. **Cache variant options**: Options (sizes, colors) change infrequently

### UI/UX Guidelines

1. **Show availability immediately**: Display stock status when variant is selected
2. **Disable unavailable options**: Grey out sizes/colors that are out of stock
3. **Price differences**: Clearly show if variant has different price
4. **Images per variant**: Show variant-specific image when selected
5. **Low stock alerts**: Show "¡Últimas unidades!" for low stock

---

## Migration from Non-Variant Products

If you have existing products without variants and want to add variants:

1. **Keep existing SKU/stock** on product as fallback
2. **Create variants gradually** - products work with or without variants
3. **Update UI to check variants first** - if no variants, use product directly
4. **Migrate inventory** - move stock from product to variants when variants are added

---

## Future Enhancements

- [ ] Variant images gallery (multiple images per variant)
- [ ] Variant-specific descriptions
- [ ] Variant groups (e.g., group by color, then show sizes)
- [ ] Dynamic pricing based on attribute combination
- [ ] Variant availability alerts (notify when back in stock)
- [ ] Bulk stock import/export via CSV
- [ ] Variant bundles (buy multiple variants at discount)

---

## Files Modified/Created

### Database
- ✅ `packages/db/src/schema/ecommerce.ts` - Added productVariant table and relations

### Validations
- ✅ `packages/validations/src/variants.ts` - Zod schemas for variants
- ✅ `packages/validations/src/index.ts` - Export variant validations

### Business Logic
- ✅ `packages/core/src/variants/index.ts` - Variant CRUD and business logic
- ✅ `packages/core/src/index.ts` - Export variant functions
- ✅ `packages/core/package.json` - Add variants export

### API Routes
- ✅ `apps/server/src/routes/variants.ts` - REST API endpoints
- ✅ `apps/server/src/index.ts` - Register variants route

### Scripts
- ✅ `packages/db/scripts/seed-variants.ts` - Seed script for sample variants

### Documentation
- ✅ `docs/product-variants-implementation.md` - This file

---

## Support

For questions or issues with product variants:

1. Check this documentation first
2. Review the validation schemas in `packages/validations/src/variants.ts`
3. Inspect business logic in `packages/core/src/variants/index.ts`
4. Test with seed data using `seed-variants.ts`
5. Check API responses with the provided examples

---

**Implementation completed**: December 2024  
**Last updated**: December 2024
