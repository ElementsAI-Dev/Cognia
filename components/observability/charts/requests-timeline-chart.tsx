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
      displayDate: new Date(point.date).toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
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
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0.2} />
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
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
                labelStyle={{ fontWeight: 'bold' }}
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
                  stroke="#82ca9d"
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
