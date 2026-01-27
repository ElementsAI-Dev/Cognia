'use client';

/**
 * Server Status Icon Component
 * Displays server connection status with tooltip
 */

import { useTranslations } from 'next-intl';
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
  const t = useTranslations('mcpSettings');

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
        return t('statusConnected');
      case 'connecting':
        return t('statusConnecting');
      case 'reconnecting':
        return t('statusReconnecting');
      case 'error':
        return status.message || t('statusError');
      default:
        return t('statusDisconnected');
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
