'use client';

/**
 * ChartNode - Node for data visualization (line, bar, pie, area, scatter, radar charts)
 */

import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { BaseNode } from './base-node';
import { Badge } from '@/components/ui/badge';
import type { ChartNodeData } from '@/types/workflow/workflow-editor';

const CHART_TYPE_LABELS: Record<string, string> = {
  line: 'Line',
  bar: 'Bar',
  pie: 'Pie',
  area: 'Area',
  scatter: 'Scatter',
  radar: 'Radar',
  composed: 'Composed',
};

function ChartNodeComponent(props: NodeProps) {
  const data = props.data as ChartNodeData;

  const chartLabel = CHART_TYPE_LABELS[data.chartType] || 'Chart';

  return (
    <BaseNode {...props} data={data}>
      <div className="space-y-2">
        {/* Chart type badge */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs capitalize">
            {chartLabel}
          </Badge>
          {data.stacked && (
            <Badge variant="outline" className="text-xs">
              Stacked
            </Badge>
          )}
        </div>

        {/* Title */}
        {data.title && (
          <div className="text-xs text-muted-foreground truncate">
            {data.title}
          </div>
        )}

        {/* Series info */}
        {data.series.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {data.series.slice(0, 3).map((s, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1"
                  style={{ backgroundColor: s.color || '#8884d8' }}
                />
                {s.name || s.dataKey}
              </Badge>
            ))}
            {data.series.length > 3 && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                +{data.series.length - 3}
              </Badge>
            )}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic">
            No series configured
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

export const ChartNode = memo(ChartNodeComponent);
export default ChartNode;
