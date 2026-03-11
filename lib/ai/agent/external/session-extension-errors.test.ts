import {
  createExternalAgentUnsupportedSessionExtensionError,
  getExternalAgentUnsupportedSessionExtensionMethod,
  isExternalAgentSessionExtensionUnsupportedForMethod,
  isExternalAgentUnsupportedSessionExtensionError,
  isExternalAgentMethodNotFoundError,
  isExternalAgentSessionExtensionUnsupportedError,
} from './session-extension-errors';

describe('isExternalAgentMethodNotFoundError', () => {
  it.each([
    new Error('-32601: Method not found'),
    new Error('method not found: session/list'),
    '-32601 method not found',
  ])('returns true for method-not-found payloads: %p', (error) => {
    expect(isExternalAgentMethodNotFoundError(error)).toBe(true);
  });

  it.each([
    new Error('network unavailable'),
    'permission denied',
    null,
    undefined,
  ])('returns false for non method-not-found payloads: %p', (error) => {
    expect(isExternalAgentMethodNotFoundError(error)).toBe(false);
  });
});

describe('isExternalAgentSessionExtensionUnsupportedError', () => {
  it('returns true for typed unsupported session extension errors', () => {
    const error = createExternalAgentUnsupportedSessionExtensionError('session/fork');

    expect(isExternalAgentUnsupportedSessionExtensionError(error)).toBe(true);
    expect(isExternalAgentUnsupportedSessionExtensionError(error, 'session/fork')).toBe(true);
    expect(isExternalAgentUnsupportedSessionExtensionError(error, 'session/list')).toBe(false);
    expect(isExternalAgentSessionExtensionUnsupportedError(error)).toBe(true);
    expect(error.message).toBe('Agent does not support session forking');
    expect(error.code).toBe('extension_unsupported');
  });

  it.each([
    new Error('Agent does not support session listing'),
    new Error('Agent does not support session forking'),
    new Error('Agent does not support session resume'),
    'Session/resume is not supported on this endpoint',
    'RPC error -32601: method not found for session/fork',
    'session/list unsupported',
  ])('returns true for unsupported session extension errors: %p', (error) => {
    expect(isExternalAgentSessionExtensionUnsupportedError(error)).toBe(true);
  });

  it.each([
    new Error('network unavailable'),
    new Error('timeout while reading response'),
    'permission denied',
    null,
    undefined,
    {},
  ])('returns false for non-session-extension failures: %p', (error) => {
    expect(isExternalAgentSessionExtensionUnsupportedError(error)).toBe(false);
  });

  it.each([
    [new Error('Agent does not support session listing'), 'session/list'],
    [new Error('RPC error -32601: method not found for session/fork'), 'session/fork'],
    [new Error('session/resume unsupported'), 'session/resume'],
  ] as const)(
    'extracts unsupported method from payload %p',
    (error, expectedMethod) => {
      expect(getExternalAgentUnsupportedSessionExtensionMethod(error)).toBe(expectedMethod);
      expect(isExternalAgentSessionExtensionUnsupportedForMethod(error, expectedMethod)).toBe(
        true
      );
    }
  );

  it('supports method-specific typed error checks', () => {
    const typed = createExternalAgentUnsupportedSessionExtensionError('session/fork');

    expect(isExternalAgentSessionExtensionUnsupportedForMethod(typed, 'session/fork')).toBe(true);
    expect(isExternalAgentSessionExtensionUnsupportedForMethod(typed, 'session/list')).toBe(false);
  });
});
