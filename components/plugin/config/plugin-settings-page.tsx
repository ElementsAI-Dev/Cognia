/**
 * Plugin Settings Page
 * Comprehensive plugin management interface with tabs for different sections
 * Refactored for consistency with other settings pages (MCP pattern)
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Puzzle,
  Plus,
  RefreshCw,
  FolderOpen,
  LayoutGrid,
  List,
  Download,
  Upload,
  Store,
  Zap,
  CheckCircle,
  AlertCircle,
  GitBranch,
  Activity,
  Code2,
  Heart,
  Settings2,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

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
import {
  PluginFilterBar,
  type FilterStatus,
  type FilterType,
  type FilterCapability,
  type SortOption,
} from './plugin-filter-bar';
import { PluginMarketplace, PluginDetailModal, type MarketplacePlugin } from '../marketplace';
import { usePluginStore } from '@/stores/plugin';
import { usePlugins } from '@/hooks/plugin';
import type { PluginCapability } from '@/types/plugin';
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

interface PluginSettingsPageProps {
  className?: string;
}

// =============================================================================
// Main Component
// =============================================================================

export function PluginSettingsPage({ className }: PluginSettingsPageProps) {
  const t = useTranslations('pluginSettings');
  const { plugins, enabledPlugins, errorPlugins, initialized } = usePlugins();
  const { pluginDirectory, scanPlugins, enablePlugin, disablePlugin, uninstallPlugin } =
    usePluginStore();

  const [activeTab, setActiveTab] = useState('my-plugins');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [_sortBy, _setSortBy] = useState<SortOption>('name');
  const [filterBy, setFilterBy] = useState<FilterStatus>('all');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [capabilityFilter, setCapabilityFilter] = useState<FilterCapability>('all');
  const [groupBy, _setGroupBy] = useState<'none' | 'type' | 'capability' | 'status'>('none');

  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedMarketplacePlugin, setSelectedMarketplacePlugin] =
    useState<MarketplacePlugin | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPlugins, setSelectedPlugins] = useState<Set<string>>(new Set());

  // Stats for hero section
  const totalTools = plugins.reduce((acc, p) => acc + (p.tools?.length || 0), 0);
  const healthScore =
    errorPlugins.length === 0
      ? 100
      : Math.round((1 - errorPlugins.length / Math.max(plugins.length, 1)) * 100);

  // Filter and sort plugins
  const filteredPlugins = plugins
    .filter((plugin) => {
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
      if (filterBy === 'disabled' && plugin.status !== 'disabled' && plugin.status !== 'loaded')
        return false;
      if (filterBy === 'error' && plugin.status !== 'error') return false;

      // Type filter
      if (typeFilter !== 'all' && plugin.manifest.type !== typeFilter) return false;

      // Capability filter
      // Note: strict typing might need adjustment if capabilities are complex strings
      if (
        capabilityFilter !== 'all' &&
        !plugin.manifest.capabilities.includes(capabilityFilter as PluginCapability)
      )
        return false;

      return true;
    })
    .sort((a, b) => {
      switch (_sortBy) {
        case 'name':
          return a.manifest.name.localeCompare(b.manifest.name);
        case 'recent':
          return 0; // TODO: Add timestamp tracking
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

  // Reset filters helper
  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setFilterBy('all');
    setTypeFilter('all');
    setCapabilityFilter('all');
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K - Focus search (handled by FilterBar input internally mostly, but global works too)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        // e.preventDefault(); // Let the FilterBar handle it or focus explicitly if needed
      }
      // Cmd/Ctrl + Shift + S - Toggle selection mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 's') {
        e.preventDefault();
        setIsSelectionMode((prev) => !prev);
        if (isSelectionMode) setSelectedPlugins(new Set());
      }
      // Escape - Exit selection mode
      if (e.key === 'Escape') {
        if (isSelectionMode) {
          setIsSelectionMode(false);
          setSelectedPlugins(new Set());
        }
      }
      // Cmd/Ctrl + A - Select all (when in selection mode)
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key === 'a' &&
        isSelectionMode &&
        activeTab === 'my-plugins'
      ) {
        e.preventDefault();
        setSelectedPlugins(new Set(filteredPlugins.map((p) => p.manifest.id)));
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
      handleRefresh();
    },
    [handleRefresh]
  );

  return (
    <TooltipProvider delayDuration={300}>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className={cn('space-y-4', className)}
      >
        {/* Tab Navigation - Consistent with MCP settings */}
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto gap-1 p-1">
          <TabsTrigger value="my-plugins" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-2">
            <Puzzle className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">{t('tabs.myPlugins')}</span>
            <span className="xs:hidden">插件</span>
            {plugins.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[9px] hidden sm:flex">
                {plugins.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="marketplace" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-2">
            <Store className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">{t('tabs.marketplace')}</span>
            <span className="xs:hidden">市场</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-2">
            <Activity className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('tabs.analytics')}</span>
            <span className="sm:hidden">分析</span>
          </TabsTrigger>
          <TabsTrigger value="develop" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-2">
            <Code2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('tabs.develop')}</span>
            <span className="sm:hidden">开发</span>
          </TabsTrigger>
          <TabsTrigger value="health" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-2">
            <Heart className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('tabs.health')}</span>
            <span className="sm:hidden">健康</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-2">
            <Settings2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('tabs.settings')}</span>
            <span className="sm:hidden">设置</span>
          </TabsTrigger>
        </TabsList>

        {/* My Plugins Tab */}
        <TabsContent value="my-plugins" className="space-y-4 mt-0">
          {/* Header Alert - Consistent with MCP settings */}
          <Alert className="bg-muted/30">
            <Puzzle className="h-4 w-4" />
            <AlertTitle className="text-sm">{t('title')}</AlertTitle>
            <AlertDescription className="text-xs">
              {t('description')}
              {plugins.length > 0 && (
                <span className="ml-1">
                  {t('enabledCount', { count: enabledPlugins.length })} / {plugins.length}
                </span>
              )}
            </AlertDescription>
          </Alert>

          {/* Quick Stats Bar */}
          {plugins.length > 0 && (
            <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="font-medium text-foreground">{healthScore}%</span>
                <span className="hidden sm:inline">Health</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">{totalTools}</span>
                <span className="hidden sm:inline">Tools</span>
              </div>
              {errorPlugins.length > 0 && (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  <div className="flex items-center gap-1.5 text-destructive">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span className="font-medium">{errorPlugins.length}</span>
                    <span className="hidden sm:inline">Errors</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Actions Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={() => setIsCreateWizardOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                {t('createPlugin')}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1.5" />
                    {t('import')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
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
                    <GitBranch className="h-4 w-4 mr-2" />
                    {t('fromGitUrl')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('refresh')}</TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-2">
              {/* Filter Bar */}
              <PluginFilterBar
                className="flex-1 sm:flex-initial"
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                statusFilter={filterBy}
                onStatusFilterChange={setFilterBy}
                typeFilter={typeFilter}
                onTypeFilterChange={setTypeFilter}
                capabilityFilter={capabilityFilter}
                onCapabilityFilterChange={setCapabilityFilter}
                onResetFilters={resetFilters}
                activeCount={filteredPlugins.length}
              />

              {/* View Mode Toggle */}
              <div className="flex items-center border rounded-md h-8 bg-background">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="rounded-r-none h-7 w-7 p-0"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="rounded-l-none h-7 w-7 p-0"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Selection Mode */}
              <Button
                variant={isSelectionMode ? 'secondary' : 'outline'}
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode);
                  if (isSelectionMode) setSelectedPlugins(new Set());
                }}
              >
                <CheckCircle className={cn('h-3.5 w-3.5', isSelectionMode && 'text-primary')} />
                <span className="hidden sm:inline">
                  {isSelectionMode ? t('filters.exitSelect') : t('filters.select')}
                </span>
              </Button>
            </div>
          </div>

          {/* Plugin Grid/List */}
          <div className="min-h-[300px]">
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
                onClearFilters={resetFilters}
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
                  } catch {
                    void uninstallPlugin(plugin.manifest.id);
                  }
                }}
                enableSelection={isSelectionMode}
                onBatchEnable={handleBatchEnable}
                onBatchDisable={async () => {
                  await handleBatchDisable();
                }}
                onBatchUninstall={async () => {
                  await handleBatchUninstall();
                }}
              />
            )}
          </div>
        </TabsContent>

        {/* Marketplace Tab */}
        <TabsContent value="marketplace" className="mt-0">
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
                setActiveTab('my-plugins');
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
        <TabsContent value="analytics" className="mt-0">
          <PluginAnalytics />
        </TabsContent>

        {/* Develop Tab */}
        <TabsContent value="develop" className="mt-0">
          <PluginDevTools />
        </TabsContent>

        {/* Health Tab */}
        <TabsContent value="health" className="space-y-4 mt-0">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <PluginUpdates autoCheck />
            <PluginConflicts autoDetect />
          </div>
          <PluginHealth autoRefresh refreshInterval={30000} />
          <PluginDependencyTree />
        </TabsContent>

        {/* Settings Tab - Improved with consistent card patterns */}
        <TabsContent value="settings" className="space-y-4 mt-0">
          {/* General Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('settingsTab.title')}</CardTitle>
              <CardDescription className="text-xs">
                {t('settingsTab.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Auto Enable Toggle */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">{t('settingsTab.autoEnable')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('settingsTab.autoEnableDesc')}
                  </p>
                </div>
                <Switch />
              </div>

              {/* Plugin Directory */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border p-3">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <Label className="text-sm font-medium">{t('settingsTab.pluginDirectory')}</Label>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {pluginDirectory || '—'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
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
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  {t('settingsTab.open')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Runtime Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('settingsTab.runtime')}</CardTitle>
              <CardDescription className="text-xs">
                {t('settingsTab.runtimeDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Python Environment */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">{t('settingsTab.pythonEnvironment')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('settingsTab.pythonEnvironmentDesc')}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="shrink-0">
                  <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                  {t('settingsTab.configure')}
                </Button>
              </div>

              {/* Sandbox Mode */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">{t('settingsTab.sandboxMode')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('settingsTab.sandboxModeDesc')}
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Cache & Data */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('settingsTab.cacheData')}</CardTitle>
              <CardDescription className="text-xs">
                {t('settingsTab.cacheDataDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Clear Cache */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">{t('settingsTab.clearCache')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('settingsTab.clearCacheDesc')}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="shrink-0">
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  {t('settingsTab.clearCacheBtn')}
                </Button>
              </div>

              {/* Reset All Plugins */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-destructive/30 p-3 bg-destructive/5">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium text-destructive">
                    {t('settingsTab.resetPlugins')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('settingsTab.resetPluginsDesc')}
                  </p>
                </div>
                <Button variant="destructive" size="sm" className="shrink-0">
                  {t('settingsTab.resetPluginsBtn')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <PluginCreateWizard
        open={isCreateWizardOpen}
        onOpenChange={setIsCreateWizardOpen}
        onComplete={handleCreateComplete}
      />

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
            setActiveTab('my-plugins');
          } catch (error) {
            toast.error('Plugin install failed');
            console.error('Failed to install plugin:', error);
          }
        }}
      />
    </TooltipProvider>
  );
}

export default PluginSettingsPage;
