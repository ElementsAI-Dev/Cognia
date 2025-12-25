/**
 * PPT Workflow Executor - Executes the complete PPT generation workflow
 * 
 * Provides end-to-end PPT generation with:
 * - Material processing and summarization
 * - AI-powered content generation
 * - Image generation for slides
 * - Multiple export formats
 * - Progress tracking and error handling
 */

import type {
  PPTEnhancedGenerationOptions,
  PPTEnhancedOutlineItem,
  PPTEnhancedSlide,
  PPTMaterial,
  PPTMaterialAnalysis,
  PPTWorkflowProgress,
  PPTWorkflowResult,
  PPTSlideImageResult,
  PPTTheme,
  PPTImageProvider,
  PPTImageStyle,
} from '@/types/workflow';
import {
  buildEnhancedPresentation,
  generateMarpMarkdown,
  parseEnhancedOutlineResponse,
  parseEnhancedSlidesResponse,
} from './ppt-workflow';
import {
  executeMaterialExtract,
  executeMaterialAnalyze,
  executeMaterialSummarize,
} from '../tools/material-tool';
import { enhanceSlidesWithImages } from '../tools/slide-image-tool';

// =====================
// Executor Types
// =====================

export interface PPTExecutorConfig {
  apiKey: string;
  imageApiKey?: string;
  imageProvider?: PPTImageProvider;
  imageModel?: string;
  onProgress?: (progress: PPTWorkflowProgress) => void;
  onStepComplete?: (stepId: string, result: unknown) => void;
  onError?: (error: Error, stepId: string) => void;
  generateAIContent?: (prompt: string, context: Record<string, unknown>) => Promise<string>;
}

export interface ExecutorState {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  currentStep: string;
  completedSteps: string[];
  stepResults: Map<string, unknown>;
  errors: string[];
  warnings: string[];
  startTime?: Date;
  endTime?: Date;
}

// =====================
// PPT Workflow Executor Class
// =====================

export class PPTWorkflowExecutor {
  private config: PPTExecutorConfig;
  private state: ExecutorState;
  private abortController: AbortController | null = null;
  
  constructor(config: PPTExecutorConfig) {
    this.config = config;
    this.state = this.createInitialState();
  }
  
  private createInitialState(): ExecutorState {
    return {
      status: 'idle',
      currentStep: '',
      completedSteps: [],
      stepResults: new Map(),
      errors: [],
      warnings: [],
    };
  }
  
