'use client';

/**
 * Skills Marketplace Component
 * Browse and install skills from SkillsMP marketplace
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Search,
  Sparkles,
  RefreshCw,
  Star,
  Clock,
  AlertCircle,
  Key,
  Grid3X3,
  List,
  X,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toaster';
import { useSkillMarketplace } from '@/hooks/skills/use-skill-marketplace';
import { useNativeSkills, useNativeSkillAvailable, type AddSkillRepoInput } from '@/hooks/skills';
import { SkillMarketplaceCard } from './skill-marketplace-card';
import { SkillMarketplaceDetail } from './skill-marketplace-detail';
import { SkillRepoManagerDialog } from './skill-repo-manager-dialog';
import type { SkillsMarketplaceSortOption } from '@/types/skill/skill-marketplace';

interface SkillMarketplaceProps {
  className?: string;
}

export function SkillMarketplace({ className }: SkillMarketplaceProps) {
  const t = useTranslations('skills');
  const isNativeSkillEnabled = useNativeSkillAvailable();

  const {
    itemsWithStatus,
    filters,
    isLoading,
    error,
    hasApiKey,
    apiKey,
    currentPage,
    totalPages,
    totalItems,
    selectedItem,
    selectedDetail,
    isLoadingDetail,
    viewMode,
    searchHistory,
    search,
    aiSearch,
    install,
    setFilters,
    selectItem,
    fetchItemDetail,
    setApiKey,
    clearError,
    toggleFavorite,
    isFavorite,
    favoritesCount,
    setCurrentPage,
    setViewMode,
  } = useSkillMarketplace();
  const {
    repos,
    addRepo,
    removeRepo,
    toggleRepo,
    discover: discoverRepoSkills,
  } = useNativeSkills();

  const [searchQuery, setSearchQuery] = useState(filters.query);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(apiKey || '');
  const [useAiSearch, setUseAiSearch] = useState(filters.useAiSearch);

  const handleAddRepo = useCallback(
    async (input: AddSkillRepoInput) => {
      await addRepo(input);
      await discoverRepoSkills();
    },
    [addRepo, discoverRepoSkills]
  );

  // Handle search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    if (!hasApiKey) {
      setShowApiKeyDialog(true);
      return;
    }

    setFilters({ query: searchQuery, useAiSearch });
    if (useAiSearch) {
      await aiSearch(searchQuery);
    } else {
      await search(searchQuery);
    }
  }, [searchQuery, hasApiKey, useAiSearch, setFilters, aiSearch, search]);

  // Handle enter key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    },
    [handleSearch]
  );

  // Handle sort change
  const handleSortChange = useCallback(
    (sort: SkillsMarketplaceSortOption) => {
      setFilters({ sortBy: sort });
      if (searchQuery.trim()) {
        search(searchQuery);
      }
    },
    [setFilters, search, searchQuery]
  );

  // Handle API key save
  const handleSaveApiKey = useCallback(() => {
    setApiKey(apiKeyInput.trim() || null);
    setShowApiKeyDialog(false);
    toast.success(t('marketplace.apiKeySaved'));
  }, [apiKeyInput, setApiKey, t]);

  // Handle install
  const handleInstall = useCallback(
    async (itemId: string) => {
      const item = itemsWithStatus.find((i) => i.id === itemId);
      if (!item) return;

      const success = await install(item);
      if (success) {
        toast.success(t('marketplace.installSuccess'));
      } else {
        toast.error(t('marketplace.installFailed'));
      }
    },
    [itemsWithStatus, install, t]
  );

  // Handle item click for detail
  const handleItemClick = useCallback(
    async (itemId: string) => {
      const item = itemsWithStatus.find((i) => i.id === itemId);
      if (item) {
        selectItem(item);
        await fetchItemDetail(itemId);
      }
    },
    [itemsWithStatus, selectItem, fetchItemDetail]
  );


  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with search */}
      <div className="flex flex-col gap-4">
        {/* Search bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('marketplace.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9 pr-20"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Button
                variant={useAiSearch ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setUseAiSearch(!useAiSearch)}
                title={t('marketplace.aiSearchTooltip')}
              >
                <Sparkles className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <Button onClick={handleSearch} disabled={isLoading || !searchQuery.trim()}>
            {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : t('marketplace.search')}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowApiKeyDialog(true)}
            title={t('marketplace.configureApiKey')}
          >
            <Key className={cn('h-4 w-4', hasApiKey && 'text-green-500')} />
          </Button>
          {isNativeSkillEnabled && (
            <SkillRepoManagerDialog
              repos={repos}
              onAddRepo={handleAddRepo}
              onRemoveRepo={removeRepo}
              onToggleRepo={toggleRepo}
            />
          )}
        </div>

        {/* Filters row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Sort tabs */}
            <Tabs value={filters.sortBy} onValueChange={(v) => handleSortChange(v as SkillsMarketplaceSortOption)}>
              <TabsList className="h-8">
                <TabsTrigger value="stars" className="text-xs h-7 px-3">
                  <Star className="h-3 w-3 mr-1" />
                  {t('marketplace.sortStars')}
                </TabsTrigger>
                <TabsTrigger value="recent" className="text-xs h-7 px-3">
                  <Clock className="h-3 w-3 mr-1" />
                  {t('marketplace.sortRecent')}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Result count */}
            {totalItems > 0 && (
              <Badge variant="secondary" className="text-xs">
                {totalItems.toLocaleString()} {t('marketplace.results')}
              </Badge>
            )}

            {/* Favorites count */}
            {favoritesCount > 0 && (
              <Badge variant="outline" className="text-xs">
                <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                {favoritesCount}
              </Badge>
            )}
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1">
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
      </div>

      {/* Error alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={clearError}>
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* API Key required notice */}
      {!hasApiKey && (
        <Alert>
          <Key className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{t('marketplace.apiKeyRequired')}</span>
            <Button variant="outline" size="sm" onClick={() => setShowApiKeyDialog(true)}>
              <Settings className="h-4 w-4 mr-1" />
              {t('marketplace.configure')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Skills grid/list */}
      <ScrollArea className="max-h-[60vh]">
        {isLoading && itemsWithStatus.length === 0 ? (
          <div className={cn('gap-4', viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col')}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-4 border rounded-lg">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-3" />
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        ) : itemsWithStatus.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">{t('marketplace.noResults')}</p>
            <p className="text-sm mt-1">
              {searchQuery
                ? t('marketplace.tryDifferentSearch')
                : t('marketplace.startSearching')}
            </p>
            {searchHistory.length > 0 && (
              <div className="mt-4">
                <p className="text-xs mb-2">{t('marketplace.recentSearches')}</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {searchHistory.slice(0, 5).map((query) => (
                    <Button
                      key={query}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setSearchQuery(query);
                        search(query);
                      }}
                    >
                      {query}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={cn('gap-4', viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col')}>
            {itemsWithStatus.map((item) => (
              <SkillMarketplaceCard
                key={item.id}
                item={item}
                viewMode={viewMode}
                onInstall={() => handleInstall(item.id)}
                onClick={() => handleItemClick(item.id)}
                onToggleFavorite={() => toggleFavorite(item.id)}
                isFavorite={isFavorite(item.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            {t('marketplace.previous')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            {t('marketplace.next')}
          </Button>
        </div>
      )}

      {/* Skill detail dialog */}
      {selectedItem && (
        <SkillMarketplaceDetail
          item={selectedItem}
          detail={selectedDetail}
          isLoading={isLoadingDetail}
          isOpen={!!selectedItem}
          onClose={() => selectItem(null)}
          onInstall={() => handleInstall(selectedItem.id)}
        />
      )}

      {/* API Key dialog */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('marketplace.apiKeyTitle')}</DialogTitle>
            <DialogDescription>
              {t('marketplace.apiKeyDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">{t('marketplace.apiKey')}</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="sk_live_..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('marketplace.apiKeyHelp')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApiKeyDialog(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSaveApiKey}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SkillMarketplace;
