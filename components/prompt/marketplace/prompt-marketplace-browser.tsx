'use client';

/**
 * PromptMarketplaceBrowser - Main marketplace browsing component
 * Modern design with improved responsive layout, better space utilization, and enhanced UX
 */

import { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTranslations } from 'next-intl';
import {
  Search,
  Grid3X3,
  List,
  Download,
  Package,
  Heart,
  History,
  SlidersHorizontal,
  X,
  FolderOpen,
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type {
  MarketplacePrompt,
  MarketplaceCategory,
  MarketplaceSearchFilters,
} from '@/types/content/prompt-marketplace';
import { usePromptMarketplaceStore } from '@/stores/prompt/prompt-marketplace-store';
import { PromptMarketplaceSidebar } from './prompt-marketplace-sidebar';
import { PromptMarketplaceDetail } from './prompt-marketplace-detail';
import { PromptAuthorProfile } from './prompt-author-profile';
import type { PromptAuthor } from '@/types/content/prompt-marketplace';
import { BrowseTab, InstalledTab, FavoritesTab, CollectionsTab, RecentTab } from './tabs';

type ViewMode = 'grid' | 'list';
type TabValue = 'browse' | 'collections' | 'installed' | 'favorites' | 'recent';

interface PromptMarketplaceBrowserProps {
  defaultTab?: TabValue;
  onInstall?: (prompt: MarketplacePrompt) => void;
}

export function PromptMarketplaceBrowser({
  defaultTab = 'browse',
  onInstall,
}: PromptMarketplaceBrowserProps) {
  const t = useTranslations('promptMarketplace');

  // Store state — grouped selectors to reduce subscription fragmentation
  const { prompts, featuredIds, trendingIds, isLoading, collections } = usePromptMarketplaceStore(
    useShallow((state) => ({
      prompts: Object.values(state.prompts),
      featuredIds: state.featuredIds,
      trendingIds: state.trendingIds,
      isLoading: state.isLoading,
      collections: Object.values(state.collections),
    }))
  );

  const { installedPrompts, favoriteIds, recentlyViewed } = usePromptMarketplaceStore(
    useShallow((state) => ({
      installedPrompts: state.userActivity.installed,
      favoriteIds: state.userActivity.favorites,
      recentlyViewed: state.getRecentlyViewed(),
    }))
  );

  const {
    searchPrompts,
    fetchFeatured,
    fetchTrending,
    initializeSampleData,
    getPromptById,
    checkForUpdates,
    updateInstalledPrompt,
  } = usePromptMarketplaceStore(
    useShallow((state) => ({
      searchPrompts: state.searchPrompts,
      fetchFeatured: state.fetchFeatured,
      fetchTrending: state.fetchTrending,
      initializeSampleData: state.initializeSampleData,
      getPromptById: state.getPromptById,
      checkForUpdates: state.checkForUpdates,
      updateInstalledPrompt: state.updateInstalledPrompt,
    }))
  );

  // Local state
  const [activeTab, setActiveTab] = useState<TabValue>(defaultTab);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedCategory, setSelectedCategory] = useState<MarketplaceCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [sortBy, setSortBy] = useState<MarketplaceSearchFilters['sortBy']>('downloads');
  const [minRating, setMinRating] = useState(0);
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<MarketplacePrompt | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<MarketplacePrompt[]>([]);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [promptsWithUpdates, setPromptsWithUpdates] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const [installedSearchQuery, setInstalledSearchQuery] = useState('');
  const deferredInstalledSearchQuery = useDeferredValue(installedSearchQuery);
  const [installedSortBy, setInstalledSortBy] = useState<'name' | 'date' | 'rating'>('date');
  const [favoritesSearchQuery, setFavoritesSearchQuery] = useState('');
  const deferredFavoritesSearchQuery = useDeferredValue(favoritesSearchQuery);
  const [favoritesSortBy, setFavoritesSortBy] = useState<'name' | 'date' | 'rating'>('date');
  const [selectedAuthor, setSelectedAuthor] = useState<PromptAuthor | null>(null);
  const [authorProfileOpen, setAuthorProfileOpen] = useState(false);

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

  // Check for updates handler
  const handleCheckForUpdates = useCallback(async () => {
    setIsCheckingUpdates(true);
    try {
      const withUpdates = await checkForUpdates();
      setPromptsWithUpdates(withUpdates.map((p) => p.marketplaceId));
    } finally {
      setIsCheckingUpdates(false);
    }
  }, [checkForUpdates]);

  const handleUpdatePrompt = useCallback(async (marketplaceId: string) => {
    await updateInstalledPrompt(marketplaceId);
    setPromptsWithUpdates((prev) => prev.filter((id) => id !== marketplaceId));
  }, [updateInstalledPrompt]);

  // Search effect
  useEffect(() => {
    const filters: MarketplaceSearchFilters = {
      query: deferredSearchQuery,
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      sortBy,
      minRating: minRating > 0 ? minRating : undefined,
      qualityTier:
        selectedTiers.length > 0
          ? (selectedTiers as MarketplaceSearchFilters['qualityTier'])
          : undefined,
    };

    const result = searchPrompts(filters);
    setSearchResults(result.prompts);
  }, [deferredSearchQuery, selectedCategory, sortBy, minRating, selectedTiers, searchPrompts]);

  // Computed lists
  const featuredPrompts = useMemo(
    () => featuredIds.map((id) => getPromptById(id)).filter(Boolean) as MarketplacePrompt[],
    [featuredIds, getPromptById]
  );

  const trendingPrompts = useMemo(
    () => trendingIds.map((id) => getPromptById(id)).filter(Boolean) as MarketplacePrompt[],
    [trendingIds, getPromptById]
  );

  const installedPromptsList = useMemo(() => {
    let list = installedPrompts
      .map((i) => getPromptById(i.marketplaceId))
      .filter(Boolean) as MarketplacePrompt[];
    
    // Filter by search query
    if (deferredInstalledSearchQuery) {
      const query = deferredInstalledSearchQuery.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.tags.some((t) => t.toLowerCase().includes(query))
      );
    }
    
    // Sort
    list = [...list].sort((a, b) => {
      switch (installedSortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rating':
          return b.rating.average - a.rating.average;
        case 'date':
        default:
          const aInstall = installedPrompts.find((i) => i.marketplaceId === a.id);
          const bInstall = installedPrompts.find((i) => i.marketplaceId === b.id);
          return (bInstall?.installedAt?.getTime() || 0) - (aInstall?.installedAt?.getTime() || 0);
      }
    });
    
    return list;
  }, [installedPrompts, getPromptById, deferredInstalledSearchQuery, installedSortBy]);

  const favoritePrompts = useMemo(() => {
    let list = favoriteIds.map((id) => getPromptById(id)).filter(Boolean) as MarketplacePrompt[];
    
    // Filter by search query
    if (deferredFavoritesSearchQuery) {
      const query = deferredFavoritesSearchQuery.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.tags.some((t) => t.toLowerCase().includes(query))
      );
    }
    
    // Sort
    list = [...list].sort((a, b) => {
      switch (favoritesSortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rating':
          return b.rating.average - a.rating.average;
        case 'date':
        default:
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });
    
    return list;
  }, [favoriteIds, getPromptById, deferredFavoritesSearchQuery, favoritesSortBy]);

  const displayPrompts = useMemo(() => {
    if (deferredSearchQuery || selectedCategory !== 'all' || minRating > 0 || selectedTiers.length > 0) {
      return searchResults;
    }
    return prompts;
  }, [deferredSearchQuery, selectedCategory, minRating, selectedTiers, searchResults, prompts]);

  // Paginated prompts
  const paginatedPrompts = useMemo(() => {
    const startIndex = 0;
    const endIndex = currentPage * ITEMS_PER_PAGE;
    return displayPrompts.slice(startIndex, endIndex);
  }, [displayPrompts, currentPage]);

  const hasMorePrompts = paginatedPrompts.length < displayPrompts.length;

  const loadMorePrompts = useCallback(() => {
    if (hasMorePrompts) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [hasMorePrompts]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, minRating, selectedTiers, sortBy]);

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

  // Handle viewing author profile
  const handleViewAuthor = useCallback((author: PromptAuthor) => {
    setSelectedAuthor(author);
    setAuthorProfileOpen(true);
  }, []);

  // Get prompts by author
  const authorPrompts = useMemo(() => {
    if (!selectedAuthor) return [];
    return prompts.filter((p) => p.author.id === selectedAuthor.id);
  }, [selectedAuthor, prompts]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: prompts.length };
    prompts.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [prompts]);

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const gridClasses = viewMode === 'grid'
    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4'
    : 'flex flex-col gap-3';

  const activeFilterCount = (selectedCategory !== 'all' ? 1 : 0) + selectedTiers.length + (minRating > 0 ? 1 : 0);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      {/* Compact Header */}
      <div className="shrink-0 px-3 lg:px-4 py-2 border-b space-y-2 bg-background/80 backdrop-blur-sm">
        {/* Row 1: Tabs + Actions */}
        <div className="flex items-center gap-2">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as TabValue)}
            className="flex-1 min-w-0"
          >
            <TabsList className="bg-muted/50 p-0.5 h-auto overflow-x-auto scrollbar-none">
              <TabsTrigger value="browse" className="gap-1 px-2 py-1.5 text-xs data-[state=active]:shadow-sm">
                <Package className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('tabs.browse')}</span>
              </TabsTrigger>
              <TabsTrigger value="installed" className="gap-1 px-2 py-1.5 text-xs data-[state=active]:shadow-sm">
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('tabs.installed')}</span>
                {installedPrompts.length > 0 && (
                  <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 px-1 text-[10px] font-semibold">
                    {installedPrompts.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="favorites" className="gap-1 px-2 py-1.5 text-xs data-[state=active]:shadow-sm">
                <Heart className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('tabs.favorites')}</span>
                {favoriteIds.length > 0 && (
                  <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 px-1 text-[10px] font-semibold">
                    {favoriteIds.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="collections" className="gap-1 px-2 py-1.5 text-xs data-[state=active]:shadow-sm">
                <FolderOpen className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{t('collections.title')}</span>
                {collections.length > 0 && (
                  <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 px-1 text-[10px] font-semibold">
                    {collections.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="recent" className="gap-1 px-2 py-1.5 text-xs data-[state=active]:shadow-sm">
                <History className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{t('tabs.recent')}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Filter Sheet Trigger */}
            {activeTab === 'browse' && (
              <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'gap-1.5 h-8',
                      hasActiveFilters && 'border-primary/50 bg-primary/5'
                    )}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline text-xs">{t('filters.title')}</span>
                    {activeFilterCount > 0 && (
                      <Badge variant="default" className="ml-0.5 h-4 min-w-4 px-1 text-[10px]">
                        {activeFilterCount}
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
            )}

            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center gap-0.5 border rounded-lg p-0.5 bg-muted/30">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="icon"
                    className={cn(
                      'h-7 w-7 transition-all',
                      viewMode === 'grid' && 'shadow-sm'
                    )}
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3X3 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('view.gridView')}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="icon"
                    className={cn(
                      'h-7 w-7 transition-all',
                      viewMode === 'list' && 'shadow-sm'
                    )}
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('view.listView')}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Row 2: Search & Sort (browse tab only) */}
        {activeTab === 'browse' && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={t('search.placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-8 h-8 text-sm bg-muted/30 border-muted-foreground/20 focus-visible:bg-background focus-visible:border-primary/40 transition-all"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v as MarketplaceSearchFilters['sortBy'])}
            >
              <SelectTrigger className="w-32 sm:w-36 h-8 text-xs bg-muted/30 border-muted-foreground/20">
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

        {/* Active Filters Pills */}
        {hasActiveFilters && activeTab === 'browse' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {selectedCategory !== 'all' && (
              <Badge
                variant="secondary"
                className="shrink-0 gap-1 pl-2 pr-1 py-0.5 text-xs cursor-pointer hover:bg-secondary/80"
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
                className="shrink-0 gap-1 pl-2 pr-1 py-0.5 text-xs cursor-pointer hover:bg-secondary/80"
                onClick={() => handleTierToggle(tier)}
              >
                {tier}
                <X className="h-3 w-3" />
              </Badge>
            ))}
            {minRating > 0 && (
              <Badge
                variant="secondary"
                className="shrink-0 gap-1 pl-2 pr-1 py-0.5 text-xs cursor-pointer hover:bg-secondary/80"
                onClick={() => setMinRating(0)}
              >
                {minRating}+ ★
                <X className="h-3 w-3" />
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 h-5 px-1.5 text-[10px] text-muted-foreground"
              onClick={clearFilters}
            >
              {t('filters.clearAll')}
            </Button>
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1">
        <div className="p-3 lg:p-4 space-y-5">
            {activeTab === 'browse' && (
              <BrowseTab
                featuredPrompts={featuredPrompts}
                trendingPrompts={trendingPrompts}
                displayPrompts={displayPrompts}
                paginatedPrompts={paginatedPrompts}
                hasActiveFilters={!!hasActiveFilters}
                hasMorePrompts={hasMorePrompts}
                isLoading={isLoading}
                gridClasses={gridClasses}
                viewMode={viewMode}
                onViewDetail={handleViewDetail}
                onInstall={onInstall}
                onLoadMore={loadMorePrompts}
                onClearFilters={clearFilters}
              />
            )}

            {activeTab === 'installed' && (
              <InstalledTab
                installedPrompts={installedPrompts}
                installedPromptsList={installedPromptsList}
                promptsWithUpdates={promptsWithUpdates}
                isCheckingUpdates={isCheckingUpdates}
                installedSearchQuery={installedSearchQuery}
                installedSortBy={installedSortBy}
                gridClasses={gridClasses}
                viewMode={viewMode}
                onSearchChange={setInstalledSearchQuery}
                onSortChange={setInstalledSortBy}
                onViewDetail={handleViewDetail}
                onCheckForUpdates={handleCheckForUpdates}
                onUpdatePrompt={handleUpdatePrompt}
                onNavigateToBrowse={() => setActiveTab('browse')}
              />
            )}

            {activeTab === 'favorites' && (
              <FavoritesTab
                favoriteIds={favoriteIds}
                favoritePrompts={favoritePrompts}
                favoritesSearchQuery={favoritesSearchQuery}
                favoritesSortBy={favoritesSortBy}
                gridClasses={gridClasses}
                viewMode={viewMode}
                onSearchChange={setFavoritesSearchQuery}
                onSortChange={setFavoritesSortBy}
                onViewDetail={handleViewDetail}
                onInstall={onInstall}
                onNavigateToBrowse={() => setActiveTab('browse')}
              />
            )}

            {activeTab === 'collections' && (
              <CollectionsTab
                collections={collections}
                getPromptById={getPromptById}
              />
            )}

            {activeTab === 'recent' && (
              <RecentTab
                recentlyViewed={recentlyViewed}
                gridClasses={gridClasses}
                viewMode={viewMode}
                onViewDetail={handleViewDetail}
                onInstall={onInstall}
                onNavigateToBrowse={() => setActiveTab('browse')}
              />
            )}
          </div>
        </ScrollArea>

      {/* Detail Dialog */}
      <PromptMarketplaceDetail
        prompt={selectedPrompt}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onViewAuthor={handleViewAuthor}
      />

      {/* Author Profile Dialog */}
      {selectedAuthor && (
        <PromptAuthorProfile
          author={selectedAuthor}
          prompts={authorPrompts}
          open={authorProfileOpen}
          onOpenChange={setAuthorProfileOpen}
          onViewPrompt={handleViewDetail}
          onInstall={onInstall}
        />
      )}
    </div>
  );
}

export default PromptMarketplaceBrowser;