  /**
   * Execute the complete PPT generation workflow
   */
  async execute(options: PPTEnhancedGenerationOptions): Promise<PPTWorkflowResult> {
    this.state = this.createInitialState();
    this.state.status = 'running';
    this.state.startTime = new Date();
    this.abortController = new AbortController();
    
    const totalSteps = this.calculateTotalSteps(options);
    let completedSteps = 0;
    
    const updateProgress = (stepName: string, stepProgress?: number) => {
      const progress: PPTWorkflowProgress = {
        currentStep: this.state.currentStep,
        currentStepName: stepName,
        completedSteps,
        totalSteps,
        percentage: Math.round((completedSteps / totalSteps) * 100),
        currentStepProgress: stepProgress,
      };
      this.config.onProgress?.(progress);
    };
    
    try {
      // Step 1: Process materials (if provided)
      let extractedMaterials: PPTMaterial[] = [];
      let materialAnalysis: PPTMaterialAnalysis[] = [];
      let contentSummary: Record<string, unknown> = {};
      
      if (options.materials && options.materials.length > 0) {
        this.state.currentStep = 'process-materials';
        updateProgress('Processing materials');
        
        extractedMaterials = await this.processMaterials(options.materials);
        completedSteps++;
        this.state.completedSteps.push('process-materials');
        this.config.onStepComplete?.('process-materials', extractedMaterials);
        
        // Step 2: Analyze materials
        this.state.currentStep = 'analyze-materials';
        updateProgress('Analyzing materials');
        
        materialAnalysis = await this.analyzeMaterials(extractedMaterials, options);
        completedSteps++;
        this.state.completedSteps.push('analyze-materials');
        this.config.onStepComplete?.('analyze-materials', materialAnalysis);
        
        // Step 3: Summarize content
        this.state.currentStep = 'summarize-content';
        updateProgress('Summarizing content');
        
        contentSummary = await this.summarizeContent(materialAnalysis, options);
        completedSteps++;
        this.state.completedSteps.push('summarize-content');
        this.config.onStepComplete?.('summarize-content', contentSummary);
      }
      
      // Check for cancellation
      if (this.abortController.signal.aborted) {
        return this.createCancelledResult();
      }
      
      // Step 4: Analyze requirements
      this.state.currentStep = 'analyze-requirements';
      updateProgress('Analyzing requirements');
      
      const analysis = await this.analyzeRequirements(options, contentSummary);
      completedSteps++;
      this.state.completedSteps.push('analyze-requirements');
      this.config.onStepComplete?.('analyze-requirements', analysis);
      
      // Step 5: Generate enhanced outline
      this.state.currentStep = 'generate-outline';
      updateProgress('Generating outline');
      
      const outline = await this.generateEnhancedOutline(options, analysis, contentSummary);
      completedSteps++;
      this.state.completedSteps.push('generate-outline');
      this.config.onStepComplete?.('generate-outline', outline);
      
      // Step 6: Generate slide content
      this.state.currentStep = 'generate-slides';
      updateProgress('Generating slide content');
      
      let slides = await this.generateSlideContent(options, outline, contentSummary);
      completedSteps++;
      this.state.completedSteps.push('generate-slides');
      this.config.onStepComplete?.('generate-slides', slides);
      
      // Step 7: Generate images (if enabled)
      let generatedImages: PPTSlideImageResult[] = [];
      
      if (options.generateImages !== false) {
        this.state.currentStep = 'generate-images';
        updateProgress('Generating images');
        
        const imageResult = await this.generateSlideImages(
          slides,
          options,
          (completed, total) => {
            updateProgress('Generating images', Math.round((completed / total) * 100));
          }
        );
        
        slides = imageResult.slides;
        generatedImages = imageResult.generatedImages;
        completedSteps++;
        this.state.completedSteps.push('generate-images');
        this.config.onStepComplete?.('generate-images', generatedImages);
      }
      
      // Step 8: Apply design
      this.state.currentStep = 'apply-design';
      updateProgress('Applying design');
      
      const designedSlides = await this.applyDesign(slides, options);
      completedSteps++;
      this.state.completedSteps.push('apply-design');
      this.config.onStepComplete?.('apply-design', designedSlides);
      
      // Step 9: Build presentation
      this.state.currentStep = 'build-presentation';
      updateProgress('Building presentation');
      
      const theme = this.getTheme(options);
      const presentation = buildEnhancedPresentation(
        options,
        outline,
        designedSlides,
        materialAnalysis,
        theme as unknown as Record<string, unknown>
      );
      completedSteps++;
      this.state.completedSteps.push('build-presentation');
      
      // Step 10: Generate Marp content
      this.state.currentStep = 'generate-marp';
      updateProgress('Generating export formats');
      
      const marpContent = generateMarpMarkdown(presentation);
      completedSteps++;
      this.state.completedSteps.push('generate-marp');
      
      // Complete
      this.state.status = 'completed';
      this.state.endTime = new Date();
      
      const duration = this.state.endTime.getTime() - this.state.startTime!.getTime();
      
      return {
        success: true,
        presentation,
        outline,
        materialAnalysis,
        generatedImages,
        marpContent,
        statistics: {
          totalDuration: duration,
          tokensUsed: 0, // Would be tracked from AI calls
          imagesGenerated: generatedImages.filter(i => i.success).length,
          slidesCreated: slides.length,
          materialsProcessed: extractedMaterials.length,
        },
        warnings: this.state.warnings,
      };
      
    } catch (error) {
      this.state.status = 'failed';
      this.state.endTime = new Date();
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.state.errors.push(errorMessage);
      this.config.onError?.(error as Error, this.state.currentStep);
      
      return {
        success: false,
        statistics: {
          totalDuration: this.state.endTime.getTime() - (this.state.startTime?.getTime() || 0),
          tokensUsed: 0,
          imagesGenerated: 0,
          slidesCreated: 0,
          materialsProcessed: 0,
        },
        errors: this.state.errors,
        warnings: this.state.warnings,
      };
    }
  }
  
