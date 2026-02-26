# Multi-Currency Support Implementation

## Overview

Complete multi-currency support for the bhvr-ecom platform, allowing customers to view prices in their preferred currency (ARS, USD, EUR, BRL). Prices are stored in ARS centavos and converted in real-time with proper formatting for each currency.

## Architecture

### Currency Package

**Location:** `packages/currency/`

**Purpose:** Centralized currency conversion, formatting, and preference management

**Key Features:**
- Exchange rate management with Redis caching
- Client-side and server-side utilities
- localStorage-based user preferences
- Reactive currency changes across the app

### Supported Currencies

| Currency | Code | Symbol | Decimals | Locale |
|----------|------|--------|----------|--------|
| Argentine Peso | ARS | $ | 0 | es-AR |
| US Dollar | USD | US$ | 2 | en-US |
| Euro | EUR | € | 2 | de-DE |
| Brazilian Real | BRL | R$ | 2 | pt-BR |

**Base Currency:** ARS (all prices stored in centavos)

## Implementation Details

### Package Structure

```
packages/currency/
├── src/
│   ├── index.ts         # Server-side utilities (with Redis)
│   └── client.ts        # Client-side utilities (localStorage)
├── package.json
└── tsconfig.json
```

### Exchange Rates

**Storage:** Redis cache (TTL: 1 hour)
**Fallback:** Hardcoded rates when cache unavailable

```typescript
const FALLBACK_RATES: Record<CurrencyCode, number> = {
  ARS: 1.0,       // Base currency
  USD: 0.0011,    // ~900 ARS = 1 USD
  EUR: 0.001,     // ~1000 ARS = 1 EUR
  BRL: 0.0056,    // ~180 ARS = 1 BRL
};
```

**Production Note:** In production, these rates should be fetched from an external API (e.g., exchangerate-api.com, fixer.io) and updated via cron job.

### Client-Side Usage

#### React Hook

**File:** [`apps/web/src/lib/use-currency.ts`](../apps/web/src/lib/use-currency.ts)

```typescript
import { useCurrency } from "@/lib/use-currency";

function ProductCard({ product }) {
  const { currency, setCurrency, formatPrice, currencies } = useCurrency();

  return (
    <div>
      <h3>{product.name}</h3>
      <p>{formatPrice(product.price)}</p>
    </div>
  );
}
```

**Hook API:**
- `currency` - Current currency code (CurrencyCode)
- `setCurrency` - Change user's preferred currency
- `formatPrice` - Format price in current currency
- `currencies` - Object of all supported currencies

#### Currency Selector Component

**File:** [`apps/web/src/components/currency-selector.tsx`](../apps/web/src/components/currency-selector.tsx)

Dropdown component for currency selection, integrated into the app header.

```tsx
import { CurrencySelector } from "@/components/currency-selector";

<CurrencySelector />
```

### Server-Side Usage

```typescript
import { formatPrice, convertPrice, getExchangeRates } from "@bhvr-ecom/currency";

// Format price for display
const formattedPrice = formatPrice(1500000, "USD");
// Returns: "US$16.50"

// Convert price
const priceInUSD = await convertPrice(1500000, "USD");
// Returns: 16.5

// Get current rates
const rates = await getExchangeRates();
// Returns: { ARS: 1.0, USD: 0.0011, EUR: 0.001, BRL: 0.0056 }
```

### API Functions

#### Client-Side (`@bhvr-ecom/currency/client`)

```typescript
// Preference management
getPreferredCurrency(): CurrencyCode
setPreferredCurrency(currency: CurrencyCode): void

// Conversion
convertPrice(priceInCentavos: number, targetCurrency: CurrencyCode): number

// Formatting
formatPrice(priceInCentavos: number, currency?: CurrencyCode, options?: FormatOptions): string
formatPriceWithPreference(priceInCentavos: number): string
formatPriceRange(minPrice: number, maxPrice: number, currency?: CurrencyCode): string
getCurrencySymbol(currency: CurrencyCode): string
```

#### Server-Side (`@bhvr-ecom/currency`)

```typescript
// Exchange rates
getExchangeRates(): Promise<Record<CurrencyCode, number>>
updateExchangeRates(rates: Partial<Record<CurrencyCode, number>>): Promise<void>

// Conversion
convertPrice(priceInCentavos: number, targetCurrency: CurrencyCode): Promise<number>
convertPriceSync(priceInCentavos: number, targetCurrency: CurrencyCode, rates?: Record<CurrencyCode, number>): number

// Formatting (same as client-side)
formatPrice(priceInCentavos: number, currency?: CurrencyCode, options?: FormatOptions): string
```

## Integration Points

### Updated Components

All price displays updated to use `useCurrency()` hook:

1. **Product Listing** ([`apps/web/src/routes/(shop)/products/index.tsx`](../apps/web/src/routes/(shop)/products/index.tsx))
2. **Product Detail** ([`apps/web/src/routes/(shop)/products/$slug.tsx`](../apps/web/src/routes/(shop)/products/$slug.tsx))
3. **Shopping Cart** ([`apps/web/src/routes/(shop)/cart.tsx`](../apps/web/src/routes/(shop)/cart.tsx))
4. **Inventory Management** ([`apps/web/src/routes/(authenticated)/dashboard/admin/inventory.tsx`](../apps/web/src/routes/(authenticated)/dashboard/admin/inventory.tsx))
5. **Analytics Dashboard** ([`apps/web/src/components/analytics-dashboard.tsx`](../apps/web/src/components/analytics-dashboard.tsx))

