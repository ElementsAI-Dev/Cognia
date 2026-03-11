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
import type {
  PPTApprovedOutline,
  PPTEnhancedOutlineItem,
  PPTPresentation,
  PPTSlide,
  PPTTheme,
  PPTMaterial,
  PPTEnhancedGenerationOptions,
  PPTGenerationReviewMetadata,
  PPTGenerationReviewSourceMode,
  PPTGenerationSourceSummary,
  PPTMaterialAnalysis,
  PPTImageStyle,
  PPTGenerationBlueprint,
} from '@/types/workflow';
import {
  DEFAULT_PPT_THEMES,
  createDefaultPPTGenerationBlueprint,
  normalizePPTGenerationBlueprint,
} from '@/types/workflow';
import {
  PPTWorkflowExecutor,
  type PPTExecutorConfig,
  type PPTPreparedGenerationResult,
} from '@/lib/ai/workflows/ppt-executor';
import {
  classifyPPTError,
  isRetryablePPTErrorCode,
  mapPPTWorkflowStepNameToStage,
  shouldPreservePPTReviewSession,
  type PPTErrorCode,
  type PPTProgressStage,
} from '@/lib/ppt/ppt-state';
import { isPPTFeatureFlagEnabled } from '@/lib/ppt/feature-flags';
import {
  buildSystemPrompt,
  buildOutlinePrompt,
  buildSlideContentPrompt,
  type GenerationContext,
} from '@/components/ppt/utils/generation-prompts';
import { suggestLayout } from '@/components/ppt/utils/layout-engine';
import { parseGenerationBlueprint } from '@/components/ppt/types';

export interface PPTGenerationConfig {
  topic: string;
  description?: string;
  audience?: string;
  purpose?: 'informative' | 'persuasive' | 'educational' | 'pitch' | 'report';
  tone?: 'formal' | 'casual' | 'professional' | 'creative';
  slideCount: number;
  theme: PPTTheme;
  generationBlueprint?: Partial<PPTGenerationBlueprint>;
  language?: string;
  includeImages?: boolean;
  includeCharts?: boolean;
}

export interface PPTGenerationProgress {
  stage: PPTProgressStage;
  currentSlide: number;
  totalSlides: number;
  message: string;
}

export interface PPTOutlineSlideData {
  id?: string;
  slideNumber: number;
  title: string;
  layout: string;
  keyPoints?: string[];
  notes?: string;
  suggestedVisual?: string;
  imageNeeded?: boolean;
  imageSuggestion?: string;
  imageStyle?: string;
  sourceReferences?: PPTEnhancedOutlineItem['sourceReferences'];
  speakerNotes?: string;
  estimatedDuration?: number;
  transitionNote?: string;
}

export interface PPTOutlineData {
  title: string;
  subtitle?: string;
  outline: PPTOutlineSlideData[];
}

export interface PPTMaterialGenerationConfig extends PPTGenerationConfig {
  materials: PPTMaterial[];
  generateImages?: boolean;
  imageStyle?: PPTImageStyle;
}

