'use client';

/**
 * Artifact Renderers - Specialized renderers for different artifact types
 * 
 * This module provides a unified interface for artifact rendering by:
 * 1. Re-exporting feature-rich renderers from chat/renderers for consistency
 * 2. Providing ChartRenderer (unique to artifacts, not in chat/renderers)
 * 3. Maintaining backward-compatible API through wrapper components
 * 
 * Supports: Mermaid diagrams, Charts (Recharts), Math (KaTeX), Markdown, Code
 */

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MermaidBlock } from '@/components/chat/renderers/mermaid-block';
import { MathBlock } from '@/components/chat/renderers/math-block';
import { CodeBlock } from '@/components/chat/renderers/code-block';
import { MarkdownRenderer as ChatMarkdownRenderer } from '@/components/chat/markdown-renderer';
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

// Re-export feature-rich renderers from chat/renderers for unified usage
// These provide full functionality: fullscreen, copy, export, etc.
export { MermaidBlock as MermaidRenderer } from '@/components/chat/renderers/mermaid-block';
export { MathBlock as MathRenderer } from '@/components/chat/renderers/math-block';
export { CodeBlock as CodeRenderer } from '@/components/chat/renderers/code-block';

// Re-export MarkdownRenderer from chat module for full markdown support
export { MarkdownRenderer } from '@/components/chat/markdown-renderer';

interface RendererProps {
  content: string;
  className?: string;
}

interface ChartRendererProps extends RendererProps {
  chartType?: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'radar';
  chartData?: ChartDataPoint[];
}

interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00C49F', '#FFBB28', '#FF8042'];

/**
 * Chart Renderer using Recharts
 */
export function ChartRenderer({ content, chartType = 'line', chartData, className }: ChartRendererProps) {
  const t = useTranslations('renderer');
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [detectedType, setDetectedType] = useState<string>(chartType);

  useEffect(() => {
    try {
      if (chartData) {
        setData(chartData);
      } else {
        // Try to parse content as JSON
        const parsed = JSON.parse(content);
        
        if (parsed.type) {
          setDetectedType(parsed.type);
        }
        
        if (Array.isArray(parsed)) {
          setData(parsed);
        } else if (parsed.data && Array.isArray(parsed.data)) {
          setData(parsed.data);
        } else {
          throw new Error('Invalid chart data format');
        }
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse chart data');
    }
  }, [content, chartData]);

  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-2 p-4 text-destructive', className)}>
        <AlertCircle className="h-5 w-5" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center p-8 text-muted-foreground', className)}>
        {t('noData')}
      </div>
    );
  }

  // Get all numeric keys for multi-series charts
  const numericKeys = Object.keys(data[0] || {}).filter(
    key => key !== 'name' && typeof data[0][key] === 'number'
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

/**
 * Generic Artifact Renderer - Routes to appropriate renderer based on type
 * Uses feature-rich renderers from chat/renderers for full functionality
 */
export function ArtifactRenderer({
  type,
  content,
  className,
  chartType,
  chartData,
}: {
  type: string;
  content: string;
  className?: string;
  chartType?: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'radar';
  chartData?: ChartDataPoint[];
}) {
  switch (type) {
    case 'mermaid':
      return <MermaidBlock content={content} className={className} />;
    case 'chart':
      return <ChartRenderer content={content} chartType={chartType} chartData={chartData} className={className} />;
    case 'math':
      return <MathBlock content={content} className={className} />;
    case 'document':
      return <ChatMarkdownRenderer content={content} className={className} />;
    case 'code':
      return <CodeBlock code={content} className={className} />;
    default:
      return <CodeBlock code={content} className={className} />;
  }
}

export default ArtifactRenderer;
