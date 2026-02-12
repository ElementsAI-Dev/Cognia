'use client';

/**
 * MCP Settings Component
 *
 * Main component for managing MCP server configurations
 * Enhanced with Skeleton loading, Tooltips, and grid layout
 * Now includes tabbed interface with Marketplace
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Plug, PlugZap, RefreshCw, Store, ScrollText, Unplug, Loader2, Filter, SortAsc, Download, Upload, HeartPulse, Wrench, Database } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TooltipProvider } from '@/components/ui/tooltip';
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
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useMcpStore } from '@/stores/mcp';
import { useMcpServerActions } from '@/hooks/mcp';
import { McpServerDialog } from './mcp-server-dialog';
import { McpInstallWizard } from './mcp-install-wizard';
import { McpMarketplace } from './mcp-marketplace';
import { ServerCard, ServerCardSkeleton } from './components';
import { MCPLogViewer } from '@/components/mcp/mcp-log-viewer';
import { MCPServerHealth } from '@/components/mcp/mcp-server-health';
import { MCPToolUsageStats } from '@/components/mcp/mcp-tool-usage-stats';
import { MCPToolSelectionConfig } from '@/components/mcp/mcp-tool-selection-config';
import { MCPActiveCalls } from '@/components/mcp/mcp-active-calls';
import { MCPResourceBrowser } from '@/components/mcp/mcp-resource-browser';
import { McpPromptsPanel } from '@/components/mcp/mcp-prompts-panel';
import { MCPErrorDisplay } from '@/components/mcp/mcp-error-display';
import type { McpServerState } from '@/types/mcp';

export function McpSettings() {
  const t = useTranslations('mcpSettings');
  const tCommon = useTranslations('common');

  const {
    servers,
    isLoading,
    error,
    isInitialized,
    initialize,
    loadServers,
    clearError,
    logs,
    clearLogs,
  } = useMcpStore();

  const {
    actionLoading,
    removeConfirmId,
    handleConnect,
    handleDisconnect,
    handleRemove,
    confirmRemove,
    cancelRemove,
    handleToggleEnabled,
  } = useMcpServerActions();

  const [showServerDialog, setShowServerDialog] = useState(false);
  const [showInstallWizard, setShowInstallWizard] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServerState | null>(null);
  const [batchAction, setBatchAction] = useState<'connecting' | 'disconnecting' | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'type'>('name');
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set(['all']));
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Batch operations
  const enabledServers = servers.filter((s) => s.config.enabled);
  const connectedServers = servers.filter((s) => s.status.type === 'connected');
  const disconnectedEnabledServers = enabledServers.filter((s) => s.status.type !== 'connected');

  // Filter and sort servers
  const filteredAndSortedServers = useMemo(() => {
    let result = [...servers];
    
    // Apply status filter
    if (!statusFilter.has('all')) {
      result = result.filter((s) => {
        if (statusFilter.has('connected') && s.status.type === 'connected') return true;
        if (statusFilter.has('disconnected') && s.status.type === 'disconnected') return true;
        if (statusFilter.has('error') && s.status.type === 'error') return true;
        if (statusFilter.has('enabled') && s.config.enabled) return true;
        if (statusFilter.has('disabled') && !s.config.enabled) return true;
        return false;
      });
    }
    
    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'status': {
          const statusOrder = { connected: 0, connecting: 1, disconnected: 2 };
          const aStatus = a.status.type;
          const bStatus = b.status.type;
          const aOrder = statusOrder[aStatus as keyof typeof statusOrder] ?? 3;
          const bOrder = statusOrder[bStatus as keyof typeof statusOrder] ?? 3;
          return aOrder - bOrder;
        }
        case 'type':
          return a.config.connectionType.localeCompare(b.config.connectionType);
        default:
          return 0;
      }
    });
    
    return result;
  }, [servers, sortBy, statusFilter]);

  const toggleStatusFilter = (status: string) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (status === 'all') {
        return new Set(['all']);
      }
      next.delete('all');
      if (next.has(status)) {
        next.delete(status);
        if (next.size === 0) {
          return new Set(['all']);
        }
      } else {
        next.add(status);
      }
      return next;
    });
  };

  // Export config
  const handleExportConfig = () => {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      servers: servers.map((s) => ({
        id: s.id,
        config: s.config,
      })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcp-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t('exportSuccess'), {
      description: t('exportSuccessDesc', { count: servers.length }),
    });
  };

  // Import config
  const handleImportConfig = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      if (!importData.servers || !Array.isArray(importData.servers)) {
        throw new Error(t('invalidConfigFormat'));
      }

      let importedCount = 0;
      let skippedCount = 0;
      const { addServer } = useMcpStore.getState();

      for (const serverData of importData.servers) {
        if (!serverData.id || !serverData.config) {
          skippedCount++;
          continue;
        }

        // Check if server already exists
        const existingServer = servers.find((s) => s.id === serverData.id);
        if (existingServer) {
          skippedCount++;
          continue;
        }

        try {
          await addServer(serverData.id, serverData.config);
          importedCount++;
        } catch {
          skippedCount++;
        }
      }

      await loadServers();
      
      toast.success(t('importSuccess'), {
        description: t('importSuccessDesc', { imported: importedCount, skipped: skippedCount }),
      });
    } catch (err) {
      toast.error(t('importFailed'), {
        description: (err as Error).message,
      });
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConnectAll = async () => {
    if (disconnectedEnabledServers.length === 0) return;
    setBatchAction('connecting');
    let successCount = 0;
    let errorCount = 0;
    
    for (const server of disconnectedEnabledServers) {
      try {
        await handleConnect(server.id);
        successCount++;
      } catch {
        errorCount++;
      }
    }
    
    setBatchAction(null);
    if (errorCount > 0) {
      toast.warning(t('batchConnectPartial'), {
        description: t('batchConnectPartialDesc', { success: successCount, error: errorCount }),
      });
    } else {
      toast.success(t('batchConnectSuccess'), {
        description: t('batchConnectSuccessDesc', { count: successCount }),
      });
    }
  };

  const handleDisconnectAll = async () => {
    if (connectedServers.length === 0) return;
    setBatchAction('disconnecting');
    let successCount = 0;
    let errorCount = 0;
    
    for (const server of connectedServers) {
      try {
        await handleDisconnect(server.id);
        successCount++;
      } catch {
        errorCount++;
      }
    }
    
    setBatchAction(null);
    if (errorCount > 0) {
      toast.warning(t('batchDisconnectPartial'), {
        description: t('batchDisconnectPartialDesc', { success: successCount, error: errorCount }),
      });
    } else {
      toast.success(t('batchDisconnectSuccess'), {
        description: t('batchDisconnectSuccessDesc', { count: successCount }),
      });
    }
  };

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  const handleEdit = (server: McpServerState) => {
    setEditingServer(server);
    setShowServerDialog(true);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tabs defaultValue="servers" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="servers" className="gap-1.5">
            <Plug className="h-3.5 w-3.5" />
            {t('myServers')}
          </TabsTrigger>
          <TabsTrigger value="marketplace" className="gap-1.5">
            <Store className="h-3.5 w-3.5" />
            {t('marketplace')}
          </TabsTrigger>
          <TabsTrigger value="health" className="gap-1.5">
            <HeartPulse className="h-3.5 w-3.5" />
            {t('health')}
          </TabsTrigger>
          <TabsTrigger value="tools" className="gap-1.5">
            <Wrench className="h-3.5 w-3.5" />
            {t('tools')}
          </TabsTrigger>
          <TabsTrigger value="resources" className="gap-1.5">
            <Database className="h-3.5 w-3.5" />
            {t('resources')}
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5">
            <ScrollText className="h-3.5 w-3.5" />
            {t('logs')}
          </TabsTrigger>
        </TabsList>

        {/* My Servers Tab */}
        <TabsContent value="servers" className="space-y-4">
          {/* Header Alert */}
          <Alert className="bg-muted/30">
            <Plug className="h-4 w-4" />
            <AlertTitle className="text-sm">{t('title')}</AlertTitle>
            <AlertDescription className="text-xs">
              {t('description')}
            </AlertDescription>
          </Alert>

          {/* Error Alert */}
          {error && (
            <MCPErrorDisplay
              error={error}
              onDismiss={clearError}
            />
          )}

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => {
                setEditingServer(null);
                setShowServerDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              {t('addServer')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowInstallWizard(true)}>
              <PlugZap className="h-4 w-4 mr-1.5" />
              {t('quickInstall')}
            </Button>
            
            {/* Batch Operations */}
            {servers.length > 0 && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleConnectAll}
                      disabled={batchAction !== null || disconnectedEnabledServers.length === 0}
                    >
                      {batchAction === 'connecting' ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      ) : (
                        <PlugZap className="h-4 w-4 mr-1.5" />
                      )}
                      {t('connectAll')}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t('connectAllTooltip', { count: disconnectedEnabledServers.length })}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDisconnectAll}
                      disabled={batchAction !== null || connectedServers.length === 0}
                    >
                      {batchAction === 'disconnecting' ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      ) : (
                        <Unplug className="h-4 w-4 mr-1.5" />
                      )}
                      {t('disconnectAll')}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t('disconnectAllTooltip', { count: connectedServers.length })}
                  </TooltipContent>
                </Tooltip>
              </>
            )}
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => loadServers()}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('refreshList')}</TooltipContent>
            </Tooltip>
            
            {/* Sort and Filter */}
            {servers.length > 0 && (
              <>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'name' | 'status' | 'type')}>
                  <SelectTrigger className="w-[120px] h-8">
                    <SortAsc className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">{t('sortByName')}</SelectItem>
                    <SelectItem value="status">{t('sortByStatus')}</SelectItem>
                    <SelectItem value="type">{t('sortByType')}</SelectItem>
                  </SelectContent>
                </Select>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5">
                      <Filter className="h-3.5 w-3.5" />
                      {t('filter')}
                      {!statusFilter.has('all') && (
                        <span className="ml-1 rounded-full bg-primary w-4 h-4 text-[10px] text-primary-foreground flex items-center justify-center">
                          {statusFilter.size}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuCheckboxItem
                      checked={statusFilter.has('all')}
                      onCheckedChange={() => toggleStatusFilter('all')}
                    >
                      {t('filterAll')}
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={statusFilter.has('connected')}
                      onCheckedChange={() => toggleStatusFilter('connected')}
                    >
                      {t('filterConnected')}
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={statusFilter.has('disconnected')}
                      onCheckedChange={() => toggleStatusFilter('disconnected')}
                    >
                      {t('filterDisconnected')}
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={statusFilter.has('error')}
                      onCheckedChange={() => toggleStatusFilter('error')}
                    >
                      {t('filterError')}
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={statusFilter.has('enabled')}
                      onCheckedChange={() => toggleStatusFilter('enabled')}
                    >
                      {t('filterEnabled')}
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={statusFilter.has('disabled')}
                      onCheckedChange={() => toggleStatusFilter('disabled')}
                    >
                      {t('filterDisabled')}
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Import/Export */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={handleExportConfig}
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      {t('export')}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('exportTooltip')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      {t('import')}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('importTooltip')}</TooltipContent>
                </Tooltip>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportConfig}
                />
              </>
            )}
          </div>

          {/* Loading State */}
          {isLoading && servers.length === 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <ServerCardSkeleton />
              <ServerCardSkeleton />
            </div>
          )}

          {/* Server List */}
          {!isLoading && servers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <Plug className="h-10 w-10 text-muted-foreground mb-3" />
                <h3 className="font-medium mb-1 text-sm">{t('noServers')}</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  {t('noServersDesc')}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setShowServerDialog(true)}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    {t('addServer')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowInstallWizard(true)}>
                    <PlugZap className="h-4 w-4 mr-1.5" />
                    {t('quickInstall')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : servers.length > 0 && (
            <>
              {/* Results count */}
              {filteredAndSortedServers.length !== servers.length && (
                <p className="text-xs text-muted-foreground">
                  {t('showingCount', { shown: filteredAndSortedServers.length, total: servers.length })}
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredAndSortedServers.map((server) => (
                  <ServerCard
                    key={server.id}
                    server={server}
                    actionLoading={actionLoading}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                    onEdit={handleEdit}
                    onRemove={handleRemove}
                    onToggleEnabled={handleToggleEnabled}
                  />
                ))}
              </div>
            </>
          )}

          {/* Dialogs */}
          <McpServerDialog
            open={showServerDialog}
            onOpenChange={setShowServerDialog}
            editingServer={editingServer}
            onClose={() => {
              setShowServerDialog(false);
              setEditingServer(null);
            }}
          />
          <McpInstallWizard
            open={showInstallWizard}
            onOpenChange={setShowInstallWizard}
          />

          {/* Remove Confirmation Dialog */}
          <AlertDialog open={!!removeConfirmId} onOpenChange={(open) => !open && cancelRemove()}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('removeServer')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('removeServerConfirmation')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={confirmRemove}>
                  {tCommon('remove')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        {/* Marketplace Tab */}
        <TabsContent value="marketplace">
          <McpMarketplace />
        </TabsContent>

        {/* Health Tab */}
        <TabsContent value="health" className="space-y-4">
          <MCPServerHealth />
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools" className="space-y-4">
          <MCPToolSelectionConfig />
          <MCPToolUsageStats />
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-4">
          <MCPResourceBrowser />
          {connectedServers.length > 0 && (
            <McpPromptsPanel serverId={connectedServers[0].id} />
          )}
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <MCPActiveCalls />
          <Alert className="bg-muted/30">
            <ScrollText className="h-4 w-4" />
            <AlertTitle className="text-sm">{t('logsTitle')}</AlertTitle>
            <AlertDescription className="text-xs">
              {t('logsDescription')}
            </AlertDescription>
          </Alert>
          <MCPLogViewer
            logs={logs}
            title={t('serverLogs')}
            maxHeight={500}
            autoScroll
            showServerColumn
            onClear={clearLogs}
          />
        </TabsContent>
      </Tabs>
    </TooltipProvider>
  );
}