export interface PPTGenerationReviewSession {
  id: string;
  sourceMode: PPTGenerationReviewSourceMode;
  config: PPTGenerationConfig | PPTMaterialGenerationConfig;
  outline: PPTOutlineData;
  sourceSummary?: PPTGenerationSourceSummary;
  materialAnalysis?: PPTMaterialAnalysis[];
  preparedGeneration?: PPTPreparedGenerationResult;
  lastError?: {
    code: PPTErrorCode;
    message: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

type FailedRequest =
  | { type: 'generate'; config: PPTGenerationConfig }
  | { type: 'materials'; config: PPTMaterialGenerationConfig }
  | {
      type: 'review-prepare';
      config: PPTGenerationConfig | PPTMaterialGenerationConfig;
      sourceMode: PPTGenerationReviewSourceMode;
    }
  | { type: 'review-finalize' }
  | null;

function resolveGenerationBlueprint(config: PPTGenerationConfig): PPTGenerationBlueprint {
  const canvaExperienceEnabled = isPPTFeatureFlagEnabled('ppt.canvaExperience.v1');
  if (!canvaExperienceEnabled) {
    return createDefaultPPTGenerationBlueprint();
  }
  return parseGenerationBlueprint(config.generationBlueprint);
}

function applyStyleTokensToSlide(slide: PPTSlide, blueprint: PPTGenerationBlueprint): PPTSlide {
  const { styleTokens, styleKitId } = blueprint;
  return {
    ...slide,
    backgroundColor: slide.backgroundColor || styleTokens.palette[3],
    metadata: {
      ...(slide.metadata || {}),
      styleKitId,
    },
  };
}

function isMaterialGenerationConfig(
  config: PPTGenerationConfig | PPTMaterialGenerationConfig
): config is PPTMaterialGenerationConfig {
  return Array.isArray((config as PPTMaterialGenerationConfig).materials);
}

function buildGenerationContext(
  config: PPTGenerationConfig,
  generationBlueprint: PPTGenerationBlueprint,
  slideCount = config.slideCount
): GenerationContext {
  return {
    topic: config.topic,
    audience: config.audience,
    purpose: config.purpose,
    tone: config.tone,
    slideCount,
    language: config.language || 'zh-CN',
    includeImages: config.includeImages,
    includeCharts: config.includeCharts,
    templateDirection: generationBlueprint.templateDirection,
    audienceTone: generationBlueprint.audienceTone,
    contentDensity: generationBlueprint.contentDensity,
    styleKitId: generationBlueprint.styleKitId,
  };
}

function toEnhancedOptions(
  config: PPTMaterialGenerationConfig,
  generationBlueprint: PPTGenerationBlueprint
): PPTEnhancedGenerationOptions {
  return {
    topic: config.topic,
    description: config.description,
    targetAudience: config.audience,
    slideCount: config.slideCount,
    style: (config.tone === 'formal' ? 'professional' : config.tone) || 'professional',
    templateDirection: generationBlueprint.templateDirection,
    audienceTone: generationBlueprint.audienceTone,
    contentDensity: generationBlueprint.contentDensity,
    styleKitId: generationBlueprint.styleKitId,
    generationBlueprint,
    language: config.language || 'zh-CN',
    materials: config.materials,
    generateImages: config.generateImages ?? false,
    imageStyle: config.imageStyle,
    theme: config.theme
      ? {
          primaryColor: config.theme.primaryColor,
          secondaryColor: config.theme.secondaryColor,
          backgroundColor: config.theme.backgroundColor,
          textColor: config.theme.textColor,
          headingFont: config.theme.headingFont,
          bodyFont: config.theme.bodyFont,
        }
      : undefined,
  };
}

function createSourceSummary(
  materialAnalysis: PPTMaterialAnalysis[],
  contentSummary: Record<string, unknown>
): PPTGenerationSourceSummary | undefined {
  if (materialAnalysis.length === 0) {
    return undefined;
  }

  const keyTopics = Array.from(
    new Set(materialAnalysis.flatMap((item) => item.keyTopics).filter(Boolean))
  ).slice(0, 10);
  const highlights = Array.from(
    new Set(materialAnalysis.flatMap((item) => item.keyPoints).filter(Boolean))
  ).slice(0, 8);
  const suggestedSlideCount = materialAnalysis.reduce((max, item) => {
    return Math.max(max, item.structure?.suggestedSlideCount || 0);
  }, 0);

  return {
    materialCount: materialAnalysis.length,
    suggestedSlideCount,
    keyTopics,
    highlights,
    synthesizedSummary:
      typeof contentSummary.summary === 'string' ? contentSummary.summary : undefined,
    materials: materialAnalysis.map((item) => ({
      materialId: item.materialId,
      name: item.entities[0]?.name,
      summary: item.summary,
      keyTopics: item.keyTopics,
      keyPoints: item.keyPoints,
      suggestedSlideCount: item.structure?.suggestedSlideCount || 0,
    })),
  };
}

function mapEnhancedOutlineToOutlineData(
  config: PPTGenerationConfig,
  outline: PPTEnhancedOutlineItem[]
): PPTOutlineData {
  return {
    title: config.topic,
    subtitle: config.description,
    outline: outline.map((item, index) => ({
      id: item.id,
      slideNumber: index + 1,
      title: item.title,
      layout: item.suggestedLayout,
      keyPoints: item.keyPoints,
      notes: item.speakerNotes,
      suggestedVisual: item.imageSuggestion,
      imageNeeded: item.imageNeeded,
      imageSuggestion: item.imageSuggestion,
      imageStyle: item.imageStyle,
      sourceReferences: item.sourceReferences,
      speakerNotes: item.speakerNotes,
      estimatedDuration: item.estimatedDuration,
      transitionNote: item.transitionNote,
    })),
  };
}

function mapReviewOutlineToEnhancedOutline(
  outlineData: PPTOutlineData,
  preparedOutline: PPTEnhancedOutlineItem[]
): PPTEnhancedOutlineItem[] {
  const baseById = new Map(preparedOutline.map((item) => [item.id, item]));

  return outlineData.outline.map((item, index) => {
    const base = (item.id ? baseById.get(item.id) : undefined) || preparedOutline[index];
    return {
      id: item.id || base?.id || `slide-${index + 1}`,
      title: item.title,
      description:
        base?.description || item.notes || item.keyPoints?.join(' ') || item.title,
      suggestedLayout: (item.layout as PPTEnhancedOutlineItem['suggestedLayout']) ||
        base?.suggestedLayout ||
        'title-content',
      keyPoints: item.keyPoints,
      order: index,
      imageNeeded: base?.imageNeeded ?? Boolean(item.suggestedVisual),
      imageSuggestion: item.suggestedVisual || base?.imageSuggestion,
      imageStyle: item.imageStyle || base?.imageStyle,
      sourceReferences: item.sourceReferences || base?.sourceReferences,
      dataVisualization: base?.dataVisualization,
      speakerNotes: item.notes || item.speakerNotes || base?.speakerNotes || '',
      estimatedDuration: item.estimatedDuration || base?.estimatedDuration,
      transitionNote: item.transitionNote || base?.transitionNote,
    };
  });
}

function createApprovedOutline(
  config: PPTGenerationConfig,
  outlineData: PPTOutlineData,
  sourceMode: PPTGenerationReviewSourceMode
): PPTApprovedOutline {
  return {
    title: outlineData.title || config.topic,
    subtitle: outlineData.subtitle || config.description,
    topic: config.topic,
    audience: config.audience,
    slideCount: outlineData.outline.length,
    sourceMode,
    confirmedAt: new Date(),
    outline: outlineData.outline.map((item, index) => ({
      id: item.id,
      slideNumber: index + 1,
      title: item.title,
      layout: item.layout,
      keyPoints: item.keyPoints,
      notes: item.notes,
      suggestedVisual: item.suggestedVisual,
    })),
  };
}

function buildReviewMetadata(
  sourceMode: PPTGenerationReviewSourceMode,
  generationBlueprint: PPTGenerationBlueprint,
  sourceSummary?: PPTGenerationSourceSummary
): PPTGenerationReviewMetadata {
  return {
    sourceMode,
    confirmedAt: new Date(),
    sourceSummary,
    blueprintSnapshot: normalizePPTGenerationBlueprint(generationBlueprint),
  };
}

export interface UsePPTGenerationReturn {
  // State
  isGenerating: boolean;
  progress: PPTGenerationProgress;
  error: string | null;
  errorCode: PPTErrorCode | null;
  canRetry: boolean;
  presentation: PPTPresentation | null;
  outline: PPTOutlineData | null;
  reviewSession: PPTGenerationReviewSession | null;

  // Actions
  generateOutline: (config: PPTGenerationConfig) => Promise<PPTOutlineData | null>;
  generateFromOutline: (
    config: PPTGenerationConfig,
    outline: PPTOutlineData
  ) => Promise<PPTPresentation | null>;
  generate: (config: PPTGenerationConfig) => Promise<PPTPresentation | null>;
  generateFromMaterials: (config: PPTMaterialGenerationConfig) => Promise<PPTPresentation | null>;
  prepareReview: (
    config: PPTGenerationConfig | PPTMaterialGenerationConfig,
    sourceMode?: PPTGenerationReviewSourceMode
  ) => Promise<PPTGenerationReviewSession | null>;
  regenerateReviewOutline: () => Promise<PPTGenerationReviewSession | null>;
  updateReviewOutline: (outline: PPTOutlineData) => void;
  finalizeReview: () => Promise<PPTPresentation | null>;
  clearReviewSession: () => void;
  retry: () => Promise<PPTPresentation | null>;
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
  const [errorCode, setErrorCode] = useState<PPTErrorCode | null>(null);
  const [presentation, setPresentation] = useState<PPTPresentation | null>(null);
  const [outline, setOutline] = useState<PPTOutlineData | null>(null);
  const [reviewSession, setReviewSession] = useState<PPTGenerationReviewSession | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [lastFailedRequest, setLastFailedRequest] = useState<FailedRequest>(null);

  // Get provider settings
  const defaultProviderRaw = useSettingsStore((state) => state.defaultProvider);
  const defaultProvider = defaultProviderRaw as ProviderName;
  const providerSettings = useSettingsStore((state) => state.providerSettings);

  // PPT Editor store
  const loadPresentation = usePPTEditorStore((state) => state.loadPresentation);
  
  // Workflow store for persistence
  const addPresentation = useWorkflowStore((state) => state.addPresentation);
  const setActivePresentation = useWorkflowStore((state) => state.setActivePresentation);

  const clearErrorState = useCallback(() => {
    setError(null);
    setErrorCode(null);
  }, []);

  const updateReviewSessionError = useCallback((code: PPTErrorCode, message: string) => {
    setReviewSession((current) =>
      current
        ? {
            ...current,
            lastError: { code, message },
            updatedAt: new Date(),
          }
        : current
    );
  }, []);

  const persistPresentation = useCallback(
    (nextPresentation: PPTPresentation) => {
      setPresentation(nextPresentation);
      loadPresentation(nextPresentation);
      addPresentation(nextPresentation);
      setActivePresentation(nextPresentation.id);
    },
    [loadPresentation, addPresentation, setActivePresentation]
  );

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

  const createExecutor = useCallback(
    (controller: AbortController) => {
      const apiConfig = getAPIConfig();
      const executorConfig: PPTExecutorConfig = {
        apiKey: apiConfig.apiKey,
        onProgress: (workflowProgress) => {
          setProgress({
            stage: mapPPTWorkflowStepNameToStage(workflowProgress.currentStepName),
            currentSlide: workflowProgress.completedSteps,
            totalSlides: workflowProgress.totalSteps,
            message: workflowProgress.currentStepName || t('progressProcessing'),
          });
        },
        onError: (stepError) => {
          loggers.ai.error('Workflow step error:', stepError);
        },
        generateAIContent: async (prompt: string) => {
          const systemPrompt =
            'You are a professional presentation content creator. Generate high-quality content in the requested format.';
          return callAI(systemPrompt, prompt, controller.signal);
        },
      };

      return new PPTWorkflowExecutor(executorConfig);
    },
    [callAI, getAPIConfig, t]
  );

  // Parse JSON from AI response — delegates to shared utility
  const parseJSONResponse = useCallback((response: string): unknown => {
    return parseAIJSON(response);
  }, []);

  const isCancellationError = useCallback((error: unknown): boolean => {
    if (error instanceof Error) {
      return error.name === 'AbortError' || error.message === 'Generation cancelled';
    }
    return false;
  }, []);

  const generateOutlineOnly = useCallback(
    async (config: PPTGenerationConfig, controller: AbortController): Promise<PPTOutlineData> => {
      const generationBlueprint = resolveGenerationBlueprint(config);
      const context = buildGenerationContext(config, generationBlueprint);
      const systemPrompt = buildSystemPrompt(context);
      const outlinePrompt = buildOutlinePrompt(context);

      const outlineResponse = await callAI(systemPrompt, outlinePrompt, controller.signal);
      const outlineData = parseJSONResponse(outlineResponse) as PPTOutlineData;

      if (!outlineData.outline || outlineData.outline.length === 0) {
        throw new Error('Failed to generate presentation outline');
      }

      return outlineData;
    },
    [callAI, parseJSONResponse]
  );

  // Shared: generate slides from outline data
  const buildSlidesFromOutline = useCallback(
    async (
      outlineItems: PPTOutlineData['outline'],
      context: GenerationContext,
      generationBlueprint: PPTGenerationBlueprint,
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

        const slide = applyStyleTokensToSlide(
          {
          id: `slide-${i + 1}-${Date.now()}`,
          order: i,
          layout: slideLayout,
          title: contentData.title || slideOutline.title,
          subtitle: contentData.subtitle,
          content: contentData.content,
          bullets: contentData.bullets,
          notes: contentData.notes || slideOutline.notes,
          elements,
          },
          generationBlueprint
        );

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

  const finalizeOutlinePresentation = useCallback(
    async (
      config: PPTGenerationConfig,
      outlineData: PPTOutlineData,
      controller: AbortController,
      reviewContext?: {
        sourceMode: PPTGenerationReviewSourceMode;
        sourceSummary?: PPTGenerationSourceSummary;
      }
    ): Promise<PPTPresentation> => {
      const generationBlueprint = resolveGenerationBlueprint(config);
      const context = buildGenerationContext(
        config,
        generationBlueprint,
        outlineData.outline.length
      );
      const systemPrompt = buildSystemPrompt(context);
      const presentationId = `ppt-${Date.now()}`;
      const presentationTheme = config.theme || DEFAULT_PPT_THEMES[0];

      const approvedOutline = reviewContext
        ? createApprovedOutline(config, outlineData, reviewContext.sourceMode)
        : undefined;
      const reviewMetadata = reviewContext
        ? buildReviewMetadata(
            reviewContext.sourceMode,
            generationBlueprint,
            reviewContext.sourceSummary
          )
        : undefined;

      const slides = await buildSlidesFromOutline(
        outlineData.outline,
        context,
        generationBlueprint,
        systemPrompt,
        controller,
        (partialSlides) => {
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
            metadata: {
              generationBlueprint,
              generationSnapshots: [],
              ...(approvedOutline ? { approvedOutline } : {}),
              ...(reviewMetadata ? { generationReview: reviewMetadata } : {}),
            },
          });
        }
      );

      setProgress({
        stage: 'finalizing',
        currentSlide: slides.length,
        totalSlides: slides.length,
        message: t('progressFinalizing'),
      });

      return {
        id: presentationId,
        title: outlineData.title || config.topic,
        subtitle: outlineData.subtitle || config.description,
        theme: presentationTheme,
        slides,
        totalSlides: slides.length,
        aspectRatio: '16:9',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          generationBlueprint: normalizePPTGenerationBlueprint(generationBlueprint),
          generationSnapshots: [],
          ...(approvedOutline ? { approvedOutline } : {}),
          ...(reviewMetadata ? { generationReview: reviewMetadata } : {}),
        },
      };
    },
    [buildSlidesFromOutline, t]
  );

  // Generate presentation
  const generate = useCallback(
    async (config: PPTGenerationConfig): Promise<PPTPresentation | null> => {
      const controller = new AbortController();
      setAbortController(controller);
      setIsGenerating(true);
      clearErrorState();
      setLastFailedRequest(null);
      setProgress({
        stage: 'outline',
        currentSlide: 0,
        totalSlides: config.slideCount,
        message: t('progressGeneratingOutline'),
      });

      try {
        const outlineData = await generateOutlineOnly(config, controller);
        setOutline(outlineData);
        setProgress({
          stage: 'content',
          currentSlide: 0,
          totalSlides: outlineData.outline.length,
          message: t('progressGeneratingSlides'),
        });

        const newPresentation = await finalizeOutlinePresentation(config, outlineData, controller);
        persistPresentation(newPresentation);

        setProgress({
          stage: 'complete',
          currentSlide: newPresentation.slides.length,
          totalSlides: newPresentation.slides.length,
          message: t('progressComplete'),
        });

        return newPresentation;
      } catch (err) {
        if (isCancellationError(err)) {
          return null;
        }
        const classified = classifyPPTError(err, 'generation_error');
        const message = classified.message;
        setError(message);
        setErrorCode(classified.code);
        if (isRetryablePPTErrorCode(classified.code)) {
          setLastFailedRequest({ type: 'generate', config });
        } else {
          setLastFailedRequest(null);
        }
        setProgress({
          stage: 'error',
          currentSlide: 0,
          totalSlides: config.slideCount,
          message: t('progressError', { message }),
        });
        return null;
      } finally {
        setIsGenerating(false);
        setAbortController(null);
      }
    },
    [clearErrorState, finalizeOutlinePresentation, generateOutlineOnly, isCancellationError, persistPresentation, t]
  );

  // Generate outline only (first stage)
  const generateOutline = useCallback(
    async (config: PPTGenerationConfig): Promise<PPTOutlineData | null> => {
      const controller = new AbortController();
      setAbortController(controller);
      setIsGenerating(true);
      clearErrorState();
      setOutline(null);
      setProgress({
        stage: 'outline',
        currentSlide: 0,
        totalSlides: config.slideCount,
        message: t('progressGeneratingOutline'),
      });

      try {
        const outlineData = await generateOutlineOnly(config, controller);
        setOutline(outlineData);
        setProgress({
          stage: 'review',
          currentSlide: 0,
          totalSlides: outlineData.outline.length,
          message: t('progressOutlineComplete'),
        });

        return outlineData;
      } catch (err) {
        if (isCancellationError(err)) {
          return null;
        }
        const classified = classifyPPTError(err, 'generation_error');
        const message = classified.message;
        setError(message);
        setErrorCode(classified.code);
        setProgress({
          stage: 'error',
          currentSlide: 0,
          totalSlides: config.slideCount,
          message: t('progressOutlineError', { message }),
        });
        return null;
      } finally {
        setIsGenerating(false);
        setAbortController(null);
      }
    },
    [clearErrorState, generateOutlineOnly, isCancellationError, t]
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
      clearErrorState();
      setProgress({
        stage: 'content',
        currentSlide: 0,
        totalSlides: outlineData.outline.length,
        message: t('progressGeneratingSlides'),
      });

      try {
        const newPresentation = await finalizeOutlinePresentation(config, outlineData, controller);
        persistPresentation(newPresentation);

        setProgress({
          stage: 'complete',
          currentSlide: newPresentation.slides.length,
          totalSlides: newPresentation.slides.length,
          message: t('progressComplete'),
        });

        return newPresentation;
      } catch (err) {
        if (isCancellationError(err)) {
          return null;
        }
        const classified = classifyPPTError(err, 'generation_error');
        const message = classified.message;
        setError(message);
        setErrorCode(classified.code);
        if (isRetryablePPTErrorCode(classified.code)) {
          setLastFailedRequest({ type: 'generate', config });
        } else {
          setLastFailedRequest(null);
        }
        setProgress({
          stage: 'error',
          currentSlide: 0,
          totalSlides: outlineData.outline.length,
          message: t('progressError', { message }),
        });
        return null;
      } finally {
        setIsGenerating(false);
        setAbortController(null);
      }
    },
    [clearErrorState, finalizeOutlinePresentation, isCancellationError, persistPresentation, t]
  );

