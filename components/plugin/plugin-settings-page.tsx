/**
 * Plugin Settings Page
 * Comprehensive plugin management interface with tabs for different sections
 */

'use client';

import React, { useState, useCallback } from 'react';
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
import { PluginList } from './plugin-list';
import { PluginAnalytics } from './plugin-analytics';
import { PluginCreateWizard } from './plugin-create-wizard';
import { PluginDevTools } from './plugin-dev-tools';
import { PluginHealth } from './plugin-health';
import { PluginDependencyTree } from './plugin-dependency-tree';
import { PluginConflicts } from './plugin-conflicts';
import { PluginUpdates } from './plugin-updates';
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
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Puzzle className="h-6 w-6" />
          <div>
            <h1 className="text-xl font-semibold">Plugins</h1>
            <p className="text-sm text-muted-foreground">
              {enabledPlugins.length} enabled · {plugins.length} installed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Import
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                <FolderOpen className="h-4 w-4 mr-2" />
                From Folder
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Upload className="h-4 w-4 mr-2" />
                From ZIP
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Code2 className="h-4 w-4 mr-2" />
                From Git URL
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="sm" onClick={() => setIsCreateWizardOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Plugin
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b px-4">
          <TabsList className="h-12">
            <TabsTrigger value="installed" className="gap-2">
              <Puzzle className="h-4 w-4" />
              Installed
              <Badge variant="secondary" className="ml-1">
                {plugins.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="develop" className="gap-2">
              <Code2 className="h-4 w-4" />
              Develop
            </TabsTrigger>
            <TabsTrigger value="health" className="gap-2">
              <Heart className="h-4 w-4" />
              Health
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Installed Plugins Tab */}
        <TabsContent value="installed" className="flex-1 flex flex-col m-0">
          {/* Filters Bar */}
          <div className="flex items-center gap-3 p-4 border-b bg-muted/30">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search plugins..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filterBy} onValueChange={v => setFilterBy(v as FilterOption)}>
              <SelectTrigger className="w-[130px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="enabled">Enabled</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={v => setTypeFilter(v as PluginType | 'all')}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="frontend">Frontend</SelectItem>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>

            <Select value={capabilityFilter} onValueChange={v => setCapabilityFilter(v as PluginCapability | 'all')}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Capability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Capabilities</SelectItem>
                <SelectItem value="tools">Tools</SelectItem>
                <SelectItem value="components">Components</SelectItem>
                <SelectItem value="modes">Modes</SelectItem>
                <SelectItem value="commands">Commands</SelectItem>
                <SelectItem value="hooks">Hooks</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-r-none"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-l-none"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            <Select value={sortBy} onValueChange={v => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="recent">Recent</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Plugin List */}
          <ScrollArea className="flex-1 p-4">
            {filteredPlugins.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Puzzle className="h-12 w-12 mb-4 opacity-50" />
                {searchQuery || filterBy !== 'all' || typeFilter !== 'all' || capabilityFilter !== 'all' ? (
                  <>
                    <p className="text-lg font-medium">No plugins match your filters</p>
                    <p className="text-sm">Try adjusting your search or filters</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-medium">No plugins installed</p>
                    <p className="text-sm mb-4">Create your first plugin or import one</p>
                    <Button onClick={() => setIsCreateWizardOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Plugin
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <PluginList
                plugins={filteredPlugins}
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

          {/* Status Bar */}
          <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>{filteredPlugins.length} plugins shown</span>
              {errorPlugins.length > 0 && (
                <Badge variant="destructive">{errorPlugins.length} errors</Badge>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span>{enabledPlugins.length} enabled</span>
              <span>{disabledPlugins.length} disabled</span>
            </div>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="flex-1 m-0 p-4">
          <PluginAnalytics />
        </TabsContent>

        {/* Develop Tab */}
        <TabsContent value="develop" className="flex-1 m-0 p-4">
          <PluginDevTools />
        </TabsContent>

        {/* Health & Monitoring Tab */}
        <TabsContent value="health" className="flex-1 m-0 p-4 overflow-auto">
          <div className="space-y-6">
            {/* Updates Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PluginUpdates autoCheck />
              <PluginConflicts autoDetect />
            </div>

            {/* Health Monitoring */}
            <PluginHealth autoRefresh refreshInterval={30000} />

            {/* Dependency Tree */}
            <PluginDependencyTree />
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="flex-1 m-0 p-4">
          <div className="max-w-2xl space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Plugin Settings</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configure global plugin system settings
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Auto-enable plugins</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically enable newly installed plugins
                  </p>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Plugin directory</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    ~/.cognia/plugins
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Open
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Python environment</p>
                  <p className="text-sm text-muted-foreground">
                    Configure Python runtime for plugins
                  </p>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Clear plugin cache</p>
                  <p className="text-sm text-muted-foreground">
                    Remove cached plugin data and reload
                  </p>
                </div>
                <Button variant="outline" size="sm">Clear Cache</Button>
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
