import {
  BUILT_IN_PROVIDER_IDS,
  getBuiltInProviderCatalogEntry,
  getBuiltInProviderCodingPackage,
  isBuiltInProviderId,
} from './built-in-provider-catalog';

describe('built-in-provider-catalog', () => {
  it('includes zhipu and minimax in built-in provider ids', () => {
    expect(BUILT_IN_PROVIDER_IDS).toContain('zhipu');
    expect(BUILT_IN_PROVIDER_IDS).toContain('minimax');
    expect(BUILT_IN_PROVIDER_IDS).not.toContain('auto');
  });

  it('returns canonical catalog metadata for zhipu', () => {
    const entry = getBuiltInProviderCatalogEntry('zhipu');

    expect(entry).toBeDefined();
    expect(entry?.defaultBaseURL).toBe('https://open.bigmodel.cn/api/paas/v4');
    expect(entry?.protocol).toBe('openai');
    expect(entry?.defaultModel).toBe('glm-4-flash');
  });

  it('returns canonical catalog metadata for minimax', () => {
    const entry = getBuiltInProviderCatalogEntry('minimax');

    expect(entry).toBeDefined();
    expect(entry?.defaultBaseURL).toBe('https://api.minimax.chat/v1');
    expect(entry?.protocol).toBe('openai');
    expect(entry?.defaultModel).toBe('abab6.5s-chat');
  });

  it('exposes coding packages for zhipu and minimax', () => {
    expect(getBuiltInProviderCodingPackage('zhipu')).toEqual(
      expect.objectContaining({
        id: 'coding',
        defaultModel: 'glm-4.6',
      })
    );
    expect(getBuiltInProviderCodingPackage('minimax')).toEqual(
      expect.objectContaining({
        id: 'coding',
        defaultModel: 'minimax-m2',
      })
    );
  });

  it('recognizes built-in provider ids through the shared catalog', () => {
    expect(isBuiltInProviderId('zhipu')).toBe(true);
    expect(isBuiltInProviderId('minimax')).toBe(true);
    expect(isBuiltInProviderId('custom-provider')).toBe(false);
  });
});
