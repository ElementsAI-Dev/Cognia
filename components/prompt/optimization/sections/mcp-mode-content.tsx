'use client';

import { useTranslations } from 'next-intl';
import { Globe, AlertTriangle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader } from '@/components/ai-elements/loader';
import { cn } from '@/lib/utils';

interface McpModeContentProps {
  initialPrompt: string;
  aceServer: { id: string; name?: string } | null;
  aceToolReady: boolean;
  isConnecting: boolean;
  onAutoConnect: () => void;
}

export function McpModeContent({
  initialPrompt,
  aceServer,
  aceToolReady,
  isConnecting,
  onAutoConnect,
}: McpModeContentProps) {
  const t = useTranslations('promptOptimizer');

  return (
    <div className="space-y-4">
      {/* Original Prompt */}
      <div className="space-y-2">
        <Label>{t('originalPrompt')}</Label>
        <div className="rounded-lg border bg-muted/50 p-3 text-sm max-h-[120px] overflow-y-auto">
          {initialPrompt || <span className="text-muted-foreground italic">{t('noPrompt')}</span>}
        </div>
      </div>

      {/* MCP Server Status */}
      <div className="rounded-lg border p-3 space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">{t('mcpServerStatus')}</Label>
          <div className="flex items-center gap-2">
            {aceServer && !aceToolReady && (
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={onAutoConnect}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <Loader size={12} />
                ) : (
                  <Zap className="h-3 w-3 mr-1" />
                )}
                {t('mcpAutoConnect')}
              </Button>
            )}
            {aceServer ? (
              <Badge
                variant={aceToolReady ? 'default' : 'secondary'}
                className={cn(
                  'text-xs',
                  aceToolReady && 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                )}
              >
                {aceToolReady ? t('mcpConnected') : t('mcpDisconnected')}
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">
                {t('mcpNotConfigured')}
              </Badge>
            )}
          </div>
        </div>
        {aceServer && (
          <p className="text-xs text-muted-foreground">
            {t('mcpServerName')}: {aceServer.name || aceServer.id}
          </p>
        )}
        {!aceServer && (
          <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{t('mcpConfigHint')}</span>
          </div>
        )}
      </div>

      {/* MCP Info */}
      <Alert>
        <Globe className="h-4 w-4" />
        <AlertDescription className="text-xs">
          {t('mcpDescription')}
        </AlertDescription>
      </Alert>
    </div>
  );
}
