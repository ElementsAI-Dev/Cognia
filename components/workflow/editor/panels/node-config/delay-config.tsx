'use client';

/**
 * Delay Node Configuration
 */

import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { NodeConfigProps, DelayNodeData } from './types';

export function DelayNodeConfig({ data, onUpdate }: NodeConfigProps<DelayNodeData>) {
  const t = useTranslations('workflowEditor');

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{t('delayType') || 'Delay Type'}</Label>
        <Select
          value={data.delayType}
          onValueChange={(value) => onUpdate({ delayType: value as DelayNodeData['delayType'] })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">Fixed Duration</SelectItem>
            <SelectItem value="until">Until Time</SelectItem>
            <SelectItem value="cron">Cron Schedule</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {data.delayType === 'fixed' && (
        <div className="space-y-1.5">
          <Label className="text-xs">{t('delayDuration') || 'Duration (ms)'}</Label>
          <Input
            type="number"
            value={data.delayMs || ''}
            onChange={(e) => onUpdate({ delayMs: parseInt(e.target.value) || undefined })}
            placeholder="1000"
            className="h-8 text-sm"
            min={0}
          />
          <p className="text-xs text-muted-foreground">
            {data.delayMs ? `${(data.delayMs / 1000).toFixed(1)} seconds` : 'Enter delay in milliseconds'}
          </p>
        </div>
      )}

      {data.delayType === 'until' && (
        <div className="space-y-1.5">
          <Label className="text-xs">{t('untilTime') || 'Until Time'}</Label>
          <Input
            type="datetime-local"
            value={data.untilTime || ''}
            onChange={(e) => onUpdate({ untilTime: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
      )}

      {data.delayType === 'cron' && (
        <div className="space-y-1.5">
          <Label className="text-xs">{t('cronExpression') || 'Cron Expression'}</Label>
          <Input
            value={data.cronExpression || ''}
            onChange={(e) => onUpdate({ cronExpression: e.target.value })}
            placeholder="0 * * * *"
            className="h-8 text-sm font-mono"
          />
          <p className="text-xs text-muted-foreground">
            {t('cronHint') || 'e.g., "0 * * * *" for every hour'}
          </p>
        </div>
      )}
    </div>
  );
}

export default DelayNodeConfig;
