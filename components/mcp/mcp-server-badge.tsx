'use client';

/**
 * MCPServerBadge - Displays MCP server identity with status indicator
 */

import { Server, Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { McpServerStatus } from '@/types/mcp';

export interface MCPServerBadgeProps {
  serverId: string;
  serverName?: string;
  status?: McpServerStatus;
  showStatus?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  disconnected: { icon: WifiOff, color: 'text-muted-foreground', bgColor: 'bg-muted' },
  connecting: { icon: Loader2, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  connected: { icon: Wifi, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  error: { icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  reconnecting: { icon: Loader2, color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
};

const sizeClasses = {
  sm: 'text-[10px] px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2 py-1 gap-1.5',
  lg: 'text-sm px-2.5 py-1.5 gap-2',
};

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
};

export function MCPServerBadge({
  serverId,
  serverName,
  status,
  showStatus = true,
  size = 'md',
  className,
}: MCPServerBadgeProps) {
  const statusType = status?.type ?? 'disconnected';
  const config = statusConfig[statusType] || statusConfig.disconnected;
  const StatusIcon = config.icon;
  const isAnimated = statusType === 'connecting' || statusType === 'reconnecting';

  const displayName = serverName || serverId;

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center font-mono transition-colors',
        sizeClasses[size],
        showStatus && config.bgColor,
        className
      )}
    >
      <Server className={cn(iconSizes[size], 'shrink-0')} />
      <span className="truncate max-w-[120px]">{displayName}</span>
      {showStatus && (
        <StatusIcon
          className={cn(
            iconSizes[size],
            config.color,
            isAnimated && 'animate-spin'
          )}
        />
      )}
    </Badge>
  );

  if (!showStatus || !status) {
    return badge;
  }

  const statusText = status.type === 'error' && 'message' in status
    ? `Error: ${status.message}`
    : status.type.charAt(0).toUpperCase() + status.type.slice(1);

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent>
        <div className="text-xs">
          <p className="font-medium">{displayName}</p>
          <p className={cn('mt-0.5', config.color)}>{statusText}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
