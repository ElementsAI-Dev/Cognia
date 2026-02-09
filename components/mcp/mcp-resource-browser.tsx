'use client';

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Database,
  FileText,
  Search,
  Copy,
  Check,
  Bell,
  BellOff,
  Loader2,
  ChevronRight,
  Link2,
  FileCode,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { useMcpStore } from '@/stores';
import { cn } from '@/lib/utils';
import type { McpResource, ResourceContent, ResourceTemplate } from '@/types/mcp';

export interface MCPResourceBrowserProps {
  serverId?: string;
  onInsertContent?: (content: string) => void;
  className?: string;
}

export function MCPResourceBrowser({
  serverId,
  onInsertContent,
  className,
}: MCPResourceBrowserProps) {
  const t = useTranslations('mcp');
  const servers = useMcpStore((state) => state.servers);
  const readResource = useMcpStore((state) => state.readResource);
  const subscribeResource = useMcpStore((state) => state.subscribeResource);
  const unsubscribeResource = useMcpStore((state) => state.unsubscribeResource);
  const listResourceTemplates = useMcpStore((state) => state.listResourceTemplates);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResource, setSelectedResource] = useState<{
    serverId: string;
    resource: McpResource;
  } | null>(null);
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

  const getMimeIcon = (mimeType?: string) => {
    if (!mimeType) return <FileText className="h-4 w-4 text-muted-foreground" />;
    if (mimeType.startsWith('image/')) return <ImageIcon className="h-4 w-4 text-blue-500" />;
    if (mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('xml'))
      return <FileCode className="h-4 w-4 text-green-500" />;
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  };

  if (connectedServers.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {t('browseResources')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Empty className="py-8">
            <EmptyMedia variant="icon">
              <Database className="h-5 w-5" />
            </EmptyMedia>
            <EmptyTitle className="text-sm">{t('noResources')}</EmptyTitle>
            <EmptyDescription className="text-xs">{t('noResourcesDesc')}</EmptyDescription>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {t('browseResources')}
          </CardTitle>
          <CardDescription>
            {allResources.length} {t('resources')}
          </CardDescription>
        </div>
        {serverId && connectedServers[0]?.capabilities?.resources?.subscribe && (
          <Button variant="outline" size="sm" onClick={() => handleLoadTemplates(serverId)}>
            {t('resourceTemplates')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[280px_1fr]">
        {/* Resource list */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <ScrollArea className="max-h-[400px] rounded-md border">
            <div className="p-2 space-y-1">
              {allResources.map(({ serverId: sid, serverName, resource }) => (
                <button
                  key={`${sid}:${resource.uri}`}
                  className={cn(
                    'w-full flex items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent',
                    selectedResource?.resource.uri === resource.uri &&
                      selectedResource?.serverId === sid &&
                      'bg-accent'
                  )}
                  onClick={() => handleReadResource(sid, resource)}
                >
                  {getMimeIcon(resource.mimeType)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{resource.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{resource.uri}</div>
                    {!serverId && (
                      <div className="text-xs text-muted-foreground/70">{serverName}</div>
                    )}
                  </div>
                  {subscribedUris.has(resource.uri) && (
                    <Bell className="h-3 w-3 text-blue-500 shrink-0 mt-1" />
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                </button>
              ))}
              {allResources.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-4">
                  {t('noResults')}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Resource content */}
        <div className="rounded-md border p-3 min-h-[300px]">
          {!selectedResource && !showTemplates && (
            <Empty className="py-8">
              <EmptyMedia variant="icon">
                <Database className="h-5 w-5" />
              </EmptyMedia>
              <EmptyTitle className="text-sm">{t('readResource')}</EmptyTitle>
              <EmptyDescription className="text-xs">
                {t('noResourcesDesc')}
              </EmptyDescription>
            </Empty>
          )}

          {showTemplates && templates.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">{t('resourceTemplates')}</h4>
              {templates.map((tpl) => (
                <div key={tpl.uriTemplate} className="rounded border p-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{tpl.name}</span>
                    {tpl.mimeType && (
                      <Badge variant="outline" className="text-xs">
                        {tpl.mimeType}
                      </Badge>
                    )}
                  </div>
                  {tpl.description && (
                    <p className="text-xs text-muted-foreground">{tpl.description}</p>
                  )}
                  <code className="text-xs block bg-muted p-1 rounded">{tpl.uriTemplate}</code>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder={t('enterTemplateParams')}
                      className="text-xs h-7"
                      value={templateParams[tpl.uriTemplate] || ''}
                      onChange={(e) =>
                        setTemplateParams((prev) => ({
                          ...prev,
                          [tpl.uriTemplate]: e.target.value,
                        }))
                      }
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => {
                        const uri = tpl.uriTemplate.replace(
                          /\{[^}]+\}/g,
                          templateParams[tpl.uriTemplate] || ''
                        );
                        if (serverId) {
                          handleReadResource(serverId, {
                            uri,
                            name: tpl.name,
                            mimeType: tpl.mimeType,
                          });
                          setShowTemplates(false);
                        }
                      }}
                    >
                      {t('readResource')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('loadingPrompt')}
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive py-2">{error}</div>
          )}

          {!isLoading && !error && selectedResource && resourceContent && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm truncate">
                    {selectedResource.resource.name}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedResource.resource.uri}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleCopyUri(selectedResource.resource.uri)}
                      >
                        {copiedUri ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{copiedUri ? t('copied') : t('copyUri')}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() =>
                          handleToggleSubscription(
                            selectedResource.serverId,
                            selectedResource.resource.uri
                          )
                        }
                      >
                        {subscribedUris.has(selectedResource.resource.uri) ? (
                          <BellOff className="h-3.5 w-3.5 text-blue-500" />
                        ) : (
                          <Bell className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {subscribedUris.has(selectedResource.resource.uri)
                        ? t('unsubscribe')
                        : t('subscribe')}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {selectedResource.resource.mimeType && (
                <Badge variant="outline" className="text-xs">
                  {selectedResource.resource.mimeType}
                </Badge>
              )}

              <ScrollArea className="max-h-[320px] rounded border bg-muted/40">
                {resourceContent.contents.map((item, idx) => (
                  <div key={idx} className="p-3">
                    {item.text && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-xs">
                            {t('textContent')}
                          </Badge>
                          <div className="flex gap-1">
                            {onInsertContent && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-xs"
                                onClick={() => onInsertContent(item.text!)}
                              >
                                {t('insert')}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs"
                              onClick={() => handleCopyContent(item.text!)}
                            >
                              {copiedContent ? (
                                <Check className="h-3 w-3 text-green-500 mr-1" />
                              ) : (
                                <Copy className="h-3 w-3 mr-1" />
                              )}
                              {t('copyContent')}
                            </Button>
                          </div>
                        </div>
                        <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                          {item.text}
                        </pre>
                      </div>
                    )}
                    {item.blob && (
                      <div className="space-y-1">
                        <Badge variant="secondary" className="text-xs">
                          {t('blobContent')}
                        </Badge>
                        {item.mimeType?.startsWith('image/') ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={`data:${item.mimeType};base64,${item.blob}`}
                            alt={item.uri}
                            className="max-w-full rounded"
                          />
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {t('blobContent')} ({item.mimeType || 'application/octet-stream'})
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
