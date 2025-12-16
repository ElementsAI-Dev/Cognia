'use client';

/**
 * MCP Settings Component
 *
 * Main component for managing MCP server configurations
 */

import { useState, useEffect } from 'react';
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
import { useMcpStore } from '@/stores/mcp-store';
import { McpServerDialog } from './mcp-server-dialog';
import { McpInstallWizard } from './mcp-install-wizard';
import type { McpServerState, McpServerStatus } from '@/types/mcp';
import { getStatusText, getStatusColor, isServerConnected, isServerError } from '@/types/mcp';

function StatusIcon({ status }: { status: McpServerStatus }) {
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
}

export function McpSettings() {
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

  const handleRemove = async (id: string) => {
    if (confirm('Are you sure you want to remove this MCP server?')) {
      try {
        await removeServer(id);
      } catch (err) {
        console.error('Failed to remove:', err);
      }
    }
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
    <div className="space-y-6">
      {/* Header Alert */}
      <Alert>
        <Plug className="h-4 w-4" />
        <AlertTitle>MCP Servers</AlertTitle>
        <AlertDescription>
          Connect to Model Context Protocol servers to extend AI capabilities with
          tools, resources, and prompts.
        </AlertDescription>
      </Alert>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={clearError}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setEditingServer(null);
            setShowServerDialog(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Server
        </Button>
        <Button variant="outline" onClick={() => setShowInstallWizard(true)}>
          <PlugZap className="h-4 w-4 mr-2" />
          Quick Install
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => loadServers()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Server List */}
      {servers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Plug className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No MCP Servers</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add an MCP server to extend AI capabilities with tools, resources,
              and prompts.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => setShowServerDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Server
              </Button>
              <Button variant="outline" onClick={() => setShowInstallWizard(true)}>
                <PlugZap className="h-4 w-4 mr-2" />
                Quick Install
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {servers.map((server) => (
            <Card key={server.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <StatusIcon status={server.status} />
                      {server.name}
                      <Badge variant="outline" className="text-xs">
                        {server.config.connectionType.toUpperCase()}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs font-mono">
                      {server.config.connectionType === 'stdio'
                        ? `${server.config.command} ${server.config.args.join(' ')}`
                        : server.config.url}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${getStatusColor(server.status)}`}>
                      {getStatusText(server.status)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tools/Resources/Prompts counts */}
                {isServerConnected(server.status) && (
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{server.tools.length} tools</span>
                    <span>{server.resources.length} resources</span>
                    <span>{server.prompts.length} prompts</span>
                  </div>
                )}

                {/* Error message */}
                {isServerError(server.status) && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{server.status.message}</AlertDescription>
                  </Alert>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {isServerConnected(server.status) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(server.id)}
                        disabled={actionLoading === server.id}
                      >
                        {actionLoading === server.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Disconnect'
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConnect(server.id)}
                        disabled={
                          actionLoading === server.id || !server.config.enabled
                        }
                      >
                        {actionLoading === server.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Connect'
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(server)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(server.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
                    <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
                      {expandedServers.has(server.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      Show tools ({server.tools.length})
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-1 pl-5">
                      {server.tools.map((tool) => (
                        <div
                          key={tool.name}
                          className="flex items-start gap-2 text-sm"
                        >
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">
                            {tool.name}
                          </code>
                          {tool.description && (
                            <span className="text-xs text-muted-foreground truncate">
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
    </div>
  );
}
