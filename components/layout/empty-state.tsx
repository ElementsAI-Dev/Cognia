'use client';

/**
 * EmptyState - Reusable empty state component with consistent styling
 */

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  icon?: LucideIcon;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: EmptyStateAction[];
  className?: string;
  iconClassName?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actions,
  className,
  iconClassName,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-16 px-6',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-muted/50',
          compact ? 'h-12 w-12 mb-3' : 'h-16 w-16 mb-4',
          'animate-in fade-in-0 zoom-in-95 duration-300'
        )}
      >
        <Icon
          className={cn(
            'text-muted-foreground/70',
            compact ? 'h-6 w-6' : 'h-8 w-8',
            iconClassName
          )}
        />
      </div>

      <h3
        className={cn(
          'font-semibold text-foreground',
          compact ? 'text-base' : 'text-lg',
          'animate-in fade-in-0 slide-in-from-bottom-2 duration-300'
        )}
        style={{ animationDelay: '50ms' }}
      >
        {title}
      </h3>

      {description && (
        <p
          className={cn(
            'text-muted-foreground max-w-sm',
            compact ? 'text-sm mt-1' : 'text-sm mt-2',
            'animate-in fade-in-0 slide-in-from-bottom-2 duration-300'
          )}
          style={{ animationDelay: '100ms' }}
        >
          {description}
        </p>
      )}

      {actions && actions.length > 0 && (
        <div
          className={cn(
            'flex flex-wrap gap-2 justify-center',
            compact ? 'mt-3' : 'mt-4',
            'animate-in fade-in-0 slide-in-from-bottom-2 duration-300'
          )}
          style={{ animationDelay: '150ms' }}
        >
          {actions.map((action, index) => {
            const ActionIcon = action.icon;
            return (
              <Button
                key={index}
                variant={action.variant || 'default'}
                size={compact ? 'sm' : 'default'}
                onClick={action.onClick}
                className="gap-2"
              >
                {ActionIcon && <ActionIcon className="h-4 w-4" />}
                {action.label}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
