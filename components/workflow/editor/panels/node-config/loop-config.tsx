'use client';

/**
 * Loop Node Configuration
 */

import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VariableSelector } from './variable-selector';
import type { NodeConfigProps, LoopNodeData } from './types';
import type { VariableReference } from '@/types/workflow/workflow-editor';

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
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t('collection')}</Label>
            <Input
              value={data.collection || ''}
              onChange={(e) => onUpdate({ collection: e.target.value })}
              placeholder="input.items"
              className="h-8 text-sm font-mono"
            />
          </div>
          <Separator />
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Select Collection Source</Label>
            <VariableSelector
              value={(data as LoopNodeData & { collectionVariable?: VariableReference | null }).collectionVariable || null}
              onChange={(ref) => {
                if (ref) {
                  onUpdate({
                    collection: `${ref.nodeId}.${ref.variableName}`,
                    collectionVariable: ref,
                  } as Partial<LoopNodeData>);
                }
              }}
              currentNodeId={data.id}
              placeholder="Pick array variable..."
              className="w-full"
              allowClear={false}
            />
          </div>
        </div>
      )}

      {/* Enhanced: Parallel execution, batch size, error handling */}
      {data.loopType === 'forEach' && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Parallel Execution</Label>
              <Switch
                checked={data.parallelExecution || false}
                onCheckedChange={(v) => onUpdate({ parallelExecution: v })}
              />
            </div>
            {data.parallelExecution && (
              <div className="space-y-1.5">
                <Label className="text-xs">Batch Size</Label>
                <Input
                  type="number"
                  value={data.batchSize || 5}
                  onChange={(e) => onUpdate({ batchSize: parseInt(e.target.value) || 5 })}
                  className="h-8 text-sm"
                  min={1}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Error Handling</Label>
              <Select
                value={data.errorHandling || 'stop'}
                onValueChange={(v) => onUpdate({ errorHandling: v as 'stop' | 'skip' | 'continue' })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stop">Stop on Error</SelectItem>
                  <SelectItem value="skip">Skip Failed Items</SelectItem>
                  <SelectItem value="continue">Continue on Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}

      {data.loopType === 'while' && (
        <div className="space-y-3">
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
    </div>
  );
}

export default LoopNodeConfig;
