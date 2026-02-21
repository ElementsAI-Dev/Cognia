'use client';

import dynamic from 'next/dynamic';
import { AlertTriangle, Play, Settings2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useTheme } from '@/components/providers/ui/theme-provider';
import { useSettingsStore } from '@/stores';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { createEditorOptions, getMonacoLanguage, getMonacoTheme } from '@/lib/monaco';
import {
  bindMonacoEditorContext,
  type MonacoContextBinding,
} from '@/lib/editor-workbench/monaco-context-binding';
import { isEditorFeatureFlagEnabled } from '@/lib/editor-workbench/feature-flags';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[200px] items-center justify-center rounded-md border bg-muted/30">
      <span className="text-xs text-muted-foreground">Loading editor...</span>
    </div>
  ),
});
import { validateScript, getScriptTemplate } from '@/lib/scheduler/script-executor';
import type { ExecuteScriptAction } from '@/types/scheduler';
import { SCRIPT_LANGUAGES, DEFAULT_SCRIPT_SETTINGS } from '@/types/scheduler';

export interface ScriptTaskEditorProps {
  value: ExecuteScriptAction;
  onChange: (value: ExecuteScriptAction) => void;
  onTest?: () => void;
  disabled?: boolean;
}

export function ScriptTaskEditor({
  value,
  onChange,
  onTest,
  disabled = false,
}: ScriptTaskEditorProps) {
  const t = useTranslations('scheduler');
  const { theme } = useTheme();
  const globalEditorSettings = useSettingsStore((state) => state.editorSettings);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const workbenchBindingRef = useRef<MonacoContextBinding | null>(null);
  const [validation, setValidation] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);

  useEffect(() => {
    return () => {
      workbenchBindingRef.current?.dispose();
      workbenchBindingRef.current = null;
    };
  }, []);

  useEffect(() => {
    workbenchBindingRef.current?.update({
      languageId: getMonacoLanguage(value.language || 'python'),
    });
  }, [value.language]);

  const handleLanguageChange = useCallback(
    (language: string) => {
      const template = value.code.trim() === '' ? getScriptTemplate(language) : value.code;
      onChange({
        ...value,
        language,
        code: template,
      });
    },
    [value, onChange]
  );

  const handleCodeChange = useCallback(
    (code: string) => {
      onChange({ ...value, code });
      // Validate on change
      const result = validateScript(value.language, code);
      setValidation(result);
    },
    [value, onChange]
  );

  const handleSettingChange = useCallback(
    <K extends keyof ExecuteScriptAction>(key: K, val: ExecuteScriptAction[K]) => {
      onChange({ ...value, [key]: val });
    },
    [value, onChange]
  );

  return (
    <div className="space-y-4">
      {/* Language selector */}
      <div className="space-y-2">
        <Label>{t('scriptLanguage') || 'Script Language'}</Label>
        <Select
          value={value.language}
          onValueChange={handleLanguageChange}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('selectLanguage') || 'Select language'} />
          </SelectTrigger>
          <SelectContent>
            {SCRIPT_LANGUAGES.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                <span className="flex items-center gap-2">
                  <span>{lang.icon}</span>
                  <span>{lang.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Code editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t('scriptCode') || 'Script Code'}</Label>
          {onTest && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onTest}
              disabled={disabled || !value.code.trim()}
            >
              <Play className="mr-1 h-3 w-3" />
              {t('test') || 'Test'}
            </Button>
          )}
        </div>
        <div className="overflow-hidden rounded-md border">
          <MonacoEditor
            height="200px"
            language={getMonacoLanguage(value.language || 'python')}
            theme={getMonacoTheme(theme)}
            value={value.code}
            onChange={(v) => handleCodeChange(v || '')}
            onMount={(editor) => {
              if (!isEditorFeatureFlagEnabled('editor.workbench.v2')) {
                return;
              }
              workbenchBindingRef.current?.dispose();
              workbenchBindingRef.current = bindMonacoEditorContext({
                contextId: 'scheduler',
                label: 'Scheduler Script Editor',
                languageId: getMonacoLanguage(value.language || 'python'),
                editor,
                fallbackReason: 'Using Monaco built-in providers',
              });
            }}
            options={createEditorOptions('code', {
              readOnly: disabled,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: 'on',
              glyphMargin: false,
              folding: false,
              renderLineHighlight: 'line',
              placeholder: getScriptTemplate(value.language || 'python'),
            }, {
              editorSettings: globalEditorSettings,
            })}
          />
        </div>

        {/* Validation feedback */}
        {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
          <div className="space-y-2">
            {validation.errors.map((error, i) => (
              <Alert key={`error-${i}`} variant="destructive" className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            ))}
            {validation.warnings.map((warning, i) => (
              <Alert key={`warning-${i}`} className="border-yellow-500/50 bg-yellow-500/10 py-2 [&>svg]:text-yellow-500">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs text-yellow-600 dark:text-yellow-400">{warning}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </div>

      {/* Sandbox toggle */}
      <Card>
        <CardHeader className="p-3 pb-0">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-medium">{t('sandboxExecution') || 'Sandbox Execution'}</CardTitle>
              <CardDescription className="text-xs">
                {t('sandboxDescription') || 'Run script in isolated environment (safer)'}
              </CardDescription>
            </div>
            <Switch
              checked={value.use_sandbox !== false}
              onCheckedChange={(checked) => handleSettingChange('use_sandbox', checked)}
              disabled={disabled}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Advanced settings */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-start">
            <Settings2 className="mr-2 h-4 w-4" />
            {t('advancedSettings') || 'Advanced Settings'}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          {/* Timeout */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('timeoutSeconds') || 'Timeout (seconds)'}</Label>
              <Input
                type="number"
                value={value.timeout_secs ?? DEFAULT_SCRIPT_SETTINGS.timeout_secs}
                onChange={(e) =>
                  handleSettingChange('timeout_secs', parseInt(e.target.value) || 300)
                }
                min={1}
                max={3600}
                disabled={disabled}
              />
            </div>

            {/* Memory limit */}
            <div className="space-y-2">
              <Label>{t('memoryLimitMB') || 'Memory Limit (MB)'}</Label>
              <Input
                type="number"
                value={value.memory_mb ?? DEFAULT_SCRIPT_SETTINGS.memory_mb}
                onChange={(e) =>
                  handleSettingChange('memory_mb', parseInt(e.target.value) || 512)
                }
                min={64}
                max={8192}
                disabled={disabled}
              />
            </div>
          </div>

          {/* Working directory */}
          <div className="space-y-2">
            <Label>{t('workingDirectory') || 'Working Directory'}</Label>
            <Input
              value={value.working_dir || ''}
              onChange={(e) => handleSettingChange('working_dir', e.target.value || undefined)}
              placeholder={t('workingDirPlaceholder') || '(Optional) Script execution directory'}
              disabled={disabled}
            />
          </div>

          {/* Arguments */}
          <div className="space-y-2">
            <Label>{t('commandLineArgs') || 'Command Line Arguments'}</Label>
            <Input
              value={(value.args || []).join(' ')}
              onChange={(e) =>
                handleSettingChange(
                  'args',
                  e.target.value ? e.target.value.split(' ').filter(Boolean) : []
                )
              }
              placeholder="arg1 arg2 arg3"
              disabled={disabled}
            />
            <p className="text-muted-foreground text-xs">
              {t('argsDescription') || 'Space-separated list of arguments'}
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
