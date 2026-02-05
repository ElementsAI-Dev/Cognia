'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { LoadingSpinner } from '@/components/ui/loading-states';
import {
  Presentation,
  ChevronDown,
  ChevronRight,
  Edit3,
  RefreshCw,
  Sparkles,
  FileText,
  Image as ImageIcon,
  BarChart3,
  Layout,
} from 'lucide-react';
import type { PPTTheme } from '@/types/workflow';

// Outline slide structure
export interface OutlineSlide {
  slideNumber: number;
  title: string;
  layout: string;
  keyPoints?: string[];
  notes?: string;
  suggestedVisual?: string;
}

// Full outline structure
export interface PPTOutline {
  title: string;
  subtitle?: string;
  topic: string;
  audience?: string;
  slideCount: number;
  theme: PPTTheme;
  outline: OutlineSlide[];
}

export interface PPTOutlinePreviewProps {
  outline: PPTOutline;
  isGenerating?: boolean;
  onStartGeneration: () => void;
  onEditOutline?: () => void;
  onRegenerateOutline?: () => void;
  onCancel?: () => void;
  className?: string;
}

// Layout icon mapping
const getLayoutIcon = (layout: string) => {
  switch (layout) {
    case 'title':
    case 'section':
      return <FileText className="h-4 w-4" />;
    case 'image-left':
    case 'image-right':
    case 'full-image':
      return <ImageIcon className="h-4 w-4" />;
    case 'chart':
      return <BarChart3 className="h-4 w-4" />;
    default:
      return <Layout className="h-4 w-4" />;
  }
};

/**
 * PPTOutlinePreview - Shows generated outline and allows user to proceed with full generation
 * This creates a "preview before commit" flow for better user experience
 */
export function PPTOutlinePreview({
  outline,
  isGenerating = false,
  onStartGeneration,
  onEditOutline,
  onRegenerateOutline,
  onCancel,
  className,
}: PPTOutlinePreviewProps) {
  const t = useTranslations('pptGenerator');
  const [expandedSlides, setExpandedSlides] = useState<Set<number>>(new Set([0]));

  const toggleSlide = useCallback((index: number) => {
    setExpandedSlides(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedSlides(new Set(outline.outline.map((_, i) => i)));
  }, [outline.outline]);

  const collapseAll = useCallback(() => {
    setExpandedSlides(new Set());
  }, []);

  return (
    <Card className={`w-full max-w-2xl ${className || ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: outline.theme.primaryColor + '20' }}
            >
              <Presentation className="h-5 w-5" style={{ color: outline.theme.primaryColor }} />
            </div>
            <div>
              <CardTitle className="text-lg">{outline.title}</CardTitle>
              {outline.subtitle && (
                <p className="text-sm text-muted-foreground mt-0.5">{outline.subtitle}</p>
              )}
            </div>
          </div>
          <Badge variant="secondary">{outline.slideCount} {t('slides')}</Badge>
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge variant="outline" className="text-xs">
            {t('topic')}: {outline.topic}
          </Badge>
          {outline.audience && (
            <Badge variant="outline" className="text-xs">
              {t('audience')}: {outline.audience}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: outline.theme.primaryColor }}
            />
            {outline.theme.name}
          </Badge>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-4">
        {/* Expand/Collapse controls */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">{t('outlinePreview')}</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={expandAll}>
              {t('expandAll')}
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll}>
              {t('collapseAll')}
            </Button>
          </div>
        </div>

        {/* Slides outline */}
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-2">
            {outline.outline.map((slide, index) => (
              <Collapsible
                key={index}
                open={expandedSlides.has(index)}
                onOpenChange={() => toggleSlide(index)}
              >
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {slide.slideNumber}
                    </span>
                    {getLayoutIcon(slide.layout)}
                    <span className="flex-1 font-medium text-sm truncate">
                      {slide.title}
                    </span>
                    {expandedSlides.has(index) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-9 pl-3 border-l-2 border-muted py-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {slide.layout}
                      </Badge>
                    </div>
                    {slide.keyPoints && slide.keyPoints.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">{t('keyPoints')}:</span>
                        <ul className="space-y-1">
                          {slide.keyPoints.map((point, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary mt-1">•</span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {slide.suggestedVisual && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" />
                        {slide.suggestedVisual}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>
      </CardContent>

      <Separator />

      <CardFooter className="pt-4 flex flex-col gap-3">
        {/* Primary action */}
        <Button
          className="w-full"
          size="lg"
          onClick={onStartGeneration}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              {t('generatingSlides')}
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              {t('startFullGeneration')}
            </>
          )}
        </Button>

        {/* Secondary actions */}
        <div className="flex gap-2 w-full">
          {onEditOutline && (
            <Button variant="outline" className="flex-1" onClick={onEditOutline} disabled={isGenerating}>
              <Edit3 className="mr-2 h-4 w-4" />
              {t('editOutline')}
            </Button>
          )}
          {onRegenerateOutline && (
            <Button variant="outline" className="flex-1" onClick={onRegenerateOutline} disabled={isGenerating}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('regenerate')}
            </Button>
          )}
          {onCancel && (
            <Button variant="ghost" onClick={onCancel} disabled={isGenerating}>
              {t('cancel')}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

export default PPTOutlinePreview;
