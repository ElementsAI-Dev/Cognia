/**
 * PPT Image Generation Tool - Generate images for presentation slides
 * Supports multiple AI image providers (OpenAI DALL-E, etc.)
 */

import { z } from 'zod';
import type {
  PPTSlide,
  PPTTheme,
  PPTImageStyle,
  PPTImageProvider,
  PPTImageGenerationConfig,
  PPTSlideImageRequest,
  PPTSlideImageResult,
} from '@/types/workflow';
import { IMAGE_STYLE_PROMPTS } from '@/types/workflow';

/**
 * Input schema for single image generation
 */
export const pptImageGenerateInputSchema = z.object({
  slideId: z.string().describe('The slide ID to generate image for'),
  slideTitle: z.string().describe('Title of the slide'),
  slideContent: z.string().optional().describe('Content of the slide'),
  customPrompt: z.string().optional().describe('Custom prompt for image generation'),
  style: z.enum([
    'photorealistic',
    'illustration',
    'minimalist',
    'corporate',
    'artistic',
    'infographic',
    'icon-based',
    'abstract',
    'diagram',
    '3d-render',
  ]).default('corporate').describe('Style of the generated image'),
  size: z.enum(['1024x1024', '1024x1792', '1792x1024']).default('1792x1024'),
  quality: z.enum(['draft', 'standard', 'high']).default('standard'),
});

export type PPTImageGenerateInput = z.infer<typeof pptImageGenerateInputSchema>;

/**
 * Input schema for batch image generation
 */
export const pptBatchImageGenerateInputSchema = z.object({
  slides: z.array(z.object({
    slideId: z.string(),
    slideTitle: z.string(),
    slideContent: z.string().optional(),
    customPrompt: z.string().optional(),
    imageNeeded: z.boolean().default(true),
  })).describe('Array of slides that need images'),
  style: z.enum([
    'photorealistic',
    'illustration',
    'minimalist',
    'corporate',
    'artistic',
    'infographic',
    'icon-based',
    'abstract',
    'diagram',
    '3d-render',
  ]).default('corporate'),
  presentationTheme: z.object({
    primaryColor: z.string(),
    backgroundColor: z.string(),
  }).optional(),
  maxConcurrent: z.number().min(1).max(5).default(3),
});

export type PPTBatchImageGenerateInput = z.infer<typeof pptBatchImageGenerateInputSchema>;

/**
 * Result type for image generation
 */
export interface PPTImageToolResult {
  success: boolean;
  data?: PPTSlideImageResult | PPTSlideImageResult[];
  error?: string;
}

/**
 * Build an optimized prompt for slide image generation
 */
export function buildImagePrompt(
  slideTitle: string,
  slideContent?: string,
  style: PPTImageStyle = 'corporate',
  customPrompt?: string,
  theme?: Partial<PPTTheme>
): string {
  const parts: string[] = [];

  // Add custom prompt if provided
  if (customPrompt) {
    parts.push(customPrompt);
  } else {
    // Build prompt from slide content
    parts.push(`Create a professional presentation slide background image for:`);
    parts.push(`Topic: "${slideTitle}"`);
    
    if (slideContent) {
      // Extract key concepts from content
      const keywords = extractKeywords(slideContent);
      if (keywords.length > 0) {
        parts.push(`Key concepts: ${keywords.join(', ')}`);
      }
    }
  }

  // Add style-specific instructions
  const stylePrompt = IMAGE_STYLE_PROMPTS[style] || IMAGE_STYLE_PROMPTS.corporate;
  parts.push(`Style: ${stylePrompt}`);

  // Add color hints if theme is provided
  if (theme?.primaryColor) {
    parts.push(`Primary color accent: ${theme.primaryColor}`);
  }

  // Add quality and format instructions
  parts.push('High resolution, suitable for presentation slides, 16:9 aspect ratio');
  parts.push('Clean composition with space for text overlay');
  parts.push('No text or letters in the image');

  return parts.join('\n');
}

/**
 * Extract keywords from text content
 */
