import {
  getActiveCredential,
  getBuiltInProviderReadiness,
  getCustomProviderReadiness,
  getProviderEnableEligibility,
  getVisibleSelectedProviderIds,
  hasAnyCredential,
} from './provider-readiness';

describe('provider-readiness helpers', () => {
  it('extracts active credential from primary apiKey first', () => {
    expect(getActiveCredential({ apiKey: '  sk-primary  ', apiKeys: ['sk-fallback'] })).toBe('sk-primary');
  });

  it('extracts active credential from indexed apiKey pool', () => {
    expect(
      getActiveCredential({
        apiKeys: ['sk-one', 'sk-two'],
        currentKeyIndex: 1,
      })
    ).toBe('sk-two');
  });

  it('detects credential presence across primary and pool keys', () => {
    expect(hasAnyCredential({ apiKey: 'sk-primary' })).toBe(true);
    expect(hasAnyCredential({ apiKeys: [' ', 'sk-two'] })).toBe(true);
    expect(hasAnyCredential({ apiKeys: [' ', ''] })).toBe(false);
    expect(hasAnyCredential(undefined)).toBe(false);
  });

  it('marks remote provider unconfigured without credential', () => {
    const state = getBuiltInProviderReadiness('openai', { enabled: false }, null);
    expect(state.readiness).toBe('unconfigured');
    expect(state.eligibility.enable.allowed).toBe(false);
    expect(state.eligibility.testConnection.allowed).toBe(false);
  });

  it('marks remote provider configured with credential and verified when test succeeds', () => {
    const configured = getBuiltInProviderReadiness('openai', { apiKey: 'sk-test', enabled: true }, null);
    const verified = getBuiltInProviderReadiness(
      'openai',
      { apiKey: 'sk-test', enabled: true },
      { success: true, message: 'ok' }
    );
    expect(configured.readiness).toBe('configured');
    expect(verified.readiness).toBe('verified');
  });

  it('allows local provider test without credential when base url is present', () => {
    const state = getBuiltInProviderReadiness(
      'ollama',
      { baseURL: 'http://localhost:11434', enabled: true },
      null
    );
    expect(state.readiness).toBe('configured');
    expect(state.eligibility.testConnection.allowed).toBe(true);
    expect(state.eligibility.enable.allowed).toBe(true);
  });

  it('blocks enabling when next state is enabled and requirements are missing', () => {
    const blocked = getProviderEnableEligibility('openai', { enabled: false }, true);
    const allowedDisable = getProviderEnableEligibility('openai', { enabled: true }, false);
    expect(blocked.allowed).toBe(false);
    expect(allowedDisable.allowed).toBe(true);
  });

  it('computes custom provider readiness and eligibility', () => {
    const unconfigured = getCustomProviderReadiness({ enabled: false, baseURL: '', apiKey: '' }, null);
    const verified = getCustomProviderReadiness(
      { enabled: true, baseURL: 'https://api.example.com/v1', apiKey: 'sk-custom' },
      { success: true }
    );
    expect(unconfigured.readiness).toBe('unconfigured');
    expect(unconfigured.eligibility.testConnection.allowed).toBe(false);
    expect(verified.readiness).toBe('verified');
    expect(verified.eligibility.enable.allowed).toBe(true);
  });

  it('returns visible and selected provider intersection preserving visible order', () => {
    const result = getVisibleSelectedProviderIds(
      ['openai', 'anthropic', 'google'],
      new Set(['google', 'openai', 'non-visible'])
    );
    expect(result).toEqual(['openai', 'google']);
  });
});