  // Generate presentation from materials using PPTWorkflowExecutor
  const generateFromMaterials = useCallback(
    async (config: PPTMaterialGenerationConfig): Promise<PPTPresentation | null> => {
      const controller = new AbortController();
      setAbortController(controller);
      setIsGenerating(true);
      clearErrorState();
      setLastFailedRequest(null);
      setProgress({
        stage: 'outline',
        currentSlide: 0,
        totalSlides: config.slideCount,
        message: t('progressProcessingMaterials'),
      });

      try {
        const generationBlueprint = resolveGenerationBlueprint(config);
        const executor = createExecutor(controller);
        const enhancedOptions = toEnhancedOptions(config, generationBlueprint);
        const result = await executor.execute(enhancedOptions);

        if (!result.success || !result.presentation) {
          throw new Error(result.errors?.join(', ') || 'Failed to generate presentation from materials');
        }

        const newPresentation: PPTPresentation = {
          ...result.presentation,
          metadata: {
            ...(result.presentation.metadata || {}),
            generationBlueprint: normalizePPTGenerationBlueprint(generationBlueprint),
            generationSnapshots: result.presentation.metadata?.generationSnapshots || [],
          },
        };
        persistPresentation(newPresentation);

        setProgress({
          stage: 'complete',
          currentSlide: newPresentation.slides.length,
          totalSlides: newPresentation.slides.length,
          message: t('progressComplete'),
        });

        return newPresentation;
      } catch (err) {
        if (isCancellationError(err)) {
          return null;
        }
        const classified = classifyPPTError(err, 'generation_error');
        const message = classified.message;
        setError(message);
        setErrorCode(classified.code);
        if (isRetryablePPTErrorCode(classified.code)) {
          setLastFailedRequest({ type: 'materials', config });
        } else {
          setLastFailedRequest(null);
        }
        setProgress({
          stage: 'error',
          currentSlide: 0,
          totalSlides: config.slideCount,
          message: t('progressMaterialError', { message }),
        });
        return null;
      } finally {
        setIsGenerating(false);
        setAbortController(null);
      }
    },
    [clearErrorState, createExecutor, isCancellationError, persistPresentation, t]
  );

