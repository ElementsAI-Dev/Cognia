'use client';

/**
 * A2UI List Component
 * Renders a dynamic list of items with templates
 */

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { A2UIComponentProps, A2UIListComponent } from '@/types/artifact/a2ui';
import { useA2UIContext } from '../a2ui-context';
import { resolveArrayOrPath } from '@/lib/a2ui/data-model';
import { A2UIChildRenderer } from '../a2ui-renderer';

export function A2UIList({ component, onAction }: A2UIComponentProps<A2UIListComponent>) {
  const { dataModel } = useA2UIContext();

  // Resolve items - can be static array or data-bound
  const items = useMemo((): unknown[] => {
    if (!component.items) return [];
    if (Array.isArray(component.items)) {
      return component.items;
    }
    return resolveArrayOrPath(component.items, dataModel, []);
  }, [component.items, dataModel]);

  const handleItemClick = (item: unknown, index: number) => {
    if (component.itemClickAction) {
      onAction(component.itemClickAction, { item, index });
    }
  };

  // If children are provided, render them for each item
  if (component.children && component.children.length > 0) {
    return (
      <div
        className={cn(
          'flex flex-col',
          component.gap ? `gap-${component.gap}` : 'gap-2',
          component.className
        )}
        style={component.style as React.CSSProperties}
      >
        {items.map((item, index) => (
          <div
            key={typeof item === 'object' && item !== null && 'id' in item ? (item as { id: string }).id : index}
            className={cn(
              component.itemClickAction && 'cursor-pointer hover:bg-muted/50 rounded-md transition-colors'
            )}
            onClick={() => handleItemClick(item, index)}
          >
            <A2UIChildRenderer childIds={component.children!} />
          </div>
        ))}
      </div>
    );
  }

  // Simple list rendering
  return (
    <ul
      className={cn(
        'flex flex-col',
        component.gap ? `gap-${component.gap}` : 'gap-1',
        component.ordered && 'list-decimal list-inside',
        !component.ordered && 'list-disc list-inside',
        component.className
      )}
      style={component.style as React.CSSProperties}
    >
      {items.map((item, index) => (
        <li
          key={typeof item === 'object' && item !== null && 'id' in item ? (item as { id: string }).id : index}
          className={cn(
            component.itemClickAction && 'cursor-pointer hover:bg-muted/50 rounded px-2 py-1 transition-colors'
          )}
          onClick={() => handleItemClick(item, index)}
        >
          {typeof item === 'object' && item !== null
            ? (item as { label?: string; text?: string; name?: string }).label ||
              (item as { text?: string }).text ||
              (item as { name?: string }).name ||
              JSON.stringify(item)
            : String(item)}
        </li>
      ))}
    </ul>
  );
}
