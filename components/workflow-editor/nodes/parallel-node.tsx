'use client';

/**
 * ParallelNode - Node for parallel execution
 */

import { memo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { BaseNode } from './base-node';
import { Badge } from '@/components/ui/badge';
import type { ParallelNodeData } from '@/types/workflow/workflow-editor';

function ParallelNodeComponent(props: NodeProps) {
  const data = props.data as ParallelNodeData;
  const branchCount = data.branches?.length || 0;

  return (
    <BaseNode
      {...props}
      data={data}
      multipleSourceHandles={
        branchCount > 0
          ? data.branches.map((_, i) => ({
              id: `branch-${i}`,
              position: Position.Bottom,
              label: `Branch ${i + 1}`,
            }))
          : undefined
      }
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {branchCount} branch(es)
          </Badge>
          {data.waitForAll && (
            <Badge variant="outline" className="text-xs">
              Wait all
            </Badge>
          )}
        </div>
        {data.maxConcurrency && (
          <div className="text-xs text-muted-foreground">
            Max concurrency: {data.maxConcurrency}
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export const ParallelNode = memo(ParallelNodeComponent);
export default ParallelNode;
