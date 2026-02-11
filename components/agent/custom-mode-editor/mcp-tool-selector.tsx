'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronRight, Check, X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { type McpToolReference } from '@/stores/agent/custom-mode-store';
import { useMcpStore } from '@/stores/mcp/mcp-store';

interface McpToolSelectorProps {
  value: McpToolReference[];
  onChange: (tools: McpToolReference[]) => void;
}

export function McpToolSelector({ value, onChange }: McpToolSelectorProps) {
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());
  const t = useTranslations('customMode');
  const mcpServers = useMcpStore((state) => state.servers);

  const connectedServers = useMemo(
    () => mcpServers.filter((s) => s.status.type === 'connected'),
    [mcpServers]
  );

  const toggleServer = (serverId: string) => {
    const newExpanded = new Set(expandedServers);
    if (newExpanded.has(serverId)) {
      newExpanded.delete(serverId);
    } else {
      newExpanded.add(serverId);
    }
    setExpandedServers(newExpanded);
  };

  const isToolSelected = (serverId: string, toolName: string) => {
    return value.some((t) => t.serverId === serverId && t.toolName === toolName);
  };

  const toggleTool = (serverId: string, toolName: string, displayName?: string) => {
    if (isToolSelected(serverId, toolName)) {
      onChange(value.filter((t) => !(t.serverId === serverId && t.toolName === toolName)));
    } else {
      onChange([...value, { serverId, toolName, displayName }]);
    }
  };

  const toggleAllInServer = (serverId: string, tools: Array<{ name: string }>) => {
    const serverToolNames = tools.map((t) => t.name);
    const allSelected = serverToolNames.every((name) => isToolSelected(serverId, name));

    if (allSelected) {
      onChange(value.filter((t) => t.serverId !== serverId));
    } else {
      const newTools = [...value.filter((t) => t.serverId !== serverId)];
      for (const tool of tools) {
        newTools.push({ serverId, toolName: tool.name, displayName: tool.name });
      }
      onChange(newTools);
    }
  };

  if (connectedServers.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t('mcpTools') || 'MCP Tools'}</Label>
        </div>
        <div className="flex items-center justify-center h-[100px] border rounded-md text-muted-foreground text-sm">
          {t('noMcpServers') || 'No MCP servers connected'}
        </div>
      </div>
    );
  }

  const selectedCount = value.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{t('mcpTools') || 'MCP Tools'}</Label>
        <Badge variant="secondary">
          {selectedCount} {t('selected')}
        </Badge>
      </div>
      <ScrollArea className="h-[200px] border rounded-md">
        <div className="p-2 space-y-1">
          {connectedServers.map((server) => {
            const isExpanded = expandedServers.has(server.id);
            const serverTools = server.tools || [];
            const selectedInServer = serverTools.filter((t) =>
              isToolSelected(server.id, t.name)
            ).length;

            return (
              <Collapsible
                key={server.id}
                open={isExpanded}
                onOpenChange={() => toggleServer(server.id)}
              >
                <div className="flex items-center gap-2">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <Settings className="h-4 w-4" />
                      <span className="flex-1 text-left truncate">{server.name}</span>
                      <Badge variant="outline" className="ml-2">
                        {selectedInServer}/{serverTools.length}
                      </Badge>
                    </Button>
                  </CollapsibleTrigger>
                  {serverTools.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAllInServer(server.id, serverTools)}
                    >
                      {selectedInServer === serverTools.length ? (
                        <X className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                <CollapsibleContent>
                  <div className="ml-6 mt-1 space-y-1">
                    {serverTools.map((tool) => {
                      const isSelected = isToolSelected(server.id, tool.name);
                      return (
                        <Tooltip key={tool.name}>
                          <TooltipTrigger asChild>
                            <Button
                              variant={isSelected ? 'secondary' : 'ghost'}
                              size="sm"
                              className="w-full justify-start text-xs"
                              onClick={() => toggleTool(server.id, tool.name, tool.name)}
                            >
                              {isSelected && <Check className="h-3 w-3 mr-2" />}
                              <span className="truncate">{tool.name}</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[300px]">
                            <p className="text-xs">{tool.description || 'No description'}</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

export type { McpToolSelectorProps };
