/**
 * Client-side currency utilities
 * No Redis dependency - uses localStorage for caching
 */

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
// CONVERSION RATES (client-side fallback)
// ============================================================================

const FALLBACK_RATES: Record<CurrencyCode, number> = {
  ARS: 1.0,
  USD: 0.0011,
  EUR: 0.001,
  BRL: 0.0056,
};

// ============================================================================
// CURRENCY PREFERENCE
// ============================================================================

const CURRENCY_STORAGE_KEY = "bhvr-ecom:currency";

/**
 * Get user's preferred currency from localStorage
 */
export function getPreferredCurrency(): CurrencyCode {
  if (typeof window === "undefined") return DEFAULT_CURRENCY;
  
  try {
    const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (stored && stored in SUPPORTED_CURRENCIES) {
      return stored as CurrencyCode;
    }
  } catch {
    // Ignore localStorage errors
  }
  
  return DEFAULT_CURRENCY;
}

/**
 * Set user's preferred currency in localStorage
 */
export function setPreferredCurrency(currency: CurrencyCode): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
    // Dispatch event for components to react
    window.dispatchEvent(new CustomEvent("currency-changed", { detail: { currency } }));
  } catch {
    // Ignore localStorage errors
  }
}

// ============================================================================
// CURRENCY CONVERSION (client-side)
// ============================================================================

/**
 * Convert price from ARS centavos to target currency
 */
export function convertPrice(
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
 * Format price for display
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
  const convertedPrice = convertPrice(priceInCentavos, currency);

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
 * Format price with user's preferred currency
 */
export function formatPriceWithPreference(priceInCentavos: number): string {
  const currency = getPreferredCurrency();
  return formatPrice(priceInCentavos, currency);
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: CurrencyCode): string {
  return SUPPORTED_CURRENCIES[currency].symbol;
}

/**
 * Format price range
 */
export function formatPriceRange(
  minPrice: number,
  maxPrice: number,
  currency: CurrencyCode = DEFAULT_CURRENCY
): string {
  return `${formatPrice(minPrice, currency)} - ${formatPrice(maxPrice, currency)}`;
}

export type { FormatOptions };
