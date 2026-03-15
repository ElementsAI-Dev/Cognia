'use client';

/**
 * PromptMarketplaceBrowser - Main marketplace browsing component
 * Modern design with improved responsive layout, better space utilization, and enhanced UX
 */

import { useState, useEffect, useMemo, useCallback, useDeferredValue, useRef } from 'react';
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
  RefreshCw,
  Wifi,
  WifiOff,
  AlertCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getPromptMarketplaceErrorMessageKey } from '@/lib/prompts/marketplace-error-adapter';
import type {
  MarketplacePrompt,
  MarketplaceSearchFilters,
} from '@/types/content/prompt-marketplace';
import { usePromptMarketplaceStore } from '@/stores/prompt/prompt-marketplace-store';
import { PromptMarketplaceSidebar } from './prompt-marketplace-sidebar';
import { PromptMarketplaceDetail } from './prompt-marketplace-detail';
import { PromptMarketplaceInspector } from './prompt-marketplace-inspector';
import { PromptAuthorProfile } from './prompt-author-profile';
import type { PromptAuthor } from '@/types/content/prompt-marketplace';
import { BrowseTab, InstalledTab, FavoritesTab, CollectionsTab, RecentTab } from './tabs';

type ViewMode = 'grid' | 'list';
type TabValue = 'browse' | 'collections' | 'installed' | 'favorites' | 'recent';

interface PromptMarketplaceBrowserProps {
  defaultTab?: TabValue;
  onInstall?: (prompt: MarketplacePrompt) => void;
  onContinueEditing?: (templateId: string) => void;
}

