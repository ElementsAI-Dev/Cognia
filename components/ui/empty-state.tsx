'use client';

import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
}

export interface EmptyStateProps {
  icon?: LucideIcon | React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  actions?: EmptyStateAction[];
  className?: string;
  compact?: boolean;
}

export function EmptyState({ icon: Icon, title, description, action, actions, className, compact }: EmptyStateProps) {
  const renderIcon = () => {
    if (!Icon) return null;
    if (typeof Icon === 'function') {
      const IconComponent = Icon as LucideIcon;
      return <IconComponent className={compact ? 'h-8 w-8' : 'h-12 w-12'} />;
    }
    return Icon;
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-6 px-3' : 'py-12 px-4',
        className
      )}
    >
      {Icon && (
        <div className="mb-4 text-muted-foreground">
          {renderIcon()}
        </div>
      )}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
      {actions && actions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {actions.map((act, idx) => {
            const ActionIcon = act.icon;
            return (
              <Button
                key={idx}
                variant={act.variant ?? 'default'}
                onClick={act.onClick}
              >
                {ActionIcon && <ActionIcon className="h-4 w-4 mr-2" />}
                {act.label}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
