'use client';

/**
 * A2UI Badge Component
 * Maps to shadcn/ui Badge
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { A2UIComponentProps, A2UIBadgeComponent } from '@/types/a2ui';
import { useA2UIContext } from '../a2ui-context';

const variantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  default: 'default',
  primary: 'default',
  secondary: 'secondary',
  destructive: 'destructive',
  outline: 'outline',
  success: 'default',
  warning: 'secondary',
  info: 'secondary',
};

const colorStyles: Record<string, string> = {
  success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
};

export function A2UIBadge({ component }: A2UIComponentProps<A2UIBadgeComponent>) {
  const { resolveString } = useA2UIContext();

  const text = resolveString(component.text, '');
  const variant = component.variant || 'default';
  const badgeVariant = variantMap[variant] || 'default';
  const colorStyle = colorStyles[variant] || '';

  return (
    <Badge
      variant={badgeVariant}
      className={cn(colorStyle, component.className)}
      style={component.style as React.CSSProperties}
    >
      {text}
    </Badge>
  );
}