  const prepareReview = useCallback(
    async (
      config: PPTGenerationConfig | PPTMaterialGenerationConfig,
      sourceMode: PPTGenerationReviewSourceMode = isMaterialGenerationConfig(config)
        ? 'import'
        : 'generate'
    ): Promise<PPTGenerationReviewSession | null> => {
      const controller = new AbortController();
      setAbortController(controller);
      setIsGenerating(true);
      clearErrorState();
      setLastFailedRequest(null);
      setProgress({
        stage: 'outline',
        currentSlide: 0,
        totalSlides: config.slideCount,
        message: isMaterialGenerationConfig(config)
          ? t('progressProcessingMaterials')
          : t('progressGeneratingOutline'),
      });

      try {
        const nextSessionId = `ppt-review-${Date.now()}`;

        if (isMaterialGenerationConfig(config)) {
          const generationBlueprint = resolveGenerationBlueprint(config);
          const executor = createExecutor(controller);
          const enhancedOptions = toEnhancedOptions(config, generationBlueprint);
          const prepared = await executor.prepareGeneration(enhancedOptions);
          const outlineData = mapEnhancedOutlineToOutlineData(config, prepared.outline);
          const sourceSummary = createSourceSummary(
            prepared.materialAnalysis,
            prepared.contentSummary
          );

          const session: PPTGenerationReviewSession = {
            id: nextSessionId,
            sourceMode,
            config,
            outline: outlineData,
            sourceSummary,
            materialAnalysis: prepared.materialAnalysis,
            preparedGeneration: prepared,
            lastError: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          setOutline(outlineData);
          setReviewSession(session);
          setProgress({
            stage: 'review',
            currentSlide: 0,
            totalSlides: outlineData.outline.length,
            message: t('progressOutlineComplete'),
          });
          return session;
        }

        const outlineData = await generateOutlineOnly(config, controller);
        const session: PPTGenerationReviewSession = {
          id: nextSessionId,
          sourceMode,
          config,
          outline: outlineData,
          lastError: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        setOutline(outlineData);
        setReviewSession(session);
        setProgress({
          stage: 'review',
          currentSlide: 0,
          totalSlides: outlineData.outline.length,
          message: t('progressOutlineComplete'),
        });
        return session;
      } catch (rawError) {
        if (isCancellationError(rawError)) {
          return null;
        }

        const classified = classifyPPTError(rawError, 'generation_error');
        setError(classified.message);
        setErrorCode(classified.code);
        setLastFailedRequest({ type: 'review-prepare', config, sourceMode });
        setProgress({
          stage: 'error',
          currentSlide: 0,
          totalSlides: config.slideCount,
          message: isMaterialGenerationConfig(config)
            ? t('progressMaterialError', { message: classified.message })
            : t('progressOutlineError', { message: classified.message }),
        });
        return null;
      } finally {
        setIsGenerating(false);
        setAbortController(null);
      }
    },
    [clearErrorState, createExecutor, generateOutlineOnly, isCancellationError, t]
  );

  const updateReviewOutline = useCallback(
    (nextOutline: PPTOutlineData) => {
      setOutline(nextOutline);
      setReviewSession((current) =>
        current
          ? {
              ...current,
              outline: nextOutline,
              updatedAt: new Date(),
              lastError: null,
            }
          : current
      );
      setProgress((current) => ({
        ...current,
        stage: 'review',
        totalSlides: nextOutline.outline.length,
        message: t('progressOutlineComplete'),
      }));
    },
    [t]
  );

  const regenerateReviewOutline = useCallback(async (): Promise<PPTGenerationReviewSession | null> => {
    if (!reviewSession) return null;

    const controller = new AbortController();
    setAbortController(controller);
    setIsGenerating(true);
    clearErrorState();
    setProgress({
      stage: 'outline',
      currentSlide: 0,
      totalSlides: reviewSession.config.slideCount,
      message: reviewSession.preparedGeneration
        ? t('progressProcessingMaterials')
        : t('progressGeneratingOutline'),
    });

    try {
      let nextOutline: PPTOutlineData;
      let nextPreparedGeneration = reviewSession.preparedGeneration;

      if (reviewSession.preparedGeneration && isMaterialGenerationConfig(reviewSession.config)) {
        const generationBlueprint = resolveGenerationBlueprint(reviewSession.config);
        const executor = createExecutor(controller);
        const enhancedOptions = toEnhancedOptions(reviewSession.config, generationBlueprint);
        const regeneratedOutline = await executor.regeneratePreparedOutline(
          enhancedOptions,
          reviewSession.preparedGeneration
        );
        nextPreparedGeneration = {
          ...reviewSession.preparedGeneration,
          outline: regeneratedOutline,
        };
        nextOutline = mapEnhancedOutlineToOutlineData(reviewSession.config, regeneratedOutline);
      } else {
        nextOutline = await generateOutlineOnly(
          reviewSession.config as PPTGenerationConfig,
          controller
        );
      }

      const nextSession: PPTGenerationReviewSession = {
        ...reviewSession,
        outline: nextOutline,
        preparedGeneration: nextPreparedGeneration,
        updatedAt: new Date(),
        lastError: null,
      };

      setOutline(nextOutline);
      setReviewSession(nextSession);
      setProgress({
        stage: 'review',
        currentSlide: 0,
        totalSlides: nextOutline.outline.length,
        message: t('progressOutlineComplete'),
      });
      return nextSession;
    } catch (rawError) {
      if (isCancellationError(rawError)) {
        return null;
      }

      const classified = classifyPPTError(rawError, 'generation_error');
      setError(classified.message);
      setErrorCode(classified.code);
      updateReviewSessionError(classified.code, classified.message);
      setLastFailedRequest({
        type: 'review-prepare',
        config: reviewSession.config,
        sourceMode: reviewSession.sourceMode,
      });
      setProgress({
        stage: 'error',
        currentSlide: 0,
        totalSlides: reviewSession.config.slideCount,
        message: t('progressOutlineError', { message: classified.message }),
      });
      return null;
    } finally {
      setIsGenerating(false);
      setAbortController(null);
    }
  }, [
    clearErrorState,
    createExecutor,
    generateOutlineOnly,
    isCancellationError,
    reviewSession,
    t,
    updateReviewSessionError,
  ]);

  const finalizeReview = useCallback(async (): Promise<PPTPresentation | null> => {
    if (!reviewSession) return null;

    const controller = new AbortController();
    setAbortController(controller);
    setIsGenerating(true);
    clearErrorState();
    setLastFailedRequest(null);
    setProgress({
      stage: 'content',
      currentSlide: 0,
      totalSlides: reviewSession.outline.outline.length,
      message: t('progressGeneratingSlides'),
    });

    try {
      let newPresentation: PPTPresentation | null = null;
      const config = reviewSession.config;

      if (reviewSession.preparedGeneration && isMaterialGenerationConfig(config)) {
        const generationBlueprint = resolveGenerationBlueprint(config);
        const executor = createExecutor(controller);
        const enhancedOptions = toEnhancedOptions(config, generationBlueprint);
        const approvedOutline = createApprovedOutline(
          config,
          reviewSession.outline,
          reviewSession.sourceMode
        );
        const reviewMetadata = buildReviewMetadata(
          reviewSession.sourceMode,
          generationBlueprint,
          reviewSession.sourceSummary
        );
        const outlined = mapReviewOutlineToEnhancedOutline(
          reviewSession.outline,
          reviewSession.preparedGeneration.outline
        );
        const result = await executor.finalizeGeneration(
          enhancedOptions,
          reviewSession.preparedGeneration,
          outlined
        );

        if (!result.success || !result.presentation) {
          throw new Error(result.errors?.join(', ') || 'Failed to finalize presentation');
        }

        newPresentation = {
          ...result.presentation,
          metadata: {
            ...(result.presentation.metadata || {}),
            generationBlueprint: normalizePPTGenerationBlueprint(generationBlueprint),
            generationSnapshots: result.presentation.metadata?.generationSnapshots || [],
            approvedOutline,
            generationReview: reviewMetadata,
          },
        };
      } else {
        newPresentation = await finalizeOutlinePresentation(
          config as PPTGenerationConfig,
          reviewSession.outline,
          controller,
          {
            sourceMode: reviewSession.sourceMode,
            sourceSummary: reviewSession.sourceSummary,
          }
        );
      }

      persistPresentation(newPresentation);
      setReviewSession(null);
      setProgress({
        stage: 'complete',
        currentSlide: newPresentation.slides.length,
        totalSlides: newPresentation.slides.length,
        message: t('progressComplete'),
      });
      return newPresentation;
    } catch (rawError) {
      if (isCancellationError(rawError)) {
        return null;
      }

      const classified = classifyPPTError(rawError, 'generation_error');
      setError(classified.message);
      setErrorCode(classified.code);
      updateReviewSessionError(classified.code, classified.message);
      if (isRetryablePPTErrorCode(classified.code)) {
        setLastFailedRequest({ type: 'review-finalize' });
      } else {
        setLastFailedRequest(null);
      }
      setProgress({
        stage: 'error',
        currentSlide: 0,
        totalSlides: reviewSession.outline.outline.length,
        message: t('progressError', { message: classified.message }),
      });
      return null;
    } finally {
      setIsGenerating(false);
      setAbortController(null);
    }
  }, [
    clearErrorState,
    createExecutor,
    finalizeOutlinePresentation,
    isCancellationError,
    persistPresentation,
    reviewSession,
    t,
    updateReviewSessionError,
  ]);

  const clearReviewSession = useCallback(() => {
    setReviewSession(null);
    setOutline(null);
    setError(null);
    setErrorCode(null);
    setLastFailedRequest(null);
    setProgress({
      stage: 'idle',
      currentSlide: 0,
      totalSlides: 0,
      message: '',
    });
  }, []);

  const retry = useCallback(async (): Promise<PPTPresentation | null> => {
    if (!lastFailedRequest || isGenerating) return null;

    if (lastFailedRequest.type === 'generate') {
      return generate(lastFailedRequest.config);
    }

    if (lastFailedRequest.type === 'materials') {
      return generateFromMaterials(lastFailedRequest.config);
    }

    if (lastFailedRequest.type === 'review-prepare') {
      await prepareReview(lastFailedRequest.config, lastFailedRequest.sourceMode);
      return null;
    }

    if (lastFailedRequest.type === 'review-finalize') {
      return finalizeReview();
    }

    return null;
  }, [
    finalizeReview,
    generate,
    generateFromMaterials,
    isGenerating,
    lastFailedRequest,
    prepareReview,
  ]);

  // Reset state
  const cancel = useCallback(() => {
    if (abortController) {
      abortController.abort();
    }
    setIsGenerating(false);

    if (reviewSession && shouldPreservePPTReviewSession('cancel', errorCode)) {
      setProgress({
        stage: 'review',
        currentSlide: 0,
        totalSlides: reviewSession.outline.outline.length,
        message: t('progressOutlineComplete'),
      });
      return;
    }

    setProgress({
      stage: 'idle',
      currentSlide: 0,
      totalSlides: 0,
      message: t('progressCancelled'),
    });
  }, [abortController, errorCode, reviewSession, t]);

  const reset = useCallback(() => {
    setIsGenerating(false);
    setProgress({
      stage: 'idle',
      currentSlide: 0,
      totalSlides: 0,
      message: '',
    });
    setError(null);
    setErrorCode(null);
    setLastFailedRequest(null);
    setPresentation(null);
    setOutline(null);
    setReviewSession(null);
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
    errorCode,
    canRetry: Boolean(lastFailedRequest && !isGenerating),
    presentation,
    outline,
    reviewSession,
    generateOutline,
    generateFromOutline,
    generate,
    generateFromMaterials,
    prepareReview,
    regenerateReviewOutline,
    updateReviewOutline,
    finalizeReview,
    clearReviewSession,
    retry,
    cancel,
    reset,
    getEstimatedTime,
  };
}

export default usePPTGeneration;
