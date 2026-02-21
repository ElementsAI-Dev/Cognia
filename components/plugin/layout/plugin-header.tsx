'use client';

/**
 * PluginHeader - Sticky header with search, view toggle, and quick actions
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  Search,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  Download,
  FolderOpen,
  GitBranch,
  X,
  CheckSquare,
  Square,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type ViewMode = 'grid' | 'list';

interface PluginHeaderProps {
  /** Current search query */
  searchQuery: string;
  /** Callback when search query changes */
  onSearchChange: (query: string) => void;
  /** Current view mode */
  viewMode: ViewMode;
  /** Callback when view mode changes */
  onViewModeChange: (mode: ViewMode) => void;
  /** Callback for create plugin action */
  onCreatePlugin: () => void;
  /** Callback for import from folder action */
  onImportFromFolder?: () => void;
  /** Callback for import from git action */
  onImportFromGit?: () => void;
  /** Callback for refresh action */
  onRefresh: () => void;
  /** Whether refresh is in progress */
  isRefreshing?: boolean;
  /** Additional class names */
  className?: string;
  /** Total plugin count for display */
  pluginCount?: number;
  /** Whether selection mode is active */
  isSelectionMode?: boolean;
  /** Callback to toggle selection mode */
  onToggleSelectionMode?: () => void;
  /** Callback for mobile sidebar hamburger */
  onToggleMobileSidebar?: () => void;
}

export function PluginHeader({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onCreatePlugin,
  onImportFromFolder,
  onImportFromGit,
  onRefresh,
  isRefreshing = false,
  className,
  pluginCount = 0,
  isSelectionMode = false,
  onToggleSelectionMode,
  onToggleMobileSidebar,
}: PluginHeaderProps) {
  const t = useTranslations('pluginSettings');
  const [isSearchFocused, setIsSearchFocused] = React.useState(false);

  // Keyboard shortcut for search focus
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('plugin-search-input');
        searchInput?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-20 border-b',
        'bg-background/95 backdrop-blur-sm',
        'px-4 sm:px-6 py-3',
        className
      )}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Mobile sidebar hamburger */}
        {onToggleMobileSidebar && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:hidden shrink-0"
            onClick={onToggleMobileSidebar}
            aria-label="Toggle sidebar"
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}

        {/* Title - Hidden on mobile */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <div className="p-2 rounded-lg bg-primary/10">
            <Search className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate">{t('searchTitle')}</h1>
            {pluginCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {pluginCount} {t('pluginsAvailable')}
              </p>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div
          className={cn(
            'relative flex-1 max-w-md',
            'transition-all duration-200',
            isSearchFocused && 'max-w-lg'
          )}
        >
          <Search
            className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2',
              'h-4 w-4 text-muted-foreground pointer-events-none',
              'transition-colors',
              isSearchFocused && 'text-primary'
            )}
          />
          <Input
            id="plugin-search-input"
            placeholder={t('searchPlaceholder') || 'Search plugins...'}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className={cn(
              'pl-9 pr-16 h-9 text-sm',
              'transition-all duration-200',
              isSearchFocused && 'ring-2 ring-primary/20'
            )}
          />
          {/* Clear button */}
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-10 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => onSearchChange('')}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
          {/* Keyboard shortcut hint - Desktop only */}
          <kbd
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2',
              'pointer-events-none hidden lg:inline-flex',
              'h-5 items-center gap-0.5 rounded border bg-muted px-1.5',
              'font-mono text-[10px] text-muted-foreground'
            )}
          >
            <span className="text-xs">Ctrl</span>K
          </kbd>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Selection Mode Toggle */}
          {onToggleSelectionMode && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isSelectionMode ? 'secondary' : 'ghost'}
                  size="icon"
                  className={cn('h-8 w-8', isSelectionMode && 'bg-primary/10 text-primary')}
                  onClick={onToggleSelectionMode}
                  aria-pressed={isSelectionMode}
                >
                  {isSelectionMode ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isSelectionMode ? t('exitSelection') : t('selectPlugins')}</TooltipContent>
            </Tooltip>
          )}

          {/* View Toggle */}
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => value && onViewModeChange(value as ViewMode)}
            className="hidden sm:flex rounded-md border border-border/50 bg-muted/30 p-0.5"
          >
            <ToggleGroupItem
              value="grid"
              aria-label="Grid view"
              className="h-7 w-7 p-0 rounded data-[state=on]:bg-background data-[state=on]:shadow-sm"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="list"
              aria-label="List view"
              className="h-7 w-7 p-0 rounded data-[state=on]:bg-background data-[state=on]:shadow-sm"
            >
              <List className="h-3.5 w-3.5" />
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Create Button */}
          <Button
            size="sm"
            onClick={onCreatePlugin}
            className="h-8 px-3 text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">{t('createPlugin')}</span>
          </Button>

          {/* Import Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0 sm:w-auto sm:px-2.5">
                <Download className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline text-xs">{t('import')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onImportFromFolder && (
                <DropdownMenuItem onClick={onImportFromFolder} className="gap-2">
                  <FolderOpen className="h-4 w-4" />
                  {t('fromFolder')}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onImportFromGit && (
                <DropdownMenuItem onClick={onImportFromGit} className="gap-2">
                  <GitBranch className="h-4 w-4" />
                  {t('fromGitUrl')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Refresh Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={cn(
                    'h-3.5 w-3.5',
                    isRefreshing && 'animate-spin'
                  )}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('refresh')}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}

export default PluginHeader;
