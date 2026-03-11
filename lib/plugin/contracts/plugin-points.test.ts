import {
  CANONICAL_ACTIVATION_PATTERNS,
  CANONICAL_EXTENSION_POINTS,
  CANONICAL_HOOK_POINTS,
  PLUGIN_POINT_CONTRACTS,
  getExtensionPointAliases,
  resolveActivationPattern,
  validateActivationEvent,
  validateExtensionPoint,
  validateHookPoint,
} from './plugin-points';

describe('plugin point contracts', () => {
  it('has unique canonical extension points', () => {
    expect(new Set(CANONICAL_EXTENSION_POINTS).size).toBe(CANONICAL_EXTENSION_POINTS.length);
  });

  it('has unique canonical hook points', () => {
    expect(new Set(CANONICAL_HOOK_POINTS).size).toBe(CANONICAL_HOOK_POINTS.length);
  });

  it('has unique canonical activation patterns', () => {
    expect(new Set(CANONICAL_ACTIVATION_PATTERNS).size).toBe(CANONICAL_ACTIVATION_PATTERNS.length);
  });

  it('enforces migration metadata for deprecated contracts', () => {
    const deprecated = PLUGIN_POINT_CONTRACTS.filter((entry) => entry.status === 'deprecated');
    expect(deprecated.length).toBeGreaterThan(0);
    for (const entry of deprecated) {
      expect(entry.deprecatedIn).toBeDefined();
      expect(entry.replacementId).toBeDefined();
    }
  });

  it('maps extension aliases to canonical IDs', () => {
    const aliases = getExtensionPointAliases();
    expect(aliases['sidebar:top']).toBe('sidebar.left.top');
    expect(aliases['chat:input']).toBe('chat.input.actions');
  });

  it('validates known extension points', () => {
    const result = validateExtensionPoint('chat.header', {
      governanceMode: 'block',
      hasPermission: () => true,
    });

    expect(result.allowed).toBe(true);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('supports alias extension points with warning diagnostics', () => {
    const result = validateExtensionPoint('sidebar:top', {
      governanceMode: 'warn',
      hasPermission: () => true,
    });

    expect(result.allowed).toBe(true);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'plugin.point.alias',
          canonicalId: 'sidebar.left.top',
        }),
      ])
    );
  });

  it('rejects unknown extension points in block mode', () => {
    const result = validateExtensionPoint('unknown-point', { governanceMode: 'block' });
    expect(result.allowed).toBe(false);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'plugin.point.unknown', severity: 'error' }),
      ])
    );
  });

  it('validates known hooks', () => {
    const result = validateHookPoint('onAgentStep', { governanceMode: 'block' });
    expect(result.allowed).toBe(true);
  });

  it('rejects unknown hooks in block mode', () => {
    const result = validateHookPoint('onMadeUpHook', { governanceMode: 'block' });
    expect(result.allowed).toBe(false);
    expect(result.diagnostics[0]).toEqual(
      expect.objectContaining({ code: 'plugin.point.unknown', severity: 'error' })
    );
  });

  it('resolves activation patterns for dynamic events', () => {
    expect(resolveActivationPattern('onCommand:abc')).toBe('onCommand:*');
    expect(resolveActivationPattern('onTool:test')).toBe('onTool:*');
    expect(resolveActivationPattern('onLanguage:typescript')).toBe('onLanguage:*');
  });

  it('warns for deprecated activation alias', () => {
    const result = validateActivationEvent('onStartup', { governanceMode: 'warn' });
    expect(result.allowed).toBe(true);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'plugin.point.deprecated' }),
      ])
    );
  });

  it('blocks virtual activation events in block mode', () => {
    const result = validateActivationEvent('onLanguage:typescript', { governanceMode: 'block' });
    expect(result.allowed).toBe(false);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'plugin.point.virtual', severity: 'error' }),
      ])
    );
  });
});
