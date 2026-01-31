'use client';

/**
 * ToolCard - Development tool status and installation card
 * Extracted from components/settings/system/environment-settings.tsx
 */

import { useTranslations } from 'next-intl';
import {
  Check,
  X,
  Download,
  ExternalLink,
  AlertCircle,
  Loader2,
  Terminal,
  Box,
  Film,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TOOL_INFO, type EnvironmentTool, type ToolStatus } from '@/types/system/environment';

export interface ToolCardProps {
  tool: EnvironmentTool;
  status: ToolStatus;
  isInstalling: boolean;
  onInstall: () => void;
  onOpenWebsite: () => void;
  onRefresh: () => void;
  onToggleEnabled?: (enabled: boolean) => void;
}

export function ToolCard({
  tool,
  status,
  isInstalling,
  onInstall,
  onOpenWebsite,
  onRefresh,
  onToggleEnabled,
}: ToolCardProps) {
  const t = useTranslations('environmentSettings');
  const info = TOOL_INFO[tool];
  const isCurrentlyInstalling = isInstalling && status.status === 'installing';
  const isDisabled = status.status === 'disabled' || !status.enabled;

  const getStatusBadge = () => {
    if (isDisabled) {
      return (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <X className="h-3 w-3" />
          {t('disabled')}
        </Badge>
      );
    }
    if (status.status === 'checking') {
      return (
        <Badge variant="outline" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          {t('checking')}
        </Badge>
      );
    }
    if (status.status === 'installing') {
      return (
        <Badge variant="secondary" className="gap-1 bg-blue-500/10 text-blue-600 border-blue-200">
          <Loader2 className="h-3 w-3 animate-spin" />
          {t('installing')}
        </Badge>
      );
    }
    if (status.installed) {
      return (
        <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-500/10">
          <Check className="h-3 w-3" />
          {t('installed')}
        </Badge>
      );
    }
    if (status.status === 'error') {
      return (
        <Badge variant="destructive" className="gap-1">
          <X className="h-3 w-3" />
          {t('error')}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <X className="h-3 w-3" />
        {t('notInstalled')}
      </Badge>
    );
  };

  const getCategoryIcon = () => {
    if (info.category === 'language_manager') {
      return <Terminal className="h-4 w-4" />;
    }
    if (info.category === 'media_tool') {
      return <Film className="h-4 w-4" />;
    }
    return <Box className="h-4 w-4" />;
  };

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{info.icon}</span>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {info.name}
                {getStatusBadge()}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">{info.description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-muted-foreground">{getCategoryIcon()}</div>
                </TooltipTrigger>
                <TooltipContent>
                  {info.category === 'language_manager'
                    ? t('categoryLanguageManager')
                    : info.category === 'media_tool'
                      ? t('categoryMediaTool')
                      : t('categoryContainerRuntime')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {onToggleEnabled && (
              <Switch
                checked={!isDisabled}
                onCheckedChange={(checked) => onToggleEnabled(checked)}
              />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {status.installed && status.version && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">{t('version')}:</span>
            <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{status.version}</code>
          </div>
        )}

        {status.installed && status.path && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">{t('path')}:</span>
            <code className="bg-muted px-1.5 py-0.5 rounded text-[10px] truncate max-w-50">
              {status.path}
            </code>
          </div>
        )}

        {status.error && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-3 w-3" />
            <AlertDescription className="text-xs">{status.error}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-2 pt-1">
          {!status.installed && status.status !== 'installing' && (
            <Button
              size="sm"
              onClick={onInstall}
              disabled={isCurrentlyInstalling || isDisabled}
              className="gap-1.5"
            >
              {isCurrentlyInstalling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {t('install')}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            disabled={status.status === 'checking' || isCurrentlyInstalling || isDisabled}
            className="gap-1.5"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${status.status === 'checking' ? 'animate-spin' : ''}`}
            />
            {t('refresh')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onOpenWebsite}
            className="gap-1.5 ml-auto"
            disabled={isDisabled}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t('docs')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default ToolCard;
