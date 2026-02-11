'use client';

/**
 * ChartRenderer - Recharts-based chart rendering for artifact preview
 * Extracted from artifact-renderers.tsx for lazy loading (~200KB bundle reduction)
 */

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface ChartRendererProps {
  content: string;
  className?: string;
  chartType?: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'radar';
  chartData?: ChartDataPoint[];
}

const COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#0088fe',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
];

export function ChartRenderer({
  content,
  chartType = 'line',
  chartData,
  className,
}: ChartRendererProps) {
  const t = useTranslations('renderer');
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [detectedType, setDetectedType] = useState<string>(chartType);

  const invalidChartFormatMsg = t('invalidChartFormat');
  const failedToParseChartMsg = t('failedToParseChart');

  useEffect(() => {
    try {
      if (chartData) {
        setData(chartData);
      } else {
        const parsed = JSON.parse(content);

        if (parsed.type) {
          setDetectedType(parsed.type);
        }

        if (Array.isArray(parsed)) {
          setData(parsed);
        } else if (parsed.data && Array.isArray(parsed.data)) {
          setData(parsed.data);
        } else {
          throw new Error(invalidChartFormatMsg);
        }
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : failedToParseChartMsg);
    }
  }, [content, chartData, invalidChartFormatMsg, failedToParseChartMsg]);

  if (error) {
    return (
      <Alert variant="destructive" className={cn('m-4', className)}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center p-8 text-muted-foreground', className)}>
        {t('noData')}
      </div>
    );
  }

  const numericKeys = Object.keys(data[0] || {}).filter(
    (key) => key !== 'name' && typeof data[0][key] === 'number'
  );

  const renderChart = () => {
    switch (detectedType) {
      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            {numericKeys.map((key, index) => (
              <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} />
            ))}
          </BarChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        );

      case 'area':
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            {numericKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                fill={COLORS[index % COLORS.length]}
                stroke={COLORS[index % COLORS.length]}
                fillOpacity={0.3}
              />
            ))}
          </AreaChart>
        );

      case 'scatter':
        return (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" type="number" name="X" />
            <YAxis dataKey="y" type="number" name="Y" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <Scatter name="Data" data={data} fill={COLORS[0]} />
          </ScatterChart>
        );

      case 'radar':
        return (
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="name" />
            <PolarRadiusAxis />
            <Tooltip />
            <Legend />
            {numericKeys.map((key, index) => (
              <Radar
                key={key}
                name={key}
                dataKey={key}
                stroke={COLORS[index % COLORS.length]}
                fill={COLORS[index % COLORS.length]}
                fillOpacity={0.3}
              />
            ))}
          </RadarChart>
        );

      case 'line':
      default:
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            {numericKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        );
    }
  };

  return (
    <div className={cn('h-[300px] w-full p-4', className)}>
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}
