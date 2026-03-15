import type { ExtensionCatalogEntry } from '@/types/plugin';
import { toMarketplacePluginFromCatalogEntry } from './marketplace-catalog';

function createCatalogEntry(overrides: Partial<ExtensionCatalogEntry> = {}): ExtensionCatalogEntry {
  return {
    id: 'plugin-a',
    name: 'Plugin A',
    description: 'Plugin A description',
    author: 'Cognia',
    capabilities: ['tools'],
    version: '1.0.0',
    latestVersion: '1.2.0',
    updatedAt: '2026-03-14T00:00:00.000Z',
    installed: false,
    enabled: false,
    source: 'marketplace',
    compatibility: {
      status: 'compatible',
      diagnostics: [],
    },
    availableOperations: ['install'],
    registry: {
      verified: true,
      featured: false,
      downloads: 120,
      rating: 4.6,
      ratingCount: 12,
      tags: ['utility'],
      categories: ['tools'],
    },
    ...overrides,
  };
}

describe('toMarketplacePluginFromCatalogEntry', () => {
  it('maps an uninstalled catalog entry into marketplace plugin state', () => {
    const plugin = toMarketplacePluginFromCatalogEntry(createCatalogEntry());

    expect(plugin.id).toBe('plugin-a');
    expect(plugin.installed).toBe(false);
    expect(plugin.source).toBe('marketplace');
    expect(plugin.latestVersion).toBe('1.2.0');
    expect(plugin.compatibilityStatus).toBe('compatible');
  });

  it('preserves installed source and compatibility diagnostics', () => {
    const plugin = toMarketplacePluginFromCatalogEntry(
      createCatalogEntry({
        installed: true,
        enabled: true,
        source: 'dev',
        version: '1.1.0',
        compatibility: {
          status: 'warning',
          diagnostics: [
            {
              code: 'compat.cognia_engine_missing',
              severity: 'warning',
              message: 'Missing host compatibility declaration',
            },
          ],
        },
      }),
      {
        stage: 'updating',
        lastErrorCategory: undefined,
        lastErrorMessage: undefined,
      },
    );

    expect(plugin.installed).toBe(true);
    expect(plugin.source).toBe('dev');
    expect(plugin.operationStage).toBe('updating');
    expect(plugin.compatibilityStatus).toBe('warning');
    expect(plugin.compatibilityDiagnostics).toHaveLength(1);
    expect(plugin.updateAvailable).toBe(true);
  });
});