### Header Integration

**File:** [`apps/web/src/components/header.tsx`](../apps/web/src/components/header.tsx)

Currency selector added to header navigation bar, accessible from all pages.

## User Experience

### Currency Selection

1. **Default:** ARS (Argentine Peso)
2. **Persistence:** User preference saved to `localStorage`
3. **Sync:** Changes propagate across all tabs via `storage` event
4. **Reactivity:** All prices update instantly when currency changes

### Display Format

Each currency uses appropriate formatting:

```typescript
// ARS: No decimals, Argentine locale
formatPrice(1500000, "ARS") // "$15,000"

// USD: 2 decimals, US locale
formatPrice(1500000, "USD") // "US$16.50"

// EUR: 2 decimals, German locale
formatPrice(1500000, "EUR") // "€15,00"

// BRL: 2 decimals, Brazilian locale
formatPrice(1500000, "BRL") // "R$84,00"
```

## Database Considerations

**Price Storage:** All prices remain in ARS centavos in the database
- No schema changes required
- Single source of truth
- Conversion happens at display time

**Benefits:**
- ✅ No data migration needed
- ✅ Consistent pricing across currency changes
- ✅ Easy to update exchange rates
- ✅ Audit trail preserved (all orders in base currency)

## Production Deployment

### Exchange Rate Updates

**Recommended Setup:**

1. **External API:** Use exchangerate-api.com or similar service
2. **Cron Job:** Update rates every hour
3. **Fallback:** Hardcoded rates if API fails

**Example Cron Setup:**

```typescript
// apps/server/src/jobs/update-exchange-rates.ts
import { updateExchangeRates } from "@bhvr-ecom/currency";

export async function updateRatesJob() {
  try {
    const response = await fetch("https://api.exchangerate-api.com/v4/latest/ARS");
    const data = await response.json();
    
    await updateExchangeRates({
      USD: data.rates.USD,
      EUR: data.rates.EUR,
      BRL: data.rates.BRL,
    });
    
    console.log("Exchange rates updated successfully");
  } catch (error) {
    console.error("Failed to update exchange rates:", error);
  }
}

// Schedule to run every hour
setInterval(updateRatesJob, 3600000);
```

### Environment Configuration

**No additional environment variables required!**

The system works out-of-the-box with fallback rates.

## Testing

### Manual Testing

```bash
# Start development server
make dev

# Navigate to any product page
# Open browser at http://localhost:3001/products

# 1. Check default currency (ARS)
# 2. Change currency via selector in header
# 3. Verify prices update instantly
# 4. Check localStorage for preference
# 5. Refresh page - currency should persist
# 6. Open new tab - currency should match
```

### Testing Exchange Rates

```typescript
// In browser console or tests
import { useCurrency } from "@/lib/use-currency";

// Check current currency
const { currency } = useCurrency();
console.log(currency); // "ARS" (default)

// Change currency
const { setCurrency } = useCurrency();
setCurrency("USD");

// Format test prices
const { formatPrice } = useCurrency();
console.log(formatPrice(1500000)); // "$16.50"
console.log(formatPrice(1000000)); // "$11.00"
```

## Performance

### Caching Strategy

- **Exchange Rates:** Cached in Redis for 1 hour
- **User Preference:** Stored in localStorage (instant access)
- **Conversion:** Computed on-demand (negligible overhead)

### Bundle Size

- **Client Package:** ~2KB gzipped
- **Zero runtime dependencies** (uses native `Intl.NumberFormat`)

## Migration from Hardcoded ARS

All previous hardcoded price formatting:

```typescript
// ❌ Old way
const formatPrice = (priceInCents: number) => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(priceInCents / 100);
};
```

Replaced with:

```typescript
// ✅ New way
import { useCurrency } from "@/lib/use-currency";

const { formatPrice } = useCurrency();
// Automatically uses user's preferred currency
```

## Future Enhancements

### Phase 4 Additions

- [ ] **Admin Rate Override:** Allow admins to manually set exchange rates
- [ ] **Currency-Specific Pricing:** Store different prices per currency (if needed for VAT/tax differences)
- [ ] **Historical Rates:** Track rate changes for financial reporting
- [ ] **Multi-Currency Orders:** Display order history in original currency
- [ ] **Automatic Rate Updates:** Cron job integration with external API
- [ ] **Currency Conversion Widget:** Show "This product costs X in your currency"

## Troubleshooting

### Currency Not Persisting

**Symptom:** Currency resets to ARS on page reload

**Fix:** Check localStorage is available:
```typescript
// Browser console
localStorage.getItem("bhvr-ecom:currency") // Should return currency code
```

### Prices Not Updating

**Symptom:** Prices stay in ARS after changing currency

**Fix:**
1. Verify `useCurrency()` hook is used (not manual `formatPrice`)
2. Check browser console for errors
3. Clear localStorage and try again

### Wrong Conversion Rate

**Symptom:** Prices seem incorrect in non-ARS currencies

**Fix:**
1. Rates are approximate - update `FALLBACK_RATES` if needed
2. For production, integrate external rate API
3. Check Redis cache: `redis-cli GET currency:exchange-rates`

## Related Documentation

- [Database Schema](./database-schema.md) - Price storage in centavos
- [Frontend Structure](./frontend-structure.md) - Component patterns
- [System Overview](./system-overview.md) - Architecture

---

**Implementation Date:** January 16, 2026  
**Phase:** Phase 3 - Scale  
**Status:** ✅ Complete
