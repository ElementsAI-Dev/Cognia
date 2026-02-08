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
  ArrowUpDown,
  Layers,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import { PluginList } from '../core/plugin-list';
import { PluginEmptyState } from '../core/plugin-empty-state';
import { PluginGroupedList } from '../core/plugin-grouped-list';
import { PluginInstalledDetail } from '../core/plugin-installed-detail';
import { PluginAnalytics } from '../monitoring/plugin-analytics';
import { PluginCreateWizard } from './plugin-create-wizard';
import { PluginConfig } from './plugin-config';
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
import type { Plugin, PluginCapability } from '@/types/plugin';
import { invoke } from '@tauri-apps/api/core';
import { getPluginSignatureVerifier } from '@/lib/plugin';
import type { PluginScaffoldOptions } from '@/lib/plugin';
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
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [filterBy, setFilterBy] = useState<FilterStatus>('all');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [capabilityFilter, setCapabilityFilter] = useState<FilterCapability>('all');
  const [groupBy, setGroupBy] = useState<'none' | 'type' | 'capability' | 'status'>('none');

  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedMarketplacePlugin, setSelectedMarketplacePlugin] =
    useState<MarketplacePlugin | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPlugins, setSelectedPlugins] = useState<Set<string>>(new Set());

  // Config dialog state
  const [configPlugin, setConfigPlugin] = useState<Plugin | null>(null);

  // Detail sheet state
  const [detailPlugin, setDetailPlugin] = useState<Plugin | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Reset confirmation dialog state
  const [showResetDialog, setShowResetDialog] = useState(false);

  // Settings state
  const [autoEnableNewPlugins, setAutoEnableNewPlugins] = useState(false);
  const [sandboxMode, setSandboxMode] = useState(true);

  // Get reset from store
  const { reset } = usePluginStore();

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
      switch (sortBy) {
        case 'name':
          return a.manifest.name.localeCompare(b.manifest.name);
        case 'recent':
          return (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0);
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

  // Import from folder handler
  const handleImportFromFolder = useCallback(async () => {
    if (!detectTauri()) {
      toast.error(t('desktopRequired'));
      return;
    }
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: t('selectPluginFolder'),
      });
      if (selected && typeof selected === 'string') {
        const manager = getPluginManager();
        await manager.installPlugin(selected, { type: 'local' });
        await handleRefresh();
        toast.success(t('pluginImported'));
      }
    } catch (error) {
      toast.error(t('importFailed'));
      console.error('Import from folder failed:', error);
    }
  }, [t, handleRefresh]);

  // Import from zip handler
  const handleImportFromZip = useCallback(async () => {
    if (!detectTauri()) {
      toast.error(t('desktopRequired'));
      return;
    }
    try {
      const selected = await open({
        filters: [{ name: 'ZIP', extensions: ['zip'] }],
        multiple: false,
        title: t('selectPluginZip'),
      });
      if (selected && typeof selected === 'string') {
        const manager = getPluginManager();
        await manager.installPlugin(selected, { type: 'local' });
        await handleRefresh();
        toast.success(t('pluginImported'));
      }
    } catch (error) {
      toast.error(t('importFailed'));
      console.error('Import from zip failed:', error);
    }
  }, [t, handleRefresh]);

  // Clear cache handler
  const handleClearCache = useCallback(async () => {
    try {
      const verifier = getPluginSignatureVerifier();
      verifier.clearCache();
      toast.success(t('settingsTab.cacheClearedSuccess'));
    } catch (error) {
      toast.error(t('settingsTab.cacheClearFailed'));
      console.error('Clear cache failed:', error);
    }
  }, [t]);

  // Reset all plugins handler
  const handleResetAllPlugins = useCallback(() => {
    reset();
    toast.success(t('settingsTab.resetSuccess'));
    setShowResetDialog(false);
  }, [reset, t]);

  // Python environment configure handler
  const handleConfigurePython = useCallback(async () => {
    if (!detectTauri()) {
      toast.error(t('desktopRequired'));
      return;
    }
    try {
      const selected = await open({
        filters: [{ name: 'Python', extensions: ['exe', ''] }],
        title: t('settingsTab.selectPythonPath'),
      });
      if (selected && typeof selected === 'string') {
        await invoke('plugin_python_initialize', { pythonPath: selected });
        toast.success(t('settingsTab.pythonConfigured'));
      }
    } catch (error) {
      toast.error(t('settingsTab.pythonConfigFailed'));
      console.error('Python config failed:', error);
    }
  }, [t]);

  // Configure plugin handler
  const handleConfigurePlugin = useCallback((plugin: Plugin) => {
    setConfigPlugin(plugin);
  }, []);

  // View plugin details handler
  const handleViewDetails = useCallback((plugin: Plugin) => {
    setDetailPlugin(plugin);
    setIsDetailOpen(true);
  }, []);

  return (
    <TooltipProvider delayDuration={300}>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className={cn('space-y-4', className)}
      >
        {/* Tab Navigation - Horizontal scroll on mobile */}
        <div className="relative">
          <TabsList className="flex w-full overflow-x-auto scrollbar-hide gap-1 p-1.5 bg-muted/50 border rounded-xl">
            <TabsTrigger 
              value="my-plugins" 
              className="shrink-0 gap-1.5 text-xs sm:text-sm px-3 sm:px-4 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:shadow-primary/10 transition-all duration-200"
            >
              <Puzzle className="h-4 w-4" />
              <span className="hidden xs:inline">{t('tabs.myPlugins')}</span>
              <span className="xs:hidden">插件</span>
              {plugins.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1.5 text-[10px] font-medium bg-primary/10 text-primary border-0">
                  {plugins.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="marketplace" 
              className="shrink-0 gap-1.5 text-xs sm:text-sm px-3 sm:px-4 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
            >
              <Store className="h-4 w-4" />
              <span className="hidden xs:inline">{t('tabs.marketplace')}</span>
              <span className="xs:hidden">市场</span>
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="shrink-0 gap-1.5 text-xs sm:text-sm px-3 sm:px-4 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
            >
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">{t('tabs.analytics')}</span>
              <span className="sm:hidden">分析</span>
            </TabsTrigger>
            <TabsTrigger 
              value="develop" 
              className="shrink-0 gap-1.5 text-xs sm:text-sm px-3 sm:px-4 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
            >
              <Code2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t('tabs.develop')}</span>
              <span className="sm:hidden">开发</span>
            </TabsTrigger>
            <TabsTrigger 
              value="health" 
              className="shrink-0 gap-1.5 text-xs sm:text-sm px-3 sm:px-4 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
            >
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">{t('tabs.health')}</span>
              <span className="sm:hidden">健康</span>
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="shrink-0 gap-1.5 text-xs sm:text-sm px-3 sm:px-4 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
            >
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t('tabs.settings')}</span>
              <span className="sm:hidden">设置</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* My Plugins Tab */}
        <TabsContent value="my-plugins" className="space-y-5 mt-0">
          {/* Hero Section with Stats */}
          <div className="rounded-xl border bg-muted/30 p-4 sm:p-6">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-primary/10 ring-1 ring-primary/20">
                      <Puzzle className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-semibold tracking-tight">{t('title')}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground max-w-md">
                    {t('description')}
                  </p>
                </div>
                
                {/* Stats Cards */}
                {plugins.length > 0 && (
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Health Score */}
                    <div className="flex flex-col items-center px-3 sm:px-4 py-2 rounded-lg bg-background border min-w-[70px]">
                      <div className="flex items-center gap-1.5">
                        <div className={cn(
                          "h-2 w-2 rounded-full",
                          healthScore >= 80 ? "bg-emerald-500" : healthScore >= 50 ? "bg-amber-500" : "bg-red-500"
                        )} />
                        <span className="text-lg sm:text-xl font-bold tabular-nums">{healthScore}%</span>
                      </div>
                      <span className="text-[10px] sm:text-xs text-muted-foreground">Health</span>
                    </div>
                    
                    {/* Enabled Count */}
                    <div className="flex flex-col items-center px-3 sm:px-4 py-2 rounded-lg bg-background border min-w-[70px]">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-lg sm:text-xl font-bold tabular-nums">{enabledPlugins.length}</span>
                      </div>
                      <span className="text-[10px] sm:text-xs text-muted-foreground">Enabled</span>
                    </div>
                    
                    {/* Tools Count */}
                    <div className="flex flex-col items-center px-3 sm:px-4 py-2 rounded-lg bg-background border min-w-[70px]">
                      <div className="flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-lg sm:text-xl font-bold tabular-nums">{totalTools}</span>
                      </div>
                      <span className="text-[10px] sm:text-xs text-muted-foreground">Tools</span>
                    </div>
                    
                    {/* Error Count - Only show if errors exist */}
                    {errorPlugins.length > 0 && (
                      <div className="flex flex-col items-center px-3 sm:px-4 py-2 rounded-lg bg-destructive/10 border border-destructive/30 min-w-[70px]">
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                          <span className="text-lg sm:text-xl font-bold tabular-nums text-destructive">{errorPlugins.length}</span>
                        </div>
                        <span className="text-[10px] sm:text-xs text-destructive/80">Errors</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions Bar - Enhanced with better grouping */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Primary Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button 
                size="sm" 
                onClick={() => setIsCreateWizardOpen(true)}
                className="h-9 px-4"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                {t('createPlugin')}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 px-3">
                    <Download className="h-4 w-4 mr-1.5" />
                    <span className="hidden sm:inline">{t('import')}</span>
                    <span className="sm:hidden">Import</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onClick={handleImportFromFolder} className="gap-2">
                    <FolderOpen className="h-4 w-4" />
                    {t('fromFolder')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleImportFromZip} className="gap-2">
                    <Upload className="h-4 w-4" />
                    {t('fromZip')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleInstallFromGitUrl} className="gap-2">
                    <GitBranch className="h-4 w-4" />
                    {t('fromGitUrl')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 hover:bg-primary/10"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('refresh')}</TooltipContent>
              </Tooltip>
            </div>

            {/* Filters and View Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Filter Bar */}
              <PluginFilterBar
                className="flex-1 lg:flex-initial"
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

              {/* Sort Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5">
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline text-xs">
                      {sortBy === 'name' ? t('filters.sortByName') : sortBy === 'recent' ? t('filters.sortByRecent') : t('filters.sortByStatus')}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem onClick={() => setSortBy('name')} className={cn(sortBy === 'name' && 'bg-accent')}>
                    {t('filters.sortByName')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('recent')} className={cn(sortBy === 'recent' && 'bg-accent')}>
                    {t('filters.sortByRecent')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('status')} className={cn(sortBy === 'status' && 'bg-accent')}>
                    {t('filters.sortByStatus')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* GroupBy Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant={groupBy !== 'none' ? 'default' : 'outline'} size="sm" className="h-9 gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline text-xs">
                      {groupBy === 'none' ? t('filters.noGroup') : groupBy === 'type' ? t('filters.groupByType') : groupBy === 'capability' ? t('filters.groupByCapability') : t('filters.groupByStatus')}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => setGroupBy('none')} className={cn(groupBy === 'none' && 'bg-accent')}>
                    {t('filters.noGroup')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setGroupBy('type')} className={cn(groupBy === 'type' && 'bg-accent')}>
                    {t('filters.groupByType')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setGroupBy('capability')} className={cn(groupBy === 'capability' && 'bg-accent')}>
                    {t('filters.groupByCapability')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setGroupBy('status')} className={cn(groupBy === 'status' && 'bg-accent')}>
                    {t('filters.groupByStatus')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* View Mode Toggle - Enhanced with ToggleGroup */}
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(value) => value && setViewMode(value as ViewMode)}
                className="rounded-lg border border-border/50 bg-muted/30 p-0.5"
              >
                <ToggleGroupItem
                  value="grid"
                  aria-label="Grid view"
                  className="h-8 w-8 p-0 rounded-md data-[state=on]:bg-background data-[state=on]:shadow-sm"
                >
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="list"
                  aria-label="List view"
                  className="h-8 w-8 p-0 rounded-md data-[state=on]:bg-background data-[state=on]:shadow-sm"
                >
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>

              {/* Selection Mode Toggle */}
              <Button
                variant={isSelectionMode ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  "h-9 gap-1.5 transition-all duration-200",
                  isSelectionMode && "bg-primary/90 hover:bg-primary"
                )}
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode);
                  if (isSelectionMode) setSelectedPlugins(new Set());
                }}
              >
                <CheckCircle className="h-4 w-4" />
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
                onImportPlugin={handleImportFromFolder}
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
                onConfigure={handleConfigurePlugin}
                onUninstall={(plugin) => {
                  try {
                    const manager = getPluginManager();
                    void manager.uninstallPlugin(plugin.manifest.id);
                  } catch {
                    void uninstallPlugin(plugin.manifest.id);
                  }
                }}
                onViewDetails={handleViewDetails}
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
                onConfigure={handleConfigurePlugin}
                onUninstall={(plugin) => {
                  try {
                    const manager = getPluginManager();
                    void manager.uninstallPlugin(plugin.manifest.id);
                  } catch {
                    void uninstallPlugin(plugin.manifest.id);
                  }
                }}
                onViewDetails={handleViewDetails}
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
              try {
                const { PluginMarketplace: MarketplaceClient } = await import('@/lib/plugin');
                const client = new MarketplaceClient();
                const result = await client.installPlugin(pluginId);
                if (result.success) {
                  await scanPlugins();
                  toast.success(t('marketplace.installSuccess'));
                  setActiveTab('my-plugins');
                } else {
                  toast.error(result.error || t('marketplace.installFailed'));
                }
              } catch (error) {
                toast.error(t('marketplace.installFailed'));
                console.error('Failed to install plugin from marketplace:', error);
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
                <Switch
                  checked={autoEnableNewPlugins}
                  onCheckedChange={setAutoEnableNewPlugins}
                />
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
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={handleConfigurePython}
                >
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
                <Switch
                  checked={sandboxMode}
                  onCheckedChange={setSandboxMode}
                />
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
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={handleClearCache}
                >
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
                <Button
                  variant="destructive"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setShowResetDialog(true)}
                >
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

      {/* Plugin Config Dialog */}
      <Dialog open={!!configPlugin} onOpenChange={(open) => !open && setConfigPlugin(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {configPlugin?.manifest.name} - {t('configure')}
            </DialogTitle>
          </DialogHeader>
          {configPlugin && (
            <PluginConfig
              plugin={configPlugin}
              onClose={() => setConfigPlugin(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settingsTab.resetPluginsConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settingsTab.resetPluginsConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetAllPlugins}>
              {t('settingsTab.resetPluginsBtn')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PluginDetailModal
        plugin={selectedMarketplacePlugin}
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        onInstall={async (pluginId) => {
          try {
            const { PluginMarketplace: MarketplaceClient } = await import('@/lib/plugin');
            const client = new MarketplaceClient();
            const result = await client.installPlugin(pluginId);
            if (result.success) {
              await scanPlugins();
              toast.success(t('marketplace.installSuccess'));
              setIsDetailModalOpen(false);
              setActiveTab('my-plugins');
            } else {
              toast.error(result.error || t('marketplace.installFailed'));
            }
          } catch (error) {
            toast.error(t('marketplace.installFailed'));
            console.error('Failed to install plugin from marketplace:', error);
          }
        }}
      />

      {/* Installed Plugin Detail Sheet */}
      <PluginInstalledDetail
        plugin={detailPlugin}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onConfigure={handleConfigurePlugin}
      />
    </TooltipProvider>
  );
}

export default PluginSettingsPage;
