'use client';

/**
 * ProviderHealthStatus - Display provider health, quota, and rate limit information
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  Gauge,
  Clock,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores';
import { testProviderConnection } from '@/lib/ai/infrastructure/api-test';

interface ProviderHealthStatusProps {
  providerId: string;
  className?: string;
  compact?: boolean;
}

type HealthStatus = 'healthy' | 'degraded' | 'error' | 'unknown';

const STATUS_ICONS: Record<HealthStatus, React.ReactNode> = {
  healthy: <CheckCircle className="h-4 w-4 text-green-500" />,
  degraded: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  error: <XCircle className="h-4 w-4 text-red-500" />,
  unknown: <Activity className="h-4 w-4 text-muted-foreground" />,
};

const STATUS_COLORS: Record<HealthStatus, string> = {
  healthy: 'bg-green-500',
  degraded: 'bg-yellow-500',
  error: 'bg-red-500',
  unknown: 'bg-muted-foreground',
};

export function ProviderHealthStatus({
  providerId,
  className,
  compact = false,
}: ProviderHealthStatusProps) {
  const t = useTranslations('providers');
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const updateProviderSettings = useSettingsStore((state) => state.updateProviderSettings);
  
  const settings = providerSettings[providerId];
  const [isChecking, setIsChecking] = useState(false);
  const [lastLatency, setLastLatency] = useState<number | null>(null);
  
  const healthStatus: HealthStatus = settings?.healthStatus || 'unknown';
  const lastHealthCheck = settings?.lastHealthCheck;
  const quotaUsed = settings?.quotaUsed;
  const quotaLimit = settings?.quotaLimit;
  const rateLimitRemaining = settings?.rateLimitRemaining;
  
  const checkHealth = useCallback(async () => {
    if (!settings?.apiKey && providerId !== 'ollama') return;
    
    setIsChecking(true);
    
    try {
      const result = await testProviderConnection(
        providerId,
        settings?.apiKey || '',
        settings?.baseURL
      );
      
      let newStatus: HealthStatus = 'unknown';
      if (result.success) {
        newStatus = result.latency_ms && result.latency_ms > 5000 ? 'degraded' : 'healthy';
        setLastLatency(result.latency_ms || null);
      } else {
        newStatus = 'error';
      }
      
      updateProviderSettings(providerId, {
        healthStatus: newStatus,
        lastHealthCheck: Date.now(),
      });
    } catch {
      updateProviderSettings(providerId, {
        healthStatus: 'error',
        lastHealthCheck: Date.now(),
      });
    } finally {
      setIsChecking(false);
    }
  }, [providerId, settings, updateProviderSettings]);
  
  // Auto-check health on mount if stale (> 5 minutes)
  useEffect(() => {
    if (!lastHealthCheck || Date.now() - lastHealthCheck > 5 * 60 * 1000) {
      if (settings?.apiKey || providerId === 'ollama') {
        checkHealth();
      }
    }
  }, [providerId, settings?.apiKey, lastHealthCheck, checkHealth]);
  
  const formatLastCheck = () => {
    if (!lastHealthCheck) return t('neverChecked');
    const diff = Date.now() - lastHealthCheck;
    if (diff < 60000) return t('justNow');
    if (diff < 3600000) return t('minutesAgo', { count: Math.floor(diff / 60000) });
    return t('hoursAgo', { count: Math.floor(diff / 3600000) });
  };
  
  const quotaPercentage = quotaUsed && quotaLimit 
    ? Math.min(100, (quotaUsed / quotaLimit) * 100) 
    : null;
  
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('flex items-center gap-1', className)}>
              <div
                className={cn(
                  'h-2 w-2 rounded-full',
                  STATUS_COLORS[healthStatus]
                )}
              />
              {isChecking && <Loader2 className="h-3 w-3 animate-spin" />}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1 text-xs">
              <p className="font-medium">{t(`status.${healthStatus}`)}</p>
              <p className="text-muted-foreground">{formatLastCheck()}</p>
              {lastLatency && <p>Latency: {lastLatency}ms</p>}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <div className={cn('space-y-3 rounded-lg border p-3 bg-muted/10', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t('healthStatus')}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={checkHealth}
          disabled={isChecking || (!settings?.apiKey && providerId !== 'ollama')}
        >
          {isChecking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {/* Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {STATUS_ICONS[healthStatus]}
          <span className="text-sm">{t(`status.${healthStatus}`)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatLastCheck()}
        </div>
      </div>
      
      {/* Latency */}
      {lastLatency && healthStatus !== 'error' && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('latency')}</span>
          <Badge variant={lastLatency > 3000 ? 'destructive' : 'secondary'}>
            {lastLatency}ms
          </Badge>
        </div>
      )}
      
      {/* Quota Progress */}
      {quotaPercentage !== null && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Gauge className="h-3 w-3" />
              {t('quotaUsage')}
            </span>
            <span>
              {quotaUsed?.toLocaleString()} / {quotaLimit?.toLocaleString()}
            </span>
          </div>
          <Progress 
            value={quotaPercentage} 
            className={cn(
              'h-1.5',
              quotaPercentage > 90 && '[&>div]:bg-red-500',
              quotaPercentage > 75 && quotaPercentage <= 90 && '[&>div]:bg-yellow-500'
            )}
          />
        </div>
      )}
      
      {/* Rate Limit */}
      {rateLimitRemaining !== undefined && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('rateLimitRemaining')}</span>
          <Badge variant={rateLimitRemaining < 10 ? 'destructive' : 'outline'}>
            {rateLimitRemaining} {t('requests')}
          </Badge>
        </div>
      )}
    </div>
  );
}
