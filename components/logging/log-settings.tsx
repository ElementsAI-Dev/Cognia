'use client';

/**
 * LogSettings - Configuration UI for the unified logging system
 *
 * Allows users to configure log levels, transports, and retention policies.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Save, RotateCcw, Database, Cloud, Monitor, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  applyLoggingSettings,
  getLoggingBootstrapState,
  type LogLevel,
  type UnifiedLoggerConfig,
} from '@/lib/logger';

export interface LogSettingsProps {
  className?: string;
}

const LOG_LEVELS: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

export function LogSettings({ className }: LogSettingsProps) {
  const t = useTranslations('logging');
  const bootstrapState = getLoggingBootstrapState();

  // Initialize config from current logger settings
  const [config, setConfig] = useState<Partial<UnifiedLoggerConfig>>(() => {
    const currentConfig = bootstrapState.config;
    return {
      minLevel: currentConfig.minLevel,
      includeStackTrace: currentConfig.includeStackTrace,
      includeSource: currentConfig.includeSource,
      bufferSize: currentConfig.bufferSize,
      flushInterval: currentConfig.flushInterval,
    };
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Transport settings (stored separately)
  const [transports, setTransports] = useState(() => bootstrapState.transports);

  // Retention settings
  const [retention, setRetention] = useState(() => bootstrapState.retention);

  const handleConfigChange = <K extends keyof UnifiedLoggerConfig>(
    key: K,
    value: UnifiedLoggerConfig[K]
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleTransportChange = (transport: keyof typeof transports, enabled: boolean) => {
    setTransports((prev: typeof transports) => ({ ...prev, [transport]: enabled }));
    setHasChanges(true);
  };

  const handleRetentionChange = (key: keyof typeof retention, value: number) => {
    setRetention((prev: typeof retention) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    setSaveStatus('saving');

    try {
      const next = applyLoggingSettings({
        config,
        transports,
        retention,
        persist: true,
      });
      setConfig({
        minLevel: next.config.minLevel,
        includeStackTrace: next.config.includeStackTrace,
        includeSource: next.config.includeSource,
        bufferSize: next.config.bufferSize,
        flushInterval: next.config.flushInterval,
      });

      setHasChanges(false);
      setSaveStatus('saved');

      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleReset = () => {
    setConfig({
      minLevel: 'info',
      includeStackTrace: true,
      includeSource: false,
      bufferSize: 50,
      flushInterval: 5000,
    });
    setTransports({
      console: true,
      indexedDB: true,
      remote: false,
      langfuse: false,
      opentelemetry: false,
    });
    setRetention({
      maxEntries: 10000,
      maxAgeDays: 7,
    });
    setHasChanges(true);
  };

  const getSaveButtonText = () => {
    switch (saveStatus) {
      case 'saving':
        return t('settings.saving');
      case 'saved':
        return t('settings.saved');
      default:
        return t('settings.save');
    }
  };

  return (
    <div className={cn('space-y-4 sm:space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-semibold">{t('settingsTitle')}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">{t('settingsDescription')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={saveStatus === 'saving'}
            className="flex-1 sm:flex-none"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            <span className="sm:inline">{t('settings.reset')}</span>
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || saveStatus === 'saving'}
            className="flex-1 sm:flex-none"
          >
            <Save className="h-4 w-4 mr-1" />
            {getSaveButtonText()}
          </Button>
        </div>
      </div>

      {/* Log Level Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {t('settings.logLevel.title')}
          </CardTitle>
          <CardDescription>{t('settings.logLevel.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <Label className="sm:w-32 text-sm">{t('settings.logLevel.minLevel')}</Label>
            <Select
              value={config.minLevel}
              onValueChange={(value) => handleConfigChange('minLevel', value as LogLevel)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOG_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    <div className="flex flex-col">
                      <span className="capitalize">{t(`settings.logLevel.${level}`)}</span>
                      <span className="text-xs text-muted-foreground">
                        {t(`settings.logLevel.${level}Desc`)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <Label className="text-sm">{t('settings.options.includeStackTrace')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('settings.options.includeStackTraceDesc')}
                </p>
              </div>
              <Switch
                checked={config.includeStackTrace}
                onCheckedChange={(checked) => handleConfigChange('includeStackTrace', checked)}
                className="shrink-0"
              />
            </div>

            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <Label className="text-sm">{t('settings.options.includeSource')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('settings.options.includeSourceDesc')}
                </p>
              </div>
              <Switch
                checked={config.includeSource}
                onCheckedChange={(checked) => handleConfigChange('includeSource', checked)}
                className="shrink-0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transport Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            {t('settings.transports.title')}
          </CardTitle>
          <CardDescription>{t('settings.transports.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-2 flex-1 min-w-0">
                <Monitor className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 sm:mt-0" />
                <div className="min-w-0">
                  <Label className="text-sm">{t('settings.transports.console')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('settings.transports.consoleDesc')}
                  </p>
                </div>
              </div>
              <Switch
                checked={transports.console}
                onCheckedChange={(checked) => handleTransportChange('console', checked)}
                className="shrink-0"
              />
            </div>

            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-2 flex-1 min-w-0">
                <Database className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 sm:mt-0" />
                <div className="min-w-0">
                  <Label className="text-sm">{t('settings.transports.indexedDB')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('settings.transports.indexedDBDesc')}
                  </p>
                </div>
              </div>
              <Switch
                checked={transports.indexedDB}
                onCheckedChange={(checked) => handleTransportChange('indexedDB', checked)}
                className="shrink-0"
              />
            </div>

            <Separator />

            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-2 flex-1 min-w-0">
                <Cloud className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 sm:mt-0" />
                <div className="min-w-0">
                  <Label className="text-sm">{t('settings.transports.langfuse')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('settings.transports.langfuseDesc')}
                  </p>
                </div>
              </div>
              <Switch
                checked={transports.langfuse}
                onCheckedChange={(checked) => handleTransportChange('langfuse', checked)}
                className="shrink-0"
              />
            </div>

            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-2 flex-1 min-w-0">
                <Cloud className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 sm:mt-0" />
                <div className="min-w-0">
                  <Label className="text-sm">{t('settings.transports.opentelemetry')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('settings.transports.opentelemetryDesc')}
                  </p>
                </div>
              </div>
              <Switch
                checked={transports.opentelemetry}
                onCheckedChange={(checked) => handleTransportChange('opentelemetry', checked)}
                className="shrink-0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Retention Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            {t('settings.retention.title')}
          </CardTitle>
          <CardDescription>{t('settings.retention.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm">{t('settings.retention.maxEntries')}</Label>
              <span className="text-xs sm:text-sm font-mono shrink-0">
                {retention.maxEntries.toLocaleString()}
              </span>
            </div>
            <Slider
              value={[retention.maxEntries]}
              onValueChange={([value]) => handleRetentionChange('maxEntries', value)}
              min={1000}
              max={100000}
              step={1000}
              className="touch-none"
            />
            <p className="text-xs text-muted-foreground">
              {t('settings.retention.maxEntriesDesc')}
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm">{t('settings.retention.maxAgeDays')}</Label>
              <span className="text-xs sm:text-sm font-mono shrink-0">
                {retention.maxAgeDays} {t('settings.retention.days')}
              </span>
            </div>
            <Slider
              value={[retention.maxAgeDays]}
              onValueChange={([value]) => handleRetentionChange('maxAgeDays', value)}
              min={1}
              max={30}
              step={1}
              className="touch-none"
            />
            <p className="text-xs text-muted-foreground">
              {t('settings.retention.maxAgeDaysDesc')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Performance Note */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>{t('settings.performanceNote.title')}</AlertTitle>
        <AlertDescription>{t('settings.performanceNote.description')}</AlertDescription>
      </Alert>
    </div>
  );
}

export default LogSettings;
