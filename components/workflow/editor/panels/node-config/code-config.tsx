'use client';

/**
 * Code Node Configuration
 */

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { NodeConfigProps, CodeNodeData } from './types';

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
            language={data.language}
            theme="vs-dark"
            value={data.code}
            onChange={(value) => onUpdate({ code: value || '' })}
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              tabSize: 2,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default CodeNodeConfig;
