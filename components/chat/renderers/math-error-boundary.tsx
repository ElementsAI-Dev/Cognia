'use client';

/**
 * MathErrorBoundary - React Error Boundary for math rendering components
 * Catches rendering errors and displays a fallback UI without crashing the entire app
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, RefreshCw, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCopy } from '@/hooks/ui';

interface MathErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  latex?: string;
  onRetry?: () => void;
  className?: string;
}

interface MathErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component that catches errors in math rendering
 */
export class MathErrorBoundary extends React.Component<
  MathErrorBoundaryProps,
  MathErrorBoundaryState
> {
  constructor(props: MathErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): MathErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('MathErrorBoundary caught error:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <MathErrorFallback
          error={this.state.error}
          latex={this.props.latex}
          onRetry={this.handleRetry}
          className={this.props.className}
        />
      );
    }

    return this.props.children;
  }
}

interface MathErrorFallbackProps {
  error: Error | null;
  latex?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Fallback component displayed when math rendering fails
 */
export function MathErrorFallback({
  error,
  latex,
  onRetry,
  className,
}: MathErrorFallbackProps) {
  const t = useTranslations('renderer');
  const tToasts = useTranslations('toasts');
  const { copy, isCopying } = useCopy({ toastMessage: tToasts('latexCopied') });

  const handleCopy = async () => {
    if (latex) {
      await copy(latex);
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20',
        className
      )}
      role="alert"
      aria-label={t('mathRenderError')}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm font-medium">{t('mathRenderError')}</span>
        </div>
        <div className="flex items-center gap-1">
          {onRetry && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onRetry}
                  aria-label={t('mathErrorRetry')}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('mathErrorRetry')}</TooltipContent>
            </Tooltip>
          )}
          {latex && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleCopy}
                  disabled={isCopying}
                  aria-label={t('mathErrorCopySource')}
                >
                  {isCopying ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('mathErrorCopySource')}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      {error && (
        <p className="text-xs text-muted-foreground">{error.message}</p>
      )}
      {latex && (
        <pre className="mt-1 p-2 rounded bg-muted text-xs overflow-auto font-mono">
          <code>{latex}</code>
        </pre>
      )}
    </div>
  );
}

/**
 * HOC to wrap a math component with error boundary
 */
export function withMathErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  getLatex?: (props: P) => string | undefined
): React.FC<P & { onRenderError?: () => void }> {
  const WrappedComponent: React.FC<P & { onRenderError?: () => void }> = (props) => {
    const latex = getLatex?.(props);
    return (
      <MathErrorBoundary latex={latex} onRetry={props.onRenderError}>
        <Component {...props} />
      </MathErrorBoundary>
    );
  };

  WrappedComponent.displayName = `withMathErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

export default MathErrorBoundary;
