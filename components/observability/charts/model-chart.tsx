'use client';

/**
 * Model Usage Chart
 *
 * Bar chart showing usage breakdown by model.
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ModelUsageBreakdown } from '@/lib/ai/usage-analytics';
import { TOOLTIP_STYLE, CHART_COLORS, CHART_MARGINS } from './chart-config';

interface ModelChartProps {
  data: ModelUsageBreakdown[];
  title?: string;
  dataKey?: 'tokens' | 'cost' | 'requests';
  height?: number;
  maxModels?: number;
}

export function ModelChart({
  data,
  title,
  dataKey = 'tokens',
  height = 250,
  maxModels = 8,
}: ModelChartProps) {
  const t = useTranslations('observability.charts');

  const chartData = useMemo(() => {
    return data.slice(0, maxModels).map((item) => ({
      name: item.model.length > 20 ? item.model.slice(0, 17) + '...' : item.model,
      fullName: item.model,
      value: dataKey === 'cost' ? Number(item[dataKey].toFixed(4)) : item[dataKey],
      percentage: item.percentage,
    }));
  }, [data, dataKey, maxModels]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{title || t('modelUsage')}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-muted-foreground text-sm">{t('noData')}</p>
        </CardContent>
      </Card>
    );
  }

  const getLabel = () => {
    switch (dataKey) {
      case 'cost':
        return t('costByModel');
      case 'requests':
        return t('requestsByModel');
      default:
        return t('tokensByModel');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title || getLabel()}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={CHART_MARGINS.vertical}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                width={120}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE.contentStyle}
                formatter={(value) => {
                  const numValue = Number(value);
                  const formattedValue =
                    dataKey === 'cost'
                      ? `$${numValue.toFixed(4)}`
                      : dataKey === 'tokens'
                      ? `${numValue.toLocaleString()} tokens`
                      : `${numValue} requests`;
                  return formattedValue;
                }}
              />
              <Bar dataKey="value" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
