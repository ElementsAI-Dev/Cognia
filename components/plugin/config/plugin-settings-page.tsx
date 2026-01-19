/**
 * Plugin Settings Page
 * Comprehensive plugin management interface with tabs for different sections
 */

'use client';

import React, { useState, useCallback } from 'react';
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
import { PluginList } from '../core/plugin-list';
import { PluginAnalytics } from '../monitoring/plugin-analytics';
import { PluginCreateWizard } from './plugin-create-wizard';
import { PluginDevTools } from '../dev/plugin-dev-tools';
import { PluginHealth } from '../monitoring/plugin-health';
import { PluginDependencyTree } from '../monitoring/plugin-dependency-tree';
import { PluginConflicts } from '../monitoring/plugin-conflicts';
import { PluginUpdates } from '../monitoring/plugin-updates';
import { usePluginStore } from '@/stores/plugin';
import { usePlugins } from '@/hooks/plugin';
import type { PluginCapability, PluginType } from '@/types/plugin';
import type { PluginScaffoldOptions } from '@/lib/plugin/templates';
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
  const { scanPlugins, initialize, enablePlugin, disablePlugin, uninstallPlugin } = usePluginStore();
  
  const [activeTab, setActiveTab] = useState('installed');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [typeFilter, setTypeFilter] = useState<PluginType | 'all'>('all');
  const [capabilityFilter, setCapabilityFilter] = useState<PluginCapability | 'all'>('all');
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (!initialized) {
        await initialize('plugins');
      }
      await scanPlugins();
    } finally {
      setIsRefreshing(false);
    }
  }, [initialized, initialize, scanPlugins]);

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
              <DropdownMenuItem>
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
              <DropdownMenuItem>
                <Code2 className="h-4 w-4 mr-2" />
                {t('fromGitUrl')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
                placeholder={t('filters.searchPlaceholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

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
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Puzzle className="h-10 w-10 sm:h-12 sm:w-12 mb-4 opacity-50" />
                {searchQuery || filterBy !== 'all' || typeFilter !== 'all' || capabilityFilter !== 'all' ? (
                  <>
                    <p className="text-base sm:text-lg font-medium">{t('emptyState.noMatch')}</p>
                    <p className="text-sm">{t('emptyState.tryAdjusting')}</p>
                  </>
                ) : (
                  <>
                    <p className="text-base sm:text-lg font-medium">{t('emptyState.noPlugins')}</p>
                    <p className="text-sm mb-4">{t('emptyState.createFirst')}</p>
                    <Button onClick={() => setIsCreateWizardOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('createPlugin')}
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <PluginList
                plugins={filteredPlugins}
                viewMode={viewMode}
                onToggle={(plugin) => {
                  if (plugin.status === 'enabled') {
                    disablePlugin(plugin.manifest.id);
                  } else {
                    enablePlugin(plugin.manifest.id);
                  }
                }}
                onConfigure={() => {}}
                onUninstall={(plugin) => uninstallPlugin(plugin.manifest.id)}
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
                    ~/.cognia/plugins
                  </p>
                </div>
                <Button variant="outline" size="sm" className="self-start sm:self-center shrink-0">
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
    </div>
  );
}

export default PluginSettingsPage;
