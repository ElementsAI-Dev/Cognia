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
import { TOOLTIP_STYLE, CHART_COLORS, CHART_MARGINS } from './chart-config';

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
      displayDate: new Date(point.date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: point.date.includes('T') ? '2-digit' : undefined,
        minute: point.date.includes('T') && point.date.length > 13 ? '2-digit' : undefined,
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
            <AreaChart data={chartData} margin={CHART_MARGINS.default}>
              <defs>
                <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="displayDate" tick={{ fontSize: 12 }} className="text-xs" />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} className="text-xs" />
              {showCost && (
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} className="text-xs" />
              )}
              <Tooltip
                contentStyle={TOOLTIP_STYLE.contentStyle}
                labelStyle={TOOLTIP_STYLE.labelStyle}
              />
              <Legend />
              {showTokens && (
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="tokens"
                  name={t('tokensK')}
                  stroke={CHART_COLORS.primary}
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
                  stroke={CHART_COLORS.secondary}
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
