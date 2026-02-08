'use client';

/**
 * External Agent Manager Component
 *
 * UI component for managing external agent connections.
 * Provides interface for adding, connecting, and monitoring external agents.
 */

import { useState, useCallback } from 'react';
import {
  Plus,
  RefreshCw,
  Settings,
  Power,
  PowerOff,
  Trash2,
  Activity,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useExternalAgent } from '@/hooks/agent';
import { ExternalAgentCommands } from './external-agent-commands';
import { ExternalAgentPlan } from './external-agent-plan';
import { ExternalAgentConfigOptions } from './external-agent-config-options';
import type {
  ExternalAgentConfig,
  ExternalAgentConnectionStatus,
} from '@/types/agent/external-agent';
import {
  EXTERNAL_AGENT_PRESETS,
  getAvailablePresets,
  type ExternalAgentPresetId,
} from '@/lib/ai/agent/external/presets';

// ============================================================================
// Types
// ============================================================================

interface AddAgentFormData {
  name: string;
  protocol: 'acp' | 'a2a' | 'http' | 'websocket' | 'custom';
  transport: 'stdio' | 'http' | 'websocket' | 'sse';
  command: string;
  args: string;
  endpoint: string;
}

// ============================================================================
// Status Badge Component
// ============================================================================

function ConnectionStatusBadge({ status }: { status: ExternalAgentConnectionStatus }) {
  const statusConfig: Record<
    ExternalAgentConnectionStatus,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    connected: { label: 'Connected', variant: 'default' },
    connecting: { label: 'Connecting...', variant: 'secondary' },
    disconnected: { label: 'Disconnected', variant: 'outline' },
    reconnecting: { label: 'Reconnecting...', variant: 'secondary' },
    error: { label: 'Error', variant: 'destructive' },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className="text-xs">
      {status === 'connected' && <Activity className="mr-1 h-3 w-3" />}
      {status === 'error' && <AlertCircle className="mr-1 h-3 w-3" />}
      {config.label}
    </Badge>
  );
}

// ============================================================================
// Agent Card Component
// ============================================================================

interface AgentCardProps {
  agent: {
    config: ExternalAgentConfig;
    connectionStatus: ExternalAgentConnectionStatus;
  };
  isActive: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onRemove: () => void;
  onSelect: () => void;
}

function AgentCard({
  agent,
  isActive,
  onConnect,
  onDisconnect,
  onRemove,
  onSelect,
}: AgentCardProps) {
  const { config, connectionStatus } = agent;
  const isConnected = connectionStatus === 'connected';

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        isActive && 'ring-2 ring-primary'
      )}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{config.name}</CardTitle>
            <CardDescription className="text-xs">
              {config.protocol.toUpperCase()} via {config.transport}
            </CardDescription>
          </div>
          <ConnectionStatusBadge status={connectionStatus} />
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {config.process?.command || config.network?.endpoint || 'No endpoint'}
          </div>
          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isConnected) {
                      onDisconnect();
                    } else {
                      onConnect();
                    }
                  }}
                >
                  {isConnected ? (
                    <PowerOff className="h-4 w-4 text-destructive" />
                  ) : (
                    <Power className="h-4 w-4 text-green-600" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isConnected ? 'Disconnect' : 'Connect'}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Remove</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Add Agent Dialog Component
// ============================================================================

interface AddAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: AddAgentFormData) => void;
}

