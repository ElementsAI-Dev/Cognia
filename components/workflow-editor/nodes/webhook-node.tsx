'use client';

/**
 * WebhookNode - Node for HTTP requests
 */

import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { BaseNode } from './base-node';
import { Badge } from '@/components/ui/badge';
import { Globe, ArrowRight, Lock, Unlock } from 'lucide-react';
import type { WebhookNodeData } from '@/types/workflow-editor';

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  POST: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  PUT: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

function WebhookNodeComponent(props: NodeProps) {
  const data = props.data as WebhookNodeData;

  const isHttps = data.webhookUrl?.startsWith('https://');
  const displayUrl = data.webhookUrl
    ? data.webhookUrl.replace(/^https?:\/\//, '').slice(0, 30)
    : null;

  return (
    <BaseNode {...props} data={data}>
      <div className="space-y-2">
        {/* Method badge */}
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={`text-xs font-mono ${METHOD_COLORS[data.method] || ''}`}
          >
            {data.method}
          </Badge>
          {data.webhookUrl && (
            isHttps ? (
              <Lock className="h-3 w-3 text-green-500" />
            ) : (
              <Unlock className="h-3 w-3 text-yellow-500" />
            )
          )}
        </div>

        {/* URL display */}
        {displayUrl ? (
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded text-xs">
            <Globe className="h-3.5 w-3.5 text-orange-500 shrink-0" />
            <span className="flex-1 truncate font-mono text-muted-foreground">
              {displayUrl}
              {(data.webhookUrl?.length || 0) > 30 && '...'}
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic">
            No URL configured
          </div>
        )}

        {/* Headers count */}
        {Object.keys(data.headers || {}).length > 0 && (
          <Badge variant="outline" className="text-xs">
            {Object.keys(data.headers).length} headers
          </Badge>
        )}
      </div>
    </BaseNode>
  );
}

export const WebhookNode = memo(WebhookNodeComponent);
export default WebhookNode;
