'use client';

/**
 * SandboxErrorBoundary - Error boundary for Sandpack sandbox
 * Catches code execution errors and provides recovery options
 */

import React, { Component, type ReactNode } from 'react';
import { AlertCircle, RefreshCw, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorInfo {
  componentStack: string;
}

interface SandboxErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  fallbackCode?: string;
  className?: string;
}

interface SandboxErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

export class SandboxErrorBoundary extends Component<
  SandboxErrorBoundaryProps,
  SandboxErrorBoundaryState
> {
  constructor(props: SandboxErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<SandboxErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);

    // Log error for debugging
    console.error('[SandboxErrorBoundary] Caught error:', error);
    console.error('[SandboxErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    this.props.onReset?.();
  };

  handleToggleDetails = (): void => {
    this.setState((state) => ({ showDetails: !state.showDetails }));
  };

  handleCopyError = async (): Promise<void> => {
    const { error, errorInfo } = this.state;
    const errorText = `Error: ${error?.message}\n\nStack:\n${error?.stack}\n\nComponent Stack:\n${errorInfo?.componentStack}`;

    try {
      await navigator.clipboard.writeText(errorText);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (err) {
      console.error('Failed to copy error:', err);
    }
  };

  // Parse error message for user-friendly display
  parseErrorMessage(error: Error): { title: string; description: string; suggestion: string } {
    const message = error.message || 'Unknown error';

    // Common error patterns
    if (message.includes('is not defined')) {
      const match = message.match(/(\w+) is not defined/);
      return {
        title: 'Reference Error',
        description: `Variable or function "${match?.[1] || 'unknown'}" is not defined`,
        suggestion: 'Check if all imports are correct and variables are declared before use.',
      };
    }

    if (message.includes('Cannot read properties of')) {
      return {
        title: 'Type Error',
        description: 'Attempted to access a property on undefined or null',
        suggestion: 'Use optional chaining (?.) or check if the object exists before accessing properties.',
      };
    }

    if (message.includes('Unexpected token')) {
      return {
        title: 'Syntax Error',
        description: 'There is a syntax error in your code',
        suggestion: 'Check for missing brackets, parentheses, or incorrect JSX syntax.',
      };
    }

    if (message.includes('Module not found') || message.includes('Cannot find module')) {
      const match = message.match(/['"]([^'"]+)['"]/);
      return {
        title: 'Import Error',
        description: `Module "${match?.[1] || 'unknown'}" could not be found`,
        suggestion: 'Check the import path or add the package to dependencies.',
      };
    }

    if (message.includes('Maximum update depth exceeded')) {
      return {
        title: 'Infinite Loop',
        description: 'Component is re-rendering infinitely',
        suggestion: 'Check useEffect dependencies and avoid setting state during render.',
      };
    }

    if (message.includes('Invalid hook call')) {
      return {
        title: 'Hook Error',
        description: 'Hooks can only be called inside function components',
        suggestion: 'Ensure hooks are at the top level of your component and not inside conditions or loops.',
      };
    }

    return {
      title: 'Runtime Error',
      description: message,
      suggestion: 'Check the error details below for more information.',
    };
  }

  render(): ReactNode {
    const { hasError, error, errorInfo, showDetails, copied } = this.state;
    const { children, className } = this.props;

    if (hasError && error) {
      const { title, description, suggestion } = this.parseErrorMessage(error);

      return (
        <div className={cn('h-full w-full flex items-center justify-center p-4', className)}>
          <div className="max-w-md w-full bg-background border rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3 flex items-center gap-3">
              <div className="p-2 rounded-full bg-destructive/20">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-destructive">{title}</h3>
                <p className="text-xs text-muted-foreground">Code execution error</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              <div>
                <p className="text-sm text-foreground">{description}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  💡 {suggestion}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={this.handleReset}
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={this.handleToggleDetails}
                >
                  {showDetails ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Error Details */}
              {showDetails && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Error Details
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={this.handleCopyError}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                  <div className="bg-muted rounded-md p-3 max-h-40 overflow-auto">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words font-mono">
                      {error.stack || error.message}
                    </pre>
                  </div>
                  {errorInfo?.componentStack && (
                    <div className="bg-muted rounded-md p-3 max-h-32 overflow-auto">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Component Stack:
                      </p>
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words font-mono">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

/**
 * Hook to create an error boundary reset trigger
 */
export function useErrorBoundaryReset() {
  const [resetKey, setResetKey] = React.useState(0);

  const reset = React.useCallback(() => {
    setResetKey((k) => k + 1);
  }, []);

  return { resetKey, reset };
}

/**
 * Console error interceptor for Sandpack
 * Captures console.error calls and formats them
 */
export interface ConsoleError {
  id: string;
  message: string;
  timestamp: Date;
  type: 'error' | 'warn' | 'info';
}

export function useConsoleErrorInterceptor() {
  const [errors, setErrors] = React.useState<ConsoleError[]>([]);
  const originalConsoleError = React.useRef<typeof console.error | null>(null);

  React.useEffect(() => {
    originalConsoleError.current = console.error;

    console.error = (...args: unknown[]) => {
      // Call original
      originalConsoleError.current?.(...args);

      // Capture error
      const message = args
        .map((arg) =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        )
        .join(' ');

      setErrors((prev) => [
        ...prev.slice(-49), // Keep last 50 errors
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          message,
          timestamp: new Date(),
          type: 'error',
        },
      ]);
    };

    return () => {
      if (originalConsoleError.current) {
        console.error = originalConsoleError.current;
      }
    };
  }, []);

  const clearErrors = React.useCallback(() => {
    setErrors([]);
  }, []);

  return { errors, clearErrors };
}

export default SandboxErrorBoundary;
