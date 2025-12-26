'use client';

/**
 * StartNode - Workflow entry point
 */

import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { BaseNode } from './base-node';
import { Badge } from '@/components/ui/badge';
import type { StartNodeData } from '@/types/workflow-editor';

function StartNodeComponent(props: NodeProps) {
  const data = props.data as StartNodeData;
  const inputCount = Object.keys(data.workflowInputs || {}).length;

  return (
    <BaseNode {...props} data={data} showTargetHandle={false}>
      {inputCount > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">
            {inputCount} input(s) defined
          </div>
          <div className="flex flex-wrap gap-1">
            {Object.keys(data.workflowInputs || {}).slice(0, 3).map((key) => (
              <Badge key={key} variant="outline" className="text-xs">
                {key}
              </Badge>
            ))}
            {inputCount > 3 && (
              <Badge variant="outline" className="text-xs">
                +{inputCount - 3} more
              </Badge>
            )}
          </div>
        </div>
      )}
    </BaseNode>
  );
}

export const StartNode = memo(StartNodeComponent);
export default StartNode;
