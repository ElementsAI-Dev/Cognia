'use client';

/**
 * Artifact Renderers - Specialized renderers for different artifact types
 *
 * This module provides a unified interface for artifact rendering by:
 * 1. Re-exporting feature-rich renderers from chat/renderers for consistency
 * 2. Lazy-loading ChartRenderer (unique to artifacts, ~200KB recharts bundle)
 * 3. Maintaining backward-compatible API through wrapper components
 *
 * Supports: Mermaid diagrams, Charts (Recharts), Math (KaTeX), Markdown, Code
 */

import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import { MermaidBlock } from '@/components/chat/renderers/mermaid-block';
import { MathBlock } from '@/components/chat/renderers/math-block';
import { CodeBlock } from '@/components/chat/renderers/code-block';
import { MarkdownRenderer as ChatMarkdownRenderer } from '@/components/chat/utils';
import type { ChartDataPoint } from './chart-renderer';

// Lazy-load ChartRenderer to avoid loading ~200KB recharts in initial bundle
const LazyChartRenderer = lazy(() => import('./chart-renderer').then(m => ({ default: m.ChartRenderer })));

// Re-export feature-rich renderers from chat/renderers for unified usage
// These provide full functionality: fullscreen, copy, export, etc.
export { MermaidBlock as MermaidRenderer } from '@/components/chat/renderers/mermaid-block';
export { MathBlock as MathRenderer } from '@/components/chat/renderers/math-block';
export { CodeBlock as CodeRenderer } from '@/components/chat/renderers/code-block';

// Re-export MarkdownRenderer from chat module for full markdown support
export { MarkdownRenderer } from '@/components/chat/utils';

// Re-export ChartRenderer type for consumers
export type { ChartDataPoint } from './chart-renderer';

function ChartLoading() {
  return (
    <div className="flex items-center justify-center h-[300px] w-full">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/**
 * ChartRenderer - Lazy-loaded wrapper around the recharts-based chart renderer
 */
export function ChartRenderer(props: {
  content: string;
  className?: string;
  chartType?: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'radar';
  chartData?: ChartDataPoint[];
}) {
  return (
    <Suspense fallback={<ChartLoading />}>
      <LazyChartRenderer {...props} />
    </Suspense>
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
      return (
        <ChartRenderer
          content={content}
          chartType={chartType}
          chartData={chartData}
          className={className}
        />
      );
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
