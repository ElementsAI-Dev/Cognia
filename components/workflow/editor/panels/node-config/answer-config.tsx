'use client';

/**
 * Answer Node Configuration - Template editor for Chatflow output
 */

import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { MultiVariableSelector } from './variable-selector';
import type { NodeConfigProps, AnswerNodeData } from './types';
import type { VariableReference } from '@/types/workflow/workflow-editor';

export function AnswerNodeConfig({ data, onUpdate }: NodeConfigProps<AnswerNodeData>) {
  const t = useTranslations('workflowEditor');

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{t('answerTemplate') || 'Answer Template'}</Label>
        <Textarea
          value={data.template}
          onChange={(e) => onUpdate({ template: e.target.value })}
          placeholder="Enter the response template. Use {{variable}} to insert variable values."
          className="text-sm font-mono min-h-[120px]"
        />
        <p className="text-[10px] text-muted-foreground">
          Use {'{{node.variable}}'} syntax to reference upstream node outputs.
        </p>
      </div>

      <Separator />

      <div className="space-y-1.5">
        <Label className="text-xs">{t('variableReferences') || 'Variable References'}</Label>
        <MultiVariableSelector
          value={data.variableRefs}
          onChange={(refs: VariableReference[]) => onUpdate({ variableRefs: refs })}
        />
      </div>

      <Separator />

      <div className="text-[10px] text-muted-foreground">
        The Answer node outputs text directly to the user in Chatflow mode. It can be placed at any point in the workflow to send intermediate responses.
      </div>
    </div>
  );
}

export default AnswerNodeConfig;
