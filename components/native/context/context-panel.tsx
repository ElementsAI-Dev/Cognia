'use client';

import { useTranslations } from 'next-intl';
import { useContext, AppType } from '@/hooks/context';
import { useContextStore } from '@/stores/context/context-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EmptyState } from '@/components/layout/feedback/empty-state';
import {
  Monitor,
  AppWindow,
  FileCode,
  Globe,
  Code,
  Folder,
  GitBranch,
  Eye,
  ChevronLeft,
  ChevronRight,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NativeToolHeader } from '../layout/native-tool-header';

interface ContextPanelProps {
  className?: string;
}

export function ContextPanel({ className }: ContextPanelProps) {
  const t = useTranslations('contextPanel');
  const { context, isLoading, error, fetchContext } = useContext();
  const contextHistory = useContextStore((s) => s.contextHistory);
  const historyIndex = useContextStore((s) => s.historyIndex);
  const viewHistoryEntry = useContextStore((s) => s.viewHistoryEntry);
  const viewLatest = useContextStore((s) => s.viewLatest);

  const isViewingHistory = historyIndex !== null;
  const canGoBack = contextHistory.length > 0 && (historyIndex === null ? contextHistory.length > 1 : historyIndex > 0);
  const canGoForward = historyIndex !== null && historyIndex < contextHistory.length - 1;

  const getAppTypeIcon = (appType?: AppType) => {
    switch (appType) {
      case 'Browser':
        return <Globe className="h-4 w-4" />;
      case 'CodeEditor':
        return <Code className="h-4 w-4" />;
      case 'Terminal':
        return <Monitor className="h-4 w-4" />;
      default:
        return <AppWindow className="h-4 w-4" />;
    }
  };

  const getAppTypeBadgeColor = (appType?: AppType) => {
    switch (appType) {
      case 'Browser':
        return 'bg-blue-500/10 text-blue-500';
      case 'CodeEditor':
        return 'bg-green-500/10 text-green-500';
      case 'Terminal':
        return 'bg-purple-500/10 text-purple-500';
      case 'Chat':
        return 'bg-pink-500/10 text-pink-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <div className={cn('flex flex-col h-full min-h-0 overflow-hidden bg-background', className)}>
      <NativeToolHeader
        icon={Eye}
        iconClassName="bg-blue-500/10 text-blue-500"
        title={t('title')}
        description={context?.window?.process_name}
        onRefresh={() => fetchContext()}
        isRefreshing={isLoading}
        refreshLabel={t('refreshContext')}
      />

      {/* History navigation bar */}
      {contextHistory.length > 1 && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/30 shrink-0">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={!canGoBack}
              onClick={() => {
                if (historyIndex === null) {
                  viewHistoryEntry(contextHistory.length - 2);
                } else if (historyIndex > 0) {
                  viewHistoryEntry(historyIndex - 1);
                }
              }}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={!canGoForward}
              onClick={() => {
                if (historyIndex !== null && historyIndex < contextHistory.length - 1) {
                  if (historyIndex === contextHistory.length - 2) {
                    viewLatest();
                  } else {
                    viewHistoryEntry(historyIndex + 1);
                  }
                }
              }}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <History className="h-3 w-3" />
            {isViewingHistory ? (
              <button className="hover:underline" onClick={viewLatest}>
                {(historyIndex ?? 0) + 1}/{contextHistory.length} · {new Date(contextHistory[historyIndex ?? 0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </button>
            ) : (
              <span>{contextHistory.length} snapshots</span>
            )}
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-4">
          {error && (
            <div className="text-sm text-destructive p-2 bg-destructive/10 rounded">{error}</div>
          )}

          {context?.window && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AppWindow className="h-4 w-4" />
                  {t('activeWindow')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium truncate">{context.window.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{context.window.process_name}</span>
                  <span>·</span>
                  <span>
                    {context.window.width}x{context.window.height}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {context?.app && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  {getAppTypeIcon(context.app.app_type)}
                  {t('application')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{context.app.app_name}</span>
                  <Badge
                    variant="secondary"
                    className={cn('text-xs', getAppTypeBadgeColor(context.app.app_type))}
                  >
                    {context.app.app_type}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {context.app.supports_text_input && (
                    <Badge variant="outline" className="text-xs">
                      {t('textInput')}
                    </Badge>
                  )}
                  {context.app.supports_rich_text && (
                    <Badge variant="outline" className="text-xs">
                      {t('richText')}
                    </Badge>
                  )}
                  {context.app.is_dev_tool && (
                    <Badge variant="outline" className="text-xs">
                      {t('devTool')}
                    </Badge>
                  )}
                </div>
                {context.app.suggested_actions.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('suggestedActions')}</p>
                    <div className="flex flex-wrap gap-1">
                      {context.app.suggested_actions.map((action) => (
                        <Badge key={action} variant="secondary" className="text-xs">
                          {action}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {context?.editor && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileCode className="h-4 w-4" />
                  {t('editorContext')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{context.editor.editor_name}</p>
                {context.editor.file_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileCode className="h-3 w-3 text-muted-foreground" />
                    <span className="truncate">{context.editor.file_name}</span>
                    {context.editor.is_modified && <span className="text-yellow-500">●</span>}
                  </div>
                )}
                {context.editor.project_name && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Folder className="h-3 w-3" />
                    <span>{context.editor.project_name}</span>
                  </div>
                )}
                {context.editor.git_branch && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <GitBranch className="h-3 w-3" />
                    <span>{context.editor.git_branch}</span>
                  </div>
                )}
                {context.editor.language && (
                  <Badge variant="secondary" className="text-xs">
                    {context.editor.language}
                  </Badge>
                )}
              </CardContent>
            </Card>
          )}

          {context?.browser && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  {t('browserContext')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{context.browser.browser}</p>
                {context.browser.page_title && (
                  <p className="text-sm truncate">{context.browser.page_title}</p>
                )}
                {context.browser.domain && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {context.browser.is_secure && <span className="text-green-500">🔒</span>}
                    <span className="truncate">{context.browser.domain}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {context?.file && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileCode className="h-4 w-4" />
                  {t('fileContext')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {context.file.name && <p className="font-medium truncate">{context.file.name}</p>}
                {context.file.path && (
                  <p className="text-xs text-muted-foreground truncate">{context.file.path}</p>
                )}
                <div className="flex items-center gap-2">
                  {context.file.language && (
                    <Badge variant="secondary" className="text-xs">
                      {context.file.language}
                    </Badge>
                  )}
                  {context.file.is_modified && (
                    <Badge variant="outline" className="text-xs text-yellow-500">
                      {t('modified')}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {!context && !isLoading && !error && (
            <EmptyState
              icon={Monitor}
              title={t('noContextAvailable')}
              description={t('notDetecting')}
              compact
            />
          )}
        </div>
      </ScrollArea>

      {context && (
        <div className="p-2 border-t text-xs text-muted-foreground text-center shrink-0">
          {t('lastUpdated')} {new Date(context.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
