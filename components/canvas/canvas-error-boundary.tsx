'use client';

/**
 * Canvas Error Boundary - Graceful error handling for Canvas panel
 */

import { Component, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, RefreshCw, Bug, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class CanvasErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });
    
    console.error('Canvas error:', error, errorInfo);
    
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <CanvasErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  onReset: () => void;
}

function CanvasErrorFallbackContent({ 
  error, 
  errorInfo, 
  onReset 
}: ErrorFallbackProps) {
  const t = useTranslations('canvas');
  const [copied, setCopied] = React.useState(false);
  const [showDetails, setShowDetails] = React.useState(false);

  const errorDetails = React.useMemo(() => {
    const parts: string[] = [];
    if (error) {
      parts.push(`Error: ${error.message}`);
      if (error.stack) {
        parts.push(`\nStack:\n${error.stack}`);
      }
    }
    if (errorInfo?.componentStack) {
      parts.push(`\nComponent Stack:\n${errorInfo.componentStack}`);
    }
    return parts.join('\n');
  }, [error, errorInfo]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(errorDetails);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-background">
      <Card className="max-w-lg border-destructive/50">
        <CardContent className="pt-6">
          <Alert variant="destructive" className="border-0 p-0">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="text-lg">{t('errorTitle')}</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-4 text-muted-foreground">{t('errorDescription')}</p>
              
              <div className="flex gap-2 mb-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={onReset} size="sm" className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      {t('tryAgain')}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('tryAgain')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={handleCopy} 
                      variant="outline" 
                      size="sm" 
                      className="gap-2"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 text-green-500" />
                          {t('copied')}
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          {t('copyError')}
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('copyError')}</TooltipContent>
                </Tooltip>
              </div>

              <Separator className="my-4" />

              <Collapsible open={showDetails} onOpenChange={setShowDetails}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 w-full justify-start">
                    <Bug className="h-4 w-4" />
                    {showDetails ? t('hideDetails') : t('showDetails')}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-auto max-h-48 font-mono">
                    {error?.message || 'Unknown error'}
                    {error?.stack && (
                      <>
                        {'\n\n'}
                        {error.stack}
                      </>
                    )}
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

import React from 'react';

function CanvasErrorFallback(props: ErrorFallbackProps) {
  return <CanvasErrorFallbackContent {...props} />;
}

export default CanvasErrorBoundary;
