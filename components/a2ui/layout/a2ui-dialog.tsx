'use client';

/**
 * A2UI Dialog Component
 * Modal dialog with content and actions
 */

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { A2UIComponentProps, A2UIDialogComponent } from '@/types/artifact/a2ui';
import { useA2UIContext } from '../a2ui-context';
import { A2UIChildRenderer } from '../a2ui-renderer';

export function A2UIDialog({
  component,
  onAction,
  onDataChange,
}: A2UIComponentProps<A2UIDialogComponent>) {
  const { resolveString, resolveBoolean, getBindingPath } = useA2UIContext();

  const open = resolveBoolean(component.open, false);
  const title = component.title ? resolveString(component.title, '') : '';
  const description = component.description
    ? resolveString(component.description, '')
    : '';
  const bindingPath = getBindingPath(component.open);

  const handleOpenChange = (newOpen: boolean) => {
    if (bindingPath) {
      onDataChange(bindingPath, newOpen);
    }
    if (!newOpen && component.closeAction) {
      onAction(component.closeAction);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(component.className)}
        style={component.style as React.CSSProperties}
      >
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}

        <div className="py-4">
          {component.children && component.children.length > 0 && (
            <A2UIChildRenderer childIds={component.children} />
          )}
        </div>

        {component.actions && component.actions.length > 0 && (
          <DialogFooter>
            <A2UIChildRenderer childIds={component.actions} />
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
