'use client';

/**
 * Enhanced Stat Card
 *
 * Statistics card with trend indicator, sparkline support, and animations.
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';

interface SparklineDataPoint {
  value: number;
  label?: string;
}

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
  sparklineData?: SparklineDataPoint[];
  sparklineColor?: string;
  size?: 'default' | 'compact' | 'large';
  animated?: boolean;
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
  sparklineData,
  sparklineColor = '#8884d8',
  size = 'default',
  animated = true,
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

  const sizeClasses = {
    compact: { header: 'pb-1', title: 'text-xs', value: 'text-xl', sparkline: 32 },
    default: { header: 'pb-2', title: 'text-sm', value: 'text-2xl', sparkline: 40 },
    large: { header: 'pb-3', title: 'text-base', value: 'text-3xl', sparkline: 56 },
  };

  const sizeConfig = sizeClasses[size];

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        animated && 'hover:shadow-md hover:border-primary/20',
        className
      )}
    >
      <CardHeader className={sizeConfig.header}>
        <CardTitle className={cn('font-medium flex items-center gap-2', sizeConfig.title)}>
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-20" />
            {sparklineData && <Skeleton className="h-10 w-full" />}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-end justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div
                  className={cn(
                    'font-bold truncate',
                    sizeConfig.value,
                    animated && 'transition-all duration-300',
                    valueClassName
                  )}
                >
                  {value}
                </div>
                {(trendInfo || subtitle) && (
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    {trendInfo && !trendInfo.isNeutral && (
                      <span
                        className={cn(
                          'flex items-center gap-0.5',
                          animated && 'transition-colors duration-200',
                          trendInfo.color
                        )}
                      >
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

              {/* Sparkline */}
              {sparklineData && sparklineData.length > 1 && (
                <div className="flex-shrink-0 w-20" style={{ height: sizeConfig.sparkline }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparklineData}>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '4px',
                          fontSize: '10px',
                          padding: '4px 8px',
                        }}
                        formatter={(v) => [Number(v ?? 0).toLocaleString(), '']}
                        labelFormatter={(_, payload) =>
                          payload?.[0]?.payload?.label || ''
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={sparklineColor}
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={animated}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
