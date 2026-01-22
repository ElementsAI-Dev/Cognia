/**
 * Plugin Settings Page
 * Comprehensive plugin management interface with tabs for different sections
 * Enhanced with marketplace, favorites, quick actions, and improved responsiveness
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Puzzle,
  Plus,
  RefreshCw,
  Settings2,
  BarChart3,
  Code2,
  FolderOpen,
  Search,
  Filter,
  LayoutGrid,
  List,
  Download,
  Upload,
  Heart,
  MoreHorizontal,
  Store,
  Sparkles,
  Shield,
  Zap,
  CheckCircle,
  AlertCircle,
  Package,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { PluginList } from '../core/plugin-list';
import { PluginEmptyState } from '../core/plugin-empty-state';
import { PluginGroupedList } from '../core/plugin-grouped-list';
import { PluginAnalytics } from '../monitoring/plugin-analytics';
import { PluginCreateWizard } from './plugin-create-wizard';
import { PluginDevTools } from '../dev/plugin-dev-tools';
import { PluginHealth } from '../monitoring/plugin-health';
import { PluginDependencyTree } from '../monitoring/plugin-dependency-tree';
import { PluginConflicts } from '../monitoring/plugin-conflicts';
import { PluginUpdates } from '../monitoring/plugin-updates';
import { PluginMarketplace, PluginDetailModal, type MarketplacePlugin } from '../marketplace';
import { usePluginStore } from '@/stores/plugin';
import { usePlugins } from '@/hooks/plugin';
import type { PluginCapability, PluginType } from '@/types/plugin';
import type { PluginScaffoldOptions } from '@/lib/plugin/templates';
import { getPluginManager } from '@/lib/plugin';
import { toast } from '@/components/ui/sonner';
import { isTauri as detectTauri } from '@/lib/native/utils';
import { openDirectory } from '@/lib/native/opener';
import { open } from '@tauri-apps/plugin-dialog';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

type ViewMode = 'grid' | 'list';
type SortOption = 'name' | 'recent' | 'status';
type FilterOption = 'all' | 'enabled' | 'disabled' | 'error';

interface PluginSettingsPageProps {
  className?: string;
}

// =============================================================================
// Main Component
// =============================================================================

export function PluginSettingsPage({ className }: PluginSettingsPageProps) {
  const t = useTranslations('pluginSettings');
  const { plugins, enabledPlugins, disabledPlugins, errorPlugins, initialized } = usePlugins();
  const { pluginDirectory, scanPlugins, enablePlugin, disablePlugin, uninstallPlugin } = usePluginStore();
  
  const [activeTab, setActiveTab] = useState('installed');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [typeFilter, setTypeFilter] = useState<PluginType | 'all'>('all');
  const [capabilityFilter, setCapabilityFilter] = useState<PluginCapability | 'all'>('all');
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedMarketplacePlugin, setSelectedMarketplacePlugin] = useState<MarketplacePlugin | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPlugins, setSelectedPlugins] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<'none' | 'type' | 'capability' | 'status'>('none');

  // Stats for hero section
  const totalTools = plugins.reduce((acc, p) => acc + (p.tools?.length || 0), 0);
  const healthScore = errorPlugins.length === 0 ? 100 : Math.round((1 - errorPlugins.length / Math.max(plugins.length, 1)) * 100);

  // Filter and sort plugins
  const filteredPlugins = plugins.filter(plugin => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        plugin.manifest.name.toLowerCase().includes(query) ||
        plugin.manifest.description?.toLowerCase().includes(query) ||
        plugin.manifest.id.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Status filter
    if (filterBy === 'enabled' && plugin.status !== 'enabled') return false;
    if (filterBy === 'disabled' && plugin.status !== 'disabled' && plugin.status !== 'loaded') return false;
    if (filterBy === 'error' && plugin.status !== 'error') return false;

    // Type filter
    if (typeFilter !== 'all' && plugin.manifest.type !== typeFilter) return false;

    // Capability filter
    if (capabilityFilter !== 'all' && !plugin.manifest.capabilities.includes(capabilityFilter)) return false;

    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.manifest.name.localeCompare(b.manifest.name);
      case 'recent':
        return 0; // TODO: Add timestamp tracking to Plugin type
      case 'status':
        return a.status.localeCompare(b.status);
      default:
        return 0;
    }
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K - Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('plugin-search');
        searchInput?.focus();
      }
      // Cmd/Ctrl + Shift + S - Toggle selection mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 's') {
        e.preventDefault();
        setIsSelectionMode(prev => !prev);
        if (isSelectionMode) setSelectedPlugins(new Set());
      }
      // Escape - Exit selection mode or clear search
      if (e.key === 'Escape') {
        if (isSelectionMode) {
          setIsSelectionMode(false);
          setSelectedPlugins(new Set());
        } else if (searchQuery) {
          setSearchQuery('');
        }
      }
      // Cmd/Ctrl + A - Select all (when in selection mode)
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && isSelectionMode && activeTab === 'installed') {
        e.preventDefault();
        setSelectedPlugins(new Set(filteredPlugins.map(p => p.manifest.id)));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelectionMode, searchQuery, activeTab, filteredPlugins]);

  // Batch operation handlers
  const handleBatchEnable = useCallback(async () => {
    for (const id of selectedPlugins) {
      try {
        const manager = getPluginManager();
        await manager.enablePlugin(id);
      } catch {
        await enablePlugin(id);
      }
    }
    setSelectedPlugins(new Set());
  }, [selectedPlugins, enablePlugin]);

  const handleBatchDisable = useCallback(async () => {
    for (const id of selectedPlugins) {
      try {
        const manager = getPluginManager();
        await manager.disablePlugin(id);
      } catch {
        await disablePlugin(id);
      }
    }
    setSelectedPlugins(new Set());
  }, [selectedPlugins, disablePlugin]);

  const handleBatchUninstall = useCallback(async () => {
    for (const id of selectedPlugins) {
      try {
        const manager = getPluginManager();
        await manager.uninstallPlugin(id);
      } catch {
        await uninstallPlugin(id);
      }
    }
    setSelectedPlugins(new Set());
    setIsSelectionMode(false);
  }, [selectedPlugins, uninstallPlugin]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (!initialized) {
        toast.error('Plugins are not initialized yet');
        return;
      }
      try {
        const manager = getPluginManager();
        await manager.scanPlugins();
      } catch {
        await scanPlugins();
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [initialized, scanPlugins]);

  const handleInstallFromGitUrl = useCallback(async () => {
    if (!detectTauri()) {
      toast.error('Plugin installation requires desktop environment');
      return;
    }

    const url = window.prompt('Git repository URL');
    if (!url) return;

    try {
      const manager = getPluginManager();
      await manager.installPlugin(url, { type: 'git' });
      await handleRefresh();
      toast.success('Plugin installed');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || 'Plugin install failed');
      console.error('Failed to install plugin from git:', error);
    }
  }, [handleRefresh]);

  const handleCreateComplete = useCallback(
    (_files: Map<string, string>, _options: PluginScaffoldOptions) => {
      // In a real implementation, this would save files to the plugins directory
      // For now, just show success and refresh
      handleRefresh();
    },
    [handleRefresh]
  );

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header - Responsive */}
      <div className="flex flex-col gap-3 p-4 border-b sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Puzzle className="h-5 w-5 sm:h-6 sm:w-6" />
          <div>
            <h1 className="text-lg font-semibold sm:text-xl">{t('title')}</h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              {t('enabledCount', { count: enabledPlugins.length })} · {t('installedCount', { count: plugins.length })}
            </p>
          </div>
        </div>

        {/* Desktop buttons */}
        <div className="hidden sm:flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
            {t('refresh')}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                {t('import')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                <FolderOpen className="h-4 w-4 mr-2" />
                {t('fromFolder')}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Upload className="h-4 w-4 mr-2" />
                {t('fromZip')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleInstallFromGitUrl}>
                <Code2 className="h-4 w-4 mr-2" />
                {t('fromGitUrl')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="sm" onClick={() => setIsCreateWizardOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('createPlugin')}
          </Button>
        </div>

        {/* Mobile buttons */}
        <div className="flex items-center gap-2 sm:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex-1"
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
            {t('refresh')}
          </Button>
          
          <Button size="sm" onClick={() => setIsCreateWizardOpen(true)} className="flex-1">
            <Plus className="h-4 w-4 mr-2" />
            {t('createPlugin')}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="px-2">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <FolderOpen className="h-4 w-4 mr-2" />
                {t('fromFolder')}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Upload className="h-4 w-4 mr-2" />
                {t('fromZip')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleInstallFromGitUrl}>
                <Code2 className="h-4 w-4 mr-2" />
                {t('fromGitUrl')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Quick Stats Cards - Hero Section */}
      <div className="grid grid-cols-2 gap-2 p-3 sm:p-4 sm:grid-cols-4 sm:gap-3 border-b bg-gradient-to-br from-primary/5 via-background to-background">
        <Card className="group hover:border-primary/50 transition-colors">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{t('stats.installed')}</p>
                <p className="text-xl sm:text-2xl font-bold">{plugins.length}</p>
              </div>
              <Package className="h-6 w-6 sm:h-8 sm:w-8 text-primary/50 group-hover:text-primary transition-colors" />
            </div>
          </CardContent>
        </Card>
        <Card className="group hover:border-green-500/50 transition-colors">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{t('stats.enabled')}</p>
                <p className="text-xl sm:text-2xl font-bold text-green-500">{enabledPlugins.length}</p>
              </div>
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-500/50 group-hover:text-green-500 transition-colors" />
            </div>
          </CardContent>
        </Card>
        <Card className="group hover:border-blue-500/50 transition-colors">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{t('stats.tools')}</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-500">{totalTools}</p>
              </div>
              <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500/50 group-hover:text-blue-500 transition-colors" />
            </div>
          </CardContent>
        </Card>
        <Card className="group hover:border-primary/50 transition-colors">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{t('stats.health')}</p>
                <div className="flex items-center gap-2">
                  <p className={cn('text-xl sm:text-2xl font-bold', healthScore >= 80 ? 'text-green-500' : healthScore >= 50 ? 'text-yellow-500' : 'text-red-500')}>
                    {healthScore}%
                  </p>
                </div>
              </div>
              <Shield className={cn('h-6 w-6 sm:h-8 sm:w-8 transition-colors', healthScore >= 80 ? 'text-green-500/50 group-hover:text-green-500' : healthScore >= 50 ? 'text-yellow-500/50 group-hover:text-yellow-500' : 'text-red-500/50 group-hover:text-red-500')} />
            </div>
            {errorPlugins.length > 0 && (
              <div className="mt-1 flex items-center gap-1 text-[10px] text-red-500">
                <AlertCircle className="h-3 w-3" />
                <span>{errorPlugins.length} errors</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs - Responsive with horizontal scroll on mobile */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b px-2 sm:px-4 overflow-x-auto scrollbar-none">
          <TabsList className="h-10 sm:h-12 w-max sm:w-auto inline-flex">
            <TabsTrigger value="installed" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 sm:px-3">
              <Puzzle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">{t('tabs.installed')}</span>
              <span className="xs:hidden">插件</span>
              <Badge variant="secondary" className="ml-1 text-xs">
                {plugins.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 sm:px-3">
              <Store className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('tabs.marketplace')}</span>
              <span className="sm:hidden">商店</span>
              <Sparkles className="h-3 w-3 text-yellow-500 hidden sm:block" />
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 sm:px-3">
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('tabs.analytics')}</span>
              <span className="sm:hidden">统计</span>
            </TabsTrigger>
            <TabsTrigger value="develop" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 sm:px-3">
              <Code2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('tabs.develop')}</span>
              <span className="sm:hidden">开发</span>
            </TabsTrigger>
            <TabsTrigger value="health" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 sm:px-3">
              <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('tabs.health')}</span>
              <span className="sm:hidden">健康</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 sm:px-3">
              <Settings2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('tabs.settings')}</span>
              <span className="sm:hidden">设置</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Installed Plugins Tab */}
        <TabsContent value="installed" className="flex-1 flex flex-col m-0">
          {/* Filters Bar - Responsive */}
          <div className="flex flex-wrap items-center gap-2 p-3 sm:p-4 border-b bg-muted/30">
            {/* Search - Full width on mobile */}
            <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="plugin-search"
                placeholder={t('filters.searchPlaceholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-14 h-9"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                <span>⌘</span><span>K</span>
              </div>
            </div>

            {/* Selection Mode Toggle */}
            <Button
              variant={isSelectionMode ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                if (isSelectionMode) setSelectedPlugins(new Set());
              }}
              className="h-9 gap-1.5 hidden sm:flex"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{isSelectionMode ? t('filters.exitSelect') : t('filters.select')}</span>
            </Button>

            {/* Filters group - Collapsible on mobile */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Select value={filterBy} onValueChange={v => setFilterBy(v as FilterOption)}>
                <SelectTrigger className="h-9 w-[calc(50%-4px)] sm:w-[120px]">
                  <Filter className="h-3.5 w-3.5 mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.allStatus')}</SelectItem>
                  <SelectItem value="enabled">{t('filters.enabled')}</SelectItem>
                  <SelectItem value="disabled">{t('filters.disabled')}</SelectItem>
                  <SelectItem value="error">{t('filters.error')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={v => setTypeFilter(v as PluginType | 'all')}>
                <SelectTrigger className="h-9 w-[calc(50%-4px)] sm:w-[110px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.allTypes')}</SelectItem>
                  <SelectItem value="frontend">{t('filters.frontend')}</SelectItem>
                  <SelectItem value="python">{t('filters.python')}</SelectItem>
                  <SelectItem value="hybrid">{t('filters.hybrid')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={capabilityFilter} onValueChange={v => setCapabilityFilter(v as PluginCapability | 'all')}>
                <SelectTrigger className="h-9 w-[calc(50%-4px)] sm:w-[120px] hidden sm:flex">
                  <SelectValue placeholder="Capability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.allCapabilities')}</SelectItem>
                  <SelectItem value="tools">{t('filters.tools')}</SelectItem>
                  <SelectItem value="components">{t('filters.components')}</SelectItem>
                  <SelectItem value="modes">{t('filters.modes')}</SelectItem>
                  <SelectItem value="commands">{t('filters.commands')}</SelectItem>
                  <SelectItem value="hooks">{t('filters.hooks')}</SelectItem>
                </SelectContent>
              </Select>

              {/* Group by dropdown */}
              <Select value={groupBy} onValueChange={v => setGroupBy(v as 'none' | 'type' | 'capability' | 'status')}>
                <SelectTrigger className="h-9 w-[calc(50%-4px)] sm:w-[110px] hidden sm:flex">
                  <Layers className="h-3.5 w-3.5 mr-1.5" />
                  <SelectValue placeholder="Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('filters.noGroup')}</SelectItem>
                  <SelectItem value="type">{t('filters.groupByType')}</SelectItem>
                  <SelectItem value="capability">{t('filters.groupByCapability')}</SelectItem>
                  <SelectItem value="status">{t('filters.groupByStatus')}</SelectItem>
                </SelectContent>
              </Select>

              {/* View mode toggle */}
              <div className="flex items-center border rounded-md h-9 ml-auto sm:ml-0">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="rounded-r-none h-full px-2.5"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="h-4 w-4" />
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

              <Select value={sortBy} onValueChange={v => setSortBy(v as SortOption)}>
                <SelectTrigger className="h-9 w-[calc(50%-4px)] sm:w-[110px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">{t('filters.sortByName')}</SelectItem>
                  <SelectItem value="recent">{t('filters.sortByRecent')}</SelectItem>
                  <SelectItem value="status">{t('filters.sortByStatus')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Plugin List */}
          <ScrollArea className="flex-1 p-3 sm:p-4">
            {filteredPlugins.length === 0 ? (
              <PluginEmptyState
                variant={
                  searchQuery || typeFilter !== 'all' || capabilityFilter !== 'all'
                    ? 'no-results'
                    : filterBy === 'enabled'
                      ? 'no-enabled'
                      : filterBy === 'disabled'
                        ? 'no-disabled'
                        : filterBy === 'error'
                          ? 'no-results'
                          : 'no-plugins'
                }
                searchQuery={searchQuery}
                onCreatePlugin={() => setIsCreateWizardOpen(true)}
                onBrowseMarketplace={() => setActiveTab('marketplace')}
                onImportPlugin={() => {}}
                onClearFilters={() => {
                  setSearchQuery('');
                  setFilterBy('all');
                  setTypeFilter('all');
                  setCapabilityFilter('all');
                }}
              />
            ) : groupBy !== 'none' ? (
              <PluginGroupedList
                plugins={filteredPlugins}
                groupBy={groupBy}
                viewMode={viewMode}
                onToggle={(plugin) => {
                  try {
                    const manager = getPluginManager();
                    if (plugin.status === 'enabled') {
                      void manager.disablePlugin(plugin.manifest.id);
                    } else {
                      void manager.enablePlugin(plugin.manifest.id);
                    }
                    return;
                  } catch {
                    if (plugin.status === 'enabled') {
                      void disablePlugin(plugin.manifest.id);
                    } else {
                      void enablePlugin(plugin.manifest.id);
                    }
                  }
                }}
                onConfigure={() => {}}
                onUninstall={(plugin) => {
                  try {
                    const manager = getPluginManager();
                    void manager.uninstallPlugin(plugin.manifest.id);
                    return;
                  } catch {
                    void uninstallPlugin(plugin.manifest.id);
                  }
                }}
              />
            ) : (
              <PluginList
                plugins={filteredPlugins}
                viewMode={viewMode}
                onToggle={(plugin) => {
                  try {
                    const manager = getPluginManager();
                    if (plugin.status === 'enabled') {
                      void manager.disablePlugin(plugin.manifest.id);
                    } else {
                      void manager.enablePlugin(plugin.manifest.id);
                    }
                    return;
                  } catch {
                    if (plugin.status === 'enabled') {
                      void disablePlugin(plugin.manifest.id);
                    } else {
                      void enablePlugin(plugin.manifest.id);
                    }
                  }
                }}
                onConfigure={() => {}}
                onUninstall={(plugin) => {
                  try {
                    const manager = getPluginManager();
                    void manager.uninstallPlugin(plugin.manifest.id);
                    return;
                  } catch {
                    void uninstallPlugin(plugin.manifest.id);
                  }
                }}
                enableSelection={isSelectionMode}
                onBatchEnable={handleBatchEnable}
                onBatchDisable={handleBatchDisable}
                onBatchUninstall={handleBatchUninstall}
              />
            )}
          </ScrollArea>

          {/* Status Bar - Responsive */}
          <div className="flex flex-col gap-1 px-3 py-2 border-t bg-muted/30 text-xs sm:text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <span>{t('statusBar.pluginsShown', { count: filteredPlugins.length })}</span>
              {errorPlugins.length > 0 && (
                <Badge variant="destructive" className="text-xs">{t('statusBar.errors', { count: errorPlugins.length })}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span>{t('statusBar.enabledCount', { count: enabledPlugins.length })}</span>
              <span>{t('statusBar.disabledCount', { count: disabledPlugins.length })}</span>
            </div>
          </div>
        </TabsContent>

        {/* Marketplace Tab */}
        <TabsContent value="marketplace" className="flex-1 m-0 flex flex-col overflow-hidden">
          <PluginMarketplace
            onInstall={async (pluginId) => {
              if (!detectTauri()) {
                toast.error('Plugin installation requires desktop environment');
                return;
              }

              let selected: string | null = null;
              try {
                const picked = await open({
                  directory: true,
                  multiple: false,
                  title: 'Select Plugin Folder',
                });
                if (picked && typeof picked === 'string') {
                  selected = picked;
                }
              } catch {
                return;
              }

              if (!selected) return;

              try {
                const manager = getPluginManager();
                await manager.installPlugin(selected, { type: 'local', name: pluginId });
                await scanPlugins();
                toast.success('Plugin installed');
                setActiveTab('installed');
              } catch (error) {
                toast.error('Plugin install failed');
                console.error('Failed to install plugin:', error);
              }
            }}
            onViewDetails={(plugin) => {
              setSelectedMarketplacePlugin(plugin);
              setIsDetailModalOpen(true);
            }}
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="flex-1 m-0 p-3 sm:p-4 flex flex-col overflow-hidden">
          <PluginAnalytics className="flex-1 min-h-0" />
        </TabsContent>

        {/* Develop Tab */}
        <TabsContent value="develop" className="flex-1 m-0 flex flex-col overflow-hidden">
          <PluginDevTools className="flex-1 min-h-0" />
        </TabsContent>

        {/* Health & Monitoring Tab */}
        <TabsContent value="health" className="flex-1 m-0 p-3 sm:p-4 overflow-auto flex flex-col">
          <div className="space-y-3 sm:space-y-4 flex-1">
            {/* Updates Section - Stack on mobile */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <PluginUpdates autoCheck />
              <PluginConflicts autoDetect />
            </div>

            {/* Health Monitoring */}
            <PluginHealth autoRefresh refreshInterval={30000} />

            {/* Dependency Tree */}
            <PluginDependencyTree />
          </div>
        </TabsContent>

        {/* Settings Tab - Better space utilization */}
        <TabsContent value="settings" className="flex-1 m-0 p-3 sm:p-4 overflow-auto">
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h3 className="text-base sm:text-lg font-medium mb-2">{t('settingsTab.title')}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                {t('settingsTab.description')}
              </p>
            </div>

            {/* Settings Grid - 2 columns on large screens */}
            <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
              <div className="flex flex-col gap-3 p-3 sm:p-4 border rounded-lg sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm sm:text-base">{t('settingsTab.autoEnable')}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {t('settingsTab.autoEnableDesc')}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="self-start sm:self-center shrink-0">{t('settingsTab.configure')}</Button>
              </div>

              <div className="flex flex-col gap-3 p-3 sm:p-4 border rounded-lg sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm sm:text-base">{t('settingsTab.pluginDirectory')}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground font-mono truncate">
                    {pluginDirectory || '—'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start sm:self-center shrink-0"
                  onClick={async () => {
                    if (!pluginDirectory) {
                      toast.error('Plugin directory is not available');
                      return;
                    }

                    const result = await openDirectory(pluginDirectory);
                    if (!result.success) {
                      toast.error(result.error || 'Failed to open directory');
                    }
                  }}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  {t('settingsTab.open')}
                </Button>
              </div>

              <div className="flex flex-col gap-3 p-3 sm:p-4 border rounded-lg sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm sm:text-base">{t('settingsTab.pythonEnvironment')}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {t('settingsTab.pythonEnvironmentDesc')}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="self-start sm:self-center shrink-0">{t('settingsTab.configure')}</Button>
              </div>

              <div className="flex flex-col gap-3 p-3 sm:p-4 border rounded-lg sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm sm:text-base">{t('settingsTab.clearCache')}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {t('settingsTab.clearCacheDesc')}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="self-start sm:self-center shrink-0">{t('settingsTab.clearCacheBtn')}</Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Wizard Dialog */}
      <PluginCreateWizard
        open={isCreateWizardOpen}
        onOpenChange={setIsCreateWizardOpen}
        onComplete={handleCreateComplete}
      />

      {/* Plugin Detail Modal */}
      <PluginDetailModal
        plugin={selectedMarketplacePlugin}
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        onInstall={async (pluginId) => {
          if (!detectTauri()) {
            toast.error('Plugin installation requires desktop environment');
            return;
          }

          let selected: string | null = null;
          try {
            const picked = await open({
              directory: true,
              multiple: false,
              title: 'Select Plugin Folder',
            });
            if (picked && typeof picked === 'string') {
              selected = picked;
            }
          } catch {
            return;
          }

          if (!selected) return;

          try {
            const manager = getPluginManager();
            await manager.installPlugin(selected, { type: 'local', name: pluginId });
            await scanPlugins();
            toast.success('Plugin installed');
            setIsDetailModalOpen(false);
            setActiveTab('installed');
          } catch (error) {
            toast.error('Plugin install failed');
            console.error('Failed to install plugin:', error);
          }
        }}
      />
    </div>
  );
}

export default PluginSettingsPage;
