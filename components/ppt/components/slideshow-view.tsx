'use client';

import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Minimize2 } from 'lucide-react';
import type { SlideshowViewProps } from '../types';

/**
 * SlideshowView - Full-screen slideshow presentation mode
 */
export function SlideshowView({
  presentation,
  currentIndex,
  onPrev,
  onNext,
  onExit,
}: SlideshowViewProps) {
  const slide = presentation.slides[currentIndex];
  const theme = presentation.theme;

  if (!slide) return null;

  return (
    <div
      className="flex-1 flex flex-col justify-center items-center p-8"
      style={{
        backgroundColor: slide.backgroundColor || theme.backgroundColor,
        color: theme.textColor,
      }}
      onClick={onNext}
    >
      {/* Exit button */}
      <button
        className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onExit();
        }}
      >
        <Minimize2 className="h-5 w-5" />
      </button>

      {/* Slide content */}
      <div className="max-w-5xl w-full">
        {slide.title && (
          <h1
            className={cn(
              'font-bold mb-6',
              slide.layout === 'title' || slide.layout === 'section'
                ? 'text-6xl text-center'
                : 'text-4xl'
            )}
            style={{
              fontFamily: theme.headingFont,
              color: theme.primaryColor,
            }}
          >
            {slide.title}
          </h1>
        )}

        {slide.subtitle && (
          <h2
            className={cn(
              'text-2xl mb-8',
              slide.layout === 'title' && 'text-center'
            )}
            style={{
              fontFamily: theme.bodyFont,
              color: theme.secondaryColor,
            }}
          >
            {slide.subtitle}
          </h2>
        )}

        {slide.content && (
          <div
            className="text-xl leading-relaxed mb-6"
            style={{ fontFamily: theme.bodyFont }}
          >
            {slide.content}
          </div>
        )}

        {slide.bullets && slide.bullets.length > 0 && (
          <ul className="space-y-4 text-xl" style={{ fontFamily: theme.bodyFont }}>
            {slide.bullets.map((bullet, index) => (
              <li key={index} className="flex items-start gap-3">
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

      {/* Navigation */}
      <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4">
        <button
          className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors disabled:opacity-30"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <span className="text-white/80 text-sm">
          {currentIndex + 1} / {presentation.slides.length}
        </span>
        <button
          className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors disabled:opacity-30"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          disabled={currentIndex === presentation.slides.length - 1}
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}

export default SlideshowView;
