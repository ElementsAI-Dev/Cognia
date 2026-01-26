'use client';

/**
 * Parallel Node Configuration
 */

import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { NodeConfigProps, ParallelNodeData } from './types';

export function ParallelNodeConfig({ data, onUpdate }: NodeConfigProps<ParallelNodeData>) {
  const t = useTranslations('workflowEditor');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{t('waitForAll') || 'Wait for all branches'}</Label>
        <Switch
          checked={data.waitForAll}
          onCheckedChange={(waitForAll) => onUpdate({ waitForAll })}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t('maxConcurrency') || 'Max Concurrency'}</Label>
        <Input
          type="number"
          value={data.maxConcurrency || ''}
          onChange={(e) => onUpdate({ maxConcurrency: parseInt(e.target.value) || undefined })}
          placeholder="Unlimited"
          className="h-8 text-sm"
          min={1}
        />
        <p className="text-xs text-muted-foreground">
          {t('maxConcurrencyHint') || 'Maximum number of branches to execute simultaneously'}
        </p>
      </div>

      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          {t('parallelNodeHint') || 'Connect multiple nodes to this parallel node to execute them concurrently.'}
        </p>
      </div>
    </div>
  );
}

export default ParallelNodeConfig;
