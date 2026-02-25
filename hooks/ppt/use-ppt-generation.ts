'use client';

/**
 * usePPTGeneration - Hook for AI-powered PPT generation workflow
 * Handles the complete flow from user requirements to final presentation
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { generateText } from 'ai';
import { useSettingsStore, useWorkflowStore } from '@/stores';
import { usePPTEditorStore } from '@/stores/tools/ppt-editor-store';
import { resolvePPTAIConfig, createPPTModelInstance } from '@/lib/ai/utils/ppt-ai-config';
import type { ProviderName } from '@/types/provider';
import { parseAIJSON } from '@/lib/ai/utils/parse-ai-json';
import { loggers } from '@/lib/logger';
import type { PPTPresentation, PPTSlide, PPTTheme, PPTMaterial, PPTEnhancedGenerationOptions, PPTImageStyle } from '@/types/workflow';
import { DEFAULT_PPT_THEMES } from '@/types/workflow';
import { PPTWorkflowExecutor, type PPTExecutorConfig } from '@/lib/ai/workflows/ppt-executor';
import {
  buildSystemPrompt,
  buildOutlinePrompt,
  buildSlideContentPrompt,
  type GenerationContext,
} from '@/components/ppt/utils/generation-prompts';
import { suggestLayout } from '@/components/ppt/utils/layout-engine';

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

export interface PPTMaterialGenerationConfig extends PPTGenerationConfig {
  materials: PPTMaterial[];
  generateImages?: boolean;
  imageStyle?: PPTImageStyle;
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
  generateFromOutline: (
    config: PPTGenerationConfig,
    outline: PPTOutlineData
  ) => Promise<PPTPresentation | null>;
  generate: (config: PPTGenerationConfig) => Promise<PPTPresentation | null>;
  generateFromMaterials: (config: PPTMaterialGenerationConfig) => Promise<PPTPresentation | null>;
  cancel: () => void;
  reset: () => void;

  // Utilities
  getEstimatedTime: (slideCount: number) => number;
}

export function usePPTGeneration(): UsePPTGenerationReturn {
  const t = useTranslations('pptGenerator');
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
  
  // Workflow store for persistence
  const addPresentation = useWorkflowStore((state) => state.addPresentation);

  // Get API configuration
  const getAPIConfig = useCallback(() => {
    return resolvePPTAIConfig(defaultProvider, providerSettings);
  }, [defaultProvider, providerSettings]);

  // Call AI API for generation using direct client (works in static export/desktop)
  const callAI = useCallback(
    async (systemPrompt: string, userPrompt: string, signal?: AbortSignal): Promise<string> => {
      const config = resolvePPTAIConfig(defaultProvider, providerSettings);
      const modelInstance = createPPTModelInstance(config);

      const { text } = await generateText({
        model: modelInstance,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.7,
        abortSignal: signal,
      });

      return text;
    },
    [defaultProvider, providerSettings]
  );

  // Parse JSON from AI response — delegates to shared utility
  const parseJSONResponse = useCallback((response: string): unknown => {
    return parseAIJSON(response);
  }, []);

  // Shared: generate slides from outline data
  const buildSlidesFromOutline = useCallback(
    async (
      outlineItems: PPTOutlineData['outline'],
      context: GenerationContext,
      systemPrompt: string,
      controller: AbortController,
      onSlideComplete?: (slides: PPTSlide[]) => void
    ): Promise<PPTSlide[]> => {
      const slides: PPTSlide[] = [];
      let previousSlide: { title: string; content?: string } | undefined;
      const allOutlineTitles = outlineItems.map((item) => item.title);
      const previousLayouts: PPTSlide['layout'][] = [];

      for (let i = 0; i < outlineItems.length; i++) {
        if (controller.signal.aborted) {
          throw new Error('Generation cancelled');
        }

        const slideOutline = outlineItems[i];
        setProgress({
          stage: 'content',
          currentSlide: i + 1,
          totalSlides: outlineItems.length,
          message: t('progressGeneratingSlide', { current: i + 1, total: outlineItems.length }),
        });

        const contentPrompt = buildSlideContentPrompt(
          {
            title: slideOutline.title,
            layout: slideOutline.layout as PPTSlide['layout'],
            keyPoints: slideOutline.keyPoints,
            notes: slideOutline.notes,
          },
          context,
          previousSlide,
          allOutlineTitles
        );

        const contentResponse = await callAI(systemPrompt, contentPrompt, controller.signal);
        const contentData = parseJSONResponse(contentResponse) as {
          title: string;
          subtitle?: string;
          content?: string;
          bullets?: string[];
          notes?: string;
          imagePrompt?: string;
          chartData?: { type: string; labels: string[]; datasets: Array<{ label: string; data: number[] }> };
          tableData?: string[][];
        };

        const contentLayout = suggestLayout({
          title: contentData.title || slideOutline.title,
          subtitle: contentData.subtitle,
          content: contentData.content,
          bullets: contentData.bullets,
          hasChart: !!contentData.chartData,
          hasTable: !!contentData.tableData,
          previousLayouts,
        });

        const slideLayout = (slideOutline.layout as PPTSlide['layout']) || contentLayout;

        // Build elements from AI-returned structured data
        const elements: PPTSlide['elements'] = [];
        if (contentData.chartData?.labels && contentData.chartData?.datasets) {
          elements.push({
            id: `chart-${i}-${Date.now()}`,
            type: 'chart',
            content: contentData.chartData.type || 'bar',
            position: { x: 10, y: 25, width: 80, height: 65 },
            metadata: {
              chartType: contentData.chartData.type || 'bar',
              chartData: contentData.chartData,
            },
          });
        }
        if (contentData.tableData && contentData.tableData.length > 0) {
          elements.push({
            id: `table-${i}-${Date.now()}`,
            type: 'table',
            content: 'table',
            position: { x: 5, y: 25, width: 90, height: 65 },
            metadata: {
              data: contentData.tableData,
              tableData: contentData.tableData,
            },
          });
        }

        const slide: PPTSlide = {
          id: `slide-${i + 1}-${Date.now()}`,
          order: i,
          layout: slideLayout,
          title: contentData.title || slideOutline.title,
          subtitle: contentData.subtitle,
          content: contentData.content,
          bullets: contentData.bullets,
          notes: contentData.notes || slideOutline.notes,
          elements,
        };

        slides.push(slide);
        previousSlide = { title: slide.title || '', content: slide.content };
        previousLayouts.push(slideLayout);

        // Incremental preview — notify caller after each slide completes
        onSlideComplete?.([...slides]);
      }

      return slides;
    },
    [callAI, parseJSONResponse, t]
  );

  // Generate presentation
  const generate = useCallback(
    async (config: PPTGenerationConfig): Promise<PPTPresentation | null> => {
      const controller = new AbortController();
      setAbortController(controller);
      setIsGenerating(true);
      setError(null);
      setProgress({
        stage: 'outline',
        currentSlide: 0,
        totalSlides: config.slideCount,
        message: t('progressGeneratingOutline'),
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
          message: t('progressGeneratingSlides'),
        });

        const presentationId = `ppt-${Date.now()}`;
        const presentationTheme = config.theme || DEFAULT_PPT_THEMES[0];

        const slides = await buildSlidesFromOutline(
          outlineData.outline, context, systemPrompt, controller,
          (partialSlides) => {
            // H4: Incremental preview — update presentation as each slide completes
            setPresentation({
              id: presentationId,
              title: outlineData.title || config.topic,
              subtitle: outlineData.subtitle || config.description,
              theme: presentationTheme,
              slides: partialSlides,
              totalSlides: outlineData.outline.length,
              aspectRatio: '16:9',
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        );

        // Step 3: Finalize presentation
        setProgress({
          stage: 'finalizing',
          currentSlide: slides.length,
          totalSlides: slides.length,
          message: t('progressFinalizing'),
        });

        const newPresentation: PPTPresentation = {
          id: presentationId,
          title: outlineData.title || config.topic,
          subtitle: outlineData.subtitle || config.description,
          theme: presentationTheme,
          slides,
          totalSlides: slides.length,
          aspectRatio: '16:9',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        setPresentation(newPresentation);

        // Load into editor
        loadPresentation(newPresentation);
        
        // Save to workflow store for persistence
        addPresentation(newPresentation);

        setProgress({
          stage: 'complete',
          currentSlide: slides.length,
          totalSlides: slides.length,
          message: t('progressComplete'),
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
            message: t('progressError', { message }),
          });
        }
        return null;
      } finally {
        setIsGenerating(false);
        setAbortController(null);
      }
    },
    [callAI, parseJSONResponse, buildSlidesFromOutline, loadPresentation, addPresentation, t]
  );

  // Cancel generation
  const cancel = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setIsGenerating(false);
      setProgress({
        stage: 'idle',
        currentSlide: 0,
        totalSlides: 0,
        message: t('progressCancelled'),
      });
    }
  }, [abortController, t]);

  // Generate outline only (first stage)
  const generateOutline = useCallback(
    async (config: PPTGenerationConfig): Promise<PPTOutlineData | null> => {
      const controller = new AbortController();
      setAbortController(controller);
      setIsGenerating(true);
      setError(null);
      setOutline(null);
      setProgress({
        stage: 'outline',
        currentSlide: 0,
        totalSlides: config.slideCount,
        message: t('progressGeneratingOutline'),
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
          message: t('progressOutlineComplete'),
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
            message: t('progressOutlineError', { message }),
          });
        }
        return null;
      } finally {
        setIsGenerating(false);
        setAbortController(null);
      }
    },
    [callAI, parseJSONResponse, t]
  );

  // Generate full presentation from existing outline (second stage)
  const generateFromOutline = useCallback(
    async (
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
        message: t('progressGeneratingSlides'),
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
        const presentationId = `ppt-${Date.now()}`;
        const presentationTheme = config.theme || DEFAULT_PPT_THEMES[0];

        const slides = await buildSlidesFromOutline(
          outlineData.outline, context, systemPrompt, controller,
          (partialSlides) => {
            // Incremental preview — update presentation as each slide completes
            setPresentation({
              id: presentationId,
              title: outlineData.title || config.topic,
              subtitle: outlineData.subtitle || config.description,
              theme: presentationTheme,
              slides: partialSlides,
              totalSlides: outlineData.outline.length,
              aspectRatio: '16:9',
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        );

        setProgress({
          stage: 'finalizing',
          currentSlide: slides.length,
          totalSlides: slides.length,
          message: t('progressFinalizing'),
        });

        const newPresentation: PPTPresentation = {
          id: presentationId,
          title: outlineData.title || config.topic,
          subtitle: outlineData.subtitle || config.description,
          theme: presentationTheme,
          slides,
          totalSlides: slides.length,
          aspectRatio: '16:9',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        setPresentation(newPresentation);
        loadPresentation(newPresentation);
        
        // Save to workflow store for persistence
        addPresentation(newPresentation);

        setProgress({
          stage: 'complete',
          currentSlide: slides.length,
          totalSlides: slides.length,
          message: t('progressComplete'),
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
            message: t('progressError', { message }),
          });
        }
        return null;
      } finally {
        setIsGenerating(false);
        setAbortController(null);
      }
    },
    [buildSlidesFromOutline, loadPresentation, addPresentation, t]
  );

  // Generate presentation from materials using PPTWorkflowExecutor
  const generateFromMaterials = useCallback(
    async (config: PPTMaterialGenerationConfig): Promise<PPTPresentation | null> => {
      const controller = new AbortController();
      setAbortController(controller);
      setIsGenerating(true);
      setError(null);
      setProgress({
        stage: 'outline',
        currentSlide: 0,
        totalSlides: config.slideCount,
        message: t('progressProcessingMaterials'),
      });

      try {
        const apiConfig = getAPIConfig();

        const executorConfig: PPTExecutorConfig = {
          apiKey: apiConfig.apiKey,
          onProgress: (workflowProgress) => {
            setProgress({
              stage: workflowProgress.currentStepName?.includes('outline') ? 'outline'
                : workflowProgress.currentStepName?.includes('slide') ? 'content'
                : 'finalizing',
              currentSlide: workflowProgress.completedSteps,
              totalSlides: workflowProgress.totalSteps,
              message: workflowProgress.currentStepName || t('progressProcessing'),
            });
          },
          onError: (err) => {
            loggers.ai.error('Workflow step error:', err);
          },
          generateAIContent: async (prompt: string) => {
            const systemPrompt = 'You are a professional presentation content creator. Generate high-quality content in the requested format.';
            return callAI(systemPrompt, prompt, controller.signal);
          },
        };

        const executor = new PPTWorkflowExecutor(executorConfig);

        const enhancedOptions: PPTEnhancedGenerationOptions = {
          topic: config.topic,
          description: config.description,
          targetAudience: config.audience,
          slideCount: config.slideCount,
          style: (config.tone === 'formal' ? 'professional' : config.tone) || 'professional',
          language: config.language || 'zh-CN',
          materials: config.materials,
          generateImages: config.generateImages ?? false,
          imageStyle: config.imageStyle,
          theme: config.theme ? {
            primaryColor: config.theme.primaryColor,
            secondaryColor: config.theme.secondaryColor,
            backgroundColor: config.theme.backgroundColor,
            textColor: config.theme.textColor,
            headingFont: config.theme.headingFont,
            bodyFont: config.theme.bodyFont,
          } : undefined,
        };

        const result = await executor.execute(enhancedOptions);

        if (!result.success || !result.presentation) {
          throw new Error(result.errors?.join(', ') || 'Failed to generate presentation from materials');
        }

        const newPresentation = result.presentation;
        setPresentation(newPresentation);
        loadPresentation(newPresentation);
        addPresentation(newPresentation);

        setProgress({
          stage: 'complete',
          currentSlide: newPresentation.slides.length,
          totalSlides: newPresentation.slides.length,
          message: t('progressComplete'),
        });

        return newPresentation;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Material generation failed';
        if (message !== 'Generation cancelled') {
          setError(message);
          setProgress({
            stage: 'error',
            currentSlide: 0,
            totalSlides: config.slideCount,
            message: t('progressMaterialError', { message }),
          });
        }
        return null;
      } finally {
        setIsGenerating(false);
        setAbortController(null);
      }
    },
    [callAI, getAPIConfig, loadPresentation, addPresentation, t]
  );

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
    generateFromMaterials,
    cancel,
    reset,
    getEstimatedTime,
  };
}

export default usePPTGeneration;
