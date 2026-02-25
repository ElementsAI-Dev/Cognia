'use client';

/**
 * VariableAssignerNode - Runtime variable assignment node
 */

import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { BaseNode } from './base-node';
import type { VariableAssignerNodeData } from '@/types/workflow/workflow-editor';

function VariableAssignerNodeComponent(props: NodeProps) {
  const data = props.data as VariableAssignerNodeData;
  const assignments = data.assignments || [];

  return (
    <BaseNode {...props} data={data}>
      {assignments.length > 0 ? (
        <div className="space-y-0.5">
          {assignments.slice(0, 3).map((a, i) => (
            <div key={i} className="flex items-center gap-1 text-[10px]">
              <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono">
                {a.targetVariable || '?'}
              </Badge>
              <span className="text-muted-foreground">←</span>
              <span className="text-muted-foreground truncate">{a.sourceType}</span>
            </div>
          ))}
          {assignments.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{assignments.length - 3} more</span>
          )}
        </div>
      ) : (
        <div className="text-[10px] text-muted-foreground italic">No assignments</div>
      )}
    </BaseNode>
  );
}

export const VariableAssignerNode = memo(VariableAssignerNodeComponent);
export default VariableAssignerNode;
