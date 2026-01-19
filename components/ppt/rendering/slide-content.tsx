'use client';

import { cn } from '@/lib/utils';
import { SlideElementRenderer } from './slide-element-renderer';
import type { PPTSlide, PPTTheme } from '@/types/workflow';

export interface SlideContentProps {
  slide: PPTSlide;
  theme: PPTTheme;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  className?: string;
}

/**
 * SlideContent - Reusable component for rendering slide content
 * Used by SingleSlideView, SlideshowView, and any other slide display contexts
 */
export function SlideContent({
  slide,
  theme,
  size = 'medium',
  className,
}: SlideContentProps) {
  // Size-based styling
  const sizeStyles = {
    small: {
      title: 'text-sm',
      titleLarge: 'text-base text-center',
      subtitle: 'text-xs',
      content: 'text-xs',
      bullets: 'text-xs space-y-1',
      bulletDot: 'mt-1.5 h-1 w-1',
      padding: 'p-2',
    },
    medium: {
      title: 'text-2xl',
      titleLarge: 'text-4xl text-center',
      subtitle: 'text-lg',
      content: 'text-base',
      bullets: 'text-base space-y-2',
      bulletDot: 'mt-2 h-2 w-2',
      padding: 'p-8',
    },
    large: {
      title: 'text-3xl',
      titleLarge: 'text-5xl text-center',
      subtitle: 'text-xl',
      content: 'text-lg',
      bullets: 'text-lg space-y-3',
      bulletDot: 'mt-2.5 h-2.5 w-2.5',
      padding: 'p-10',
    },
    fullscreen: {
      title: 'text-4xl',
      titleLarge: 'text-6xl text-center',
      subtitle: 'text-2xl',
      content: 'text-xl',
      bullets: 'text-xl space-y-4',
      bulletDot: 'mt-2 h-3 w-3',
      padding: 'p-8',
    },
  };

  const styles = sizeStyles[size];
  const isLargeTitle = slide.layout === 'title' || slide.layout === 'section';

  return (
    <div className={cn('h-full flex flex-col justify-center', styles.padding, className)}>
      {/* Title */}
      {slide.title && (
        <h2
          className={cn(
            'font-bold mb-4',
            isLargeTitle ? styles.titleLarge : styles.title
          )}
          style={{
            fontFamily: theme.headingFont,
            color: theme.primaryColor,
          }}
        >
          {slide.title}
        </h2>
      )}

      {/* Subtitle */}
      {slide.subtitle && (
        <h3
          className={cn(
            'mb-4',
            styles.subtitle,
            slide.layout === 'title' && 'text-center'
          )}
          style={{
            fontFamily: theme.bodyFont,
            color: theme.secondaryColor,
          }}
        >
          {slide.subtitle}
        </h3>
      )}

      {/* Content */}
      {slide.content && (
        <div
          className={cn('leading-relaxed mb-4', styles.content)}
          style={{ fontFamily: theme.bodyFont }}
        >
          {slide.content}
        </div>
      )}

      {/* Bullets */}
      {slide.bullets && slide.bullets.length > 0 && (
        <ul className={styles.bullets} style={{ fontFamily: theme.bodyFont }}>
          {slide.bullets.map((bullet, index) => (
            <li key={index} className="flex items-start gap-2">
              <span
                className={cn('rounded-full shrink-0', styles.bulletDot)}
                style={{ backgroundColor: theme.primaryColor }}
              />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Custom Elements */}
      {slide.elements && slide.elements.length > 0 && (
        <div className="relative mt-4 flex-1 min-h-[100px]">
          {slide.elements.map((element) => (
            <SlideElementRenderer
              key={element.id}
              element={element}
              theme={theme}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default SlideContent;
