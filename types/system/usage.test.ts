/**
 * @jest-environment jsdom
 */
import {
  CURRENCIES,
  LOCALE_CURRENCY_MAP,
  MODEL_PRICING,
  MODEL_PRICING_CNY,
  getCurrencyForLocale,
  convertCurrency,
  formatCostInCurrency,
  formatCost,
  formatModelPricing,
  updateExchangeRate,
  calculateCost,
  calculateCostFromTokens,
  getModelPricingUSD,
  formatTokens,
  normalizeTokenUsage,
  type CurrencyCode,
} from './usage';

describe('Currency Configuration', () => {
  it('defines USD and CNY currencies', () => {
    expect(CURRENCIES.USD).toBeDefined();
    expect(CURRENCIES.CNY).toBeDefined();
    expect(CURRENCIES.USD.symbol).toBe('$');
    expect(CURRENCIES.CNY.symbol).toBe('¥');
    expect(CURRENCIES.USD.rateFromUSD).toBe(1);
    expect(CURRENCIES.CNY.rateFromUSD).toBeGreaterThan(1);
  });

  it('has correct free labels per locale', () => {
    expect(CURRENCIES.USD.freeLabel).toBe('Free');
    expect(CURRENCIES.CNY.freeLabel).toBe('免费');
  });

  it('maps locales to currencies', () => {
    expect(LOCALE_CURRENCY_MAP['en']).toBe('USD');
    expect(LOCALE_CURRENCY_MAP['zh-CN']).toBe('CNY');
  });
});

describe('getCurrencyForLocale', () => {
  it('returns USD for English', () => {
    expect(getCurrencyForLocale('en')).toBe('USD');
  });

  it('returns CNY for Chinese', () => {
    expect(getCurrencyForLocale('zh-CN')).toBe('CNY');
  });

  it('defaults to USD for unknown locales', () => {
    expect(getCurrencyForLocale('fr')).toBe('USD');
    expect(getCurrencyForLocale('ja')).toBe('USD');
    expect(getCurrencyForLocale('')).toBe('USD');
  });
});

describe('convertCurrency', () => {
  it('converts USD to USD (identity)', () => {
    expect(convertCurrency(10, 'USD')).toBe(10);
  });

  it('converts USD to CNY', () => {
    const result = convertCurrency(10, 'CNY');
    expect(result).toBe(10 * CURRENCIES.CNY.rateFromUSD);
    expect(result).toBeGreaterThan(10);
  });

  it('handles zero', () => {
    expect(convertCurrency(0, 'CNY')).toBe(0);
  });

  it('handles very small amounts', () => {
    const result = convertCurrency(0.001, 'CNY');
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1);
  });
});

describe('formatCostInCurrency', () => {
  it('formats zero as Free in USD', () => {
    expect(formatCostInCurrency(0, 'USD')).toBe('Free');
  });

  it('formats zero as 免费 in CNY', () => {
    expect(formatCostInCurrency(0, 'CNY')).toBe('免费');
  });

  it('formats USD with $ prefix', () => {
    expect(formatCostInCurrency(1.5, 'USD')).toBe('$1.50');
  });

  it('formats CNY with ¥ prefix and conversion', () => {
    const result = formatCostInCurrency(1, 'CNY');
    expect(result).toMatch(/^¥\d+\.\d{2}$/);
    const numericValue = parseFloat(result.replace('¥', ''));
    expect(numericValue).toBe(CURRENCIES.CNY.rateFromUSD);
  });

  it('handles very small amounts with < prefix', () => {
    const result = formatCostInCurrency(0.001, 'USD');
    expect(result).toBe('<$0.01');
  });

  it('defaults to USD when no currency specified', () => {
    expect(formatCostInCurrency(5)).toBe('$5.00');
  });
});

describe('formatCost (backward-compatible)', () => {
  it('formats in USD', () => {
    expect(formatCost(0)).toBe('Free');
    expect(formatCost(1.5)).toBe('$1.50');
    expect(formatCost(0.001)).toBe('<$0.01');
  });
});

