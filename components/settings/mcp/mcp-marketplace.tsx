'use client';

/**
 * MCP Marketplace Component
 * Browse and install MCP servers from multiple marketplaces
 * Supports: Cline, Smithery, Glama
 */

import { useEffect, useState, useMemo, useCallback, memo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  Search,
  RefreshCw,
  Star,
  Download,
  AlertCircle,
  Loader2,
  Filter,
  X,
  Check,
  Key,
  Tag,
  SortAsc,
  Globe,
  Shield,
  Cloud,
  Heart,
  Grid3X3,
  List,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useMcpMarketplaceStore } from '@/stores/mcp';
import { useMcpStore } from '@/stores/mcp';
import type { McpMarketplaceItem, McpMarketplaceSortOption, McpMarketplaceSource } from '@/types/mcp-marketplace';
import { MARKETPLACE_SORT_OPTIONS, MARKETPLACE_SOURCES } from '@/types/mcp-marketplace';
import { formatDownloadCount, formatStarCount } from '@/lib/mcp/marketplace';
import { getSourceColor, highlightSearchQuery, type HighlightSegment } from '@/lib/mcp/marketplace-utils';
import { useDebounce } from '@/hooks';
import { McpMarketplaceDetailDialog } from './mcp-marketplace-detail-dialog';

function MarketplaceCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <Skeleton className="h-10 w-full" />
        <div className="flex gap-2 mt-2">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-12" />
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <div className="flex items-center justify-between w-full">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </CardFooter>
    </Card>
  );
}

interface MarketplaceCardProps {
  item: McpMarketplaceItem;
  isInstalled: boolean;
  installStatus: string;
  searchQuery: string;
  isFocused: boolean;
  onSelect: () => void;
  onInstall: () => void;
}

/** Render highlighted text */
function HighlightedText({ segments }: { segments: HighlightSegment[] }) {
  return (
    <>
      {segments.map((segment, i) =>
        segment.isHighlight ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
            {segment.text}
          </mark>
        ) : (
          <span key={i}>{segment.text}</span>
        )
      )}
    </>
  );
}

