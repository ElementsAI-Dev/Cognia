import {
  buildProviderVerificationFingerprint,
  evaluateBuiltInProviderCompleteness,
  evaluateCustomProviderCompleteness,
  evaluateRuntimeEligibility,
  getActiveCredential,
  getProviderRequirements,
  hasAnyCredential,
  isValidHttpUrl,
} from './completeness';

describe('provider completeness contract', () => {
  it('resolves active credential from primary and pool keys', () => {
    expect(getActiveCredential({ apiKey: '  sk-primary  ', apiKeys: ['sk-fallback'] })).toBe('sk-primary');
    expect(getActiveCredential({ apiKeys: ['sk-one', 'sk-two'], currentKeyIndex: 1 })).toBe('sk-two');
  });

  it('detects credentials from either apiKey or apiKeys', () => {
    expect(hasAnyCredential({ apiKey: 'sk-primary' })).toBe(true);
    expect(hasAnyCredential({ apiKeys: [' ', 'sk-two'] })).toBe(true);
    expect(hasAnyCredential({ apiKeys: [' ', ''] })).toBe(false);
  });

  it('validates HTTP(S) URLs only', () => {
    expect(isValidHttpUrl('https://api.example.com/v1')).toBe(true);
    expect(isValidHttpUrl('http://localhost:11434')).toBe(true);
    expect(isValidHttpUrl('ftp://example.com')).toBe(false);
    expect(isValidHttpUrl('invalid-url')).toBe(false);
  });

  it('returns provider requirements from registry metadata', () => {
    const openai = getProviderRequirements('openai');
    const ollama = getProviderRequirements('ollama');
    expect(openai.requiresCredential).toBe(true);
    expect(ollama.requiresCredential).toBe(false);
    expect(ollama.requiresBaseUrl).toBe(true);
    expect(ollama.isLocal).toBe(true);
  });

  it('computes built-in provider completeness for remote providers', () => {
    const unconfigured = evaluateBuiltInProviderCompleteness('openai', { enabled: false }, null);
    const configured = evaluateBuiltInProviderCompleteness('openai', {
      apiKey: 'sk-test',
      enabled: true,
      defaultModel: 'gpt-4o',
    }, null);
    const verified = evaluateBuiltInProviderCompleteness('openai', {
      apiKey: 'sk-test',
      enabled: true,
      defaultModel: 'gpt-4o',
    }, { success: true });

    expect(unconfigured.readiness).toBe('unconfigured');
    expect(unconfigured.verificationStatus).toBe('unverified');
    expect(unconfigured.eligibility.enable.allowed).toBe(false);
    expect(unconfigured.eligibility.runtime.code).toBe('provider_disabled');
    expect(configured.readiness).toBe('configured');
    expect(configured.setupChecklist.nextAction).toBe('verify_connection');
    expect(verified.readiness).toBe('verified');
    expect(verified.verificationStatus).toBe('verified');
  });

  it('marks persisted verified state as stale after configuration fingerprint changes', () => {
    const baselineFingerprint = buildProviderVerificationFingerprint({
      apiKey: 'sk-original',
      baseURL: '',
      defaultModel: 'gpt-4o',
    });

    const stale = evaluateBuiltInProviderCompleteness('openai', {
      apiKey: 'sk-updated',
      enabled: true,
      defaultModel: 'gpt-4o',
      verificationStatus: 'verified',
      verificationFingerprint: baselineFingerprint,
    }, null);

    expect(stale.readiness).toBe('configured');
    expect(stale.verificationStatus).toBe('stale');
    expect(stale.setupChecklist.nextAction).toBe('verify_connection');
  });

  it('treats runtime-limited latest checks as unverified instead of verified', () => {
    const limited = evaluateBuiltInProviderCompleteness('anthropic', {
      apiKey: 'sk-ant-test',
      enabled: true,
      defaultModel: 'claude-sonnet-4-20250514',
    }, {
      success: false,
      authoritative: false,
      outcome: 'limited',
    });

    expect(limited.readiness).toBe('configured');
    expect(limited.verificationStatus).toBe('unverified');
  });

  it('includes the connectivity contract version in verification fingerprints', () => {
    const fingerprint = buildProviderVerificationFingerprint({
      apiKey: 'sk-test',
      baseURL: '',
      defaultModel: 'gpt-4o',
    });

    expect(JSON.parse(fingerprint)).toEqual(
      expect.objectContaining({
        verificationContract: 'provider-connectivity-v2',
      })
    );
  });

  it('allows keyless local providers with valid base URL', () => {
    const local = evaluateBuiltInProviderCompleteness('ollama', {
      baseURL: 'http://localhost:11434',
      enabled: true,
      defaultModel: 'llama3.2',
    }, null);

    expect(local.readiness).toBe('configured');
    expect(local.eligibility.enable.allowed).toBe(true);
    expect(local.eligibility.runtime.allowed).toBe(true);
    expect(local.eligibility.testConnection.allowed).toBe(true);
  });

  it('blocks runtime eligibility with deterministic reasons', () => {
    const blockedDisabled = evaluateRuntimeEligibility('openai', {
      apiKey: 'sk-test',
      enabled: false,
    });
    const blockedCredential = evaluateRuntimeEligibility('openai', {
      enabled: true,
    });

    expect(blockedDisabled.allowed).toBe(false);
    expect(blockedDisabled.code).toBe('provider_disabled');
    expect(blockedCredential.allowed).toBe(false);
    expect(blockedCredential.code).toBe('missing_credential');
  });

  it('computes custom provider completeness including invalid URL', () => {
    const invalid = evaluateCustomProviderCompleteness({
      apiKey: 'sk-custom',
      baseURL: 'not-a-url',
      enabled: true,
    }, null);
    const verified = evaluateCustomProviderCompleteness({
      apiKey: 'sk-custom',
      baseURL: 'https://api.example.com/v1',
      defaultModel: 'custom-model',
      enabled: true,
    }, { success: true });

    expect(invalid.eligibility.testConnection.allowed).toBe(false);
    expect(invalid.eligibility.testConnection.code).toBe('invalid_base_url');
    expect(verified.readiness).toBe('verified');
    expect(verified.verificationStatus).toBe('verified');
    expect(verified.setupChecklist.isComplete).toBe(true);
    expect(verified.eligibility.runtime.allowed).toBe(true);
  });
});
