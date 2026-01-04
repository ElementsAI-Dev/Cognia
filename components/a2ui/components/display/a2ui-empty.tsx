'use client';

/**
 * A2UI Empty State Component
 * Displays empty state with optional action
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Inbox, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { A2UIComponentProps, A2UIBaseComponent } from '@/types/a2ui';

export interface A2UIEmptyComponent extends A2UIBaseComponent {
  component: 'Empty';
  title?: string;
  message?: string;
  icon?: string;
  actionLabel?: string;
  action?: string;
}

export function A2UIEmpty({ component, onAction }: A2UIComponentProps<A2UIEmptyComponent>) {
  const handleAction = () => {
    if (component.action) {
      onAction(component.action, {});
    }
  };

  return (
    <div
      className={cn(
        'flex min-h-[200px] flex-col items-center justify-center gap-4 p-8 text-center',
        component.className
      )}
      style={component.style as React.CSSProperties}
    >
      <div className="rounded-full bg-muted p-4">
        <Inbox className="h-8 w-8 text-muted-foreground" />
      </div>
      
      <div className="space-y-2">
        {component.title && (
          <h3 className="text-lg font-semibold">{component.title}</h3>
        )}
        {component.message && (
          <p className="text-sm text-muted-foreground max-w-sm">
            {component.message}
          </p>
        )}
      </div>

      {component.action && component.actionLabel && (
        <Button onClick={handleAction} className="mt-2">
          <Plus className="mr-2 h-4 w-4" />
          {component.actionLabel}
        </Button>
      )}
    </div>
  );
}
