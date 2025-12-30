'use client';

/**
 * DelayNode - Node for adding delays/waits in workflow
 */

import { memo, useMemo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { BaseNode } from './base-node';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Timer } from 'lucide-react';
import type { DelayNodeData } from '@/types/workflow-editor';

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

function DelayNodeComponent(props: NodeProps) {
  const data = props.data as DelayNodeData;

  const delayInfo = useMemo(() => {
    switch (data.delayType) {
      case 'fixed':
        return {
          icon: Timer,
          label: data.delayMs ? formatDuration(data.delayMs) : 'Not set',
          color: 'text-blue-500',
        };
      case 'until':
        return {
          icon: Calendar,
          label: data.untilTime
            ? new Date(data.untilTime).toLocaleString()
            : 'Not set',
          color: 'text-green-500',
        };
      case 'cron':
        return {
          icon: Clock,
          label: data.cronExpression || 'Not set',
          color: 'text-purple-500',
        };
      default:
        return {
          icon: Clock,
          label: 'Not configured',
          color: 'text-muted-foreground',
        };
    }
  }, [data.delayType, data.delayMs, data.untilTime, data.cronExpression]);

  const DelayIcon = delayInfo.icon;

  return (
    <BaseNode {...props} data={data}>
      <div className="space-y-2">
        {/* Delay type badge */}
        <Badge variant="secondary" className="text-xs capitalize">
          {data.delayType || 'fixed'}
        </Badge>

        {/* Delay value display */}
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded text-xs">
          <DelayIcon className={`h-3.5 w-3.5 ${delayInfo.color}`} />
          <span className="flex-1 truncate font-mono">
            {delayInfo.label}
          </span>
        </div>
      </div>
    </BaseNode>
  );
}

export const DelayNode = memo(DelayNodeComponent);
export default DelayNode;
