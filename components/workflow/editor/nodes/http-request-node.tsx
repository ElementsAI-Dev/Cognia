'use client';

/**
 * HttpRequestNode - Outbound HTTP request node
 */

import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { BaseNode } from './base-node';
import type { HttpRequestNodeData } from '@/types/workflow/workflow-editor';

function HttpRequestNodeComponent(props: NodeProps) {
  const data = props.data as HttpRequestNodeData;
  const method = data.method || 'GET';
  const url = data.url || '';

  const methodColors: Record<string, string> = {
    GET: 'bg-green-500/20 text-green-600',
    POST: 'bg-blue-500/20 text-blue-600',
    PUT: 'bg-yellow-500/20 text-yellow-600',
    DELETE: 'bg-red-500/20 text-red-600',
    PATCH: 'bg-purple-500/20 text-purple-600',
  };

  return (
    <BaseNode {...props} data={data}>
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className={`text-[10px] font-mono px-1 py-0 ${methodColors[method] || ''}`}>
            {method}
          </Badge>
          {url && (
            <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[150px]">
              {url}
            </span>
          )}
        </div>
      </div>
    </BaseNode>
  );
}

export const HttpRequestNode = memo(HttpRequestNodeComponent);
export default HttpRequestNode;
