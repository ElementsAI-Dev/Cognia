'use client';

/**
 * EmptyState - Reusable empty state component with consistent styling
 */

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  icon?: LucideIcon;
}

interface EmptyStateProps {
  icon?: LucideIcon | ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  actions?: EmptyStateAction[];
  className?: string;
  iconClassName?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  actions,
  className,
  iconClassName,
  compact = false,
}: EmptyStateProps) {
  const renderIcon = () => {
    if (!Icon) return null;

    // If Icon is a function (LucideIcon component), render it with className
    if (typeof Icon === 'function') {
      const IconComponent = Icon as LucideIcon;
      return (
        <IconComponent
          className={cn(compact ? 'h-6 w-6' : 'h-8 w-8', iconClassName)}
        />
      );
    }

    // If Icon is already a ReactNode (JSX element), return as-is
    return Icon;
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-16 px-6',
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-muted/50 text-muted-foreground/70',
            compact ? 'h-12 w-12 mb-3' : 'h-16 w-16 mb-4',
            'animate-in fade-in-0 zoom-in-95 duration-300'
          )}
        >
          {renderIcon()}
        </div>
      )}

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

      {action && (
        <div
          className={cn(
            'animate-in fade-in-0 slide-in-from-bottom-2 duration-300',
            compact ? 'mt-3' : 'mt-4'
          )}
          style={{ animationDelay: '125ms' }}
        >
          {action}
        </div>
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
