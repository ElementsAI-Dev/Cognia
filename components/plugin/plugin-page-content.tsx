'use client';

/**
 * PluginPageContent - Unified plugin management page with sidebar layout
 * Single source of truth for both /plugins route and settings plugin panel
 *
 * Features:
 * - Sidebar navigation with collapsible sections
 * - My Plugins: grid/list view, filtering, selection, batch operations
 * - Marketplace: browse and install plugins
 * - Analytics, DevTools, Health, Updates, Favorites, Settings tabs
 * - Mobile responsive with bottom navigation and hamburger sidebar
 * - Reuses NativeToolHeader for sub-tab headers
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Activity,
  Code2,
  Heart,
  HeartPulse,
  RefreshCw,
  Settings2,
  FolderOpen,
  Shield,
  Clock,
  Bell,
  ToggleLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePluginStore, usePluginMarketplaceStore } from '@/stores/plugin';
import { selectFavoriteCount } from '@/stores/plugin/plugin-marketplace-store';
import { usePlugins } from '@/hooks/plugin';
import { getPluginManager } from '@/lib/plugin';
import { toast } from '@/components/ui/sonner';
import { isTauri as detectTauri } from '@/lib/native/utils';
import { open } from '@tauri-apps/plugin-dialog';

// Shared native layout components
import { NativeToolHeader } from '@/components/native/layout';

// Plugin layout components
import {
  PluginLayout,
  PluginSidebar,
  PluginHeader,
  StatsBar,
  MobileBottomNav,
} from '@/components/plugin/layout';

// Plugin feature components
import { PluginList } from '@/components/plugin/core/plugin-list';
import { PluginFilterBar } from '@/components/plugin/config/plugin-filter-bar';
import { PluginEmptyState } from '@/components/plugin/core/plugin-empty-state';
import { PluginMarketplace, PluginDetailModal, type MarketplacePlugin } from '@/components/plugin/marketplace';
import { PluginCreateWizard } from '@/components/plugin/config/plugin-create-wizard';
import { PluginConfig } from '@/components/plugin/config/plugin-config';
import { PluginInstalledDetail } from '@/components/plugin/core/plugin-installed-detail';
import { PluginAnalytics } from '@/components/plugin/monitoring/plugin-analytics';
import { PluginDevTools } from '@/components/plugin/dev/plugin-dev-tools';
import { PluginHealth } from '@/components/plugin/monitoring/plugin-health';
import { PluginUpdates } from '@/components/plugin/monitoring/plugin-updates';
import { PluginConflicts } from '@/components/plugin/monitoring/plugin-conflicts';
import { PluginDependencyTree } from '@/components/plugin/monitoring/plugin-dependency-tree';

// UI components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

import type { Plugin } from '@/types/plugin';
import type { FilterStatus, FilterType, FilterCapability } from '@/components/plugin/config/plugin-filter-bar';

type ViewMode = 'grid' | 'list';

interface PluginPageContentProps {
  className?: string;
}

export function PluginPageContent({ className }: PluginPageContentProps) {
  const t = useTranslations('pluginSettings');
  const { plugins, enabledPlugins, errorPlugins, initialized } = usePlugins();
  const { scanPlugins, enablePlugin, disablePlugin, uninstallPlugin } = usePluginStore();
  const pluginDirectory = usePluginStore((s) => s.pluginDirectory);

  // Marketplace store selectors
  const favoriteCount = usePluginMarketplaceStore(selectFavoriteCount);

  // Navigation state
  const [activeTab, setActiveTab] = useState('my-plugins');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<FilterStatus>('all');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [capabilityFilter, setCapabilityFilter] = useState<FilterCapability>('all');

  // Selection state — PluginList manages its own selected set internally
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Dialog state
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [configPlugin, setConfigPlugin] = useState<Plugin | null>(null);
  const [detailPlugin, setDetailPlugin] = useState<Plugin | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedMarketplacePlugin, setSelectedMarketplacePlugin] = useState<MarketplacePlugin | null>(null);
  const [isMarketplaceDetailOpen, setIsMarketplaceDetailOpen] = useState(false);

  // Settings state (local — persisted via store eventually)
  const [autoScanEnabled, setAutoScanEnabled] = useState(false);
  const [conflictDetectionEnabled, setConflictDetectionEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Stats
  const totalTools = useMemo(
    () => plugins.reduce((acc, p) => acc + (p.tools?.length || 0), 0),
    [plugins]
  );
  const healthScore = useMemo(
    () => errorPlugins.length === 0
      ? 100
      : Math.round((1 - errorPlugins.length / Math.max(plugins.length, 1)) * 100),
    [plugins.length, errorPlugins.length]
  );

  // Favorite plugins (computed)
  const favoritePlugins = useMemo(() => {
    const { favorites } = usePluginMarketplaceStore.getState();
    return plugins.filter((p) => favorites[p.manifest.id]);
  }, [plugins]);

  // Filtered plugins
  const filteredPlugins = useMemo(() => {
    return plugins.filter((plugin) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          plugin.manifest.name.toLowerCase().includes(query) ||
          plugin.manifest.description?.toLowerCase().includes(query) ||
          plugin.manifest.id.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      if (filterBy === 'enabled' && plugin.status !== 'enabled') return false;
      if (filterBy === 'disabled' && plugin.status !== 'disabled' && plugin.status !== 'loaded') return false;
      if (filterBy === 'error' && plugin.status !== 'error') return false;
      if (typeFilter !== 'all' && plugin.manifest.type !== typeFilter) return false;
      if (capabilityFilter !== 'all' && !plugin.manifest.capabilities.includes(capabilityFilter as never)) return false;
      return true;
    });
  }, [plugins, searchQuery, filterBy, typeFilter, capabilityFilter]);

  // ─── Handlers ───────────────────────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (!initialized) {
        toast.error(t('notInitialized'));
        return;
      }
      try {
        const manager = getPluginManager();
        await manager.scanPlugins();
      } catch {
        await scanPlugins();
      }
      toast.success(t('refreshComplete'));
    } catch (error) {
      toast.error(t('refreshFailed'));
      console.error('Plugin refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [initialized, scanPlugins, t]);

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

  const handleImportFromGit = useCallback(async () => {
    if (!detectTauri()) {
      toast.error(t('desktopRequired'));
      return;
    }
    const url = window.prompt(t('gitRepoUrlPrompt'));
    if (!url) return;
    try {
      const manager = getPluginManager();
      await manager.installPlugin(url, { type: 'git' });
      await handleRefresh();
      toast.success(t('pluginInstalled'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || t('installFailed'));
      console.error('Failed to install plugin from git:', error);
    }
  }, [handleRefresh, t]);

  const handleTogglePlugin = useCallback(async (plugin: Plugin) => {
    try {
      const manager = getPluginManager();
      if (plugin.status === 'enabled') {
        await manager.disablePlugin(plugin.manifest.id);
      } else {
        await manager.enablePlugin(plugin.manifest.id);
      }
    } catch {
      if (plugin.status === 'enabled') {
        await disablePlugin(plugin.manifest.id);
      } else {
        await enablePlugin(plugin.manifest.id);
      }
    }
  }, [enablePlugin, disablePlugin]);

  const handleUninstallPlugin = useCallback(async (plugin: Plugin) => {
    try {
      const manager = getPluginManager();
      await manager.uninstallPlugin(plugin.manifest.id);
    } catch {
      await uninstallPlugin(plugin.manifest.id);
    }
  }, [uninstallPlugin]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    // Close mobile sidebar when navigating
    setShowMobileSidebar(false);
    // Exit selection mode when switching tabs
    if (tab !== 'my-plugins') {
      setIsSelectionMode(false);
    }
  }, []);

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setFilterBy('all');
    setTypeFilter('all');
    setCapabilityFilter('all');
  }, []);

  // ─── Render content based on active tab ─────────────────────────────

  const renderContent = () => {
    switch (activeTab) {
      case 'marketplace':
        return (
          <PluginMarketplace
            onViewDetails={(plugin) => {
              setSelectedMarketplacePlugin(plugin);
              setIsMarketplaceDetailOpen(true);
            }}
          />
        );

      case 'analytics':
        return (
          <>
            <NativeToolHeader
              icon={Activity}
              title={t('tabs.analytics')}
              description={t('analyticsDescription')}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
              refreshLabel={t('refresh')}
            />
            <div className="flex-1 overflow-auto">
              <PluginAnalytics />
            </div>
          </>
        );

      case 'develop':
        return (
          <>
            <NativeToolHeader
              icon={Code2}
              title={t('tabs.develop')}
              description={t('developDescription')}
              iconClassName="bg-amber-500/10 text-amber-600"
            />
            <div className="flex-1 overflow-auto">
              <PluginDevTools />
            </div>
          </>
        );

      case 'health':
        return (
          <>
            <NativeToolHeader
              icon={HeartPulse}
              title={t('tabs.health')}
              description={t('healthDescription')}
              badge={
                errorPlugins.length > 0 ? (
                  <Badge variant="destructive" className="text-xs">
                    {errorPlugins.length} {t('errors')}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600">
                    {t('healthy')}
                  </Badge>
                )
              }
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
              refreshLabel={t('refresh')}
              iconClassName="bg-rose-500/10 text-rose-600"
            />
            <div className="flex-1 overflow-auto space-y-4 p-4 sm:p-6">
              <PluginUpdates autoCheck />
              <PluginConflicts autoDetect />
              <PluginHealth autoRefresh refreshInterval={30000} />
              <PluginDependencyTree />
            </div>
          </>
        );

      case 'updates':
        return (
          <>
            <NativeToolHeader
              icon={RefreshCw}
              title={t('tabs.updates')}
              description={t('updatesDescription')}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
              refreshLabel={t('checkForUpdates')}
              iconClassName="bg-blue-500/10 text-blue-600"
            />
            <div className="flex-1 overflow-auto p-4 sm:p-6">
              <PluginUpdates autoCheck />
            </div>
          </>
        );

      case 'favorites':
        return (
          <>
            <NativeToolHeader
              icon={Heart}
              title={t('tabs.favorites')}
              description={t('favoritesDescription')}
              badge={favoriteCount > 0 ? String(favoriteCount) : undefined}
              iconClassName="bg-pink-500/10 text-pink-600"
            />
            <div className="flex-1 overflow-auto p-4 sm:p-6">
              {favoritePlugins.length > 0 ? (
                <PluginList
                  plugins={favoritePlugins}
                  viewMode={viewMode}
                  onToggle={handleTogglePlugin}
                  onConfigure={(p) => setConfigPlugin(p)}
                  onUninstall={handleUninstallPlugin}
                  onViewDetails={(p) => {
                    setDetailPlugin(p);
                    setIsDetailOpen(true);
                  }}
                />
              ) : (
                <PluginEmptyState
                  variant="no-results"
                  searchQuery=""
                  onBrowseMarketplace={() => handleTabChange('marketplace')}
                />
              )}
            </div>
          </>
        );

      case 'settings':
        return (
          <>
            <NativeToolHeader
              icon={Settings2}
              title={t('tabs.settings')}
              description={t('settingsDescription')}
              iconClassName="bg-slate-500/10 text-slate-600"
            />
            <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-6">
              {/* General Settings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" />
                    {t('settingsTab.general')}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {t('settingsTab.generalDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Plugin directory */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{t('settingsTab.pluginDirectory')}</Label>
                    <p className="text-xs text-muted-foreground font-mono bg-muted/50 rounded-md px-3 py-2 truncate">
                      {pluginDirectory || t('settingsTab.defaultDirectory')}
                    </p>
                  </div>

                  {/* Plugin count summary */}
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{plugins.length}</span>
                      <span className="text-muted-foreground">{t('settingsTab.installed')}</span>
                    </div>
                    <Separator orientation="vertical" className="h-3" />
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-emerald-600">{enabledPlugins.length}</span>
                      <span className="text-muted-foreground">{t('settingsTab.enabled')}</span>
                    </div>
                    <Separator orientation="vertical" className="h-3" />
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-red-600">{errorPlugins.length}</span>
                      <span className="text-muted-foreground">{t('settingsTab.withErrors')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Auto-scan Settings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t('settingsTab.automation')}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {t('settingsTab.automationDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="auto-scan" className="text-xs font-medium">
                        {t('settingsTab.autoScan')}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t('settingsTab.autoScanDescription')}
                      </p>
                    </div>
                    <Switch
                      id="auto-scan"
                      checked={autoScanEnabled}
                      onCheckedChange={setAutoScanEnabled}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="conflict-detection" className="text-xs font-medium">
                        {t('settingsTab.conflictDetection')}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t('settingsTab.conflictDetectionDescription')}
                      </p>
                    </div>
                    <Switch
                      id="conflict-detection"
                      checked={conflictDetectionEnabled}
                      onCheckedChange={setConflictDetectionEnabled}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Permissions & Notifications */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    {t('settingsTab.security')}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {t('settingsTab.securityDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="notifications" className="text-xs font-medium flex items-center gap-1.5">
                        <Bell className="h-3.5 w-3.5" />
                        {t('settingsTab.notifications')}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t('settingsTab.notificationsDescription')}
                      </p>
                    </div>
                    <Switch
                      id="notifications"
                      checked={notificationsEnabled}
                      onCheckedChange={setNotificationsEnabled}
                    />
                  </div>

                  <Separator />

                  {/* Quick actions */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <ToggleLeft className="h-3.5 w-3.5" />
                      {t('settingsTab.quickActions')}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs',
                          'border bg-background hover:bg-muted/50 transition-colors',
                          'disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                      >
                        <RefreshCw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} />
                        {t('settingsTab.rescanPlugins')}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        );

      case 'my-plugins':
      default:
        return (
          <>
            {/* Stats Bar */}
            <StatsBar
              totalPlugins={plugins.length}
              enabledCount={enabledPlugins.length}
              errorCount={errorPlugins.length}
              totalTools={totalTools}
              healthScore={healthScore}
            />

            {/* Filter Bar */}
            <div className="px-4 sm:px-6 py-3">
              <PluginFilterBar
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
            </div>

            {/* Plugin List */}
            <div className="flex-1 p-4 sm:p-6 pt-0">
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
                  onBrowseMarketplace={() => handleTabChange('marketplace')}
                  onImportPlugin={handleImportFromFolder}
                  onClearFilters={resetFilters}
                />
              ) : (
                <PluginList
                  plugins={filteredPlugins}
                  viewMode={viewMode}
                  onToggle={handleTogglePlugin}
                  onConfigure={(p) => setConfigPlugin(p)}
                  onUninstall={handleUninstallPlugin}
                  onViewDetails={(p) => {
                    setDetailPlugin(p);
                    setIsDetailOpen(true);
                  }}
                  enableSelection={isSelectionMode}
                />
              )}
            </div>
          </>
        );
    }
  };

  // ─── Build layout elements ──────────────────────────────────────────

  // Header element — shown for my-plugins tab (search/actions toolbar)
  const headerElement = activeTab === 'my-plugins' ? (
    <PluginHeader
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      onCreatePlugin={() => setIsCreateWizardOpen(true)}
      onImportFromFolder={handleImportFromFolder}
      onImportFromGit={handleImportFromGit}
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
      pluginCount={plugins.length}
      isSelectionMode={isSelectionMode}
      onToggleSelectionMode={() => setIsSelectionMode((prev) => !prev)}
      onToggleMobileSidebar={() => setShowMobileSidebar((prev) => !prev)}
    />
  ) : null;

  // Sidebar element
  const sidebarElement = (
    <PluginSidebar
      activeTab={activeTab}
      onTabChange={handleTabChange}
      collapsed={sidebarCollapsed}
      onCollapsedChange={setSidebarCollapsed}
      pluginCount={plugins.length}
      updateCount={0}
      favoriteCount={favoriteCount}
      errorCount={errorPlugins.length}
    />
  );

  return (
    <PluginLayout
      className={cn('h-full', className)}
      sidebarCollapsed={sidebarCollapsed}
      showMobileSidebar={showMobileSidebar}
      onCloseMobileSidebar={() => setShowMobileSidebar(false)}
      sidebar={sidebarElement}
      header={headerElement}
    >
      {/* Tab Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderContent()}
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        pluginCount={plugins.length}
        updateCount={0}
        favoriteCount={favoriteCount}
        errorCount={errorPlugins.length}
      />

      {/* Dialogs */}
      <PluginCreateWizard
        open={isCreateWizardOpen}
        onOpenChange={setIsCreateWizardOpen}
        onComplete={() => {
          handleRefresh();
        }}
      />

      {/* Config Dialog */}
      {configPlugin && (
        <PluginConfig
          plugin={configPlugin}
          onClose={() => setConfigPlugin(null)}
        />
      )}

      {/* Detail Sheet */}
      <PluginInstalledDetail
        plugin={detailPlugin}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onConfigure={(p) => {
          setConfigPlugin(p);
          setIsDetailOpen(false);
        }}
      />

      {/* Marketplace Detail Modal */}
      <PluginDetailModal
        plugin={selectedMarketplacePlugin}
        open={isMarketplaceDetailOpen}
        onOpenChange={setIsMarketplaceDetailOpen}
      />
    </PluginLayout>
  );
}

export default PluginPageContent;
