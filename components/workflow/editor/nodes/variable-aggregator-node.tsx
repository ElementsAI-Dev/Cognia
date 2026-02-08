'use client';

/**
 * VariableAggregatorNode - Merge variables from multiple branches (Dify-inspired)
 */

import { memo } from 'react';
import { type NodeProps, Handle, Position } from '@xyflow/react';
import { BaseNode } from './base-node';
import { Badge } from '@/components/ui/badge';
import { Combine } from 'lucide-react';
import type { VariableAggregatorNodeData } from '@/types/workflow/workflow-editor';

function VariableAggregatorNodeComponent(props: NodeProps) {
  const data = props.data as VariableAggregatorNodeData;

  const modeLabels: Record<string, string> = {
    first: 'First Value',
    last: 'Last Value',
    array: 'Collect as Array',
    merge: 'Deep Merge',
  };

  return (
    <BaseNode {...props} data={data}>
      <div className="space-y-2">
        {/* Aggregation mode */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {modeLabels[data.aggregationMode] || data.aggregationMode}
          </Badge>
        </div>

        {/* Variable references */}
        {data.variableRefs.length > 0 ? (
          <div className="space-y-1">
            {data.variableRefs.slice(0, 4).map((ref, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5"
              >
                <span className="text-blue-500">{ref.nodeId}</span>
                <span>.</span>
                <span>{ref.variableName}</span>
              </div>
            ))}
            {data.variableRefs.length > 4 && (
              <div className="text-xs text-muted-foreground">
                +{data.variableRefs.length - 4} more variables
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground italic">
            <Combine className="h-3 w-3" />
            No variables selected
          </div>
        )}

        {/* Output variable name */}
        <div className="text-xs text-muted-foreground">
          → <span className="font-mono">{data.outputVariableName}</span>
        </div>
      </div>

      {/* Multiple input handles for variable aggregation */}
      <Handle
        type="target"
        position={Position.Left}
        id="input-1"
        style={{ top: '30%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="input-2"
        style={{ top: '60%' }}
      />
    </BaseNode>
  );
}

export const VariableAggregatorNode = memo(VariableAggregatorNodeComponent);
export default VariableAggregatorNode;