function AddAgentDialog({ open, onOpenChange, onAdd }: AddAgentDialogProps) {
  const [selectedPreset, setSelectedPreset] = useState<ExternalAgentPresetId | ''>('');
  const [formData, setFormData] = useState<AddAgentFormData>({
    name: '',
    protocol: 'acp',
    transport: 'stdio',
    command: '',
    args: '',
    endpoint: '',
  });

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId as ExternalAgentPresetId | '');
    if (presetId && presetId !== 'custom') {
      const preset = EXTERNAL_AGENT_PRESETS[presetId as ExternalAgentPresetId];
      if (preset) {
        setFormData({
          name: preset.name,
          protocol: preset.protocol,
          transport: preset.transport,
          command: preset.process?.command || '',
          args: preset.process?.args.join(' ') || '',
          endpoint: preset.network?.endpoint || '',
        });
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
    setFormData({
      name: '',
      protocol: 'acp',
      transport: 'stdio',
      command: '',
      args: '',
      endpoint: '',
    });
    setSelectedPreset('');
    onOpenChange(false);
  };

  const isStdio = formData.transport === 'stdio';
  const currentPreset = selectedPreset
    ? EXTERNAL_AGENT_PRESETS[selectedPreset as ExternalAgentPresetId]
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add External Agent</DialogTitle>
            <DialogDescription>Configure a new external agent connection.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Preset Selector */}
            <div className="grid gap-2">
              <Label>Quick Start (Preset)</Label>
              <Select value={selectedPreset} onValueChange={handlePresetChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a preset or configure manually..." />
                </SelectTrigger>
                <SelectContent>
                  {getAvailablePresets().map((presetId) => {
                    const preset = EXTERNAL_AGENT_PRESETS[presetId];
                    if (!preset) return null;
                    return (
                      <SelectItem key={presetId} value={presetId}>
                        <div className="flex items-center gap-2">
                          <span>{preset.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({preset.tags.join(', ')})
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                  <SelectItem value="custom">Custom Configuration</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Environment Variable Hint */}
            {currentPreset?.envVarHint && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                <span className="font-medium">⚠️ Note:</span> {currentPreset.envVarHint}
              </div>
            )}

            <Separator />

            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Claude Code"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="protocol">Protocol</Label>
                <Select
                  value={formData.protocol}
                  onValueChange={(value: AddAgentFormData['protocol']) =>
                    setFormData({ ...formData, protocol: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="acp">ACP</SelectItem>
                    <SelectItem value="a2a">A2A</SelectItem>
                    <SelectItem value="http">HTTP</SelectItem>
                    <SelectItem value="websocket">WebSocket</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="transport">Transport</Label>
                <Select
                  value={formData.transport}
                  onValueChange={(value: AddAgentFormData['transport']) =>
                    setFormData({ ...formData, transport: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stdio">stdio (local)</SelectItem>
                    <SelectItem value="http">HTTP</SelectItem>
                    <SelectItem value="websocket">WebSocket</SelectItem>
                    <SelectItem value="sse">SSE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {isStdio ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="command">Command</Label>
                  <Input
                    id="command"
                    value={formData.command}
                    onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                    placeholder="npx"
                    required={isStdio}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="args">Arguments</Label>
                  <Input
                    id="args"
                    value={formData.args}
                    onChange={(e) => setFormData({ ...formData, args: e.target.value })}
                    placeholder="@anthropics/claude-code --stdio"
                  />
                </div>
              </>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="endpoint">Endpoint URL</Label>
                <Input
                  id="endpoint"
                  value={formData.endpoint}
                  onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                  placeholder="http://localhost:8080"
                  required={!isStdio}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Agent</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export interface ExternalAgentManagerProps {
  className?: string;
}

export function ExternalAgentManager({ className }: ExternalAgentManagerProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const {
    agents,
    activeAgentId,
    isExecuting,
    isLoading,
    error,
    availableCommands,
    planEntries,
    planStep,
    configOptions,
    addAgent,
    removeAgent,
    connect,
    disconnect,
    execute,
    setActiveAgent,
    setConfigOption,
    refresh,
    clearError,
  } = useExternalAgent();

  const handleAddAgent = useCallback(
    async (data: AddAgentFormData) => {
      const config: Partial<ExternalAgentConfig> = {
        name: data.name,
        protocol: data.protocol,
        transport: data.transport,
        enabled: true,
      };

      if (data.transport === 'stdio') {
        config.process = {
          command: data.command,
          args: data.args.split(' ').filter(Boolean),
        };
      } else {
        config.network = {
          endpoint: data.endpoint,
        };
      }

      await addAgent(config as ExternalAgentConfig);
    },
    [addAgent]
  );

  const handleConnect = useCallback(
    async (agentId: string) => {
      await connect(agentId);
    },
    [connect]
  );

  const handleDisconnect = useCallback(
    async (agentId: string) => {
      await disconnect(agentId);
    },
    [disconnect]
  );

  const handleRemove = useCallback(
    async (agentId: string) => {
      if (confirm('Are you sure you want to remove this agent?')) {
        await removeAgent(agentId);
      }
    },
    [removeAgent]
  );

  const handleCommandExecute = useCallback(
    async (command: string, args?: string) => {
      const prompt = args ? `${command} ${args}` : command;
      await execute(prompt);
    },
    [execute]
  );

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">External Agents</h3>
          <p className="text-sm text-muted-foreground">Manage connections to external AI agents</p>
        </div>
        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={refresh} disabled={isLoading}>
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Agent
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-destructive bg-destructive/10 p-3">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
          <Button variant="ghost" size="sm" onClick={clearError}>
            Dismiss
          </Button>
        </div>
      )}

      <Separator />

      {/* Agent List */}
      <ScrollArea className="h-[400px]">
        {agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Settings className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h4 className="text-lg font-medium">No External Agents</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Add an external agent to get started
            </p>
            <Button className="mt-4" onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Agent
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {agents.map((agent) => (
              <AgentCard
                key={agent.config.id}
                agent={agent}
                isActive={activeAgentId === agent.config.id}
                onConnect={() => handleConnect(agent.config.id)}
                onDisconnect={() => handleDisconnect(agent.config.id)}
                onRemove={() => handleRemove(agent.config.id)}
                onSelect={() => setActiveAgent(agent.config.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Config Options */}
      {configOptions.length > 0 && (
        <ExternalAgentConfigOptions
          configOptions={configOptions}
          onSetConfigOption={setConfigOption}
          disabled={isExecuting}
          compact
        />
      )}

      {(availableCommands.length > 0 || planEntries.length > 0) && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <ExternalAgentCommands
              commands={availableCommands}
              onExecute={handleCommandExecute}
              isExecuting={isExecuting}
            />
          </div>
          <ExternalAgentPlan entries={planEntries} currentStep={planStep ?? undefined} />
        </div>
      )}

      {/* Add Agent Dialog */}
      <AddAgentDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} onAdd={handleAddAgent} />
    </div>
  );
}

export default ExternalAgentManager;
