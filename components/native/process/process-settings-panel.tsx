'use client';

/**
 * ProcessSettingsPanel - Settings panel for process management configuration
 * Allows configuring allowlist/denylist, termination permissions, and other process settings
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Shield, Plus, X, Save, RotateCcw, Loader2, AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useProcessManager } from '@/hooks/agent/use-process-manager';
import { DEFAULT_PROCESS_CONFIG } from '@/stores/agent/process-store';
import type { ProcessManagerConfig } from '@/lib/native/process';

interface ProcessSettingsPanelProps {
  className?: string;
}

export function ProcessSettingsPanel({ className }: ProcessSettingsPanelProps) {
  const t = useTranslations('processSettings');
  const { config, configLoading, isAvailable, refreshConfig, updateConfig } = useProcessManager();

  // Local state for editing
  const [localConfig, setLocalConfig] = useState<ProcessManagerConfig>(config);
  const [newAllowedProgram, setNewAllowedProgram] = useState('');
  const [newDeniedProgram, setNewDeniedProgram] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const configVersionRef = useRef(0);

  // Track config version to sync when backend config changes
  const configVersion = useMemo(() => JSON.stringify(config), [config]);

  // Sync local state when backend config changes (not on every render)
  useEffect(() => {
    configVersionRef.current += 1;
    const currentVersion = configVersionRef.current;
    // Use microtask to avoid synchronous setState in effect
    queueMicrotask(() => {
      if (currentVersion === configVersionRef.current) {
        setLocalConfig(config);
      }
    });
  }, [configVersion, config]);

  // Load config on mount
  useEffect(() => {
    if (isAvailable) {
      refreshConfig();
    }
  }, [isAvailable, refreshConfig]);

  // Check for changes using useMemo instead of useEffect + setState
  const hasChanges = useMemo(() => {
    return JSON.stringify(localConfig) !== JSON.stringify(config);
  }, [localConfig, config]);

  // Update local config helper
  const updateLocalConfig = useCallback((updates: Partial<ProcessManagerConfig>) => {
    setLocalConfig((prev) => ({ ...prev, ...updates }));
    setSaveSuccess(false);
  }, []);

  // Add program to allowlist
  const addAllowedProgram = useCallback(() => {
    const program = newAllowedProgram.trim().toLowerCase();
    if (program && !localConfig.allowedPrograms.includes(program)) {
      updateLocalConfig({
        allowedPrograms: [...localConfig.allowedPrograms, program],
      });
      setNewAllowedProgram('');
    }
  }, [newAllowedProgram, localConfig.allowedPrograms, updateLocalConfig]);

  // Remove program from allowlist
  const removeAllowedProgram = useCallback(
    (program: string) => {
      updateLocalConfig({
        allowedPrograms: localConfig.allowedPrograms.filter((p) => p !== program),
      });
    },
    [localConfig.allowedPrograms, updateLocalConfig]
  );

  // Add program to denylist
  const addDeniedProgram = useCallback(() => {
    const program = newDeniedProgram.trim().toLowerCase();
    if (program && !localConfig.deniedPrograms.includes(program)) {
      updateLocalConfig({
        deniedPrograms: [...localConfig.deniedPrograms, program],
      });
      setNewDeniedProgram('');
    }
  }, [newDeniedProgram, localConfig.deniedPrograms, updateLocalConfig]);

  // Remove program from denylist
  const removeDeniedProgram = useCallback(
    (program: string) => {
      updateLocalConfig({
        deniedPrograms: localConfig.deniedPrograms.filter((p) => p !== program),
      });
    },
    [localConfig.deniedPrograms, updateLocalConfig]
  );

  // Save configuration
  const handleSave = useCallback(async () => {
    const success = await updateConfig(localConfig);
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  }, [localConfig, updateConfig]);

  // Reset to defaults
  const handleReset = useCallback(() => {
    setLocalConfig(DEFAULT_PROCESS_CONFIG);
  }, []);

  if (!isAvailable) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <p className="text-muted-foreground text-sm">
          {t('notAvailable') || 'Process management requires desktop app'}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn('h-full', className)}>
      <div className="space-y-6 p-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">
              {t('enableProcessManagement') || 'Enable Process Management'}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t('enableProcessManagementDesc') || 'Allow AI to manage system processes'}
            </p>
          </div>
          <Switch
            checked={localConfig.enabled}
            onCheckedChange={(enabled) => updateLocalConfig({ enabled })}
          />
        </div>

        {!localConfig.enabled && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t('disabledWarning') || 'Process Management Disabled'}</AlertTitle>
            <AlertDescription>
              {t('disabledWarningDesc') ||
                'Process tools will not be available to the AI assistant.'}
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* Allowed Programs */}
        <div className="space-y-3">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">
              {t('allowedPrograms') || 'Allowed Programs'}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t('allowedProgramsDesc') ||
                'Programs that can be started (empty = all allowed except denied)'}
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder={t('addProgram') || 'Add program name...'}
              value={newAllowedProgram}
              onChange={(e) => setNewAllowedProgram(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addAllowedProgram()}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={addAllowedProgram}
              disabled={!newAllowedProgram.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 min-h-[32px]">
            {localConfig.allowedPrograms.length === 0 ? (
              <span className="text-xs text-muted-foreground italic">
                {t('noAllowedPrograms') || 'No restrictions (all programs allowed except denied)'}
              </span>
            ) : (
              localConfig.allowedPrograms.map((program) => (
                <Badge key={program} variant="secondary" className="gap-1">
                  {program}
                  <button
                    onClick={() => removeAllowedProgram(program)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
        </div>

        <Separator />

        {/* Denied Programs */}
        <div className="space-y-3">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">
              {t('deniedPrograms') || 'Denied Programs'}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t('deniedProgramsDesc') || 'Programs that can never be started (security)'}
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder={t('addProgram') || 'Add program name...'}
              value={newDeniedProgram}
              onChange={(e) => setNewDeniedProgram(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addDeniedProgram()}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={addDeniedProgram}
              disabled={!newDeniedProgram.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 min-h-[32px]">
            {localConfig.deniedPrograms.map((program) => (
              <Badge key={program} variant="destructive" className="gap-1">
                <Shield className="h-3 w-3" />
                {program}
                <button
                  onClick={() => removeDeniedProgram(program)}
                  className="ml-1 hover:text-destructive-foreground/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Termination Settings */}
        <div className="space-y-4">
          <Label className="text-base font-medium">
            {t('terminationSettings') || 'Termination Settings'}
          </Label>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('allowTerminateAny') || 'Allow Terminate Any Process'}</Label>
              <p className="text-xs text-muted-foreground">
                {t('allowTerminateAnyDesc') || 'Allow terminating any process (dangerous)'}
              </p>
            </div>
            <Switch
              checked={localConfig.allowTerminateAny}
              onCheckedChange={(allowTerminateAny) => updateLocalConfig({ allowTerminateAny })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('onlyTerminateOwn') || 'Only Terminate Own Processes'}</Label>
              <p className="text-xs text-muted-foreground">
                {t('onlyTerminateOwnDesc') ||
                  'Only allow terminating processes started by this app'}
              </p>
            </div>
            <Switch
              checked={localConfig.onlyTerminateOwn}
              onCheckedChange={(onlyTerminateOwn) => updateLocalConfig({ onlyTerminateOwn })}
            />
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {t('resetToDefault') || 'Reset'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {t('resetToDefaultDesc') || 'Reset to default configuration'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button onClick={handleSave} disabled={!hasChanges || configLoading}>
            {configLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : saveSuccess ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saveSuccess ? t('saved') || 'Saved!' : t('save') || 'Save'}
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}
