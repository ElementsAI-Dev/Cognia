'use client';

/**
 * A2UI Surface Container
 * Renders an A2UI surface with its component tree
 */

import React, { useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type {
  A2UIComponent,
  A2UISurfaceProps,
  A2UIUserAction,
  A2UIDataModelChange,
} from '@/types/a2ui';
import { useA2UIStore } from '@/stores/a2ui-store';
import { globalEventEmitter } from '@/lib/a2ui/events';
import { A2UIProvider } from './a2ui-context';
import { A2UIRenderer } from './a2ui-renderer';
import { Loader2 } from 'lucide-react';

/**
 * Surface container styles by type
 */
const surfaceStyles = {
  inline: 'w-full',
  dialog: 'fixed inset-0 z-50 flex items-center justify-center bg-black/50',
  panel: 'w-full max-w-md border-l bg-background',
  fullscreen: 'fixed inset-0 z-50 bg-background',
};

/**
 * Surface content wrapper styles
 */
const contentStyles = {
  inline: '',
  dialog: 'bg-background rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] overflow-auto p-4',
  panel: 'h-full overflow-auto p-4',
  fullscreen: 'h-full overflow-auto p-4',
};

export interface A2UISurfaceContainerProps extends A2UISurfaceProps {
  showLoading?: boolean;
  loadingText?: string;
}

/**
 * A2UI Surface Container Component
 */
export function A2UISurface({
  surfaceId,
  className,
  onAction,
  onDataChange,
  showLoading = true,
  loadingText = 'Loading...',
}: A2UISurfaceContainerProps) {
  const surface = useA2UIStore((state) => state.surfaces[surfaceId]);
  const isLoading = useA2UIStore((state) => state.loadingSurfaces.has(surfaceId));
  const error = useA2UIStore((state) => state.errors[surfaceId]);

  // Subscribe to events
  useEffect(() => {
    if (!onAction && !onDataChange) return;

    const unsubscribeAction = onAction
      ? globalEventEmitter.onAction((action: A2UIUserAction) => {
          if (action.surfaceId === surfaceId) {
            onAction(action);
          }
        })
      : undefined;

    const unsubscribeDataChange = onDataChange
      ? globalEventEmitter.onDataChange((change: A2UIDataModelChange) => {
          if (change.surfaceId === surfaceId) {
            onDataChange(change);
          }
        })
      : undefined;

    return () => {
      unsubscribeAction?.();
      unsubscribeDataChange?.();
    };
  }, [surfaceId, onAction, onDataChange]);

  // Render component callback for provider
  const renderComponent = useCallback(
    (component: A2UIComponent) => {
      return <A2UIRenderer key={component.id} component={component} />;
    },
    []
  );

  // Surface not found
  if (!surface) {
    return null;
  }

  // Loading state
  if (isLoading && showLoading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        {loadingText && (
          <span className="ml-2 text-sm text-muted-foreground">{loadingText}</span>
        )}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn('p-4 text-destructive', className)}>
        <p className="font-medium">Error loading surface</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  // Not ready yet
  if (!surface.ready) {
    return (
      <div className={cn('flex items-center justify-center p-4', className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Get root component
  const rootComponent = surface.components[surface.rootId];
  if (!rootComponent) {
    return (
      <div className={cn('p-4 text-muted-foreground', className)}>
        <p className="text-sm">No content to display</p>
      </div>
    );
  }

  const surfaceType = surface.type;

  return (
    <div className={cn(surfaceStyles[surfaceType], className)}>
      <div className={contentStyles[surfaceType]}>
        <A2UIProvider
          surfaceId={surfaceId}
          catalogId={surface.catalogId}
          renderComponent={renderComponent}
        >
          <A2UIRenderer component={rootComponent} />
        </A2UIProvider>
      </div>
    </div>
  );
}

/**
 * Inline A2UI surface for embedding in messages
 */
export function A2UIInlineSurface({
  surfaceId,
  className,
  onAction,
  onDataChange,
}: A2UISurfaceProps) {
  return (
    <A2UISurface
      surfaceId={surfaceId}
      className={cn('rounded-lg border bg-card p-3', className)}
      onAction={onAction}
      onDataChange={onDataChange}
      showLoading={false}
    />
  );
}

/**
 * Dialog A2UI surface
 */
export function A2UIDialogSurface({
  surfaceId,
  className,
  onAction,
  onDataChange,
}: A2UISurfaceProps) {
  const deleteSurface = useA2UIStore((state) => state.deleteSurface);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        deleteSurface(surfaceId);
      }
    },
    [surfaceId, deleteSurface]
  );

  return (
    <div
      className={cn(surfaceStyles.dialog, className)}
      onClick={handleBackdropClick}
    >
      <div className={contentStyles.dialog}>
        <A2UISurface
          surfaceId={surfaceId}
          onAction={onAction}
          onDataChange={onDataChange}
        />
      </div>
    </div>
  );
}
