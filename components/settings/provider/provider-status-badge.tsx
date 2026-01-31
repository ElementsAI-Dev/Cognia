'use client';

import React from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';

export type ProviderStatus = 'connected' | 'testing' | 'failed' | 'ready' | 'unknown' | 'not-set';

interface ProviderStatusBadgeProps {
  status: ProviderStatus;
  latency?: number;
  compact?: boolean;
  className?: string;
}

export const ProviderStatusBadge = React.memo(function ProviderStatusBadge({
  status,
  latency,
  compact = false,
  className,
}: ProviderStatusBadgeProps) {
  const t = useTranslations('providers');

  switch (status) {
    case 'testing':
      return (
        <Badge variant="secondary" className={`h-6 text-xs gap-1 ${className || ''}`}>
          <Loader2 className="h-3 w-3 animate-spin" />
          {!compact && (t('testing') || 'Testing')}
        </Badge>
      );

    case 'connected':
      return (
        <Badge variant="default" className={`h-6 text-xs gap-1 bg-green-600 ${className || ''}`}>
          <Check className="h-3 w-3" />
          {latency ? `${latency}ms` : !compact && (t('connected') || 'Connected')}
        </Badge>
      );

    case 'ready':
      return (
        <Badge variant="default" className={`text-[10px] ${className || ''}`}>
          <Check className="h-3 w-3 mr-0.5" />
          {t('ready') || 'Ready'}
        </Badge>
      );

    case 'failed':
      return (
        <Badge variant="destructive" className={`h-6 text-xs gap-1 ${className || ''}`}>
          <X className="h-3 w-3" />
          {!compact && (t('failed') || 'Failed')}
        </Badge>
      );

    case 'not-set':
      return (
        <Badge variant="outline" className={`text-[10px] ${className || ''}`}>
          {t('notSet') || 'Not Set'}
        </Badge>
      );

    case 'unknown':
    default:
      return null;
  }
});

export function getProviderStatus(
  isEnabled: boolean,
  hasApiKey: boolean,
  isTesting: boolean,
  testResult?: { success: boolean } | null
): ProviderStatus {
  if (isTesting) return 'testing';
  if (!isEnabled || !hasApiKey) return 'not-set';
  if (testResult?.success) return 'connected';
  if (testResult && !testResult.success) return 'failed';
  return 'ready';
}

export default ProviderStatusBadge;
