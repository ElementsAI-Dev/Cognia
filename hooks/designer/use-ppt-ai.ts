'use client';

/**
 * usePPTAI - Hook for AI-assisted PPT editing
 * Provides functions for slide regeneration, content optimization, and AI suggestions
 */

import { useCallback, useState, useRef } from 'react';
import { streamText } from 'ai';
import { useSettingsStore } from '@/stores';
import { usePPTEditorStore } from '@/stores/tools/ppt-editor-store';
import { resolvePPTAIConfig, createPPTModelInstance } from '@/lib/ai/utils/ppt-ai-config';
import type { ProviderName } from '@/types/provider';
import type { PPTSlide, PPTPresentation, PPTSlideLayout, PPTOutlineItem } from '@/types/workflow';
import { parseAIJSON } from '@/lib/ai/utils/parse-ai-json';

export interface RegenerateSlideOptions {
  slide: PPTSlide;
  context?: {
    presentationTitle?: string;
    presentationDescription?: string;
    previousSlide?: PPTSlide;
    nextSlide?: PPTSlide;
  };
  instructions?: string;
  keepLayout?: boolean;
}

export interface OptimizeContentOptions {
  content: string;
  type: 'title' | 'subtitle' | 'content' | 'bullets';
  style?: 'concise' | 'detailed' | 'professional' | 'casual';
  maxLength?: number;
}

export interface GenerateSuggestionsOptions {
  slide: PPTSlide;
  presentation: PPTPresentation;
  suggestionType: 'content' | 'layout' | 'design' | 'all';
}

export interface AISlideResult {
  success: boolean;
  slide?: Partial<PPTSlide>;
  error?: string;
}

export interface AIContentResult {
  success: boolean;
  content?: string;
  alternatives?: string[];
  error?: string;
}

export interface AISuggestionsResult {
  success: boolean;
  suggestions?: Array<{
    type: 'content' | 'layout' | 'design';
    description: string;
    action?: string;
  }>;
  error?: string;
}

export interface UsePPTAIReturn {
  isProcessing: boolean;
  error: string | null;
  streamingText: string;
  cancelGeneration: () => void;
  regenerateSlide: (options: RegenerateSlideOptions) => Promise<AISlideResult>;
  optimizeContent: (options: OptimizeContentOptions) => Promise<AIContentResult>;
  generateSuggestions: (options: GenerateSuggestionsOptions) => Promise<AISuggestionsResult>;
  generateOutline: (
    topic: string,
    slideCount: number
  ) => Promise<{ success: boolean; outline?: PPTOutlineItem[]; error?: string }>;
  expandBullets: (
    bullets: string[],
    count: number
  ) => Promise<{ success: boolean; bullets?: string[]; error?: string }>;
  improveSlideNotes: (
    slide: PPTSlide
  ) => Promise<{ success: boolean; notes?: string; error?: string }>;
}

/**
 * Build prompt for slide regeneration
 */
function buildRegeneratePrompt(options: RegenerateSlideOptions): string {
  const { slide, context, instructions, keepLayout } = options;

  let prompt = `Regenerate the content for this presentation slide.

Current slide:
- Layout: ${slide.layout}
- Title: ${slide.title || 'None'}
- Subtitle: ${slide.subtitle || 'None'}
- Content: ${slide.content || 'None'}
- Bullets: ${slide.bullets?.join(', ') || 'None'}`;

  if (context?.presentationTitle) {
    prompt += `\n\nPresentation context:
- Title: ${context.presentationTitle}
- Description: ${context.presentationDescription || 'Not provided'}`;
  }

  if (context?.previousSlide) {
    prompt += `\n\nPrevious slide title: ${context.previousSlide.title}`;
  }

  if (context?.nextSlide) {
    prompt += `\n\nNext slide title: ${context.nextSlide.title}`;
  }

  if (instructions) {
    prompt += `\n\nSpecific instructions: ${instructions}`;
  }

  prompt += `\n\nRequirements:
- ${keepLayout ? 'Keep the same layout' : 'Suggest the best layout for this content'}
- Make the content clear, concise, and impactful
- Ensure it fits well in a presentation context
- Use professional language

Respond in JSON format:
{
  "title": "new title",
  "subtitle": "new subtitle (if applicable)",
  "content": "new content (if applicable)",
  "bullets": ["bullet 1", "bullet 2", ...],
  "layout": "${keepLayout ? slide.layout : 'suggested-layout'}",
  "speakerNotes": "suggested speaker notes"
}`;

  return prompt;
}

/**
 * Build prompt for content optimization
 */
