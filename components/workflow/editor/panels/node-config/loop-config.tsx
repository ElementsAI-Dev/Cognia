'use client';

/**
 * Loop Node Configuration
 */

import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { NodeConfigProps, LoopNodeData } from './types';

export function LoopNodeConfig({ data, onUpdate }: NodeConfigProps<LoopNodeData>) {
  const t = useTranslations('workflowEditor');

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{t('loopType')}</Label>
        <Select
          value={data.loopType}
          onValueChange={(value) => onUpdate({ loopType: value as LoopNodeData['loopType'] })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="forEach">For Each</SelectItem>
            <SelectItem value="while">While</SelectItem>
            <SelectItem value="times">Times</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t('iteratorVariable')}</Label>
        <Input
          value={data.iteratorVariable}
          onChange={(e) => onUpdate({ iteratorVariable: e.target.value })}
          placeholder="item"
          className="h-8 text-sm font-mono"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t('maxIterations')}</Label>
        <Input
          type="number"
          value={data.maxIterations}
          onChange={(e) => onUpdate({ maxIterations: parseInt(e.target.value) || 100 })}
          className="h-8 text-sm"
        />
      </div>

      {data.loopType === 'forEach' && (
        <div className="space-y-1.5">
          <Label className="text-xs">{t('collection')}</Label>
          <Input
            value={data.collection || ''}
            onChange={(e) => onUpdate({ collection: e.target.value })}
            placeholder="input.items"
            className="h-8 text-sm font-mono"
          />
        </div>
      )}

      {data.loopType === 'while' && (
        <div className="space-y-1.5">
          <Label className="text-xs">{t('condition')}</Label>
          <Textarea
            value={data.condition || ''}
            onChange={(e) => onUpdate({ condition: e.target.value })}
            placeholder="index < 10"
            className="text-sm font-mono min-h-[60px]"
            rows={2}
          />
        </div>
      )}
    </div>
  );
}

export default LoopNodeConfig;
