'use client';

/**
 * LoopNode - Node for iteration/loops
 */

import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { BaseNode } from './base-node';
import { Badge } from '@/components/ui/badge';
import type { LoopNodeData } from '@/types/workflow/workflow-editor';

function LoopNodeComponent(props: NodeProps) {
  const data = props.data as LoopNodeData;

  return (
    <BaseNode {...props} data={data}>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {data.loopType}
          </Badge>
          <Badge variant="outline" className="text-xs">
            max: {data.maxIterations}
          </Badge>
        </div>
        {data.iteratorVariable && (
          <div className="text-xs text-muted-foreground font-mono">
            {data.iteratorVariable}
          </div>
        )}
        {data.collection && (
          <div className="text-xs text-muted-foreground">
            Collection: {data.collection}
          </div>
        )}
        {data.condition && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded p-1 font-mono">
            {data.condition}
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export const LoopNode = memo(LoopNodeComponent);
export default LoopNode;
