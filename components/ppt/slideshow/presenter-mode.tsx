'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  FileText,
  Monitor,
} from 'lucide-react';
import { SlideContent } from '../rendering';
import type { PresenterModeProps } from '../types';

/**
 * PresenterMode - Dual-panel presenter view
 * Shows current slide, next slide preview, speaker notes, and timer
 */
export function PresenterMode({
  presentation,
  currentIndex,
  onPrev,
  onNext,
  onGoToSlide,
  onExit,
}: PresenterModeProps) {
  const t = useTranslations('pptEditor');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [slideTime, setSlideTime] = useState(0);
  const startTimeRef = useRef<number>(0);
  const slideStartRef = useRef<number>(0);

  const currentSlide = presentation.slides[currentIndex];
  const nextSlide = currentIndex < presentation.slides.length - 1
    ? presentation.slides[currentIndex + 1]
    : null;

  // Initialize timer refs on mount
  useEffect(() => {
    startTimeRef.current = Date.now();
    slideStartRef.current = Date.now();
  }, []);

  // Reset slide timer ref on slide change
  const slideResetFlag = useRef(false);
  useEffect(() => {
    slideResetFlag.current = true;
  }, [currentIndex]);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      if (slideResetFlag.current) {
        slideResetFlag.current = false;
        slideStartRef.current = now;
      }
      if (startTimeRef.current > 0) {
        setElapsedTime(Math.floor((now - startTimeRef.current) / 1000));
      }
      if (slideStartRef.current > 0) {
        setSlideTime(Math.floor((now - slideStartRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        onNext();
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        onPrev();
      }
      if (e.key === 'Escape') {
        onExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrev, onExit]);

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  if (!currentSlide) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Monitor className="h-4 w-4 text-zinc-400" />
          <span className="text-sm text-zinc-300 font-medium">
            {t('presenterMode') || 'Presenter Mode'}
          </span>
          <Badge variant="outline" className="text-xs text-zinc-400 border-zinc-700">
            {currentIndex + 1} / {presentation.slides.length}
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          {/* Timer */}
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-mono">{formatTime(elapsedTime)}</span>
            </div>
            <Separator orientation="vertical" className="h-4 bg-zinc-700" />
            <div className="text-zinc-500 text-xs">
              {t('slideTime') || 'Slide'}: <span className="font-mono">{formatTime(slideTime)}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-white h-7"
            onClick={onExit}
          >
            <X className="h-4 w-4 mr-1" />
            {t('exit') || 'Exit'}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Current slide (large) */}
        <div className="flex-[3] flex flex-col p-4">
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-[800px] aspect-video rounded-lg overflow-hidden shadow-2xl border border-zinc-800">
              <SlideContent slide={currentSlide} theme={presentation.theme} />
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-white"
              onClick={onPrev}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t('prev') || 'Previous'}
            </Button>
            <span className="text-sm text-zinc-500 font-mono">
              {currentIndex + 1} / {presentation.slides.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-white"
              onClick={onNext}
              disabled={currentIndex === presentation.slides.length - 1}
            >
              {t('next') || 'Next'}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Right: Next slide + Notes */}
        <div className="flex-[2] flex flex-col border-l border-zinc-800 bg-zinc-900/50">
          {/* Next slide preview */}
          <div className="p-4 pb-2">
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
              {t('nextSlide') || 'Next Slide'}
            </h3>
            {nextSlide ? (
              <div
                className="aspect-video rounded-md overflow-hidden border border-zinc-800 cursor-pointer hover:border-zinc-600 transition-colors"
                onClick={() => onGoToSlide(currentIndex + 1)}
              >
                <SlideContent slide={nextSlide} theme={presentation.theme} />
              </div>
            ) : (
              <div className="aspect-video rounded-md border border-zinc-800 flex items-center justify-center bg-zinc-900">
                <span className="text-sm text-zinc-600">{t('endOfPresentation') || 'End of Presentation'}</span>
              </div>
            )}
          </div>

          <Separator className="bg-zinc-800" />

          {/* Speaker notes */}
          <div className="flex-1 flex flex-col p-4 pt-3 min-h-0">
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText className="h-3 w-3" />
              {t('speakerNotes') || 'Speaker Notes'}
            </h3>
            <ScrollArea className="flex-1">
              {currentSlide.notes ? (
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {currentSlide.notes}
                </p>
              ) : (
                <p className="text-sm text-zinc-600 italic">
                  {t('noNotes') || 'No speaker notes for this slide'}
                </p>
              )}
            </ScrollArea>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Slide thumbnails */}
          <div className="p-3">
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
              {t('allSlides') || 'All Slides'}
            </h3>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {presentation.slides.map((slide, idx) => (
                <button
                  key={slide.id}
                  className={cn(
                    'shrink-0 w-16 aspect-video rounded border overflow-hidden transition-all',
                    idx === currentIndex
                      ? 'border-primary ring-1 ring-primary'
                      : 'border-zinc-800 hover:border-zinc-600 opacity-60 hover:opacity-100'
                  )}
                  onClick={() => onGoToSlide(idx)}
                >
                  <div className="w-full h-full" style={{ backgroundColor: slide.backgroundColor || presentation.theme.backgroundColor }}>
                    <div className="p-0.5 text-[3px] leading-tight truncate" style={{ color: presentation.theme.textColor }}>
                      {slide.title}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PresenterMode;