const MarketplaceCard = memo(function MarketplaceCard({
  item,
  isInstalled,
  installStatus,
  searchQuery,
  isFocused,
  onSelect,
  onInstall,
}: MarketplaceCardProps) {
  const t = useTranslations('mcpMarketplace');

  const isInstalling = installStatus === 'installing';

  // Memoize highlighted segments
  const nameSegments = useMemo(
    () => highlightSearchQuery(item.name, searchQuery),
    [item.name, searchQuery]
  );
  const descSegments = useMemo(
    () => highlightSearchQuery(item.description, searchQuery),
    [item.description, searchQuery]
  );

  return (
    <Card 
      className={`flex flex-col hover:shadow-md transition-shadow cursor-pointer ${isFocused ? 'ring-2 ring-primary' : ''}`}
      onClick={onSelect}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 min-w-0 flex-1">
            <CardTitle className="text-sm font-medium truncate flex items-center gap-1.5">
              <HighlightedText segments={nameSegments} />
              {item.verified && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Shield className="h-3 w-3 text-blue-500 shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent>{t('verified')}</TooltipContent>
                </Tooltip>
              )}
              {item.remote && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Cloud className="h-3 w-3 text-green-500 shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent>{t('remoteHosting')}</TooltipContent>
                </Tooltip>
              )}
            </CardTitle>
            <CardDescription className="text-xs truncate">
              {t('byAuthor', { author: item.author })}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {item.source && (
              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${getSourceColor(item.source)}`}>
                {item.source}
              </Badge>
            )}
            {isInstalled && (
              <Badge variant="secondary" className="text-[10px]">
                <Check className="h-3 w-3 mr-1" />
                {t('installed')}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-2 flex-1">
        <p className="text-xs text-muted-foreground line-clamp-2">
          <HighlightedText segments={descSegments} />
        </p>
        <div className="flex flex-wrap gap-1 mt-2">
          {item.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px]">
              {tag}
            </Badge>
          ))}
          {item.tags.length > 3 && (
            <Badge variant="outline" className="text-[10px]">
              +{item.tags.length - 3}
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-2 border-t">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1 cursor-help">
                  <Star className="h-3 w-3" />
                  {formatStarCount(item.githubStars)}
                </span>
              </TooltipTrigger>
              <TooltipContent>{t('githubStars')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1 cursor-help">
                  <Download className="h-3 w-3" />
                  {formatDownloadCount(item.downloadCount)}
                </span>
              </TooltipTrigger>
              <TooltipContent>{t('downloads')}</TooltipContent>
            </Tooltip>
            {item.requiresApiKey && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help">
                    <Key className="h-3 w-3 text-yellow-500" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>{t('requiresApiKey')}</TooltipContent>
              </Tooltip>
            )}
          </div>
          <Button
            size="sm"
            variant={isInstalled ? 'outline' : 'default'}
            className="h-7 text-xs"
            disabled={isInstalled || isInstalling}
            onClick={(e) => {
              e.stopPropagation();
              onInstall();
            }}
          >
            {isInstalling ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                {t('installing')}
              </>
            ) : isInstalled ? (
              t('installed')
            ) : (
              t('install')
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
});

export function McpMarketplace() {
  const t = useTranslations('mcpMarketplace');
  const tCommon = useTranslations('common');

  const {
    catalog,
    filters,
    isLoading,
    error,
    selectedItem,
    smitheryApiKey,
    currentPage,
    viewMode,
    showFavoritesOnly,
    fetchCatalog,
    setFilters,
    resetFilters,
    selectItem,
    getFilteredItems,
    getPaginatedItems,
    getTotalPages,
    getUniqueTags,
    getInstallStatus,
    setInstallStatus,
    setSmitheryApiKey,
    getSourceCount,
    getFavoritesCount,
    clearError,
    toggleFavorite,
    isFavorite,
    setShowFavoritesOnly,
    setCurrentPage,
    setViewMode,
  } = useMcpMarketplaceStore();

  const { servers } = useMcpStore();

  const [showFilters, setShowFilters] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(smitheryApiKey || '');
  const [localSearch, setLocalSearch] = useState(filters.search);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const gridRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  const debouncedSearch = useDebounce(localSearch, 300);

  // Sync debounced search to store
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      setFilters({ search: debouncedSearch });
    }
  }, [debouncedSearch, filters.search, setFilters]);

  // Fetch catalog on mount
  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  // Memoize filtered and paginated items
  const filteredItems = useMemo(() => getFilteredItems(), [getFilteredItems]);
  const paginatedItems = useMemo(() => getPaginatedItems(), [getPaginatedItems]);
  const totalPages = useMemo(() => getTotalPages(), [getTotalPages]);
  const availableTags = useMemo(() => getUniqueTags(), [getUniqueTags]);
  const favoritesCount = useMemo(() => getFavoritesCount(), [getFavoritesCount]);

  // Check if an item is installed by matching mcpId with server names
  const isItemInstalled = useCallback((mcpId: string): boolean => {
    return servers.some((server) => server.id === mcpId || server.name === mcpId);
  }, [servers]);

  const handleSelectItem = useCallback((item: McpMarketplaceItem) => {
    selectItem(item);
    setDetailDialogOpen(true);
  }, [selectItem]);

  const handleInstall = useCallback(async (item: McpMarketplaceItem) => {
    setInstallStatus(item.mcpId, 'installing');
    // The actual installation will be handled by the detail dialog
    selectItem(item);
    setDetailDialogOpen(true);
  }, [selectItem, setInstallStatus]);

  const handleTagToggle = useCallback((tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    setFilters({ tags: newTags });
  }, [filters.tags, setFilters]);

  const handleSourceChange = useCallback((source: McpMarketplaceSource) => {
    setFilters({ source });
  }, [setFilters]);

  // Keyboard navigation handler
  const handleGridKeyDown = useCallback((e: React.KeyboardEvent) => {
    const itemCount = paginatedItems.length;
    if (itemCount === 0) return;

    // Calculate columns based on viewport
    const columnsPerRow = window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1;
    let newIndex = focusedIndex;

    switch (e.key) {
      case 'ArrowRight':
        newIndex = Math.min(focusedIndex + 1, itemCount - 1);
        break;
      case 'ArrowLeft':
        newIndex = Math.max(focusedIndex - 1, 0);
        break;
      case 'ArrowDown':
        newIndex = Math.min(focusedIndex + columnsPerRow, itemCount - 1);
        break;
      case 'ArrowUp':
        newIndex = Math.max(focusedIndex - columnsPerRow, 0);
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = itemCount - 1;
        break;
      case 'Enter':
      case ' ':
        if (focusedIndex >= 0 && focusedIndex < itemCount) {
          e.preventDefault();
          handleSelectItem(paginatedItems[focusedIndex]);
        }
        return;
      default:
        return;
    }

    if (newIndex !== focusedIndex) {
      e.preventDefault();
      setFocusedIndex(newIndex);
    }
  }, [focusedIndex, paginatedItems, handleSelectItem]);

  const hasActiveFilters = filters.search || filters.tags.length > 0 || filters.requiresApiKey !== undefined || filters.verified !== undefined || filters.remote !== undefined || showFavoritesOnly;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-4">
        {/* Header */}
        <Alert className="bg-muted/30">
          <Globe className="h-4 w-4" />
          <AlertTitle className="text-sm">{t('title')}</AlertTitle>
          <AlertDescription className="text-xs">
            {t('description')}
          </AlertDescription>
        </Alert>

        {/* Source Selector Tabs */}
        <Tabs value={filters.source} onValueChange={(v) => handleSourceChange(v as McpMarketplaceSource)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="text-xs">
              {t('allSources')}
              {catalog && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1">{catalog.items.length}</Badge>}
            </TabsTrigger>
            {MARKETPLACE_SOURCES.filter(s => s.enabled).map((source) => (
              <TabsTrigger key={source.id} value={source.id} className="text-xs">
                {source.name}
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1">{getSourceCount(source.id)}</Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{tCommon('error')}</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="ghost" size="sm" onClick={clearError}>
                {t('dismiss')}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <InputGroup className="h-9">
              <InputGroupAddon align="inline-start">
                <Search className="h-4 w-4" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder={t('searchPlaceholder')}
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="text-sm"
              />
              {localSearch && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    onClick={() => {
                      setLocalSearch('');
                      setFilters({ search: '' });
                    }}
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
          </div>

          <div className="flex gap-2">
            {/* Sort Select */}
            <Select
              value={filters.sortBy}
              onValueChange={(value) => setFilters({ sortBy: value as McpMarketplaceSortOption })}
            >
              <SelectTrigger className="w-[130px] h-9">
                <SortAsc className="h-3.5 w-3.5 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MARKETPLACE_SORT_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {t(`sort.${option}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filter Popover */}
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5">
                  <Filter className="h-3.5 w-3.5" />
                  {t('filters')}
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="h-4 w-4 p-0 text-[10px]">
                      !
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5" />
                      {t('tags')}
                    </h4>
                    <ScrollArea className="h-32">
                      <div className="space-y-1">
                        {availableTags.map((tag) => (
                          <div key={tag} className="flex items-center gap-2">
                            <Checkbox
                              id={`tag-${tag}`}
                              checked={filters.tags.includes(tag)}
                              onCheckedChange={() => handleTagToggle(tag)}
                            />
                            <label
                              htmlFor={`tag-${tag}`}
                              className="text-xs cursor-pointer flex-1"
                            >
                              {tag}
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5" />
                      {t('apiKeyFilter')}
                    </h4>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="no-api-key"
                        checked={filters.requiresApiKey === false}
                        onCheckedChange={(checked) =>
                          setFilters({ requiresApiKey: checked ? false : undefined })
                        }
                      />
                      <label htmlFor="no-api-key" className="text-xs cursor-pointer">
                        {t('noApiKeyRequired')}
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5" />
                      {t('serverStatus')}
                    </h4>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="verified-only"
                          checked={filters.verified === true}
                          onCheckedChange={(checked) =>
                            setFilters({ verified: checked ? true : undefined })
                          }
                        />
                        <label htmlFor="verified-only" className="text-xs cursor-pointer">
                          {t('verifiedOnly')}
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="remote-only"
                          checked={filters.remote === true}
                          onCheckedChange={(checked) =>
                            setFilters({ remote: checked ? true : undefined })
                          }
                        />
                        <label htmlFor="remote-only" className="text-xs cursor-pointer flex items-center gap-1">
                          <Cloud className="h-3 w-3" />
                          {t('remoteOnly')}
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Smithery API Key Configuration */}
                  {showApiKeyInput && (
                    <div className="space-y-2 pt-2 border-t">
                      <h4 className="text-sm font-medium">{t('smitheryApiKey')}</h4>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={apiKeyInput}
                          onChange={(e) => setApiKeyInput(e.target.value)}
                          placeholder={t('enterApiKey')}
                          className="flex-1 h-8 px-2 text-xs border rounded-md bg-background"
                        />
                        <Button
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => {
                            setSmitheryApiKey(apiKeyInput || null);
                            setShowApiKeyInput(false);
                            fetchCatalog(true);
                          }}
                        >
                          {tCommon('save')}
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {t('smitheryApiKeyHint')}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                    >
                      <Key className="h-3 w-3 mr-1" />
                      {smitheryApiKey ? t('updateApiKey') : t('configureApiKey')}
                    </Button>
                  </div>

                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => {
                        resetFilters();
                        setShowFilters(false);
                      }}
                    >
                      {t('clearFilters')}
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Refresh Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => fetchCatalog(true)}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('refresh')}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Results count and view controls */}
        {catalog && (
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {t('resultsCount', { count: filteredItems.length, total: catalog.items.length })}
            </div>
            <div className="flex items-center gap-2">
              {/* Favorites Filter Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showFavoritesOnly ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 gap-1.5"
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  >
                    <Heart className={`h-3.5 w-3.5 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                    {favoritesCount > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1 h-4">
                        {favoritesCount}
                      </Badge>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('showFavoritesOnly')}</TooltipContent>
              </Tooltip>

              {/* View Mode Toggle */}
              <div className="flex border rounded-md">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                      size="icon"
                      className="h-7 w-7 rounded-r-none"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid3X3 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('gridView')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                      size="icon"
                      className="h-7 w-7 rounded-l-none"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('listView')}</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !catalog && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <MarketplaceCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && catalog && filteredItems.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <Search className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="font-medium mb-1 text-sm">{t('noResults')}</h3>
              <p className="text-xs text-muted-foreground mb-4">
                {t('noResultsDesc')}
              </p>
              {hasActiveFilters && (
                <Button size="sm" variant="outline" onClick={resetFilters}>
                  {t('clearFilters')}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Marketplace Grid */}
        {!isLoading && paginatedItems.length > 0 && (
          <div 
            ref={gridRef}
            className={viewMode === 'grid' 
              ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" 
              : "flex flex-col gap-2"
            }
            onKeyDown={handleGridKeyDown}
            role="grid"
            aria-label={t('title')}
          >
            {paginatedItems.map((item, index) => (
              <MarketplaceCard
                key={item.mcpId}
                item={item}
                isInstalled={isItemInstalled(item.mcpId)}
                installStatus={getInstallStatus(item.mcpId)}
                searchQuery={debouncedSearch}
                isFocused={focusedIndex === index}
                onSelect={() => handleSelectItem(item)}
                onInstall={() => handleInstall(item)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {tCommon('previous')}
            </Button>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted-foreground">{t('page')}</span>
              <Badge variant="secondary" className="font-mono">
                {currentPage}
              </Badge>
              <span className="text-muted-foreground">{t('of')}</span>
              <Badge variant="outline" className="font-mono">
                {totalPages}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              {tCommon('next')}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Detail Dialog */}
        <McpMarketplaceDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          item={selectedItem}
          isInstalled={selectedItem ? isItemInstalled(selectedItem.mcpId) : false}
          isFavorite={selectedItem ? isFavorite(selectedItem.mcpId) : false}
          onToggleFavorite={toggleFavorite}
        />
      </div>
    </TooltipProvider>
  );
}