function buildOptimizePrompt(options: OptimizeContentOptions): string {
  const { content, type, style = 'professional', maxLength } = options;

  const styleGuide = {
    concise: 'short, punchy, and to the point',
    detailed: 'comprehensive with supporting details',
    professional: 'formal and business-appropriate',
    casual: 'friendly and conversational',
  };

  return `Optimize this ${type} text for a presentation slide.

Original text: "${content}"

Requirements:
- Style: ${styleGuide[style]}
- ${maxLength ? `Maximum length: ${maxLength} characters` : 'Keep it concise'}
- Make it impactful and memorable
- Suitable for visual presentation

Respond in JSON format:
{
  "optimized": "the optimized text",
  "alternatives": ["alternative 1", "alternative 2"]
}`;
}

/**
 * Build prompt for generating suggestions
 */
function buildSuggestionsPrompt(options: GenerateSuggestionsOptions): string {
  const { slide, presentation, suggestionType } = options;

  return `Analyze this presentation slide and provide improvement suggestions.

Slide:
- Layout: ${slide.layout}
- Title: ${slide.title || 'None'}
- Content: ${slide.content || 'None'}
- Bullets: ${slide.bullets?.join(', ') || 'None'}

Presentation:
- Title: ${presentation.title}
- Total slides: ${presentation.slides.length}
- Theme: ${presentation.theme.name}

Suggestion focus: ${suggestionType === 'all' ? 'content, layout, and design' : suggestionType}

Provide 3-5 specific, actionable suggestions in JSON format:
{
  "suggestions": [
    {
      "type": "content|layout|design",
      "description": "clear description of the suggestion",
      "action": "specific action to implement"
    }
  ]
}`;
}

// Re-export parseAIJSON from shared utility for backward compatibility
export { parseAIJSON };

