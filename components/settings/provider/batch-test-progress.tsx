'use client';

import React from 'react';
import { Check, AlertCircle, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface BatchTestProgressProps {
  isRunning: boolean;
  progress: number;
  onCancel: () => void;
  cancelRequested?: boolean;
}

export const BatchTestProgress = React.memo(function BatchTestProgress({
  isRunning,
  progress,
  onCancel,
  cancelRequested = false,
}: BatchTestProgressProps) {
  const t = useTranslations('providers');

  if (!isRunning) return null;

  return (
    <div className="space-y-2">
      <Progress value={progress} className="h-2" />
      <div className="flex items-center justify-center gap-2">
        <p className="text-xs text-muted-foreground text-center">
          {t('testingProviders', { progress: Math.round(progress) })}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={onCancel}
          disabled={cancelRequested}
        >
          {t('cancel')}
        </Button>
      </div>
    </div>
  );
});

interface TestResultsSummaryProps {
  success: number;
  failed: number;
  total: number;
}

export const TestResultsSummary = React.memo(function TestResultsSummary({
  success,
  failed,
  total,
}: TestResultsSummaryProps) {
  const t = useTranslations('providers');

  if (total === 0) return null;

  return (
    <div className="flex items-center gap-4 rounded-lg border p-3 bg-muted/30">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{t('testResults')}:</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1 text-sm text-green-600">
          <Check className="h-4 w-4" />
          {t('passedCount', { count: success })}
        </span>
        {failed > 0 && (
          <span className="flex items-center gap-1 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {t('failedCount', { count: failed })}
          </span>
        )}
      </div>
    </div>
  );
});

export default BatchTestProgress;