  /**
   * Cancel the workflow execution
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.state.status = 'cancelled';
    }
  }
  
  /**
   * Get current execution state
   */
  getState(): ExecutorState {
    return { ...this.state };
  }
  
  // =====================
  // Private Step Implementations
  // =====================
  
  private calculateTotalSteps(options: PPTEnhancedGenerationOptions): number {
    let steps = 6; // Base steps: analyze, outline, slides, design, build, marp
    
    if (options.materials && options.materials.length > 0) {
      steps += 3; // process, analyze, summarize materials
    }
    
    if (options.generateImages !== false) {
      steps += 1; // image generation
    }
    
    return steps;
  }
  
  private async processMaterials(materials: PPTMaterial[]): Promise<PPTMaterial[]> {
    const processed: PPTMaterial[] = [];
    
    for (const material of materials) {
      const result = executeMaterialExtract({
        content: material.content,
        type: material.type,
        name: material.name,
        mimeType: material.mimeType,
      });
      
      if (result.success && result.data) {
        const data = result.data as { material: PPTMaterial };
        processed.push(data.material);
      } else {
        this.state.warnings.push(`Failed to process material: ${material.name}`);
      }
    }
    
    return processed;
  }
  
  private async analyzeMaterials(
    materials: PPTMaterial[],
    options: PPTEnhancedGenerationOptions
  ): Promise<PPTMaterialAnalysis[]> {
    const analyses: PPTMaterialAnalysis[] = [];
    
    for (const material of materials) {
      const result = executeMaterialAnalyze({
        content: material.content,
        extractEntities: true,
        detectStructure: true,
        suggestSlides: true,
        targetSlideCount: options.slideCount,
      });
      
      if (result.success && result.data) {
        const data = result.data as { analysis: PPTMaterialAnalysis };
        analyses.push(data.analysis);
      }
    }
    
    return analyses;
  }
  
  private async summarizeContent(
    analyses: PPTMaterialAnalysis[],
    options: PPTEnhancedGenerationOptions
  ): Promise<Record<string, unknown>> {
    // Combine all analysis summaries
    const combinedContent = analyses
      .map(a => `${a.summary}\n\nKey Topics: ${a.keyTopics.join(', ')}\n\nKey Points:\n${a.keyPoints.join('\n')}`)
      .join('\n\n---\n\n');
    
    const result = executeMaterialSummarize({
      content: combinedContent,
      depth: options.summarizationDepth || 'standard',
      targetLength: 1000,
      language: options.language || 'en',
    });
    
    if (result.success && result.data) {
      return result.data as Record<string, unknown>;
    }
    
    return {};
  }
  
  private async analyzeRequirements(
    options: PPTEnhancedGenerationOptions,
    contentSummary: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // If we have an AI content generator, use it
    if (this.config.generateAIContent) {
      const prompt = this.buildAnalysisPrompt(options, contentSummary);
      const response = await this.config.generateAIContent(prompt, { options, contentSummary });
      
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch {
        // Fall through to default
      }
    }
    
    // Default analysis based on options
    return {
      themes: [options.topic],
      keyMessages: [`Understanding ${options.topic}`, `Key aspects of ${options.topic}`],
      structure: 'introduction-body-conclusion',
      toneRecommendations: options.style || 'professional',
      visualSuggestions: ['charts', 'images', 'icons'],
    };
  }
  
  private async generateEnhancedOutline(
    options: PPTEnhancedGenerationOptions,
    analysis: Record<string, unknown>,
    contentSummary: Record<string, unknown>
  ): Promise<PPTEnhancedOutlineItem[]> {
    // If we have an AI content generator, use it
    if (this.config.generateAIContent) {
      const prompt = this.buildOutlinePrompt(options, analysis, contentSummary);
      const response = await this.config.generateAIContent(prompt, { options, analysis, contentSummary });
      
      const outline = parseEnhancedOutlineResponse(response);
      if (outline.length > 0) {
        return outline;
      }
    }
    
    // Generate default outline
    return this.generateDefaultOutline(options);
  }
  
