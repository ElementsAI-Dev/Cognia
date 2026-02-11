'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Presentation, AlertCircle } from 'lucide-react';
import { loggers } from '@/lib/logger';

/**
 * PPTPreviewErrorBoundary - Error boundary for PPT Preview components
 */
export interface PPTPreviewErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  labels?: {
    failedToLoad?: string;
    unexpectedError?: string;
    tryAgain?: string;
  };
}

interface PPTPreviewErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Default labels (can be overridden via props for i18n)
const DEFAULT_LABELS = {
  failedToLoad: 'Failed to load presentation',
  unexpectedError: 'An unexpected error occurred',
  tryAgain: 'Try Again',
};

export class PPTPreviewErrorBoundary extends Component<
  PPTPreviewErrorBoundaryProps,
  PPTPreviewErrorBoundaryState
> {
  constructor(props: PPTPreviewErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): PPTPreviewErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    loggers.ui.error('PPT Preview Error:', error, { componentStack: errorInfo.componentStack });
  }

  render(): ReactNode {
    const labels = { ...DEFAULT_LABELS, ...this.props.labels };
    
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="p-6">
          <Alert variant="destructive" className="border-0 bg-transparent">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="flex items-center gap-2">
              <Presentation className="h-5 w-5" />
              {labels.failedToLoad}
            </AlertTitle>
            <AlertDescription className="mt-2">
              {this.state.error?.message || labels.unexpectedError}
            </AlertDescription>
          </Alert>
          <div className="flex justify-center mt-4">
            <Button
              variant="outline"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              {labels.tryAgain}
            </Button>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default PPTPreviewErrorBoundary;
