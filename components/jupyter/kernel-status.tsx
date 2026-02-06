'use client';

/**
 * KernelStatus - Displays Jupyter kernel status and controls
 */

import { useTranslations } from 'next-intl';
import { Circle, Square, RefreshCw, Loader2, Zap, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { KernelInfo, KernelStatus as KernelStatusType } from '@/types/system/jupyter';

interface KernelStatusProps {
  kernel: KernelInfo | null;
  isConnecting?: boolean;
  onRestart?: () => void;
  onInterrupt?: () => void;
  onConnect?: () => void;
  className?: string;
}

const statusConfig: Record<
  KernelStatusType,
  { color: string; icon: React.ReactNode; labelKey: string }
> = {
  idle: {
    color: 'bg-green-500',
    icon: <Circle className="h-2 w-2 fill-current" />,
    labelKey: 'status.idle',
  },
  busy: {
    color: 'bg-yellow-500',
    icon: <Loader2 className="h-2 w-2 animate-spin" />,
    labelKey: 'status.busy',
  },
  starting: {
    color: 'bg-blue-500',
    icon: <Loader2 className="h-2 w-2 animate-spin" />,
    labelKey: 'status.starting',
  },
  dead: {
    color: 'bg-red-500',
    icon: <AlertCircle className="h-2 w-2" />,
    labelKey: 'status.dead',
  },
  restarting: {
    color: 'bg-orange-500',
    icon: <RefreshCw className="h-2 w-2 animate-spin" />,
    labelKey: 'status.restarting',
  },
  interrupting: {
    color: 'bg-orange-500',
    icon: <Square className="h-2 w-2" />,
    labelKey: 'status.interrupting',
  },
  stopping: {
    color: 'bg-orange-500',
    icon: <Square className="h-2 w-2" />,
    labelKey: 'status.stopping',
  },
  configuring: {
    color: 'bg-blue-500',
    icon: <Loader2 className="h-2 w-2 animate-spin" />,
    labelKey: 'status.configuring',
  },
  installing: {
    color: 'bg-blue-500',
    icon: <Loader2 className="h-2 w-2 animate-spin" />,
    labelKey: 'status.installing',
  },
  error: {
    color: 'bg-red-500',
    icon: <AlertCircle className="h-2 w-2" />,
    labelKey: 'status.error',
  },
};

export function KernelStatus({
  kernel,
  isConnecting,
  onRestart,
  onInterrupt,
  onConnect,
  className,
}: KernelStatusProps) {
  const t = useTranslations('jupyter');

  if (!kernel && !isConnecting) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Badge variant="outline" className="text-xs gap-1.5">
          <Circle className="h-2 w-2 text-muted-foreground" />
          <span>{t('noKernel')}</span>
        </Badge>
        {onConnect && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onConnect}>
                  <Zap className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('connectKernel')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Badge variant="outline" className="text-xs gap-1.5">
          <Loader2 className="h-2 w-2 animate-spin text-blue-500" />
          <span>{t('connecting')}</span>
        </Badge>
      </div>
    );
  }

  const status = kernel?.status || 'idle';
  const config = statusConfig[status] || statusConfig.idle;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Badge variant="outline" className="text-xs gap-1.5">
        <span className={cn('rounded-full', config.color)}>{config.icon}</span>
        <span>
          {kernel?.name || t('pythonDefault')} · {t(config.labelKey)}
        </span>
        {kernel?.executionCount !== undefined && kernel.executionCount > 0 && (
          <span className="text-muted-foreground">[{kernel.executionCount}]</span>
        )}
      </Badge>

      <TooltipProvider>
        <div className="flex items-center">
          {status === 'busy' && onInterrupt && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onInterrupt}>
                  <Square className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('interrupt')}</TooltipContent>
            </Tooltip>
          )}

          {onRestart && status !== 'restarting' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRestart}>
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('restart')}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
}

export default KernelStatus;
