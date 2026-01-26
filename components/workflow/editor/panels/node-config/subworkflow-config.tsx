'use client';

/**
 * Subworkflow Node Configuration
 */

import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { NodeConfigProps, SubworkflowNodeData } from './types';

export function SubworkflowNodeConfig({ data, onUpdate }: NodeConfigProps<SubworkflowNodeData>) {
  const t = useTranslations('workflowEditor');

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{t('workflowId') || 'Workflow ID'}</Label>
        <Input
          value={data.workflowId}
          onChange={(e) => onUpdate({ workflowId: e.target.value })}
          placeholder="workflow-123"
          className="h-8 text-sm font-mono"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t('workflowName') || 'Workflow Name'}</Label>
        <Input
          value={data.workflowName || ''}
          onChange={(e) => onUpdate({ workflowName: e.target.value })}
          placeholder="My Subworkflow"
          className="h-8 text-sm"
        />
      </div>

      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          {t('subworkflowHint') || 'Configure input and output mappings in the Inputs and Outputs tabs.'}
        </p>
      </div>
    </div>
  );
}

export default SubworkflowNodeConfig;
