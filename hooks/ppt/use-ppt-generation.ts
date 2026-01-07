'use client';

/**
 * usePPTGeneration - Hook for AI-powered PPT generation workflow
 * Handles the complete flow from user requirements to final presentation
 */

import { useState, useCallback } from 'react';
import { generateText } from 'ai';
import { useSettingsStore } from '@/stores';
import { usePPTEditorStore } from '@/stores/tools/ppt-editor-store';
import { getProxyProviderModel } from '@/lib/ai/core/proxy-client';
import { getNextApiKey } from '@/lib/ai/infrastructure/api-key-rotation';
import type { ProviderName } from '@/types/provider';
import type { PPTPresentation, PPTSlide, PPTTheme } from '@/types/workflow';
import { DEFAULT_PPT_THEMES } from '@/types/workflow';
import {
  buildSystemPrompt,
  buildOutlinePrompt,
  buildSlideContentPrompt,
  type GenerationContext,
} from '@/components/ppt/utils/generation-prompts';

export interface PPTGenerationConfig {
  topic: string;
  description?: string;
  audience?: string;
  purpose?: 'informative' | 'persuasive' | 'educational' | 'pitch' | 'report';
  tone?: 'formal' | 'casual' | 'professional' | 'creative';
  slideCount: number;
  theme: PPTTheme;
  language?: string;
  includeImages?: boolean;
  includeCharts?: boolean;
}

export interface PPTGenerationProgress {
  stage: 'idle' | 'outline' | 'content' | 'finalizing' | 'complete' | 'error';
  currentSlide: number;
  totalSlides: number;
  message: string;
}

export interface PPTOutlineData {
  title: string;
  subtitle?: string;
  outline: Array<{
    slideNumber: number;
    title: string;
    layout: string;
    keyPoints?: string[];
    notes?: string;
    suggestedVisual?: string;
  }>;
}

export interface UsePPTGenerationReturn {
  // State
  isGenerating: boolean;
  progress: PPTGenerationProgress;
  error: string | null;
  presentation: PPTPresentation | null;
  outline: PPTOutlineData | null;

  // Actions
  generateOutline: (config: PPTGenerationConfig) => Promise<PPTOutlineData | null>;
  generateFromOutline: (config: PPTGenerationConfig, outline: PPTOutlineData) => Promise<PPTPresentation | null>;
  generate: (config: PPTGenerationConfig) => Promise<PPTPresentation | null>;
  cancel: () => void;
  reset: () => void;

  // Utilities
  getEstimatedTime: (slideCount: number) => number;
}

