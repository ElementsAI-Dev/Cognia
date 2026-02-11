'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { SLIDE_LAYOUT_INFO } from '@/types/workflow';
import type { PPTSlide } from '@/types/workflow';

export interface EditorStatusBarProps {
  currentSlideIndex: number;
  slideCount: number;
  currentSlide: PPTSlide | null;
  isDirty: boolean;
  isGenerating: boolean;
}

export function EditorStatusBar({
  currentSlideIndex,
  slideCount,
  currentSlide,
  isDirty,
  isGenerating,
}: EditorStatusBarProps) {
  const t = useTranslations('pptEditor');

  return (
    <div className="flex items-center justify-between border-t px-4 py-1 text-xs text-muted-foreground bg-muted/30">
      <div className="flex items-center gap-4">
        <span>
          {t('slideOf', {
            current: currentSlideIndex + 1,
            total: slideCount,
          })}
        </span>
        <span>{SLIDE_LAYOUT_INFO[currentSlide?.layout || 'title-content'].name}</span>
      </div>
      <div className="flex items-center gap-4">
        {isDirty && <Badge variant="outline">{t('unsaved')}</Badge>}
        {isGenerating && (
          <div className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>{t('generating')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
