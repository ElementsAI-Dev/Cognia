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
  Download,
  AlertCircle,
  Loader2,
  Terminal,
  Package,
  Box,
  Search,
  Film,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useEnvironment } from '@/hooks/sandbox';
import { TOOL_INFO, type EnvironmentTool } from '@/types/system/environment';
import { VirtualEnvPanel } from './virtual-env-panel';
import { ProjectEnvConfigPanel } from './project-env-config';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToolCard } from '@/components/settings/environment';

type ToolFilter = 'all' | 'language_manager' | 'container_runtime' | 'media_tool';

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
    setToolEnabled,
    installTool,
    openToolWebsite,
    clearError,
  } = useEnvironment();

  const [confirmInstall, setConfirmInstall] = useState<EnvironmentTool | null>(null);
  const [toolSearchQuery, setToolSearchQuery] = useState('');
  const [toolFilter, setToolFilter] = useState<ToolFilter>('all');
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

  const languageManagers: EnvironmentTool[] = ['python', 'uv', 'nodejs', 'nvm', 'ruby', 'rust'];
  const containerRuntimes: EnvironmentTool[] = ['docker', 'podman', 'postgresql'];
  const mediaTools: EnvironmentTool[] = ['ffmpeg'];

  const normalizedSearchQuery = toolSearchQuery.trim().toLowerCase();
  const matchesTool = (tool: EnvironmentTool) => {
    if (toolFilter !== 'all' && TOOL_INFO[tool].category !== toolFilter) {
      return false;
    }

    if (!normalizedSearchQuery) return true;

    const info = TOOL_INFO[tool];
    const haystack = `${tool} ${info.name} ${info.description}`.toLowerCase();
    return haystack.includes(normalizedSearchQuery);
  };

  const visibleLanguageManagers = languageManagers.filter(matchesTool);
  const visibleContainerRuntimes = containerRuntimes.filter(matchesTool);
  const visibleMediaTools = mediaTools.filter(matchesTool);
  const hasVisibleTools =
    visibleLanguageManagers.length > 0 ||
    visibleContainerRuntimes.length > 0 ||
    visibleMediaTools.length > 0;

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
              <CardDescription className="text-xs mt-1">{t('description')}</CardDescription>
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

      {/* Tabs for different sections */}
      <Tabs defaultValue="tools" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tools">
            <Terminal className="h-4 w-4 mr-2" />
            {t('tabTools')}
          </TabsTrigger>
          <TabsTrigger value="virtualenv">
            <Package className="h-4 w-4 mr-2" />
            {t('tabVirtualEnvs')}
          </TabsTrigger>
          <TabsTrigger value="projects">
            <Settings className="h-4 w-4 mr-2" />
            {t('tabProjects')}
          </TabsTrigger>
        </TabsList>

        {/* Tools Tab */}
        <TabsContent value="tools" className="space-y-6 mt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:flex-none sm:w-56">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder={t('searchToolsPlaceholder')}
                  value={toolSearchQuery}
                  onChange={(e) => setToolSearchQuery(e.target.value)}
                  className="h-9 text-sm pl-10 sm:h-8"
                  autoComplete="off"
                  data-form-type="other"
                  data-lpignore="true"
                />
              </div>
              <Select value={toolFilter} onValueChange={(v) => setToolFilter(v as ToolFilter)}>
                <SelectTrigger className="h-9 w-40 text-sm sm:h-8">
                  <SelectValue placeholder={t('allTools')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allTools')}</SelectItem>
                  <SelectItem value="language_manager">{t('categoryLanguageManager')}</SelectItem>
                  <SelectItem value="container_runtime">{t('categoryContainerRuntime')}</SelectItem>
                  <SelectItem value="media_tool">{t('categoryMediaTool')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={refreshStatus}
              disabled={isRefreshing}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {t('autoDetect')}
            </Button>
          </div>

          {!hasVisibleTools ? (
            <div className="text-center py-8 text-sm text-muted-foreground">{t('noToolsFound')}</div>
          ) : (
            <>
              {visibleLanguageManagers.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">{t('languageManagers')}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('languageManagersDesc')}</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    {visibleLanguageManagers.map((tool) => (
                      <ToolCard
                        key={tool}
                        tool={tool}
                        status={tools[tool]}
                        isInstalling={isInstalling}
                        onInstall={() => handleInstallClick(tool)}
                        onOpenWebsite={() => openToolWebsite(tool)}
                        onRefresh={() => checkTool(tool)}
                        onToggleEnabled={(enabled) => setToolEnabled(tool, enabled)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {visibleLanguageManagers.length > 0 &&
                (visibleContainerRuntimes.length > 0 || visibleMediaTools.length > 0) && <Separator />}

              {visibleContainerRuntimes.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Box className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">{t('containerRuntimes')}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('containerRuntimesDesc')}</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    {visibleContainerRuntimes.map((tool) => (
                      <ToolCard
                        key={tool}
                        tool={tool}
                        status={tools[tool]}
                        isInstalling={isInstalling}
                        onInstall={() => handleInstallClick(tool)}
                        onOpenWebsite={() => openToolWebsite(tool)}
                        onRefresh={() => checkTool(tool)}
                        onToggleEnabled={(enabled) => setToolEnabled(tool, enabled)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {visibleContainerRuntimes.length > 0 && visibleMediaTools.length > 0 && <Separator />}

              {visibleMediaTools.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Film className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">{t('mediaTools')}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('mediaToolsDesc')}</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    {visibleMediaTools.map((tool) => (
                      <ToolCard
                        key={tool}
                        tool={tool}
                        status={tools[tool]}
                        isInstalling={isInstalling}
                        onInstall={() => handleInstallClick(tool)}
                        onOpenWebsite={() => openToolWebsite(tool)}
                        onRefresh={() => checkTool(tool)}
                        onToggleEnabled={(enabled) => setToolEnabled(tool, enabled)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Virtual Environments Tab */}
        <TabsContent value="virtualenv" className="mt-4">
          <VirtualEnvPanel />
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="mt-4">
          <ProjectEnvConfigPanel />
        </TabsContent>
      </Tabs>

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
                <AlertDescription className="text-xs">{t('installWarning')}</AlertDescription>
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
