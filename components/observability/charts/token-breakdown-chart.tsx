'use client';

/**
 * Token Breakdown Chart
 *
 * Donut chart showing input vs output token distribution.
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TokenBreakdownData {
  inputTokens: number;
  outputTokens: number;
}

interface TokenBreakdownChartProps {
  data: TokenBreakdownData;
  title?: string;
  height?: number;
}

const COLORS = ['#8884d8', '#82ca9d'];

export function TokenBreakdownChart({
  data,
  title,
  height = 240,
}: TokenBreakdownChartProps) {
  const t = useTranslations('observability.charts');

  const chartData = useMemo(() => {
    const total = data.inputTokens + data.outputTokens;
    return [
      {
        name: t('inputTokens') || 'Input Tokens',
        value: data.inputTokens,
        percentage: total > 0 ? (data.inputTokens / total) * 100 : 0,
      },
      {
        name: t('outputTokens') || 'Output Tokens',
        value: data.outputTokens,
        percentage: total > 0 ? (data.outputTokens / total) * 100 : 0,
      },
    ];
  }, [data, t]);

  const totalTokens = data.inputTokens + data.outputTokens;
  const ratio = data.outputTokens > 0 ? (data.inputTokens / data.outputTokens).toFixed(2) : '∞';

  if (totalTokens === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{title || t('tokenBreakdown')}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground text-sm">{t('noData')}</p>
        </CardContent>
      </Card>
    );
  }

  const formatValue = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{title || t('tokenBreakdown')}</CardTitle>
          <span className="text-xs text-muted-foreground">
            {t('ratio') || 'I/O Ratio'}: {ratio}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${(name || '').toString().split(' ')[0]} (${((percent || 0) * 100).toFixed(1)}%)`}
                labelLine={false}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
                formatter={(value) => [formatValue(Number(value ?? 0)), 'Tokens']}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-2 text-sm">
          <div className="text-center">
            <div className="font-bold text-lg">{formatValue(data.inputTokens)}</div>
            <div className="text-xs text-muted-foreground">{t('inputTokens') || 'Input'}</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg">{formatValue(data.outputTokens)}</div>
            <div className="text-xs text-muted-foreground">{t('outputTokens') || 'Output'}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
