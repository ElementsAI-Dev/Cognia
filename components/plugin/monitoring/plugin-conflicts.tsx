'use client';

/**
 * Plugin Conflicts - Display and resolve plugin conflicts
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { usePluginStore } from '@/stores/plugin';
import {
  getConflictDetector,
  type PluginConflict,
} from '@/lib/plugin/conflict-detector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  RefreshCw,
  Shield,
  Keyboard,
  Terminal,
  Box,
  Layers,
  Database,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PluginConflictsProps {
  className?: string;
  autoDetect?: boolean;
}

export function PluginConflicts({
  className,
  autoDetect = true,
}: PluginConflictsProps) {
  const t = useTranslations('pluginConflicts');
  const { plugins, getEnabledPlugins, disablePlugin } = usePluginStore();
  const [conflicts, setConflicts] = useState<PluginConflict[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);

  const detectConflicts = useCallback(() => {
    setIsDetecting(true);

    const enabledPlugins = getEnabledPlugins();
    const registrations = enabledPlugins.map((p) => ({
      manifest: p.manifest,
      // Extract tool names as commands
      commands: p.manifest.tools?.map((t) => t.name),
      // No shortcuts in manifest, use empty array
      shortcuts: [],
      // Use plugin ID as namespace
      namespaces: [p.manifest.id],
      // No resources in manifest, use empty array
      resources: [],
    }));

    const detector = getConflictDetector();
    detector.setPlugins(registrations);
    const result = detector.detectAll();
    setConflicts([...result.errors, ...result.warnings, ...result.info]);

    setIsDetecting(false);
  }, [getEnabledPlugins]);

  useEffect(() => {
    if (autoDetect) {
      const timer = setTimeout(detectConflicts, 100);
      return () => clearTimeout(timer);
    }
  }, [autoDetect, detectConflicts, plugins]);

  const getConflictIcon = (type: string) => {
    switch (type) {
      case 'version':
        return <Box className="h-4 w-4" />;
      case 'namespace':
        return <Layers className="h-4 w-4" />;
      case 'command':
        return <Terminal className="h-4 w-4" />;
      case 'shortcut':
        return <Keyboard className="h-4 w-4" />;
      case 'capability':
        return <Shield className="h-4 w-4" />;
      case 'resource':
        return <Database className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'warning':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'info':
        return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'info':
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const handleResolve = async (conflict: PluginConflict) => {
    // If autoResolvable and we have plugins to disable, disable the first conflicting plugin
    if (conflict.autoResolvable && conflict.plugins.length > 0) {
      try {
        // Disable the first plugin in the conflict list as a resolution
        await disablePlugin(conflict.plugins[0]);
        detectConflicts();
      } catch (error) {
        console.error('Failed to resolve conflict:', error);
      }
    }
  };

  const _errorCount = conflicts.filter((c) => c.severity === 'error').length;
  const _warningCount = conflicts.filter((c) => c.severity === 'warning').length;
  const _infoCount = conflicts.filter((c) => c.severity === 'info').length;

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {t('title')}
            {conflicts.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {conflicts.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={detectConflicts}
            disabled={isDetecting}
          >
            <RefreshCw
              className={cn('h-4 w-4', isDetecting && 'animate-spin')}
            />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        {/* Summary */}
        {conflicts.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3 text-sm shrink-0">
            {_errorCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {t('errors', { count: _errorCount })}
              </Badge>
            )}
            {_warningCount > 0 && (
              <Badge className="gap-1 bg-yellow-500 text-black">
                <AlertTriangle className="h-3 w-3" />
                {t('warnings', { count: _warningCount })}
              </Badge>
            )}
            {_infoCount > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Info className="h-3 w-3" />
                {t('info', { count: _infoCount })}
              </Badge>
            )}
          </div>
        )}

        {/* Conflicts List */}
        <ScrollArea className="flex-1 min-h-0">
          {conflicts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-muted-foreground">
                {t('noConflicts')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('allCompatible')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {conflicts.map((conflict, idx) => (
                <Alert
                  key={`${conflict.type}-${idx}`}
                  className={cn('border', getSeverityColor(conflict.severity))}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getSeverityIcon(conflict.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <AlertTitle className="flex items-center gap-2 text-sm">
                        {getConflictIcon(conflict.type)}
                        <span className="capitalize">{t('conflictType', { type: conflict.type })}</span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {conflict.severity}
                        </Badge>
                      </AlertTitle>
                      <AlertDescription className="mt-1">
                        <p className="text-sm">{conflict.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {conflict.plugins.map((pluginId) => {
                            const plugin = plugins[pluginId];
                            return (
                              <Badge
                                key={pluginId}
                                variant="secondary"
                                className="text-xs"
                              >
                                {plugin?.manifest.name || pluginId}
                              </Badge>
                            );
                          })}
                        </div>
                        {conflict.resolution && (
                          <div className="mt-3 flex items-center gap-2">
                            <p className="text-xs text-muted-foreground">
                              {t('suggestion')} {conflict.resolution}
                            </p>
                            {conflict.autoResolvable && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={() => handleResolve(conflict)}
                              >
                                {t('apply')}
                              </Button>
                            )}
                          </div>
                        )}
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export type { PluginConflictsProps };
