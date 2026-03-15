import type { MarketplacePlugin } from '@/components/plugin/marketplace/components/marketplace-types';
import { filterMarketplacePlugins } from './marketplace-filter';

const plugins: MarketplacePlugin[] = [
  {
    id: 'market-plugin',
    name: 'Market Plugin',
    description: 'Remote plugin',
    author: { name: 'Cognia' },
    version: '1.0.0',
    latestVersion: '1.0.0',
    type: 'frontend',
    capabilities: ['tools'],
    rating: 4.8,
    reviewCount: 5,
    downloadCount: 100,
    lastUpdated: '2026-03-14',
    tags: ['utility'],
    source: 'marketplace',
    compatibilityStatus: 'compatible',
  },
  {
    id: 'dev-plugin',
    name: 'Dev Plugin',
    description: 'Dev plugin',
    author: { name: 'Cognia' },
    version: '1.0.0',
    latestVersion: '1.1.0',
    type: 'frontend',
    capabilities: ['tools'],
    rating: 4.2,
    reviewCount: 3,
    downloadCount: 50,
    lastUpdated: '2026-03-13',
    tags: ['dev'],
    installed: true,
    source: 'dev',
    compatibilityStatus: 'warning',
  },
];

describe('filterMarketplacePlugins', () => {
  it('filters by source', () => {
    const result = filterMarketplacePlugins(plugins, {
      query: '',
      categoryFilter: 'all',
      quickFilter: 'all',
      sortBy: 'popular',
      sourceFilter: 'dev',
      compatibilityFilter: 'all',
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('dev-plugin');
  });

  it('filters by compatibility status', () => {
    const result = filterMarketplacePlugins(plugins, {
      query: '',
      categoryFilter: 'all',
      quickFilter: 'all',
      sortBy: 'popular',
      sourceFilter: 'all',
      compatibilityFilter: 'warning',
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('dev-plugin');
  });
});
