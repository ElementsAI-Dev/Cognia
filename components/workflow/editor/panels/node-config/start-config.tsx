'use client';

/**
 * Start Node Configuration
 */

import { useTranslations } from 'next-intl';
import type { NodeConfigProps, StartNodeData } from './types';
import { IOSchemaEditor } from './io-schema-editor';

export function StartNodeConfig({ data, onUpdate }: NodeConfigProps<StartNodeData>) {
  const t = useTranslations('workflowEditor');

  return (
    <div className="space-y-3">
      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          {t('startNodeDescription') || 'Configure the workflow inputs. These will be available to all subsequent nodes.'}
        </p>
      </div>
      <IOSchemaEditor
        schema={data.workflowInputs || {}}
        onChange={(workflowInputs) => onUpdate({ workflowInputs } as Partial<StartNodeData>)}
        type="input"
      />
    </div>
  );
}

export default StartNodeConfig;
