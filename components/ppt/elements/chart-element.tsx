'use client';

/**
 * PPT Chart Element - Render charts in slides
 * 
 * Supports bar, line, pie, doughnut, area, and scatter charts
 * using a lightweight canvas-based approach
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';

// =====================
// Types
// =====================

export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'area' | 'scatter' | 'horizontal-bar';

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface ChartDataset {
  label: string;
  data: number[];
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartOptions {
  /** Chart title */
  title?: string;
  /** Show legend */
  showLegend?: boolean;
  /** Legend position */
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  /** Show grid lines */
  showGrid?: boolean;
  /** Show data labels on chart */
  showDataLabels?: boolean;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Y-axis label */
  yAxisLabel?: string;
  /** X-axis label */
  xAxisLabel?: string;
  /** Color palette */
  colors?: string[];
}

export interface ChartElementProps {
  /** Chart type */
  type: ChartType;
  /** Chart data */
  data: ChartData | ChartDataPoint[];
  /** Chart options */
  options?: ChartOptions;
  /** Width */
  width?: number | string;
  /** Height */
  height?: number | string;
  /** Theme colors */
  theme?: {
    primaryColor: string;
    textColor: string;
    backgroundColor: string;
  };
  /** Additional class names */
  className?: string;
}

// =====================
// Default Colors
// =====================

const DEFAULT_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

// =====================
// Helper Functions
// =====================

function normalizeData(data: ChartData | ChartDataPoint[]): ChartData {
  if (Array.isArray(data) && data.length > 0 && 'label' in data[0]) {
    // Convert ChartDataPoint[] to ChartData
    const points = data as ChartDataPoint[];
    return {
      labels: points.map(p => p.label),
      datasets: [{
        label: 'Data',
        data: points.map(p => p.value),
        color: points[0]?.color,
      }],
    };
  }
  return data as ChartData;
}

function getColor(index: number, colors: string[]): string {
  return colors[index % colors.length];
}

// =====================
// Chart Renderers
// =====================

function drawBarChart(
  ctx: CanvasRenderingContext2D,
  data: ChartData,
  options: ChartOptions,
  width: number,
  height: number,
  colors: string[]
): void {
  const padding = { top: 40, right: 20, bottom: 60, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Find max value
  const allValues = data.datasets.flatMap(d => d.data);
  const maxValue = Math.max(...allValues) * 1.1;

  // Draw grid
  if (options.showGrid !== false) {
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }
  }

  // Draw bars
  const barGroupWidth = chartWidth / data.labels.length;
  const barWidth = (barGroupWidth * 0.7) / data.datasets.length;
  const barGap = barGroupWidth * 0.15;

  data.datasets.forEach((dataset, datasetIndex) => {
    const color = dataset.color || dataset.backgroundColor || getColor(datasetIndex, colors);
    ctx.fillStyle = color;

    dataset.data.forEach((value, i) => {
      const barHeight = (value / maxValue) * chartHeight;
      const x = padding.left + i * barGroupWidth + barGap + datasetIndex * barWidth;
      const y = padding.top + chartHeight - barHeight;

      ctx.fillRect(x, y, barWidth - 2, barHeight);

      // Data labels
      if (options.showDataLabels) {
        ctx.fillStyle = '#374151';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(value.toString(), x + barWidth / 2, y - 5);
        ctx.fillStyle = color;
      }
    });
  });

  // Draw labels
  ctx.fillStyle = '#374151';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  data.labels.forEach((label, i) => {
    const x = padding.left + i * barGroupWidth + barGroupWidth / 2;
    ctx.fillText(label, x, height - padding.bottom + 20);
  });

  // Draw title
  if (options.title) {
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(options.title, width / 2, 20);
  }
}

