'use client';

/**
 * EndNode - Workflow exit point
 */

import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { BaseNode } from './base-node';
import { Badge } from '@/components/ui/badge';
import type { EndNodeData } from '@/types/workflow-editor';

function EndNodeComponent(props: NodeProps) {
  const data = props.data as EndNodeData;
  const outputCount = Object.keys(data.workflowOutputs || {}).length;

  return (
    <BaseNode {...props} data={data} showSourceHandle={false}>
      {outputCount > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">
            {outputCount} output(s) defined
          </div>
          <div className="flex flex-wrap gap-1">
            {Object.keys(data.workflowOutputs || {}).slice(0, 3).map((key) => (
              <Badge key={key} variant="outline" className="text-xs">
                {key}
              </Badge>
            ))}
            {outputCount > 3 && (
              <Badge variant="outline" className="text-xs">
                +{outputCount - 3} more
              </Badge>
            )}
          </div>
        </div>
      )}
    </BaseNode>
  );
}

export const EndNode = memo(EndNodeComponent);
export default EndNode;
