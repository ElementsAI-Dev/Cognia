'use client';

/**
 * StorageHealth - Display storage health status and recommendations
 */

import { useTranslations } from 'next-intl';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lightbulb,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StorageHealth, StorageIssue, StorageRecommendation } from '@/lib/storage';

interface StorageHealthDisplayProps {
  health: StorageHealth | null;
  formatBytes: (bytes: number) => string;
  onActionClick?: (action: string) => void;
  className?: string;
}

export function StorageHealthDisplay({
  health,
  formatBytes,
  onActionClick,
  className,
}: StorageHealthDisplayProps) {
  const t = useTranslations('dataSettings');

  if (!health) {
    return null;
  }

  const statusConfig = {
    healthy: {
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      label: t('statusHealthy') || 'Healthy',
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      label: t('statusWarning') || 'Warning',
    },
    critical: {
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      label: t('statusCritical') || 'Critical',
    },
  };

  const config = statusConfig[health.status];
  const StatusIcon = config.icon;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Status badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('rounded-full p-1', config.bgColor)}>
            <StatusIcon className={cn('h-4 w-4', config.color)} />
          </div>
          <span className="text-sm font-medium">{config.label}</span>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {health.usagePercent.toFixed(1)}% {t('used') || 'used'}
        </Badge>
      </div>

      {/* Issues */}
      {health.issues.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-muted-foreground">
            {t('issues') || 'Issues'}
          </h4>
          {health.issues.map((issue, index) => (
            <IssueItem key={index} issue={issue} />
          ))}
        </div>
      )}

      {/* Recommendations */}
      {health.recommendations.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-muted-foreground">
            {t('recommendations') || 'Recommendations'}
          </h4>
          {health.recommendations.map((rec, index) => (
            <RecommendationItem
              key={index}
              recommendation={rec}
              formatBytes={formatBytes}
              onActionClick={onActionClick}
            />
          ))}
        </div>
      )}

      {/* All good message */}
      {health.status === 'healthy' && health.issues.length === 0 && (
        <p className="text-xs text-muted-foreground">
          {t('storageHealthy') || 'Your storage is in good condition.'}
        </p>
      )}
    </div>
  );
}

/**
 * Issue item component
 */
function IssueItem({ issue }: { issue: StorageIssue }) {
  const severityColors = {
    low: 'border-blue-500/50 bg-blue-500/5',
    medium: 'border-yellow-500/50 bg-yellow-500/5',
    high: 'border-red-500/50 bg-red-500/5',
  };

  return (
    <div
      className={cn(
        'rounded-md border p-2 text-xs',
        severityColors[issue.severity]
      )}
    >
      <p className="font-medium">{issue.message}</p>
      {issue.suggestedAction && (
        <p className="text-muted-foreground mt-0.5">{issue.suggestedAction}</p>
      )}
    </div>
  );
}

/**
 * Recommendation item component
 */
function RecommendationItem({
  recommendation,
  formatBytes,
  onActionClick,
}: {
  recommendation: StorageRecommendation;
  formatBytes: (bytes: number) => string;
  onActionClick?: (action: string) => void;
}) {
  const t = useTranslations('dataSettings');

  return (
    <div className="flex items-start gap-2 rounded-md border p-2 text-xs">
      <Lightbulb className="h-3.5 w-3.5 text-yellow-500 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium">{recommendation.action}</p>
        <p className="text-muted-foreground">{recommendation.description}</p>
        {recommendation.estimatedSavings > 0 && (
          <p className="text-green-600 mt-0.5">
            {t('potentialSavings') || 'Potential savings'}: {formatBytes(recommendation.estimatedSavings)}
          </p>
        )}
      </div>
      {onActionClick && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => onActionClick(recommendation.action)}
        >
          <ChevronRight className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

export default StorageHealthDisplay;
