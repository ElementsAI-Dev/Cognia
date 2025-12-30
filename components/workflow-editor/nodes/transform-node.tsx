'use client';

/**
 * TransformNode - Node for data transformation
 */

import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { BaseNode } from './base-node';
import { Badge } from '@/components/ui/badge';
import { Shuffle, Filter, ArrowDownUp, Layers, Code } from 'lucide-react';
import type { TransformNodeData } from '@/types/workflow-editor';

const TRANSFORM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  map: Shuffle,
  filter: Filter,
  reduce: Layers,
  sort: ArrowDownUp,
  custom: Code,
};

const TRANSFORM_COLORS: Record<string, string> = {
  map: 'text-purple-500',
  filter: 'text-blue-500',
  reduce: 'text-green-500',
  sort: 'text-orange-500',
  custom: 'text-pink-500',
};

function TransformNodeComponent(props: NodeProps) {
  const data = props.data as TransformNodeData;

  const TransformIcon = TRANSFORM_ICONS[data.transformType] || Shuffle;
  const iconColor = TRANSFORM_COLORS[data.transformType] || 'text-purple-500';

  return (
    <BaseNode {...props} data={data}>
      <div className="space-y-2">
        {/* Transform type badge */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs capitalize">
            <TransformIcon className={`h-3 w-3 mr-1 ${iconColor}`} />
            {data.transformType}
          </Badge>
        </div>

        {/* Expression preview */}
        {data.expression ? (
          <div className="p-2 bg-muted/50 rounded text-xs font-mono line-clamp-2">
            {data.expression.slice(0, 60)}
            {data.expression.length > 60 && '...'}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic">
            No expression defined
          </div>
        )}

        {/* IO indicators */}
        <div className="flex gap-2">
          {Object.keys(data.inputs || {}).length > 0 && (
            <Badge variant="outline" className="text-xs">
              {Object.keys(data.inputs).length} in
            </Badge>
          )}
          {Object.keys(data.outputs || {}).length > 0 && (
            <Badge variant="outline" className="text-xs">
              {Object.keys(data.outputs).length} out
            </Badge>
          )}
        </div>
      </div>
    </BaseNode>
  );
}

export const TransformNode = memo(TransformNodeComponent);
export default TransformNode;
