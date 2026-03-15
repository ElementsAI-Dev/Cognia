import enTools from './en/tools.json';
import zhCnTools from './zh-CN/tools.json';

describe('mcpSettings messages', () => {
  it.each(['health', 'serverLogs'])(
    'includes "%s" in both English and Simplified Chinese locales',
    (key) => {
      expect(enTools.mcpSettings).toHaveProperty(key);
      expect(zhCnTools.mcpSettings).toHaveProperty(key);
    }
  );
});
