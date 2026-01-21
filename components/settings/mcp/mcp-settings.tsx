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
import { Plus, Plug, PlugZap, RefreshCw, AlertCircle, Store } from 'lucide-react';
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
      </Tabs>
    </TooltipProvider>
  );
}
