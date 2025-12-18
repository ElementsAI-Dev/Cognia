'use client';

/**
 * Artifact Renderers - Specialized renderers for different artifact types
 * Supports: Mermaid diagrams, Charts (Recharts), Math (KaTeX), Markdown
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import katex from 'katex';
import 'katex/dist/katex.min.css';
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
 * Mermaid Diagram Renderer
 */
export function MermaidRenderer({ content, className }: RendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const renderMermaid = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Dynamically import mermaid to avoid SSR issues
        const mermaid = (await import('mermaid')).default;
        
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        });

        const id = `mermaid-${Date.now()}`;
        const { svg: renderedSvg } = await mermaid.render(id, content);
        
        if (mounted) {
          setSvg(renderedSvg);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
          setIsLoading(false);
        }
      }
    };

    renderMermaid();

    return () => {
      mounted = false;
    };
  }, [content]);

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <div className="animate-pulse text-muted-foreground">Loading diagram...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-2 p-4 text-destructive', className)}>
        <AlertCircle className="h-5 w-5" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('flex items-center justify-center overflow-auto p-4', className)}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/**
 * Chart Renderer using Recharts
 */
export function ChartRenderer({ content, chartType = 'line', chartData, className }: ChartRendererProps) {
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
        No data to display
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
 * Math/LaTeX Renderer using KaTeX
 */
export function MathRenderer({ content, className }: RendererProps) {
  const result = useMemo(() => {
    try {
      // Check if content is display mode (wrapped in $$ or contains newlines)
      const isDisplayMode = content.startsWith('$$') || content.includes('\n');
      const cleanContent = content.replace(/^\$\$|\$\$$/g, '').trim();

      const rendered = katex.renderToString(cleanContent, {
        displayMode: isDisplayMode,
        throwOnError: false,
        trust: true,
        strict: false,
      });

      return { html: rendered, error: null };
    } catch (err) {
      return { html: '', error: err instanceof Error ? err.message : 'Failed to render math' };
    }
  }, [content]);

  if (result.error) {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-2 p-4 text-destructive', className)}>
        <AlertCircle className="h-5 w-5" />
        <p className="text-sm">{result.error}</p>
        <pre className="text-xs text-muted-foreground">{content}</pre>
      </div>
    );
  }

  return (
    <div
      className={cn('flex items-center justify-center overflow-auto p-4', className)}
      dangerouslySetInnerHTML={{ __html: result.html }}
    />
  );
}

/**
 * Markdown Document Renderer
 */
export function MarkdownRenderer({ content, className }: RendererProps) {
  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none p-4', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          code({ className: codeClassName, children, ...props }) {
            const match = /language-(\w+)/.exec(codeClassName || '');
            const isInline = !match;
            
            if (isInline) {
              return (
                <code className="rounded bg-muted px-1.5 py-0.5 text-sm" {...props}>
                  {children}
                </code>
              );
            }

            return (
              <pre className="overflow-auto rounded-lg bg-muted p-4">
                <code className={codeClassName} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-auto">
                <table className="min-w-full border-collapse">{children}</table>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/**
 * Code Renderer with syntax highlighting fallback
 */
export function CodeRenderer({ content, className }: RendererProps) {
  return (
    <pre className={cn('overflow-auto rounded-lg bg-muted p-4 text-sm', className)}>
      <code>{content}</code>
    </pre>
  );
}

/**
 * Generic Artifact Renderer - Routes to appropriate renderer based on type
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
      return <MermaidRenderer content={content} className={className} />;
    case 'chart':
      return <ChartRenderer content={content} chartType={chartType} chartData={chartData} className={className} />;
    case 'math':
      return <MathRenderer content={content} className={className} />;
    case 'document':
      return <MarkdownRenderer content={content} className={className} />;
    default:
      return <CodeRenderer content={content} className={className} />;
  }
}

export default ArtifactRenderer;
