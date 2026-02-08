'use client';

/**
 * ParameterExtractorNode - LLM-based structured parameter extraction (Dify-inspired)
 */

import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { BaseNode } from './base-node';
import { Badge } from '@/components/ui/badge';
import { ListChecks } from 'lucide-react';
import type { ParameterExtractorNodeData } from '@/types/workflow/workflow-editor';

function ParameterExtractorNodeComponent(props: NodeProps) {
  const data = props.data as ParameterExtractorNodeData;

  return (
    <BaseNode {...props} data={data}>
      <div className="space-y-2">
        {/* Model badge */}
        {data.model && (
          <Badge variant="secondary" className="text-xs">
            {data.model}
          </Badge>
        )}

        {/* Instruction preview */}
        {data.instruction && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded p-1.5 line-clamp-2">
            {data.instruction}
          </div>
        )}

        {/* Parameters list */}
        {data.parameters.length > 0 ? (
          <div className="space-y-1">
            {data.parameters.slice(0, 4).map((param, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs"
              >
                <span className="font-mono text-muted-foreground">{param.name}</span>
                <Badge variant="outline" className="text-[10px] h-4 px-1">
                  {param.type}
                </Badge>
                {param.required && (
                  <span className="text-destructive text-[10px]">*</span>
                )}
              </div>
            ))}
            {data.parameters.length > 4 && (
              <div className="text-xs text-muted-foreground">
                +{data.parameters.length - 4} more parameters
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground italic">
            <ListChecks className="h-3 w-3" />
            No parameters defined
          </div>
        )}

        {/* Input variable reference */}
        {data.inputVariable && (
          <div className="text-xs bg-muted/50 rounded p-1.5 font-mono text-muted-foreground">
            Input: {data.inputVariable.nodeId}.{data.inputVariable.variableName}
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export const ParameterExtractorNode = memo(ParameterExtractorNodeComponent);
export default ParameterExtractorNode;