describe('formatModelPricing', () => {
  it('returns null for unknown model', () => {
    expect(formatModelPricing('nonexistent-model')).toBeNull();
  });

  it('formats GPT-4o pricing in USD', () => {
    const result = formatModelPricing('gpt-4o', 'USD');
    expect(result).not.toBeNull();
    expect(result!.input).toBe('$2.50');
    expect(result!.output).toBe('$10.00');
  });

  it('formats GPT-4o pricing in CNY', () => {
    const result = formatModelPricing('gpt-4o', 'CNY');
    expect(result).not.toBeNull();
    expect(result!.input).toMatch(/^¥/);
    expect(result!.output).toMatch(/^¥/);
    const inputValue = parseFloat(result!.input.replace('¥', ''));
    expect(inputValue).toBeCloseTo(2.5 * CURRENCIES.CNY.rateFromUSD, 1);
  });

  it('shows Free/免费 for zero-cost models', () => {
    const usdResult = formatModelPricing('gemini-2.0-flash-exp', 'USD');
    expect(usdResult).not.toBeNull();
    expect(usdResult!.input).toBe('Free');
    expect(usdResult!.output).toBe('Free');

    const cnyResult = formatModelPricing('gemini-2.0-flash-exp', 'CNY');
    expect(cnyResult).not.toBeNull();
    expect(cnyResult!.input).toBe('免费');
    expect(cnyResult!.output).toBe('免费');
  });
});

describe('updateExchangeRate', () => {
  const originalRate = CURRENCIES.CNY.rateFromUSD;

  afterEach(() => {
    CURRENCIES.CNY.rateFromUSD = originalRate;
  });

  it('updates the exchange rate', () => {
    updateExchangeRate('CNY', 8.0);
    expect(CURRENCIES.CNY.rateFromUSD).toBe(8.0);
    expect(convertCurrency(1, 'CNY')).toBe(8.0);
  });

  it('ignores unknown currencies', () => {
    updateExchangeRate('EUR' as CurrencyCode, 0.9);
    expect(CURRENCIES.USD.rateFromUSD).toBe(1);
    expect(CURRENCIES.CNY.rateFromUSD).toBe(originalRate);
  });
});

