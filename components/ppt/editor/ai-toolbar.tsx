'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/loading-states';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  Wand2,
  ListPlus,
  FileText,
  RefreshCw,
  Lightbulb,
  Type,
  Check,
  X,
  ChevronDown,
} from 'lucide-react';
import { usePPTAI } from '@/hooks/designer/use-ppt-ai';
import { buildImprovementPrompt, generateSpeakerNotesPrompt, suggestLayoutFromContent } from '../utils';
import type { PPTSlide, PPTPresentation } from '@/types/workflow';

interface AIToolbarProps {
  slide: PPTSlide;
  presentation: PPTPresentation;
  onSlideUpdate: (updates: Partial<PPTSlide>) => void;
  className?: string;
}

type OptimizeStyle = 'concise' | 'detailed' | 'professional' | 'casual';
type ImprovementStyle = 'concise' | 'detailed' | 'engaging' | 'professional' | 'simplified';

/**
 * AIToolbar - Floating AI editing toolbar for slide content
 * Surfaces usePPTAI capabilities in the editor UI
 */
export function AIToolbar({
  slide,
  presentation,
  onSlideUpdate,
  className,
}: AIToolbarProps) {
  const t = useTranslations('pptEditor');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{
    type: 'content' | 'layout' | 'design';
    description: string;
    action?: string;
  }>>([]);
  const [pendingUpdate, setPendingUpdate] = useState<Partial<PPTSlide> | null>(null);

  const {
    isProcessing,
    regenerateSlide,
    optimizeContent,
    generateSuggestions,
    expandBullets,
    improveSlideNotes,
  } = usePPTAI();

  // Regenerate slide content
  const handleRegenerate = useCallback(async () => {
    const slideIndex = presentation.slides.findIndex(s => s.id === slide.id);
    const result = await regenerateSlide({
      slide,
      context: {
        presentationTitle: presentation.title,
        presentationDescription: presentation.subtitle,
        previousSlide: slideIndex > 0 ? presentation.slides[slideIndex - 1] : undefined,
        nextSlide: slideIndex < presentation.slides.length - 1 ? presentation.slides[slideIndex + 1] : undefined,
      },
      keepLayout: true,
    });

    if (result.success && result.slide) {
      setPendingUpdate(result.slide);
    }
  }, [slide, presentation, regenerateSlide]);

  // Optimize title
  const handleOptimizeTitle = useCallback(async (style: OptimizeStyle) => {
    if (!slide.title) return;
    const result = await optimizeContent({
      content: slide.title,
      type: 'title',
      style,
      maxLength: 80,
    });
    if (result.success && result.content) {
      onSlideUpdate({ title: result.content });
    }
  }, [slide.title, optimizeContent, onSlideUpdate]);

  // Optimize content
  const handleOptimizeContent = useCallback(async (style: OptimizeStyle) => {
    if (!slide.content) return;
    const result = await optimizeContent({
      content: slide.content,
      type: 'content',
      style,
    });
    if (result.success && result.content) {
      onSlideUpdate({ content: result.content });
    }
  }, [slide.content, optimizeContent, onSlideUpdate]);

  // Expand bullets
  const handleExpandBullets = useCallback(async () => {
    if (!slide.bullets || slide.bullets.length === 0) return;
    const targetCount = Math.min(slide.bullets.length + 3, 8);
    const result = await expandBullets(slide.bullets, targetCount);
    if (result.success && result.bullets) {
      onSlideUpdate({ bullets: result.bullets });
    }
  }, [slide.bullets, expandBullets, onSlideUpdate]);

  // Improve slide content using buildImprovementPrompt
  const handleImproveContent = useCallback(async (style: ImprovementStyle) => {
    const improvementPrompt = buildImprovementPrompt(
      { title: slide.title, subtitle: slide.subtitle, content: slide.content, bullets: slide.bullets },
      style
    );
    // Pass the structured improvement prompt as instructions for regeneration
    const result = await regenerateSlide({
      slide,
      instructions: improvementPrompt,
      keepLayout: true,
    });
    if (result.success && result.slide) {
      setPendingUpdate(result.slide);
    }
  }, [slide, regenerateSlide]);

  // Improve speaker notes using generateSpeakerNotesPrompt for structured prompting
  const handleImproveNotes = useCallback(async () => {
    // Build structured notes prompt for context-aware generation
    const notesPrompt = generateSpeakerNotesPrompt({
      title: slide.title || '',
      content: slide.content,
      bullets: slide.bullets,
    });
    // Use the structured prompt as enhanced slide notes context
    const enhancedSlide = { ...slide, notes: notesPrompt };
    const result = await improveSlideNotes(enhancedSlide);
    if (result.success && result.notes) {
      onSlideUpdate({ notes: result.notes });
    }
  }, [slide, improveSlideNotes, onSlideUpdate]);

  // Suggest layout based on content
  const suggestedLayout = slide.content ? suggestLayoutFromContent(slide.content) : null;

  // Get suggestions
  const handleGetSuggestions = useCallback(async () => {
    const result = await generateSuggestions({
      slide,
      presentation,
      suggestionType: 'all',
    });
    if (result.success && result.suggestions) {
      setSuggestions(result.suggestions);
      setShowSuggestions(true);
    }
  }, [slide, presentation, generateSuggestions]);

  // Accept pending update
  const handleAcceptUpdate = useCallback(() => {
    if (pendingUpdate) {
      onSlideUpdate(pendingUpdate);
      setPendingUpdate(null);
    }
  }, [pendingUpdate, onSlideUpdate]);

  // Reject pending update
  const handleRejectUpdate = useCallback(() => {
    setPendingUpdate(null);
  }, []);

  return (
    <div className={cn('flex items-center gap-1 flex-wrap', className)}>
      {/* Pending update banner */}
      {pendingUpdate && (
        <div className="w-full flex items-center gap-2 p-2 bg-primary/10 rounded-md mb-1">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs flex-1">{t('aiContentReady') || 'AI content ready'}</span>
          <Button size="sm" variant="default" className="h-6 text-xs px-2" onClick={handleAcceptUpdate}>
            <Check className="h-3 w-3 mr-1" />
            {t('accept') || 'Accept'}
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={handleRejectUpdate}>
            <X className="h-3 w-3 mr-1" />
            {t('reject') || 'Reject'}
          </Button>
        </div>
      )}

      {/* Regenerate */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={handleRegenerate}
              disabled={isProcessing}
            >
              {isProcessing ? <LoadingSpinner size="sm" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {t('regenerate') || 'Regenerate'}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('regenerateSlideContent') || 'Regenerate slide content with AI'}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Optimize content dropdown */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" disabled={isProcessing}>
            <Wand2 className="h-3.5 w-3.5" />
            {t('optimize') || 'Optimize'}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" align="start">
          <div className="space-y-0.5">
            {slide.title && (
              <>
                <p className="text-[10px] font-medium text-muted-foreground px-2 pt-1">{t('optimizeTitle') || 'Title'}</p>
                {(['concise', 'professional', 'casual'] as OptimizeStyle[]).map(style => (
                  <button
                    key={`title-${style}`}
                    className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted flex items-center gap-2"
                    onClick={() => handleOptimizeTitle(style)}
                  >
                    <Type className="h-3 w-3" />
                    {t(`style_${style}`) || style}
                  </button>
                ))}
                <Separator className="my-1" />
              </>
            )}
            {slide.content && (
              <>
                <p className="text-[10px] font-medium text-muted-foreground px-2 pt-1">{t('optimizeContent') || 'Content'}</p>
                {(['concise', 'detailed', 'professional', 'casual'] as OptimizeStyle[]).map(style => (
                  <button
                    key={`content-${style}`}
                    className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted flex items-center gap-2"
                    onClick={() => handleOptimizeContent(style)}
                  >
                    <Wand2 className="h-3 w-3" />
                    {t(`style_${style}`) || style}
                  </button>
                ))}
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Expand bullets */}
      {slide.bullets && slide.bullets.length > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleExpandBullets}
                disabled={isProcessing || slide.bullets.length >= 8}
              >
                <ListPlus className="h-3.5 w-3.5" />
                {t('expandBullets') || 'Expand'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('expandBulletsTooltip') || 'Add more bullet points with AI'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Improve notes */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={handleImproveNotes}
              disabled={isProcessing}
            >
              <FileText className="h-3.5 w-3.5" />
              {t('improveNotes') || 'Notes'}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('improveNotesTooltip') || 'Generate/improve speaker notes'}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Improve content */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" disabled={isProcessing}>
            <Sparkles className="h-3.5 w-3.5" />
            {t('improve') || 'Improve'}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1" align="start">
          <div className="space-y-0.5">
            {(['concise', 'detailed', 'engaging', 'professional', 'simplified'] as ImprovementStyle[]).map(style => (
              <button
                key={style}
                className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted flex items-center gap-2"
                onClick={() => handleImproveContent(style)}
              >
                <Wand2 className="h-3 w-3" />
                {t(`improve_${style}`) || style}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Layout suggestion badge */}
      {suggestedLayout && suggestedLayout !== slide.layout && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="h-6 text-[10px] cursor-pointer hover:bg-primary/10"
                onClick={() => onSlideUpdate({ layout: suggestedLayout })}
              >
                {t('suggestLayout') || 'Try'}: {suggestedLayout}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>{t('suggestLayoutTooltip') || 'AI suggests this layout might work better'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* AI Suggestions */}
      <Popover open={showSuggestions} onOpenChange={setShowSuggestions}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={handleGetSuggestions}
            disabled={isProcessing}
          >
            <Lightbulb className="h-3.5 w-3.5" />
            {t('suggestions') || 'Suggest'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="start">
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-1.5">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              {t('aiSuggestions') || 'AI Suggestions'}
            </h4>
            {suggestions.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('noSuggestions') || 'No suggestions yet'}</p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {suggestions.map((s, i) => (
                  <div key={i} className="p-2 rounded-md bg-muted/50 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] h-4 px-1">
                        {s.type}
                      </Badge>
                    </div>
                    <p className="text-xs">{s.description}</p>
                    {s.action && (
                      <p className="text-[10px] text-muted-foreground italic">{s.action}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Processing indicator */}
      {isProcessing && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground ml-1">
          <LoadingSpinner size="sm" />
          <span>{t('aiProcessing') || 'Processing...'}</span>
        </div>
      )}
    </div>
  );
}

export default AIToolbar;
