'use client';

/**
 * EnvironmentSettings - Configuration UI for development environment tools
 *
 * Manages installation and configuration of:
 * - uv (Python package manager)
 * - nvm (Node.js version manager)
 * - Docker (container runtime)
 * - Podman (container runtime)
 */

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  Settings,
  RefreshCw,
  Check,
  X,
  Download,
  ExternalLink,
  AlertCircle,
  Loader2,
  Terminal,
  Package,
  Box,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useEnvironment } from '@/hooks/use-environment';
import { TOOL_INFO, type EnvironmentTool, type ToolStatus } from '@/types/environment';

interface ToolCardProps {
  tool: EnvironmentTool;
  status: ToolStatus;
  isInstalling: boolean;
  onInstall: () => void;
  onOpenWebsite: () => void;
  onRefresh: () => void;
}

function ToolCard({
  tool,
  status,
  isInstalling,
  onInstall,
  onOpenWebsite,
  onRefresh,
}: ToolCardProps) {
  const t = useTranslations('environmentSettings');
  const info = TOOL_INFO[tool];
  const isCurrentlyInstalling = isInstalling && status.status === 'installing';

  const getStatusBadge = () => {
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
              <CardDescription className="text-xs mt-0.5">
                {info.description}
              </CardDescription>
            </div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-muted-foreground">
                  {getCategoryIcon()}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {info.category === 'language_manager'
                  ? t('categoryLanguageManager')
                  : t('categoryContainerRuntime')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {status.installed && status.version && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">{t('version')}:</span>
            <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">
              {status.version}
            </code>
          </div>
        )}

        {status.installed && status.path && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">{t('path')}:</span>
            <code className="bg-muted px-1.5 py-0.5 rounded text-[10px] truncate max-w-[200px]">
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
              disabled={isCurrentlyInstalling}
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
            disabled={status.status === 'checking' || isCurrentlyInstalling}
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
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t('docs')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function EnvironmentSettings() {
  const t = useTranslations('environmentSettings');
  const {
    platform,
    tools,
    isRefreshing,
    isInstalling,
    installProgress,
    error,
    isAvailable,
    refreshStatus,
    checkTool,
    installTool,
    openToolWebsite,
    clearError,
  } = useEnvironment();

  const [confirmInstall, setConfirmInstall] = useState<EnvironmentTool | null>(null);
  const initializedRef = useRef(false);

  // Initial status check
  useEffect(() => {
    if (isAvailable && !initializedRef.current) {
      initializedRef.current = true;
      refreshStatus();
    }
  }, [isAvailable, refreshStatus]);

  const handleInstallClick = (tool: EnvironmentTool) => {
    setConfirmInstall(tool);
  };

  const handleConfirmInstall = async () => {
    if (confirmInstall) {
      setConfirmInstall(null);
      await installTool(confirmInstall);
    }
  };

  const languageManagers: EnvironmentTool[] = ['uv', 'nvm'];
  const containerRuntimes: EnvironmentTool[] = ['docker', 'podman'];

  // Not available state (browser environment)
  if (!isAvailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Package className="h-12 w-12 mb-4 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">{t('notAvailable')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('notAvailableDesc')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {t('title')}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {t('description')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {platform}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={refreshStatus}
                disabled={isRefreshing}
                className="gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                {t('refreshAll')}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Global Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={clearError}>
              {t('dismiss')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Installation Progress */}
      {installProgress && installProgress.stage !== 'done' && installProgress.stage !== 'error' && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              {t('installingTool', { tool: TOOL_INFO[installProgress.tool].name })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={installProgress.progress} className="h-2" />
            <p className="text-xs text-muted-foreground">{installProgress.message}</p>
          </CardContent>
        </Card>
      )}

      {/* Language Managers Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">{t('languageManagers')}</h3>
        </div>
        <p className="text-xs text-muted-foreground">{t('languageManagersDesc')}</p>
        <div className="grid gap-4 md:grid-cols-2">
          {languageManagers.map((tool) => (
            <ToolCard
              key={tool}
              tool={tool}
              status={tools[tool]}
              isInstalling={isInstalling}
              onInstall={() => handleInstallClick(tool)}
              onOpenWebsite={() => openToolWebsite(tool)}
              onRefresh={() => checkTool(tool)}
            />
          ))}
        </div>
      </div>

      <Separator />

      {/* Container Runtimes Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Box className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">{t('containerRuntimes')}</h3>
        </div>
        <p className="text-xs text-muted-foreground">{t('containerRuntimesDesc')}</p>
        <div className="grid gap-4 md:grid-cols-2">
          {containerRuntimes.map((tool) => (
            <ToolCard
              key={tool}
              tool={tool}
              status={tools[tool]}
              isInstalling={isInstalling}
              onInstall={() => handleInstallClick(tool)}
              onOpenWebsite={() => openToolWebsite(tool)}
              onRefresh={() => checkTool(tool)}
            />
          ))}
        </div>
      </div>

      {/* Install Confirmation Dialog */}
      <Dialog open={!!confirmInstall} onOpenChange={() => setConfirmInstall(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('confirmInstallTitle', {
                tool: confirmInstall ? TOOL_INFO[confirmInstall].name : '',
              })}
            </DialogTitle>
            <DialogDescription>
              {t('confirmInstallDesc', {
                tool: confirmInstall ? TOOL_INFO[confirmInstall].name : '',
              })}
            </DialogDescription>
          </DialogHeader>
          {confirmInstall && (
            <div className="space-y-2 py-2">
              <p className="text-sm text-muted-foreground">
                {TOOL_INFO[confirmInstall].description}
              </p>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {t('installWarning')}
                </AlertDescription>
              </Alert>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmInstall(null)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleConfirmInstall}>
              <Download className="h-4 w-4 mr-2" />
              {t('installNow')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EnvironmentSettings;