export function PromptMarketplaceBrowser({
  defaultTab = 'browse',
  onInstall,
  onContinueEditing,
}: PromptMarketplaceBrowserProps) {
  const t = useTranslations('promptMarketplace');

  // Store state — select raw records (referentially stable) to avoid infinite loop
  const {
    promptsMap,
    featuredIds,
    trendingIds,
    isLoading,
    listError,
    collectionsMap,
    sourceState,
    sourceWarning,
    remoteFirstEnabled,
    lastSyncedAt,
    browseViewState,
    installRetryContexts,
  } = usePromptMarketplaceStore(
    useShallow((state) => ({
      promptsMap: state.prompts,
      featuredIds: state.featuredIds,
      trendingIds: state.trendingIds,
      isLoading: state.isLoading,
      listError: state.operationStates.list,
      collectionsMap: state.collections,
      sourceState: state.sourceState,
      sourceWarning: state.sourceWarning,
      remoteFirstEnabled: state.remoteFirstEnabled,
      lastSyncedAt: state.lastSyncedAt,
      browseViewState: state.browseViewState,
      installRetryContexts: state.installRetryContexts,
    }))
  );

  const { installedPrompts, favoriteIds, recentlyViewedEntries } = usePromptMarketplaceStore(
    useShallow((state) => ({
      installedPrompts: state.userActivity.installed,
      favoriteIds: state.userActivity.favorites,
      recentlyViewedEntries: state.userActivity.recentlyViewed,
    }))
  );

  // Derive arrays from stable record references
  const prompts = useMemo(() => Object.values(promptsMap), [promptsMap]);
  const collections = useMemo(() => Object.values(collectionsMap), [collectionsMap]);
  const recentlyViewed = useMemo(
    () => recentlyViewedEntries
      .map((v) => promptsMap[v.promptId])
      .filter((p): p is MarketplacePrompt => p !== undefined),
    [recentlyViewedEntries, promptsMap]
  );

  const {
    searchPrompts,
    refreshCatalog,
    fetchFeatured,
    fetchTrending,
    setRemoteFirstEnabled,
    getPromptById,
    checkForUpdates,
    updateInstalledPrompt,
    setBrowseQuery,
    setBrowseCategory,
    setBrowseSortBy,
    setBrowseMinRating,
    toggleBrowseQualityTier,
    clearBrowseFilters,
    setBrowsePage,
    setBrowseScrollOffset,
    setSelectedPrompt,
    setDetailOpen,
  } = usePromptMarketplaceStore(
    useShallow((state) => ({
      searchPrompts: state.searchPrompts,
      refreshCatalog: state.refreshCatalog,
      fetchFeatured: state.fetchFeatured,
      fetchTrending: state.fetchTrending,
      setRemoteFirstEnabled: state.setRemoteFirstEnabled,
      getPromptById: state.getPromptById,
      checkForUpdates: state.checkForUpdates,
      updateInstalledPrompt: state.updateInstalledPrompt,
      setBrowseQuery: state.setBrowseQuery,
      setBrowseCategory: state.setBrowseCategory,
      setBrowseSortBy: state.setBrowseSortBy,
      setBrowseMinRating: state.setBrowseMinRating,
      toggleBrowseQualityTier: state.toggleBrowseQualityTier,
      clearBrowseFilters: state.clearBrowseFilters,
      setBrowsePage: state.setBrowsePage,
      setBrowseScrollOffset: state.setBrowseScrollOffset,
      setSelectedPrompt: state.setSelectedPrompt,
      setDetailOpen: state.setDetailOpen,
    }))
  );

  // Local state
  const [activeTab, setActiveTab] = useState<TabValue>(defaultTab);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [hasPersistentInspector, setHasPersistentInspector] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [promptsWithUpdates, setPromptsWithUpdates] = useState<string[]>([]);
  const [installedSearchQuery, setInstalledSearchQuery] = useState('');
  const deferredInstalledSearchQuery = useDeferredValue(installedSearchQuery);
  const [installedSortBy, setInstalledSortBy] = useState<'name' | 'date' | 'rating'>('date');
  const [favoritesSearchQuery, setFavoritesSearchQuery] = useState('');
  const deferredFavoritesSearchQuery = useDeferredValue(favoritesSearchQuery);
  const [favoritesSortBy, setFavoritesSortBy] = useState<'name' | 'date' | 'rating'>('date');
  const [selectedAuthor, setSelectedAuthor] = useState<PromptAuthor | null>(null);
  const [authorProfileOpen, setAuthorProfileOpen] = useState(false);
  const [isRefreshingCatalog, setIsRefreshingCatalog] = useState(false);
  const contentContainerRef = useRef<HTMLDivElement | null>(null);
  const selectedPrompt = browseViewState.selectedPromptId
    ? getPromptById(browseViewState.selectedPromptId) || null
    : null;

  // Initialize/refresh catalog on mount
  useEffect(() => {
    if (prompts.length > 0 || lastSyncedAt) {
      return;
    }
    void refreshCatalog();
  }, [prompts.length, lastSyncedAt, refreshCatalog]);

  // Rebuild featured and trending slices after catalog updates
  useEffect(() => {
    fetchFeatured();
    fetchTrending();
  }, [promptsMap, fetchFeatured, fetchTrending]);

  useEffect(() => {
    const inspectorMedia = window.matchMedia('(min-width: 1536px)');
    const handleChange = () => {
      setHasPersistentInspector(inspectorMedia.matches);
    };
    handleChange();
    inspectorMedia.addEventListener('change', handleChange);
    return () => {
      inspectorMedia.removeEventListener('change', handleChange);
    };
  }, []);

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

  const handleRefreshCatalog = useCallback(async () => {
    setIsRefreshingCatalog(true);
    try {
      await refreshCatalog();
    } finally {
      setIsRefreshingCatalog(false);
    }
  }, [refreshCatalog]);

  const handleRemoteFirstToggle = useCallback(
    async (enabled: boolean) => {
      setRemoteFirstEnabled(enabled);
      setIsRefreshingCatalog(true);
      try {
        await refreshCatalog();
      } finally {
        setIsRefreshingCatalog(false);
      }
    },
    [refreshCatalog, setRemoteFirstEnabled]
  );

  const browseFilters = useMemo<MarketplaceSearchFilters>(
    () => ({
      query: browseViewState.query || undefined,
      category: browseViewState.category === 'all' ? undefined : browseViewState.category,
      sortBy: browseViewState.sortBy,
      minRating: browseViewState.minRating > 0 ? browseViewState.minRating : undefined,
      qualityTier: browseViewState.selectedTiers.length > 0 ? browseViewState.selectedTiers : undefined,
    }),
    [
      browseViewState.category,
      browseViewState.minRating,
      browseViewState.query,
      browseViewState.selectedTiers,
      browseViewState.sortBy,
    ]
  );

  const searchResults = useMemo(
    () => searchPrompts(browseFilters).prompts,
    [browseFilters, searchPrompts]
  );

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

  const displayPrompts = searchResults;

  // Paginated prompts
  const paginatedPrompts = useMemo(() => {
    const startIndex = 0;
    const endIndex = browseViewState.page * browseViewState.pageSize;
    return displayPrompts.slice(startIndex, endIndex);
  }, [browseViewState.page, browseViewState.pageSize, displayPrompts]);

  const hasMorePrompts = paginatedPrompts.length < displayPrompts.length;

  const loadMorePrompts = useCallback(() => {
    if (hasMorePrompts) {
      setBrowsePage(browseViewState.page + 1);
    }
  }, [browseViewState.page, hasMorePrompts, setBrowsePage]);

  const handleViewDetail = useCallback((prompt: MarketplacePrompt) => {
    setSelectedPrompt(prompt.id);
    setBrowseScrollOffset(contentContainerRef.current?.scrollTop || 0);
    if (!hasPersistentInspector) {
      setDetailOpen(true);
    }
  }, [hasPersistentInspector, setBrowseScrollOffset, setDetailOpen, setSelectedPrompt]);

  const clearFilters = useCallback(() => {
    clearBrowseFilters();
  }, [clearBrowseFilters]);

  const hasActiveFilters =
    !!browseViewState.query
    || browseViewState.category !== 'all'
    || browseViewState.minRating > 0
    || browseViewState.selectedTiers.length > 0;

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
  const showPersistentInspector = hasPersistentInspector && !!selectedPrompt;

  const gridClasses = viewMode === 'grid'
    ? 'prompt-marketplace-card-grid grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr))]'
    : 'flex flex-col gap-3';

  const activeFilterCount =
    (browseViewState.category !== 'all' ? 1 : 0)
    + browseViewState.selectedTiers.length
    + (browseViewState.minRating > 0 ? 1 : 0);

  useEffect(() => {
    if (!browseViewState.selectedPromptId) {
      return;
    }
    const isSelectedPromptVisible = displayPrompts.some((prompt) => prompt.id === browseViewState.selectedPromptId);
    if (!isSelectedPromptVisible) {
      setSelectedPrompt(null);
      setDetailOpen(false);
    }
  }, [browseViewState.selectedPromptId, displayPrompts, setDetailOpen, setSelectedPrompt]);

  useEffect(() => {
    if (activeTab !== 'browse' || browseViewState.detailOpen || hasPersistentInspector) {
      return;
    }
    const container = contentContainerRef.current;
    if (!container) {
      return;
    }
    container.scrollTop = browseViewState.scrollOffset;
  }, [
    activeTab,
    browseViewState.detailOpen,
    browseViewState.scrollOffset,
    hasPersistentInspector,
  ]);

  const usesDialogDetail = !hasPersistentInspector;

  const listErrorMessageKey = getPromptMarketplaceErrorMessageKey(listError?.category);

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
                      'gap-1.5 h-8 xl:hidden',
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
                    selectedCategory={browseViewState.category}
                    onSelectCategory={setBrowseCategory}
                    selectedTiers={browseViewState.selectedTiers}
                    onToggleTier={toggleBrowseQualityTier}
                    minRating={browseViewState.minRating}
                    onMinRatingChange={setBrowseMinRating}
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

        {/* Row 2: Source state and data controls */}
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2 text-xs">
            <Badge
              variant={sourceState === 'remote' ? 'secondary' : 'outline'}
              className={cn(
                'gap-1.5',
                sourceState === 'remote' && 'text-emerald-700 dark:text-emerald-400'
              )}
            >
              {sourceState === 'remote' ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              {sourceState === 'remote' ? t('source.remote') : t('source.fallback')}
            </Badge>
            {sourceWarning ? (
              <span className="flex min-w-0 items-center gap-1 text-amber-700 dark:text-amber-300">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span className="truncate">{sourceWarning}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">{t('source.healthy')}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('source.remoteFirst')}</span>
            <Switch
              checked={remoteFirstEnabled}
              onCheckedChange={handleRemoteFirstToggle}
              disabled={isRefreshingCatalog}
              aria-label={t('source.remoteFirst')}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={handleRefreshCatalog}
              disabled={isRefreshingCatalog}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isRefreshingCatalog && 'animate-spin')} />
              {t('source.refresh')}
            </Button>
          </div>
        </div>

        {/* Row 2: Search & Sort (browse tab only) */}
        {activeTab === 'browse' && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={t('search.placeholder')}
                value={browseViewState.query}
                onChange={(e) => setBrowseQuery(e.target.value)}
                className="pl-8 pr-8 h-8 text-sm bg-muted/30 border-muted-foreground/20 focus-visible:bg-background focus-visible:border-primary/40 transition-all"
              />
              {browseViewState.query && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() => setBrowseQuery('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            <Select
              value={browseViewState.sortBy}
              onValueChange={(v) => setBrowseSortBy(v as NonNullable<MarketplaceSearchFilters['sortBy']>)}
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
            {browseViewState.category !== 'all' && (
              <Badge
                variant="secondary"
                className="shrink-0 gap-1 pl-2 pr-1 py-0.5 text-xs cursor-pointer hover:bg-secondary/80"
                onClick={() => setBrowseCategory('all')}
              >
                {browseViewState.category}
                <X className="h-3 w-3" />
              </Badge>
            )}
            {browseViewState.selectedTiers.map((tier) => (
              <Badge
                key={tier}
                variant="secondary"
                className="shrink-0 gap-1 pl-2 pr-1 py-0.5 text-xs cursor-pointer hover:bg-secondary/80"
                onClick={() => toggleBrowseQualityTier(tier)}
              >
                {tier}
                <X className="h-3 w-3" />
              </Badge>
            ))}
            {browseViewState.minRating > 0 && (
              <Badge
                variant="secondary"
                className="shrink-0 gap-1 pl-2 pr-1 py-0.5 text-xs cursor-pointer hover:bg-secondary/80"
                onClick={() => setBrowseMinRating(0)}
              >
                {browseViewState.minRating}+ ★
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

      {activeTab === 'browse' && listError?.status === 'error' && (
        <div className="mx-3 mt-3 lg:mx-4 rounded-lg border border-amber-300/60 bg-amber-50/90 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{t(listErrorMessageKey)}</p>
              {listError.error && <p className="mt-0.5 truncate text-amber-800/90 dark:text-amber-200/90">{listError.error}</p>}
            </div>
            {listError.retryable !== false && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[11px]"
                onClick={handleRefreshCatalog}
              >
                {t('errors.retry')}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Scrollable Content */}
      <div
        ref={contentContainerRef}
        className="flex-1 overflow-y-auto"
        onScroll={(event) => {
          if (activeTab === 'browse' && !browseViewState.detailOpen) {
            setBrowseScrollOffset(event.currentTarget.scrollTop);
          }
        }}
      >
        <div className="p-3 lg:p-4 space-y-5">
          {activeTab === 'browse' && (
            <div
              data-testid="prompt-marketplace-browse-layout"
              className={cn(
                'grid grid-cols-1 gap-4 xl:grid-cols-[260px_minmax(0,1fr)]',
                showPersistentInspector && '2xl:grid-cols-[260px_minmax(0,1fr)_320px]'
              )}
            >
              <PromptMarketplaceSidebar
                selectedCategory={browseViewState.category}
                onSelectCategory={setBrowseCategory}
                selectedTiers={browseViewState.selectedTiers}
                onToggleTier={toggleBrowseQualityTier}
                minRating={browseViewState.minRating}
                onMinRatingChange={setBrowseMinRating}
                categoryCounts={categoryCounts}
                className="hidden xl:flex xl:sticky xl:top-0 xl:self-start xl:max-h-[calc(100vh-13.5rem)]"
              />

              <div data-testid="prompt-marketplace-browse-region" className="min-w-0 space-y-4">
                {selectedPrompt && usesDialogDetail && (
                  <div
                    data-testid="prompt-marketplace-selected-summary"
                    className="flex items-center justify-between gap-3 rounded-2xl border bg-muted/20 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t('inspector.title')}
                      </p>
                      <p className="truncate text-sm font-semibold">{selectedPrompt.name}</p>
                    </div>
                    <Button
                      size="sm"
                      className="shrink-0 gap-2"
                      onClick={() => setDetailOpen(true)}
                    >
                      <Search className="h-3.5 w-3.5" />
                      {t('inspector.openDetail')}
                    </Button>
                  </div>
                )}

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
              </div>

              {showPersistentInspector && (
                <PromptMarketplaceInspector
                  prompt={selectedPrompt}
                  retryContext={selectedPrompt ? installRetryContexts[selectedPrompt.id] : undefined}
                  className="hidden 2xl:block 2xl:sticky 2xl:top-0 2xl:self-start 2xl:max-h-[calc(100vh-13.5rem)]"
                  onOpenDetail={() => setDetailOpen(true)}
                  onViewAuthor={handleViewAuthor}
                />
              )}
            </div>
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
      </div>

      {/* Detail Dialog */}
      <PromptMarketplaceDetail
        prompt={selectedPrompt}
        open={browseViewState.detailOpen && !!selectedPrompt}
        onOpenChange={setDetailOpen}
        onViewAuthor={handleViewAuthor}
        onContinueEditing={onContinueEditing}
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
