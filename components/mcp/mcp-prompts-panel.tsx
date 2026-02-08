'use client';

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Sparkles, FileText, Search, AlertCircle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { useMcpStore } from '@/stores';
import type { McpPrompt, PromptContent, PromptMessage } from '@/types/mcp';

export interface McpPromptsPanelProps {
  serverId: string;
  onInsert?: (content: string) => void;
  onUseAsSystemPrompt?: (content: string) => void;
  className?: string;
}

export function McpPromptsPanel({
  serverId,
  onInsert,
  onUseAsSystemPrompt,
  className,
}: McpPromptsPanelProps) {
  const t = useTranslations('mcp');
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

  const handleInsert = useCallback(() => {
    if (!promptContent) return;
    const combined = flattenMessages(promptContent.messages);
    onInsert?.(combined);
  }, [promptContent, onInsert]);

  const handleUseAsSystemPrompt = useCallback(() => {
    if (!promptContent) return;
    const combined = flattenMessages(promptContent.messages);
    onUseAsSystemPrompt?.(combined);
  }, [promptContent, onUseAsSystemPrompt]);

  if (!server) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t('prompts')}
          </CardTitle>
          <CardDescription>{t('serverNotFound')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const allPrompts = server.prompts || [];

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t('prompts')}
          </CardTitle>
          <CardDescription>{server.name}</CardDescription>
        </div>
        <Badge variant="outline">
          {allPrompts.length} {t('prompts')}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[260px_1fr]">
        <div className="space-y-2">
          {allPrompts.length > 3 && (
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchPrompts')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          )}
          <ScrollArea className="max-h-[320px] rounded-md border">
            <div className="p-2 space-y-1">
              {filteredPrompts.map((prompt) => (
                <Button
                  key={prompt.name}
                  variant={selectedPrompt?.name === prompt.name ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => handleSelectPrompt(prompt)}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{prompt.name}</span>
                    {prompt.description && (
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {prompt.description}
                      </span>
                    )}
                    {prompt.arguments && prompt.arguments.length > 0 && (
                      <span className="text-xs text-blue-500">
                        {prompt.arguments.length} {t('promptArguments')}
                      </span>
                    )}
                  </div>
                </Button>
              ))}
              {filteredPrompts.length === 0 && allPrompts.length > 0 && (
                <div className="text-center text-sm text-muted-foreground py-4">
                  {t('noResults')}
                </div>
              )}
              {allPrompts.length === 0 && (
                <Empty className="py-6">
                  <EmptyMedia variant="icon">
                    <FileText className="h-5 w-5" />
                  </EmptyMedia>
                  <EmptyTitle className="text-sm">{t('noPrompts')}</EmptyTitle>
                  <EmptyDescription className="text-xs">{t('noPromptsDesc')}</EmptyDescription>
                </Empty>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="rounded-md border p-3 min-h-[260px]">
          {!selectedPrompt && (
            <Empty className="py-8">
              <EmptyMedia variant="icon">
                <Sparkles className="h-5 w-5" />
              </EmptyMedia>
              <EmptyTitle className="text-sm">{t('selectPrompt')}</EmptyTitle>
              <EmptyDescription className="text-xs">{t('selectPromptDesc')}</EmptyDescription>
            </Empty>
          )}

          {selectedPrompt && !promptContent && !isLoading && !error && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold">{selectedPrompt.name}</h4>
                {selectedPrompt.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedPrompt.description}
                  </p>
                )}
              </div>

              {selectedPrompt.arguments && selectedPrompt.arguments.length > 0 && (
                <div className="space-y-3">
                  <h5 className="text-sm font-medium">{t('promptArguments')}</h5>
                  {selectedPrompt.arguments.map((arg) => (
                    <div key={arg.name} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`arg-${arg.name}`} className="text-sm">
                          {arg.name}
                        </Label>
                        <Badge
                          variant={arg.required ? 'default' : 'secondary'}
                          className="text-xs h-4"
                        >
                          {arg.required ? t('required') : t('optional')}
                        </Badge>
                      </div>
                      {arg.description && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-xs text-muted-foreground truncate cursor-help">
                              {arg.description}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent>{arg.description}</TooltipContent>
                        </Tooltip>
                      )}
                      <Input
                        id={`arg-${arg.name}`}
                        value={promptArgs[arg.name] || ''}
                        onChange={(e) =>
                          setPromptArgs((prev) => ({ ...prev, [arg.name]: e.target.value }))
                        }
                        placeholder={arg.description || arg.name}
                        className="h-8"
                      />
                    </div>
                  ))}
                </div>
              )}

              <Button onClick={handlePreview} className="w-full">
                <Sparkles className="h-4 w-4 mr-1" />
                {t('readResource')}
              </Button>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('loadingPrompt')}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive py-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{t('promptFetchError')}: {error}</span>
            </div>
          )}

          {!isLoading && !error && promptContent && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{selectedPrompt?.name}</h4>
                <div className="flex gap-1">
                  {onUseAsSystemPrompt && (
                    <Button size="sm" variant="outline" onClick={handleUseAsSystemPrompt}>
                      {t('useAsSystemPrompt')}
                    </Button>
                  )}
                  {onInsert && (
                    <Button size="sm" onClick={handleInsert}>
                      <Sparkles className="h-4 w-4 mr-1" />
                      {t('insert')}
                    </Button>
                  )}
                </div>
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
