'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  // Use persisted settings from store
  const { slideshowSettings, updateSlideshowSettings } = usePPTEditorStore();
  const [settings, setSettings] = useState<SlideshowSettings>(slideshowSettings);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
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

  // Handle slide navigation with transitions
  const navigateWithTransition = useCallback((direction: 'prev' | 'next' | number) => {
    if (isTransitioning) return;
    
    if (settings.enableTransitions) {
      setIsTransitioning(true);
      setTimeout(() => {
        if (typeof direction === 'number') {
          onGoToSlide?.(direction);
        } else if (direction === 'prev') {
          onPrev();
        } else {
          onNext();
        }
        setTimeout(() => setIsTransitioning(false), 50);
      }, settings.transitionDuration / 2);
    } else {
      if (typeof direction === 'number') {
        onGoToSlide?.(direction);
      } else if (direction === 'prev') {
        onPrev();
      } else {
        onNext();
      }
    }
  }, [isTransitioning, settings.enableTransitions, settings.transitionDuration, onPrev, onNext, onGoToSlide]);

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

  // Transition styles
  const getTransitionStyle = () => {
    if (!settings.enableTransitions) return {};
    
    const baseStyle = {
      transition: `all ${settings.transitionDuration}ms ease-in-out`,
    };

    if (isTransitioning) {
      switch (settings.transitionType) {
        case 'fade':
          return { ...baseStyle, opacity: 0 };
        case 'slide':
          return { ...baseStyle, transform: 'translateX(-100%)', opacity: 0 };
        case 'zoom':
          return { ...baseStyle, transform: 'scale(0.9)', opacity: 0 };
        default:
          return baseStyle;
      }
    }
    return { ...baseStyle, opacity: 1, transform: 'translateX(0) scale(1)' };
  };

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
          'flex-1 flex flex-col justify-center items-center p-8 cursor-pointer',
          settings.showThumbnails && 'ml-32',
          settings.showNotes && 'mr-80'
        )}
        style={{
          backgroundColor: slide.backgroundColor || theme.backgroundColor,
          color: theme.textColor,
          ...getTransitionStyle(),
        }}
        onClick={handleSlideClick}
      >
        <div className="max-w-5xl w-full">
          <SlideContent
            slide={slide}
            theme={theme}
            size="fullscreen"
            className="p-0"
          />
        </div>
      </div>

      {/* Speaker notes panel */}
      {settings.showNotes && (
        <div className="absolute right-0 top-0 bottom-16 w-80 bg-black/80 backdrop-blur-sm text-white p-4 overflow-y-auto z-10">
          <div className="text-xs uppercase tracking-wider text-white/60 mb-2">演讲者备注</div>
          <div className="text-sm leading-relaxed">
            {slide.notes || <span className="text-white/40 italic">暂无备注</span>}
          </div>
          
          {/* Next slide preview */}
          {currentIndex < totalSlides - 1 && (
            <div className="mt-6 pt-4 border-t border-white/20">
              <div className="text-xs uppercase tracking-wider text-white/60 mb-2">下一张</div>
              <div className="text-sm font-medium text-white/80">
                {presentation.slides[currentIndex + 1]?.title || '无标题'}
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
