'use client';

/**
 * AnswerNode - Direct text output node for Chatflow mode
 */

import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { BaseNode } from './base-node';
import type { AnswerNodeData } from '@/types/workflow/workflow-editor';

function AnswerNodeComponent(props: NodeProps) {
  const data = props.data as AnswerNodeData;
  const template = data.template || '';

  return (
    <BaseNode {...props} data={data}>
      {template ? (
        <div className="text-[10px] text-muted-foreground line-clamp-2 font-mono bg-muted/50 rounded px-1.5 py-1">
          {template.slice(0, 80)}{template.length > 80 ? '...' : ''}
        </div>
      ) : (
        <div className="text-[10px] text-muted-foreground italic">No template configured</div>
      )}
    </BaseNode>
  );
}

export const AnswerNode = memo(AnswerNodeComponent);
export default AnswerNode;
