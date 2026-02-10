'use client';

/**
 * Conditional Node Configuration
 */

import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
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
import type { NodeConfigProps, ConditionalNodeData } from './types';
import type { VariableReference } from '@/types/workflow/workflow-editor';

export function ConditionalNodeConfig({ data, onUpdate }: NodeConfigProps<ConditionalNodeData>) {
  const t = useTranslations('workflowEditor');

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{t('conditionType')}</Label>
        <Select
          value={data.conditionType}
          onValueChange={(value) => onUpdate({ conditionType: value as ConditionalNodeData['conditionType'] })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expression">Expression</SelectItem>
            <SelectItem value="comparison">Comparison</SelectItem>
            <SelectItem value="ai">AI Decision</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {data.conditionType === 'expression' && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t('expression')}</Label>
            <Textarea
              value={data.condition}
              onChange={(e) => onUpdate({ condition: e.target.value })}
              placeholder="input.value > 10"
              className="text-sm font-mono min-h-[60px]"
              rows={2}
            />
          </div>
          <Separator />
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Insert Variable Reference</Label>
            <VariableSelector
              value={null}
              onChange={(ref) => {
                if (ref) {
                  const varRef = `${ref.nodeId}.${ref.variableName}`;
                  onUpdate({ condition: (data.condition || '') + varRef });
                }
              }}
              currentNodeId={data.id}
              placeholder="Pick variable to insert..."
              className="w-full"
              allowClear={false}
            />
          </div>
        </div>
      )}

      {data.conditionType === 'comparison' && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Source Variable</Label>
            <VariableSelector
              value={(data as ConditionalNodeData & { sourceVariable?: VariableReference | null }).sourceVariable || null}
              onChange={(ref) => onUpdate({ sourceVariable: ref } as Partial<ConditionalNodeData>)}
              currentNodeId={data.id}
              placeholder="Select variable to compare..."
              className="w-full"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('operator')}</Label>
            <Select
              value={data.comparisonOperator || '=='}
              onValueChange={(value) => onUpdate({ comparisonOperator: value as ConditionalNodeData['comparisonOperator'] })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="==">Equals (==)</SelectItem>
                <SelectItem value="!=">Not Equals (!=)</SelectItem>
                <SelectItem value=">">Greater Than (&gt;)</SelectItem>
                <SelectItem value="<">Less Than (&lt;)</SelectItem>
                <SelectItem value=">=">Greater or Equal (&gt;=)</SelectItem>
                <SelectItem value="<=">Less or Equal (&lt;=)</SelectItem>
                <SelectItem value="contains">Contains</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('compareValue')}</Label>
            <Input
              value={data.comparisonValue || ''}
              onChange={(e) => onUpdate({ comparisonValue: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
        </>
      )}
    </div>
  );
}

export default ConditionalNodeConfig;
