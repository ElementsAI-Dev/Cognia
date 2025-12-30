'use client';

/**
 * Preview Loading States - Skeleton and loading indicators for Sandpack preview
 */

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Code2, Box, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PreviewLoadingProps {
  className?: string;
  variant?: 'default' | 'skeleton' | 'minimal';
  status?: 'loading' | 'compiling' | 'bundling' | 'ready' | 'error';
}

/**
 * Preview loading skeleton that mimics common UI patterns
 */
export function PreviewLoading({
  className,
  variant = 'default',
  status = 'loading',
}: PreviewLoadingProps) {
  const t = useTranslations('previewLoading');
  const [dots, setDots] = useState('');

  // Animated dots for loading text
  useEffect(() => {
    if (status === 'ready' || status === 'error') return;

    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);

    return () => clearInterval(interval);
  }, [status]);

  const statusMessages: Record<typeof status, string> = {
    loading: t('loading'),
    compiling: t('compiling'),
    bundling: t('bundling'),
    ready: t('ready'),
    error: t('error'),
  };

  if (variant === 'minimal') {
    return (
      <div
        className={cn(
          'flex items-center justify-center h-full w-full bg-muted/20',
          className
        )}
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (variant === 'skeleton') {
    return (
      <div
        className={cn(
          'h-full w-full bg-muted/20 p-6 animate-pulse',
          className
        )}
      >
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted" />
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-3 w-20 rounded bg-muted" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-20 rounded-md bg-muted" />
            <div className="h-9 w-20 rounded-md bg-muted" />
          </div>
        </div>

        {/* Content skeleton */}
        <div className="space-y-4">
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-4/5 rounded bg-muted" />
          <div className="h-4 w-3/5 rounded bg-muted" />
        </div>

        {/* Card skeleton */}
        <div className="mt-6 p-4 rounded-lg border bg-card/50">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-md bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-2/3 rounded bg-muted" />
            </div>
          </div>
        </div>

        {/* Footer skeleton */}
        <div className="mt-6 flex justify-center">
          <div className="h-10 w-40 rounded-md bg-muted" />
        </div>
      </div>
    );
  }

  // Default variant with status indicator
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center h-full w-full bg-muted/10 gap-4',
        className
      )}
    >
      {/* Animated icon */}
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
        <div className="relative p-4 rounded-full bg-primary/5">
          {status === 'loading' && (
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          )}
          {status === 'compiling' && (
            <Code2 className="h-8 w-8 text-primary animate-pulse" />
          )}
          {status === 'bundling' && (
            <Box className="h-8 w-8 text-primary animate-bounce" />
          )}
          {status === 'ready' && (
            <RefreshCw className="h-8 w-8 text-green-500" />
          )}
          {status === 'error' && (
            <RefreshCw className="h-8 w-8 text-destructive" />
          )}
        </div>
      </div>

      {/* Status text */}
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          {statusMessages[status]}
          {status !== 'ready' && status !== 'error' && dots}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {status === 'loading' && t('loadingDesc')}
          {status === 'compiling' && t('compilingDesc')}
          {status === 'bundling' && t('bundlingDesc')}
          {status === 'ready' && t('readyDesc')}
          {status === 'error' && t('errorDesc')}
        </p>
      </div>

      {/* Progress indicator */}
      {status !== 'ready' && status !== 'error' && (
        <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full bg-primary rounded-full transition-all duration-300',
              status === 'loading' && 'w-1/4',
              status === 'compiling' && 'w-2/4',
              status === 'bundling' && 'w-3/4'
            )}
            style={{
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Hook to track preview loading status
 */
export function usePreviewStatus() {
  const [status, setStatus] = useState<PreviewLoadingProps['status']>('loading');

  const setLoading = () => setStatus('loading');
  const setCompiling = () => setStatus('compiling');
  const setBundling = () => setStatus('bundling');
  const setReady = () => setStatus('ready');
  const setError = () => setStatus('error');

  return {
    status,
    setLoading,
    setCompiling,
    setBundling,
    setReady,
    setError,
  };
}

export default PreviewLoading;
