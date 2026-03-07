'use client';

/**
 * ImageStudioHeader - Top toolbar for the Image Studio page
 * Contains: navigation, undo/redo, favorites, history, export, view mode, zoom, sidebar toggle
 */

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  ArrowLeft,
  Image as ImageIcon,
  Download,
  Grid3X3,
  LayoutGrid,
  History,
  Undo2,
  Redo2,
  Star,
  StarOff,
  PanelLeftClose,
  PanelLeft,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ZOOM_LEVELS } from '@/lib/image-studio';

export interface ImageStudioHeaderProps {
  /** Total number of generated images */
  imageCount: number;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Current view mode */
  viewMode: 'grid' | 'single';
  /** Current zoom level index */
  zoomLevel: number;
  /** Whether favorites filter is active */
  filterFavorites: boolean;
  /** Whether sidebar is visible */
  showSidebar: boolean;
  /** Whether history panel is visible */
  showHistory: boolean;
  // Callbacks
  onUndo: () => void;
  onRedo: () => void;
  onViewModeChange: (mode: 'grid' | 'single') => void;
  onZoomLevelChange: (level: number) => void;
  onFilterFavoritesChange: (value: boolean) => void;
  onShowSidebarChange: (value: boolean) => void;
  onShowHistoryChange: (value: boolean) => void;
  onExport: () => void;
  isGenerating?: boolean;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
}

export function ImageStudioHeader({
  imageCount,
  canUndo,
  canRedo,
  viewMode,
  zoomLevel,
  filterFavorites,
  showSidebar,
  showHistory,
  onUndo,
  onRedo,
  onViewModeChange,
  onZoomLevelChange,
  onFilterFavoritesChange,
  onShowSidebarChange,
  onShowHistoryChange,
  onExport,
  isGenerating,
  searchQuery = '',
  onSearchQueryChange,
}: ImageStudioHeaderProps) {
  const t = useTranslations('imageGeneration');

  return (
    <header className="relative flex items-center justify-between border-b px-4 py-2 shrink-0">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('back')}
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <ImageIcon className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-medium text-sm">{t('title')}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Undo/Redo */}
        <div className="flex items-center border rounded-md">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-r-none"
                onClick={onUndo}
                disabled={!canUndo}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('undo')} <kbd className="ml-1 text-[10px] opacity-60">Ctrl+Z</kbd></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-l-none border-l"
                onClick={onRedo}
                disabled={!canRedo}
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('redo')} <kbd className="ml-1 text-[10px] opacity-60">Ctrl+Y</kbd></TooltipContent>
          </Tooltip>
        </div>

        {/* Favorites filter */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={filterFavorites ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => onFilterFavoritesChange(!filterFavorites)}
            >
              {filterFavorites ? <Star className="h-4 w-4 mr-2 fill-current" /> : <StarOff className="h-4 w-4 mr-2" />}
              {t('favorites')}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{filterFavorites ? t('showAll') : t('showFavoritesOnly')} <kbd className="ml-1 text-[10px] opacity-60">F</kbd></TooltipContent>
        </Tooltip>

        {/* Search */}
        {onSearchQueryChange && (
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder={t('searchPlaceholder') ?? 'Search...'}
              className="h-8 w-40 pl-7 text-xs"
            />
          </div>
        )}

        {/* History */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onShowHistoryChange(!showHistory)}
        >
          <History className="h-4 w-4 mr-2" />
          {imageCount}
        </Button>

        {/* Export */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              disabled={imageCount === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              {t('export')}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('exportMultiple')}</TooltipContent>
        </Tooltip>

        {/* View mode toggle */}
        <div className="flex items-center border rounded-md">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8 rounded-r-none"
            onClick={() => onViewModeChange('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'single' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8 rounded-l-none border-l"
            onClick={() => onViewModeChange('single')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>

        {/* Zoom control */}
        {viewMode === 'grid' && (
          <div className="flex items-center gap-2 border rounded-md px-2">
            <span className="text-xs text-muted-foreground">{t('zoom')}</span>
            <div className="flex items-center">
              {ZOOM_LEVELS.map((level, idx) => (
                <Button
                  key={level.label}
                  variant={zoomLevel === idx ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-6 w-6 p-0 text-xs"
                  onClick={() => onZoomLevelChange(idx)}
                >
                  {level.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Sidebar toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onShowSidebarChange(!showSidebar)}
            >
              {showSidebar ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{showSidebar ? t('hideSidebar') : t('showSidebar')}</TooltipContent>
        </Tooltip>
      </div>
      {isGenerating && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted overflow-hidden">
          <div className="h-full bg-primary animate-pulse w-full" style={{ animation: 'indeterminate 1.5s infinite linear' }} />
        </div>
      )}
    </header>
  );
}
