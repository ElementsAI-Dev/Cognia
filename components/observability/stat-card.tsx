'use client';

/**
 * Enhanced Stat Card
 *
 * Statistics card with trend indicator and sparkline support.
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  subtitle?: string;
  isLoading?: boolean;
  className?: string;
  valueClassName?: string;
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  subtitle,
  isLoading = false,
  className,
  valueClassName,
}: StatCardProps) {
  const trendInfo = useMemo(() => {
    if (!trend) return null;

    const isPositive = trend.value > 0;
    const isNegative = trend.value < 0;
    const isNeutral = trend.value === 0;

    return {
      icon: isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : isNegative ? (
        <TrendingDown className="h-3 w-3" />
      ) : (
        <Minus className="h-3 w-3" />
      ),
      color: isPositive
        ? 'text-green-600 dark:text-green-400'
        : isNegative
        ? 'text-red-600 dark:text-red-400'
        : 'text-muted-foreground',
      label: `${isPositive ? '+' : ''}${trend.value.toFixed(1)}%`,
      isNeutral,
    };
  }, [trend]);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="space-y-1">
            <div className={cn('text-2xl font-bold', valueClassName)}>{value}</div>
            {(trendInfo || subtitle) && (
              <div className="flex items-center gap-2 text-xs">
                {trendInfo && !trendInfo.isNeutral && (
                  <span className={cn('flex items-center gap-0.5', trendInfo.color)}>
                    {trendInfo.icon}
                    {trendInfo.label}
                  </span>
                )}
                {trend?.label && (
                  <span className="text-muted-foreground">{trend.label}</span>
                )}
                {subtitle && <span className="text-muted-foreground">{subtitle}</span>}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
