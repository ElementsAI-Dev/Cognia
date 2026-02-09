'use client';

import { useState, useEffect, useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { ThumbnailNavigator } from './thumbnail-navigator';
import { SlideshowControls, KeyboardHelpModal } from './slideshow-controls';
import { SlideContent } from '../rendering';
import { usePPTEditorStore } from '@/stores/tools/ppt-editor-store';
import type { SlideshowViewProps, SlideshowSettings } from '../types';

/**
 * SlideshowView - Enhanced full-screen slideshow presentation mode
 * Features: thumbnail navigation, progress bar, auto-play, transitions, speaker notes
 */
export function SlideshowView({
  presentation,
  currentIndex,
  onPrev,
  onNext,
  onExit,
  onGoToSlide,
}: SlideshowViewProps) {
  const t = useTranslations('pptSlideshow');
  // Use persisted settings from store
  const { slideshowSettings, updateSlideshowSettings } = usePPTEditorStore();
  const [settings, setSettings] = useState<SlideshowSettings>(slideshowSettings);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [transitionPhase, setTransitionPhase] = useState<'idle' | 'exit' | 'enter'>('idle');
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');
  const [pointerMode, setPointerMode] = useState<'none' | 'laser' | 'draw'>('none');
  const [laserPos, setLaserPos] = useState<{ x: number; y: number } | null>(null);
  const [drawingStrokes, setDrawingStrokes] = useState<Array<{ x: number; y: number }[]>>([]);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const slide = presentation.slides[currentIndex];
  const theme = presentation.theme;
  const totalSlides = presentation.slides.length;

  // Handle settings change - update local state and persist to store
  const handleSettingsChange = useCallback((newSettings: Partial<SlideshowSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      // Persist to store for next session
      updateSlideshowSettings(updated);
      return updated;
    });
  }, [updateSlideshowSettings]);

  const isTransitioning = transitionPhase !== 'idle';

  // Clear drawings when navigating
  const clearDrawings = useCallback(() => {
    setDrawingStrokes([]);
    currentStrokeRef.current = [];
  }, []);

  // Handle slide navigation with transitions
  const navigateWithTransition = useCallback((direction: 'prev' | 'next' | number) => {
    if (isTransitioning) return;

    // Clear annotations on slide change
    clearDrawings();

    // Determine navigation direction for directional transitions
    const navDir = typeof direction === 'number'
      ? (direction > currentIndex ? 'next' : 'prev')
      : direction;
    setSlideDirection(navDir);
    
    if (settings.enableTransitions) {
      // Phase 1: Exit animation
      setTransitionPhase('exit');
      const halfDuration = Math.max(settings.transitionDuration / 2, 100);

      setTimeout(() => {
        // Navigate to new slide
        if (typeof direction === 'number') {
          onGoToSlide?.(direction);
        } else if (direction === 'prev') {
          onPrev();
        } else {
          onNext();
        }
        // Phase 2: Enter animation
        setTransitionPhase('enter');

        setTimeout(() => {
          setTransitionPhase('idle');
        }, halfDuration);
      }, halfDuration);
    } else {
      if (typeof direction === 'number') {
        onGoToSlide?.(direction);
      } else if (direction === 'prev') {
        onPrev();
      } else {
        onNext();
      }
    }
  }, [isTransitioning, currentIndex, settings.enableTransitions, settings.transitionDuration, onPrev, onNext, onGoToSlide, clearDrawings]);

  // Auto-play functionality
  useEffect(() => {
    if (isPlaying && settings.autoPlay) {
      autoPlayRef.current = setInterval(() => {
        if (currentIndex < totalSlides - 1) {
          navigateWithTransition('next');
        } else {
          setIsPlaying(false);
        }
      }, settings.autoPlayInterval * 1000);
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isPlaying, settings.autoPlay, settings.autoPlayInterval, currentIndex, totalSlides, navigateWithTransition]);

  // Elapsed time counter
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          if (currentIndex > 0) navigateWithTransition('prev');
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
          e.preventDefault();
          if (currentIndex < totalSlides - 1) navigateWithTransition('next');
          break;
        case 'Home':
          e.preventDefault();
          navigateWithTransition(0);
          break;
        case 'End':
          e.preventDefault();
          navigateWithTransition(totalSlides - 1);
          break;
        case 'Escape':
          e.preventDefault();
          onExit();
          break;
        case 'f':
        case 'F':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else {
              containerRef.current?.requestFullscreen();
            }
          }
          break;
        case 't':
        case 'T':
          e.preventDefault();
          handleSettingsChange({ showThumbnails: !settings.showThumbnails });
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          handleSettingsChange({ showNotes: !settings.showNotes });
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          setIsPlaying(prev => !prev);
          break;
        case '?':
        case 'h':
        case 'H':
          e.preventDefault();
          setShowKeyboardHelp(prev => !prev);
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          setPointerMode(prev => prev === 'laser' ? 'none' : 'laser');
          setLaserPos(null);
          break;
        case 'd':
        case 'D':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setPointerMode(prev => prev === 'draw' ? 'none' : 'draw');
          }
          break;
        case 'c':
        case 'C':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setDrawingStrokes([]);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, totalSlides, settings.showThumbnails, settings.showNotes, onExit, navigateWithTransition, handleSettingsChange]);

  // Touch gesture support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    const minSwipeDistance = 50;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0 && currentIndex > 0) {
        navigateWithTransition('prev');
      } else if (deltaX < 0 && currentIndex < totalSlides - 1) {
        navigateWithTransition('next');
      }
    }
    touchStartRef.current = null;
  }, [currentIndex, totalSlides, navigateWithTransition]);

  // Handle slide click for navigation
  const handleSlideClick = useCallback((e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isRightSide = clickX > rect.width / 2;
    
    if (isRightSide && currentIndex < totalSlides - 1) {
      navigateWithTransition('next');
    } else if (!isRightSide && currentIndex > 0) {
      navigateWithTransition('prev');
    }
  }, [currentIndex, totalSlides, navigateWithTransition]);

  // Transition styles - supports exit and enter phases with direction
  const getTransitionStyle = (): React.CSSProperties => {
    if (!settings.enableTransitions) return {};

    const halfDuration = Math.max(settings.transitionDuration / 2, 100);
    const base: React.CSSProperties = {
      transition: `all ${halfDuration}ms cubic-bezier(0.4,0,0.2,1)`,
    };
    const isNext = slideDirection === 'next';

    if (transitionPhase === 'exit') {
      switch (settings.transitionType) {
        case 'fade':
          return { ...base, opacity: 0 };
        case 'slide':
          return { ...base, transform: `translateX(${isNext ? '-8%' : '8%'})`, opacity: 0 };
        case 'zoom':
          return { ...base, transform: 'scale(0.85)', opacity: 0 };
        default:
          return { ...base, opacity: 0 };
      }
    }

    if (transitionPhase === 'enter') {
      switch (settings.transitionType) {
        case 'fade':
          return { ...base, opacity: 1 };
        case 'slide':
          return { ...base, transform: 'translateX(0)', opacity: 1 };
        case 'zoom':
          return { ...base, transform: 'scale(1)', opacity: 1 };
        default:
          return { ...base, opacity: 1 };
      }
    }

    // Idle
    return { opacity: 1, transform: 'translateX(0) scale(1)' };
  };

  // Redraw canvas when strokes change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
    canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of drawingStrokes) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    }
  }, [drawingStrokes]);

  // Pointer handlers for laser and drawing
  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerMode === 'laser') {
      const rect = e.currentTarget.getBoundingClientRect();
      setLaserPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
    if (pointerMode === 'draw' && isDrawingRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      currentStrokeRef.current = [...currentStrokeRef.current, pt];
      setDrawingStrokes(prev => [...prev.slice(0, -1), [...currentStrokeRef.current]]);
    }
  }, [pointerMode]);

  const handlePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerMode === 'draw') {
      e.preventDefault();
      isDrawingRef.current = true;
      const rect = e.currentTarget.getBoundingClientRect();
      const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      currentStrokeRef.current = [pt];
      setDrawingStrokes(prev => [...prev, [pt]]);
    }
  }, [pointerMode]);

  const handlePointerUp = useCallback(() => {
    if (pointerMode === 'draw') {
      isDrawingRef.current = false;
      currentStrokeRef.current = [];
    }
  }, [pointerMode]);

  const handlePointerLeave = useCallback(() => {
    if (pointerMode === 'laser') setLaserPos(null);
    if (pointerMode === 'draw') {
      isDrawingRef.current = false;
      currentStrokeRef.current = [];
    }
  }, [pointerMode]);

  if (!slide) return null;

  return (
    <div
      ref={containerRef}
      className="flex-1 flex relative overflow-hidden"
      style={{ backgroundColor: theme.backgroundColor }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Thumbnail sidebar */}
      {settings.showThumbnails && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 max-h-[80vh]">
          <ThumbnailNavigator
            slides={presentation.slides}
            theme={theme}
            currentIndex={currentIndex}
            onSelect={(index) => navigateWithTransition(index)}
            orientation="vertical"
            size="medium"
          />
        </div>
      )}

      {/* Main slide content */}
      <div
        className={cn(
          'flex-1 flex flex-col justify-center items-center p-8 relative',
          settings.showThumbnails && 'ml-32',
          settings.showNotes && 'mr-80',
          pointerMode === 'laser' && 'cursor-none',
          pointerMode === 'draw' && 'cursor-crosshair',
          pointerMode === 'none' && 'cursor-pointer'
        )}
        style={{
          backgroundColor: slide.backgroundColor || theme.backgroundColor,
          color: theme.textColor,
          ...getTransitionStyle(),
        }}
        onClick={pointerMode === 'none' ? handleSlideClick : undefined}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      >
        <div className="max-w-5xl w-full">
          <SlideContent
            slide={slide}
            theme={theme}
            size="fullscreen"
            className="p-0"
          />
        </div>

        {/* Drawing annotation canvas */}
        {(pointerMode === 'draw' || drawingStrokes.length > 0) && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-30"
          />
        )}

        {/* Laser pointer dot */}
        {pointerMode === 'laser' && laserPos && (
          <div
            className="absolute z-30 pointer-events-none"
            style={{
              left: laserPos.x - 8,
              top: laserPos.y - 8,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: 'radial-gradient(circle, #EF4444 0%, #EF444480 50%, transparent 70%)',
              boxShadow: '0 0 12px 4px #EF444460',
            }}
          />
        )}

        {/* Pointer mode indicator */}
        {pointerMode !== 'none' && (
          <div className="absolute top-4 right-4 z-30 flex items-center gap-2 bg-black/60 text-white px-3 py-1.5 rounded-full text-xs">
            <div className={cn('w-2 h-2 rounded-full', pointerMode === 'laser' ? 'bg-red-500' : 'bg-yellow-400')} />
            {pointerMode === 'laser' ? t('laserPointer') || 'Laser (L)' : t('drawMode') || 'Draw (D)'}
            {pointerMode === 'draw' && drawingStrokes.length > 0 && (
              <button
                className="ml-1 text-white/70 hover:text-white underline"
                onClick={(e) => { e.stopPropagation(); setDrawingStrokes([]); }}
              >
                {t('clear') || 'Clear (C)'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Speaker notes panel */}
      {settings.showNotes && (
        <div className="absolute right-0 top-0 bottom-16 w-80 bg-black/80 backdrop-blur-sm text-white p-4 overflow-y-auto z-10">
          <div className="text-xs uppercase tracking-wider text-white/60 mb-2">{t('speakerNotes')}</div>
          <div className="text-sm leading-relaxed">
            {slide.notes || <span className="text-white/40 italic">{t('noNotes')}</span>}
          </div>
          
          {/* Next slide preview */}
          {currentIndex < totalSlides - 1 && (
            <div className="mt-6 pt-4 border-t border-white/20">
              <div className="text-xs uppercase tracking-wider text-white/60 mb-2">{t('nextSlide')}</div>
              <div className="text-sm font-medium text-white/80">
                {presentation.slides[currentIndex + 1]?.title || t('noTitle')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <SlideshowControls
        currentIndex={currentIndex}
        totalSlides={totalSlides}
        settings={settings}
        isPlaying={isPlaying}
        elapsedTime={elapsedTime}
        onPrev={() => navigateWithTransition('prev')}
        onNext={() => navigateWithTransition('next')}
        onExit={onExit}
        onTogglePlay={() => {
          setIsPlaying(prev => !prev);
          if (!settings.autoPlay) {
            handleSettingsChange({ autoPlay: true });
          }
        }}
        onToggleThumbnails={() => handleSettingsChange({ showThumbnails: !settings.showThumbnails })}
        onToggleNotes={() => handleSettingsChange({ showNotes: !settings.showNotes })}
        onSettingsChange={handleSettingsChange}
        onShowKeyboardHelp={() => setShowKeyboardHelp(true)}
      />

      {/* Keyboard help modal */}
      <KeyboardHelpModal
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />
    </div>
  );
}

export default SlideshowView;
