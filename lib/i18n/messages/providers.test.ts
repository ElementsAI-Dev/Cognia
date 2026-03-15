import enAi from './en/ai.json';
import zhCnAi from './zh-CN/ai.json';

describe('providers messages', () => {
  it.each([
    'error',
    'modelSettings',
    'contextLength',
    'maxOutputTokens',
    'inputPricing',
    'outputPricing',
  ])('includes "%s" in both English and Simplified Chinese locales', (key) => {
    expect(enAi.providers).toHaveProperty(key);
    expect(zhCnAi.providers).toHaveProperty(key);
  });
});