function extractKeywords(content: string): string[] {
  // Simple keyword extraction - remove common words and get unique meaningful words
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'this', 'that',
    'these', 'those', 'it', 'its', 'we', 'our', 'you', 'your', 'they', 'their',
  ]);

  const words = content
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));

  // Get unique words and limit to top 5
  const uniqueWords = [...new Set(words)];
  return uniqueWords.slice(0, 5);
}

/**
 * Image generation result type
 */
type ImageGenResult = { 
  imageUrl?: string; 
  imageBase64?: string; 
  revisedPrompt?: string; 
  error?: string;
};

/**
 * Generate image using OpenAI DALL-E
 */
async function generateWithOpenAI(
  prompt: string,
  config: PPTImageGenerationConfig,
  apiKey: string,
  baseURL?: string
): Promise<ImageGenResult> {
  try {
    const endpoint = baseURL 
      ? `${baseURL}/images/generations`
      : 'https://api.openai.com/v1/images/generations';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || 'dall-e-3',
        prompt,
        n: 1,
        size: config.size,
        quality: config.quality === 'high' ? 'hd' : 'standard',
        response_format: 'url',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      return { error: error.error?.message || `API error: ${response.status}` };
    }

    const data = await response.json();
    const imageData = data.data?.[0];

    return {
      imageUrl: imageData?.url,
      revisedPrompt: imageData?.revised_prompt,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to generate image' };
  }
}

/**
 * Generate image using Google Imagen (Vertex AI)
 */
async function generateWithGoogleImagen(
  prompt: string,
  config: PPTImageGenerationConfig,
  apiKey: string
): Promise<ImageGenResult> {
  try {
    // Google Imagen API endpoint (requires Vertex AI setup)
    const endpoint = 'https://us-central1-aiplatform.googleapis.com/v1/projects/YOUR_PROJECT/locations/us-central1/publishers/google/models/imagegeneration:predict';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: config.size === '1024x1024' ? '1:1' : '16:9',
          negativePrompt: 'blurry, low quality, text, watermark',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      return { error: error.error?.message || `Google Imagen API error: ${response.status}` };
    }

    const data = await response.json();
    const imageData = data.predictions?.[0];

    if (imageData?.bytesBase64Encoded) {
      return {
        imageBase64: `data:image/png;base64,${imageData.bytesBase64Encoded}`,
      };
    }

    return { error: 'No image data returned from Google Imagen' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to generate image with Google Imagen' };
  }
}

/**
 * Generate image using Stability AI (Stable Diffusion)
 */
async function generateWithStabilityAI(
  prompt: string,
  config: PPTImageGenerationConfig,
  apiKey: string
): Promise<ImageGenResult> {
  try {
    const endpoint = 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image';

    // Map size to Stability AI dimensions
    const dimensions = {
      '1024x1024': { width: 1024, height: 1024 },
      '1024x1792': { width: 1024, height: 1792 },
      '1792x1024': { width: 1792, height: 1024 },
    };
    const size = dimensions[config.size as keyof typeof dimensions] || dimensions['1792x1024'];

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        text_prompts: [
          { text: prompt, weight: 1 },
          { text: 'blurry, low quality, text, watermark, ugly', weight: -1 },
        ],
        cfg_scale: 7,
        width: size.width,
        height: size.height,
        samples: 1,
        steps: config.quality === 'high' ? 50 : 30,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      return { error: error.message || `Stability AI API error: ${response.status}` };
    }

    const data = await response.json();
    const imageData = data.artifacts?.[0];

    if (imageData?.base64) {
      return {
        imageBase64: `data:image/png;base64,${imageData.base64}`,
      };
    }

    return { error: 'No image data returned from Stability AI' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to generate image with Stability AI' };
  }
}

/**
 * Generate image using local Stable Diffusion (ComfyUI/Automatic1111)
 */
