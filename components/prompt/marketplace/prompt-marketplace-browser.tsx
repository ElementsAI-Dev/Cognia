'use client';

/**
 * PromptMarketplaceBrowser - Main marketplace browsing component
 * Modern design with improved responsive layout, better space utilization, and enhanced UX
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTranslations } from 'next-intl';
import {
  Search,
  Grid3X3,
  List,
  RefreshCw,
  Download,
  TrendingUp,
  Sparkles,
  Package,
  Heart,
  History,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type {
  MarketplacePrompt,
  MarketplaceCategory,
  MarketplaceSearchFilters,
} from '@/types/content/prompt-marketplace';
import { usePromptMarketplaceStore } from '@/stores/prompt/prompt-marketplace-store';
import { PromptMarketplaceCard } from './prompt-marketplace-card';
import { PromptMarketplaceSidebar } from './prompt-marketplace-sidebar';
import { PromptMarketplaceDetail } from './prompt-marketplace-detail';

type ViewMode = 'grid' | 'list';
type TabValue = 'browse' | 'installed' | 'favorites' | 'recent';

interface PromptMarketplaceBrowserProps {
  defaultTab?: TabValue;
  onInstall?: (prompt: MarketplacePrompt) => void;
}

export function PromptMarketplaceBrowser({
  defaultTab = 'browse',
  onInstall,
}: PromptMarketplaceBrowserProps) {
  const t = useTranslations('promptMarketplace');

  // Store state
  const prompts = usePromptMarketplaceStore(useShallow((state) => Object.values(state.prompts)));
  const featuredIds = usePromptMarketplaceStore((state) => state.featuredIds);
  const trendingIds = usePromptMarketplaceStore((state) => state.trendingIds);
  const isLoading = usePromptMarketplaceStore((state) => state.isLoading);
  const installedPrompts = usePromptMarketplaceStore((state) => state.userActivity.installed);
  const favoriteIds = usePromptMarketplaceStore((state) => state.userActivity.favorites);
  const recentlyViewed = usePromptMarketplaceStore(
    useShallow((state) => state.getRecentlyViewed())
  );
  const searchPrompts = usePromptMarketplaceStore((state) => state.searchPrompts);
  const fetchFeatured = usePromptMarketplaceStore((state) => state.fetchFeatured);
  const fetchTrending = usePromptMarketplaceStore((state) => state.fetchTrending);
  const initializeSampleData = usePromptMarketplaceStore((state) => state.initializeSampleData);
  const getPromptById = usePromptMarketplaceStore((state) => state.getPromptById);

  // Local state
  const [activeTab, setActiveTab] = useState<TabValue>(defaultTab);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedCategory, setSelectedCategory] = useState<MarketplaceCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<MarketplaceSearchFilters['sortBy']>('downloads');
  const [minRating, setMinRating] = useState(0);
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<MarketplacePrompt | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<MarketplacePrompt[]>([]);

  // Initialize sample data if empty
  useEffect(() => {
    if (prompts.length === 0) {
      initializeSampleData();
    }
  }, [prompts.length, initializeSampleData]);

  // Fetch featured and trending on mount
  useEffect(() => {
    fetchFeatured();
    fetchTrending();
  }, [fetchFeatured, fetchTrending]);

  // Search effect
  useEffect(() => {
    const filters: MarketplaceSearchFilters = {
      query: searchQuery,
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      sortBy,
      minRating: minRating > 0 ? minRating : undefined,
      qualityTier:
        selectedTiers.length > 0
          ? (selectedTiers as MarketplaceSearchFilters['qualityTier'])
          : undefined,
    };

    searchPrompts(filters).then((result) => {
      setSearchResults(result.prompts);
    });
  }, [searchQuery, selectedCategory, sortBy, minRating, selectedTiers, searchPrompts]);

  // Computed lists
  const featuredPrompts = useMemo(
    () => featuredIds.map((id) => getPromptById(id)).filter(Boolean) as MarketplacePrompt[],
    [featuredIds, getPromptById]
  );

  const trendingPrompts = useMemo(
    () => trendingIds.map((id) => getPromptById(id)).filter(Boolean) as MarketplacePrompt[],
    [trendingIds, getPromptById]
  );

  const installedPromptsList = useMemo(
    () =>
      installedPrompts
        .map((i) => getPromptById(i.marketplaceId))
        .filter(Boolean) as MarketplacePrompt[],
    [installedPrompts, getPromptById]
  );

  const favoritePrompts = useMemo(
    () => favoriteIds.map((id) => getPromptById(id)).filter(Boolean) as MarketplacePrompt[],
    [favoriteIds, getPromptById]
  );

  const displayPrompts = useMemo(() => {
    if (searchQuery || selectedCategory !== 'all' || minRating > 0 || selectedTiers.length > 0) {
      return searchResults;
    }
    return prompts;
  }, [searchQuery, selectedCategory, minRating, selectedTiers, searchResults, prompts]);

  const handleViewDetail = useCallback((prompt: MarketplacePrompt) => {
    setSelectedPrompt(prompt);
    setDetailOpen(true);
  }, []);

  const handleTierToggle = (tier: string) => {
    setSelectedTiers((prev) =>
      prev.includes(tier) ? prev.filter((t) => t !== tier) : [...prev, tier]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSortBy('downloads');
    setMinRating(0);
    setSelectedTiers([]);
  };

  const hasActiveFilters =
    searchQuery || selectedCategory !== 'all' || minRating > 0 || selectedTiers.length > 0;

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: prompts.length };
    prompts.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [prompts]);

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  return (
    <div className="flex h-full overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      {/* Sidebar - Visible on Desktop */}
      <PromptMarketplaceSidebar
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedTiers={selectedTiers}
        onToggleTier={handleTierToggle}
        minRating={minRating}
        onMinRatingChange={setMinRating}
        categoryCounts={categoryCounts}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="shrink-0 px-4 lg:px-6 py-3 border-b space-y-3 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center justify-between gap-4">
            {/* Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as TabValue)}
              className="w-full"
            >
              <div className="flex items-center justify-between gap-2">
                <TabsList className="bg-muted/50 p-1 h-auto">
                  <TabsTrigger value="browse" className="gap-1.5 px-3 py-2 data-[state=active]:shadow-sm">
                    <Package className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('tabs.browse')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="installed" className="gap-1.5 px-3 py-2 data-[state=active]:shadow-sm">
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('tabs.installed')}</span>
                    {installedPrompts.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-[10px] font-semibold">
                        {installedPrompts.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="favorites" className="gap-1.5 px-3 py-2 data-[state=active]:shadow-sm">
                    <Heart className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('tabs.favorites')}</span>
                    {favoriteIds.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-[10px] font-semibold">
                        {favoriteIds.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="recent" className="gap-1.5 px-3 py-2 data-[state=active]:shadow-sm">
                    <History className="h-4 w-4" />
                    <span className="hidden md:inline">{t('tabs.recent')}</span>
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2">
                  {/* Mobile Filter Sheet Trigger */}
                  <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
                    <SheetTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          'lg:hidden gap-1.5 h-9',
                          hasActiveFilters && 'border-primary/50 bg-primary/5'
                        )}
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                        <span className="hidden sm:inline">{t('filters.title')}</span>
                        {hasActiveFilters && (
                          <Badge variant="default" className="ml-1 h-5 min-w-5 px-1 text-[10px]">
                            {(selectedCategory !== 'all' ? 1 : 0) + selectedTiers.length + (minRating > 0 ? 1 : 0)}
                          </Badge>
                        )}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-80 sm:w-96">
                      <PromptMarketplaceSidebar
                        selectedCategory={selectedCategory}
                        onSelectCategory={(cat) => {
                          setSelectedCategory(cat);
                        }}
                        selectedTiers={selectedTiers}
                        onToggleTier={handleTierToggle}
                        minRating={minRating}
                        onMinRatingChange={setMinRating}
                        categoryCounts={categoryCounts}
                        className="flex w-full h-full border-none"
                        isMobile
                        onClose={() => setMobileFilterOpen(false)}
                      />
                    </SheetContent>
                  </Sheet>

                  {/* View Mode Toggle */}
                  <div className="hidden sm:flex items-center gap-0.5 border rounded-lg p-0.5 bg-muted/30">
                    <Button
                      variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                      size="icon"
                      className={cn(
                        'h-8 w-8 transition-all',
                        viewMode === 'grid' && 'shadow-sm'
                      )}
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                      size="icon"
                      className={cn(
                        'h-8 w-8 transition-all',
                        viewMode === 'list' && 'shadow-sm'
                      )}
                      onClick={() => setViewMode('list')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Tabs>
          </div>

          {/* Search & Sort Bar */}
          {activeTab === 'browse' && (
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-2xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('search.placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9 h-10 bg-muted/30 border-muted-foreground/20 focus-visible:bg-background focus-visible:border-primary/40 transition-all"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <Select
                value={sortBy}
                onValueChange={(v) => setSortBy(v as MarketplaceSearchFilters['sortBy'])}
              >
                <SelectTrigger className="w-36 sm:w-44 h-10 bg-muted/30 border-muted-foreground/20">
                  <SelectValue placeholder={t('sort.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="downloads">{t('sort.downloads')}</SelectItem>
                  <SelectItem value="rating">{t('sort.rating')}</SelectItem>
                  <SelectItem value="trending">{t('sort.trending')}</SelectItem>
                  <SelectItem value="newest">{t('sort.newest')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Active Filters Pills (Mobile) */}
          {hasActiveFilters && activeTab === 'browse' && (
            <div className="flex items-center gap-2 lg:hidden overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
              {selectedCategory !== 'all' && (
                <Badge
                  variant="secondary"
                  className="shrink-0 gap-1.5 pl-2 pr-1 py-1 cursor-pointer hover:bg-secondary/80"
                  onClick={() => setSelectedCategory('all')}
                >
                  {selectedCategory}
                  <X className="h-3 w-3" />
                </Badge>
              )}
              {selectedTiers.map((tier) => (
                <Badge
                  key={tier}
                  variant="secondary"
                  className="shrink-0 gap-1.5 pl-2 pr-1 py-1 cursor-pointer hover:bg-secondary/80"
                  onClick={() => handleTierToggle(tier)}
                >
                  {tier}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
              {minRating > 0 && (
                <Badge
                  variant="secondary"
                  className="shrink-0 gap-1.5 pl-2 pr-1 py-1 cursor-pointer hover:bg-secondary/80"
                  onClick={() => setMinRating(0)}
                >
                  {minRating}+ ★
                  <X className="h-3 w-3" />
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 h-6 px-2 text-xs text-muted-foreground"
                onClick={clearFilters}
              >
                {t('filters.clearAll')}
              </Button>
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1">
          <div className="p-4 lg:p-6 xl:p-8 space-y-8">
            {activeTab === 'browse' && (
              <>
                {/* Featured Section (only when no filters) */}
                {!hasActiveFilters && featuredPrompts.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 text-yellow-600 dark:text-yellow-500 shadow-sm">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg tracking-tight">
                            {t('sections.featured')}
                          </h3>
                          <p className="text-xs text-muted-foreground">{t('sections.featuredDesc')}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs font-medium">
                        {featuredPrompts.length} {t('common.prompts')}
                      </Badge>
                    </div>
                    <div
                      className={cn(
                        'gap-4',
                        viewMode === 'grid'
                          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5'
                          : 'flex flex-col'
                      )}
                    >
                      {featuredPrompts.map((prompt, index) => (
                        <PromptMarketplaceCard
                          key={prompt.id}
                          prompt={prompt}
                          onViewDetail={handleViewDetail}
                          onInstall={onInstall}
                          compact={viewMode === 'list'}
                          featured={index === 0 && viewMode === 'grid'}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Trending Section (only when no filters) */}
                {!hasActiveFilters && trendingPrompts.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 text-orange-600 dark:text-orange-500 shadow-sm">
                          <TrendingUp className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg tracking-tight">
                            {t('sections.trending')}
                          </h3>
                          <p className="text-xs text-muted-foreground">{t('sections.trendingDesc')}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs font-medium">
                        {t('common.thisWeek')}
                      </Badge>
                    </div>
                    <div
                      className={cn(
                        'gap-4',
                        viewMode === 'grid'
                          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5'
                          : 'flex flex-col'
                      )}
                    >
                      {trendingPrompts.slice(0, 8).map((prompt) => (
                        <PromptMarketplaceCard
                          key={prompt.id}
                          prompt={prompt}
                          onViewDetail={handleViewDetail}
                          onInstall={onInstall}
                          compact={viewMode === 'list'}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* All/Filtered Prompts */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-600 dark:text-blue-500 shadow-sm">
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg tracking-tight">
                          {hasActiveFilters ? t('search.results') : t('sections.allPrompts')}
                        </h3>
                        {hasActiveFilters && (
                          <p className="text-xs text-muted-foreground">
                            {t('search.matchingFilters')}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className="ml-2 font-mono text-xs tabular-nums">
                        {displayPrompts.length}
                      </Badge>
                    </div>

                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="h-8 text-muted-foreground hover:text-foreground gap-1.5"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{t('filters.clearFilters')}</span>
                      </Button>
                    )}
                  </div>

                  {isLoading ? (
                    <div
                      className={cn(
                        'gap-4',
                        viewMode === 'grid'
                          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5'
                          : 'flex flex-col'
                      )}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                        <div key={i} className="space-y-3">
                          <Skeleton className="h-[200px] rounded-xl" />
                          <div className="space-y-2 px-1">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : displayPrompts.length > 0 ? (
                    <div
                      className={cn(
                        'gap-4',
                        viewMode === 'grid'
                          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5'
                          : 'flex flex-col'
                      )}
                    >
                      {displayPrompts.map((prompt) => (
                        <PromptMarketplaceCard
                          key={prompt.id}
                          prompt={prompt}
                          onViewDetail={handleViewDetail}
                          onInstall={onInstall}
                          compact={viewMode === 'list'}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center border-2 border-dashed rounded-2xl bg-muted/20">
                      <div className="p-4 rounded-2xl bg-muted/50 mb-4 shadow-sm">
                        <Package className="h-10 w-10 text-muted-foreground/40" />
                      </div>
                      <h3 className="font-semibold text-lg">{t('search.noResults')}</h3>
                      <p className="text-muted-foreground mt-2 max-w-sm mx-auto text-sm">
                        {t('search.noResultsDesc')}
                      </p>
                      {hasActiveFilters && (
                        <Button variant="outline" className="mt-6 gap-2" onClick={clearFilters}>
                          <RefreshCw className="h-4 w-4" />
                          {t('search.clearFilters')}
                        </Button>
                      )}
                    </div>
                  )}
                </section>
              </>
            )}

            {activeTab === 'installed' && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-green-600 dark:text-green-500 shadow-sm">
                      <Download className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg tracking-tight">
                        {t('sections.installedPrompts')}
                      </h3>
                      <p className="text-xs text-muted-foreground">{t('sections.installedDesc')}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs tabular-nums">
                    {installedPromptsList.length}
                  </Badge>
                </div>
                {installedPromptsList.length > 0 ? (
                  <div
                    className={cn(
                      'gap-4',
                      viewMode === 'grid'
                        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5'
                        : 'flex flex-col'
                    )}
                  >
                    {installedPromptsList.map((prompt) => (
                      <PromptMarketplaceCard
                        key={prompt.id}
                        prompt={prompt}
                        onViewDetail={handleViewDetail}
                        compact={viewMode === 'list'}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center border-2 border-dashed rounded-2xl bg-muted/20">
                    <div className="p-4 rounded-2xl bg-green-500/10 mb-4 shadow-sm">
                      <Download className="h-10 w-10 text-green-500/50" />
                    </div>
                    <h3 className="font-semibold text-lg">{t('empty.noInstalledTitle')}</h3>
                    <p className="text-muted-foreground mt-2 text-sm max-w-sm">{t('empty.noInstalled')}</p>
                    <Button
                      variant="outline"
                      className="mt-6 gap-2"
                      onClick={() => setActiveTab('browse')}
                    >
                      <Package className="h-4 w-4" />
                      {t('empty.browseMarketplace')}
                    </Button>
                  </div>
                )}
              </section>
            )}

            {activeTab === 'favorites' && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-red-500/20 to-pink-500/20 text-red-600 dark:text-red-500 shadow-sm">
                      <Heart className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg tracking-tight">
                        {t('sections.favoritePrompts')}
                      </h3>
                      <p className="text-xs text-muted-foreground">{t('sections.favoritesDesc')}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs tabular-nums">
                    {favoritePrompts.length}
                  </Badge>
                </div>
                {favoritePrompts.length > 0 ? (
                  <div
                    className={cn(
                      'gap-4',
                      viewMode === 'grid'
                        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5'
                        : 'flex flex-col'
                    )}
                  >
                    {favoritePrompts.map((prompt) => (
                      <PromptMarketplaceCard
                        key={prompt.id}
                        prompt={prompt}
                        onViewDetail={handleViewDetail}
                        onInstall={onInstall}
                        compact={viewMode === 'list'}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center border-2 border-dashed rounded-2xl bg-muted/20">
                    <div className="p-4 rounded-2xl bg-red-500/10 mb-4 shadow-sm">
                      <Heart className="h-10 w-10 text-red-500/50" />
                    </div>
                    <h3 className="font-semibold text-lg">{t('empty.noFavoritesTitle')}</h3>
                    <p className="text-muted-foreground mt-2 text-sm max-w-sm">{t('empty.noFavorites')}</p>
                    <Button
                      variant="outline"
                      className="mt-6 gap-2"
                      onClick={() => setActiveTab('browse')}
                    >
                      <Package className="h-4 w-4" />
                      {t('empty.browseMarketplace')}
                    </Button>
                  </div>
                )}
              </section>
            )}

            {activeTab === 'recent' && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-500/20 text-purple-600 dark:text-purple-500 shadow-sm">
                      <History className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg tracking-tight">
                        {t('sections.recentlyViewed')}
                      </h3>
                      <p className="text-xs text-muted-foreground">{t('sections.recentDesc')}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs tabular-nums">
                    {recentlyViewed.length}
                  </Badge>
                </div>
                {recentlyViewed.length > 0 ? (
                  <div
                    className={cn(
                      'gap-4',
                      viewMode === 'grid'
                        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5'
                        : 'flex flex-col'
                    )}
                  >
                    {recentlyViewed.map((prompt) => (
                      <PromptMarketplaceCard
                        key={prompt.id}
                        prompt={prompt}
                        onViewDetail={handleViewDetail}
                        onInstall={onInstall}
                        compact={viewMode === 'list'}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center border-2 border-dashed rounded-2xl bg-muted/20">
                    <div className="p-4 rounded-2xl bg-purple-500/10 mb-4 shadow-sm">
                      <History className="h-10 w-10 text-purple-500/50" />
                    </div>
                    <h3 className="font-semibold text-lg">{t('empty.noRecentTitle')}</h3>
                    <p className="text-muted-foreground mt-2 text-sm max-w-sm">{t('empty.noRecent')}</p>
                    <Button
                      variant="outline"
                      className="mt-6 gap-2"
                      onClick={() => setActiveTab('browse')}
                    >
                      <Package className="h-4 w-4" />
                      {t('empty.browseMarketplace')}
                    </Button>
                  </div>
                )}
              </section>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Detail Dialog */}
      <PromptMarketplaceDetail
        prompt={selectedPrompt}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}

export default PromptMarketplaceBrowser;
