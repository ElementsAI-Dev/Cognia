'use client';

/**
 * MCP Server Dialog
 *
 * Dialog for adding/editing MCP server configurations
 */

import { useState, useEffect } from 'react';
import { Plus, X, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMcpStore } from '@/stores/mcp-store';
import type {
  McpServerState,
  McpServerConfig,
  McpConnectionType,
} from '@/types/mcp';
import { createDefaultServerConfig } from '@/types/mcp';

interface McpServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingServer: McpServerState | null;
  onClose: () => void;
}

export function McpServerDialog({
  open,
  onOpenChange,
  editingServer,
  onClose,
}: McpServerDialogProps) {
  const { addServer, updateServer } = useMcpStore();

  const [name, setName] = useState('');
  const [command, setCommand] = useState('npx');
  const [args, setArgs] = useState<string[]>([]);
  const [newArg, setNewArg] = useState('');
  const [env, setEnv] = useState<Record<string, string>>({});
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');
  const [showEnvValues, setShowEnvValues] = useState<Record<string, boolean>>({});
  const [connectionType, setConnectionType] = useState<McpConnectionType>('stdio');
  const [url, setUrl] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [autoStart, setAutoStart] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editingServer) {
        setName(editingServer.config.name);
        setCommand(editingServer.config.command);
        setArgs([...editingServer.config.args]);
        setEnv({ ...editingServer.config.env });
        setConnectionType(editingServer.config.connectionType);
        setUrl(editingServer.config.url || '');
        setEnabled(editingServer.config.enabled);
        setAutoStart(editingServer.config.autoStart);
      } else {
        resetForm();
      }
    }
  }, [open, editingServer]);

  const resetForm = () => {
    const defaults = createDefaultServerConfig();
    setName('');
    setCommand(defaults.command);
    setArgs([]);
    setNewArg('');
    setEnv({});
    setNewEnvKey('');
    setNewEnvValue('');
    setShowEnvValues({});
    setConnectionType(defaults.connectionType);
    setUrl('');
    setEnabled(defaults.enabled);
    setAutoStart(defaults.autoStart);
  };

  const handleAddArg = () => {
    if (newArg.trim()) {
      setArgs([...args, newArg.trim()]);
      setNewArg('');
    }
  };

  const handleRemoveArg = (index: number) => {
    setArgs(args.filter((_, i) => i !== index));
  };

  const handleAddEnv = () => {
    if (newEnvKey.trim()) {
      setEnv({ ...env, [newEnvKey.trim()]: newEnvValue });
      setNewEnvKey('');
      setNewEnvValue('');
    }
  };

  const handleRemoveEnv = (key: string) => {
    const { [key]: _, ...rest } = env;
    setEnv(rest);
    const { [key]: __, ...restShow } = showEnvValues;
    setShowEnvValues(restShow);
  };

  const handleSave = async () => {
    const config: McpServerConfig = {
      name: name.trim(),
      command: command.trim(),
      args,
      env,
      connectionType,
      url: connectionType === 'sse' ? url.trim() : undefined,
      enabled,
      autoStart,
    };

    setSaving(true);
    try {
      if (editingServer) {
        await updateServer(editingServer.id, config);
      } else {
        // Generate ID from name
        const id = name
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
        await addServer(id, config);
      }
      onClose();
    } catch (err) {
      console.error('Failed to save server:', err);
    } finally {
      setSaving(false);
    }
  };

  const isValid =
    name.trim() &&
    (connectionType === 'stdio' ? command.trim() : url.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingServer ? 'Edit MCP Server' : 'Add MCP Server'}
          </DialogTitle>
          <DialogDescription>
            Configure the MCP server connection settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Server Name */}
          <div className="space-y-2">
            <Label htmlFor="server-name">Server Name</Label>
            <Input
              id="server-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My Filesystem Server"
            />
          </div>

          {/* Connection Type */}
          <div className="space-y-2">
            <Label>Connection Type</Label>
            <Select
              value={connectionType}
              onValueChange={(value: McpConnectionType) =>
                setConnectionType(value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stdio">stdio (Subprocess)</SelectItem>
                <SelectItem value="sse">SSE (HTTP Server)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {connectionType === 'stdio' ? (
            <>
              {/* Command */}
              <div className="space-y-2">
                <Label htmlFor="command">Command</Label>
                <Input
                  id="command"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="npx, node, python, etc."
                />
              </div>

              {/* Arguments */}
              <div className="space-y-2">
                <Label>Arguments</Label>
                <div className="flex gap-2">
                  <Input
                    value={newArg}
                    onChange={(e) => setNewArg(e.target.value)}
                    placeholder="Add argument..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddArg();
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleAddArg}
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {args.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {args.map((arg, index) => (
                      <Badge key={index} variant="secondary" className="pr-1">
                        <span className="font-mono text-xs">{arg}</span>
                        <button
                          onClick={() => handleRemoveArg(index)}
                          className="ml-1 hover:text-destructive"
                          type="button"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* SSE URL */
            <div className="space-y-2">
              <Label htmlFor="sse-url">Server URL</Label>
              <Input
                id="sse-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="http://localhost:8080/sse"
              />
            </div>
          )}

          {/* Environment Variables */}
          <div className="space-y-2">
            <Label>Environment Variables</Label>
            <div className="flex gap-2">
              <Input
                value={newEnvKey}
                onChange={(e) => setNewEnvKey(e.target.value)}
                placeholder="KEY"
                className="w-1/3 font-mono"
              />
              <Input
                value={newEnvValue}
                onChange={(e) => setNewEnvValue(e.target.value)}
                placeholder="value"
                type="password"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleAddEnv}
                type="button"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {Object.entries(env).length > 0 && (
              <div className="space-y-2 mt-2">
                {Object.entries(env).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <code className="bg-muted px-2 py-1 rounded text-xs">
                      {key}
                    </code>
                    <span>=</span>
                    <code className="bg-muted px-2 py-1 rounded flex-1 truncate text-xs">
                      {showEnvValues[key] ? value : '••••••••'}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        setShowEnvValues({
                          ...showEnvValues,
                          [key]: !showEnvValues[key],
                        })
                      }
                      type="button"
                    >
                      {showEnvValues[key] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleRemoveEnv(key)}
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="flex items-center justify-between pt-2">
            <div className="space-y-0.5">
              <Label htmlFor="enabled">Enabled</Label>
              <p className="text-xs text-muted-foreground">
                Allow this server to be connected
              </p>
            </div>
            <Switch
              id="enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-start">Auto Start</Label>
              <p className="text-xs text-muted-foreground">
                Connect automatically when app starts
              </p>
            </div>
            <Switch
              id="auto-start"
              checked={autoStart}
              onCheckedChange={setAutoStart}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid || saving}>
            {saving ? 'Saving...' : editingServer ? 'Save' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
