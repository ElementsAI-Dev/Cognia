/**
 * Slide Image Tool - Tools for generating images for PPT slides
 * 
 * Integrates with multiple image generation providers to create
 * visually compelling images for presentation slides.
 */

import { z } from 'zod';
import type {
  PPTSlide,
  PPTTheme,
  PPTImageStyle,
  PPTImageProvider,
  PPTSlideImageResult,
  PPTEnhancedSlide,
} from '@/types/workflow';
import type { ImageProvider } from '../media/image-generation';
import {
  generateSlideImage,
  generateSlideImagesBatch,
  type SlideImageOptions,
} from '../media/image-generation';

// =====================
// Input Schemas
// =====================

export const slideImageGenerateInputSchema = z.object({
  slideId: z.string().describe('Unique identifier of the slide'),
  slideTitle: z.string().describe('Title of the slide'),
  slideContent: z.string().describe('Main content of the slide'),
  slideLayout: z.string().default('title-content').describe('Layout type of the slide'),
  presentationStyle: z.string().default('professional').describe('Overall presentation style'),
  imageStyle: z.enum([
    'photorealistic', 'illustration', 'minimalist', 'corporate',
    'artistic', 'infographic', 'icon-based', 'abstract', 'diagram', '3d-render'
  ]).default('corporate').describe('Style for the generated image'),
  customPrompt: z.string().optional().describe('Custom prompt override'),
  negativePrompt: z.string().optional().describe('What to avoid in the image'),
  provider: z.enum(['openai', 'google-imagen', 'stability']).default('openai'),
  model: z.string().optional().describe('Specific model to use'),
  size: z.enum(['1024x1024', '1024x1792', '1792x1024']).default('1792x1024'),
  quality: z.enum(['standard', 'hd', 'low', 'medium', 'high']).default('standard'),
});

export const slideBatchImageGenerateInputSchema = z.object({
  slides: z.array(z.object({
    slideId: z.string(),
    slideTitle: z.string(),
    slideContent: z.string(),
    slideLayout: z.string().optional(),
    imagePrompt: z.string().optional(),
    imageNeeded: z.boolean().default(true),
  })).describe('Array of slides to generate images for'),
  presentationStyle: z.string().default('professional'),
  imageStyle: z.enum([
    'photorealistic', 'illustration', 'minimalist', 'corporate',
    'artistic', 'infographic', 'icon-based', 'abstract', 'diagram', '3d-render'
  ]).default('corporate'),
  provider: z.enum(['openai', 'google-imagen', 'stability']).default('openai'),
  model: z.string().optional(),
  theme: z.object({
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    accentColor: z.string().optional(),
    backgroundColor: z.string().optional(),
  }).optional(),
  concurrency: z.number().min(1).max(5).default(2),
});

export const slideImagePromptGenerateInputSchema = z.object({
  slideTitle: z.string().describe('Title of the slide'),
  slideContent: z.string().describe('Content of the slide'),
  slideLayout: z.string().default('title-content'),
  presentationStyle: z.string().default('professional'),
  imageStyle: z.enum([
    'photorealistic', 'illustration', 'minimalist', 'corporate',
    'artistic', 'infographic', 'icon-based', 'abstract', 'diagram', '3d-render'
  ]).default('corporate'),
  keywords: z.array(z.string()).optional().describe('Keywords to emphasize'),
  mood: z.string().optional().describe('Desired mood/atmosphere'),
});

export type SlideImageGenerateInput = z.infer<typeof slideImageGenerateInputSchema>;
export type SlideBatchImageGenerateInput = z.infer<typeof slideBatchImageGenerateInputSchema>;
export type SlideImagePromptGenerateInput = z.infer<typeof slideImagePromptGenerateInputSchema>;

// =====================
// Result Types
// =====================

export interface SlideImageToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// =====================
// Image Style Configurations
// =====================

