/**
 * Currency Package
 * 
 * Provides multi-currency support with conversion rates and formatting.
 * Base currency: ARS (Argentine Peso) - all prices stored in centavos
 */

import { cache } from "@bhvr-ecom/cache";

// ============================================================================
// SUPPORTED CURRENCIES
// ============================================================================

export const SUPPORTED_CURRENCIES = {
  ARS: { code: "ARS", symbol: "$", name: "Argentine Peso", decimals: 0 },
  USD: { code: "USD", symbol: "US$", name: "US Dollar", decimals: 2 },
  EUR: { code: "EUR", symbol: "€", name: "Euro", decimals: 2 },
  BRL: { code: "BRL", symbol: "R$", name: "Brazilian Real", decimals: 2 },
} as const;

export type CurrencyCode = keyof typeof SUPPORTED_CURRENCIES;

export const DEFAULT_CURRENCY: CurrencyCode = "ARS";

// ============================================================================
// CONVERSION RATES (relative to ARS)
// ============================================================================

/**
 * Exchange rates: 1 ARS = X currency
 * These would ideally come from an external API in production
 * For now, using approximate rates as of January 2026
 */
const FALLBACK_RATES: Record<CurrencyCode, number> = {
  ARS: 1.0, // Base currency
  USD: 0.0011, // ~900 ARS = 1 USD
  EUR: 0.001, // ~1000 ARS = 1 EUR
  BRL: 0.0056, // ~180 ARS = 1 BRL
};

// ============================================================================
// EXCHANGE RATE SERVICE
// ============================================================================

const RATES_CACHE_KEY = "currency:exchange-rates";
const RATES_TTL = 3600; // 1 hour

/**
 * Get current exchange rates (cached for 1 hour)
 */
export async function getExchangeRates(): Promise<Record<CurrencyCode, number>> {
  try {
    // Try to get from cache first
    const cached = await cache.get(RATES_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as Record<CurrencyCode, number>;
    }

    // In production, fetch from external API (e.g., exchangerate-api.com)
    // For now, use fallback rates
    const rates = FALLBACK_RATES;

    // Cache for 1 hour
    await cache.set(RATES_CACHE_KEY, JSON.stringify(rates), RATES_TTL);

    return rates;
  } catch (error) {
    console.error("Failed to get exchange rates, using fallback:", error);
    return FALLBACK_RATES;
  }
}

/**
 * Update exchange rates (admin function)
 * In production, this would be called by a cron job
 */
export async function updateExchangeRates(
  rates: Partial<Record<CurrencyCode, number>>
): Promise<void> {
  const currentRates = await getExchangeRates();
  const updatedRates = { ...currentRates, ...rates };
  
  // Always ensure ARS is 1.0
  updatedRates.ARS = 1.0;
  
  await cache.set(RATES_CACHE_KEY, JSON.stringify(updatedRates), RATES_TTL);
}

// ============================================================================
// CURRENCY CONVERSION
// ============================================================================

/**
 * Convert price from ARS (centavos) to target currency
 * @param priceInCentavos Price in centavos (e.g., 1500000 = $15,000 ARS)
 * @param targetCurrency Target currency code
 * @returns Converted price in target currency's base units
 */
export async function convertPrice(
  priceInCentavos: number,
  targetCurrency: CurrencyCode
): Promise<number> {
  if (targetCurrency === "ARS") {
    return priceInCentavos;
  }

  const rates = await getExchangeRates();
  const rate = rates[targetCurrency];

  // Convert centavos to ARS first, then to target currency
  const priceInARS = priceInCentavos / 100;
  return priceInARS * rate;
}

/**
 * Convert price synchronously using cached rates (for client-side)
 * Falls back to approximate rates if cache unavailable
 */
export function convertPriceSync(
  priceInCentavos: number,
  targetCurrency: CurrencyCode,
  rates: Record<CurrencyCode, number> = FALLBACK_RATES
): number {
  if (targetCurrency === "ARS") {
    return priceInCentavos;
  }

  const rate = rates[targetCurrency];
  const priceInARS = priceInCentavos / 100;
  return priceInARS * rate;
}

// ============================================================================
// CURRENCY FORMATTING
// ============================================================================

interface FormatOptions {
  locale?: string;
  showSymbol?: boolean;
  minimumFractionDigits?: number;
}

/**
 * Format price for display with proper currency symbol and decimals
 * @param priceInCentavos Price in ARS centavos
 * @param currency Target currency
 * @param options Formatting options
 */
export function formatPrice(
  priceInCentavos: number,
  currency: CurrencyCode = DEFAULT_CURRENCY,
  options: FormatOptions = {}
): string {
  const {
    locale = getLocaleForCurrency(currency),
    showSymbol = true,
    minimumFractionDigits,
  } = options;

  const currencyInfo = SUPPORTED_CURRENCIES[currency];
  const convertedPrice = convertPriceSync(priceInCentavos, currency);

  const formatted = new Intl.NumberFormat(locale, {
    style: showSymbol ? "currency" : "decimal",
    currency: currency,
    minimumFractionDigits: minimumFractionDigits ?? currencyInfo.decimals,
    maximumFractionDigits: currencyInfo.decimals,
  }).format(convertedPrice);

  return formatted;
}

/**
 * Get appropriate locale for currency
 */
function getLocaleForCurrency(currency: CurrencyCode): string {
  const localeMap: Record<CurrencyCode, string> = {
    ARS: "es-AR",
    USD: "en-US",
    EUR: "de-DE",
    BRL: "pt-BR",
  };
  return localeMap[currency];
}

/**
 * Format price range (e.g., "$10 - $20")
 */
export function formatPriceRange(
  minPrice: number,
  maxPrice: number,
  currency: CurrencyCode = DEFAULT_CURRENCY
): string {
  return `${formatPrice(minPrice, currency)} - ${formatPrice(maxPrice, currency)}`;
}

/**
 * Get currency symbol only
 */
export function getCurrencySymbol(currency: CurrencyCode): string {
  return SUPPORTED_CURRENCIES[currency].symbol;
}

/**
 * Parse formatted price string back to centavos
 * Useful for form inputs
 */
export function parsePrice(
  formattedPrice: string,
  currency: CurrencyCode = DEFAULT_CURRENCY
): number {
  // Remove currency symbols and spaces
  const cleaned = formattedPrice.replace(/[^0-9.,]/g, "");
  
  // Handle different decimal separators
  const normalized = cleaned.replace(",", ".");
  const value = parseFloat(normalized);

  if (isNaN(value)) {
    return 0;
  }

  // Convert to centavos based on currency
  const currencyInfo = SUPPORTED_CURRENCIES[currency];
  return Math.round(value * Math.pow(10, currencyInfo.decimals));
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { FormatOptions };
