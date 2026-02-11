/**
 * Regenerate Slide AI Logic
 *
 * Extracted from ppt-editor-store to keep the store free of AI concerns.
 * The store calls this function and applies the result to its state.
 */

import { generateText } from 'ai';
import { getProxyProviderModel } from '@/lib/ai/core/proxy-client';
import { parseAIJSON } from '@/lib/ai/utils/parse-ai-json';
import { loggers } from '@/lib/logger';
import type { PPTPresentation, PPTSlide } from '@/types/workflow';
import type { ProviderName } from '@/types/provider';

export interface RegenerateSlideResult {
  title?: string;
  subtitle?: string;
  content?: string;
  bullets?: string[];
  notes?: string;
}

/**
 * Regenerate slide content using AI.
 *
 * @returns Partial slide fields on success, or `null` on failure.
 */
export async function regenerateSlideContent(
  slide: PPTSlide,
  presentation: PPTPresentation,
): Promise<RegenerateSlideResult | null> {
  // Lazily import settings store to avoid circular deps
  const { useSettingsStore } = await import('@/stores');

  const settingsState = useSettingsStore.getState();
  const provider = settingsState.defaultProvider as ProviderName;
  const providerSettings = settingsState.providerSettings[provider];
  const apiKey = providerSettings?.apiKey || '';
  const baseURL = providerSettings?.baseURL;
  const model = providerSettings?.defaultModel || 'gpt-4o';

  if (!apiKey) {
    loggers.ai.error('No API key configured for regeneration');
    return null;
  }

  const slideIndex = presentation.slides.findIndex((s) => s.id === slide.id);
  const prevSlide = slideIndex > 0 ? presentation.slides[slideIndex - 1] : undefined;
  const nextSlide = slideIndex < presentation.slides.length - 1 ? presentation.slides[slideIndex + 1] : undefined;

  const prompt = `Regenerate the content for this presentation slide.

Current slide:
- Layout: ${slide.layout}
- Title: ${slide.title || 'None'}
- Subtitle: ${slide.subtitle || 'None'}
- Content: ${slide.content || 'None'}
- Bullets: ${slide.bullets?.join(', ') || 'None'}

Presentation context:
- Title: ${presentation.title}
- Description: ${presentation.subtitle || 'Not provided'}
${prevSlide ? `- Previous slide: ${prevSlide.title}` : ''}
${nextSlide ? `- Next slide: ${nextSlide.title}` : ''}

Requirements:
- Keep the same layout (${slide.layout})
- Make the content clear, concise, and impactful
- Follow the 6x6 rule (max 6 bullets, 6 words each)
- Use professional language

Respond in JSON format:
{
  "title": "new title",
  "subtitle": "new subtitle (if applicable)",
  "content": "new content (if applicable)",
  "bullets": ["bullet 1", "bullet 2"],
  "notes": "suggested speaker notes"
}`;

  try {
    const modelInstance = getProxyProviderModel(provider, model, apiKey, baseURL, true);

    const { text } = await generateText({
      model: modelInstance,
      system: 'You are an expert presentation designer. Always respond with valid JSON.',
      prompt,
      temperature: 0.7,
    });

    const result = parseAIJSON(text) as Record<string, unknown>;

    return {
      title: result.title as string | undefined,
      subtitle: result.subtitle as string | undefined,
      content: result.content as string | undefined,
      bullets: result.bullets as string[] | undefined,
      notes: result.notes as string | undefined,
    };
  } catch (err) {
    loggers.ai.error('Failed to regenerate slide:', err instanceof Error ? err : undefined);
    return null;
  }
}
