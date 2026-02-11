'use client';

/**
 * A2UI Chart Component
 * Maps to Recharts for data visualization
 */

import React, { useMemo, memo } from 'react';
import { cn } from '@/lib/utils';
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
  Label,
} from 'recharts';
import type { A2UIComponentProps, A2UIChartComponent } from '@/types/artifact/a2ui';
import { useA2UIContext } from '../a2ui-context';
import { resolveArrayOrPath } from '@/lib/a2ui/data-model';

const DEFAULT_COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#00C49F',
];

export const A2UIChart = memo(function A2UIChart({ component, onAction }: A2UIComponentProps<A2UIChartComponent>) {
  const { dataModel } = useA2UIContext();

  // Resolve data - can be static array or data-bound
  const data = useMemo(() => {
    if (Array.isArray(component.data)) {
      return component.data;
    }
    return resolveArrayOrPath(component.data, dataModel, []);
  }, [component.data, dataModel]);

  const chartType = component.chartType || 'line';
  const height = component.height || 300;
  const xKey = component.xKey || 'name';
  const yKeys = component.yKeys || ['value'];
  const colors = component.colors || DEFAULT_COLORS;

  const handleDataPointClick = (dataPoint: Record<string, unknown>, index: number) => {
    if (component.clickAction) {
      onAction(component.clickAction, { dataPoint, index });
    }
  };

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey={xKey} className="text-xs">
              {component.xAxisLabel && (
                <Label value={component.xAxisLabel} offset={-5} position="insideBottom" />
              )}
            </XAxis>
            <YAxis className="text-xs">
              {component.yAxisLabel && (
                <Label value={component.yAxisLabel} angle={-90} position="insideLeft" />
              )}
            </YAxis>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            {component.showLegend !== false && <Legend />}
            {yKeys.map((yKey: string, idx: number) => (
              <Bar
                key={yKey}
                dataKey={yKey}
                fill={colors[idx % colors.length]}
                onClick={(barData) => handleDataPointClick(barData as unknown as Record<string, unknown>, idx)}
                cursor={component.clickAction ? 'pointer' : 'default'}
              />
            ))}
          </BarChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey={yKeys[0]}
              nameKey={xKey}
              cx="50%"
              cy="50%"
              outerRadius={height / 3}
              label={component.showLabels !== false}
              cursor={component.clickAction ? 'pointer' : 'default'}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            {component.showLegend !== false && <Legend />}
          </PieChart>
        );

      case 'area':
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey={xKey} className="text-xs">
              {component.xAxisLabel && (
                <Label value={component.xAxisLabel} offset={-5} position="insideBottom" />
              )}
            </XAxis>
            <YAxis className="text-xs">
              {component.yAxisLabel && (
                <Label value={component.yAxisLabel} angle={-90} position="insideLeft" />
              )}
            </YAxis>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            {component.showLegend !== false && <Legend />}
            {yKeys.map((yKey: string, idx: number) => (
              <Area
                key={yKey}
                type="monotone"
                dataKey={yKey}
                stroke={colors[idx % colors.length]}
                fill={colors[idx % colors.length]}
                fillOpacity={0.3}
                cursor={component.clickAction ? 'pointer' : 'default'}
              />
            ))}
          </AreaChart>
        );

      case 'scatter':
        return (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey={xKey} className="text-xs" name={component.xAxisLabel || xKey}>
              {component.xAxisLabel && (
                <Label value={component.xAxisLabel} offset={-5} position="insideBottom" />
              )}
            </XAxis>
            <YAxis className="text-xs" name={component.yAxisLabel || yKeys[0]}>
              {component.yAxisLabel && (
                <Label value={component.yAxisLabel} angle={-90} position="insideLeft" />
              )}
            </YAxis>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
              cursor={{ strokeDasharray: '3 3' }}
            />
            {component.showLegend !== false && <Legend />}
            {yKeys.map((yKey: string, idx: number) => (
              <Scatter
                key={yKey}
                name={yKey}
                data={data}
                fill={colors[idx % colors.length]}
                cursor={component.clickAction ? 'pointer' : 'default'}
              />
            ))}
          </ScatterChart>
        );

      case 'radar':
        return (
          <RadarChart cx="50%" cy="50%" outerRadius={height / 3} data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey={xKey} className="text-xs" />
            <PolarRadiusAxis className="text-xs" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            {component.showLegend !== false && <Legend />}
            {yKeys.map((yKey: string, idx: number) => (
              <Radar
                key={yKey}
                name={yKey}
                dataKey={yKey}
                stroke={colors[idx % colors.length]}
                fill={colors[idx % colors.length]}
                fillOpacity={0.3}
              />
            ))}
          </RadarChart>
        );

      case 'donut':
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey={yKeys[0]}
              nameKey={xKey}
              cx="50%"
              cy="50%"
              innerRadius={height / 5}
              outerRadius={height / 3}
              label={component.showLabels !== false}
              cursor={component.clickAction ? 'pointer' : 'default'}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            {component.showLegend !== false && <Legend />}
          </PieChart>
        );

      case 'line':
      default:
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey={xKey} className="text-xs">
              {component.xAxisLabel && (
                <Label value={component.xAxisLabel} offset={-5} position="insideBottom" />
              )}
            </XAxis>
            <YAxis className="text-xs">
              {component.yAxisLabel && (
                <Label value={component.yAxisLabel} angle={-90} position="insideLeft" />
              )}
            </YAxis>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            {component.showLegend !== false && <Legend />}
            {yKeys.map((yKey: string, idx: number) => (
              <Line
                key={yKey}
                type="monotone"
                dataKey={yKey}
                stroke={colors[idx % colors.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{
                  r: 6,
                  cursor: component.clickAction ? 'pointer' : 'default',
                }}
              />
            ))}
          </LineChart>
        );
    }
  };

  return (
    <div
      className={cn('w-full', component.className)}
      style={{ height, ...(component.style as React.CSSProperties) }}
    >
      {component.title && (
        <h3 className="mb-2 text-sm font-medium">{component.title}</h3>
      )}
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
});