function drawLineChart(
  ctx: CanvasRenderingContext2D,
  data: ChartData,
  options: ChartOptions,
  width: number,
  height: number,
  colors: string[]
): void {
  const padding = { top: 40, right: 20, bottom: 60, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Find max value
  const allValues = data.datasets.flatMap(d => d.data);
  const maxValue = Math.max(...allValues) * 1.1;

  // Draw grid
  if (options.showGrid !== false) {
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }
  }

  // Draw lines
  const pointSpacing = chartWidth / (data.labels.length - 1 || 1);

  data.datasets.forEach((dataset, datasetIndex) => {
    const color = dataset.color || dataset.borderColor || getColor(datasetIndex, colors);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    dataset.data.forEach((value, i) => {
      const x = padding.left + i * pointSpacing;
      const y = padding.top + chartHeight - (value / maxValue) * chartHeight;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw points
    ctx.fillStyle = color;
    dataset.data.forEach((value, i) => {
      const x = padding.left + i * pointSpacing;
      const y = padding.top + chartHeight - (value / maxValue) * chartHeight;

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Data labels
      if (options.showDataLabels) {
        ctx.fillStyle = '#374151';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(value.toString(), x, y - 10);
        ctx.fillStyle = color;
      }
    });
  });

  // Draw labels
  ctx.fillStyle = '#374151';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  data.labels.forEach((label, i) => {
    const x = padding.left + i * pointSpacing;
    ctx.fillText(label, x, height - padding.bottom + 20);
  });

  // Draw title
  if (options.title) {
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(options.title, width / 2, 20);
  }
}

function drawPieChart(
  ctx: CanvasRenderingContext2D,
  data: ChartData,
  options: ChartOptions,
  width: number,
  height: number,
  colors: string[],
  isDoughnut: boolean = false
): void {
  const centerX = width / 2;
  const centerY = height / 2 + 10;
  const radius = Math.min(width, height) / 2 - 40;
  const innerRadius = isDoughnut ? radius * 0.6 : 0;

  // Calculate total
  const values = data.datasets[0]?.data || [];
  const total = values.reduce((a, b) => a + b, 0);

  // Draw slices
  let currentAngle = -Math.PI / 2;

  values.forEach((value, i) => {
    const sliceAngle = (value / total) * Math.PI * 2;
    const color = getColor(i, colors);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
    ctx.closePath();
    ctx.fill();

    if (isDoughnut) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Data label
    if (options.showDataLabels) {
      const labelAngle = currentAngle + sliceAngle / 2;
      const labelRadius = radius * 0.7;
      const labelX = centerX + Math.cos(labelAngle) * labelRadius;
      const labelY = centerY + Math.sin(labelAngle) * labelRadius;

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const percentage = ((value / total) * 100).toFixed(1) + '%';
      ctx.fillText(percentage, labelX, labelY);
    }

    currentAngle += sliceAngle;
  });

  // Draw legend
  if (options.showLegend !== false) {
    const legendY = height - 25;
    const legendItemWidth = width / data.labels.length;

    data.labels.forEach((label, i) => {
      const x = i * legendItemWidth + legendItemWidth / 2;
      const color = getColor(i, colors);

      ctx.fillStyle = color;
      ctx.fillRect(x - 30, legendY, 12, 12);

      ctx.fillStyle = '#374151';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(label, x - 14, legendY + 10);
    });
  }

  // Draw title
  if (options.title) {
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(options.title, width / 2, 20);
  }
}

// =====================
// Main Component
// =====================

export function ChartElement({
  type,
  data,
  options = {},
  width = '100%',
  height = 300,
  theme,
  className,
}: ChartElementProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const normalizedData = useMemo(() => normalizeData(data), [data]);
  const colors = useMemo(
    () => options.colors || DEFAULT_COLORS,
    [options.colors]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get actual dimensions
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Draw background
    if (theme?.backgroundColor) {
      ctx.fillStyle = theme.backgroundColor;
      ctx.fillRect(0, 0, rect.width, rect.height);
    }

    // Draw chart based on type
    switch (type) {
      case 'bar':
        drawBarChart(ctx, normalizedData, options, rect.width, rect.height, colors);
        break;
      case 'horizontal-bar':
        // TODO: Implement horizontal bar chart
        drawBarChart(ctx, normalizedData, options, rect.width, rect.height, colors);
        break;
      case 'line':
      case 'area':
        drawLineChart(ctx, normalizedData, options, rect.width, rect.height, colors);
        break;
      case 'pie':
        drawPieChart(ctx, normalizedData, options, rect.width, rect.height, colors, false);
        break;
      case 'doughnut':
        drawPieChart(ctx, normalizedData, options, rect.width, rect.height, colors, true);
        break;
      case 'scatter':
        // TODO: Implement scatter chart
        drawLineChart(ctx, normalizedData, options, rect.width, rect.height, colors);
        break;
      default:
        drawBarChart(ctx, normalizedData, options, rect.width, rect.height, colors);
    }
  }, [type, normalizedData, options, colors, theme]);

  return (
    <canvas
      ref={canvasRef}
      className={cn('w-full', className)}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  );
}

export default ChartElement;
