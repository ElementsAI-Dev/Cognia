import type { Plugin } from '@/types/plugin';
import type { PluginRegistryEntry } from './marketplace';
import { buildExtensionCatalogEntry } from './catalog-entry';

function createRegistryEntry(overrides: Partial<PluginRegistryEntry> = {}): PluginRegistryEntry {
  return {
    id: 'example-plugin',
    name: 'Example Plugin',
    description: 'Example registry entry',
    author: 'Cognia',
    version: '1.0.0',
    latestVersion: '1.2.0',
    downloads: 10,
    rating: 4.5,
    ratingCount: 2,
    tags: ['productivity'],
    categories: ['tools'],
    manifest: {
      id: 'example-plugin',
      name: 'Example Plugin',
      version: '1.0.0',
      description: 'Example plugin',
      type: 'frontend',
      capabilities: ['tools'],
      main: 'dist/index.js',
    },
    publishedAt: new Date('2026-03-01T00:00:00.000Z'),
    updatedAt: new Date('2026-03-02T00:00:00.000Z'),
    verified: true,
    featured: false,
    ...overrides,
  };
}

function createInstalledPlugin(): Plugin {
  return {
    manifest: {
      id: 'example-plugin',
      name: 'Example Plugin',
      version: '1.1.0',
      description: 'Installed plugin',
      type: 'frontend',
      capabilities: ['tools'],
      main: 'dist/index.js',
    },
    status: 'enabled',
    source: 'dev',
    path: '/plugins/example-plugin',
    config: {},
    descriptor: {
      id: 'example-plugin',
      version: '1.1.0',
      source: 'dev',
      resolvedPath: '/plugins/example-plugin',
      installRoot: {
        kind: 'dev',
        path: '/plugins',
      },
      entrypoints: {
        main: 'dist/index.js',
      },
      declaredCapabilities: ['tools'],
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
      availableOperations: ['enable', 'disable', 'configure', 'reload', 'uninstall'],
    },
  };
}

describe('buildExtensionCatalogEntry', () => {
  it('builds a marketplace-backed catalog entry for uninstalled extensions', () => {
    const entry = buildExtensionCatalogEntry({
      registryEntry: createRegistryEntry(),
    });

    expect(entry.id).toBe('example-plugin');
    expect(entry.installed).toBe(false);
    expect(entry.source).toBe('marketplace');
    expect(entry.latestVersion).toBe('1.2.0');
  });

  it('overlays installed descriptor state onto a registry entry', () => {
    const entry = buildExtensionCatalogEntry({
      registryEntry: createRegistryEntry(),
      installedPlugin: createInstalledPlugin(),
    });

    expect(entry.installed).toBe(true);
    expect(entry.enabled).toBe(true);
    expect(entry.source).toBe('dev');
    expect(entry.descriptor).toEqual(
      expect.objectContaining({
        installRoot: expect.objectContaining({ kind: 'dev' }),
      })
    );
    expect(entry.compatibility.status).toBe('warning');
    expect(entry.availableOperations).toEqual(
      expect.arrayContaining(['reload', 'uninstall'])
    );
  });
});