export function usePPTGeneration(): UsePPTGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<PPTGenerationProgress>({
    stage: 'idle',
    currentSlide: 0,
    totalSlides: 0,
    message: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [presentation, setPresentation] = useState<PPTPresentation | null>(null);
  const [outline, setOutline] = useState<PPTOutlineData | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Get provider settings
  const defaultProviderRaw = useSettingsStore((state) => state.defaultProvider);
  const defaultProvider = defaultProviderRaw as ProviderName;
  const providerSettings = useSettingsStore((state) => state.providerSettings);

  // PPT Editor store
  const loadPresentation = usePPTEditorStore((state) => state.loadPresentation);

  // Get API configuration
  const getAPIConfig = useCallback(() => {
    const settings = providerSettings[defaultProvider];
    return {
      provider: defaultProvider,
      model: settings?.defaultModel || 'gpt-4o',
      apiKey: settings?.apiKey || '',
      baseURL: settings?.baseURL,
    };
  }, [defaultProvider, providerSettings]);

  // Call AI API for generation using direct client (works in static export/desktop)
  const callAI = useCallback(async (
    systemPrompt: string,
    userPrompt: string,
    signal?: AbortSignal
  ): Promise<string> => {
    const config = getAPIConfig();
    const settings = providerSettings[defaultProvider];
    
    // Support API key rotation
    let activeApiKey = config.apiKey;
    if (settings?.apiKeys && settings.apiKeys.length > 0 && settings.apiKeyRotationEnabled) {
      const usageStats = settings.apiKeyUsageStats || {};
      const rotationResult = getNextApiKey(
        settings.apiKeys,
        settings.apiKeyRotationStrategy || 'round-robin',
        settings.currentKeyIndex || 0,
        usageStats
      );
      activeApiKey = rotationResult.apiKey;
      useSettingsStore.getState().updateProviderSettings(defaultProvider, {
        currentKeyIndex: rotationResult.index,
      });
    }
    
    // Get model instance directly (bypasses /api/chat for static export compatibility)
    const modelInstance = getProxyProviderModel(
      defaultProvider,
      config.model,
      activeApiKey,
      settings?.baseURL,
      true // Enable proxy support
    );
    
    const { text } = await generateText({
      model: modelInstance,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
      abortSignal: signal,
    });
    
    return text;
  }, [getAPIConfig, defaultProvider, providerSettings]);

  // Parse JSON from AI response
  const parseJSONResponse = useCallback((response: string): unknown => {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : response.trim();
    
    try {
      return JSON.parse(jsonStr);
    } catch {
      // Try to find JSON object in the response
      const objectMatch = response.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        return JSON.parse(objectMatch[0]);
      }
      throw new Error('Failed to parse JSON response');
    }
  }, []);

  // Generate presentation
  const generate = useCallback(async (config: PPTGenerationConfig): Promise<PPTPresentation | null> => {
    const controller = new AbortController();
    setAbortController(controller);
    setIsGenerating(true);
    setError(null);
    setProgress({
      stage: 'outline',
      currentSlide: 0,
      totalSlides: config.slideCount,
      message: '正在生成演示文稿大纲...',
    });

    try {
      // Build generation context
      const context: GenerationContext = {
        topic: config.topic,
        audience: config.audience,
        purpose: config.purpose,
        tone: config.tone,
        slideCount: config.slideCount,
        language: config.language || 'zh-CN',
        includeImages: config.includeImages,
        includeCharts: config.includeCharts,
      };

      // Step 1: Generate outline
      const systemPrompt = buildSystemPrompt(context);
      const outlinePrompt = buildOutlinePrompt(context);
      
      const outlineResponse = await callAI(systemPrompt, outlinePrompt, controller.signal);
      const outlineData = parseJSONResponse(outlineResponse) as {
        title: string;
        subtitle?: string;
        outline: Array<{
          slideNumber: number;
          title: string;
          layout: string;
          keyPoints?: string[];
          notes?: string;
          suggestedVisual?: string;
        }>;
      };

      if (!outlineData.outline || outlineData.outline.length === 0) {
        throw new Error('Failed to generate presentation outline');
      }

      // Step 2: Generate content for each slide
      setProgress({
        stage: 'content',
        currentSlide: 0,
        totalSlides: outlineData.outline.length,
        message: '正在生成幻灯片内容...',
      });

      const slides: PPTSlide[] = [];
      let previousSlide: { title: string; content?: string } | undefined;

      for (let i = 0; i < outlineData.outline.length; i++) {
        if (controller.signal.aborted) {
          throw new Error('Generation cancelled');
        }

        const slideOutline = outlineData.outline[i];
        setProgress({
          stage: 'content',
          currentSlide: i + 1,
          totalSlides: outlineData.outline.length,
          message: `正在生成第 ${i + 1}/${outlineData.outline.length} 张幻灯片...`,
        });

        // Generate content for this slide
        const contentPrompt = buildSlideContentPrompt(
          {
            title: slideOutline.title,
            layout: slideOutline.layout as PPTSlide['layout'],
            keyPoints: slideOutline.keyPoints,
            notes: slideOutline.notes,
          },
          context,
          previousSlide
        );

        const contentResponse = await callAI(systemPrompt, contentPrompt, controller.signal);
        const contentData = parseJSONResponse(contentResponse) as {
          title: string;
          subtitle?: string;
          content?: string;
          bullets?: string[];
          notes?: string;
          imagePrompt?: string;
        };

        // Create slide
        const slide: PPTSlide = {
          id: `slide-${i + 1}-${Date.now()}`,
          order: i,
          layout: (slideOutline.layout as PPTSlide['layout']) || 'title-content',
          title: contentData.title || slideOutline.title,
          subtitle: contentData.subtitle,
          content: contentData.content,
          bullets: contentData.bullets,
          notes: contentData.notes || slideOutline.notes,
          elements: [],
        };

        slides.push(slide);
        previousSlide = { title: slide.title || '', content: slide.content };
      }

      // Step 3: Finalize presentation
      setProgress({
        stage: 'finalizing',
        currentSlide: slides.length,
        totalSlides: slides.length,
        message: '正在完成演示文稿...',
      });

      const newPresentation: PPTPresentation = {
        id: `ppt-${Date.now()}`,
        title: outlineData.title || config.topic,
        subtitle: outlineData.subtitle || config.description,
        theme: config.theme || DEFAULT_PPT_THEMES[0],
        slides,
        totalSlides: slides.length,
        aspectRatio: '16:9',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setPresentation(newPresentation);
      
      // Load into editor
      loadPresentation(newPresentation);

      setProgress({
        stage: 'complete',
        currentSlide: slides.length,
        totalSlides: slides.length,
        message: '演示文稿生成完成！',
      });

      return newPresentation;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      if (message !== 'Generation cancelled') {
        setError(message);
        setProgress({
          stage: 'error',
          currentSlide: 0,
          totalSlides: config.slideCount,
          message: `生成失败: ${message}`,
        });
      }
      return null;
    } finally {
      setIsGenerating(false);
      setAbortController(null);
    }
  }, [callAI, parseJSONResponse, loadPresentation]);

  // Cancel generation
  const cancel = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setIsGenerating(false);
      setProgress({
        stage: 'idle',
        currentSlide: 0,
        totalSlides: 0,
        message: '生成已取消',
      });
    }
  }, [abortController]);

  // Generate outline only (first stage)
  const generateOutline = useCallback(async (config: PPTGenerationConfig): Promise<PPTOutlineData | null> => {
    const controller = new AbortController();
    setAbortController(controller);
    setIsGenerating(true);
    setError(null);
    setOutline(null);
    setProgress({
      stage: 'outline',
      currentSlide: 0,
      totalSlides: config.slideCount,
      message: '正在生成演示文稿大纲...',
    });

    try {
      const context: GenerationContext = {
        topic: config.topic,
        audience: config.audience,
        purpose: config.purpose,
        tone: config.tone,
        slideCount: config.slideCount,
        language: config.language || 'zh-CN',
        includeImages: config.includeImages,
        includeCharts: config.includeCharts,
      };

      const systemPrompt = buildSystemPrompt(context);
      const outlinePrompt = buildOutlinePrompt(context);
      
      const outlineResponse = await callAI(systemPrompt, outlinePrompt, controller.signal);
      const outlineData = parseJSONResponse(outlineResponse) as PPTOutlineData;

      if (!outlineData.outline || outlineData.outline.length === 0) {
        throw new Error('Failed to generate presentation outline');
      }

      setOutline(outlineData);
      setProgress({
        stage: 'idle',
        currentSlide: 0,
        totalSlides: outlineData.outline.length,
        message: '大纲生成完成，请确认后继续生成完整内容',
      });

      return outlineData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Outline generation failed';
      if (message !== 'Generation cancelled') {
        setError(message);
        setProgress({
          stage: 'error',
          currentSlide: 0,
          totalSlides: config.slideCount,
          message: `大纲生成失败: ${message}`,
        });
      }
      return null;
    } finally {
      setIsGenerating(false);
      setAbortController(null);
    }
  }, [callAI, parseJSONResponse]);

  // Generate full presentation from existing outline (second stage)
  const generateFromOutline = useCallback(async (
    config: PPTGenerationConfig,
    outlineData: PPTOutlineData
  ): Promise<PPTPresentation | null> => {
    const controller = new AbortController();
    setAbortController(controller);
    setIsGenerating(true);
    setError(null);
    setProgress({
      stage: 'content',
      currentSlide: 0,
      totalSlides: outlineData.outline.length,
      message: '正在生成幻灯片内容...',
    });

    try {
      const context: GenerationContext = {
        topic: config.topic,
        audience: config.audience,
        purpose: config.purpose,
        tone: config.tone,
        slideCount: outlineData.outline.length,
        language: config.language || 'zh-CN',
        includeImages: config.includeImages,
        includeCharts: config.includeCharts,
      };

      const systemPrompt = buildSystemPrompt(context);
      const slides: PPTSlide[] = [];
      let previousSlide: { title: string; content?: string } | undefined;

      for (let i = 0; i < outlineData.outline.length; i++) {
        if (controller.signal.aborted) {
          throw new Error('Generation cancelled');
        }

        const slideOutline = outlineData.outline[i];
        setProgress({
          stage: 'content',
          currentSlide: i + 1,
          totalSlides: outlineData.outline.length,
          message: `正在生成第 ${i + 1}/${outlineData.outline.length} 张幻灯片...`,
        });

        const contentPrompt = buildSlideContentPrompt(
          {
            title: slideOutline.title,
            layout: slideOutline.layout as PPTSlide['layout'],
            keyPoints: slideOutline.keyPoints,
            notes: slideOutline.notes,
          },
          context,
          previousSlide
        );

        const contentResponse = await callAI(systemPrompt, contentPrompt, controller.signal);
        const contentData = parseJSONResponse(contentResponse) as {
          title: string;
          subtitle?: string;
          content?: string;
          bullets?: string[];
          notes?: string;
        };

        const slide: PPTSlide = {
          id: `slide-${i + 1}-${Date.now()}`,
          order: i,
          layout: (slideOutline.layout as PPTSlide['layout']) || 'title-content',
          title: contentData.title || slideOutline.title,
          subtitle: contentData.subtitle,
          content: contentData.content,
          bullets: contentData.bullets,
          notes: contentData.notes || slideOutline.notes,
          elements: [],
        };

        slides.push(slide);
        previousSlide = { title: slide.title || '', content: slide.content };
      }

      setProgress({
        stage: 'finalizing',
        currentSlide: slides.length,
        totalSlides: slides.length,
        message: '正在完成演示文稿...',
      });

      const newPresentation: PPTPresentation = {
        id: `ppt-${Date.now()}`,
        title: outlineData.title || config.topic,
        subtitle: outlineData.subtitle || config.description,
        theme: config.theme || DEFAULT_PPT_THEMES[0],
        slides,
        totalSlides: slides.length,
        aspectRatio: '16:9',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setPresentation(newPresentation);
      loadPresentation(newPresentation);

      setProgress({
        stage: 'complete',
        currentSlide: slides.length,
        totalSlides: slides.length,
        message: '演示文稿生成完成！',
      });

      return newPresentation;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      if (message !== 'Generation cancelled') {
        setError(message);
        setProgress({
          stage: 'error',
          currentSlide: 0,
          totalSlides: outlineData.outline.length,
          message: `生成失败: ${message}`,
        });
      }
      return null;
    } finally {
      setIsGenerating(false);
      setAbortController(null);
    }
  }, [callAI, parseJSONResponse, loadPresentation]);

  // Reset state
  const reset = useCallback(() => {
    setIsGenerating(false);
    setProgress({
      stage: 'idle',
      currentSlide: 0,
      totalSlides: 0,
      message: '',
    });
    setError(null);
    setPresentation(null);
    setOutline(null);
  }, []);

  // Estimate generation time (in seconds)
  const getEstimatedTime = useCallback((slideCount: number): number => {
    // Rough estimate: 3-5 seconds per slide
    return slideCount * 4;
  }, []);

  return {
    isGenerating,
    progress,
    error,
    presentation,
    outline,
    generateOutline,
    generateFromOutline,
    generate,
    cancel,
    reset,
    getEstimatedTime,
  };
}

export default usePPTGeneration;
