import {
  PLUGIN_CAPABILITY_CONTRACTS,
  getPluginCapabilityContract,
} from './plugin-capabilities';

describe('plugin capability contracts', () => {
  it('covers each canonical plugin capability exactly once', () => {
    const ids = PLUGIN_CAPABILITY_CONTRACTS.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(
      expect.arrayContaining([
        'tools',
        'components',
        'modes',
        'skills',
        'themes',
        'commands',
        'hooks',
        'processors',
        'providers',
        'exporters',
        'importers',
        'a2ui',
        'python',
        'scheduler',
      ])
    );
  });

  it('exposes support level and runtime metadata for a capability', () => {
    expect(getPluginCapabilityContract('tools')).toEqual(
      expect.objectContaining({
        id: 'tools',
        support: 'supported',
        runtimeBinding: expect.any(String),
        docs: expect.any(String),
        requiredTests: expect.any(Array),
      })
    );
  });
});
