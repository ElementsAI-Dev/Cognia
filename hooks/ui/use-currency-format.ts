'use client';

/**
 * useCurrencyFormat - Locale-aware currency formatting hook
 *
 * Automatically switches currency based on the user's language setting.
 * Supports USD and CNY with configurable exchange rates.
 */

import { useMemo } from 'react';
import { useSettingsStore } from '@/stores';
import {
  getCurrencyForLocale,
  CURRENCIES,
  convertCurrency,
  formatCostInCurrency,
  formatModelPricing,
  type CurrencyCode,
  type CurrencyConfig,
} from '@/types/system/usage';

export interface CurrencyFormatter {
  /** Current currency code */
  currency: CurrencyCode;
  /** Current currency config */
  config: CurrencyConfig;
  /** Format a USD cost amount in the user's locale currency */
  formatCost: (costUSD: number) => string;
  /** Format a price value (per 1M tokens) in the user's locale currency */
  formatPrice: (priceUSD: number) => string;
  /** Format model pricing by model ID */
  formatModelPrice: (modelId: string) => { input: string; output: string } | null;
  /** Convert a USD amount to user's locale currency */
  convert: (amountUSD: number) => number;
  /** Currency symbol */
  symbol: string;
  /** "Free" label in user's locale */
  freeLabel: string;
}

/**
 * Hook that provides locale-aware currency formatting
 * based on the user's language setting in the settings store.
 */
export function useCurrencyFormat(): CurrencyFormatter {
  const language = useSettingsStore((s) => s.language);

  return useMemo(() => {
    const currency = getCurrencyForLocale(language);
    const config = CURRENCIES[currency];

    return {
      currency,
      config,
      symbol: config.symbol,
      freeLabel: config.freeLabel,

      formatCost: (costUSD: number) => formatCostInCurrency(costUSD, currency),

      formatPrice: (priceUSD: number) => {
        if (priceUSD === 0) return config.freeLabel;
        const converted = convertCurrency(priceUSD, currency);
        const formatted = converted < 0.01
          ? converted.toFixed(4)
          : converted.toFixed(config.decimals);
        return `${config.symbol}${formatted}`;
      },

      formatModelPrice: (modelId: string) => formatModelPricing(modelId, currency),

      convert: (amountUSD: number) => convertCurrency(amountUSD, currency),
    };
  }, [language]);
}
