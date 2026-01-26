'use client';

/**
 * End Node Configuration
 */

import { useTranslations } from 'next-intl';
import type { NodeConfigProps, EndNodeData } from './types';
import { IOSchemaEditor } from './io-schema-editor';

export function EndNodeConfig({ data, onUpdate }: NodeConfigProps<EndNodeData>) {
  const t = useTranslations('workflowEditor');

  return (
    <div className="space-y-3">
      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          {t('endNodeDescription') || 'Configure the workflow outputs. Map values from previous nodes to the final output.'}
        </p>
      </div>
      <IOSchemaEditor
        schema={data.workflowOutputs || {}}
        onChange={(workflowOutputs) => onUpdate({ workflowOutputs })}
        type="output"
      />
    </div>
  );
}

export default EndNodeConfig;
