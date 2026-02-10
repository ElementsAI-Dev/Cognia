'use client';

/**
 * usePPTAI - Hook for AI-assisted PPT editing
 * Provides functions for slide regeneration, content optimization, and AI suggestions
 */

import { useCallback, useState, useRef } from 'react';
import { streamText } from 'ai';
import { useSettingsStore } from '@/stores';
import { usePPTEditorStore } from '@/stores/tools/ppt-editor-store';
import { getProxyProviderModel } from '@/lib/ai/core/proxy-client';
import { getNextApiKey } from '@/lib/ai/infrastructure/api-key-rotation';
import type { ProviderName } from '@/types/provider';
import type { PPTSlide, PPTPresentation, PPTSlideLayout, PPTOutlineItem } from '@/types/workflow';

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

/**
 * Safely parse JSON from AI response, handling markdown code blocks and malformed output
 */
export function parseAIJSON(response: string): unknown {
  // Try to extract JSON from markdown code blocks
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : response.trim();

  try {
    return JSON.parse(jsonStr);
  } catch {
    // Try to find JSON object in the response
    const objectMatch = response.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        // ignore, fall through to array match
      }
    }
    // Try to find JSON array in the response
    const arrayMatch = response.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch {
        // ignore
      }
    }
    throw new Error('Failed to parse AI response as JSON');
  }
}

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
      const settings = providerSettings[defaultProvider];
      const model = settings?.defaultModel || 'gpt-4o';
      let apiKey = settings?.apiKey || '';

      if (!apiKey) {
        throw new Error('API key not configured');
      }

      // Support API key rotation
      if (settings?.apiKeys && settings.apiKeys.length > 0 && settings.apiKeyRotationEnabled) {
        const usageStats = settings.apiKeyUsageStats || {};
        const rotationResult = getNextApiKey(
          settings.apiKeys,
          settings.apiKeyRotationStrategy || 'round-robin',
          settings.currentKeyIndex || 0,
          usageStats
        );
        apiKey = rotationResult.apiKey;
        useSettingsStore.getState().updateProviderSettings(defaultProvider, {
          currentKeyIndex: rotationResult.index,
        });
      }

      const modelInstance = getProxyProviderModel(
        defaultProvider,
        model,
        apiKey,
        settings?.baseURL,
        true
      );

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
            title: result.title,
            subtitle: result.subtitle,
            content: result.content,
            bullets: result.bullets,
            layout: result.layout as PPTSlideLayout,
            notes: result.speakerNotes,
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
          content: result.optimized,
          alternatives: result.alternatives,
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
          suggestions: result.suggestions,
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

        const outline: PPTOutlineItem[] = (result.outline as Array<Record<string, unknown>>).map(
          (
            item: { title: string; description: string; keyPoints: string[]; type: string },
            index: number
          ) => ({
            id: `outline-${index}`,
            title: item.title,
            description: item.description,
            keyPoints: item.keyPoints || [],
            order: index,
            type: item.type,
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

        return { success: true, bullets: result.bullets };
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
