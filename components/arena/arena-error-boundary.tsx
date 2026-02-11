'use client';

/**
 * Arena Error Boundary - Graceful error handling for Arena components
 */

import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ArenaErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  sectionName?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
}

interface ArenaErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ArenaErrorBoundary extends Component<ArenaErrorBoundaryProps, ArenaErrorBoundaryState> {
  constructor(props: ArenaErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ArenaErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(`Arena ${this.props.sectionName || 'component'} error:`, error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8">
          <Alert variant="destructive" className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              {this.props.sectionName
                ? `${this.props.sectionName} failed to load`
                : 'Something went wrong'}
            </AlertTitle>
            <AlertDescription className="mt-2">
              <p className="text-sm text-muted-foreground mb-3">
                {this.state.error?.message || 'An unexpected error occurred.'}
              </p>
              <Button onClick={this.handleReset} size="sm" variant="outline" className="gap-2">
                <RefreshCw className="h-3 w-3" />
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ArenaErrorBoundary;
