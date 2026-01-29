'use client';

/**
 * SandboxErrorBoundary - Error boundary for sandbox execution
 * Catches and displays runtime errors in the sandbox
 */

import React, { Component, useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ErrorInfo {
  componentStack: string;
}

interface SandboxErrorBoundaryProps {
  children: React.ReactNode;
  className?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

interface SandboxErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class SandboxErrorBoundary extends Component<
  SandboxErrorBoundaryProps,
  SandboxErrorBoundaryState
> {
  constructor(props: SandboxErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<SandboxErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
    console.error('Sandbox error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorDisplay
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
          className={this.props.className}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorDisplayProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset?: () => void;
  className?: string;
}

function ErrorDisplay({ error, errorInfo, onReset, className }: ErrorDisplayProps) {
  const t = useTranslations('sandboxEditor');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const errorText = `Error: ${error?.message}\n\nStack:\n${error?.stack}\n\nComponent Stack:\n${errorInfo?.componentStack}`;
    await navigator.clipboard.writeText(errorText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('flex flex-col h-full min-h-0 bg-destructive/5 p-4', className)}>
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t('runtimeError')}</AlertTitle>
        <AlertDescription>
          {t('errorOccurred')}
        </AlertDescription>
      </Alert>

      <ScrollArea className="flex-1 min-h-0 mb-4">
        <div className="space-y-3">
          {/* Error message */}
          <div className="p-3 rounded-md bg-background border border-destructive/30">
            <p className="text-sm font-mono text-destructive break-all">
              {error?.message || t('unknownError')}
            </p>
          </div>

          {/* Stack trace */}
          {error?.stack && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{t('stackTrace')}</p>
              <pre className="p-3 rounded-md bg-muted text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
                {error.stack}
              </pre>
            </div>
          )}

          {/* Component stack */}
          {errorInfo?.componentStack && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{t('componentStack')}</p>
              <pre className="p-3 rounded-md bg-muted text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
                {errorInfo.componentStack}
              </pre>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="flex items-center gap-2">
        <Button onClick={onReset} className="flex-1">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('tryAgain')}
        </Button>
        <Button variant="outline" onClick={handleCopy}>
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

/**
 * Hook to reset error boundary programmatically
 */
export function useErrorBoundaryReset() {
  const [resetKey, setResetKey] = useState(0);
  
  const reset = useCallback(() => {
    setResetKey((prev) => prev + 1);
  }, []);

  return { resetKey, reset };
}

/**
 * Hook to intercept console errors for display
 */
export function useConsoleErrorInterceptor() {
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const originalError = console.error;
    
    console.error = (...args: unknown[]) => {
      const message = args.map((arg) => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      setErrors((prev) => [...prev.slice(-9), message]);
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return { errors, clearErrors };
}

export default SandboxErrorBoundary;
