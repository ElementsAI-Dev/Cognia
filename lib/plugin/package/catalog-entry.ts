import type { ExtensionCatalogEntry, Plugin } from '@/types/plugin';
import type { PluginRegistryEntry } from './marketplace';

interface BuildExtensionCatalogEntryOptions {
  registryEntry: PluginRegistryEntry;
  installedPlugin?: Plugin;
}

export function buildExtensionCatalogEntry({
  registryEntry,
  installedPlugin,
}: BuildExtensionCatalogEntryOptions): ExtensionCatalogEntry {
  const descriptor = installedPlugin?.descriptor;

  return {
    id: registryEntry.id,
    name: registryEntry.name,
    description: registryEntry.description,
    author: registryEntry.author,
    capabilities: installedPlugin?.descriptor?.declaredCapabilities || registryEntry.manifest.capabilities,
    version: installedPlugin?.manifest.version || registryEntry.version,
    latestVersion: registryEntry.latestVersion,
    updatedAt: registryEntry.updatedAt.toISOString(),
    installed: Boolean(installedPlugin),
    enabled: installedPlugin?.status === 'enabled',
    source: installedPlugin?.source || 'marketplace',
    descriptor,
    repository: registryEntry.repository,
    homepage: registryEntry.homepage,
    license: registryEntry.manifest.license,
    compatibility: descriptor?.compatibility || {
      status: 'compatible',
      diagnostics: [],
    },
    availableOperations: descriptor?.availableOperations || ['install'],
    registry: {
      verified: registryEntry.verified,
      featured: registryEntry.featured,
      downloads: registryEntry.downloads,
      rating: registryEntry.rating,
      ratingCount: registryEntry.ratingCount,
      tags: [...registryEntry.tags],
      categories: [...registryEntry.categories],
    },
  };
}
