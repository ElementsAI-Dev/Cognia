'use client';

/**
 * PreviewLoading - Loading state for preview panel
 * Shows progress and status during code compilation/preview generation
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, CheckCircle2, AlertCircle, Code2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface PreviewLoadingProps {
  className?: string;
  status?: 'loading' | 'compiling' | 'rendering' | 'done' | 'error';
  progress?: number;
  message?: string;
  errorMessage?: string;
}

const STATUS_CONFIG = {
  loading: {
    icon: <Loader2 className="h-6 w-6 animate-spin" />,
    color: 'text-muted-foreground',
    label: 'Loading...',
  },
  compiling: {
    icon: <Code2 className="h-6 w-6 animate-pulse" />,
    color: 'text-blue-500',
    label: 'Compiling code...',
  },
  rendering: {
    icon: <Loader2 className="h-6 w-6 animate-spin" />,
    color: 'text-primary',
    label: 'Rendering preview...',
  },
  done: {
    icon: <CheckCircle2 className="h-6 w-6" />,
    color: 'text-green-500',
    label: 'Ready',
  },
  error: {
    icon: <AlertCircle className="h-6 w-6" />,
    color: 'text-destructive',
    label: 'Error',
  },
};

export function PreviewLoading({
  className,
  status = 'loading',
  progress = 0,
  message,
  errorMessage,
}: PreviewLoadingProps) {
  const t = useTranslations('designer');
  const config = STATUS_CONFIG[status];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center',
        className
      )}
    >
      {/* Status icon */}
      <div className={cn('mb-4', config.color)}>
        {config.icon}
      </div>

      {/* Status label */}
      <p className="text-sm font-medium">
        {message || t(config.label) || config.label}
      </p>

      {/* Progress bar */}
      {(status === 'loading' || status === 'compiling' || status === 'rendering') && (
        <div className="w-48 mt-4">
          <Progress value={progress} className="h-1" />
        </div>
      )}

      {/* Error message */}
      {status === 'error' && errorMessage && (
        <p className="text-xs text-muted-foreground mt-2 max-w-xs">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

/**
 * Hook to manage preview loading status
 */
export function usePreviewStatus() {
  const [status, setStatus] = useState<PreviewLoadingProps['status']>('loading');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const startLoading = useCallback((msg?: string) => {
    setStatus('loading');
    setProgress(0);
    setMessage(msg);
    setErrorMessage(undefined);
  }, []);

  const startCompiling = useCallback((msg?: string) => {
    setStatus('compiling');
    setProgress(25);
    setMessage(msg);
  }, []);

  const startRendering = useCallback((msg?: string) => {
    setStatus('rendering');
    setProgress(75);
    setMessage(msg);
  }, []);

  const setDone = useCallback((msg?: string) => {
    setStatus('done');
    setProgress(100);
    setMessage(msg);
  }, []);

  const setError = useCallback((error: string) => {
    setStatus('error');
    setProgress(0);
    setErrorMessage(error);
  }, []);

  const updateProgress = useCallback((value: number) => {
    setProgress(Math.min(100, Math.max(0, value)));
  }, []);

  return {
    status,
    progress,
    message,
    errorMessage,
    startLoading,
    startCompiling,
    startRendering,
    setDone,
    setError,
    updateProgress,
  };
}

export default PreviewLoading;
