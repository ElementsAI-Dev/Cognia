'use client';

/**
 * Plugin Installed Detail Sheet
 * Shows comprehensive details for an installed plugin including:
 * - Manifest info (author, homepage, repository, license, dependencies)
 * - Health status & usage analytics
 * - Configuration quick access
 * - Rollback options
 * - Export/share
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { Plugin } from '@/types/plugin';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ExternalLink,
  Settings,
  Shield,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  GitBranch,
  Globe,
  FileText,
  Download,
  RotateCcw,
  Wrench,
  Layers,
  Zap,
  Code,
  User,
  Calendar,
  HardDrive,
  Info,
} from 'lucide-react';
import { usePluginStore } from '@/stores/plugin';
import {
  pluginAnalyticsStore,
  getPluginHealth,
  getPluginRollbackManager,
  getPluginBackupManager,
  type PluginHealthStatus,
  type RollbackInfo,
} from '@/lib/plugin';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface PluginInstalledDetailProps {
  plugin: Plugin | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfigure?: (plugin: Plugin) => void;
}

// =============================================================================
// Main Component
// =============================================================================

export function PluginInstalledDetail({
  plugin,
  open,
  onOpenChange,
  onConfigure,
}: PluginInstalledDetailProps) {
  const t = useTranslations('pluginInstalledDetail');
  const { enablePlugin, disablePlugin } = usePluginStore();

  const [health, setHealth] = useState<PluginHealthStatus | null>(null);
  const [rollbackInfo, setRollbackInfo] = useState<RollbackInfo | null>(null);
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  const [selectedRollbackVersion, setSelectedRollbackVersion] = useState<string | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Load health and rollback data when plugin changes
  useEffect(() => {
    if (!plugin) return;
    try {
      const healthData = getPluginHealth(plugin.manifest.id);
      setHealth(healthData);
    } catch {
      setHealth(null);
    }
    (async () => {
      try {
        const rollbackMgr = getPluginRollbackManager();
        const info = await rollbackMgr.getRollbackInfo(plugin.manifest.id);
        setRollbackInfo(info);
      } catch {
        setRollbackInfo(null);
      }
    })();
  }, [plugin]);

  // Usage stats from analytics store
  const usageStats = useMemo(() => {
    if (!plugin) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (pluginAnalyticsStore as any).getPluginStats?.(plugin.manifest.id) ?? null;
  }, [plugin]);

  const handleToggle = useCallback(async () => {
    if (!plugin) return;
    try {
      if (plugin.status === 'enabled') {
        await disablePlugin(plugin.manifest.id);
        toast.success(t('actions.disabled'));
      } else {
        await enablePlugin(plugin.manifest.id);
        toast.success(t('actions.enabled'));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }, [plugin, enablePlugin, disablePlugin, t]);

  const handleRollback = useCallback(async () => {
    if (!plugin || !selectedRollbackVersion) return;
    setIsRollingBack(true);
    try {
      const rollbackMgr = getPluginRollbackManager();
      const result = await rollbackMgr.rollback(plugin.manifest.id, selectedRollbackVersion);
      if (result.success) {
        toast.success(t('rollback.success', { version: selectedRollbackVersion }));
      } else {
        toast.error(result.error || t('rollback.failed'));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsRollingBack(false);
      setShowRollbackDialog(false);
      setSelectedRollbackVersion(null);
    }
  }, [plugin, selectedRollbackVersion, t]);

  const handleExport = useCallback(async () => {
    if (!plugin) return;
    setIsExporting(true);
    try {
      const backupMgr = getPluginBackupManager();
      const result = await backupMgr.createBackup(plugin.manifest.id, { reason: 'manual' });
      if (result.success) {
        toast.success(t('export.success'));
      } else {
        toast.error(result.error || t('export.failed'));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsExporting(false);
    }
  }, [plugin, t]);

  if (!plugin) return null;

  const { manifest, status, error } = plugin;
  const isEnabled = status === 'enabled';
  const isError = status === 'error';

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-hidden flex flex-col">
          <SheetHeader className="shrink-0">
            <div className="flex items-start gap-3">
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                isEnabled ? 'bg-primary/10' : 'bg-muted'
              )}>
                <Package className={cn('h-6 w-6', isEnabled && 'text-primary')} />
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-lg truncate">{manifest.name}</SheetTitle>
                <SheetDescription className="flex items-center gap-2 mt-0.5">
                  <span>v{manifest.version}</span>
                  <span>•</span>
                  <span className="capitalize">{manifest.type}</span>
                  <Badge
                    variant={isEnabled ? 'default' : isError ? 'destructive' : 'secondary'}
                    className={cn('text-[10px] h-5', isEnabled && 'bg-green-500')}
                  >
                    {status}
                  </Badge>
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 px-1 py-3 shrink-0">
            <Button
              variant={isEnabled ? 'outline' : 'default'}
              size="sm"
              onClick={handleToggle}
              className="flex-1"
            >
              {isEnabled ? t('actions.disable') : t('actions.enable')}
            </Button>
            {onConfigure && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onConfigure(plugin)}
                className="flex-1"
              >
                <Settings className="h-3.5 w-3.5 mr-1.5" />
                {t('actions.configure')}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mx-1 mb-3 p-3 rounded-lg bg-destructive/10 text-destructive text-sm shrink-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="line-clamp-2">{error}</span>
              </div>
            </div>
          )}

          {/* Tabs Content */}
          <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
            <TabsList className="shrink-0 w-full">
              <TabsTrigger value="overview" className="flex-1 text-xs">
                {t('tabs.overview')}
              </TabsTrigger>
              <TabsTrigger value="health" className="flex-1 text-xs">
                {t('tabs.health')}
              </TabsTrigger>
              <TabsTrigger value="versions" className="flex-1 text-xs">
                {t('tabs.versions')}
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-3">
              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-0 space-y-4 pr-3">
                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {manifest.description}
                </p>

                {/* Capabilities */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">{t('overview.capabilities')}</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {manifest.capabilities.map((cap) => (
                      <Badge key={cap} variant="secondary" className="text-xs capitalize gap-1">
                        {cap === 'tools' && <Wrench className="h-3 w-3" />}
                        {cap === 'components' && <Layers className="h-3 w-3" />}
                        {cap === 'modes' && <Zap className="h-3 w-3" />}
                        {cap}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Manifest Details */}
                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-muted-foreground">{t('overview.details')}</h4>
                  <DetailRow icon={Code} label={t('overview.id')} value={manifest.id} />
                  {manifest.author && (
                    <DetailRow icon={User} label={t('overview.author')} value={manifest.author.name} />
                  )}
                  {manifest.license && (
                    <DetailRow icon={FileText} label={t('overview.license')} value={manifest.license} />
                  )}
                  {manifest.engines?.cognia && (
                    <DetailRow icon={Package} label={t('overview.minVersion')} value={`Cognia ${manifest.engines.cognia}`} />
                  )}
                </div>

                {/* Links */}
                {(manifest.homepage || manifest.repository) && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground">{t('overview.links')}</h4>
                      {manifest.homepage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-xs h-8"
                          onClick={() => window.open(manifest.homepage, '_blank')}
                        >
                          <Globe className="h-3.5 w-3.5 mr-2" />
                          {t('overview.homepage')}
                          <ExternalLink className="h-3 w-3 ml-auto" />
                        </Button>
                      )}
                      {manifest.repository && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-xs h-8"
                          onClick={() => window.open(manifest.repository, '_blank')}
                        >
                          <GitBranch className="h-3.5 w-3.5 mr-2" />
                          {t('overview.repository')}
                          <ExternalLink className="h-3 w-3 ml-auto" />
                        </Button>
                      )}
                    </div>
                  </>
                )}

                {/* Dependencies */}
                {manifest.dependencies && Object.keys(manifest.dependencies).length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground">{t('overview.dependencies')}</h4>
                      {Object.entries(manifest.dependencies).map(([dep, ver]) => (
                        <div key={dep} className="flex items-center justify-between text-xs">
                          <span className="font-mono">{dep}</span>
                          <Badge variant="outline" className="text-[10px]">{ver}</Badge>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Permissions */}
                {manifest.permissions && manifest.permissions.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground">{t('overview.permissions')}</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {manifest.permissions.map((perm) => (
                          <Badge key={perm} variant="outline" className="text-[10px] gap-1">
                            <Shield className="h-3 w-3" />
                            {perm}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* Health Tab */}
              <TabsContent value="health" className="mt-0 space-y-4 pr-3">
                {/* Health Status */}
                {health ? (
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <HealthIcon status={health.status} />
                        {t('health.status')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant={health.status === 'healthy' ? 'default' : health.status === 'degraded' ? 'secondary' : 'destructive'}>
                          {health.status}
                        </Badge>
                        {health.score !== undefined && (
                          <span className="text-sm text-muted-foreground">{health.score}%</span>
                        )}
                      </div>
                      {health.issues && health.issues.length > 0 && (
                        <div className="space-y-1.5">
                          {health.issues.map((issue, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <AlertTriangle className="h-3 w-3 text-yellow-500 shrink-0 mt-0.5" />
                              <span>{typeof issue === 'string' ? issue : (issue as { message?: string }).message ?? String(issue)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center text-sm text-muted-foreground">
                      <Info className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      {t('health.noData')}
                    </CardContent>
                  </Card>
                )}

                {/* Usage Stats */}
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm">{t('health.usage')}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {usageStats ? (
                      <div className="grid grid-cols-2 gap-3">
                        <StatItem
                          icon={Activity}
                          label={t('health.totalCalls')}
                          value={usageStats.totalCalls.toString()}
                        />
                        <StatItem
                          icon={CheckCircle}
                          label={t('health.successRate')}
                          value={usageStats.totalCalls > 0
                            ? `${((usageStats.successfulCalls / usageStats.totalCalls) * 100).toFixed(0)}%`
                            : '—'
                          }
                        />
                        <StatItem
                          icon={Clock}
                          label={t('health.avgDuration')}
                          value={usageStats.averageDuration > 0
                            ? `${usageStats.averageDuration.toFixed(0)}ms`
                            : '—'
                          }
                        />
                        <StatItem
                          icon={Calendar}
                          label={t('health.lastUsed')}
                          value={usageStats.lastUsed
                            ? new Date(usageStats.lastUsed).toLocaleDateString()
                            : '—'
                          }
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        {t('health.noUsage')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Versions Tab */}
              <TabsContent value="versions" className="mt-0 space-y-4 pr-3">
                {/* Current Version */}
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm">{t('versions.current')}</CardTitle>
                    <CardDescription className="text-xs">v{manifest.version}</CardDescription>
                  </CardHeader>
                </Card>

                {/* Rollback */}
                {rollbackInfo && rollbackInfo.availableVersions.length > 0 ? (
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <RotateCcw className="h-4 w-4" />
                        {t('versions.rollback')}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {t('versions.rollbackDesc')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-2">
                      {rollbackInfo.availableVersions.map((ver) => (
                        <div key={ver.version} className="flex items-center justify-between p-2 rounded-lg border text-sm">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">v{ver.version}</Badge>
                            <Badge variant="secondary" className="text-[10px]">{ver.source}</Badge>
                            {ver.date && (
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(ver.date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            disabled={!ver.canRollback}
                            onClick={() => {
                              setSelectedRollbackVersion(ver.version);
                              setShowRollbackDialog(true);
                            }}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            {t('versions.rollbackBtn')}
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center text-sm text-muted-foreground">
                      <HardDrive className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      {t('versions.noRollback')}
                    </CardContent>
                  </Card>
                )}

                {/* Export/Backup */}
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      {t('versions.export')}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {t('versions.exportDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExport}
                      disabled={isExporting}
                      className="w-full"
                    >
                      <Download className="h-3.5 w-3.5 mr-2" />
                      {isExporting ? t('versions.exporting') : t('versions.createBackup')}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Rollback Confirmation Dialog */}
      <AlertDialog open={showRollbackDialog} onOpenChange={setShowRollbackDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('rollback.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('rollback.confirmDesc', { 
                name: manifest.name, 
                from: manifest.version, 
                to: selectedRollbackVersion ?? '' 
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRollingBack}>
              {t('rollback.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRollback}
              disabled={isRollingBack}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRollingBack ? t('rollback.rolling') : t('rollback.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// =============================================================================
// Sub-Components
// =============================================================================

function DetailRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-xs font-medium truncate max-w-[60%] text-right">{value}</span>
    </div>
  );
}

function StatItem({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/50">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function HealthIcon({ status }: { status: string }) {
  switch (status) {
    case 'healthy':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'degraded':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'unhealthy':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Info className="h-4 w-4 text-muted-foreground" />;
  }
}
