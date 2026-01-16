import { useState, useEffect } from "react";
import {
  type CurrencyCode,
  getPreferredCurrency,
  setPreferredCurrency as setStoredCurrency,
  formatPrice as formatPriceUtil,
  SUPPORTED_CURRENCIES,
} from "@bhvr-ecom/currency/client";

/**
 * React hook for currency management
 * Provides currency state and formatting utilities
 */
export function useCurrency() {
  const [currency, setCurrency] = useState<CurrencyCode>(() => getPreferredCurrency());

  // Listen for currency changes from other components/tabs
  useEffect(() => {
    const handleCurrencyChange = (event: CustomEvent<{ currency: CurrencyCode }>) => {
      setCurrency(event.detail.currency);
    };

    window.addEventListener("currency-changed", handleCurrencyChange as EventListener);

    return () => {
      window.removeEventListener("currency-changed", handleCurrencyChange as EventListener);
    };
  }, []);

  const changeCurrency = (newCurrency: CurrencyCode) => {
    setStoredCurrency(newCurrency);
    setCurrency(newCurrency);
  };

  const formatPrice = (priceInCentavos: number) => {
    return formatPriceUtil(priceInCentavos, currency);
  };

  return {
    currency,
    setCurrency: changeCurrency,
    formatPrice,
    currencies: SUPPORTED_CURRENCIES,
  };
}
