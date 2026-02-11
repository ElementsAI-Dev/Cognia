'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { ThumbnailNavigator } from './thumbnail-navigator';
import { SlideshowControls, KeyboardHelpModal } from './slideshow-controls';
import { PresenterMode } from './presenter-mode';
import { SlideContent } from '../rendering';
import { PPTPreviewErrorBoundary } from '../rendering/error-boundary';
import { DrawingOverlay, type PointerMode } from './drawing-overlay';
import { usePPTEditorStore } from '@/stores/tools/ppt-editor-store';
import type { SlideshowViewProps, SlideshowSettings } from '../types';

// Layout constants
const SLIDESHOW_LAYOUT = {
  THUMBNAIL_SIDEBAR_MARGIN: 'ml-32',
  NOTES_PANEL_WIDTH: 'w-80',
  NOTES_PANEL_MARGIN: 'mr-80',
  MIN_SWIPE_DISTANCE: 50,
} as const;

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
  const pendingNavigationRef = useRef<{ direction: 'prev' | 'next' | number } | null>(null);
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');
  const [showPresenterMode, setShowPresenterMode] = useState(false);
  const [pointerMode, setPointerMode] = useState<PointerMode>('none');
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

  // Execute the actual navigation (called after exit transition completes)
  const executeNavigation = useCallback((direction: 'prev' | 'next' | number) => {
    if (typeof direction === 'number') {
      onGoToSlide?.(direction);
    } else if (direction === 'prev') {
      onPrev();
    } else {
      onNext();
    }
  }, [onPrev, onNext, onGoToSlide]);

  // Handle CSS transitionEnd to drive animation phases
  const handleTransitionEnd = useCallback(() => {
    if (transitionPhase === 'exit' && pendingNavigationRef.current) {
      // Exit transition done — navigate and start enter phase
      executeNavigation(pendingNavigationRef.current.direction);
      pendingNavigationRef.current = null;
      setTransitionPhase('enter');
    } else if (transitionPhase === 'enter') {
      // Enter transition done — back to idle
      setTransitionPhase('idle');
    }
  }, [transitionPhase, executeNavigation]);

  // Handle slide navigation with transitions
  const navigateWithTransition = useCallback((direction: 'prev' | 'next' | number) => {
    if (isTransitioning) return;

    // Determine navigation direction for directional transitions
    const navDir = typeof direction === 'number'
      ? (direction > currentIndex ? 'next' : 'prev')
      : direction;
    setSlideDirection(navDir);
    
    if (settings.enableTransitions) {
      // Store pending navigation and start exit phase
      pendingNavigationRef.current = { direction };
      setTransitionPhase('exit');
    } else {
      executeNavigation(direction);
    }
  }, [isTransitioning, currentIndex, settings.enableTransitions, executeNavigation]);

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

  // Keyboard shortcuts (disabled when presenter mode is active — it has its own listener)
  useEffect(() => {
    if (showPresenterMode) return;

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
          break;
        case 'r':
        case 'R':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setShowPresenterMode(prev => !prev);
          }
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
          // Clear drawings handled by DrawingOverlay internally
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, totalSlides, settings.showThumbnails, settings.showNotes, onExit, navigateWithTransition, handleSettingsChange, showPresenterMode]);

  // Touch gesture support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SLIDESHOW_LAYOUT.MIN_SWIPE_DISTANCE) {
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

  if (!slide) return null;

  // Presenter mode - dual-panel view with notes and timer
  if (showPresenterMode) {
    return (
      <PresenterMode
        presentation={presentation}
        currentIndex={currentIndex}
        onPrev={onPrev}
        onNext={onNext}
        onGoToSlide={(index) => onGoToSlide?.(index)}
        onExit={() => setShowPresenterMode(false)}
      />
    );
  }

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
          settings.showThumbnails && SLIDESHOW_LAYOUT.THUMBNAIL_SIDEBAR_MARGIN,
          settings.showNotes && SLIDESHOW_LAYOUT.NOTES_PANEL_MARGIN,
          pointerMode === 'laser' && 'cursor-none',
          pointerMode === 'draw' && 'cursor-crosshair',
          pointerMode === 'none' && 'cursor-pointer'
        )}
        style={{
          backgroundColor: slide.backgroundColor || theme.backgroundColor,
          color: theme.textColor,
          ...getTransitionStyle(),
        }}
        onTransitionEnd={handleTransitionEnd}
        onClick={pointerMode === 'none' ? handleSlideClick : undefined}
      >
        <div className="max-w-5xl w-full">
          <PPTPreviewErrorBoundary>
            <SlideContent
              slide={slide}
              theme={theme}
              size="fullscreen"
              className="p-0"
            />
          </PPTPreviewErrorBoundary>
        </div>

        {/* Drawing & laser pointer overlay */}
        <DrawingOverlay pointerMode={pointerMode} />
      </div>

      {/* Speaker notes panel */}
      {settings.showNotes && (
        <div className={cn('absolute right-0 top-0 bottom-16 bg-black/80 backdrop-blur-sm text-white p-4 overflow-y-auto z-10', SLIDESHOW_LAYOUT.NOTES_PANEL_WIDTH)}>
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
        onTogglePresenterMode={() => setShowPresenterMode(true)}
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
