'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Edit, Grid2X2, Grid3X3, LayoutGrid, FileText, Image as ImageIcon } from 'lucide-react';
import { SLIDE_LAYOUT_INFO } from '@/types/workflow';
import type { GridViewProps } from '../types';

type GridSize = 'small' | 'medium' | 'large';

/**
 * GridView - Enhanced slides grid layout with size options
 */
export function GridView({ slides, theme, currentIndex, onSelect, onEdit }: GridViewProps) {
  const t = useTranslations('pptPreview');
  const [gridSize, setGridSize] = useState<GridSize>('medium');
  
  const gridClasses = {
    small: 'grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2',
    medium: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4',
    large: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
  };

  const cardHeightClasses = {
    small: 'aspect-video',
    medium: 'aspect-video',
    large: 'aspect-[16/10]',
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Grid controls */}
      <div className="flex items-center justify-between px-2 py-1 border-b">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{t('slideCount', { count: slides.length })}</span>
          {currentIndex >= 0 && (
            <>
              <span>•</span>
              <span>{t('selectedSlide', { index: currentIndex + 1 })}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={gridSize === 'small' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setGridSize('small')}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('smallSize')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={gridSize === 'medium' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setGridSize('medium')}
                >
                  <Grid3X3 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('mediumSize')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={gridSize === 'large' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setGridSize('large')}
                >
                  <Grid2X2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('largeSize')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className={cn('grid p-3', gridClasses[gridSize])}>
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              onClick={() => onSelect(index)}
              className={cn(
                'rounded-lg border-2 overflow-hidden cursor-pointer transition-all hover:shadow-lg group relative',
                cardHeightClasses[gridSize],
                index === currentIndex
                  ? 'border-primary ring-2 ring-primary/20 shadow-md'
                  : 'border-border hover:border-primary/50'
              )}
              style={{
                backgroundColor: slide.backgroundColor || theme.backgroundColor,
                ...(slide.backgroundImage && {
                  backgroundImage: `url(${slide.backgroundImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }),
              }}
            >
              {/* Background overlay for images */}
              {slide.backgroundImage && (
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/30" />
              )}

              {/* Slide preview content */}
              <div className="relative p-3 h-full flex flex-col">
                {slide.title && (
                  <h4
                    className={cn(
                      'font-semibold truncate',
                      gridSize === 'small' ? 'text-[10px]' : gridSize === 'medium' ? 'text-xs' : 'text-sm'
                    )}
                    style={{ 
                      color: slide.backgroundImage ? '#fff' : theme.primaryColor,
                      textShadow: slide.backgroundImage ? '0 1px 2px rgba(0,0,0,0.5)' : 'none',
                    }}
                  >
                    {slide.title}
                  </h4>
                )}
                
                {slide.subtitle && gridSize !== 'small' && (
                  <p
                    className="text-[10px] text-muted-foreground truncate mt-0.5"
                    style={{ 
                      color: slide.backgroundImage ? 'rgba(255,255,255,0.8)' : undefined,
                    }}
                  >
                    {slide.subtitle}
                  </p>
                )}

                {slide.bullets && slide.bullets.length > 0 && gridSize !== 'small' && (
                  <ul className={cn(
                    'mt-1 text-muted-foreground space-y-0.5',
                    gridSize === 'medium' ? 'text-[9px]' : 'text-[10px]'
                  )}
                  style={{ 
                    color: slide.backgroundImage ? 'rgba(255,255,255,0.7)' : undefined,
                  }}
                  >
                    {slide.bullets.slice(0, gridSize === 'large' ? 4 : 2).map((bullet, i) => (
                      <li key={i} className="truncate flex items-start gap-1">
                        <span 
                          className="mt-1 h-1 w-1 rounded-full shrink-0"
                          style={{ backgroundColor: theme.primaryColor }}
                        />
                        {bullet}
                      </li>
                    ))}
                    {slide.bullets.length > (gridSize === 'large' ? 4 : 2) && (
                      <li className="opacity-50">
                        +{slide.bullets.length - (gridSize === 'large' ? 4 : 2)} {t('more', { count: 0 }).split(' ')[0]}...
                      </li>
                    )}
                  </ul>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Bottom info bar */}
                {gridSize !== 'small' && (
                  <div className="flex items-center gap-1 mt-1">
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        'text-[8px] px-1 py-0',
                        gridSize === 'large' && 'text-[10px] px-1.5'
                      )}
                    >
                      {SLIDE_LAYOUT_INFO[slide.layout]?.name?.slice(0, 8) || slide.layout}
                    </Badge>
                    {slide.notes && (
                      <FileText className="h-2.5 w-2.5 text-muted-foreground" />
                    )}
                    {(slide.backgroundImage || slide.elements?.some(e => e.type === 'image')) && (
                      <ImageIcon className="h-2.5 w-2.5 text-muted-foreground" />
                    )}
                  </div>
                )}
              </div>

              {/* Slide number badge */}
              <div 
                className={cn(
                  'absolute bottom-1 right-1 bg-background/90 rounded font-medium',
                  gridSize === 'small' ? 'text-[8px] px-1' : 'text-[10px] px-1.5 py-0.5'
                )}
                style={{ 
                  color: theme.primaryColor,
                }}
              >
                {index + 1}
              </div>

              {/* Selected indicator */}
              {index === currentIndex && (
                <div 
                  className="absolute top-1 left-1 w-2 h-2 rounded-full"
                  style={{ backgroundColor: theme.primaryColor }}
                />
              )}

              {/* Edit button on hover */}
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(index);
                  }}
                  className={cn(
                    'absolute top-1 right-1 rounded bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background',
                    gridSize === 'small' ? 'p-0.5' : 'p-1'
                  )}
                >
                  <Edit className={gridSize === 'small' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                </button>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export default GridView;
