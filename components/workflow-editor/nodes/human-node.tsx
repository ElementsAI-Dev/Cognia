'use client';

/**
 * HumanNode - Node for human approval/input
 */

import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { BaseNode } from './base-node';
import { Badge } from '@/components/ui/badge';
import type { HumanNodeData } from '@/types/workflow/workflow-editor';

function HumanNodeComponent(props: NodeProps) {
  const data = props.data as HumanNodeData;

  return (
    <BaseNode {...props} data={data}>
      <div className="space-y-2">
        {data.approvalMessage && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded p-1.5 line-clamp-2">
            {data.approvalMessage}
          </div>
        )}
        <div className="flex flex-wrap gap-1">
          {data.approvalOptions?.map((option, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {option}
            </Badge>
          ))}
        </div>
        {data.timeout && (
          <div className="text-xs text-muted-foreground">
            Timeout: {data.timeout}s
          </div>
        )}
        {data.assignee && (
          <div className="text-xs text-muted-foreground">
            Assignee: {data.assignee}
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export const HumanNode = memo(HumanNodeComponent);
export default HumanNode;
