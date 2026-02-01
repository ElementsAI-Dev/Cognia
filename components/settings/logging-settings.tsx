'use client';

/**
 * LoggingSettings - Configuration UI for the unified logging system
 * 
 * Allows users to configure log levels, transports, and retention policies.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Save,
  RotateCcw,
  Database,
  Cloud,
  Monitor,
  AlertTriangle,
  Info,
} from 'lucide-react';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  getLoggerConfig, 
  updateLoggerConfig,
  type LogLevel,
  type UnifiedLoggerConfig,
} from '@/lib/logger';

interface LoggingSettingsProps {
  className?: string;
}

const LOG_LEVELS: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

const LEVEL_DESCRIPTIONS: Record<LogLevel, string> = {
  trace: 'Most verbose, includes all details',
  debug: 'Development debugging information',
  info: 'General operational information',
  warn: 'Warning conditions that may need attention',
  error: 'Error conditions that need attention',
  fatal: 'Critical errors that may cause system failure',
};

export function LoggingSettings({ className }: LoggingSettingsProps) {
  const t = useTranslations('settings');
  
  // Initialize config from current logger settings
  const [config, setConfig] = useState<Partial<UnifiedLoggerConfig>>(() => {
    const currentConfig = getLoggerConfig();
    return {
      minLevel: currentConfig.minLevel,
      includeStackTrace: currentConfig.includeStackTrace,
      includeSource: currentConfig.includeSource,
      enableSampling: currentConfig.enableSampling,
      maxBatchSize: currentConfig.maxBatchSize,
      flushInterval: currentConfig.flushInterval,
    };
  });
  
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Transport settings (stored separately)
  const [transports, setTransports] = useState(() => {
    if (typeof window === 'undefined') {
      return { console: true, indexedDB: true, remote: false, langfuse: false, opentelemetry: false };
    }
    const stored = localStorage.getItem('cognia-logging-transports');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // Ignore parse errors
      }
    }
    return { console: true, indexedDB: true, remote: false, langfuse: false, opentelemetry: false };
  });

  // Retention settings
  const [retention, setRetention] = useState(() => {
    if (typeof window === 'undefined') {
      return { maxEntries: 10000, maxAgeDays: 7 };
    }
    const stored = localStorage.getItem('cognia-logging-retention');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // Ignore parse errors
      }
    }
    return { maxEntries: 10000, maxAgeDays: 7 };
  });

  const handleConfigChange = <K extends keyof UnifiedLoggerConfig>(
    key: K,
    value: UnifiedLoggerConfig[K]
  ) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleTransportChange = (transport: keyof typeof transports, enabled: boolean) => {
    setTransports(prev => ({ ...prev, [transport]: enabled }));
    setHasChanges(true);
  };

  const handleRetentionChange = (key: keyof typeof retention, value: number) => {
    setRetention(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    setSaveStatus('saving');
    
    try {
      // Update logger config
      updateLoggerConfig(config as UnifiedLoggerConfig);
      
      // Store transport and retention settings in localStorage
      localStorage.setItem('cognia-logging-transports', JSON.stringify(transports));
      localStorage.setItem('cognia-logging-retention', JSON.stringify(retention));
      
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
      enableSampling: false,
      maxBatchSize: 50,
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

  return (
    <div className={cn('space-y-4 sm:space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-semibold">{t('tabLoggingConfig') || 'Logging Configuration'}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t('descLoggingConfig') || 'Configure log levels, transports, and retention policies'}
          </p>
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
            <span className="sm:inline">Reset</span>
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || saveStatus === 'saving'}
            className="flex-1 sm:flex-none"
          >
            <Save className="h-4 w-4 mr-1" />
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Log Level Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Log Level
          </CardTitle>
          <CardDescription>
            Set the minimum log level. Logs below this level will be ignored.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <Label className="sm:w-32 text-sm">Minimum Level</Label>
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
                      <span className="capitalize">{level}</span>
                      <span className="text-xs text-muted-foreground">
                        {LEVEL_DESCRIPTIONS[level]}
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
                <Label className="text-sm">Include Stack Traces</Label>
                <p className="text-xs text-muted-foreground">
                  Include stack traces for error and fatal logs
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
                <Label className="text-sm">Include Source Location</Label>
                <p className="text-xs text-muted-foreground">
                  Include file name and line number (development only)
                </p>
              </div>
              <Switch
                checked={config.includeSource}
                onCheckedChange={(checked) => handleConfigChange('includeSource', checked)}
                className="shrink-0"
              />
            </div>

            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <Label className="text-sm">Enable Log Sampling</Label>
                <p className="text-xs text-muted-foreground">
                  Sample high-volume logs to reduce storage and performance impact
                </p>
              </div>
              <Switch
                checked={config.enableSampling}
                onCheckedChange={(checked) => handleConfigChange('enableSampling', checked)}
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
            Log Transports
          </CardTitle>
          <CardDescription>
            Configure where logs are sent and stored.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-2 flex-1 min-w-0">
                <Monitor className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 sm:mt-0" />
                <div className="min-w-0">
                  <Label className="text-sm">Console Output</Label>
                  <p className="text-xs text-muted-foreground">
                    Output logs to browser console
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
                  <Label className="text-sm">IndexedDB Storage</Label>
                  <p className="text-xs text-muted-foreground">
                    Persist logs locally for viewing in Log Viewer
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
                  <Label className="text-sm">Langfuse Integration</Label>
                  <p className="text-xs text-muted-foreground">
                    Send logs to Langfuse for AI observability
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
                  <Label className="text-sm">OpenTelemetry</Label>
                  <p className="text-xs text-muted-foreground">
                    Integrate logs with OpenTelemetry tracing
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
            Log Retention
          </CardTitle>
          <CardDescription>
            Configure how long logs are kept and storage limits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm">Maximum Entries</Label>
              <span className="text-xs sm:text-sm font-mono shrink-0">{retention.maxEntries.toLocaleString()}</span>
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
              Older logs will be automatically removed when limit is reached
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm">Maximum Age (Days)</Label>
              <span className="text-xs sm:text-sm font-mono shrink-0">{retention.maxAgeDays} days</span>
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
              Logs older than this will be automatically cleaned up
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Performance Note */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Performance Note</AlertTitle>
        <AlertDescription>
          Enabling stack traces and source location may impact performance in production.
          Log sampling is recommended for high-traffic applications.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default LoggingSettings;