const IMAGE_STYLE_CONFIGS: Record<PPTImageStyle, {
  promptPrefix: string;
  promptSuffix: string;
  negativePrompt: string;
}> = {
  'photorealistic': {
    promptPrefix: 'Professional photograph of',
    promptSuffix: 'high resolution, sharp focus, natural lighting, 8k quality',
    negativePrompt: 'cartoon, illustration, drawing, painting, blurry, low quality',
  },
  'illustration': {
    promptPrefix: 'Modern digital illustration of',
    promptSuffix: 'clean vector style, vibrant colors, flat design, professional',
    negativePrompt: 'photo, realistic, 3d render, blurry, noisy',
  },
  'minimalist': {
    promptPrefix: 'Minimalist representation of',
    promptSuffix: 'simple shapes, clean lines, lots of whitespace, elegant, modern',
    negativePrompt: 'complex, busy, cluttered, detailed, ornate',
  },
  'corporate': {
    promptPrefix: 'Professional business visual for',
    promptSuffix: 'clean, modern, corporate aesthetic, polished, presentation-ready',
    negativePrompt: 'casual, unprofessional, messy, cartoon, childish',
  },
  'artistic': {
    promptPrefix: 'Artistic interpretation of',
    promptSuffix: 'creative, expressive, unique visual style, gallery quality',
    negativePrompt: 'boring, generic, template, stock photo',
  },
  'infographic': {
    promptPrefix: 'Infographic style visualization of',
    promptSuffix: 'data visualization, icons, clean layout, information design',
    negativePrompt: 'photo, realistic, complex, cluttered',
  },
  'icon-based': {
    promptPrefix: 'Icon-based representation of',
    promptSuffix: 'flat icons, simple graphics, vector style, symbolic',
    negativePrompt: 'photo, realistic, detailed, complex',
  },
  'abstract': {
    promptPrefix: 'Abstract conceptual art representing',
    promptSuffix: 'geometric shapes, modern art, conceptual, non-representational',
    negativePrompt: 'realistic, photo, literal, obvious',
  },
  'diagram': {
    promptPrefix: 'Technical diagram illustrating',
    promptSuffix: 'schematic style, clear labels, professional, blueprint aesthetic',
    negativePrompt: 'photo, artistic, abstract, messy',
  },
  '3d-render': {
    promptPrefix: '3D rendered visualization of',
    promptSuffix: 'realistic materials, professional lighting, octane render, high quality',
    negativePrompt: '2d, flat, cartoon, low poly, pixelated',
  },
};

// =====================
// Helper Functions
// =====================

/**
 * Generate an optimized image prompt for a slide
 */
