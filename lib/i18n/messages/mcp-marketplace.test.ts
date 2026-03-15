import enTools from './en/tools.json';
import zhCnTools from './zh-CN/tools.json';
import { MARKETPLACE_SORT_OPTIONS } from '@/types/mcp/mcp-marketplace';

describe('mcpMarketplace messages', () => {
  it.each(MARKETPLACE_SORT_OPTIONS)(
    'includes sort option "%s" in both English and Simplified Chinese locales',
    (option) => {
      expect(enTools.mcpMarketplace.sort).toHaveProperty(option);
      expect(zhCnTools.mcpMarketplace.sort).toHaveProperty(option);
    }
  );

  it('includes recent search label in both English and Simplified Chinese locales', () => {
    expect(enTools.mcpMarketplace).toHaveProperty('recentSearches');
    expect(zhCnTools.mcpMarketplace).toHaveProperty('recentSearches');
  });
});
