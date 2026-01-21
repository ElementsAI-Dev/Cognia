/**
 * Hook for managing MCP server configuration form state
 * Extracts form logic from mcp-server-dialog.tsx
 */

import { useState, useEffect, useCallback } from 'react';
import type { McpServerState, McpServerConfig, McpConnectionType } from '@/types/mcp';
import { createDefaultServerConfig } from '@/types/mcp';
import { useMcpStore } from '@/stores/mcp';

export interface McpServerFormData {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  connectionType: McpConnectionType;
  url: string;
  enabled: boolean;
  autoStart: boolean;
}

export interface McpServerFormState {
  data: McpServerFormData;
  newArg: string;
  newEnvKey: string;
  newEnvValue: string;
  showEnvValues: Record<string, boolean>;
  saving: boolean;
  isValid: boolean;
}

export interface UseMcpServerFormOptions {
  editingServer?: McpServerState | null;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export interface UseMcpServerFormReturn {
  state: McpServerFormState;
  setName: (name: string) => void;
  setCommand: (command: string) => void;
  setConnectionType: (type: McpConnectionType) => void;
  setUrl: (url: string) => void;
  setEnabled: (enabled: boolean) => void;
  setAutoStart: (autoStart: boolean) => void;
  setNewArg: (arg: string) => void;
  setNewEnvKey: (key: string) => void;
  setNewEnvValue: (value: string) => void;
  addArg: () => void;
  removeArg: (index: number) => void;
  addEnv: () => void;
  removeEnv: (key: string) => void;
  toggleEnvVisibility: (key: string) => void;
  resetForm: () => void;
  handleSave: () => Promise<void>;
}

const createDefaultFormData = (): McpServerFormData => {
  const defaults = createDefaultServerConfig();
  return {
    name: '',
    command: defaults.command,
    args: [],
    env: {},
    connectionType: defaults.connectionType,
    url: '',
    enabled: defaults.enabled,
    autoStart: defaults.autoStart,
  };
};

export function useMcpServerForm(options: UseMcpServerFormOptions = {}): UseMcpServerFormReturn {
  const { editingServer, onSuccess, onError } = options;
  const { addServer, updateServer } = useMcpStore();

  const [data, setData] = useState<McpServerFormData>(createDefaultFormData);
  const [newArg, setNewArg] = useState('');
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');
  const [showEnvValues, setShowEnvValues] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (editingServer) {
      setData({
        name: editingServer.config.name,
        command: editingServer.config.command,
        args: [...editingServer.config.args],
        env: { ...editingServer.config.env },
        connectionType: editingServer.config.connectionType,
        url: editingServer.config.url || '',
        enabled: editingServer.config.enabled,
        autoStart: editingServer.config.autoStart,
      });
    } else {
      setData(createDefaultFormData());
      setNewArg('');
      setNewEnvKey('');
      setNewEnvValue('');
      setShowEnvValues({});
    }
  }, [editingServer]);

  const isValid =
    data.name.trim() !== '' &&
    (data.connectionType === 'stdio' ? data.command.trim() !== '' : data.url.trim() !== '');

  const setName = useCallback((name: string) => {
    setData((prev) => ({ ...prev, name }));
  }, []);

  const setCommand = useCallback((command: string) => {
    setData((prev) => ({ ...prev, command }));
  }, []);

  const setConnectionType = useCallback((connectionType: McpConnectionType) => {
    setData((prev) => ({ ...prev, connectionType }));
  }, []);

  const setUrl = useCallback((url: string) => {
    setData((prev) => ({ ...prev, url }));
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    setData((prev) => ({ ...prev, enabled }));
  }, []);

  const setAutoStart = useCallback((autoStart: boolean) => {
    setData((prev) => ({ ...prev, autoStart }));
  }, []);

  const addArg = useCallback(() => {
    if (newArg.trim()) {
      setData((prev) => ({ ...prev, args: [...prev.args, newArg.trim()] }));
      setNewArg('');
    }
  }, [newArg]);

  const removeArg = useCallback((index: number) => {
    setData((prev) => ({
      ...prev,
      args: prev.args.filter((_, i) => i !== index),
    }));
  }, []);

  const addEnv = useCallback(() => {
    if (newEnvKey.trim()) {
      setData((prev) => ({
        ...prev,
        env: { ...prev.env, [newEnvKey.trim()]: newEnvValue },
      }));
      setNewEnvKey('');
      setNewEnvValue('');
    }
  }, [newEnvKey, newEnvValue]);

  const removeEnv = useCallback((key: string) => {
    setData((prev) => {
      const { [key]: _, ...rest } = prev.env;
      return { ...prev, env: rest };
    });
    setShowEnvValues((prev) => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const toggleEnvVisibility = useCallback((key: string) => {
    setShowEnvValues((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const resetForm = useCallback(() => {
    setData(createDefaultFormData());
    setNewArg('');
    setNewEnvKey('');
    setNewEnvValue('');
    setShowEnvValues({});
  }, []);

  const handleSave = useCallback(async () => {
    const config: McpServerConfig = {
      name: data.name.trim(),
      command: data.command.trim(),
      args: data.args,
      env: data.env,
      connectionType: data.connectionType,
      url: data.connectionType === 'sse' ? data.url.trim() : undefined,
      enabled: data.enabled,
      autoStart: data.autoStart,
    };

    setSaving(true);
    try {
      if (editingServer) {
        await updateServer(editingServer.id, config);
      } else {
        const id = data.name
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
        await addServer(id, config);
      }
      onSuccess?.();
    } catch (err) {
      console.error('Failed to save server:', err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setSaving(false);
    }
  }, [data, editingServer, addServer, updateServer, onSuccess, onError]);

  return {
    state: {
      data,
      newArg,
      newEnvKey,
      newEnvValue,
      showEnvValues,
      saving,
      isValid,
    },
    setName,
    setCommand,
    setConnectionType,
    setUrl,
    setEnabled,
    setAutoStart,
    setNewArg,
    setNewEnvKey,
    setNewEnvValue,
    addArg,
    removeArg,
    addEnv,
    removeEnv,
    toggleEnvVisibility,
    resetForm,
    handleSave,
  };
}
