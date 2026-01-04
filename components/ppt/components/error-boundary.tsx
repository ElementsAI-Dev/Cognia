'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Presentation } from 'lucide-react';

/**
 * PPTPreviewErrorBoundary - Error boundary for PPT Preview components
 */
export interface PPTPreviewErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface PPTPreviewErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

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
    console.error('PPT Preview Error:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="p-3 rounded-full bg-destructive/10">
              <Presentation className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Failed to load presentation</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try Again
            </Button>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default PPTPreviewErrorBoundary;
