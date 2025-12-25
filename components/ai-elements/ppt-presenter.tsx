'use client';

/**
 * PPT Presenter - Full screen presentation mode
 * Supports keyboard navigation, pointer, and timer
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import type { PPTPresentation, PPTSlide } from '@/types/workflow';
import { SLIDE_LAYOUT_INFO } from '@/types/workflow';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Timer,
  Pointer,
  Grid3X3,
} from 'lucide-react';

export interface PPTPresenterProps {
  presentation: PPTPresentation;
  startSlide?: number;
  onClose: () => void;
}

export function PPTPresenter({
  presentation,
  startSlide = 0,
  onClose,
}: PPTPresenterProps) {
  const [currentSlide, setCurrentSlide] = useState(startSlide);
  const [showControls, setShowControls] = useState(true);
  const [showOverview, setShowOverview] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [showPointer, setShowPointer] = useState(false);
  const [pointerPosition, setPointerPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const totalSlides = presentation.slides.length;
  const slide = presentation.slides[currentSlide];
  const theme = presentation.theme;

  // Timer
  useEffect(() => {
    if (!isTimerRunning) return;
    
    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Navigation
  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(Math.max(0, Math.min(totalSlides - 1, index)));
    setShowOverview(false);
  }, [totalSlides]);

  const goNext = useCallback(() => {
    goToSlide(currentSlide + 1);
  }, [currentSlide, goToSlide]);

  const goPrev = useCallback(() => {
    goToSlide(currentSlide - 1);
  }, [currentSlide, goToSlide]);

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
        case 'PageDown':
          e.preventDefault();
          goNext();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          goPrev();
          break;
        case 'Home':
          e.preventDefault();
          goToSlide(0);
          break;
        case 'End':
          e.preventDefault();
          goToSlide(totalSlides - 1);
          break;
        case 'Escape':
          e.preventDefault();
          if (showOverview) {
            setShowOverview(false);
          } else {
            onClose();
          }
          break;
        case 'g':
        case 'G':
          e.preventDefault();
          setShowOverview((prev) => !prev);
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          setShowPointer((prev) => !prev);
          break;
        case 't':
        case 'T':
          e.preventDefault();
          setIsTimerRunning((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, goToSlide, totalSlides, onClose, showOverview]);

  // Mouse move for controls visibility and pointer
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    if (showPointer && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPointerPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, [showPointer]);

  // Click to advance
  const handleClick = useCallback((e: React.MouseEvent) => {
    // Don't advance if clicking on controls
    if ((e.target as HTMLElement).closest('.presenter-controls')) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const clickX = e.clientX - rect.left;
    const halfWidth = rect.width / 2;
    
    if (clickX < halfWidth) {
      goPrev();
    } else {
      goNext();
    }
  }, [goNext, goPrev]);

  // Render slide content
  const renderSlideContent = (slideData: PPTSlide, isOverview = false) => {
    const _layoutInfo = SLIDE_LAYOUT_INFO[slideData.layout] || SLIDE_LAYOUT_INFO['title-content'];
    
    return (
      <div
        className={cn(
          'w-full h-full flex flex-col justify-center',
          isOverview ? 'p-2' : 'p-16'
        )}
        style={{
          backgroundColor: slideData.backgroundColor || theme.backgroundColor,
          color: theme.textColor,
          ...(slideData.backgroundImage && {
            backgroundImage: `url(${slideData.backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }),
        }}
      >
        {slideData.backgroundImage && (
          <div className="absolute inset-0 bg-black/30" />
        )}
        
        <div className="relative z-10">
          {slideData.title && (
            <h1
              className={cn(
                'font-bold mb-4',
                slideData.layout === 'title' || slideData.layout === 'section'
                  ? isOverview ? 'text-xs text-center' : 'text-6xl text-center'
                  : isOverview ? 'text-xs' : 'text-4xl'
              )}
              style={{
                fontFamily: theme.headingFont,
                color: theme.primaryColor,
              }}
            >
              {slideData.title}
            </h1>
          )}

          {slideData.subtitle && !isOverview && (
            <h2
              className={cn(
                'text-2xl mb-8',
                slideData.layout === 'title' && 'text-center'
              )}
              style={{
                fontFamily: theme.bodyFont,
                color: theme.secondaryColor,
              }}
            >
              {slideData.subtitle}
            </h2>
          )}

          {slideData.content && !isOverview && (
            <p
              className="text-xl leading-relaxed mb-6"
              style={{ fontFamily: theme.bodyFont }}
            >
              {slideData.content}
            </p>
          )}

          {slideData.bullets && slideData.bullets.length > 0 && !isOverview && (
            <ul className="space-y-4 text-xl" style={{ fontFamily: theme.bodyFont }}>
              {slideData.bullets.map((bullet, index) => (
                <li key={index} className="flex items-start gap-4">
                  <span
                    className="mt-2 h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: theme.primaryColor }}
                  />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  };

  const presenterContent = (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-black cursor-none"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    >
      {/* Main slide */}
      <div className="w-full h-full">
        {renderSlideContent(slide)}
      </div>

      {/* Laser pointer */}
      {showPointer && (
        <div
          className="absolute w-4 h-4 rounded-full bg-red-500 shadow-lg pointer-events-none"
          style={{
            left: pointerPosition.x - 8,
            top: pointerPosition.y - 8,
            boxShadow: '0 0 10px 5px rgba(239, 68, 68, 0.5)',
          }}
        />
      )}

      {/* Controls overlay */}
      <div
        className={cn(
          'presenter-controls absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0'
        )}
      >
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {/* Left: Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              disabled={currentSlide === 0}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <span className="text-white font-mono text-lg px-4">
              {currentSlide + 1} / {totalSlides}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              disabled={currentSlide === totalSlides - 1}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white"
              aria-label="Next slide"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          {/* Center: Timer */}
          <div className="flex items-center gap-2 text-white">
            <Timer className="h-5 w-5" />
            <span className="font-mono text-lg">{formatTime(elapsedTime)}</span>
          </div>

          {/* Right: Tools */}
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); setShowPointer((prev) => !prev); }}
              className={cn(
                'p-2 rounded-full text-white',
                showPointer ? 'bg-red-500' : 'bg-white/10 hover:bg-white/20'
              )}
              aria-label="Toggle pointer"
            >
              <Pointer className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowOverview(true); }}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
              aria-label="Show overview"
            >
              <Grid3X3 className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
              aria-label="Exit presentation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Keyboard hints */}
        <div className="text-center text-white/50 text-xs mt-2">
          Press <kbd className="px-1 py-0.5 bg-white/20 rounded">←</kbd> <kbd className="px-1 py-0.5 bg-white/20 rounded">→</kbd> to navigate • 
          <kbd className="px-1 py-0.5 bg-white/20 rounded ml-1">G</kbd> for overview • 
          <kbd className="px-1 py-0.5 bg-white/20 rounded ml-1">P</kbd> for pointer • 
          <kbd className="px-1 py-0.5 bg-white/20 rounded ml-1">ESC</kbd> to exit
        </div>
      </div>

      {/* Slide overview grid */}
      {showOverview && (
        <div
          className="absolute inset-0 bg-black/90 z-10 p-8 overflow-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-2xl font-bold">Slide Overview</h2>
              <button
                onClick={() => setShowOverview(false)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {presentation.slides.map((s, index) => (
                <button
                  key={s.id}
                  onClick={() => goToSlide(index)}
                  className={cn(
                    'aspect-video rounded-lg overflow-hidden border-2 transition-all',
                    index === currentSlide
                      ? 'border-primary ring-2 ring-primary/50'
                      : 'border-white/20 hover:border-white/50'
                  )}
                >
                  {renderSlideContent(s, true)}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 text-center">
                    {index + 1}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Use portal to render at document root
  if (typeof window === 'undefined') return null;
  
  return createPortal(presenterContent, document.body);
}

export default PPTPresenter;
