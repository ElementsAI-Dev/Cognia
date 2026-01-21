'use client';

/**
 * Server Status Icon Component
 * Displays server connection status with tooltip
 */

import { Check, Loader2, AlertCircle, Plug } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { McpServerStatus } from '@/types/mcp';

interface ServerStatusIconProps {
  status: McpServerStatus;
}

export function ServerStatusIcon({ status }: ServerStatusIconProps) {
  const getIcon = () => {
    switch (status.type) {
      case 'connected':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'connecting':
      case 'reconnecting':
        return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Plug className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTooltipText = () => {
    switch (status.type) {
      case 'connected':
        return 'Server connected and ready';
      case 'connecting':
        return 'Connecting to server...';
      case 'reconnecting':
        return 'Reconnecting to server...';
      case 'error':
        return status.message || 'Connection error';
      default:
        return 'Server disconnected';
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help">{getIcon()}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {getTooltipText()}
      </TooltipContent>
    </Tooltip>
  );
}
