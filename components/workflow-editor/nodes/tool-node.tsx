'use client';

/**
 * ToolNode - Node for tool/function calls
 */

import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { BaseNode } from './base-node';
import { Badge } from '@/components/ui/badge';
import type { ToolNodeData } from '@/types/workflow/workflow-editor';

function ToolNodeComponent(props: NodeProps) {
  const data = props.data as ToolNodeData;

  return (
    <BaseNode {...props} data={data}>
      {data.toolName && (
        <Badge variant="secondary" className="text-xs font-mono">
          {data.toolName}
        </Badge>
      )}
      {data.toolCategory && (
        <span className="text-xs text-muted-foreground ml-1">
          ({data.toolCategory})
        </span>
      )}
      {Object.keys(data.parameterMapping || {}).length > 0 && (
        <div className="mt-1 text-xs text-muted-foreground">
          {Object.keys(data.parameterMapping).length} parameter(s) mapped
        </div>
      )}
    </BaseNode>
  );
}

export const ToolNode = memo(ToolNodeComponent);
export default ToolNode;
