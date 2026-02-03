'use client';

/**
 * Latency Distribution Chart
 *
 * Bar chart showing latency percentiles (p50, p90, p99) distribution.
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TOOLTIP_STYLE, PERCENTILE_COLORS } from './chart-config';

interface LatencyPercentilesData {
  p50: number;
  p90: number;
  p99: number;
}

interface LatencyDistributionChartProps {
  data: LatencyPercentilesData;
  title?: string;
  height?: number;
  showAverage?: boolean;
  averageLatency?: number;
}

export function LatencyDistributionChart({
  data,
  title,
  height = 200,
  showAverage = true,
  averageLatency,
}: LatencyDistributionChartProps) {
  const t = useTranslations('observability.charts');

  const chartData = useMemo(() => {
    return [
      { name: 'P50', value: data.p50, color: PERCENTILE_COLORS.p50 },
      { name: 'P90', value: data.p90, color: PERCENTILE_COLORS.p90 },
      { name: 'P99', value: data.p99, color: PERCENTILE_COLORS.p99 },
    ];
  }, [data]);

  if (data.p50 === 0 && data.p90 === 0 && data.p99 === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{title || t('latencyDistribution')}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground text-sm">{t('noData')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title || t('latencyDistribution')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} className="text-xs" />
              <YAxis
                tick={{ fontSize: 11 }}
                className="text-xs"
                tickFormatter={(value) => `${value}ms`}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE.contentStyle}
                formatter={(value) => [`${Number(value ?? 0).toFixed(0)}ms`, 'Latency']}
              />
              {showAverage && averageLatency && (
                <ReferenceLine
                  y={averageLatency}
                  stroke="hsl(var(--primary))"
                  strokeDasharray="5 5"
                  label={{
                    value: `Avg: ${averageLatency.toFixed(0)}ms`,
                    position: 'right',
                    fontSize: 10,
                  }}
                />
              )}
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 mt-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: PERCENTILE_COLORS.p50 }} />
            <span className="text-muted-foreground">P50 (Median)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: PERCENTILE_COLORS.p90 }} />
            <span className="text-muted-foreground">P90</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: PERCENTILE_COLORS.p99 }} />
            <span className="text-muted-foreground">P99</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
