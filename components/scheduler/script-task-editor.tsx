'use client';

import { AlertTriangle, Play, Settings2 } from 'lucide-react';
import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validation, setValidation] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);

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
        <Label>脚本语言 / Script Language</Label>
        <Select
          value={value.language}
          onValueChange={handleLanguageChange}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择语言 / Select language" />
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
          <Label>脚本代码 / Script Code</Label>
          {onTest && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onTest}
              disabled={disabled || !value.code.trim()}
            >
              <Play className="mr-1 h-3 w-3" />
              测试 / Test
            </Button>
          )}
        </div>
        <Textarea
          value={value.code}
          onChange={(e) => handleCodeChange(e.target.value)}
          placeholder={getScriptTemplate(value.language || 'python')}
          className="min-h-[200px] font-mono text-sm"
          disabled={disabled}
        />

        {/* Validation feedback */}
        {validation && (
          <div className="space-y-1">
            {validation.errors.map((error, i) => (
              <p key={`error-${i}`} className="text-destructive flex items-center gap-1 text-xs">
                <AlertTriangle className="h-3 w-3" />
                {error}
              </p>
            ))}
            {validation.warnings.map((warning, i) => (
              <p key={`warning-${i}`} className="flex items-center gap-1 text-xs text-yellow-500">
                <AlertTriangle className="h-3 w-3" />
                {warning}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Sandbox toggle */}
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">沙盒执行 / Sandbox Execution</Label>
          <p className="text-muted-foreground text-xs">
            在隔离环境中运行脚本（更安全）/ Run script in isolated environment (safer)
          </p>
        </div>
        <Switch
          checked={value.use_sandbox !== false}
          onCheckedChange={(checked) => handleSettingChange('use_sandbox', checked)}
          disabled={disabled}
        />
      </div>

      {/* Advanced settings */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-start">
            <Settings2 className="mr-2 h-4 w-4" />
            高级设置 / Advanced Settings
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          {/* Timeout */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>超时时间 (秒) / Timeout (seconds)</Label>
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
              <Label>内存限制 (MB) / Memory Limit (MB)</Label>
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
            <Label>工作目录 / Working Directory</Label>
            <Input
              value={value.working_dir || ''}
              onChange={(e) => handleSettingChange('working_dir', e.target.value || undefined)}
              placeholder="(可选) 脚本执行目录 / (Optional) Script execution directory"
              disabled={disabled}
            />
          </div>

          {/* Arguments */}
          <div className="space-y-2">
            <Label>命令行参数 / Command Line Arguments</Label>
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
              空格分隔的参数列表 / Space-separated list of arguments
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
