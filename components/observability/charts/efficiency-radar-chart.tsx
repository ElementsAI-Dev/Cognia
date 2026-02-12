'use client';

/**
 * Efficiency Radar Chart
 *
 * Radar chart showing efficiency metrics across multiple dimensions.
 */

import { memo, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TOOLTIP_STYLE } from '@/lib/observability/chart-config';
import type { EfficiencyData } from '@/types/observability';

interface EfficiencyRadarChartProps {
  data: EfficiencyData;
  title?: string;
  height?: number;
}

export const EfficiencyRadarChart = memo(function EfficiencyRadarChart({ data, title, height = 280 }: EfficiencyRadarChartProps) {
  const t = useTranslations('observability.charts');

  const chartData = useMemo(() => {
    return [
      {
        metric: t('costEfficiency') || 'Cost Efficiency',
        value: data.costEfficiency,
        fullMark: 100,
      },
      {
        metric: t('tokenEfficiency') || 'Token Efficiency',
        value: data.tokenEfficiency,
        fullMark: 100,
      },
      { metric: t('latencyScore') || 'Latency', value: data.latencyScore, fullMark: 100 },
      { metric: t('reliability') || 'Reliability', value: data.errorScore, fullMark: 100 },
      { metric: t('utilization') || 'Utilization', value: data.utilizationScore, fullMark: 100 },
    ];
  }, [data, t]);

  const overallScore = useMemo(() => {
    const values = Object.values(data);
    return values.reduce((acc, val) => acc + val, 0) / values.length;
  }, [data]);

  const hasData = Object.values(data).some((v) => v > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{title || t('efficiencyRadar')}</CardTitle>
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
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{title || t('efficiencyRadar')}</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('overallScore') || 'Overall'}:</span>
            <span
              className={`text-sm font-bold ${
                overallScore >= 70
                  ? 'text-green-600'
                  : overallScore >= 40
                    ? 'text-yellow-600'
                    : 'text-red-600'
              }`}
            >
              {overallScore.toFixed(0)}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer>
            <RadarChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
              <PolarGrid className="stroke-muted" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} tickCount={5} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE.contentStyle}
                formatter={(value) => [`${Number(value ?? 0).toFixed(0)}%`, 'Score']}
              />
              <Radar
                name="Efficiency"
                dataKey="value"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});

