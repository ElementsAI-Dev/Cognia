'use client';

/**
 * Requests Timeline Chart
 *
 * Line chart showing request count over time with success/error breakdown.
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TimeSeriesDataPoint } from '@/lib/ai/usage-analytics';
import { TOOLTIP_STYLE, CHART_COLORS, CHART_MARGINS } from '@/lib/observability/chart-config';

interface RequestsTimelineChartProps {
  data: TimeSeriesDataPoint[];
  title?: string;
  height?: number;
  showCost?: boolean;
}

export function RequestsTimelineChart({
  data,
  title,
  height = 280,
  showCost = false,
}: RequestsTimelineChartProps) {
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
    }));
  }, [data]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{title || t('requestsTimeline')}</CardTitle>
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
        <CardTitle className="text-sm">{title || t('requestsTimeline')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer>
            <ComposedChart data={chartData} margin={CHART_MARGINS.default}>
              <defs>
                <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="displayDate" tick={{ fontSize: 11 }} className="text-xs" />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} className="text-xs" />
              {showCost && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  className="text-xs"
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                />
              )}
              <Tooltip
                contentStyle={TOOLTIP_STYLE.contentStyle}
                labelStyle={TOOLTIP_STYLE.labelStyle}
                formatter={(value, name) => {
                  const numValue = Number(value ?? 0);
                  if (name === 'cost') return [`$${numValue.toFixed(4)}`, t('cost') || 'Cost'];
                  return [numValue.toLocaleString(), String(name)];
                }}
              />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="requests"
                name={t('requests') || 'Requests'}
                fill="url(#colorRequests)"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              {showCost && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cost"
                  name={t('cost') || 'Cost'}
                  stroke={CHART_COLORS.secondary}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
