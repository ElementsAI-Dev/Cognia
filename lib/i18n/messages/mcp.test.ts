import enTools from './en/tools.json';
import zhCnTools from './zh-CN/tools.json';

describe('mcp messages', () => {
  it.each([
    'noLogs',
    'noLogsDescription',
    'noMatchingLogs',
    'noMatchingLogsDescription',
  ])('includes "%s" in both English and Simplified Chinese locales', (key) => {
    expect(enTools.mcp).toHaveProperty(key);
    expect(zhCnTools.mcp).toHaveProperty(key);
  });
});
