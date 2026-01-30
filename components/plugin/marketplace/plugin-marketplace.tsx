'use client';

/**
 * Plugin Marketplace - Discover and install plugins from the marketplace
 * Refactored with extracted sub-components for better maintainability
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Search,
  TrendingUp,
  Filter,
  Grid3X3,
  List,
  ChevronRight,
  Layers,
  Award,
  X,
  ChevronDown,
  Command,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { usePluginStore } from '@/stores/plugin';
import { useMarketplace } from '@/hooks/plugin';
import { cn } from '@/lib/utils';

// Import extracted components
import {
  type MarketplacePlugin,
  type ViewMode,
  type SortOption,
  type CategoryFilter,
  type QuickFilter,
  CATEGORY_INFO,
  QUICK_FILTERS,
  PLUGIN_COLLECTIONS,
  MarketplaceStatsBar,
  CollectionCard,
  FeaturedPluginCard,
  PluginGridCard,
  PluginListItem,
  MarketplaceEmptyState,
  MarketplaceLoadingSkeleton,
  TrendingPluginItem,
} from './components';

// =============================================================================
// Types
// =============================================================================

interface PluginMarketplaceProps {
  className?: string;
  onInstall?: (pluginId: string) => Promise<void>;
  onViewDetails?: (plugin: MarketplacePlugin) => void;
}

// =============================================================================
// Main Component
// =============================================================================

export function PluginMarketplace({
  className,
  onInstall,
  onViewDetails,
}: PluginMarketplaceProps) {
  const t = useTranslations('pluginMarketplace');
  const { plugins: pluginsById } = usePluginStore();
  const { plugins: marketplacePlugins, featuredPlugins, trendingPlugins, isLoading, isUsingMockData: _isUsingMockData } = useMarketplace();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const _installedPluginIds = useMemo(() => new Set(Object.keys(pluginsById)), [pluginsById]);

  // Keyboard shortcut for search focus (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('marketplace-search');
        searchInput?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // featuredPlugins and trendingPlugins are now provided by useMarketplace hook
  void _isUsingMockData; // Available for debugging

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setCategoryFilter('all');
    setQuickFilter('all');
  }, []);

  const filteredPlugins = useMemo(() => {
    let result = [...marketplacePlugins];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter((p) => p.capabilities.includes(categoryFilter));
    }

    // Quick filter
    switch (quickFilter) {
      case 'verified':
        result = result.filter((p) => p.verified);
        break;
      case 'free':
        result = result.filter((p) => !p.price || p.price === 0);
        break;
      case 'new':
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        result = result.filter((p) => new Date(p.lastUpdated) >= weekAgo);
        break;
      case 'popular':
        result = result.filter((p) => p.downloadCount > 20000);
        break;
    }

    // Sort
    switch (sortBy) {
      case 'popular':
        result.sort((a, b) => b.downloadCount - a.downloadCount);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'recent':
        result.sort(
          (a, b) =>
            new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
        );
        break;
      case 'downloads':
        result.sort((a, b) => b.downloadCount - a.downloadCount);
        break;
    }

    return result;
  }, [marketplacePlugins, searchQuery, categoryFilter, quickFilter, sortBy]);

  const hasActiveFilters = searchQuery || categoryFilter !== 'all' || quickFilter !== 'all';

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Hero Section with Stats */}
      <div className="p-4 sm:p-6 border-b bg-muted/30">
        <div className="space-y-4">
          {/* Stats Bar */}
          <MarketplaceStatsBar />
          
          {/* Featured Section - Horizontal scroll on mobile */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                <h2 className="text-base sm:text-lg font-semibold">{t('featured.title')}</h2>
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {featuredPlugins.length} featured
              </span>
            </div>
            <ScrollArea className="w-full lg:hidden">
              <div className="flex gap-3 pb-2">
                {featuredPlugins.slice(0, 4).map((plugin) => (
                  <div key={plugin.id} className="w-[280px] shrink-0">
                    <FeaturedPluginCard
                      plugin={plugin}
                      onInstall={onInstall}
                      onViewDetails={onViewDetails}
                    />
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
            <div className="hidden lg:grid gap-4 grid-cols-2 xl:grid-cols-3">
              {featuredPlugins.slice(0, 3).map((plugin) => (
                <FeaturedPluginCard
                  key={plugin.id}
                  plugin={plugin}
                  onInstall={onInstall}
                  onViewDetails={onViewDetails}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Collections Section */}
      <div className="p-4 sm:px-6 border-b bg-muted/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-purple-500" />
            <h3 className="font-semibold text-sm sm:text-base">Collections</h3>
          </div>
          <Button variant="ghost" size="sm" className="text-xs">
            View All
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-2">
            {PLUGIN_COLLECTIONS.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Trending Section */}
      <div className="p-4 sm:px-6 border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <h3 className="font-semibold text-sm sm:text-base">{t('trending.title')}</h3>
          </div>
          <Button variant="ghost" size="sm" className="text-xs">
            {t('trending.viewAll')}
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-2">
            {trendingPlugins.map((plugin) => (
              <TrendingPluginItem
                key={plugin.id}
                plugin={plugin}
                onClick={() => onViewDetails?.(plugin)}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Browse All Section */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Quick Filters */}
        <div className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b overflow-x-auto scrollbar-hide">
          {QUICK_FILTERS.map((filter) => {
            const Icon = filter.icon;
            const isActive = quickFilter === filter.id;
            return (
              <Button
                key={filter.id}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'h-8 text-xs gap-1.5 shrink-0 transition-all',
                  isActive && 'shadow-sm'
                )}
                onClick={() => setQuickFilter(filter.id)}
              >
                <Icon className="h-3.5 w-3.5" />
                {filter.label}
              </Button>
            );
          })}
        </div>

        {/* Search and Filters - Desktop */}
        <div className="hidden sm:flex flex-wrap items-center gap-2 sm:gap-3 p-3 sm:p-4 sm:px-6 border-b bg-muted/30">
          <div className="relative flex-1 min-w-[180px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="marketplace-search"
              placeholder={t('search.placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-16 h-9"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground">
              <Command className="h-3 w-3" />
              <span>K</span>
            </div>
          </div>

          <Select
            value={categoryFilter}
            onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}
          >
            <SelectTrigger className="h-9 w-[130px] sm:w-[140px]">
              <Filter className="h-3.5 w-3.5 mr-1.5 sm:mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(CATEGORY_INFO) as CategoryFilter[]).slice(0, 8).map((cat) => {
                const info = CATEGORY_INFO[cat];
                const Icon = info.icon;
                return (
                  <SelectItem key={cat} value={cat}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{info.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="h-9 w-[110px] sm:w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">{t('sort.popular')}</SelectItem>
              <SelectItem value="rating">{t('sort.rating')}</SelectItem>
              <SelectItem value="recent">{t('sort.recent')}</SelectItem>
              <SelectItem value="downloads">{t('sort.downloads')}</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center border rounded-lg h-9 ml-auto bg-background">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-r-none h-full px-2.5"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-l-none h-full px-2.5"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search and Filters - Mobile */}
        <div className="sm:hidden p-3 border-b bg-muted/30 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('search.placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          
          <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <div className="flex items-center gap-2">
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 flex-1">
                  <Filter className="h-3.5 w-3.5" />
                  Filters
                  {hasActiveFilters && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                  <ChevronDown className={cn('h-3.5 w-3.5 ml-auto transition-transform', isFiltersOpen && 'rotate-180')} />
                </Button>
              </CollapsibleTrigger>
              
              <div className="flex items-center border rounded-lg h-8 bg-background">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="rounded-r-none h-full px-2"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="rounded-l-none h-full px-2"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            
            <CollapsibleContent className="pt-2 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={categoryFilter}
                  onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CATEGORY_INFO) as CategoryFilter[]).slice(0, 8).map((cat) => {
                      const info = CATEGORY_INFO[cat];
                      return (
                        <SelectItem key={cat} value={cat}>
                          {info.label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">{t('sort.popular')}</SelectItem>
                    <SelectItem value="rating">{t('sort.rating')}</SelectItem>
                    <SelectItem value="recent">{t('sort.recent')}</SelectItem>
                    <SelectItem value="downloads">{t('sort.downloads')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-7 text-xs"
                  onClick={clearFilters}
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear all filters
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Results - Enhanced grid with better spacing */}
        <ScrollArea className="flex-1 p-4 sm:p-6">
          {isLoading ? (
            <MarketplaceLoadingSkeleton viewMode={viewMode} />
          ) : filteredPlugins.length === 0 ? (
            <MarketplaceEmptyState searchQuery={searchQuery} onClear={clearFilters} />
          ) : viewMode === 'grid' ? (
            <div className="grid gap-4 grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {filteredPlugins.map((plugin, index) => (
                <div 
                  key={plugin.id}
                  className="animate-in fade-in-0 slide-in-from-bottom-2"
                  style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'backwards' }}
                >
                  <PluginGridCard
                    plugin={plugin}
                    onInstall={onInstall}
                    onViewDetails={onViewDetails}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPlugins.map((plugin, index) => (
                <div 
                  key={plugin.id}
                  className="animate-in fade-in-0 slide-in-from-left-2"
                  style={{ animationDelay: `${index * 20}ms`, animationFillMode: 'backwards' }}
                >
                  <PluginListItem
                    plugin={plugin}
                    onInstall={onInstall}
                    onViewDetails={onViewDetails}
                  />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Results count */}
        <div className="px-4 sm:px-6 py-2 border-t text-xs text-muted-foreground flex items-center justify-between">
          <span className="font-medium">{t('results.count', { count: filteredPlugins.length })}</span>
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2 text-xs hover:bg-background" 
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Re-export types for external use
export type { MarketplacePlugin };

export default PluginMarketplace;
