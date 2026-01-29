'use client';

/**
 * Usage Trend Chart
 *
 * Area chart showing token usage and cost trends over time.
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TimeSeriesDataPoint } from '@/lib/ai/usage-analytics';

interface UsageTrendChartProps {
  data: TimeSeriesDataPoint[];
  title?: string;
  showCost?: boolean;
  showTokens?: boolean;
  height?: number;
}

export function UsageTrendChart({
  data,
  title,
  showCost = true,
  showTokens = true,
  height = 300,
}: UsageTrendChartProps) {
  const t = useTranslations('observability.charts');

  const chartData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      displayDate: new Date(point.date).toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
      }),
      tokens: Math.round(point.tokens / 1000), // Display in K
      cost: Number(point.cost.toFixed(4)),
    }));
  }, [data]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{title || t('usageTrend')}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-muted-foreground text-sm">{t('noData')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title || t('usageTrend')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="displayDate" tick={{ fontSize: 12 }} className="text-xs" />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} className="text-xs" />
              {showCost && (
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} className="text-xs" />
              )}
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
                labelStyle={{ fontWeight: 'bold' }}
              />
              <Legend />
              {showTokens && (
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="tokens"
                  name={t('tokensK')}
                  stroke="#8884d8"
                  fillOpacity={1}
                  fill="url(#colorTokens)"
                />
              )}
              {showCost && (
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="cost"
                  name={t('costUSD')}
                  stroke="#82ca9d"
                  fillOpacity={1}
                  fill="url(#colorCost)"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
