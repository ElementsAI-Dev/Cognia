"use client";

import { useState, useMemo } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useMcpStore } from '@/stores';
import type { PromptContent, PromptMessage } from '@/types/mcp';

export interface McpPromptsPanelProps {
  serverId: string;
  onInsert?: (content: string) => void;
  className?: string;
}

export function McpPromptsPanel({ serverId, onInsert, className }: McpPromptsPanelProps) {
  const servers = useMcpStore((state) => state.servers);
  const getPrompt = useMcpStore((state) => state.getPrompt);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [promptContent, setPromptContent] = useState<PromptContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const server = useMemo(() => servers.find((s) => s.id === serverId), [servers, serverId]);

  const handlePreview = async (name: string) => {
    setSelectedPrompt(name);
    setIsLoading(true);
    try {
      const content = await getPrompt(serverId, name);
      setPromptContent(content);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInsert = () => {
    if (!promptContent) return;
    const combined = flattenMessages(promptContent.messages);
    onInsert?.(combined);
  };

  if (!server) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>MCP Prompts</CardTitle>
          <CardDescription>Server not found</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const prompts = server.prompts || [];

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle>MCP Prompts</CardTitle>
          <CardDescription>{server.name}</CardDescription>
        </div>
        <Badge variant="outline">{prompts.length} prompts</Badge>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[260px_1fr]">
        <div className="space-y-2">
          <ScrollArea className="max-h-[320px] rounded-md border">
            <div className="p-2 space-y-2">
              {prompts.map((prompt) => (
                <Button
                  key={prompt.name}
                  variant={selectedPrompt === prompt.name ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => handlePreview(prompt.name)}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{prompt.name}</span>
                    {prompt.description && (
                      <span className="text-xs text-muted-foreground">{prompt.description}</span>
                    )}
                  </div>
                </Button>
              ))}
              {prompts.length === 0 && (
                <p className="text-muted-foreground text-sm">No prompts exposed by this server.</p>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="rounded-md border p-3 min-h-[260px]">
          {!selectedPrompt && <p className="text-muted-foreground text-sm">Select a prompt to preview.</p>}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading prompt...
            </div>
          )}
          {!isLoading && promptContent && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{selectedPrompt}</h4>
                {onInsert && (
                  <Button size="sm" onClick={handleInsert}>
                    <Sparkles className="h-4 w-4 mr-1" />
                    Insert
                  </Button>
                )}
              </div>
              <ScrollArea className="max-h-[300px] rounded border bg-muted/40 p-3">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {flattenMessages(promptContent.messages)}
                </pre>
              </ScrollArea>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function flattenMessages(messages: PromptMessage[]): string {
  return messages
    .map((message) => {
      if (typeof message.content === 'string') return message.content;
      if (Array.isArray(message.content)) {
        return message.content
          .map((item) => (item.type === 'text' ? item.text : JSON.stringify(item)))
          .join('\n');
      }
      return '';
    })
    .join('\n');
}
