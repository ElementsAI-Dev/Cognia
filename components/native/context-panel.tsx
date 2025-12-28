'use client';

import { useContext, AppType } from '@/hooks/use-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Monitor,
  AppWindow,
  FileCode,
  Globe,
  Code,
  RefreshCw,
  Folder,
  GitBranch,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContextPanelProps {
  className?: string;
}

export function ContextPanel({ className }: ContextPanelProps) {
  const {
    context,
    isLoading,
    error,
    fetchContext,
  } = useContext();

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
    <div className={cn('flex flex-col h-full min-h-0 overflow-hidden', className)}>
      <div className="flex items-center justify-between p-2 sm:p-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          <span className="font-medium">Context Awareness</span>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => fetchContext()}
          disabled={isLoading}
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-4">
          {error && (
            <div className="text-sm text-destructive p-2 bg-destructive/10 rounded">
              {error}
            </div>
          )}

          {context?.window && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AppWindow className="h-4 w-4" />
                  Active Window
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium truncate">{context.window.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{context.window.process_name}</span>
                  <span>·</span>
                  <span>{context.window.width}x{context.window.height}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {context?.app && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  {getAppTypeIcon(context.app.app_type)}
                  Application
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
                    <Badge variant="outline" className="text-xs">Text Input</Badge>
                  )}
                  {context.app.supports_rich_text && (
                    <Badge variant="outline" className="text-xs">Rich Text</Badge>
                  )}
                  {context.app.is_dev_tool && (
                    <Badge variant="outline" className="text-xs">Dev Tool</Badge>
                  )}
                </div>
                {context.app.suggested_actions.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Suggested Actions</p>
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
                  Editor Context
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{context.editor.editor_name}</p>
                {context.editor.file_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileCode className="h-3 w-3 text-muted-foreground" />
                    <span className="truncate">{context.editor.file_name}</span>
                    {context.editor.is_modified && (
                      <span className="text-yellow-500">●</span>
                    )}
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
                  Browser Context
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{context.browser.browser_name}</p>
                {context.browser.page_title && (
                  <p className="text-sm truncate">{context.browser.page_title}</p>
                )}
                {context.browser.domain && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {context.browser.is_secure && (
                      <span className="text-green-500">🔒</span>
                    )}
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
                  File Context
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {context.file.file_name && (
                  <p className="font-medium truncate">{context.file.file_name}</p>
                )}
                {context.file.directory && (
                  <p className="text-xs text-muted-foreground truncate">
                    {context.file.directory}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  {context.file.language && (
                    <Badge variant="secondary" className="text-xs">
                      {context.file.language}
                    </Badge>
                  )}
                  {context.file.is_modified && (
                    <Badge variant="outline" className="text-xs text-yellow-500">
                      Modified
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {!context && !isLoading && !error && (
            <EmptyState
              icon={Monitor}
              title="No context available"
              description="Context awareness is not detecting any active window"
              compact
            />
          )}
        </div>
      </ScrollArea>

      {context && (
        <div className="p-2 border-t text-xs text-muted-foreground text-center shrink-0">
          Last updated: {new Date(context.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
