'use client';

/**
 * CodeNode - Node for custom code execution
 */

import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { BaseNode } from './base-node';
import { Badge } from '@/components/ui/badge';
import type { CodeNodeData } from '@/types/workflow-editor';

function CodeNodeComponent(props: NodeProps) {
  const data = props.data as CodeNodeData;

  return (
    <BaseNode {...props} data={data}>
      <div className="space-y-1">
        <Badge variant="secondary" className="text-xs">
          {data.language}
        </Badge>
        {data.code && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded p-1.5 font-mono line-clamp-3 whitespace-pre">
            {data.code.slice(0, 100)}
            {data.code.length > 100 && '...'}
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export const CodeNode = memo(CodeNodeComponent);
export default CodeNode;
