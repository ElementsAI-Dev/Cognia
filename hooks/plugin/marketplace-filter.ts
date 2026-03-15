import type {
  CategoryFilter,
  MarketplacePlugin,
  QuickFilter,
  SortOption,
} from '@/components/plugin/marketplace/components/marketplace-types';
import type {
  DiscoveryCompatibilityFilter,
  DiscoverySourceFilter,
} from '@/stores/plugin/plugin-marketplace-store';

interface FilterMarketplacePluginsOptions {
  query: string;
  categoryFilter: CategoryFilter;
  quickFilter: QuickFilter;
  sortBy: SortOption;
  sourceFilter: DiscoverySourceFilter;
  compatibilityFilter: DiscoveryCompatibilityFilter;
}

export function filterMarketplacePlugins(
  plugins: MarketplacePlugin[],
  options: FilterMarketplacePluginsOptions,
): MarketplacePlugin[] {
  const {
    query,
    categoryFilter,
    quickFilter,
    sortBy,
    sourceFilter,
    compatibilityFilter,
  } = options;

  let result = [...plugins];

  if (query) {
    const lowered = query.toLowerCase();
    result = result.filter(
      (plugin) =>
        plugin.name.toLowerCase().includes(lowered) ||
        plugin.description.toLowerCase().includes(lowered) ||
        plugin.tags.some((tag) => tag.toLowerCase().includes(lowered)),
    );
  }

  if (categoryFilter !== 'all') {
    result = result.filter((plugin) => plugin.capabilities.includes(categoryFilter));
  }

  if (sourceFilter !== 'all') {
    result = result.filter((plugin) => plugin.source === sourceFilter);
  }

  if (compatibilityFilter !== 'all') {
    result = result.filter((plugin) => plugin.compatibilityStatus === compatibilityFilter);
  }

  switch (quickFilter) {
    case 'verified':
      result = result.filter((plugin) => plugin.verified);
      break;
    case 'free':
      result = result.filter((plugin) => !plugin.price || plugin.price === 0);
      break;
    case 'new': {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      result = result.filter((plugin) => new Date(plugin.lastUpdated) >= weekAgo);
      break;
    }
    case 'popular':
      result = result.filter((plugin) => plugin.downloadCount > 20000);
      break;
  }

  switch (sortBy) {
    case 'popular':
    case 'downloads':
      result.sort((a, b) => b.downloadCount - a.downloadCount);
      break;
    case 'rating':
      result.sort((a, b) => b.rating - a.rating);
      break;
    case 'recent':
      result.sort(
        (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime(),
      );
      break;
  }

  return result;
}
