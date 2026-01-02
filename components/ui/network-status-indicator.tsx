'use client';

/**
 * NetworkStatusIndicator - Display network connectivity status
 */

import { Wifi, WifiOff, SignalLow } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useNetworkStatus } from '@/hooks/network';
import { cn } from '@/lib/utils';

interface NetworkStatusIndicatorProps {
  showLabel?: boolean;
  className?: string;
}

export function NetworkStatusIndicator({
  showLabel = false,
  className,
}: NetworkStatusIndicatorProps) {
  const { isOnline, isSlowConnection, effectiveType, rtt } = useNetworkStatus();

  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        label: 'Offline',
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
        description: 'No internet connection',
      };
    }

    if (isSlowConnection) {
      return {
        icon: SignalLow,
        label: 'Slow',
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
        description: `Slow connection (${effectiveType || 'unknown'})`,
      };
    }

    return {
      icon: Wifi,
      label: 'Online',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      description: effectiveType
        ? `Connected (${effectiveType}${rtt ? `, ${rtt}ms` : ''})`
        : 'Connected',
    };
  };

  const status = getStatusInfo();
  const Icon = status.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-full transition-colors',
            status.bgColor,
            className
          )}
        >
          <Icon className={cn('h-3.5 w-3.5', status.color)} />
          {showLabel && (
            <span className={cn('text-xs font-medium', status.color)}>
              {status.label}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{status.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Offline Banner - Shows when user is offline
 */
export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground py-2 px-4 text-center text-sm">
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span>You are offline. Some features may not be available.</span>
      </div>
    </div>
  );
}

export default NetworkStatusIndicator;
