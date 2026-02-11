'use client';

/**
 * A2UI Fallback Component
 * Renders when component type is unknown or not registered
 */

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';
import type { A2UIComponentProps, A2UIBaseComponent } from '@/types/artifact/a2ui';

export const A2UIFallback = memo(function A2UIFallback({ component }: A2UIComponentProps<A2UIBaseComponent>) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border border-dashed border-amber-300 bg-amber-50 p-2 text-sm text-amber-700 dark:border-amber-700 dark:bg-amber-950/20 dark:text-amber-400 shrink-0',
        component.className
      )}
      style={component.style as React.CSSProperties}
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>
        Unknown component: <code className="font-mono">{component.component}</code>
      </span>
    </div>
  );
});
