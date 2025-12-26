'use client';

/**
 * ConditionalNode - Node for conditional branching
 */

import { memo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { BaseNode } from './base-node';
import { Badge } from '@/components/ui/badge';
import type { ConditionalNodeData } from '@/types/workflow-editor';

function ConditionalNodeComponent(props: NodeProps) {
  const data = props.data as ConditionalNodeData;

  return (
    <BaseNode
      {...props}
      data={data}
      multipleSourceHandles={[
        { id: 'true', position: Position.Right, label: 'True' },
        { id: 'false', position: Position.Bottom, label: 'False' },
      ]}
    >
      <div className="space-y-1">
        <Badge variant="outline" className="text-xs">
          {data.conditionType}
        </Badge>
        {data.condition && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded p-1.5 font-mono line-clamp-2">
            {data.condition}
          </div>
        )}
        {data.conditionType === 'comparison' && data.comparisonOperator && (
          <div className="text-xs text-muted-foreground">
            {data.comparisonOperator} {data.comparisonValue}
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-2 text-xs">
        <span className="text-green-600">✓ True</span>
        <span className="text-red-600">✗ False</span>
      </div>
    </BaseNode>
  );
}

export const ConditionalNode = memo(ConditionalNodeComponent);
export default ConditionalNode;
