'use client';

/**
 * FlowToolPanel - Tool selection and execution panel for flow canvas
 * Integrates with MCP store for tool calling
 * Similar to Flowith's tool capabilities
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Wrench,
  Search,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Server,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useMcpStore } from '@/stores/mcp';
import type { McpTool, ToolCallResult } from '@/types/mcp';

interface ToolWithServer {
  serverId: string;
  serverName?: string;
  tool: McpTool;
}

interface FlowToolPanelProps {
  /** Callback when a tool is executed */
  onToolExecute?: (result: {
    serverId: string;
    toolName: string;
    args: Record<string, unknown>;
    result: ToolCallResult;
  }) => void;
  /** Callback to insert tool result into canvas */
  onInsertResult?: (content: string) => void;
  className?: string;
}

export function FlowToolPanel({
  onToolExecute,
  onInsertResult,
  className,
}: FlowToolPanelProps) {
  const _t = useTranslations('flowChat');

  const servers = useMcpStore((state) => state.servers);
  const getAllTools = useMcpStore((state) => state.getAllTools);
  const callTool = useMcpStore((state) => state.callTool);

  const [tools, setTools] = useState<ToolWithServer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());
  
  // Tool execution dialog
  const [selectedTool, setSelectedTool] = useState<ToolWithServer | null>(null);
  const [toolArgs, setToolArgs] = useState<string>('{}');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ToolCallResult | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  // Load tools from all servers
  const loadTools = useCallback(async () => {
    setIsLoading(true);
    try {
      const allTools = await getAllTools();
      const toolsWithServer: ToolWithServer[] = allTools.map(({ serverId, tool }) => {
        const server = servers.find(s => s.id === serverId);
        return {
          serverId,
          serverName: server?.config.name || serverId,
          tool,
        };
      });
      setTools(toolsWithServer);
      // Expand all servers by default
      setExpandedServers(new Set(toolsWithServer.map(t => t.serverId)));
    } catch (error) {
      console.error('Failed to load tools:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getAllTools, servers]);

  // Filter tools by search query
  const filteredTools = useMemo(() => {
    if (!searchQuery) return tools;
    const query = searchQuery.toLowerCase();
    return tools.filter(
      t =>
        t.tool.name.toLowerCase().includes(query) ||
        t.tool.description?.toLowerCase().includes(query) ||
        t.serverName?.toLowerCase().includes(query)
    );
  }, [tools, searchQuery]);

  // Group tools by server
  const toolsByServer = useMemo(() => {
    const grouped = new Map<string, ToolWithServer[]>();
    for (const tool of filteredTools) {
      const existing = grouped.get(tool.serverId) || [];
      existing.push(tool);
      grouped.set(tool.serverId, existing);
    }
    return grouped;
  }, [filteredTools]);

  // Toggle server expansion
  const toggleServer = useCallback((serverId: string) => {
    setExpandedServers(prev => {
      const next = new Set(prev);
      if (next.has(serverId)) {
        next.delete(serverId);
      } else {
        next.add(serverId);
      }
      return next;
    });
  }, []);

  // Execute tool
  const executeTool = useCallback(async () => {
    if (!selectedTool) return;

    setIsExecuting(true);
    setExecutionError(null);
    setExecutionResult(null);

    try {
      const args = JSON.parse(toolArgs);
      const result = await callTool(selectedTool.serverId, selectedTool.tool.name, args);
      setExecutionResult(result);
      onToolExecute?.({
        serverId: selectedTool.serverId,
        toolName: selectedTool.tool.name,
        args,
        result,
      });
    } catch (error) {
      setExecutionError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsExecuting(false);
    }
  }, [selectedTool, toolArgs, callTool, onToolExecute]);

  // Insert result into canvas
  const handleInsertResult = useCallback(() => {
    if (!executionResult) return;
    
    const content = executionResult.content
      .map(item => {
        if (item.type === 'text') return item.text;
        if (item.type === 'image') return `[Image: ${item.mimeType}]`;
        return JSON.stringify(item);
      })
      .join('\n');
    
    onInsertResult?.(content);
    setSelectedTool(null);
    setExecutionResult(null);
  }, [executionResult, onInsertResult]);

  // Get connected servers count
  const connectedServers = servers.filter(s => s.status.type === 'connected').length;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          <span className="font-medium">Tools</span>
          <Badge variant="secondary" className="text-xs">
            {tools.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs gap-1">
            <Server className="h-3 w-3" />
            {connectedServers} servers
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={loadTools}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      {/* Tools list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {tools.length === 0 && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No tools available</p>
              <p className="text-xs">Connect to MCP servers to load tools</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={loadTools}
              >
                Load Tools
              </Button>
            </div>
          )}

          {Array.from(toolsByServer.entries()).map(([serverId, serverTools]) => {
            const serverName = serverTools[0]?.serverName || serverId;
            const isExpanded = expandedServers.has(serverId);

            return (
              <Collapsible
                key={serverId}
                open={isExpanded}
                onOpenChange={() => toggleServer(serverId)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between h-8 px-2"
                  >
                    <div className="flex items-center gap-2">
                      <Server className="h-3.5 w-3.5" />
                      <span className="text-sm font-medium">{serverName}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {serverTools.length}
                      </Badge>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pl-4 pr-1 py-1 space-y-1">
                    {serverTools.map((t) => (
                      <Tooltip key={`${t.serverId}-${t.tool.name}`}>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-auto py-1.5 px-2"
                            onClick={() => {
                              setSelectedTool(t);
                              setToolArgs(
                                JSON.stringify(
                                  t.tool.inputSchema?.properties
                                    ? Object.fromEntries(
                                        Object.keys(t.tool.inputSchema.properties).map(k => [k, ''])
                                      )
                                    : {},
                                  null,
                                  2
                                )
                              );
                              setExecutionResult(null);
                              setExecutionError(null);
                            }}
                          >
                            <div className="flex flex-col items-start gap-0.5">
                              <span className="text-xs font-medium">{t.tool.name}</span>
                              {t.tool.description && (
                                <span className="text-[10px] text-muted-foreground line-clamp-1">
                                  {t.tool.description}
                                </span>
                              )}
                            </div>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p className="font-medium">{t.tool.name}</p>
                          {t.tool.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {t.tool.description}
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>

      {/* Tool execution dialog */}
      <Dialog open={!!selectedTool} onOpenChange={(open) => !open && setSelectedTool(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              {selectedTool?.tool.name}
            </DialogTitle>
            {selectedTool?.tool.description && (
              <DialogDescription>{selectedTool.tool.description}</DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4">
            {/* Server info */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Server className="h-3.5 w-3.5" />
              <span>{selectedTool?.serverName}</span>
            </div>

            {/* Arguments input */}
            <div className="space-y-2">
              <Label>Arguments (JSON)</Label>
              <Textarea
                value={toolArgs}
                onChange={(e) => setToolArgs(e.target.value)}
                className="font-mono text-xs min-h-[120px]"
                placeholder="{}"
              />
              {selectedTool?.tool.inputSchema && (
                <p className="text-xs text-muted-foreground">
                  Required: {(selectedTool.tool.inputSchema.required as string[] | undefined)?.join(', ') || 'none'}
                </p>
              )}
            </div>

            {/* Execution result */}
            {executionResult && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  {executionResult.isError ? (
                    <XCircle className="h-4 w-4 text-destructive" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  Result
                </Label>
                <ScrollArea className="h-[150px] rounded border p-2">
                  <pre className="text-xs whitespace-pre-wrap">
                    {executionResult.content
                      .map(item => {
                        if (item.type === 'text') return item.text;
                        return JSON.stringify(item, null, 2);
                      })
                      .join('\n')}
                  </pre>
                </ScrollArea>
              </div>
            )}

            {/* Error display */}
            {executionError && (
              <div className="p-3 rounded bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{executionError}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            {executionResult && !executionResult.isError && (
              <Button variant="outline" onClick={handleInsertResult}>
                Insert Result
              </Button>
            )}
            <Button onClick={executeTool} disabled={isExecuting}>
              {isExecuting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Execute
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FlowToolPanel;