function generateOptimizedPrompt(
  title: string,
  content: string,
  layout: string,
  style: PPTImageStyle,
  keywords?: string[],
  mood?: string
): string {
  const styleConfig = IMAGE_STYLE_CONFIGS[style] || IMAGE_STYLE_CONFIGS['corporate'];
  
  // Extract key concepts from title and content
  const cleanContent = content
    .replace(/[#*_\[\]`]/g, '')
    .replace(/\n+/g, ' ')
    .substring(0, 150);
  
  // Build the prompt
  const parts: string[] = [];
  
  // Style prefix
  parts.push(styleConfig.promptPrefix);
  
  // Main subject from title
  parts.push(`"${title}"`);
  
  // Context from content
  if (cleanContent) {
    parts.push(`showing ${cleanContent}`);
  }
  
  // Keywords if provided
  if (keywords && keywords.length > 0) {
    parts.push(`featuring ${keywords.join(', ')}`);
  }
  
  // Mood if provided
  if (mood) {
    parts.push(`with ${mood} atmosphere`);
  }
  
  // Layout-specific additions
  switch (layout) {
    case 'title':
    case 'full-image':
      parts.push('hero image, impactful, attention-grabbing');
      break;
    case 'image-left':
    case 'image-right':
      parts.push('suitable for side panel, vertical composition');
      break;
    case 'comparison':
      parts.push('split composition, dual elements');
      break;
    case 'quote':
      parts.push('atmospheric background, subtle, text-friendly');
      break;
  }
  
  // Style suffix
  parts.push(styleConfig.promptSuffix);
  
  return parts.join(', ');
}

/**
 * Get default theme for image generation
 */
function getDefaultTheme(): PPTTheme {
  return {
    id: 'default',
    name: 'Default',
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF',
    accentColor: '#60A5FA',
    backgroundColor: '#FFFFFF',
    textColor: '#1E293B',
    headingFont: 'Inter',
    bodyFont: 'Inter',
    codeFont: 'JetBrains Mono',
  };
}

// =====================
// Tool Implementations
// =====================

/**
 * Generate an image for a single slide
 */
export async function executeSlideImageGenerate(
  input: SlideImageGenerateInput,
  apiKey: string
): Promise<SlideImageToolResult> {
  try {
    const theme = getDefaultTheme();
    
    const options: SlideImageOptions = {
      slideTitle: input.slideTitle,
      slideContent: input.slideContent,
      slideLayout: input.slideLayout as PPTSlide['layout'],
      presentationStyle: input.presentationStyle,
      theme,
      imageStyle: input.imageStyle as PPTImageStyle,
      provider: input.provider as ImageProvider,
      model: input.model,
      size: input.size,
      quality: input.quality,
      customPrompt: input.customPrompt,
      negativePrompt: input.negativePrompt,
    };
    
    const result = await generateSlideImage(apiKey, options);
    
    return {
      success: result.success,
      data: {
        slideId: input.slideId,
        imageUrl: result.imageUrl,
        imageBase64: result.imageBase64,
        generatedPrompt: result.generatedPrompt,
        revisedPrompt: result.revisedPrompt,
        provider: result.provider,
        model: result.model,
      },
      error: result.error,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate slide image',
    };
  }
}

/**
 * Generate images for multiple slides in batch
 */
export async function executeSlideBatchImageGenerate(
  input: SlideBatchImageGenerateInput,
  apiKey: string,
  onProgress?: (completed: number, total: number, slideId: string) => void
): Promise<SlideImageToolResult> {
  try {
    const theme: PPTTheme = {
      ...getDefaultTheme(),
      ...(input.theme && {
        primaryColor: input.theme.primaryColor || getDefaultTheme().primaryColor,
        secondaryColor: input.theme.secondaryColor || getDefaultTheme().secondaryColor,
        accentColor: input.theme.accentColor || getDefaultTheme().accentColor,
        backgroundColor: input.theme.backgroundColor || getDefaultTheme().backgroundColor,
      }),
    };
    
    // Filter slides that need images
    const slidesToProcess = input.slides.filter(s => s.imageNeeded !== false);
    
    if (slidesToProcess.length === 0) {
      return {
        success: true,
        data: {
          results: [],
          processedCount: 0,
          skippedCount: input.slides.length,
        },
      };
    }
    
    // Prepare batch request
    const batchSlides = slidesToProcess.map(slide => ({
      slideId: slide.slideId,
      options: {
        slideTitle: slide.slideTitle,
        slideContent: slide.slideContent,
        slideLayout: (slide.slideLayout || 'title-content') as PPTSlide['layout'],
        presentationStyle: input.presentationStyle,
        theme,
        imageStyle: input.imageStyle as PPTImageStyle,
        provider: input.provider as ImageProvider,
        model: input.model,
        size: '1792x1024' as const,
        quality: 'standard' as const,
        customPrompt: slide.imagePrompt,
      } as SlideImageOptions,
    }));
    
    // Generate images
    const results = await generateSlideImagesBatch(apiKey, batchSlides, {
      concurrency: input.concurrency,
      onProgress,
    });
    
    // Convert Map to array
    const resultArray: PPTSlideImageResult[] = [];
    let successCount = 0;
    let failedCount = 0;
    
    results.forEach((result, slideId) => {
      resultArray.push({
        slideId,
        success: result.success,
        imageUrl: result.imageUrl,
        imageBase64: result.imageBase64,
        generatedPrompt: result.generatedPrompt,
        revisedPrompt: result.revisedPrompt,
        provider: result.provider as PPTImageProvider,
        error: result.error,
      });
      
      if (result.success) {
        successCount++;
      } else {
        failedCount++;
      }
    });
    
    return {
      success: failedCount === 0,
      data: {
        results: resultArray,
        processedCount: resultArray.length,
        successCount,
        failedCount,
        skippedCount: input.slides.length - slidesToProcess.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate batch images',
    };
  }
}

/**
 * Generate an optimized prompt for a slide image
 */
export function executeSlideImagePromptGenerate(
  input: SlideImagePromptGenerateInput
): SlideImageToolResult {
  try {
    const prompt = generateOptimizedPrompt(
      input.slideTitle,
      input.slideContent,
      input.slideLayout,
      input.imageStyle as PPTImageStyle,
      input.keywords,
      input.mood
    );
    
    const styleConfig = IMAGE_STYLE_CONFIGS[input.imageStyle as PPTImageStyle] 
      || IMAGE_STYLE_CONFIGS['corporate'];
    
    return {
      success: true,
      data: {
        prompt,
        negativePrompt: styleConfig.negativePrompt,
        style: input.imageStyle,
        recommendations: {
          aspectRatio: input.slideLayout === 'full-image' ? '16:9' : '16:9',
          size: '1792x1024',
          quality: 'standard',
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate image prompt',
    };
  }
}

/**
 * Enhance slides with generated images
 */
export async function enhanceSlidesWithImages(
  slides: PPTEnhancedSlide[],
  apiKey: string,
  options: {
    provider?: PPTImageProvider;
    model?: string;
    imageStyle?: PPTImageStyle;
    theme?: PPTTheme;
    concurrency?: number;
    onProgress?: (completed: number, total: number, slideId: string) => void;
  } = {}
): Promise<{
  slides: PPTEnhancedSlide[];
  generatedImages: PPTSlideImageResult[];
  stats: {
    total: number;
    processed: number;
    success: number;
    failed: number;
    skipped: number;
  };
}> {
  const slidesToProcess = slides.filter(s => s.imagePrompt);
  const generatedImages: PPTSlideImageResult[] = [];
  
  const stats = {
    total: slides.length,
    processed: 0,
    success: 0,
    failed: 0,
    skipped: slides.length - slidesToProcess.length,
  };
  
  if (slidesToProcess.length === 0) {
    return { slides, generatedImages, stats };
  }
  
  const theme = options.theme || getDefaultTheme();
  
  // Prepare batch
  const batchSlides = slidesToProcess.map(slide => ({
    slideId: slide.id,
    options: {
      slideTitle: slide.title || '',
      slideContent: slide.content || '',
      slideLayout: slide.layout,
      presentationStyle: 'professional',
      theme,
      imageStyle: (slide.imageStyle || options.imageStyle || 'corporate') as PPTImageStyle,
      provider: (options.provider || 'openai') as ImageProvider,
      model: options.model,
      size: '1792x1024' as const,
      quality: 'standard' as const,
      customPrompt: slide.imagePrompt,
    },
  }));
  
  // Generate images
  const results = await generateSlideImagesBatch(apiKey, batchSlides, {
    concurrency: options.concurrency || 2,
    onProgress: options.onProgress,
  });
  
  // Update slides with generated images
  const updatedSlides = slides.map(slide => {
    const result = results.get(slide.id);
    if (result) {
      stats.processed++;
      if (result.success) {
        stats.success++;
        generatedImages.push({
          slideId: slide.id,
          success: true,
          imageUrl: result.imageUrl,
          imageBase64: result.imageBase64,
          generatedPrompt: result.generatedPrompt,
          revisedPrompt: result.revisedPrompt,
          provider: result.provider as PPTImageProvider,
        });
        
        return {
          ...slide,
          generatedImageUrl: result.imageUrl,
          generatedImageBase64: result.imageBase64,
        };
      } else {
        stats.failed++;
        generatedImages.push({
          slideId: slide.id,
          success: false,
          generatedPrompt: result.generatedPrompt,
          provider: result.provider as PPTImageProvider,
          error: result.error,
        });
      }
    }
    return slide;
  });
  
  return {
    slides: updatedSlides,
    generatedImages,
    stats,
  };
}

// =====================
// Tool Definitions
// =====================

export const slideImageTools = {
  ppt_generate_image: {
    name: 'ppt_generate_image',
    description: 'Generate an AI image for a single presentation slide based on its content and style',
    parameters: slideImageGenerateInputSchema,
    requiresApproval: false,
    category: 'ppt' as const,
    create: (apiKey: string) => (input: unknown) => 
      executeSlideImageGenerate(input as SlideImageGenerateInput, apiKey),
  },
  ppt_generate_images: {
    name: 'ppt_generate_images',
    description: 'Generate AI images for multiple presentation slides in batch',
    parameters: slideBatchImageGenerateInputSchema,
    requiresApproval: false,
    category: 'ppt' as const,
    create: (apiKey: string) => (input: unknown) => 
      executeSlideBatchImageGenerate(input as SlideBatchImageGenerateInput, apiKey),
  },
  ppt_generate_image_prompt: {
    name: 'ppt_generate_image_prompt',
    description: 'Generate an optimized prompt for slide image generation',
    parameters: slideImagePromptGenerateInputSchema,
    requiresApproval: false,
    category: 'ppt' as const,
    create: () => (input: unknown) => 
      executeSlideImagePromptGenerate(input as SlideImagePromptGenerateInput),
  },
};

/**
 * Register slide image tools with the global registry
 */
export function registerSlideImageTools(apiKey: string): void {
  import('./registry').then(({ getGlobalToolRegistry }) => {
    const registry = getGlobalToolRegistry();
    
    registry.register({
      ...slideImageTools.ppt_generate_image,
      create: () => (input: unknown) => 
        executeSlideImageGenerate(input as SlideImageGenerateInput, apiKey),
    });
    
    registry.register({
      ...slideImageTools.ppt_generate_images,
      create: () => (input: unknown) => 
        executeSlideBatchImageGenerate(input as SlideBatchImageGenerateInput, apiKey),
    });
    
    registry.register({
      ...slideImageTools.ppt_generate_image_prompt,
      create: () => (input: unknown) => 
        executeSlideImagePromptGenerate(input as SlideImagePromptGenerateInput),
    });
  });
}
