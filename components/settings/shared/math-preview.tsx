'use client';

/**
 * MathPreview - Live preview component for math rendering settings
 * Shows how LaTeX/KaTeX will render with current settings
 */

import { useMemo } from 'react';
import { renderMathSafe } from '@/lib/latex/cache';
import type { MathDisplayAlignment } from '@/types/settings/chat';

interface MathPreviewProps {
  scale: number;
  alignment: MathDisplayAlignment;
  previewLabel: string;
}

export function MathPreview({ scale, alignment, previewLabel }: MathPreviewProps) {
  const sampleMath = useMemo(() => {
    const result = renderMathSafe(
      'E = mc^2 \\quad \\text{and} \\quad \\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}',
      true
    );
    return result.html;
  }, []);

  return (
    <div className="p-3 rounded-lg border bg-muted/30">
      <p className="text-xs text-muted-foreground mb-2">{previewLabel}</p>
      <div
        className="overflow-x-auto py-1"
        style={{
          fontSize: `${scale}em`,
          textAlign: alignment,
        }}
        dangerouslySetInnerHTML={{ __html: sampleMath }}
      />
    </div>
  );
}

export default MathPreview;
