'use client';

/**
 * ErrorMessage - Enhanced error display with auto-retry mechanism
 * Provides clear error categorization and retry options
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertCircle,
  RefreshCw,
  Settings,
  X,
  Wifi,
  Key,
  Clock,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface ErrorMessageProps {
  error: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  autoRetry?: boolean;
  maxRetries?: number;
  retryCount?: number;
  className?: string;
}

type ErrorCategory = 'api_key' | 'network' | 'rate_limit' | 'server' | 'unknown';

interface ErrorInfo {
  category: ErrorCategory;
  title: string;
  description: string;
  icon: React.ReactNode;
  canRetry: boolean;
  showSettings: boolean;
}

function categorizeError(error: string, t: ReturnType<typeof useTranslations>): ErrorInfo {
  const lowerError = error.toLowerCase();

  // API Key errors
  if (
    lowerError.includes('api key') ||
    lowerError.includes('apikey') ||
    lowerError.includes('unauthorized') ||
    lowerError.includes('authentication') ||
    lowerError.includes('invalid key') ||
    lowerError.includes('not configured')
  ) {
    return {
      category: 'api_key',
      title: t('errorApiKeyTitle'),
      description: t('errorApiKeyDesc'),
      icon: <Key className="h-5 w-5" />,
      canRetry: false,
      showSettings: true,
    };
  }

  // Network errors
  if (
    lowerError.includes('network') ||
    lowerError.includes('fetch') ||
    lowerError.includes('connection') ||
    lowerError.includes('timeout') ||
    lowerError.includes('econnrefused') ||
    lowerError.includes('failed to fetch')
  ) {
    return {
      category: 'network',
      title: t('errorNetworkTitle'),
      description: t('errorNetworkDesc'),
      icon: <Wifi className="h-5 w-5" />,
      canRetry: true,
      showSettings: false,
    };
  }

  // Rate limit errors
  if (
    lowerError.includes('rate limit') ||
    lowerError.includes('too many requests') ||
    lowerError.includes('429') ||
    lowerError.includes('quota')
  ) {
    return {
      category: 'rate_limit',
      title: t('errorRateLimitTitle'),
      description: t('errorRateLimitDesc'),
      icon: <Clock className="h-5 w-5" />,
      canRetry: true,
      showSettings: false,
    };
  }

  // Server errors
  if (
    lowerError.includes('500') ||
    lowerError.includes('502') ||
    lowerError.includes('503') ||
    lowerError.includes('504') ||
    lowerError.includes('server error') ||
    lowerError.includes('internal error')
  ) {
    return {
      category: 'server',
      title: t('errorServerTitle'),
      description: t('errorServerDesc'),
      icon: <AlertTriangle className="h-5 w-5" />,
      canRetry: true,
      showSettings: false,
    };
  }

  // Unknown errors
  return {
    category: 'unknown',
    title: t('errorUnknownTitle'),
    description: error,
    icon: <AlertCircle className="h-5 w-5" />,
    canRetry: true,
    showSettings: false,
  };
}

export function ErrorMessage({
  error,
  onRetry,
  onDismiss,
  autoRetry = true,
  maxRetries = 3,
  retryCount = 0,
  className,
}: ErrorMessageProps) {
  const t = useTranslations('chat');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const errorInfo = categorizeError(error, t);
  const canAutoRetry = autoRetry && errorInfo.canRetry && retryCount < maxRetries;

  // Calculate retry delay with exponential backoff
  const getRetryDelay = useCallback((attempt: number) => {
    // Base delay: 3 seconds, doubles each attempt, max 30 seconds
    return Math.min(3 * Math.pow(2, attempt), 30);
  }, []);

  // Auto-retry countdown
  useEffect(() => {
    if (!canAutoRetry || !onRetry) return;

    const delay = getRetryDelay(retryCount);
    let countdownValue = delay;
    setCountdown(delay);

    const interval = setInterval(() => {
      countdownValue -= 1;
      if (countdownValue <= 0) {
        clearInterval(interval);
        setCountdown(null);
      } else {
        setCountdown(countdownValue);
      }
    }, 1000);

    const timeout = setTimeout(() => {
      setIsRetrying(true);
      onRetry();
    }, delay * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAutoRetry, retryCount]);

  const handleManualRetry = useCallback(() => {
    setCountdown(null);
    setIsRetrying(true);
    onRetry?.();
  }, [onRetry]);

  const progressValue = countdown !== null ? ((getRetryDelay(retryCount) - countdown) / getRetryDelay(retryCount)) * 100 : 0;

  return (
    <Alert
      variant="destructive"
      className={cn(
        'relative mx-4 mt-2 border-destructive/50 bg-destructive/10',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-destructive">{errorInfo.icon}</div>
        <div className="flex-1 min-w-0">
          <AlertTitle className="mb-1 font-semibold">{errorInfo.title}</AlertTitle>
          <AlertDescription className="text-sm">
            {errorInfo.category === 'unknown' ? error : errorInfo.description}
            {errorInfo.category !== 'unknown' && error !== errorInfo.description && (
              <span className="block mt-1 text-xs opacity-70">{error}</span>
            )}
          </AlertDescription>

          {/* Retry progress */}
          {canAutoRetry && countdown !== null && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Auto-retry in {countdown}s (attempt {retryCount + 1}/{maxRetries})
                </span>
              </div>
              <Progress value={progressValue} className="h-1" />
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {errorInfo.canRetry && onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRetry}
                disabled={isRetrying}
                className="h-8 gap-1.5"
              >
                {isRetrying ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Retry Now
              </Button>
            )}
            {errorInfo.showSettings && (
              <Button variant="outline" size="sm" asChild className="h-8 gap-1.5">
                <Link href="/settings">
                  <Settings className="h-3.5 w-3.5" />
                  Go to Settings
                </Link>
              </Button>
            )}
            {retryCount >= maxRetries && (
              <span className="text-xs text-muted-foreground">
                Max retries reached. Please try again manually.
              </span>
            )}
          </div>
        </div>

        {/* Dismiss button */}
        {onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            className="h-6 w-6 shrink-0 rounded-full hover:bg-destructive/20"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Alert>
  );
}

export default ErrorMessage;
