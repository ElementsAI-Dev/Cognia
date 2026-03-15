import type { MarketplacePlugin } from '@/components/plugin/marketplace/components/marketplace-types';
import type { ExtensionCatalogEntry } from '@/types/plugin';

type CatalogOperationState = {
  stage?: 'idle' | 'installing' | 'updating' | 'installed' | 'error';
  lastErrorCategory?: string;
  lastErrorMessage?: string;
};

export function toMarketplacePluginFromCatalogEntry(
  entry: ExtensionCatalogEntry,
  operationState?: CatalogOperationState,
): MarketplacePlugin {
  return {
    id: entry.id,
    name: entry.name,
    description: entry.description,
    author: {
      name: entry.author,
      verified: entry.registry.verified,
    },
    version: entry.version,
    latestVersion: entry.latestVersion,
    updateAvailable: entry.installed && entry.version !== entry.latestVersion,
    type: entry.descriptor?.entrypoints.pythonMain ? 'python' : 'frontend',
    capabilities: entry.capabilities,
    rating: entry.registry.rating,
    reviewCount: entry.registry.ratingCount,
    downloadCount: entry.registry.downloads,
    lastUpdated: entry.updatedAt.split('T')[0] || entry.updatedAt,
    tags: entry.registry.tags,
    featured: entry.registry.featured,
    verified: entry.registry.verified,
    trending: entry.registry.downloads > 10000,
    installed: entry.installed,
    enabled: entry.enabled,
    source: entry.source,
    operationStage: operationState?.stage || 'idle',
    operationErrorCategory: operationState?.lastErrorCategory,
    operationErrorMessage: operationState?.lastErrorMessage,
    compatibilityStatus: entry.compatibility.status,
    compatibilityDiagnostics: entry.compatibility.diagnostics,
    descriptor: entry.descriptor,
    repository: entry.repository,
    homepage: entry.homepage,
    license: entry.license,
  };
}
