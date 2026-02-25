'use client';

import { useMemo, memo } from 'react';
import { cn } from '@/lib/utils';
import { SlideElementRenderer } from './slide-element-renderer';
import { calculateOptimalFontSize } from '../utils';
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
export const SlideContent = memo(function SlideContent({
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

  // Calculate optimal font size for long content to prevent overflow
  const contentFontSize = useMemo(() => {
    if (!slide.content || slide.content.length < 100) return undefined;
    // Estimate container dimensions based on size
    const dims = { small: { w: 300, h: 150 }, medium: { w: 600, h: 300 }, large: { w: 800, h: 400 }, fullscreen: { w: 1000, h: 500 } };
    const d = dims[size];
    return calculateOptimalFontSize(slide.content, d.w, d.h);
  }, [slide.content, size]);

  // Shared renderers
  const renderTitle = (large = false) =>
    slide.title ? (
      <h2
        className={cn('font-bold mb-4', large ? styles.titleLarge : styles.title)}
        style={{ fontFamily: theme.headingFont, color: theme.primaryColor }}
      >
        {slide.title}
      </h2>
    ) : null;

  const renderSubtitle = (center = false) =>
    slide.subtitle ? (
      <h3
        className={cn('mb-4', styles.subtitle, center && 'text-center')}
        style={{ fontFamily: theme.bodyFont, color: theme.secondaryColor }}
      >
        {slide.subtitle}
      </h3>
    ) : null;

  const renderContent = () =>
    slide.content ? (
      <div
        className={cn('leading-relaxed mb-4', styles.content)}
        style={{ fontFamily: theme.bodyFont, ...(contentFontSize ? { fontSize: contentFontSize } : {}) }}
      >
        {slide.content}
      </div>
    ) : null;

  const renderBullets = (items?: string[]) => {
    const list = items || slide.bullets;
    return list && list.length > 0 ? (
      <ul className={styles.bullets} style={{ fontFamily: theme.bodyFont }}>
        {list.map((bullet, index) => (
          <li key={index} className="flex items-start gap-2">
            <span className={cn('rounded-full shrink-0', styles.bulletDot)} style={{ backgroundColor: theme.primaryColor }} />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    ) : null;
  };

  const renderElements = () =>
    slide.elements && slide.elements.length > 0 ? (
      <div className="relative flex-1 min-h-[100px]">
        {slide.elements.map((element, index) => (
          <SlideElementRenderer key={element.id} element={element} theme={theme} animationDelay={index} />
        ))}
      </div>
    ) : null;

  // Layout-specific rendering
  switch (slide.layout) {
    // Centered title layouts
    case 'title':
    case 'section':
      return (
        <div className={cn('h-full flex flex-col items-center justify-center text-center', styles.padding, className)}>
          {renderTitle(true)}
          {renderSubtitle(true)}
          {renderContent()}
          {renderElements()}
        </div>
      );

    // Closing slide
    case 'closing':
      return (
        <div className={cn('h-full flex flex-col items-center justify-center text-center', styles.padding, className)}>
          {renderTitle(true)}
          {renderSubtitle(true)}
          {slide.bullets && slide.bullets.length > 0 && (
            <div className="mt-4 space-y-2" style={{ fontFamily: theme.bodyFont, color: theme.secondaryColor }}>
              {slide.bullets.map((b, i) => <div key={i} className={styles.content}>{b}</div>)}
            </div>
          )}
          {renderElements()}
        </div>
      );

    // Two-column layout
    case 'two-column':
    case 'comparison': {
      const half = Math.ceil((slide.bullets?.length || 0) / 2);
      const leftBullets = slide.bullets?.slice(0, half);
      const rightBullets = slide.bullets?.slice(half);
      return (
        <div className={cn('h-full flex flex-col', styles.padding, className)}>
          {renderTitle()}
          {renderSubtitle()}
          <div className="flex-1 grid grid-cols-2 gap-4 mt-2">
            <div className="flex flex-col">
              {slide.layout === 'comparison' && leftBullets?.[0] && (
                <div className={cn('font-semibold mb-2', styles.subtitle)} style={{ color: theme.primaryColor }}>
                  {leftBullets[0]}
                </div>
              )}
              {renderBullets(slide.layout === 'comparison' ? leftBullets?.slice(1) : leftBullets)}
              {slide.content && (
                <div className={cn('leading-relaxed', styles.content)} style={{ fontFamily: theme.bodyFont }}>
                  {slide.content}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              {slide.layout === 'comparison' && rightBullets?.[0] && (
                <div className={cn('font-semibold mb-2', styles.subtitle)} style={{ color: theme.secondaryColor }}>
                  {rightBullets[0]}
                </div>
              )}
              {renderBullets(slide.layout === 'comparison' ? rightBullets?.slice(1) : rightBullets)}
            </div>
          </div>
          {renderElements()}
        </div>
      );
    }

    // Image layouts
    case 'image-left':
    case 'image-right': {
      const imageEl = slide.elements?.find((el) => el.type === 'image');
      const isLeft = slide.layout === 'image-left';
      return (
        <div className={cn('h-full flex flex-col', styles.padding, className)}>
          {renderTitle()}
          <div className={cn('flex-1 flex gap-4 mt-2', isLeft ? 'flex-row' : 'flex-row-reverse')}>
            <div className="w-2/5 flex items-center justify-center bg-muted/20 rounded-lg overflow-hidden">
              {imageEl ? (
                <SlideElementRenderer element={imageEl} theme={theme} />
              ) : (
                <div className="text-muted-foreground text-sm text-center p-4">
                  {slide.elements?.find((el) => el.type === 'icon')
                    ? <SlideElementRenderer element={slide.elements.find((el) => el.type === 'icon')!} theme={theme} />
                    : '🖼️'}
                </div>
              )}
            </div>
            <div className="w-3/5 flex flex-col justify-center">
              {renderSubtitle()}
              {renderContent()}
              {renderBullets()}
            </div>
          </div>
        </div>
      );
    }

    // Full background image
    case 'full-image':
      return (
        <div
          className={cn('h-full flex flex-col justify-end relative', styles.padding, className)}
          style={slide.backgroundImage ? {
            backgroundImage: `url(${slide.backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          } : {}}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="relative z-10">
            {slide.title && (
              <h2 className={cn('font-bold mb-2', styles.titleLarge)} style={{ fontFamily: theme.headingFont, color: '#FFFFFF' }}>
                {slide.title}
              </h2>
            )}
            {slide.subtitle && (
              <h3 className={cn(styles.subtitle)} style={{ fontFamily: theme.bodyFont, color: 'rgba(255,255,255,0.8)' }}>
                {slide.subtitle}
              </h3>
            )}
          </div>
          {renderElements()}
        </div>
      );

    // Quote layout
    case 'quote':
      return (
        <div className={cn('h-full flex flex-col items-center justify-center text-center', styles.padding, className)}>
          <div className="max-w-[80%]">
            <div className="text-6xl leading-none mb-4" style={{ color: theme.primaryColor, opacity: 0.3 }}>&ldquo;</div>
            {slide.content ? (
              <blockquote
                className={cn('italic leading-relaxed', styles.title)}
                style={{ fontFamily: theme.headingFont, color: theme.textColor }}
              >
                {slide.content}
              </blockquote>
            ) : slide.bullets?.[0] ? (
              <blockquote
                className={cn('italic leading-relaxed', styles.title)}
                style={{ fontFamily: theme.headingFont, color: theme.textColor }}
              >
                {slide.bullets[0]}
              </blockquote>
            ) : null}
            {slide.subtitle && (
              <div className={cn('mt-6', styles.subtitle)} style={{ color: theme.secondaryColor }}>
                — {slide.subtitle}
              </div>
            )}
            {slide.title && slide.title.toLowerCase() !== 'quote' && (
              <div className={cn('mt-2', styles.content)} style={{ color: theme.secondaryColor, opacity: 0.7 }}>
                {slide.title}
              </div>
            )}
          </div>
          {renderElements()}
        </div>
      );

    // Chart/Table layouts — title + elements area
    case 'chart':
    case 'table':
      return (
        <div className={cn('h-full flex flex-col', styles.padding, className)}>
          {renderTitle()}
          {renderSubtitle()}
          {slide.elements && slide.elements.length > 0 ? (
            <div className="relative flex-1 min-h-0 mt-2">
              {slide.elements.map((element, index) => (
                <SlideElementRenderer key={element.id} element={element} theme={theme} animationDelay={index} />
              ))}
            </div>
          ) : (
            <>
              {renderContent()}
              {renderBullets()}
            </>
          )}
        </div>
      );

    // Timeline layout
    case 'timeline':
      return (
        <div className={cn('h-full flex flex-col', styles.padding, className)}>
          {renderTitle()}
          {slide.bullets && slide.bullets.length > 0 ? (
            <div className="flex-1 flex items-center mt-4">
              <div className="relative w-full">
                <div className="absolute top-1/2 left-0 right-0 h-0.5" style={{ backgroundColor: theme.primaryColor, opacity: 0.3 }} />
                <div className="flex justify-between relative">
                  {slide.bullets.map((bullet, index) => (
                    <div key={index} className="flex flex-col items-center max-w-[120px] text-center">
                      <div
                        className="w-4 h-4 rounded-full mb-2 ring-4 ring-background z-10"
                        style={{ backgroundColor: theme.primaryColor }}
                      />
                      <span className={cn(styles.content, 'leading-tight')} style={{ fontFamily: theme.bodyFont }}>
                        {bullet}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {renderContent()}
              {renderElements()}
            </>
          )}
        </div>
      );

    // Default: title-content, bullets, numbered, blank
    default:
      return (
        <div className={cn('h-full flex flex-col justify-center', styles.padding, className)}>
          {renderTitle()}
          {renderSubtitle()}
          {renderContent()}
          {renderBullets()}
          {renderElements()}
        </div>
      );
  }
});

SlideContent.displayName = 'SlideContent';

export default SlideContent;
