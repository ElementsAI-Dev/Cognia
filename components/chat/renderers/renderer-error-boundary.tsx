'use client';

/**
 * RendererErrorBoundary - Error boundary for chat message renderers
 * Features:
 * - Catches rendering errors in complex renderers
 * - Shows fallback UI with error details
 * - Provides retry mechanism
 * - Prevents entire message from crashing
 */

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface RendererErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
  rendererName?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface RendererErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class RendererErrorBoundary extends Component<
  RendererErrorBoundaryProps,
  RendererErrorBoundaryState
> {
  constructor(props: RendererErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): RendererErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(`[${this.props.rendererName || 'Renderer'}] Error:`, error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className={cn(
            'flex flex-col items-center justify-center gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5 my-3',
            this.props.className
          )}
          role="alert"
        >
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium text-sm">
              {this.props.rendererName ? `${this.props.rendererName} ` : ''}Render Error
            </span>
          </div>
          {this.state.error && (
            <p className="text-xs text-muted-foreground text-center max-w-md">
              {this.state.error.message}
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleRetry}
            className="gap-2"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap a component with error boundary
 */
export function withRendererErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  rendererName?: string
): React.FC<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const WithErrorBoundary: React.FC<P> = (props) => (
    <RendererErrorBoundary rendererName={rendererName || displayName}>
      <WrappedComponent {...props} />
    </RendererErrorBoundary>
  );

  WithErrorBoundary.displayName = `withRendererErrorBoundary(${displayName})`;

  return WithErrorBoundary;
}

export default RendererErrorBoundary;
