'use client';

/**
 * TextPart - Renders text content with enhanced markdown support
 * Supports: Mermaid diagrams, LaTeX math, VegaLite charts
 */

import { useSettingsStore } from '@/stores/settings-store';
import { MarkdownRenderer } from '@/components/chat/markdown-renderer';
import { cn } from '@/lib/utils';
import type { TextPart as TextPartType } from '@/types/message';

interface TextPartProps {
  part: TextPartType;
  isError?: boolean;
}

export function TextPart({ part, isError }: TextPartProps) {
  const enableMathRendering = useSettingsStore((state) => state.enableMathRendering);
  const enableMermaidDiagrams = useSettingsStore((state) => state.enableMermaidDiagrams);
  const enableVegaLiteCharts = useSettingsStore((state) => state.enableVegaLiteCharts);
  const showLineNumbers = useSettingsStore((state) => state.showLineNumbers);

  return (
    <MarkdownRenderer
      content={part.content}
      className={cn(isError && 'text-destructive')}
      enableMath={enableMathRendering}
      enableMermaid={enableMermaidDiagrams}
      enableVegaLite={enableVegaLiteCharts}
      showLineNumbers={showLineNumbers}
    />
  );
}