export function usePPTAI(): UsePPTAIReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const setGenerating = usePPTEditorStore((s) => s.setGenerating);

  const defaultProviderRaw = useSettingsStore((state) => state.defaultProvider);
  const defaultProvider = defaultProviderRaw as ProviderName;
  const providerSettings = useSettingsStore((state) => state.providerSettings);

  /**
   * Call AI API with a prompt — uses getProxyProviderModel for multi-provider support
   */
  const callAI = useCallback(
    async (prompt: string): Promise<string> => {
      const config = resolvePPTAIConfig(defaultProvider, providerSettings);

      if (!config.apiKey) {
        throw new Error('API key not configured');
      }

      const modelInstance = createPPTModelInstance(config);

      // Use streaming for real-time progress feedback
      abortControllerRef.current = new AbortController();
      setStreamingText('');

      const result = streamText({
        model: modelInstance,
        system: 'You are an expert presentation designer. Always respond with valid JSON.',
        prompt,
        temperature: 0.7,
        abortSignal: abortControllerRef.current.signal,
      });

      let fullText = '';
      for await (const chunk of result.textStream) {
        fullText += chunk;
        setStreamingText(fullText);
      }

      abortControllerRef.current = null;
      setStreamingText('');
      return fullText;
    },
    [defaultProvider, providerSettings]
  );

  /**
   * Regenerate a slide with AI
   */
  const regenerateSlide = useCallback(
    async (options: RegenerateSlideOptions): Promise<AISlideResult> => {
      setIsProcessing(true);
      setGenerating(true);
      setError(null);

      try {
        const prompt = buildRegeneratePrompt(options);
        const response = await callAI(prompt);
        const result = parseAIJSON(response) as Record<string, unknown>;

        return {
          success: true,
          slide: {
            title: result.title as string | undefined,
            subtitle: result.subtitle as string | undefined,
            content: result.content as string | undefined,
            bullets: result.bullets as string[] | undefined,
            layout: result.layout as PPTSlideLayout,
            notes: result.speakerNotes as string | undefined,
          },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to regenerate slide';
        setError(message);
        return { success: false, error: message };
      } finally {
        setIsProcessing(false);
        setGenerating(false);
      }
    },
    [callAI, setGenerating]
  );

  /**
   * Optimize content with AI
   */
  const optimizeContent = useCallback(
    async (options: OptimizeContentOptions): Promise<AIContentResult> => {
      setIsProcessing(true);
      setGenerating(true);
      setError(null);

      try {
        const prompt = buildOptimizePrompt(options);
        const response = await callAI(prompt);
        const result = parseAIJSON(response) as Record<string, unknown>;

        return {
          success: true,
          content: result.optimized as string | undefined,
          alternatives: result.alternatives as string[] | undefined,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to optimize content';
        setError(message);
        return { success: false, error: message };
      } finally {
        setIsProcessing(false);
        setGenerating(false);
      }
    },
    [callAI, setGenerating]
  );

  /**
   * Generate suggestions for a slide
   */
  const generateSuggestions = useCallback(
    async (options: GenerateSuggestionsOptions): Promise<AISuggestionsResult> => {
      setIsProcessing(true);
      setGenerating(true);
      setError(null);

      try {
        const prompt = buildSuggestionsPrompt(options);
        const response = await callAI(prompt);
        const result = parseAIJSON(response) as Record<string, unknown>;

        return {
          success: true,
          suggestions: result.suggestions as Array<{
            type: 'content' | 'layout' | 'design';
            description: string;
            action?: string;
          }> | undefined,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate suggestions';
        setError(message);
        return { success: false, error: message };
      } finally {
        setIsProcessing(false);
        setGenerating(false);
      }
    },
    [callAI, setGenerating]
  );

  /**
   * Generate an outline for a presentation
   */
  const generateOutline = useCallback(
    async (
      topic: string,
      slideCount: number
    ): Promise<{ success: boolean; outline?: PPTOutlineItem[]; error?: string }> => {
      setIsProcessing(true);
      setGenerating(true);
      setError(null);

      try {
        const prompt = `Create a presentation outline for the topic: "${topic}"

Requirements:
- Generate exactly ${slideCount} slides
- Include a title slide and a closing slide
- Structure the content logically
- Make each slide focused on one main idea

Respond in JSON format:
{
  "outline": [
    {
      "title": "slide title",
      "description": "brief description",
      "type": "title|content|bullets|section|closing",
      "keyPoints": ["point 1", "point 2"]
    }
  ]
}`;

        const response = await callAI(prompt);
        const result = parseAIJSON(response) as Record<string, unknown>;

        const rawOutline = result.outline as Array<Record<string, unknown>>;
        const outline: PPTOutlineItem[] = rawOutline.map(
          (item, index) => ({
            id: `outline-${index}`,
            title: (item.title as string) || '',
            description: (item.description as string) || '',
            suggestedLayout: ((item.type as string) || 'title-content') as PPTSlideLayout,
            keyPoints: (item.keyPoints as string[]) || [],
            order: index,
          })
        );

        return { success: true, outline };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate outline';
        setError(message);
        return { success: false, error: message };
      } finally {
        setIsProcessing(false);
        setGenerating(false);
      }
    },
    [callAI, setGenerating]
  );

  /**
   * Expand bullet points
   */
  const expandBullets = useCallback(
    async (
      bullets: string[],
      count: number
    ): Promise<{ success: boolean; bullets?: string[]; error?: string }> => {
      setIsProcessing(true);
      setGenerating(true);
      setError(null);

      try {
        const prompt = `Expand these bullet points to ${count} items while maintaining the same topic and style.

Current bullets:
${bullets.map((b, i) => `${i + 1}. ${b}`).join('\n')}

Requirements:
- Add ${count - bullets.length} more related bullet points
- Keep the same level of detail and tone
- Make each point distinct and valuable

Respond in JSON format:
{
  "bullets": ["bullet 1", "bullet 2", ...]
}`;

        const response = await callAI(prompt);
        const result = parseAIJSON(response) as Record<string, unknown>;

        return { success: true, bullets: result.bullets as string[] | undefined };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to expand bullets';
        setError(message);
        return { success: false, error: message };
      } finally {
        setIsProcessing(false);
        setGenerating(false);
      }
    },
    [callAI, setGenerating]
  );

  /**
   * Improve speaker notes for a slide
   */
  const improveSlideNotes = useCallback(
    async (slide: PPTSlide): Promise<{ success: boolean; notes?: string; error?: string }> => {
      setIsProcessing(true);
      setGenerating(true);
      setError(null);

      try {
        const prompt = `Generate comprehensive speaker notes for this presentation slide.

Slide:
- Title: ${slide.title || 'Untitled'}
- Content: ${slide.content || 'None'}
- Bullets: ${slide.bullets?.join(', ') || 'None'}
- Current notes: ${slide.notes || 'None'}

Requirements:
- Include talking points for each element
- Add transitions and timing suggestions
- Include potential questions from the audience
- Keep it natural and conversational

Respond in JSON format:
{
  "notes": "comprehensive speaker notes"
}`;

        const response = await callAI(prompt);
        const result = parseAIJSON(response) as Record<string, unknown>;

        return { success: true, notes: result.notes as string };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to improve notes';
        setError(message);
        return { success: false, error: message };
      } finally {
        setIsProcessing(false);
        setGenerating(false);
      }
    },
    [callAI, setGenerating]
  );

  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setStreamingText('');
      setIsProcessing(false);
      setGenerating(false);
    }
  }, [setGenerating]);

  return {
    isProcessing,
    error,
    streamingText,
    cancelGeneration,
    regenerateSlide,
    optimizeContent,
    generateSuggestions,
    generateOutline,
    expandBullets,
    improveSlideNotes,
  };
}

export default usePPTAI;
