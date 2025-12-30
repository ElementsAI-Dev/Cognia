'use client';

/**
 * SubworkflowNode - Node for executing nested workflows
 */

import { memo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { BaseNode } from './base-node';
import { Badge } from '@/components/ui/badge';
import { Workflow, ExternalLink } from 'lucide-react';
import type { SubworkflowNodeData } from '@/types/workflow-editor';

function SubworkflowNodeComponent(props: NodeProps) {
  const data = props.data as SubworkflowNodeData;

  return (
    <BaseNode
      {...props}
      data={data}
      multipleSourceHandles={[
        { id: 'output', position: Position.Bottom },
      ]}
      multipleTargetHandles={[
        { id: 'input', position: Position.Top },
      ]}
    >
      <div className="space-y-2">
        {/* Workflow reference */}
        {data.workflowId ? (
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded text-xs">
            <Workflow className="h-3.5 w-3.5 text-indigo-500" />
            <span className="flex-1 truncate font-mono">
              {data.workflowName || data.workflowId}
            </span>
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic">
            No workflow selected
          </div>
        )}

        {/* Input/Output mapping count */}
        <div className="flex gap-2">
          {Object.keys(data.inputMapping || {}).length > 0 && (
            <Badge variant="outline" className="text-xs">
              {Object.keys(data.inputMapping).length} inputs
            </Badge>
          )}
          {Object.keys(data.outputMapping || {}).length > 0 && (
            <Badge variant="outline" className="text-xs">
              {Object.keys(data.outputMapping).length} outputs
            </Badge>
          )}
        </div>
      </div>
    </BaseNode>
  );
}

export const SubworkflowNode = memo(SubworkflowNodeComponent);
export default SubworkflowNode;
