'use client';

/**
 * ExternalAgentSettings - Settings component for managing external agents
 * Provides UI for configuring external agents, connection settings, and delegation rules
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Plus,
  Trash2,
  Edit,
  Power,
  PowerOff,
  ExternalLink,
  Plug,
  PlugZap,
  AlertCircle,
  Loader2,
  Terminal,
  Globe,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useExternalAgentStore } from '@/stores/agent/external-agent-store';
import { useExternalAgent } from '@/hooks/agent/use-external-agent';
import type {
  ExternalAgentConnectionStatus,
  CreateExternalAgentInput,
  AcpPermissionMode,
} from '@/types/agent/external-agent';

// =============================================================================
// Types
// =============================================================================

interface AgentFormData {
  name: string;
  protocol: 'acp' | 'a2a' | 'http' | 'websocket' | 'custom';
  transport: 'stdio' | 'http' | 'websocket' | 'sse';
  // Process config (for stdio)
  processCommand: string;
  processArgs: string;
  processCwd: string;
  // Network config (for http/websocket)
  networkEndpoint: string;
  networkApiKey: string;
  // Settings
  defaultPermissionMode: AcpPermissionMode;
  description: string;
}

const DEFAULT_FORM_DATA: AgentFormData = {
  name: '',
  protocol: 'acp',
  transport: 'stdio',
  processCommand: '',
  processArgs: '',
  processCwd: '',
  networkEndpoint: '',
  networkApiKey: '',
  defaultPermissionMode: 'default',
  description: '',
};

// =============================================================================
// Connection Status Components
// =============================================================================

function ConnectionStatusIcon({ status }: { status: ExternalAgentConnectionStatus }) {
  switch (status) {
    case 'connected':
      return <PlugZap className="h-4 w-4 text-green-500" />;
    case 'connecting':
    case 'reconnecting':
      return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    default:
      return <Plug className="h-4 w-4 text-muted-foreground" />;
  }
}

// =============================================================================
// Agent Editor Dialog
// =============================================================================

interface AgentEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAgentId?: string | null;
  onSave: (data: CreateExternalAgentInput) => void;
}

function AgentEditorDialog({
  open,
  onOpenChange,
  editingAgentId,
  onSave,
}: AgentEditorDialogProps) {
  const t = useTranslations('externalAgent.settings');
  const tCommon = useTranslations('common');
  const { getAgent } = useExternalAgentStore();

  const [formData, setFormData] = useState<AgentFormData>(() => {
    if (editingAgentId) {
      const agent = getAgent(editingAgentId);
      if (agent) {
        return {
          name: agent.name,
          protocol: agent.protocol,
          transport: agent.transport,
          processCommand: agent.process?.command || '',
          processArgs: agent.process?.args?.join(' ') || '',
          processCwd: agent.process?.cwd || '',
          networkEndpoint: agent.network?.endpoint || '',
          networkApiKey: agent.network?.apiKey || '',
          defaultPermissionMode: agent.defaultPermissionMode || 'default',
          description: agent.description || '',
        };
      }
    }
    return DEFAULT_FORM_DATA;
  });

  const handleSave = useCallback(() => {
    if (!formData.name.trim()) {
      toast.error(t('nameRequired'));
      return;
    }

    const input: CreateExternalAgentInput = {
      name: formData.name.trim(),
      protocol: formData.protocol,
      transport: formData.transport,
      description: formData.description,
      defaultPermissionMode: formData.defaultPermissionMode,
    };

    if (formData.transport === 'stdio') {
      if (!formData.processCommand.trim()) {
        toast.error(t('commandRequired'));
        return;
      }
      input.process = {
        command: formData.processCommand.trim(),
        args: formData.processArgs.split(' ').filter(Boolean),
        cwd: formData.processCwd || undefined,
      };
    } else {
      if (!formData.networkEndpoint.trim()) {
        toast.error(t('endpointRequired'));
        return;
      }
      input.network = {
        endpoint: formData.networkEndpoint.trim(),
        apiKey: formData.networkApiKey || undefined,
      };
    }

    onSave(input);
    onOpenChange(false);
    setFormData(DEFAULT_FORM_DATA);
  }, [formData, onSave, onOpenChange, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingAgentId ? t('editAgent') : t('addAgent')}
          </DialogTitle>
          <DialogDescription>
            {t('agentConfigDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="name">{t('agentName')}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('agentNamePlaceholder')}
            />
          </div>

          {/* Protocol */}
          <div className="grid gap-2">
            <Label>{t('protocol')}</Label>
            <Select
              value={formData.protocol}
              onValueChange={(v) => setFormData({ ...formData, protocol: v as AgentFormData['protocol'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="acp">ACP (Agent Client Protocol)</SelectItem>
                <SelectItem value="a2a" disabled>A2A (Coming Soon)</SelectItem>
                <SelectItem value="http" disabled>HTTP (Coming Soon)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transport */}
          <div className="grid gap-2">
            <Label>{t('transport')}</Label>
            <Select
              value={formData.transport}
              onValueChange={(v) => setFormData({ ...formData, transport: v as AgentFormData['transport'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stdio">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4" />
                    <span>Stdio (本地进程)</span>
                  </div>
                </SelectItem>
                <SelectItem value="http">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <span>HTTP (远程)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Process Config (for stdio) */}
          {formData.transport === 'stdio' && (
            <>
              <Separator />
              <div className="grid gap-2">
                <Label htmlFor="command">{t('command')}</Label>
                <Input
                  id="command"
                  value={formData.processCommand}
                  onChange={(e) => setFormData({ ...formData, processCommand: e.target.value })}
                  placeholder="npx @anthropics/claude-code"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="args">{t('arguments')}</Label>
                <Input
                  id="args"
                  value={formData.processArgs}
                  onChange={(e) => setFormData({ ...formData, processArgs: e.target.value })}
                  placeholder="--stdio --model claude-sonnet"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cwd">{t('workingDirectory')}</Label>
                <Input
                  id="cwd"
                  value={formData.processCwd}
                  onChange={(e) => setFormData({ ...formData, processCwd: e.target.value })}
                  placeholder={t('cwdPlaceholder')}
                />
              </div>
            </>
          )}

          {/* Network Config (for http/websocket) */}
          {formData.transport !== 'stdio' && (
            <>
              <Separator />
              <div className="grid gap-2">
                <Label htmlFor="endpoint">{t('endpoint')}</Label>
                <Input
                  id="endpoint"
                  value={formData.networkEndpoint}
                  onChange={(e) => setFormData({ ...formData, networkEndpoint: e.target.value })}
                  placeholder="https://api.example.com/agent"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="apiKey">{t('apiKey')}</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={formData.networkApiKey}
                  onChange={(e) => setFormData({ ...formData, networkApiKey: e.target.value })}
                  placeholder={t('apiKeyPlaceholder')}
                />
              </div>
            </>
          )}

          {/* Permission Mode */}
          <Separator />
          <div className="grid gap-2">
            <Label>{t('defaultPermissionMode')}</Label>
            <Select
              value={formData.defaultPermissionMode}
              onValueChange={(v) => setFormData({ ...formData, defaultPermissionMode: v as AcpPermissionMode })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">{t('permissionDefault')}</SelectItem>
                <SelectItem value="acceptEdits">{t('permissionAcceptEdits')}</SelectItem>
                <SelectItem value="bypassPermissions">{t('permissionBypass')}</SelectItem>
                <SelectItem value="plan">{t('permissionPlan')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSave}>
            {editingAgentId ? tCommon('save') : tCommon('add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Main Settings Component
// =============================================================================

export function ExternalAgentSettings() {
  const t = useTranslations('externalAgent.settings');
  const tCommon = useTranslations('common');

  // Store
  const {
    getAllAgents,
    getConnectionStatus,
    addAgent,
    updateAgent,
    removeAgent,
    enabled,
    setEnabled,
    defaultPermissionMode,
    setDefaultPermissionMode,
    autoConnectOnStartup,
    setAutoConnectOnStartup,
    showConnectionNotifications,
    setShowConnectionNotifications,
  } = useExternalAgentStore();

  // Hook for connection management
  const { connect, disconnect } = useExternalAgent();

  // Check if a specific agent is connecting
  const isConnecting = useCallback((agentId: string) => {
    const status = getConnectionStatus(agentId);
    return status === 'connecting' || status === 'reconnecting';
  }, [getConnectionStatus]);

  // Local state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());

  // Get agents
  const agents = getAllAgents();

  // Handlers
  const handleAddAgent = useCallback((data: CreateExternalAgentInput) => {
    addAgent(data);
    toast.success(t('agentAdded'));
  }, [addAgent, t]);

  const handleEditAgent = useCallback((agentId: string) => {
    setEditingAgentId(agentId);
    setEditorOpen(true);
  }, []);

  const handleUpdateAgent = useCallback((data: CreateExternalAgentInput) => {
    if (editingAgentId) {
      updateAgent(editingAgentId, data);
      toast.success(t('agentUpdated'));
    }
    setEditingAgentId(null);
  }, [editingAgentId, updateAgent, t]);

  const handleDeleteAgent = useCallback(() => {
    if (deleteConfirmId) {
      removeAgent(deleteConfirmId);
      toast.success(t('agentRemoved'));
      setDeleteConfirmId(null);
    }
  }, [deleteConfirmId, removeAgent, t]);

  const handleConnect = useCallback(async (agentId: string) => {
    try {
      await connect(agentId);
      toast.success(t('connected'));
    } catch (error) {
      toast.error(t('connectionFailed'), {
        description: (error as Error).message,
      });
    }
  }, [connect, t]);

  const handleDisconnect = useCallback(async (agentId: string) => {
    try {
      await disconnect(agentId);
      toast.success(t('disconnected'));
    } catch (_error) {
      toast.error(t('disconnectFailed'));
    }
  }, [disconnect, t]);

  const toggleExpanded = useCallback((agentId: string) => {
    setExpandedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) {
        next.delete(agentId);
      } else {
        next.add(agentId);
      }
      return next;
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable External Agents */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('enableExternalAgents')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('enableExternalAgentsDesc')}
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <Separator />

          {/* Auto Connect */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('autoConnect')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('autoConnectDesc')}
              </p>
            </div>
            <Switch
              checked={autoConnectOnStartup}
              onCheckedChange={setAutoConnectOnStartup}
              disabled={!enabled}
            />
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('showNotifications')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('showNotificationsDesc')}
              </p>
            </div>
            <Switch
              checked={showConnectionNotifications}
              onCheckedChange={setShowConnectionNotifications}
              disabled={!enabled}
            />
          </div>

          <Separator />

          {/* Default Permission Mode */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('defaultPermissionMode')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('defaultPermissionModeDesc')}
              </p>
            </div>
            <Select
              value={defaultPermissionMode}
              onValueChange={(v) => setDefaultPermissionMode(v as 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan')}
              disabled={!enabled}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">{t('permissionDefault')}</SelectItem>
                <SelectItem value="acceptEdits">{t('permissionAcceptEdits')}</SelectItem>
                <SelectItem value="bypassPermissions">{t('permissionBypass')}</SelectItem>
                <SelectItem value="plan">{t('permissionPlan')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Agent List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('configuredAgents')}</CardTitle>
              <CardDescription>{t('configuredAgentsDesc')}</CardDescription>
            </div>
            <Button
              onClick={() => {
                setEditingAgentId(null);
                setEditorOpen(true);
              }}
              disabled={!enabled}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('addAgent')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ExternalLink className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('noAgentsConfigured')}</p>
              <p className="text-sm">{t('addAgentToStart')}</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-3">
                {agents.map((agent) => {
                  const status = getConnectionStatus(agent.id);
                  const isExpanded = expandedAgents.has(agent.id);
                  const isConnected = status === 'connected';

                  return (
                    <Collapsible
                      key={agent.id}
                      open={isExpanded}
                      onOpenChange={() => toggleExpanded(agent.id)}
                    >
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <ConnectionStatusIcon status={status} />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{agent.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {agent.protocol.toUpperCase()}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {agent.transport}
                                </Badge>
                              </div>
                              {agent.description && (
                                <p className="text-sm text-muted-foreground">
                                  {agent.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isConnected ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDisconnect(agent.id)}
                              >
                                <PowerOff className="h-4 w-4 mr-1" />
                                {t('disconnect')}
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleConnect(agent.id)}
                                disabled={isConnecting(agent.id)}
                              >
                                {isConnecting(agent.id) ? (
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                  <Power className="h-4 w-4 mr-1" />
                                )}
                                {t('connect')}
                              </Button>
                            )}
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="icon">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                        </div>

                        <CollapsibleContent className="mt-4 pt-4 border-t space-y-4">
                          {/* Agent Details */}
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">{t('transport')}:</span>
                              <span className="ml-2">{agent.transport}</span>
                            </div>
                            {agent.process && (
                              <>
                                <div>
                                  <span className="text-muted-foreground">{t('command')}:</span>
                                  <code className="ml-2 text-xs bg-muted px-1 rounded">
                                    {agent.process.command}
                                  </code>
                                </div>
                                {agent.process.cwd && (
                                  <div className="col-span-2">
                                    <span className="text-muted-foreground">{t('workingDirectory')}:</span>
                                    <code className="ml-2 text-xs bg-muted px-1 rounded">
                                      {agent.process.cwd}
                                    </code>
                                  </div>
                                )}
                              </>
                            )}
                            {agent.network && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">{t('endpoint')}:</span>
                                <code className="ml-2 text-xs bg-muted px-1 rounded">
                                  {agent.network.endpoint}
                                </code>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditAgent(agent.id)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              {tCommon('edit')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirmId(agent.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              {tCommon('delete')}
                            </Button>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Agent Editor Dialog */}
      <AgentEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        editingAgentId={editingAgentId}
        onSave={editingAgentId ? handleUpdateAgent : handleAddAgent}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteAgent')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteAgentConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAgent}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ExternalAgentSettings;
