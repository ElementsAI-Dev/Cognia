'use client';

/**
 * MergeNode - Node for merging multiple branches
 */

import { memo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { BaseNode } from './base-node';
import { Badge } from '@/components/ui/badge';
import { GitMerge, Layers, ChevronFirst, ChevronLast, Code } from 'lucide-react';
import type { MergeNodeData } from '@/types/workflow/workflow-editor';

const STRATEGY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  concat: Layers,
  merge: GitMerge,
  first: ChevronFirst,
  last: ChevronLast,
  custom: Code,
};

const STRATEGY_LABELS: Record<string, string> = {
  concat: 'Concatenate Arrays',
  merge: 'Merge Objects',
  first: 'First Value',
  last: 'Last Value',
  custom: 'Custom Logic',
};

function MergeNodeComponent(props: NodeProps) {
  const data = props.data as MergeNodeData;

  const StrategyIcon = STRATEGY_ICONS[data.mergeStrategy] || GitMerge;
  const strategyLabel = STRATEGY_LABELS[data.mergeStrategy] || data.mergeStrategy;

  return (
    <BaseNode
      {...props}
      data={data}
      multipleTargetHandles={[
        { id: 'input-1', position: Position.Top },
        { id: 'input-2', position: Position.Left },
        { id: 'input-3', position: Position.Right },
      ]}
    >
      <div className="space-y-2">
        {/* Strategy badge */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            <StrategyIcon className="h-3 w-3 mr-1 text-cyan-500" />
            {data.mergeStrategy}
          </Badge>
        </div>

        {/* Strategy description */}
        <div className="p-2 bg-muted/50 rounded text-xs text-muted-foreground">
          {strategyLabel}
        </div>

        {/* Input count indicator */}
        {Object.keys(data.inputs || {}).length > 0 && (
          <Badge variant="outline" className="text-xs">
            {Object.keys(data.inputs).length} inputs to merge
          </Badge>
        )}
      </div>
    </BaseNode>
  );
}

export const MergeNode = memo(MergeNodeComponent);
export default MergeNode;
