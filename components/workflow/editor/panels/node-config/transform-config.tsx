'use client';

/**
 * Transform Node Configuration
 */

import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { NodeConfigProps, TransformNodeData } from './types';

export function TransformNodeConfig({ data, onUpdate }: NodeConfigProps<TransformNodeData>) {
  const t = useTranslations('workflowEditor');

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{t('transformType') || 'Transform Type'}</Label>
        <Select
          value={data.transformType}
          onValueChange={(value) => onUpdate({ transformType: value as TransformNodeData['transformType'] })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="map">Map</SelectItem>
            <SelectItem value="filter">Filter</SelectItem>
            <SelectItem value="reduce">Reduce</SelectItem>
            <SelectItem value="sort">Sort</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t('transformExpression') || 'Expression'}</Label>
        <Textarea
          value={data.expression}
          onChange={(e) => onUpdate({ expression: e.target.value })}
          placeholder="item => item.value * 2"
          className="text-sm font-mono min-h-[80px]"
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          {t('transformExpressionHint') || 'Use JavaScript arrow function syntax'}
        </p>
      </div>
    </div>
  );
}

export default TransformNodeConfig;
