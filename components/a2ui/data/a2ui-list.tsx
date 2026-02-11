'use client';

/**
 * A2UI List Component
 * Renders a dynamic list of items with templates
 */

import React, { useMemo, memo } from 'react';
import { cn } from '@/lib/utils';
import type { A2UIComponentProps, A2UIListComponent } from '@/types/artifact/a2ui';
import { useA2UIContext } from '../a2ui-context';
import { resolveArrayOrPath, getValueByPath } from '@/lib/a2ui/data-model';
import { A2UIChildRenderer } from '../a2ui-renderer';

/**
 * Get a unique key for a list item
 */
function getItemKey(item: unknown, index: number): string | number {
  if (typeof item === 'object' && item !== null && 'id' in item) {
    return (item as { id: string | number }).id;
  }
  return index;
}

/**
 * Extract display text from a list item
 */
function getItemDisplayText(item: unknown): string {
  if (typeof item === 'string') return item;
  if (typeof item === 'number' || typeof item === 'boolean') return String(item);
  if (typeof item === 'object' && item !== null) {
    const obj = item as Record<string, unknown>;
    return String(obj.label || obj.text || obj.name || obj.title || JSON.stringify(item));
  }
  return String(item);
}

export const A2UIList = memo(function A2UIList({ component, onAction }: A2UIComponentProps<A2UIListComponent>) {
  const { dataModel, renderChild } = useA2UIContext();

  const templateDataPath = component.template?.dataPath;
  const componentItems = component.items;

  // Resolve items from template dataPath, component.items, or empty
  const items = useMemo((): unknown[] => {
    // Template mode: resolve from dataPath
    if (templateDataPath) {
      const resolved = getValueByPath<unknown[]>(dataModel, templateDataPath);
      return Array.isArray(resolved) ? resolved : [];
    }
    // Direct items
    if (!componentItems) return [];
    if (Array.isArray(componentItems)) {
      return componentItems;
    }
    return resolveArrayOrPath(componentItems, dataModel, []);
  }, [componentItems, templateDataPath, dataModel]);

  const handleItemClick = (item: unknown, index: number) => {
    if (component.itemClickAction) {
      onAction(component.itemClickAction, { item, index });
    }
  };

  // Empty state
  if (items.length === 0 && component.emptyText) {
    return (
      <div
        className={cn('py-8 text-center text-sm text-muted-foreground', component.className)}
        style={component.style as React.CSSProperties}
      >
        {component.emptyText}
      </div>
    );
  }

  // Template mode: render the template component for each item
  if (component.template?.itemId) {
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
            key={getItemKey(item, index)}
            className={cn(
              component.itemClickAction && 'cursor-pointer hover:bg-muted/50 rounded-md transition-colors',
              component.dividers && index > 0 && 'border-t pt-2'
            )}
            onClick={() => handleItemClick(item, index)}
          >
            {renderChild(component.template!.itemId)}
          </div>
        ))}
      </div>
    );
  }

  // Children mode: render child components for each item
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
            key={getItemKey(item, index)}
            className={cn(
              component.itemClickAction && 'cursor-pointer hover:bg-muted/50 rounded-md transition-colors',
              component.dividers && index > 0 && 'border-t pt-2'
            )}
            onClick={() => handleItemClick(item, index)}
          >
            <A2UIChildRenderer childIds={component.children!} />
          </div>
        ))}
      </div>
    );
  }

  // Simple list rendering (default)
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
          key={getItemKey(item, index)}
          className={cn(
            'px-2 py-1 transition-colors',
            component.itemClickAction && 'cursor-pointer hover:bg-muted/50 rounded',
            component.dividers && index > 0 && 'border-t'
          )}
          onClick={() => handleItemClick(item, index)}
        >
          {getItemDisplayText(item)}
        </li>
      ))}
    </ul>
  );
});
