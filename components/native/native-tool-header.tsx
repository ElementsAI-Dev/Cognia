'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NativeToolHeaderProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  refreshLabel?: string;
  className?: string;
}

export function NativeToolHeader({
  icon: Icon,
  title,
  description,
  badge,
  actions,
  onRefresh,
  isRefreshing,
  refreshLabel = 'Refresh',
  className,
}: NativeToolHeaderProps) {
  return (
    <header
      className={cn(
        'flex items-center justify-between gap-3 p-3 sm:p-4 border-b',
        'bg-background/50 backdrop-blur-sm',
        'shrink-0',
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 text-primary shrink-0">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold truncate">{title}</h2>
            {badge &&
              (typeof badge === 'string' ? (
                <Badge variant="secondary" className="text-xs shrink-0">
                  {badge}
                </Badge>
              ) : (
                badge
              ))}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {actions}
        {onRefresh && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={onRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{refreshLabel}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </header>
  );
}

export default NativeToolHeader;
