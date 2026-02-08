'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  Plus,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
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
  onOutlineChange?: (outline: PPTOutline) => void;
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
  onOutlineChange,
  onCancel,
  className,
}: PPTOutlinePreviewProps) {
  const t = useTranslations('pptGenerator');
  const [expandedSlides, setExpandedSlides] = useState<Set<number>>(new Set([0]));
  const [isEditMode, setIsEditMode] = useState(false);

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

  // --- Inline editing handlers ---
  const updateSlideTitle = useCallback((index: number, title: string) => {
    if (!onOutlineChange) return;
    const newOutline = { ...outline, outline: [...outline.outline] };
    newOutline.outline[index] = { ...newOutline.outline[index], title };
    onOutlineChange(newOutline);
  }, [outline, onOutlineChange]);

  const updateKeyPoint = useCallback((slideIndex: number, pointIndex: number, value: string) => {
    if (!onOutlineChange) return;
    const newOutline = { ...outline, outline: [...outline.outline] };
    const slide = { ...newOutline.outline[slideIndex] };
    const points = [...(slide.keyPoints || [])];
    points[pointIndex] = value;
    slide.keyPoints = points;
    newOutline.outline[slideIndex] = slide;
    onOutlineChange(newOutline);
  }, [outline, onOutlineChange]);

  const addKeyPoint = useCallback((slideIndex: number) => {
    if (!onOutlineChange) return;
    const newOutline = { ...outline, outline: [...outline.outline] };
    const slide = { ...newOutline.outline[slideIndex] };
    slide.keyPoints = [...(slide.keyPoints || []), ''];
    newOutline.outline[slideIndex] = slide;
    onOutlineChange(newOutline);
  }, [outline, onOutlineChange]);

  const removeKeyPoint = useCallback((slideIndex: number, pointIndex: number) => {
    if (!onOutlineChange) return;
    const newOutline = { ...outline, outline: [...outline.outline] };
    const slide = { ...newOutline.outline[slideIndex] };
    slide.keyPoints = (slide.keyPoints || []).filter((_, i) => i !== pointIndex);
    newOutline.outline[slideIndex] = slide;
    onOutlineChange(newOutline);
  }, [outline, onOutlineChange]);

  const moveSlide = useCallback((index: number, direction: 'up' | 'down') => {
    if (!onOutlineChange) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= outline.outline.length) return;
    const newOutline = { ...outline, outline: [...outline.outline] };
    const temp = newOutline.outline[index];
    newOutline.outline[index] = newOutline.outline[newIndex];
    newOutline.outline[newIndex] = temp;
    // Renumber
    newOutline.outline = newOutline.outline.map((s, i) => ({ ...s, slideNumber: i + 1 }));
    onOutlineChange(newOutline);
  }, [outline, onOutlineChange]);

  const addSlide = useCallback(() => {
    if (!onOutlineChange) return;
    const newSlide: OutlineSlide = {
      slideNumber: outline.outline.length + 1,
      title: 'New Slide',
      layout: 'title-content',
      keyPoints: ['Key point'],
    };
    const newOutline = {
      ...outline,
      outline: [...outline.outline, newSlide],
      slideCount: outline.slideCount + 1,
    };
    onOutlineChange(newOutline);
    setExpandedSlides(prev => new Set([...prev, outline.outline.length]));
  }, [outline, onOutlineChange]);

  const removeSlide = useCallback((index: number) => {
    if (!onOutlineChange || outline.outline.length <= 1) return;
    const newOutline = {
      ...outline,
      outline: outline.outline
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, slideNumber: i + 1 })),
      slideCount: outline.slideCount - 1,
    };
    onOutlineChange(newOutline);
  }, [outline, onOutlineChange]);

  const handleEditToggle = useCallback(() => {
    if (onOutlineChange) {
      setIsEditMode(prev => !prev);
      if (!isEditMode) {
        expandAll();
      }
    } else if (onEditOutline) {
      onEditOutline();
    }
  }, [onOutlineChange, onEditOutline, isEditMode, expandAll]);

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
                <div className="flex items-center gap-1">
                  {isEditMode && (
                    <div className="flex flex-col">
                      <Button variant="ghost" size="icon" className="h-4 w-4 p-0" onClick={() => moveSlide(index, 'up')} disabled={index === 0}>
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-4 w-4 p-0" onClick={() => moveSlide(index, 'down')} disabled={index === outline.outline.length - 1}>
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left">
                      {isEditMode && <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />}
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
                        {slide.slideNumber}
                      </span>
                      {getLayoutIcon(slide.layout)}
                      {isEditMode ? (
                        <Input
                          value={slide.title}
                          onChange={(e) => { e.stopPropagation(); updateSlideTitle(index, e.target.value); }}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 h-7 text-sm font-medium"
                        />
                      ) : (
                        <span className="flex-1 font-medium text-sm truncate">
                          {slide.title}
                        </span>
                      )}
                      {isEditMode && outline.outline.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); removeSlide(index); }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                      {expandedSlides.has(index) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                </div>
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
                              {isEditMode ? (
                                <div className="flex-1 flex items-center gap-1">
                                  <Input
                                    value={point}
                                    onChange={(e) => updateKeyPoint(index, i, e.target.value)}
                                    className="h-6 text-xs flex-1"
                                  />
                                  <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => removeKeyPoint(index, i)}>
                                    <Trash2 className="h-2.5 w-2.5 text-muted-foreground" />
                                  </Button>
                                </div>
                              ) : (
                                point
                              )}
                            </li>
                          ))}
                        </ul>
                        {isEditMode && (
                          <Button variant="ghost" size="sm" className="h-6 text-xs ml-4" onClick={() => addKeyPoint(index)}>
                            <Plus className="h-3 w-3 mr-1" />
                            {t('addPoint') || 'Add point'}
                          </Button>
                        )}
                      </div>
                    )}
                    {!isEditMode && slide.suggestedVisual && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" />
                        {slide.suggestedVisual}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
            {isEditMode && (
              <Button variant="outline" size="sm" className="w-full mt-2" onClick={addSlide}>
                <Plus className="h-3 w-3 mr-1" />
                {t('addSlide') || 'Add Slide'}
              </Button>
            )}
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
          {(onEditOutline || onOutlineChange) && (
            <Button variant={isEditMode ? 'default' : 'outline'} className="flex-1" onClick={handleEditToggle} disabled={isGenerating}>
              <Edit3 className="mr-2 h-4 w-4" />
              {isEditMode ? (t('doneEditing') || 'Done') : t('editOutline')}
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
