'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { cn } from '@/lib/utils';
import { DEFAULT_PPT_THEMES } from '@/types/workflow';
import { generateMarpMarkdown } from '@/lib/ai/workflows/ppt-workflow';
import {
  Download,
  Edit,
  Eye,
  FileText,
  Grid3X3,
  Maximize2,
  Minimize2,
  Palette,
  Presentation,
} from 'lucide-react';

import {
  SingleSlideView,
  GridView,
  OutlineView,
  ThemeMenuItem,
  PPTPreviewErrorBoundary,
} from './components';
import type { PPTPreviewProps, PPTExportFormat } from './types';

/**
 * PPTPreview - Main presentation preview component
 * Displays slides in single, grid, or outline view with export capabilities
 */
export function PPTPreview({
  presentation,
  onEdit,
  onOpenEditor,
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

          {/* Open Editor button */}
          {onOpenEditor && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onOpenEditor(presentation)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('openEditor')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

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

// Wrapper component with error boundary
export function PPTPreviewWithErrorBoundary(props: PPTPreviewProps) {
  return (
    <PPTPreviewErrorBoundary>
      <PPTPreview {...props} />
    </PPTPreviewErrorBoundary>
  );
}

export default PPTPreview;
