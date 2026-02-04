'use client';

/**
 * CollabConnectionStatus - Shows collaboration connection state
 */

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import type { ConnectionState } from '@/lib/canvas/collaboration/websocket-provider';

export interface CollabConnectionStatusProps {
  state: ConnectionState;
  participantCount?: number;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

const badgeSizes = {
  sm: 'text-xs px-1.5 py-0',
  md: 'text-xs px-2 py-0.5',
  lg: 'text-sm px-2.5 py-1',
};

export function CollabConnectionStatus({
  state,
  participantCount,
  className,
  showLabel = true,
  size = 'md',
}: CollabConnectionStatusProps) {
  const t = useTranslations('designer.collaboration');

  const getStatusConfig = () => {
    switch (state) {
      case 'connected':
        return {
          icon: Wifi,
          label: t('connected'),
          variant: 'default' as const,
          className: 'bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20',
          iconClassName: 'text-green-500',
        };
      case 'connecting':
        return {
          icon: Loader2,
          label: t('connecting'),
          variant: 'secondary' as const,
          className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
          iconClassName: 'text-yellow-500 animate-spin',
        };
      case 'reconnecting':
        return {
          icon: Loader2,
          label: t('reconnecting'),
          variant: 'secondary' as const,
          className: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
          iconClassName: 'text-orange-500 animate-spin',
        };
      case 'error':
        return {
          icon: AlertCircle,
          label: t('connectionError'),
          variant: 'destructive' as const,
          className: 'bg-red-500/10 text-red-600 border-red-500/20',
          iconClassName: 'text-red-500',
        };
      case 'disconnected':
      default:
        return {
          icon: WifiOff,
          label: t('disconnected'),
          variant: 'outline' as const,
          className: 'bg-muted text-muted-foreground',
          iconClassName: 'text-muted-foreground',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={config.variant}
            className={cn(
              'flex items-center gap-1.5 cursor-default',
              badgeSizes[size],
              config.className,
              className
            )}
          >
            <Icon className={cn(iconSizes[size], config.iconClassName)} />
            {showLabel && <span>{config.label}</span>}
            {state === 'connected' && participantCount !== undefined && participantCount > 0 && (
              <span className="ml-1 opacity-70">({participantCount})</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="flex flex-col gap-1">
            <span className="font-medium">{config.label}</span>
            {state === 'connected' && participantCount !== undefined && (
              <span className="text-xs text-muted-foreground">
                {t('participantsOnline', { count: participantCount })}
              </span>
            )}
            {state === 'error' && (
              <span className="text-xs text-red-400">
                {t('connectionErrorHint')}
              </span>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default CollabConnectionStatus;
