'use client';

/**
 * MCP Settings Component
 *
 * Main component for managing MCP server configurations
 * Enhanced with Skeleton loading, Tooltips, and grid layout
 * Now includes tabbed interface with Marketplace
 */

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Plus,
  Plug,
  PlugZap,
  RefreshCw,
  Trash2,
  Edit2,
  AlertCircle,
  Check,
  Loader2,
  ChevronDown,
  ChevronRight,
  Store,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useMcpStore } from '@/stores/mcp-store';
import { McpServerDialog } from './mcp-server-dialog';
import { McpInstallWizard } from './mcp-install-wizard';
import { McpMarketplace } from './mcp-marketplace';
import type { McpServerState, McpServerStatus } from '@/types/mcp';
import { getStatusText, getStatusColor, isServerConnected, isServerError } from '@/types/mcp';

function StatusIcon({ status }: { status: McpServerStatus }) {
  const getIcon = () => {
    switch (status.type) {
      case 'connected':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'connecting':
      case 'reconnecting':
        return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Plug className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTooltipText = () => {
    switch (status.type) {
      case 'connected':
        return 'Server connected and ready';
      case 'connecting':
        return 'Connecting to server...';
      case 'reconnecting':
        return 'Reconnecting to server...';
      case 'error':
        return status.message || 'Connection error';
      default:
        return 'Server disconnected';
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help">{getIcon()}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {getTooltipText()}
      </TooltipContent>
    </Tooltip>
  );
}

// Skeleton component for loading state
function ServerCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </CardContent>
    </Card>
  );
}

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
    connectServer,
    disconnectServer,
    removeServer,
    updateServer,
    clearError,
  } = useMcpStore();

  const [showServerDialog, setShowServerDialog] = useState(false);
  const [showInstallWizard, setShowInstallWizard] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServerState | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  const handleConnect = async (id: string) => {
    setActionLoading(id);
    try {
      await connectServer(id);
    } catch (err) {
      console.error('Failed to connect:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisconnect = async (id: string) => {
    setActionLoading(id);
    try {
      await disconnectServer(id);
    } catch (err) {
      console.error('Failed to disconnect:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);

  const handleRemove = (id: string) => {
    setRemoveConfirmId(id);
  };

  const confirmRemove = async () => {
    if (removeConfirmId) {
      try {
        await removeServer(removeConfirmId);
      } catch (err) {
        console.error('Failed to remove:', err);
      }
    }
    setRemoveConfirmId(null);
  };

  const handleEdit = (server: McpServerState) => {
    setEditingServer(server);
    setShowServerDialog(true);
  };

  const handleToggleEnabled = async (server: McpServerState) => {
    try {
      await updateServer(server.id, {
        ...server.config,
        enabled: !server.config.enabled,
      });
    } catch (err) {
      console.error('Failed to toggle enabled:', err);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedServers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tabs defaultValue="servers" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="servers" className="gap-1.5">
            <Plug className="h-3.5 w-3.5" />
            {t('myServers')}
          </TabsTrigger>
          <TabsTrigger value="marketplace" className="gap-1.5">
            <Store className="h-3.5 w-3.5" />
            {t('marketplace')}
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
            <div className="grid gap-3 sm:grid-cols-2">
              {servers.map((server) => (
                <Card key={server.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <StatusIcon status={server.status} />
                          <span className="truncate">{server.name}</span>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {server.config.connectionType.toUpperCase()}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="text-[10px] font-mono truncate">
                          {server.config.connectionType === 'stdio'
                            ? `${server.config.command} ${server.config.args.join(' ')}`
                            : server.config.url}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] ${getStatusColor(server.status)}`}>
                          {getStatusText(server.status)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    {/* Tools/Resources/Prompts counts */}
                    {isServerConnected(server.status) && (
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">{server.tools.length} tools</span>
                          </TooltipTrigger>
                          <TooltipContent>Functions the AI can call</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">{server.resources.length} resources</span>
                          </TooltipTrigger>
                          <TooltipContent>Data sources available</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">{server.prompts.length} prompts</span>
                          </TooltipTrigger>
                          <TooltipContent>Prompt templates</TooltipContent>
                        </Tooltip>
                      </div>
                    )}

                    {/* Error message */}
                    {isServerError(server.status) && (
                      <Alert variant="destructive" className="py-2">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <AlertDescription className="text-xs">{server.status.message}</AlertDescription>
                      </Alert>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1.5">
                        {isServerConnected(server.status) ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleDisconnect(server.id)}
                            disabled={actionLoading === server.id}
                          >
                            {actionLoading === server.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              t('disconnect')
                            )}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleConnect(server.id)}
                            disabled={
                              actionLoading === server.id || !server.config.enabled
                            }
                          >
                            {actionLoading === server.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              t('connect')
                            )}
                          </Button>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEdit(server)}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t('editServer')}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleRemove(server.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t('removeServer')}</TooltipContent>
                        </Tooltip>
                      </div>
                      <Switch
                        checked={server.config.enabled}
                        onCheckedChange={() => handleToggleEnabled(server)}
                      />
                    </div>

                    {/* Tools list (expandable) */}
                    {isServerConnected(server.status) && server.tools.length > 0 && (
                      <Collapsible
                        open={expandedServers.has(server.id)}
                        onOpenChange={() => toggleExpanded(server.id)}
                      >
                        <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                          {expandedServers.has(server.id) ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                          {t('showTools')} ({server.tools.length})
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 space-y-1 pl-4">
                          {server.tools.map((tool) => (
                            <div
                              key={tool.name}
                              className="flex items-start gap-2 text-xs"
                            >
                              <code className="text-[10px] bg-muted px-1 py-0.5 rounded shrink-0">
                                {tool.name}
                              </code>
                              {tool.description && (
                                <span className="text-[10px] text-muted-foreground truncate">
                                  {tool.description}
                                </span>
                              )}
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
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
          <AlertDialog open={!!removeConfirmId} onOpenChange={(open) => !open && setRemoveConfirmId(null)}>
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
      </Tabs>
    </TooltipProvider>
  );
}
