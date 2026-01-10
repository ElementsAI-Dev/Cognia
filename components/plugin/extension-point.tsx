'use client';

/**
 * Plugin Extension Point Component
 * 
 * Renders plugin extensions at specific extension points in the UI.
 */

import React, { useMemo, Suspense } from 'react';
import { getExtensionsForPoint } from '@/lib/plugin/api/extension-api';
import type { ExtensionPoint, ExtensionRegistration, ExtensionProps } from '@/types/plugin-extended';
import { cn } from '@/lib/utils';

interface PluginExtensionPointProps {
  /** The extension point to render */
  point: ExtensionPoint;
  
  /** Optional className for the container */
  className?: string;
  
  /** Optional wrapper element type */
  as?: React.ElementType;
  
  /** Whether to render extensions inline */
  inline?: boolean;
  
  /** Fallback content when no extensions */
  fallback?: React.ReactNode;
  
  /** Loading fallback for suspense */
  loadingFallback?: React.ReactNode;
  
  /** Additional props to pass to extensions */
  extensionProps?: Record<string, unknown>;
}

/**
 * Error boundary for individual extensions
 */
class ExtensionErrorBoundary extends React.Component<
  { children: React.ReactNode; pluginId: string; extensionId: string },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; pluginId: string; extensionId: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      `[PluginExtension] Error in extension ${this.props.extensionId} from plugin ${this.props.pluginId}:`,
      error,
      errorInfo
    );
  }

  render() {
    if (this.state.hasError) {
      // Render nothing on error - don't break the UI
      return null;
    }
    return this.props.children;
  }
}

/**
 * Renders a single extension component
 */
function ExtensionRenderer({
  registration,
  extensionProps,
}: {
  registration: ExtensionRegistration;
  extensionProps?: Record<string, unknown>;
}) {
  const Component = registration.component;
  
  const props: ExtensionProps = {
    pluginId: registration.pluginId,
    extensionId: registration.id,
    ...extensionProps,
  };

  return (
    <ExtensionErrorBoundary
      pluginId={registration.pluginId}
      extensionId={registration.id}
    >
      <Suspense fallback={null}>
        <Component {...props} />
      </Suspense>
    </ExtensionErrorBoundary>
  );
}

/**
 * Plugin Extension Point
 * 
 * Use this component to create extension points in the UI where plugins
 * can inject their own components.
 * 
 * @example
 * ```tsx
 * // In your layout or component
 * <PluginExtensionPoint point="sidebar.left.bottom" />
 * 
 * // With custom styling
 * <PluginExtensionPoint 
 *   point="toolbar.right" 
 *   className="flex items-center gap-2"
 *   inline
 * />
 * ```
 */
export function PluginExtensionPoint({
  point,
  className,
  as: Component = 'div',
  inline = false,
  fallback,
  loadingFallback,
  extensionProps,
}: PluginExtensionPointProps) {
  const extensions = useMemo(() => getExtensionsForPoint(point), [point]);

  if (extensions.length === 0) {
    return fallback ? <>{fallback}</> : null;
  }

  const Wrapper = Component as React.ElementType;

  return (
    <Wrapper
      className={cn(
        'plugin-extension-point',
        `plugin-extension-point--${point.replace(/\./g, '-')}`,
        inline ? 'inline-flex items-center' : 'flex flex-col',
        className
      )}
      data-extension-point={point}
    >
      <Suspense fallback={loadingFallback || null}>
        {extensions.map((registration) => (
          <ExtensionRenderer
            key={registration.id}
            registration={registration}
            extensionProps={extensionProps}
          />
        ))}
      </Suspense>
    </Wrapper>
  );
}

/**
 * Hook to check if an extension point has any extensions
 */
export function useHasExtensions(point: ExtensionPoint): boolean {
  return useMemo(() => getExtensionsForPoint(point).length > 0, [point]);
}

/**
 * Hook to get extensions for a point
 */
export function useExtensions(point: ExtensionPoint): ExtensionRegistration[] {
  return useMemo(() => getExtensionsForPoint(point), [point]);
}

export default PluginExtensionPoint;