  private async generateSlideContent(
    options: PPTEnhancedGenerationOptions,
    outline: PPTEnhancedOutlineItem[],
    contentSummary: Record<string, unknown>
  ): Promise<PPTEnhancedSlide[]> {
    // If we have an AI content generator, use it
    if (this.config.generateAIContent) {
      const prompt = this.buildSlideContentPrompt(options, outline, contentSummary);
      const response = await this.config.generateAIContent(prompt, { options, outline, contentSummary });
      
      const slides = parseEnhancedSlidesResponse(response);
      if (slides.length > 0) {
        return slides;
      }
    }
    
    // Generate slides from outline
    return outline.map((item, index) => ({
      id: item.id,
      order: index,
      layout: item.suggestedLayout,
      title: item.title,
      content: item.description,
      bullets: item.keyPoints,
      notes: item.speakerNotes,
      elements: [],
      imagePrompt: item.imageNeeded ? item.imageSuggestion : undefined,
      imageStyle: item.imageStyle as PPTImageStyle | undefined,
    }));
  }
  
  private async generateSlideImages(
    slides: PPTEnhancedSlide[],
    options: PPTEnhancedGenerationOptions,
    onProgress: (completed: number, total: number) => void
  ): Promise<{
    slides: PPTEnhancedSlide[];
    generatedImages: PPTSlideImageResult[];
  }> {
    const apiKey = this.config.imageApiKey || this.config.apiKey;
    const theme = this.getTheme(options);
    
    try {
      const result = await enhanceSlidesWithImages(slides, apiKey, {
        provider: (options.imageProvider || this.config.imageProvider || 'openai') as PPTImageProvider,
        model: this.config.imageModel,
        imageStyle: options.imageStyle as PPTImageStyle,
        theme,
        concurrency: 2,
        onProgress: (completed, total) => onProgress(completed, total),
      });
      
      return {
        slides: result.slides,
        generatedImages: result.generatedImages,
      };
    } catch (error) {
      this.state.warnings.push(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        slides,
        generatedImages: [],
      };
    }
  }
  
  private async applyDesign(
    slides: PPTEnhancedSlide[],
    options: PPTEnhancedGenerationOptions
  ): Promise<PPTEnhancedSlide[]> {
    const theme = this.getTheme(options);
    
    return slides.map(slide => ({
      ...slide,
      backgroundColor: slide.backgroundColor || theme.backgroundColor,
    }));
  }
  
  private getTheme(options: PPTEnhancedGenerationOptions): PPTTheme {
    const defaultTheme: PPTTheme = {
      id: 'custom',
      name: 'Custom Theme',
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF',
      accentColor: '#60A5FA',
      backgroundColor: '#FFFFFF',
      textColor: '#1E293B',
      headingFont: 'Inter',
      bodyFont: 'Inter',
      codeFont: 'JetBrains Mono',
    };
    
    if (options.theme) {
      return { ...defaultTheme, ...options.theme };
    }
    
    return defaultTheme;
  }
  
  private createCancelledResult(): PPTWorkflowResult {
    return {
      success: false,
      statistics: {
        totalDuration: 0,
        tokensUsed: 0,
        imagesGenerated: 0,
        slidesCreated: 0,
        materialsProcessed: 0,
      },
      errors: ['Workflow cancelled by user'],
    };
  }
  
  // =====================
  // Prompt Builders
  // =====================
  
  private buildAnalysisPrompt(
    options: PPTEnhancedGenerationOptions,
    contentSummary: Record<string, unknown>
  ): string {
    return `Analyze the following presentation request and extract key requirements:

Topic: ${options.topic}
Description: ${options.description || 'N/A'}
Content Summary: ${JSON.stringify(contentSummary)}
Target Audience: ${options.targetAudience || 'General'}
Style: ${options.style || 'professional'}
Slide Count: ${options.slideCount || 10}

Provide a structured analysis including:
1. Main themes to cover
2. Key messages
3. Suggested structure
4. Tone and style recommendations
5. Visual suggestions

Output as JSON with fields: themes, keyMessages, structure, toneRecommendations, visualSuggestions`;
  }
  
  private buildOutlinePrompt(
    options: PPTEnhancedGenerationOptions,
    analysis: Record<string, unknown>,
    contentSummary: Record<string, unknown>
  ): string {
    return `Create a detailed presentation outline with enhanced metadata.

Topic: ${options.topic}
Analysis: ${JSON.stringify(analysis)}
Content Summary: ${JSON.stringify(contentSummary)}
Target Slides: ${options.slideCount || 10}
Image Style: ${options.imageStyle || 'corporate'}

Generate an enhanced outline array where each item has:
- id: unique identifier (e.g., "slide-1")
- title: slide title
- description: brief description
- suggestedLayout: layout type
- keyPoints: array of 3-5 detailed key points
- order: slide order number
- imageNeeded: boolean
- imageSuggestion: image description if needed
- speakerNotes: detailed presenter notes

Output as a JSON array.`;
  }
  
