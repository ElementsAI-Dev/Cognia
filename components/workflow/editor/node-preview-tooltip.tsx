'use client';

/**
 * NodePreviewTooltip - Shows a preview tooltip for workflow nodes
 */

import { type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import type { WorkflowNodeData } from '@/types/workflow/workflow-editor';
import { NODE_TYPE_COLORS } from '@/types/workflow/workflow-editor';

interface NodePreviewTooltipProps {
  data: WorkflowNodeData;
  children: ReactNode;
}

export function NodePreviewTooltip({ data, children }: NodePreviewTooltipProps) {
  const t = useTranslations('workflowEditor');
  const color = NODE_TYPE_COLORS[data.nodeType];

  return (
    <TooltipProvider delayDuration={500}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          side="right" 
          align="start"
          className="max-w-[280px] p-3"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="font-medium text-sm">{data.label}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5">
                {data.nodeType}
              </Badge>
            </div>
            
            {data.description && (
              <p className="text-xs text-muted-foreground">
                {data.description}
              </p>
            )}

            {data.executionStatus !== 'idle' && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Status:</span>
                <Badge 
                  variant={
                    data.executionStatus === 'completed' ? 'default' :
                    data.executionStatus === 'failed' ? 'destructive' :
                    data.executionStatus === 'running' ? 'secondary' :
                    'outline'
                  }
                  className="text-[10px]"
                >
                  {data.executionStatus}
                </Badge>
              </div>
            )}

            {data.executionTime !== undefined && data.executionTime > 0 && (
              <div className="text-xs text-muted-foreground">
                {t('execution')}: {(data.executionTime / 1000).toFixed(2)}s
              </div>
            )}

            {!data.isConfigured && data.nodeType !== 'start' && data.nodeType !== 'end' && (
              <div className="text-xs text-yellow-600 dark:text-yellow-500">
                ⚠ {t('notConfigured')}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default NodePreviewTooltip;
