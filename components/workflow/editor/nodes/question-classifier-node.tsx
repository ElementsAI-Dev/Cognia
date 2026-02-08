'use client';

/**
 * QuestionClassifierNode - AI-powered question classification (Dify-inspired)
 * Routes to different branches based on classification result
 */

import { memo } from 'react';
import { type NodeProps, Handle, Position } from '@xyflow/react';
import { BaseNode } from './base-node';
import { Badge } from '@/components/ui/badge';
import type { QuestionClassifierNodeData } from '@/types/workflow/workflow-editor';

function QuestionClassifierNodeComponent(props: NodeProps) {
  const data = props.data as QuestionClassifierNodeData;

  return (
    <BaseNode {...props} data={data}>
      <div className="space-y-2">
        {/* Model badge */}
        {data.model && (
          <Badge variant="secondary" className="text-xs">
            {data.model}
          </Badge>
        )}

        {/* Input variable */}
        {data.inputVariable && (
          <div className="text-xs bg-muted/50 rounded p-1.5 font-mono text-muted-foreground">
            Input: {data.inputVariable.nodeId}.{data.inputVariable.variableName}
          </div>
        )}

        {/* Classification classes */}
        <div className="space-y-1">
          {data.classes.map((cls, i) => (
            <div
              key={cls.id}
              className="flex items-center gap-2 text-xs"
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: [
                    '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
                    '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
                  ][i % 8],
                }}
              />
              <span className="font-medium truncate">{cls.name}</span>
              {cls.description && (
                <span className="text-muted-foreground truncate text-[10px]">
                  {cls.description}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Output handles for each class */}
      {data.classes.map((cls, i) => (
        <Handle
          key={cls.id}
          type="source"
          position={Position.Right}
          id={`class-${cls.id}`}
          style={{
            top: `${((i + 1) / (data.classes.length + 1)) * 100}%`,
            background: [
              '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
              '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
            ][i % 8],
          }}
        />
      ))}
    </BaseNode>
  );
}

export const QuestionClassifierNode = memo(QuestionClassifierNodeComponent);
export default QuestionClassifierNode;
