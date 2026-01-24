'use client';

/**
 * ErrorBoundaryProvider - Catches and handles React component errors gracefully
 * Provides error recovery UI and error reporting functionality
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export const navigation = {
  navigateTo(url: string): void {
    window.location.assign(url);
  },
};

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

export interface ErrorBoundaryProviderProps {
  children: ReactNode;
  /** Custom fallback UI component */
  fallback?: ReactNode;
  /** Maximum number of retry attempts before showing permanent error */
  maxRetries?: number;
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  /** Callback when user clicks retry */
  onRetry?: () => void;
  /** Whether to show error details in production */
  showDetails?: boolean;
}

/**
 * Default error fallback UI
 */
function DefaultErrorFallback({
  error,
  errorInfo,
  onRetry,
  onReset,
  retryCount,
  showDetails = false,
}: {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onRetry: () => void;
  onReset: () => void;
  retryCount: number;
  showDetails: boolean;
}) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <CardTitle>Something went wrong</CardTitle>
          </div>
          <CardDescription>
            {retryCount > 0
              ? `An error occurred after ${retryCount} attempt${retryCount > 1 ? 's' : ''}. Please try again or reset the application.`
              : 'An unexpected error occurred. You can try retrying or reset the application.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-sm text-muted-foreground mb-4">
              <p className="font-medium">{error.name}</p>
              <p className="wrap-break-word">{error.message}</p>
            </div>
          )}
          {(isDev || showDetails) && errorInfo && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium mb-2">Error Details</summary>
              <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-48">
                {errorInfo.componentStack}
              </pre>
            </details>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={onRetry} variant="default" className="flex-1">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button onClick={onReset} variant="outline" className="flex-1">
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

/**
 * Error Boundary class component
 */
class ErrorBoundary extends Component<ErrorBoundaryProviderProps, ErrorBoundaryState> {
  private retryTimeouts: Set<NodeJS.Timeout> = new Set();

  constructor(props: ErrorBoundaryProviderProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Only update state if we haven't already captured this error's info
    if (!this.state.errorInfo) {
      this.setState({
        errorInfo,
        // Generate errorId here where side effects are allowed/expected
        errorId:
          this.state.errorId || `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      });
    }

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      // Use the generated errorId or a fallback
      const errorId = this.state.errorId || `error-${Date.now()}`;
      this.props.onError(error, errorInfo, errorId);
    }

    // In production, you could send error to error reporting service
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  handleRetry = (): void => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount >= maxRetries) {
      console.warn('Max retries reached. Please reset the application.');
      return;
    }

    // Call custom retry handler if provided
    if (this.props.onRetry) {
      this.props.onRetry();
    }

    // Reset error state and increment retry count
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: retryCount + 1,
    });
  };

  handleReset = (): void => {
    // Clear all pending retries
    this.retryTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.retryTimeouts.clear();

    // Reset error state completely
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
    });

    // Reload the page to start fresh
    navigation.navigateTo('/');
  };

  componentWillUnmount(): void {
    // Cleanup any pending timeouts
    this.retryTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.retryTimeouts.clear();
  }

  render(): ReactNode {
    const { hasError, error, errorInfo, retryCount } = this.state;
    const { children, fallback, showDetails = false } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <DefaultErrorFallback
          error={error}
          errorInfo={errorInfo}
          onRetry={this.handleRetry}
          onReset={this.handleReset}
          retryCount={retryCount}
          showDetails={showDetails}
        />
      );
    }

    return children;
  }
}

/**
 * ErrorBoundaryProvider wrapper component
 * Provides error boundary functionality with React context for error recovery
 */
export function ErrorBoundaryProvider(props: ErrorBoundaryProviderProps): React.ReactElement {
  return <ErrorBoundary {...props} />;
}

/**
 * Hook to programmatically trigger error boundary
 * Useful for testing error handling
 */
export function useErrorBoundary() {
  return {
    triggerError: (error: Error) => {
      throw error;
    },
  };
}

export default ErrorBoundaryProvider;
