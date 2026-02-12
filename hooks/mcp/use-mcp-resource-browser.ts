/**
 * useMcpResourceBrowser - Hook for MCP resource browsing logic
 * Extracted from mcp-resource-browser.tsx component
 */

import { useState, useMemo, useCallback } from 'react';
import { useMcpStore } from '@/stores';
import type { McpResource, ResourceContent, ResourceTemplate } from '@/types/mcp';

export interface UseMcpResourceBrowserOptions {
  serverId?: string;
}

export interface SelectedResource {
  serverId: string;
  resource: McpResource;
}

export interface UseMcpResourceBrowserReturn {
  connectedServers: ReturnType<typeof useMcpStore.getState>['servers'];
  allResources: Array<{ serverId: string; serverName: string; resource: McpResource }>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedResource: SelectedResource | null;
  resourceContent: ResourceContent | null;
  isLoading: boolean;
  error: string | null;
  copiedUri: boolean;
  copiedContent: boolean;
  subscribedUris: Set<string>;
  templates: ResourceTemplate[];
  showTemplates: boolean;
  setShowTemplates: (show: boolean) => void;
  templateParams: Record<string, string>;
  setTemplateParams: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleReadResource: (sid: string, resource: McpResource) => Promise<void>;
  handleToggleSubscription: (sid: string, uri: string) => Promise<void>;
  handleLoadTemplates: (sid: string) => Promise<void>;
  handleCopyUri: (uri: string) => void;
  handleCopyContent: (text: string) => void;
}

export function useMcpResourceBrowser({
  serverId,
}: UseMcpResourceBrowserOptions = {}): UseMcpResourceBrowserReturn {
  const servers = useMcpStore((state) => state.servers);
  const readResource = useMcpStore((state) => state.readResource);
  const subscribeResource = useMcpStore((state) => state.subscribeResource);
  const unsubscribeResource = useMcpStore((state) => state.unsubscribeResource);
  const listResourceTemplates = useMcpStore((state) => state.listResourceTemplates);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResource, setSelectedResource] = useState<SelectedResource | null>(null);
  const [resourceContent, setResourceContent] = useState<ResourceContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedUri, setCopiedUri] = useState(false);
  const [copiedContent, setCopiedContent] = useState(false);
  const [subscribedUris, setSubscribedUris] = useState<Set<string>>(new Set());
  const [templates, setTemplates] = useState<ResourceTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({});

  const connectedServers = useMemo(() => {
    const filtered = servers.filter(
      (s) => s.status.type === 'connected' && s.resources.length > 0
    );
    if (serverId) return filtered.filter((s) => s.id === serverId);
    return filtered;
  }, [servers, serverId]);

  const allResources = useMemo(() => {
    const result: Array<{ serverId: string; serverName: string; resource: McpResource }> = [];
    for (const server of connectedServers) {
      for (const resource of server.resources) {
        result.push({ serverId: server.id, serverName: server.name, resource });
      }
    }
    if (!searchQuery) return result;
    const query = searchQuery.toLowerCase();
    return result.filter(
      (r) =>
        r.resource.name.toLowerCase().includes(query) ||
        r.resource.uri.toLowerCase().includes(query) ||
        r.resource.description?.toLowerCase().includes(query) ||
        r.resource.mimeType?.toLowerCase().includes(query)
    );
  }, [connectedServers, searchQuery]);

  const handleReadResource = useCallback(
    async (sid: string, resource: McpResource) => {
      setSelectedResource({ serverId: sid, resource });
      setIsLoading(true);
      setError(null);
      setResourceContent(null);
      try {
        const content = await readResource(sid, resource.uri);
        setResourceContent(content);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    },
    [readResource]
  );

  const handleToggleSubscription = useCallback(
    async (sid: string, uri: string) => {
      try {
        if (subscribedUris.has(uri)) {
          await unsubscribeResource(sid, uri);
          setSubscribedUris((prev) => {
            const next = new Set(prev);
            next.delete(uri);
            return next;
          });
        } else {
          await subscribeResource(sid, uri);
          setSubscribedUris((prev) => new Set(prev).add(uri));
        }
      } catch {
        // silently fail subscription toggle
      }
    },
    [subscribedUris, subscribeResource, unsubscribeResource]
  );

  const handleLoadTemplates = useCallback(
    async (sid: string) => {
      try {
        const result = await listResourceTemplates(sid);
        setTemplates(result);
        setShowTemplates(true);
      } catch {
        setTemplates([]);
      }
    },
    [listResourceTemplates]
  );

  const handleCopyUri = useCallback((uri: string) => {
    navigator.clipboard.writeText(uri);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
  }, []);

  const handleCopyContent = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedContent(true);
    setTimeout(() => setCopiedContent(false), 2000);
  }, []);

  return {
    connectedServers,
    allResources,
    searchQuery,
    setSearchQuery,
    selectedResource,
    resourceContent,
    isLoading,
    error,
    copiedUri,
    copiedContent,
    subscribedUris,
    templates,
    showTemplates,
    setShowTemplates,
    templateParams,
    setTemplateParams,
    handleReadResource,
    handleToggleSubscription,
    handleLoadTemplates,
    handleCopyUri,
    handleCopyContent,
  };
}