describe('MODEL_PRICING', () => {
  it('has pricing for major models', () => {
    expect(MODEL_PRICING['gpt-4o']).toBeDefined();
    expect(MODEL_PRICING['claude-3-5-sonnet-20241022']).toBeDefined();
    expect(MODEL_PRICING['gemini-2.5-pro']).toBeDefined();
    expect(MODEL_PRICING['deepseek-chat']).toBeDefined();
  });

  it('all prices are non-negative numbers', () => {
    for (const [model, pricing] of Object.entries(MODEL_PRICING)) {
      expect(pricing.input).toBeGreaterThanOrEqual(0);
      expect(pricing.output).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('MODEL_PRICING_CNY', () => {
  it('has pricing for Chinese providers', () => {
    expect(MODEL_PRICING_CNY['deepseek-chat']).toBeDefined();
    expect(MODEL_PRICING_CNY['qwen-max']).toBeDefined();
    expect(MODEL_PRICING_CNY['glm-4-plus']).toBeDefined();
    expect(MODEL_PRICING_CNY['moonshot-v1-8k']).toBeDefined();
    // 2026 new models
    expect(MODEL_PRICING_CNY['deepseek-v3.2']).toBeDefined();
    expect(MODEL_PRICING_CNY['glm-4.7']).toBeDefined();
    expect(MODEL_PRICING_CNY['kimi-k2.5']).toBeDefined();
    expect(MODEL_PRICING_CNY['qwen3-235b-a22b']).toBeDefined();
    expect(MODEL_PRICING_CNY['minimax-m2']).toBeDefined();
    expect(MODEL_PRICING_CNY['step3']).toBeDefined();
    expect(MODEL_PRICING_CNY['ernie-4.5-300b']).toBeDefined();
    expect(MODEL_PRICING_CNY['hunyuan-a13b']).toBeDefined();
  });

  it('all CNY prices are non-negative', () => {
    for (const [model, pricing] of Object.entries(MODEL_PRICING_CNY)) {
      expect(pricing.input).toBeGreaterThanOrEqual(0);
      expect(pricing.output).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('getModelPricingUSD', () => {
  it('returns USD pricing for USD-priced models', () => {
    const pricing = getModelPricingUSD('gpt-4o');
    expect(pricing).not.toBeNull();
    expect(pricing!.input).toBe(2.5);
    expect(pricing!.output).toBe(10);
  });

  it('returns converted USD pricing for CNY-only models', () => {
    const pricing = getModelPricingUSD('qwen-max');
    expect(pricing).not.toBeNull();
    // qwen-max CNY: input=20, output=60
    const rate = CURRENCIES.CNY.rateFromUSD;
    expect(pricing!.input).toBeCloseTo(20 / rate, 4);
    expect(pricing!.output).toBeCloseTo(60 / rate, 4);
  });

  it('prefers USD pricing over CNY for dual-listed models', () => {
    // deepseek-chat is in both MODEL_PRICING and MODEL_PRICING_CNY
    const pricing = getModelPricingUSD('deepseek-chat');
    expect(pricing).not.toBeNull();
    // Should use the USD pricing directly
    expect(pricing!.input).toBe(MODEL_PRICING['deepseek-chat'].input);
    expect(pricing!.output).toBe(MODEL_PRICING['deepseek-chat'].output);
  });

  it('returns null for unknown model', () => {
    expect(getModelPricingUSD('totally-unknown-model-xyz')).toBeNull();
  });

  it('returns pricing for various CNY-only providers', () => {
    // GLM
    expect(getModelPricingUSD('glm-4-plus')).not.toBeNull();
    // Moonshot
    expect(getModelPricingUSD('moonshot-v1-8k')).not.toBeNull();
    // MiniMax
    expect(getModelPricingUSD('minimax-m2')).not.toBeNull();
    // Baidu ERNIE
    expect(getModelPricingUSD('ernie-4.5-300b')).not.toBeNull();
    // Tencent Hunyuan
    expect(getModelPricingUSD('hunyuan-a13b')).not.toBeNull();
  });
});

describe('calculateCost', () => {
  it('calculates cost correctly for known model', () => {
    const cost = calculateCost('gpt-4o', { prompt: 1000, completion: 500, total: 1500 });
    const expected = (1000 / 1_000_000) * 2.5 + (500 / 1_000_000) * 10;
    expect(cost).toBeCloseTo(expected, 6);
  });

  it('returns 0 for unknown model', () => {
    expect(calculateCost('unknown', { prompt: 100, completion: 50, total: 150 })).toBe(0);
  });

  it('calculates cost for CNY-only models via USD conversion', () => {
    const cost = calculateCost('qwen-max', { prompt: 1_000_000, completion: 1_000_000, total: 2_000_000 });
    expect(cost).toBeGreaterThan(0);
    // qwen-max CNY: input=20, output=60 per 1M tokens
    const rate = CURRENCIES.CNY.rateFromUSD;
    const expected = 20 / rate + 60 / rate;
    expect(cost).toBeCloseTo(expected, 4);
  });

  it('calculates cost for free CNY models as 0', () => {
    const cost = calculateCost('hunyuan-mt-7b', { prompt: 1_000_000, completion: 1_000_000, total: 2_000_000 });
    expect(cost).toBe(0);
  });
});

describe('calculateCostFromTokens', () => {
  it('calculates from raw token counts', () => {
    const cost = calculateCostFromTokens('gpt-4o', 1000, 500);
    expect(cost).toBeGreaterThan(0);
  });

  it('calculates from CNY-only model token counts', () => {
    const cost = calculateCostFromTokens('glm-4-plus', 1_000_000, 500_000);
    expect(cost).toBeGreaterThan(0);
    // glm-4-plus CNY: input=50, output=50 per 1M tokens
    const rate = CURRENCIES.CNY.rateFromUSD;
    const expected = (1_000_000 / 1_000_000) * (50 / rate) + (500_000 / 1_000_000) * (50 / rate);
    expect(cost).toBeCloseTo(expected, 4);
  });

  it('returns 0 for unknown model', () => {
    expect(calculateCostFromTokens('unknown-model', 1000, 500)).toBe(0);
  });
});

describe('formatTokens', () => {
  it('formats millions', () => {
    expect(formatTokens(1_500_000)).toBe('1.50M');
  });

  it('formats thousands', () => {
    expect(formatTokens(8_500)).toBe('8.5K');
  });

  it('formats small numbers as-is', () => {
    expect(formatTokens(42)).toBe('42');
  });
});

describe('normalizeTokenUsage', () => {
  it('normalizes full usage object', () => {
    const result = normalizeTokenUsage({ prompt: 100, completion: 50, total: 150 });
    expect(result.prompt).toBe(100);
    expect(result.completion).toBe(50);
    expect(result.total).toBe(150);
  });

  it('normalizes partial usage', () => {
    const result = normalizeTokenUsage({ total: 200 } as never);
    expect(result.total).toBe(200);
  });
});
