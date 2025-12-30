'use client';

import { useState, useMemo, useEffect, useCallback, Component, type ReactNode, type ErrorInfo } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';
import type { PPTPresentation, PPTSlide, PPTSlideElement, PPTTheme } from '@/types/workflow';
import { SLIDE_LAYOUT_INFO, DEFAULT_PPT_THEMES } from '@/types/workflow';
import { generateMarpMarkdown } from '@/lib/ai/workflows/ppt-workflow';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  Eye,
  FileText,
  Grid3X3,
  LayoutTemplate,
  Maximize2,
  Minimize2,
  Palette,
  Presentation,
  Copy,
  Check,
} from 'lucide-react';

export type PPTExportFormat = 'marp' | 'html' | 'reveal' | 'pdf' | 'pptx';

export interface PPTPreviewProps {
  presentation: PPTPresentation;
  onEdit?: (slideIndex: number) => void;
  onExport?: (format: PPTExportFormat) => void;
  onThemeChange?: (themeId: string) => void;
  className?: string;
}

export function PPTPreview({
  presentation,
  onEdit,
  onExport,
  onThemeChange,
  className,
}: PPTPreviewProps) {
  const t = useTranslations('pptPreview');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'single' | 'grid' | 'outline'>('single');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const currentSlide = presentation.slides[currentSlideIndex];
  const totalSlides = presentation.slides.length;

  const marpContent = useMemo(() => {
    return generateMarpMarkdown(presentation);
  }, [presentation]);

  // Keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (viewMode !== 'single') return;
    
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
        break;
      case 'ArrowRight':
      case 'ArrowDown':
      case ' ': // Spacebar
        event.preventDefault();
        setCurrentSlideIndex((prev) => Math.min(totalSlides - 1, prev + 1));
        break;
      case 'Home':
        event.preventDefault();
        setCurrentSlideIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setCurrentSlideIndex(totalSlides - 1);
        break;
      case 'Escape':
        if (isFullscreen) {
          event.preventDefault();
          setIsFullscreen(false);
        }
        break;
      case 'f':
      case 'F':
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          setIsFullscreen((prev) => !prev);
        }
        break;
    }
  }, [viewMode, totalSlides, isFullscreen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const goToPrevSlide = () => {
    setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
  };

  const goToNextSlide = () => {
    setCurrentSlideIndex((prev) => Math.min(totalSlides - 1, prev + 1));
  };

  const goToSlide = (index: number) => {
    setCurrentSlideIndex(index);
  };

  const handleCopyMarp = async () => {
    await navigator.clipboard.writeText(marpContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async (format: PPTExportFormat) => {
    setIsExporting(true);
    setExportError(null);
    
    try {
      onExport?.(format);

      // Import the export function dynamically
      const { executePPTExport } = await import('@/lib/ai/tools/ppt-tool');
      
      const result = executePPTExport({
        presentation,
        format,
        includeNotes: true,
        includeAnimations: false,
        quality: 'high',
      });

      if (!result.success || !result.data) {
        setExportError(result.error || 'Export failed');
        console.error('Export failed:', result.error);
        return;
      }

      const { content, filename } = result.data as { content: string; filename: string };
      
      // For PDF and PPTX, open in new window (they have interactive download UI)
      if (format === 'pdf' || format === 'pptx') {
        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        return;
      }

      // For other formats, direct download
      const mimeType = format === 'marp' ? 'text/markdown' : 'text/html';
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      setExportError(errorMessage);
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <Card className={cn('flex flex-col', isFullscreen && 'fixed inset-0 z-50 rounded-none', className)}>
      {/* Header */}
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Presentation className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">{presentation.title}</CardTitle>
          <Badge variant="secondary">{t('slides', { count: totalSlides })}</Badge>
        </div>
        <div className="flex items-center gap-1">
          {/* View mode toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'single' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('single')}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('singleView')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('gridView')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'outline' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('outline')}
                >
                  <FileText className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('outlineView')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Theme selector with preview */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Palette className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto">
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">{t('basic')}</div>
              {DEFAULT_PPT_THEMES.slice(0, 6).map((theme) => (
                <ThemeMenuItem key={theme.id} theme={theme} onSelect={() => onThemeChange?.(theme.id)} />
              ))}
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2">{t('business')}</div>
              {DEFAULT_PPT_THEMES.slice(6, 9).map((theme) => (
                <ThemeMenuItem key={theme.id} theme={theme} onSelect={() => onThemeChange?.(theme.id)} />
              ))}
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2">{t('technology')}</div>
              {DEFAULT_PPT_THEMES.slice(9, 12).map((theme) => (
                <ThemeMenuItem key={theme.id} theme={theme} onSelect={() => onThemeChange?.(theme.id)} />
              ))}
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2">{t('education')}</div>
              {DEFAULT_PPT_THEMES.slice(12, 15).map((theme) => (
                <ThemeMenuItem key={theme.id} theme={theme} onSelect={() => onThemeChange?.(theme.id)} />
              ))}
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2">{t('creative')}</div>
              {DEFAULT_PPT_THEMES.slice(15, 18).map((theme) => (
                <ThemeMenuItem key={theme.id} theme={theme} onSelect={() => onThemeChange?.(theme.id)} />
              ))}
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2">{t('special')}</div>
              {DEFAULT_PPT_THEMES.slice(18).map((theme) => (
                <ThemeMenuItem key={theme.id} theme={theme} onSelect={() => onThemeChange?.(theme.id)} />
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('marp')}>
                📝 {t('exportMarp')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('html')}>
                🌐 {t('exportHtml')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('reveal')}>
                🎭 {t('exportReveal')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                📄 {t('savePdf')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pptx')}>
                📊 {t('downloadPptx')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Fullscreen toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isFullscreen ? t('exitFullscreen') : t('fullscreen')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col overflow-hidden p-4">
        {/* Export status indicators */}
        {isExporting && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-primary">{t('exporting')}</span>
          </div>
        )}
        
        {exportError && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            {exportError}
            <button 
              onClick={() => setExportError(null)}
              className="ml-2 text-xs underline hover:no-underline"
            >
              {t('dismiss')}
            </button>
          </div>
        )}

        {viewMode === 'single' && currentSlide && (
          <SingleSlideView
            slide={currentSlide}
            slideIndex={currentSlideIndex}
            totalSlides={totalSlides}
            theme={presentation.theme}
            onPrev={goToPrevSlide}
            onNext={goToNextSlide}
            onEdit={() => onEdit?.(currentSlideIndex)}
          />
        )}

        {viewMode === 'single' && !currentSlide && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            {t('noSlides')}
          </div>
        )}

        {viewMode === 'grid' && (
          <GridView
            slides={presentation.slides}
            theme={presentation.theme}
            currentIndex={currentSlideIndex}
            onSelect={goToSlide}
            onEdit={onEdit}
          />
        )}

        {viewMode === 'outline' && (
          <OutlineView
            presentation={presentation}
            marpContent={marpContent}
            onCopy={handleCopyMarp}
            copied={copied}
          />
        )}
      </CardContent>

      {/* Slide navigation (single view only) */}
      {viewMode === 'single' && (
        <div className="border-t p-2 flex items-center justify-center gap-2">
          <ScrollArea className="max-w-full">
            <div className="flex gap-1 px-2">
              {presentation.slides.map((slide, index) => (
                <button
                  key={slide.id}
                  onClick={() => goToSlide(index)}
                  className={cn(
                    'w-16 h-10 rounded border-2 flex items-center justify-center text-xs font-medium transition-all',
                    index === currentSlideIndex
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  )}
                  style={{
                    backgroundColor:
                      index === currentSlideIndex
                        ? presentation.theme.primaryColor + '20'
                        : undefined,
                  }}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </Card>
  );
}

// Element renderer for different slide element types
interface SlideElementRendererProps {
  element: PPTSlideElement;
  theme: PPTTheme;
}

function SlideElementRenderer({ element, theme }: SlideElementRendererProps) {
  const baseStyle: React.CSSProperties = {
    ...(element.position && {
      position: 'absolute',
      left: `${element.position.x}%`,
      top: `${element.position.y}%`,
      width: `${element.position.width}%`,
      height: `${element.position.height}%`,
    }),
    ...element.style,
  };

  switch (element.type) {
    case 'text':
      return (
        <div style={{ ...baseStyle, fontFamily: theme.bodyFont }}>
          {element.content}
        </div>
      );

    case 'image':
      return (
        <div style={baseStyle} className="flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={element.content}
            alt={element.metadata?.alt as string || 'Slide image'}
            className="max-w-full max-h-full object-contain rounded"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>';
            }}
          />
        </div>
      );

    case 'code':
      return (
        <pre
          style={{
            ...baseStyle,
            fontFamily: theme.codeFont,
            backgroundColor: 'rgba(0,0,0,0.05)',
            padding: '1rem',
            borderRadius: '0.5rem',
            overflow: 'auto',
          }}
          className="text-sm"
        >
          <code>{element.content}</code>
        </pre>
      );

    case 'shape':
      const shapeType = element.metadata?.shape as string || 'rectangle';
      return (
        <div
          style={{
            ...baseStyle,
            backgroundColor: element.style?.backgroundColor || theme.primaryColor,
            borderRadius: shapeType === 'circle' ? '50%' : shapeType === 'rounded' ? '0.5rem' : '0',
          }}
        />
      );

    case 'chart':
      return (
        <div
          style={baseStyle}
          className="flex items-center justify-center border rounded bg-muted/20"
        >
          <div className="text-center text-muted-foreground">
            <div className="text-2xl mb-2">📊</div>
            <div className="text-sm">Chart: {element.metadata?.chartType as string || 'bar'}</div>
            <div className="text-xs">{element.content}</div>
          </div>
        </div>
      );

    case 'table':
      const tableData = element.metadata?.data as string[][] || [];
      return (
        <div style={baseStyle} className="overflow-auto">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {tableData.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={cn(
                        'border px-2 py-1',
                        rowIndex === 0 && 'font-bold bg-muted/30'
                      )}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'icon':
      return (
        <div
          style={{ ...baseStyle, color: theme.primaryColor }}
          className="flex items-center justify-center text-4xl"
        >
          {element.content}
        </div>
      );

    case 'video':
      return (
        <div style={baseStyle} className="flex items-center justify-center bg-black/10 rounded">
          <div className="text-center text-muted-foreground">
            <div className="text-3xl mb-2">🎬</div>
            <div className="text-sm">Video: {element.content}</div>
          </div>
        </div>
      );

    default:
      return (
        <div style={baseStyle} className="text-muted-foreground text-sm">
          Unknown element type: {element.type}
        </div>
      );
  }
}

interface SingleSlideViewProps {
  slide: PPTSlide;
  slideIndex: number;
  totalSlides: number;
  theme: PPTPresentation['theme'];
  onPrev: () => void;
  onNext: () => void;
  onEdit?: () => void;
}

function SingleSlideView({
  slide,
  slideIndex,
  totalSlides,
  theme,
  onPrev,
  onNext,
  onEdit,
}: SingleSlideViewProps) {
  const t = useTranslations('pptPreview');
  const layoutInfo = SLIDE_LAYOUT_INFO[slide.layout] || SLIDE_LAYOUT_INFO['title-content'];

  return (
    <div className="flex-1 flex flex-col gap-4">
      {/* Slide content */}
      <div
        className="flex-1 rounded-lg border overflow-hidden relative"
        style={{
          backgroundColor: slide.backgroundColor || theme.backgroundColor,
          color: theme.textColor,
          ...(slide.backgroundImage && {
            backgroundImage: `url(${slide.backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }),
        }}
      >
        {/* Background overlay for better text readability when using background image */}
        {slide.backgroundImage && (
          <div 
            className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40 z-0"
            aria-hidden="true"
          />
        )}

        {/* Navigation arrows */}
        <button
          onClick={onPrev}
          disabled={slideIndex === 0}
          aria-label="Previous slide"
          aria-disabled={slideIndex === 0}
          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed z-10"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          onClick={onNext}
          aria-label="Next slide"
          aria-disabled={slideIndex === totalSlides - 1}
          disabled={slideIndex === totalSlides - 1}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed z-10"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Edit button */}
        {onEdit && (
          <button
            onClick={onEdit}
            aria-label="Edit slide"
            className="absolute top-2 right-2 p-2 rounded-full bg-background/80 hover:bg-background z-10"
          >
            <Edit className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        {/* Slide content */}
        <div className="p-8 h-full flex flex-col justify-center">
          {/* Title */}
          {slide.title && (
            <h2
              className={cn(
                'font-bold mb-4',
                slide.layout === 'title' || slide.layout === 'section'
                  ? 'text-4xl text-center'
                  : 'text-2xl'
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
                'text-lg mb-4',
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
              className="text-base leading-relaxed mb-4"
              style={{ fontFamily: theme.bodyFont }}
            >
              {slide.content}
            </div>
          )}

          {/* Bullets */}
          {slide.bullets && slide.bullets.length > 0 && (
            <ul className="space-y-2" style={{ fontFamily: theme.bodyFont }}>
              {slide.bullets.map((bullet, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span
                    className="mt-2 h-2 w-2 rounded-full shrink-0"
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
      </div>

      {/* Slide info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="h-4 w-4" />
          <span>{layoutInfo.name}</span>
        </div>
        <div>
          {t('slideOf', { current: slideIndex + 1, total: totalSlides })}
        </div>
      </div>

      {/* Speaker notes */}
      {slide.notes && (
        <div className="border rounded-lg p-3 bg-muted/30">
          <div className="text-xs font-medium text-muted-foreground mb-1">{t('speakerNotes')}</div>
          <div className="text-sm">{slide.notes}</div>
        </div>
      )}
    </div>
  );
}

interface GridViewProps {
  slides: PPTSlide[];
  theme: PPTPresentation['theme'];
  currentIndex: number;
  onSelect: (index: number) => void;
  onEdit?: (index: number) => void;
}

function GridView({ slides, theme, currentIndex, onSelect, onEdit }: GridViewProps) {
  const t = useTranslations('pptPreview');
  return (
    <ScrollArea className="flex-1">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-2">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            onClick={() => onSelect(index)}
            className={cn(
              'aspect-video rounded-lg border-2 overflow-hidden cursor-pointer transition-all hover:shadow-md group relative',
              index === currentIndex
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-border hover:border-primary/50'
            )}
            style={{
              backgroundColor: slide.backgroundColor || theme.backgroundColor,
            }}
          >
            {/* Slide preview */}
            <div className="p-3 h-full flex flex-col">
              {slide.title && (
                <h4
                  className="font-semibold text-xs truncate"
                  style={{ color: theme.primaryColor }}
                >
                  {slide.title}
                </h4>
              )}
              {slide.bullets && slide.bullets.length > 0 && (
                <ul className="mt-1 text-[10px] text-muted-foreground space-y-0.5">
                  {slide.bullets.slice(0, 3).map((bullet, i) => (
                    <li key={i} className="truncate">• {bullet}</li>
                  ))}
                  {slide.bullets.length > 3 && (
                    <li className="text-muted-foreground/50">
                      {t('more', { count: slide.bullets.length - 3 })}
                    </li>
                  )}
                </ul>
              )}
            </div>

            {/* Slide number */}
            <div className="absolute bottom-1 right-1 text-[10px] bg-background/80 rounded px-1">
              {index + 1}
            </div>

            {/* Edit button on hover */}
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(index);
                }}
                className="absolute top-1 right-1 p-1 rounded bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

interface OutlineViewProps {
  presentation: PPTPresentation;
  marpContent: string;
  onCopy: () => void;
  copied: boolean;
}

function OutlineView({ presentation, marpContent, onCopy, copied }: OutlineViewProps) {
  const t = useTranslations('pptPreview');
  return (
    <Tabs defaultValue="outline" className="flex-1 flex flex-col">
      <TabsList className="w-full justify-start">
        <TabsTrigger value="outline">{t('outline')}</TabsTrigger>
        <TabsTrigger value="marp">{t('marpCode')}</TabsTrigger>
      </TabsList>

      <TabsContent value="outline" className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-3 p-2">
            {presentation.slides.map((slide, index) => (
              <div
                key={slide.id}
                className="border rounded-lg p-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{slide.title || t('untitled')}</h4>
                      <Badge variant="outline" className="text-xs">
                        {SLIDE_LAYOUT_INFO[slide.layout]?.name || slide.layout}
                      </Badge>
                    </div>
                    {slide.subtitle && (
                      <p className="text-sm text-muted-foreground mt-1">{slide.subtitle}</p>
                    )}
                    {slide.bullets && slide.bullets.length > 0 && (
                      <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                        {slide.bullets.map((bullet, i) => (
                          <li key={i}>• {bullet}</li>
                        ))}
                      </ul>
                    )}
                    {slide.notes && (
                      <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded p-2">
                        <span className="font-medium">{t('notes')}:</span> {slide.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="marp" className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{t('marpMarkdown')}</span>
            <Button variant="ghost" size="sm" onClick={onCopy}>
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  {t('copied')}
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  {t('copy')}
                </>
              )}
            </Button>
          </div>
          <ScrollArea className="flex-1 border rounded-lg">
            <pre className="p-4 text-sm font-mono whitespace-pre-wrap">
              {marpContent}
            </pre>
          </ScrollArea>
        </div>
      </TabsContent>
    </Tabs>
  );
}

// Theme menu item with hover preview
interface ThemeMenuItemProps {
  theme: typeof DEFAULT_PPT_THEMES[0];
  onSelect: () => void;
}

function ThemeMenuItem({ theme, onSelect }: ThemeMenuItemProps) {
  const t = useTranslations('workflow');
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <DropdownMenuItem
          onClick={onSelect}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div
            className="h-4 w-4 rounded-full shrink-0"
            style={{ backgroundColor: theme.primaryColor }}
          />
          <span className="truncate">{theme.name}</span>
        </DropdownMenuItem>
      </HoverCardTrigger>
      <HoverCardContent side="left" className="w-64 p-0">
        <div
          className="rounded-md overflow-hidden"
          style={{ backgroundColor: theme.backgroundColor }}
        >
          {/* Mini slide preview */}
          <div className="aspect-video p-4 flex flex-col justify-center">
            <h3
              className="text-sm font-bold truncate"
              style={{
                color: theme.primaryColor,
                fontFamily: theme.headingFont,
              }}
            >
              {theme.name}
            </h3>
            <p
              className="text-xs mt-1 opacity-80"
              style={{
                color: theme.textColor,
                fontFamily: theme.bodyFont,
              }}
            >
              Sample presentation text
            </p>
            <div className="flex gap-1 mt-2">
              <div
                className="h-1.5 w-8 rounded-full"
                style={{ backgroundColor: theme.primaryColor }}
              />
              <div
                className="h-1.5 w-6 rounded-full"
                style={{ backgroundColor: theme.secondaryColor }}
              />
              <div
                className="h-1.5 w-4 rounded-full"
                style={{ backgroundColor: theme.accentColor }}
              />
            </div>
          </div>
          {/* Color swatches */}
          <div className="flex border-t" style={{ borderColor: theme.textColor + '20' }}>
            <div
              className="flex-1 h-6"
              style={{ backgroundColor: theme.primaryColor }}
              title={t('theme') + ' - Primary'}
            />
            <div
              className="flex-1 h-6"
              style={{ backgroundColor: theme.secondaryColor }}
              title={t('theme') + ' - Secondary'}
            />
            <div
              className="flex-1 h-6"
              style={{ backgroundColor: theme.accentColor }}
              title={t('theme') + ' - Accent'}
            />
          </div>
        </div>
        <div className="p-2 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Heading: {theme.headingFont}</span>
          </div>
          <div className="flex justify-between">
            <span>Body: {theme.bodyFont}</span>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

// Error Boundary for PPT Preview
interface PPTPreviewErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface PPTPreviewErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class PPTPreviewErrorBoundary extends Component<
  PPTPreviewErrorBoundaryProps,
  PPTPreviewErrorBoundaryState
> {
  constructor(props: PPTPreviewErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): PPTPreviewErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('PPT Preview Error:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="p-3 rounded-full bg-destructive/10">
              <Presentation className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Failed to load presentation</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try Again
            </Button>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Wrapper component with error boundary
export function PPTPreviewWithErrorBoundary(props: PPTPreviewProps) {
  return (
    <PPTPreviewErrorBoundary>
      <PPTPreview {...props} />
    </PPTPreviewErrorBoundary>
  );
}

export default PPTPreview;
