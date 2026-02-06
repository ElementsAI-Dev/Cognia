'use client';

/**
 * Provider Distribution Chart
 *
 * Pie chart showing usage distribution across providers.
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ProviderUsageBreakdown } from '@/lib/ai/usage-analytics';
import { TOOLTIP_STYLE, EXTENDED_COLORS } from './chart-config';

interface ProviderChartProps {
  data: ProviderUsageBreakdown[];
  title?: string;
  dataKey?: 'tokens' | 'cost' | 'requests';
  height?: number;
}

export function ProviderChart({
  data,
  title,
  dataKey = 'tokens',
  height = 250,
}: ProviderChartProps) {
  const t = useTranslations('observability.charts');

  const chartData = useMemo(() => {
    return data.map((item) => ({
      name: item.provider,
      value: dataKey === 'cost' ? Number(item[dataKey].toFixed(4)) : item[dataKey],
      percentage: item.percentage,
    }));
  }, [data, dataKey]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{title || t('providerDistribution')}</CardTitle>
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
        return t('costByProvider');
      case 'requests':
        return t('requestsByProvider');
      default:
        return t('tokensByProvider');
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
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(1)}%)`}
                labelLine={false}
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={EXTENDED_COLORS[index % EXTENDED_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={TOOLTIP_STYLE.contentStyle}
                formatter={(value) => {
                  const numValue = Number(value);
                  if (dataKey === 'cost') return `$${numValue.toFixed(4)}`;
                  if (dataKey === 'tokens') return `${numValue.toLocaleString()} tokens`;
                  return `${numValue} requests`;
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
