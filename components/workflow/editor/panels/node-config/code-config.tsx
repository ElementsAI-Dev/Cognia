'use client';

/**
 * Code Node Configuration
 */

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VariableSelector } from './variable-selector';
import type { NodeConfigProps, CodeNodeData } from './types';
import { createEditorOptions, getMonacoLanguage } from '@/lib/monaco';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-32 items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  ),
});

export function CodeNodeConfig({ data, onUpdate }: NodeConfigProps<CodeNodeData>) {
  const t = useTranslations('workflowEditor');
  const sandbox = data.sandbox ?? { runtime: 'auto', networkEnabled: false };

  const parseKeyValueLines = (value: string): Record<string, string> => {
    const result: Record<string, string> = {};
    value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const separatorIndex = line.indexOf('=');
        if (separatorIndex <= 0) {
          return;
        }
        const key = line.slice(0, separatorIndex).trim();
        const val = line.slice(separatorIndex + 1).trim();
        if (key) {
          result[key] = val;
        }
      });
    return result;
  };

  const keyValueLines = (value?: Record<string, string>): string =>
    Object.entries(value || {})
      .map(([key, v]) => `${key}=${v}`)
      .join('\n');

  const updateSandbox = (updates: Partial<NonNullable<CodeNodeData['sandbox']>>) => {
    onUpdate({
      sandbox: {
        ...sandbox,
        ...updates,
      },
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{t('language')}</Label>
        <Select
          value={data.language}
          onValueChange={(value) => onUpdate({ language: value as CodeNodeData['language'] })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="javascript">JavaScript</SelectItem>
            <SelectItem value="typescript">TypeScript</SelectItem>
            <SelectItem value="python">Python</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t('code')}</Label>
        <div className="border rounded-md overflow-hidden">
          <MonacoEditor
            height="200px"
            language={getMonacoLanguage(data.language)}
            theme="vs-dark"
            value={data.code}
            onChange={(value) => onUpdate({ code: value || '' })}
            options={createEditorOptions('code', {
              minimap: { enabled: false },
              fontSize: 12,
              stickyScroll: { enabled: false },
              padding: { top: 8, bottom: 8 },
            })}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-1.5">
        <Label className="text-xs">{t('runtime') || 'Runtime'}</Label>
        <Select
          value={sandbox.runtime || 'auto'}
          onValueChange={(value) => updateSandbox({ runtime: value as NonNullable<CodeNodeData['sandbox']>['runtime'] })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto</SelectItem>
            <SelectItem value="docker">Docker</SelectItem>
            <SelectItem value="podman">Podman</SelectItem>
            <SelectItem value="native">Native</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Timeout (ms)</Label>
          <Input
            type="number"
            min={1}
            value={sandbox.timeoutMs ?? ''}
            onChange={(e) => {
              const value = e.target.value;
              updateSandbox({
                timeoutMs: value ? Number(value) : undefined,
              });
            }}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Memory (MB)</Label>
          <Input
            type="number"
            min={1}
            value={sandbox.memoryLimitMb ?? ''}
            onChange={(e) => {
              const value = e.target.value;
              updateSandbox({
                memoryLimitMb: value ? Number(value) : undefined,
              });
            }}
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-md border px-3 py-2">
        <Label className="text-xs">Network Access</Label>
        <Switch
          checked={sandbox.networkEnabled ?? false}
          onCheckedChange={(checked) => updateSandbox({ networkEnabled: checked })}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Args (one per line)</Label>
        <Textarea
          value={(sandbox.args || []).join('\n')}
          onChange={(e) => {
            const args = e.target.value
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean);
            updateSandbox({ args });
          }}
          className="min-h-[72px] text-sm font-mono"
          placeholder="--flag\nvalue"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Environment Variables (KEY=value)</Label>
        <Textarea
          value={keyValueLines(sandbox.env)}
          onChange={(e) => updateSandbox({ env: parseKeyValueLines(e.target.value) })}
          className="min-h-[72px] text-sm font-mono"
          placeholder="API_KEY=xxx"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Files (path=content)</Label>
        <Textarea
          value={keyValueLines(sandbox.files)}
          onChange={(e) => updateSandbox({ files: parseKeyValueLines(e.target.value) })}
          className="min-h-[72px] text-sm font-mono"
          placeholder="data/input.txt=hello"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Insert Variable Reference</Label>
        <VariableSelector
          value={null}
          onChange={(ref) => {
            if (ref) {
              const varRef = `inputs.${ref.nodeId}.${ref.variableName}`;
              onUpdate({ code: (data.code || '') + varRef });
            }
          }}
          currentNodeId={data.id}
          placeholder="Pick variable to insert..."
          className="w-full"
          allowClear={false}
        />
      </div>
    </div>
  );
}

export default CodeNodeConfig;