  private buildSlideContentPrompt(
    options: PPTEnhancedGenerationOptions,
    outline: PPTEnhancedOutlineItem[],
    contentSummary: Record<string, unknown>
  ): string {
    return `Generate detailed content for each slide.

Topic: ${options.topic}
Outline: ${JSON.stringify(outline)}
Style: ${options.style || 'professional'}
Language: ${options.language || 'en'}
Content Summary: ${JSON.stringify(contentSummary)}

For each outline item, generate complete slide content with:
- id: slide id
- title: compelling title
- content: main content (actual information, not placeholders)
- bullets: detailed bullet points
- notes: speaker notes
- layout: layout type
- imagePrompt: detailed image generation prompt if image is needed

Output as a JSON array.`;
  }
  
  private generateDefaultOutline(options: PPTEnhancedGenerationOptions): PPTEnhancedOutlineItem[] {
    const slideCount = options.slideCount || 10;
    const outline: PPTEnhancedOutlineItem[] = [];
    
    // Title slide
    outline.push({
      id: 'slide-1',
      title: options.topic,
      description: options.description || `An overview of ${options.topic}`,
      suggestedLayout: 'title',
      keyPoints: [],
      order: 0,
      imageNeeded: true,
      imageSuggestion: `Hero image representing ${options.topic}`,
      speakerNotes: `Welcome and introduce the topic: ${options.topic}`,
    });
    
    // Agenda slide
    if (slideCount >= 5) {
      outline.push({
        id: 'slide-2',
        title: 'Agenda',
        description: 'Overview of presentation topics',
        suggestedLayout: 'bullets',
        keyPoints: ['Introduction', 'Key Concepts', 'Details', 'Conclusion'],
        order: 1,
        imageNeeded: false,
        speakerNotes: 'Walk through the agenda items briefly',
      });
    }
    
    // Content slides
    const contentSlideCount = slideCount - 3; // Reserve for title, agenda, closing
    for (let i = 0; i < contentSlideCount; i++) {
      outline.push({
        id: `slide-${outline.length + 1}`,
        title: `Section ${i + 1}`,
        description: `Content for section ${i + 1}`,
        suggestedLayout: i % 2 === 0 ? 'title-content' : 'bullets',
        keyPoints: [
          `Key point 1 for section ${i + 1}`,
          `Key point 2 for section ${i + 1}`,
          `Key point 3 for section ${i + 1}`,
        ],
        order: outline.length,
        imageNeeded: i % 3 === 0,
        imageSuggestion: i % 3 === 0 ? `Visual for section ${i + 1}` : undefined,
        speakerNotes: `Discuss the key points of section ${i + 1}`,
      });
    }
    
    // Closing slide
    outline.push({
      id: `slide-${outline.length + 1}`,
      title: 'Thank You',
      description: 'Closing slide with summary',
      suggestedLayout: 'closing',
      keyPoints: ['Summary', 'Questions?', 'Contact Information'],
      order: outline.length,
      imageNeeded: false,
      speakerNotes: 'Summarize key takeaways and open for questions',
    });
    
    return outline;
  }
}

// =====================
// Convenience Functions
// =====================

/**
 * Quick generate a presentation from options
 */
export async function generatePresentation(
  options: PPTEnhancedGenerationOptions,
  config: PPTExecutorConfig
): Promise<PPTWorkflowResult> {
  const executor = new PPTWorkflowExecutor(config);
  return executor.execute(options);
}

/**
 * Generate presentation from materials
 */
export async function generatePresentationFromMaterials(
  topic: string,
  materials: PPTMaterial[],
  config: PPTExecutorConfig,
  options?: Partial<PPTEnhancedGenerationOptions>
): Promise<PPTWorkflowResult> {
  const executor = new PPTWorkflowExecutor(config);
  return executor.execute({
    topic,
    materials,
    generateImages: true,
    ...options,
  });
}