async function generateWithLocalSD(
  prompt: string,
  config: PPTImageGenerationConfig,
  baseURL: string
): Promise<ImageGenResult> {
  try {
    // Automatic1111 API endpoint
    const endpoint = `${baseURL}/sdapi/v1/txt2img`;

    const dimensions = {
      '1024x1024': { width: 1024, height: 1024 },
      '1024x1792': { width: 1024, height: 1792 },
      '1792x1024': { width: 1792, height: 1024 },
    };
    const size = dimensions[config.size as keyof typeof dimensions] || dimensions['1792x1024'];

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        negative_prompt: 'blurry, low quality, text, watermark, ugly',
        width: size.width,
        height: size.height,
        steps: config.quality === 'high' ? 30 : 20,
        cfg_scale: 7,
        sampler_name: 'DPM++ 2M Karras',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      return { error: error.detail || `Local SD API error: ${response.status}` };
    }

    const data = await response.json();
    const imageData = data.images?.[0];

    if (imageData) {
      return {
        imageBase64: `data:image/png;base64,${imageData}`,
      };
    }

    return { error: 'No image data returned from local Stable Diffusion' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to generate image with local SD' };
  }
}

/**
 * Generate a single slide image
 */
export async function generateSlideImage(
  request: PPTSlideImageRequest,
  apiKey: string,
  baseURL?: string
): Promise<PPTSlideImageResult> {
  const prompt = buildImagePrompt(
    request.slideTitle,
    request.slideContent,
    request.config.style,
    request.customPrompt,
    request.presentationTheme
  );

  let result: { imageUrl?: string; imageBase64?: string; revisedPrompt?: string; error?: string };

  switch (request.config.provider) {
    case 'openai':
      result = await generateWithOpenAI(prompt, request.config, apiKey, baseURL);
      break;
    case 'google':
      result = await generateWithGoogleImagen(prompt, request.config, apiKey);
      break;
    case 'stability':
      result = await generateWithStabilityAI(prompt, request.config, apiKey);
      break;
    case 'local':
      result = await generateWithLocalSD(prompt, request.config, baseURL || 'http://127.0.0.1:7860');
      break;
    default:
      result = { error: `Unsupported provider: ${request.config.provider}` };
  }

  return {
    slideId: request.slideId,
    success: !result.error,
    imageUrl: result.imageUrl,
    imageBase64: result.imageBase64,
    revisedPrompt: result.revisedPrompt,
    generatedPrompt: prompt,
    provider: request.config.provider,
    error: result.error,
  };
}

/**
 * Execute single image generation
 */
export async function executePPTImageGenerate(
  input: PPTImageGenerateInput,
  apiKey: string,
  baseURL?: string
): Promise<PPTImageToolResult> {
  try {
    const request: PPTSlideImageRequest = {
      slideId: input.slideId,
      slideTitle: input.slideTitle,
      slideContent: input.slideContent || '',
      slideLayout: 'title-content',
      presentationStyle: input.style,
      presentationTheme: {
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
      },
      customPrompt: input.customPrompt,
      config: {
        provider: 'openai' as PPTImageProvider,
        model: 'dall-e-3',
        style: input.style,
        size: input.size,
        quality: input.quality,
      },
    };

    const result = await generateSlideImage(request, apiKey, baseURL);

    return {
      success: result.success,
      data: result,
      error: result.error,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate image',
    };
  }
}

/**
 * Execute batch image generation for multiple slides
 */
