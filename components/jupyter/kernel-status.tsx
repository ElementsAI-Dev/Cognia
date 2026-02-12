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
import { KERNEL_STATUS_CONFIG } from '@/lib/jupyter/constants';
import type { KernelInfo, KernelStatus as KernelStatusType } from '@/types/jupyter';

interface KernelStatusProps {
  kernel: KernelInfo | null;
  isConnecting?: boolean;
  onRestart?: () => void;
  onInterrupt?: () => void;
  onConnect?: () => void;
  className?: string;
}

/** Status icon mapping (JSX elements must stay in the component) */
const statusIcons: Record<KernelStatusType, React.ReactNode> = {
  idle: <Circle className="h-2 w-2 fill-current" />,
  busy: <Loader2 className="h-2 w-2 animate-spin" />,
  starting: <Loader2 className="h-2 w-2 animate-spin" />,
  dead: <AlertCircle className="h-2 w-2" />,
  restarting: <RefreshCw className="h-2 w-2 animate-spin" />,
  interrupting: <Square className="h-2 w-2" />,
  stopping: <Square className="h-2 w-2" />,
  configuring: <Loader2 className="h-2 w-2 animate-spin" />,
  installing: <Loader2 className="h-2 w-2 animate-spin" />,
  error: <AlertCircle className="h-2 w-2" />,
};

/** Combined status config with icons */
const statusConfig = Object.fromEntries(
  (Object.keys(KERNEL_STATUS_CONFIG) as KernelStatusType[]).map((key) => [
    key,
    { ...KERNEL_STATUS_CONFIG[key], icon: statusIcons[key] },
  ])
) as Record<KernelStatusType, { color: string; icon: React.ReactNode; labelKey: string }>;

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
