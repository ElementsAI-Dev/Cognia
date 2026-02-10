'use client';

/**
 * Transform Node Configuration
 */

import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VariableSelector } from './variable-selector';
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

      <Separator />

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Insert Variable Reference</Label>
        <VariableSelector
          value={null}
          onChange={(ref) => {
            if (ref) {
              const varRef = `${ref.nodeId}.${ref.variableName}`;
              onUpdate({ expression: (data.expression || '') + varRef });
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

export default TransformNodeConfig;