export async function executePPTBatchImageGenerate(
  input: PPTBatchImageGenerateInput,
  apiKey: string,
  baseURL?: string,
  onProgress?: (completed: number, total: number, result: PPTSlideImageResult) => void
): Promise<PPTImageToolResult> {
  try {
    const slidesToProcess = input.slides.filter(s => s.imageNeeded);
    const results: PPTSlideImageResult[] = [];
    const total = slidesToProcess.length;

    // Process in batches to respect rate limits
    const batchSize = input.maxConcurrent;
    
    for (let i = 0; i < slidesToProcess.length; i += batchSize) {
      const batch = slidesToProcess.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (slide) => {
        const request: PPTSlideImageRequest = {
          slideId: slide.slideId,
          slideTitle: slide.slideTitle,
          slideContent: slide.slideContent || '',
          slideLayout: 'title-content',
          presentationStyle: input.style,
          presentationTheme: input.presentationTheme ? {
            id: 'custom',
            name: 'Custom',
            primaryColor: input.presentationTheme.primaryColor,
            secondaryColor: input.presentationTheme.primaryColor,
            accentColor: input.presentationTheme.primaryColor,
            backgroundColor: input.presentationTheme.backgroundColor,
            textColor: '#1E293B',
            headingFont: 'Inter',
            bodyFont: 'Inter',
            codeFont: 'JetBrains Mono',
          } : {
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
          },
          customPrompt: slide.customPrompt,
          config: {
            provider: 'openai' as PPTImageProvider,
            model: 'dall-e-3',
            style: input.style,
            size: '1792x1024',
            quality: 'standard',
          },
        };

        return generateSlideImage(request, apiKey, baseURL);
      });

      const batchResults = await Promise.all(batchPromises);
      
      for (const result of batchResults) {
        results.push(result);
        onProgress?.(results.length, total, result);
      }

      // Add delay between batches to avoid rate limiting
      if (i + batchSize < slidesToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successCount = results.filter(r => r.success).length;

    return {
      success: successCount > 0,
      data: results,
      error: successCount === 0 ? 'All image generations failed' : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate images',
    };
  }
}

/**
 * Apply generated images to slides
 */
export function applyImagesToSlides(
  slides: PPTSlide[],
  imageResults: PPTSlideImageResult[]
): PPTSlide[] {
  const imageMap = new Map(imageResults.map(r => [r.slideId, r]));

  return slides.map(slide => {
    const imageResult = imageMap.get(slide.id);
    if (!imageResult || !imageResult.success) {
      return slide;
    }

    // Add image as background or as an element depending on layout
    if (slide.layout === 'full-image') {
      return {
        ...slide,
        backgroundImage: imageResult.imageUrl || imageResult.imageBase64,
      };
    }

    // Add as element for other layouts
    const imageElement = {
      id: `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'image' as const,
      content: imageResult.imageUrl || imageResult.imageBase64 || '',
      position: getImagePositionForLayout(slide.layout),
      metadata: {
        generatedPrompt: imageResult.generatedPrompt,
        provider: imageResult.provider,
      },
    };

    return {
      ...slide,
      elements: [...slide.elements, imageElement],
    };
  });
}

/**
 * Get optimal image position based on slide layout
 */
function getImagePositionForLayout(layout: string): { x: number; y: number; width: number; height: number } {
  switch (layout) {
    case 'image-left':
      return { x: 5, y: 15, width: 40, height: 70 };
    case 'image-right':
      return { x: 55, y: 15, width: 40, height: 70 };
    case 'two-column':
      return { x: 55, y: 20, width: 40, height: 60 };
    case 'title-content':
      return { x: 60, y: 25, width: 35, height: 50 };
    default:
      return { x: 10, y: 30, width: 35, height: 50 };
  }
}

/**
 * PPT image tool definitions for registry
 */
export const pptImageTools = {
  ppt_generate_image: {
    name: 'ppt_generate_image',
    description: 'Generate a single image for a presentation slide using AI',
    parameters: pptImageGenerateInputSchema,
    requiresApproval: false,
    category: 'ppt' as const,
    create: (apiKey: string, baseURL?: string) => 
      (input: unknown) => executePPTImageGenerate(input as PPTImageGenerateInput, apiKey, baseURL),
  },
  ppt_batch_generate_images: {
    name: 'ppt_batch_generate_images',
    description: 'Generate images for multiple presentation slides using AI',
    parameters: pptBatchImageGenerateInputSchema,
    requiresApproval: true,
    category: 'ppt' as const,
    create: (apiKey: string, baseURL?: string) => 
      (input: unknown) => executePPTBatchImageGenerate(input as PPTBatchImageGenerateInput, apiKey, baseURL),
  },
};

/**
 * Register PPT image tools with the global registry
 */
export function registerPPTImageTools(apiKey: string, baseURL?: string): void {
  import('./registry').then(({ getGlobalToolRegistry }) => {
    const registry = getGlobalToolRegistry();
    for (const tool of Object.values(pptImageTools)) {
      registry.register({
        ...tool,
        create: () => tool.create(apiKey, baseURL),
      });
    }
  });
}
