'use client';

/**
 * Arena Error Boundary - Graceful error handling for Arena components
 * Uses a class component (required for error boundaries) wrapped with
 * a functional component that provides i18n translations.
 */

import React, { Component, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { loggers } from '@/lib/logger';

interface ArenaErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  sectionName?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
}

interface InternalErrorBoundaryProps extends ArenaErrorBoundaryProps {
  translations: {
    failedToLoad: string;
    somethingWrong: string;
    unexpectedError: string;
    tryAgain: string;
  };
}

interface ArenaErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class InternalErrorBoundary extends Component<InternalErrorBoundaryProps, ArenaErrorBoundaryState> {
  constructor(props: InternalErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ArenaErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    loggers.ui.error(`Arena ${this.props.sectionName || 'component'} error:`, error, { componentStack: errorInfo.componentStack });
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

      const { translations } = this.props;

      return (
        <div className="flex flex-col items-center justify-center p-8">
          <Alert variant="destructive" className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              {this.props.sectionName
                ? translations.failedToLoad.replace('{section}', this.props.sectionName)
                : translations.somethingWrong}
            </AlertTitle>
            <AlertDescription className="mt-2">
              <p className="text-sm text-muted-foreground mb-3">
                {this.state.error?.message || translations.unexpectedError}
              </p>
              <Button onClick={this.handleReset} size="sm" variant="outline" className="gap-2">
                <RefreshCw className="h-3 w-3" />
                {translations.tryAgain}
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ArenaErrorBoundary(props: ArenaErrorBoundaryProps) {
  const t = useTranslations('arena');

  const translations = {
    failedToLoad: t('errorBoundary.failedToLoad', { section: '{section}' }),
    somethingWrong: t('errorBoundary.somethingWrong'),
    unexpectedError: t('errorBoundary.unexpectedError'),
    tryAgain: t('errorBoundary.tryAgain'),
  };

  return <InternalErrorBoundary {...props} translations={translations} />;
}

export default ArenaErrorBoundary;
