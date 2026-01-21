'use client';

/**
 * PromptMarketplaceBrowser - Main marketplace browsing component
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Search,
  SlidersHorizontal,
  Grid3X3,
  List,
  RefreshCw,
  Download,
  Star,
  TrendingUp,
  Sparkles,
  Package,
  Heart,
  History,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { MarketplacePrompt, MarketplaceCategory, MarketplaceSearchFilters } from '@/types/content/prompt-marketplace';
import { QUALITY_TIER_INFO } from '@/types/content/prompt-marketplace';
import { usePromptMarketplaceStore } from '@/stores/prompt/prompt-marketplace-store';
import { PromptMarketplaceCard } from './prompt-marketplace-card';
import { PromptMarketplaceCategoryNav } from './prompt-marketplace-category-nav';
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
  const prompts = usePromptMarketplaceStore(state => Object.values(state.prompts));
  const featuredIds = usePromptMarketplaceStore(state => state.featuredIds);
  const trendingIds = usePromptMarketplaceStore(state => state.trendingIds);
  const isLoading = usePromptMarketplaceStore(state => state.isLoading);
  const installedPrompts = usePromptMarketplaceStore(state => state.userActivity.installed);
  const favoriteIds = usePromptMarketplaceStore(state => state.userActivity.favorites);
  const recentlyViewed = usePromptMarketplaceStore(state => state.getRecentlyViewed());
  const searchPrompts = usePromptMarketplaceStore(state => state.searchPrompts);
  const fetchFeatured = usePromptMarketplaceStore(state => state.fetchFeatured);
  const fetchTrending = usePromptMarketplaceStore(state => state.fetchTrending);
  const initializeSampleData = usePromptMarketplaceStore(state => state.initializeSampleData);
  const getPromptById = usePromptMarketplaceStore(state => state.getPromptById);

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
      qualityTier: selectedTiers.length > 0 ? selectedTiers as MarketplaceSearchFilters['qualityTier'] : undefined,
    };

    searchPrompts(filters).then(result => {
      setSearchResults(result.prompts);
    });
  }, [searchQuery, selectedCategory, sortBy, minRating, selectedTiers, searchPrompts]);

  // Computed lists
  const featuredPrompts = useMemo(() => 
    featuredIds.map(id => getPromptById(id)).filter(Boolean) as MarketplacePrompt[],
    [featuredIds, getPromptById]
  );

  const trendingPrompts = useMemo(() => 
    trendingIds.map(id => getPromptById(id)).filter(Boolean) as MarketplacePrompt[],
    [trendingIds, getPromptById]
  );

  const installedPromptsList = useMemo(() => 
    installedPrompts.map(i => getPromptById(i.marketplaceId)).filter(Boolean) as MarketplacePrompt[],
    [installedPrompts, getPromptById]
  );

  const favoritePrompts = useMemo(() => 
    favoriteIds.map(id => getPromptById(id)).filter(Boolean) as MarketplacePrompt[],
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
    setSelectedTiers(prev =>
      prev.includes(tier) ? prev.filter(t => t !== tier) : [...prev, tier]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSortBy('downloads');
    setMinRating(0);
    setSelectedTiers([]);
  };

  const hasActiveFilters = searchQuery || selectedCategory !== 'all' || minRating > 0 || selectedTiers.length > 0;

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: prompts.length };
    prompts.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [prompts]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 space-y-4 pb-4 border-b">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
          <TabsList>
            <TabsTrigger value="browse" className="gap-1.5">
              <Package className="h-4 w-4" />
              {t('tabs.browse')}
            </TabsTrigger>
            <TabsTrigger value="installed" className="gap-1.5">
              <Download className="h-4 w-4" />
              {t('tabs.installed')}
              {installedPrompts.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {installedPrompts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="favorites" className="gap-1.5">
              <Heart className="h-4 w-4" />
              {t('tabs.favorites')}
              {favoriteIds.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {favoriteIds.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="recent" className="gap-1.5">
              <History className="h-4 w-4" />
              {t('tabs.recent')}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search & Filters */}
        {activeTab === 'browse' && (
          <>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('search.placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Sort */}
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as MarketplaceSearchFilters['sortBy'])}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t('sort.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="downloads">{t('sort.downloads')}</SelectItem>
                  <SelectItem value="rating">{t('sort.rating')}</SelectItem>
                  <SelectItem value="trending">{t('sort.trending')}</SelectItem>
                  <SelectItem value="newest">{t('sort.newest')}</SelectItem>
                </SelectContent>
              </Select>

              {/* Filters Sheet */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="relative">
                    <SlidersHorizontal className="h-4 w-4" />
                    {hasActiveFilters && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full" />
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>{t('filters.title')}</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-6 mt-6">
                    {/* Quality Tier */}
                    <div className="space-y-3">
                      <Label>{t('filters.qualityTier')}</Label>
                      {Object.entries(QUALITY_TIER_INFO).map(([tier, info]) => (
                        <div key={tier} className="flex items-center gap-2">
                          <Checkbox
                            id={`tier-${tier}`}
                            checked={selectedTiers.includes(tier)}
                            onCheckedChange={() => handleTierToggle(tier)}
                          />
                          <Label htmlFor={`tier-${tier}`} className="flex items-center gap-2 cursor-pointer">
                            <span>{info.icon}</span>
                            <span>{info.name}</span>
                          </Label>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    {/* Minimum Rating */}
                    <div className="space-y-3">
                      <Label>{t('filters.minRating')}: {minRating > 0 ? t('filters.minRatingValue', { rating: minRating }) : t('filters.any')}</Label>
                      <Slider
                        value={[minRating]}
                        onValueChange={([v]) => setMinRating(v)}
                        min={0}
                        max={5}
                        step={0.5}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{t('filters.any')}</span>
                        <span>{t('filters.stars')}</span>
                      </div>
                    </div>

                    <Separator />

                    {/* Clear Filters */}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={clearFilters}
                      disabled={!hasActiveFilters}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {t('filters.clearFilters')}
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              {/* View Mode */}
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Category Nav */}
            <PromptMarketplaceCategoryNav
              selected={selectedCategory}
              onSelect={setSelectedCategory}
              showCounts={categoryCounts}
            />
          </>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="py-4 space-y-6">
          {activeTab === 'browse' && (
            <>
              {/* Featured Section (only when no filters) */}
              {!hasActiveFilters && featuredPrompts.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-5 w-5 text-yellow-500" />
                    <h3 className="font-semibold">{t('sections.featured')}</h3>
                  </div>
                  <div className={cn(
                    'gap-4',
                    viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col'
                  )}>
                    {featuredPrompts.map(prompt => (
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

              {/* Trending Section (only when no filters) */}
              {!hasActiveFilters && trendingPrompts.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-5 w-5 text-orange-500" />
                    <h3 className="font-semibold">{t('sections.trending')}</h3>
                  </div>
                  <div className={cn(
                    'gap-4',
                    viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col'
                  )}>
                    {trendingPrompts.slice(0, 6).map(prompt => (
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
              <section>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-blue-500" />
                    <h3 className="font-semibold">
                      {hasActiveFilters ? t('search.results') : t('sections.allPrompts')}
                    </h3>
                    <Badge variant="secondary">{displayPrompts.length}</Badge>
                  </div>
                </div>

                {isLoading ? (
                  <div className={cn(
                    'gap-4',
                    viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col'
                  )}>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <Skeleton key={i} className="h-48 rounded-lg" />
                    ))}
                  </div>
                ) : displayPrompts.length > 0 ? (
                  <div className={cn(
                    'gap-4',
                    viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col'
                  )}>
                    {displayPrompts.map(prompt => (
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
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t('search.noResults')}</p>
                    {hasActiveFilters && (
                      <Button variant="link" onClick={clearFilters}>
                        {t('search.clearFilters')}
                      </Button>
                    )}
                  </div>
                )}
              </section>
            </>
          )}

          {activeTab === 'installed' && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Download className="h-5 w-5 text-green-500" />
                <h3 className="font-semibold">{t('sections.installedPrompts')}</h3>
                <Badge variant="secondary">{installedPromptsList.length}</Badge>
              </div>
              {installedPromptsList.length > 0 ? (
                <div className={cn(
                  'gap-4',
                  viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col'
                )}>
                  {installedPromptsList.map(prompt => (
                    <PromptMarketplaceCard
                      key={prompt.id}
                      prompt={prompt}
                      onViewDetail={handleViewDetail}
                      compact={viewMode === 'list'}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Download className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t('empty.noInstalled')}</p>
                  <Button variant="link" onClick={() => setActiveTab('browse')}>
                    {t('empty.browseMarketplace')}
                  </Button>
                </div>
              )}
            </section>
          )}

          {activeTab === 'favorites' && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Heart className="h-5 w-5 text-red-500" />
                <h3 className="font-semibold">{t('sections.favoritePrompts')}</h3>
                <Badge variant="secondary">{favoritePrompts.length}</Badge>
              </div>
              {favoritePrompts.length > 0 ? (
                <div className={cn(
                  'gap-4',
                  viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col'
                )}>
                  {favoritePrompts.map(prompt => (
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
                <div className="text-center py-12 text-muted-foreground">
                  <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t('empty.noFavorites')}</p>
                  <Button variant="link" onClick={() => setActiveTab('browse')}>
                    {t('empty.browseMarketplace')}
                  </Button>
                </div>
              )}
            </section>
          )}

          {activeTab === 'recent' && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <History className="h-5 w-5 text-purple-500" />
                <h3 className="font-semibold">{t('sections.recentlyViewed')}</h3>
                <Badge variant="secondary">{recentlyViewed.length}</Badge>
              </div>
              {recentlyViewed.length > 0 ? (
                <div className={cn(
                  'gap-4',
                  viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col'
                )}>
                  {recentlyViewed.map(prompt => (
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
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t('empty.noRecent')}</p>
                  <Button variant="link" onClick={() => setActiveTab('browse')}>
                    {t('empty.browseMarketplace')}
                  </Button>
                </div>
              )}
            </section>
          )}
        </div>
      </ScrollArea>

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
