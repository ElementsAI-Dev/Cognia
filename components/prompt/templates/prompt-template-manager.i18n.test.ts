type PromptManagerMessages = {
  promptTemplate?: {
    manager?: Record<string, string>;
  };
};

const enPromptMessages = require('@/lib/i18n/messages/en/prompt.json') as PromptManagerMessages;
const zhPromptMessages = require('@/lib/i18n/messages/zh-CN/prompt.json') as PromptManagerMessages;

const REQUIRED_SORT_KEYS = ['sortRecent', 'sortUsage'] as const;

describe('PromptTemplateManager translations', () => {
  it.each([
    ['en', enPromptMessages],
    ['zh-CN', zhPromptMessages],
  ])('includes required sort labels for %s', (_locale, messages) => {
    const managerMessages = messages.promptTemplate?.manager;

    expect(managerMessages).toBeDefined();

    for (const key of REQUIRED_SORT_KEYS) {
      expect(managerMessages).toHaveProperty(key);
      expect(managerMessages?.[key]).toEqual(expect.any(String));
      expect(managerMessages?.[key]).not.toHaveLength(0);
    }
  });
});
