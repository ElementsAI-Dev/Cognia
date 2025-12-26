'use client';

/**
 * AINode - Node for AI/LLM steps
 */

import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { BaseNode } from './base-node';
import { Badge } from '@/components/ui/badge';
import type { AINodeData } from '@/types/workflow-editor';

function AINodeComponent(props: NodeProps) {
  const data = props.data as AINodeData;

  return (
    <BaseNode {...props} data={data}>
      {data.aiPrompt && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded p-1.5 line-clamp-2 font-mono">
          {data.aiPrompt.slice(0, 100)}
          {data.aiPrompt.length > 100 && '...'}
        </div>
      )}
      <div className="flex flex-wrap gap-1 mt-2">
        {data.model && (
          <Badge variant="secondary" className="text-xs">
            {data.model}
          </Badge>
        )}
        {data.temperature !== undefined && (
          <Badge variant="outline" className="text-xs">
            T: {data.temperature}
          </Badge>
        )}
        {data.responseFormat && data.responseFormat !== 'text' && (
          <Badge variant="outline" className="text-xs">
            {data.responseFormat}
          </Badge>
        )}
      </div>
    </BaseNode>
  );
}

export const AINode = memo(AINodeComponent);
export default AINode;
