/**
 * useMcpPrompts - Hook for MCP prompt selection and preview logic
 * Extracted from mcp-prompts-panel.tsx component
 */

import { useState, useMemo, useCallback } from 'react';
import { useMcpStore } from '@/stores';
import { flattenPromptMessages } from '@/lib/mcp/format-utils';
import type { McpPrompt, PromptContent } from '@/types/mcp';

export interface UseMcpPromptsOptions {
  serverId: string;
}

export interface UseMcpPromptsReturn {
  server: ReturnType<typeof useMcpStore.getState>['servers'][number] | undefined;
  filteredPrompts: McpPrompt[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedPrompt: McpPrompt | null;
  promptContent: PromptContent | null;
  isLoading: boolean;
  error: string | null;
  promptArgs: Record<string, string>;
  setPromptArgs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleSelectPrompt: (prompt: McpPrompt) => void;
  handlePreview: () => Promise<void>;
  getFlattenedContent: () => string;
}

export function useMcpPrompts({ serverId }: UseMcpPromptsOptions): UseMcpPromptsReturn {
  const servers = useMcpStore((state) => state.servers);
  const getPrompt = useMcpStore((state) => state.getPrompt);
  const [selectedPrompt, setSelectedPrompt] = useState<McpPrompt | null>(null);
  const [promptContent, setPromptContent] = useState<PromptContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [promptArgs, setPromptArgs] = useState<Record<string, string>>({});

  const server = useMemo(() => servers.find((s) => s.id === serverId), [servers, serverId]);

  const filteredPrompts = useMemo(() => {
    const prompts = server?.prompts || [];
    if (!searchQuery) return prompts;
    const query = searchQuery.toLowerCase();
    return prompts.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
    );
  }, [server?.prompts, searchQuery]);

  const handleSelectPrompt = useCallback((prompt: McpPrompt) => {
    setSelectedPrompt(prompt);
    setPromptContent(null);
    setError(null);
    const initialArgs: Record<string, string> = {};
    if (prompt.arguments) {
      for (const arg of prompt.arguments) {
        initialArgs[arg.name] = '';
      }
    }
    setPromptArgs(initialArgs);
  }, []);

  const handlePreview = useCallback(async () => {
    if (!selectedPrompt) return;
    setIsLoading(true);
    setError(null);
    try {
      const args: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(promptArgs)) {
        if (value) args[key] = value;
      }
      const content = await getPrompt(serverId, selectedPrompt.name, args);
      setPromptContent(content);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPromptContent(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPrompt, promptArgs, getPrompt, serverId]);

  const getFlattenedContent = useCallback((): string => {
    if (!promptContent) return '';
    return flattenPromptMessages(promptContent.messages);
  }, [promptContent]);

  return {
    server,
    filteredPrompts,
    searchQuery,
    setSearchQuery,
    selectedPrompt,
    promptContent,
    isLoading,
    error,
    promptArgs,
    setPromptArgs,
    handleSelectPrompt,
    handlePreview,
    getFlattenedContent,
  };
}
