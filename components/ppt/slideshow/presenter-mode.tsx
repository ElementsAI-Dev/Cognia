'use client';

import { useState, useEffect, useCallback, useRef, type TouchEvent as ReactTouchEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Timer,
  FileText,
  Monitor,
  Settings2,
  AlertTriangle,
} from 'lucide-react';
import { SlideContent } from '../rendering';
import { PPTPreviewErrorBoundary } from '../rendering/error-boundary';
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
  const [timerMode, setTimerMode] = useState<'elapsed' | 'countdown'>('elapsed');
  const [countdownMinutes, setCountdownMinutes] = useState(30);
  const [countdownTotal, setCountdownTotal] = useState(30 * 60); // in seconds
  const startTimeRef = useRef<number>(0);
  const slideStartRef = useRef<number>(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

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
    const absSeconds = Math.abs(seconds);
    const m = Math.floor(absSeconds / 60);
    const s = absSeconds % 60;
    const sign = seconds < 0 ? '-' : '';
    return `${sign}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  // Countdown remaining time
  const countdownRemaining = countdownTotal - elapsedTime;
  const countdownPercent = countdownTotal > 0 ? Math.max(0, (countdownRemaining / countdownTotal) * 100) : 100;
  const isOvertime = countdownRemaining < 0;
  const isWarning = countdownRemaining >= 0 && countdownRemaining <= 120; // 2 min warning
  const isUrgent = countdownRemaining >= 0 && countdownRemaining <= 60; // 1 min urgent

  const handleSetCountdown = useCallback((minutes: number) => {
    const mins = Math.max(1, Math.min(180, minutes));
    setCountdownMinutes(mins);
    setCountdownTotal(mins * 60);
  }, []);

  const handleStartCountdown = useCallback(() => {
    setTimerMode('countdown');
    setCountdownTotal(countdownMinutes * 60);
    // Reset elapsed time to start fresh
    startTimeRef.current = Date.now();
    setElapsedTime(0);
  }, [countdownMinutes]);

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
            {timerMode === 'elapsed' ? (
              <div className="flex items-center gap-1.5 text-zinc-400">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-mono">{formatTime(elapsedTime)}</span>
              </div>
            ) : (
              <div className={cn(
                'flex items-center gap-1.5 font-mono',
                isOvertime && 'text-red-400 animate-pulse',
                isUrgent && !isOvertime && 'text-red-400',
                isWarning && !isUrgent && !isOvertime && 'text-amber-400',
                !isWarning && !isOvertime && 'text-emerald-400'
              )}>
                {isOvertime ? <AlertTriangle className="h-3.5 w-3.5" /> : <Timer className="h-3.5 w-3.5" />}
                <span>{formatTime(countdownRemaining)}</span>
                {/* Progress bar */}
                <div className="w-16 h-1.5 bg-zinc-700 rounded-full overflow-hidden ml-1">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-1000',
                      isOvertime && 'bg-red-500',
                      isUrgent && !isOvertime && 'bg-red-400',
                      isWarning && !isUrgent && !isOvertime && 'bg-amber-400',
                      !isWarning && !isOvertime && 'bg-emerald-400'
                    )}
                    style={{ width: `${Math.max(0, countdownPercent)}%` }}
                  />
                </div>
              </div>
            )}
            <Separator orientation="vertical" className="h-4 bg-zinc-700" />
            <div className="text-zinc-500 text-xs">
              {t('slideTime') || 'Slide'}: <span className="font-mono">{formatTime(slideTime)}</span>
            </div>
            <Separator orientation="vertical" className="h-4 bg-zinc-700" />

            {/* Timer settings */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-zinc-300">
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3" side="bottom" align="end">
                <div className="space-y-3">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('timerSettings') || 'Timer'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={timerMode === 'elapsed' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      onClick={() => setTimerMode('elapsed')}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {t('elapsed') || 'Elapsed'}
                    </Button>
                    <Button
                      variant={timerMode === 'countdown' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      onClick={() => setTimerMode('countdown')}
                    >
                      <Timer className="h-3 w-3 mr-1" />
                      {t('countdown') || 'Countdown'}
                    </Button>
                  </div>
                  {timerMode === 'countdown' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={180}
                          value={countdownMinutes}
                          onChange={(e) => setCountdownMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                          className="h-7 text-xs w-16"
                        />
                        <span className="text-xs text-muted-foreground">{t('minutes') || 'min'}</span>
                        <Button size="sm" className="h-7 text-xs ml-auto" onClick={handleStartCountdown}>
                          {t('start') || 'Start'}
                        </Button>
                      </div>
                      <div className="flex gap-1">
                        {[5, 10, 15, 20, 30, 45, 60].map(m => (
                          <Button
                            key={m}
                            variant="ghost"
                            size="sm"
                            className={cn('h-6 px-1.5 text-[10px]', countdownMinutes === m && 'bg-accent')}
                            onClick={() => handleSetCountdown(m)}
                          >
                            {m}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
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
      <div
        className="flex-1 flex overflow-hidden"
        onTouchStart={(e: ReactTouchEvent) => {
          touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={(e: ReactTouchEvent) => {
          if (!touchStartRef.current) return;
          const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
          const minSwipeDistance = 50;
          if (Math.abs(deltaX) > minSwipeDistance) {
            if (deltaX > 0 && currentIndex > 0) onPrev();
            else if (deltaX < 0 && currentIndex < presentation.slides.length - 1) onNext();
          }
          touchStartRef.current = null;
        }}
      >
        {/* Left: Current slide (large) */}
        <div className="flex-[3] flex flex-col p-4">
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-[800px] aspect-video rounded-lg overflow-hidden shadow-2xl border border-zinc-800">
              <PPTPreviewErrorBoundary>
                <SlideContent slide={currentSlide} theme={presentation.theme} />
              </PPTPreviewErrorBoundary>
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
                <PPTPreviewErrorBoundary>
                  <SlideContent slide={nextSlide} theme={presentation.theme} />
                </PPTPreviewErrorBoundary>
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
