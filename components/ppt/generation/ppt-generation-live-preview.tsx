'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProgressBar } from '@/components/ui/loading-states';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SlideContent } from '../rendering';
import type { PPTPresentation } from '@/types/workflow';
import type { PPTGenerationProgress } from '@/hooks/ppt/use-ppt-generation';

export interface PPTGenerationLivePreviewProps {
  presentation: PPTPresentation | null;
  progress: PPTGenerationProgress;
  onCancel: () => void;
  className?: string;
}

function SlideSkeleton() {
  return (
    <div className="aspect-video rounded-md border bg-muted/30 p-2 space-y-1.5">
      <Skeleton className="h-2.5 w-2/3" />
      <Skeleton className="h-2 w-1/2" />
      <div className="space-y-1 mt-2">
        <Skeleton className="h-1.5 w-full" />
        <Skeleton className="h-1.5 w-4/5" />
        <Skeleton className="h-1.5 w-3/5" />
      </div>
    </div>
  );
}

export function PPTGenerationLivePreview({
  presentation,
  progress,
  onCancel,
  className,
}: PPTGenerationLivePreviewProps) {
  const t = useTranslations('pptGenerator');

  const completedSlides = presentation?.slides ?? [];
  const totalSlides = progress.totalSlides || 10;
  const pendingCount = Math.max(0, totalSlides - completedSlides.length);
  const progressPercent =
    totalSlides > 0 ? (completedSlides.length / totalSlides) * 100 : 0;

  const currentSlide =
    completedSlides.length > 0
      ? completedSlides[completedSlides.length - 1]
      : null;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{t('livePreview')}</h3>
          <Badge variant="secondary" className="text-xs">
            {completedSlides.length}/{totalSlides}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-7 text-xs text-muted-foreground"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          {t('cancelGeneration')}
        </Button>
      </div>

      {/* Progress */}
      <ProgressBar
        progress={progressPercent}
        label={progress.message}
        showPercentage
      />

      {/* Main preview area */}
      <div className="grid grid-cols-[1fr_2fr] gap-4 min-h-[300px]">
        {/* Left: Thumbnail list */}
        <ScrollArea className="h-[350px]">
          <div className="space-y-2 pr-2">
            {completedSlides.map((slide, index) => (
              <div
                key={slide.id}
                className={cn(
                  'rounded-md border overflow-hidden transition-all',
                  index === completedSlides.length - 1
                    ? 'ring-2 ring-primary ring-offset-1'
                    : 'opacity-80'
                )}
              >
                <div className="relative">
                  <SlideContent
                    slide={slide}
                    theme={presentation!.theme}
                    size="small"
                  />
                  <div className="absolute bottom-0.5 left-1 text-[9px] text-muted-foreground bg-background/80 px-1 rounded">
                    {index + 1}
                  </div>
                </div>
              </div>
            ))}

            {/* Pending skeletons */}
            {Array.from({ length: pendingCount }).map((_, i) => (
              <SlideSkeleton key={`pending-${i}`} />
            ))}
          </div>
        </ScrollArea>

        {/* Right: Current slide enlarged */}
        <div className="flex items-center justify-center rounded-lg border bg-muted/10">
          {currentSlide && presentation ? (
            <div className="w-full max-w-md">
              <SlideContent
                slide={currentSlide}
                theme={presentation.theme}
                size="medium"
              />
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <Skeleton className="mx-auto h-32 w-48 rounded-lg" />
              <p className="mt-3 text-sm">{progress.message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PPTGenerationLivePreview;
