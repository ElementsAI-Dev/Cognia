/**
 * Image Generation - Multi-provider image generation support
 * 
 * Supported providers:
 * - OpenAI DALL-E (dall-e-3, dall-e-2)
 * - OpenAI GPT Image (gpt-image-1)
 * - Google Imagen (imagen-3, imagen-4) via Vertex AI
 * - Stability AI (stable-diffusion-xl)
 * 
 * Features:
 * - Image generation from text prompts
 * - Image editing (inpainting)
 * - Image variations
 * - Multiple output formats
 * - PPT slide image generation
 */

import OpenAI from 'openai';
import type { PPTImageStyle, PPTSlideLayout, PPTTheme } from '@/types/workflow';

export type ImageProvider = 'openai' | 'google-imagen' | 'stability';

export type ImageSize = '256x256' | '512x512' | '1024x1024' | '1024x1792' | '1792x1024';
export type ImageQuality = 'standard' | 'hd' | 'low' | 'medium' | 'high';
export type ImageStyle = 'vivid' | 'natural';
export type ImageOutputFormat = 'url' | 'b64_json';

export interface ImageGenerationOptions {
  prompt: string;
  provider?: ImageProvider;
  model?: 'dall-e-3' | 'dall-e-2' | 'gpt-image-1';
  size?: ImageSize;
  quality?: ImageQuality;
  style?: ImageStyle;
  n?: number;
  outputFormat?: ImageOutputFormat;
  negativePrompt?: string;
}

export interface GeneratedImage {
  url?: string;
  base64?: string;
  revisedPrompt?: string;
  width?: number;
  height?: number;
}

export interface ImageGenerationResult {
  images: GeneratedImage[];
  model: string;
  provider: ImageProvider;
  usage?: {
    totalTokens?: number;
    cost?: number;
  };
}

/**
 * Estimate cost for image generation
 */
export function estimateImageCost(
  model: string,
  size: ImageSize,
  quality: ImageQuality,
  count: number
): number {
  // Pricing as of late 2024 (USD per image)
  const pricing: Record<string, Record<string, number>> = {
    'dall-e-3': {
      '1024x1024-standard': 0.04,
      '1024x1024-hd': 0.08,
      '1024x1792-standard': 0.08,
      '1024x1792-hd': 0.12,
      '1792x1024-standard': 0.08,
      '1792x1024-hd': 0.12,
    },
    'dall-e-2': {
      '256x256': 0.016,
      '512x512': 0.018,
      '1024x1024': 0.02,
    },
    'gpt-image-1': {
      '1024x1024-low': 0.011,
      '1024x1024-medium': 0.042,
      '1024x1024-high': 0.167,
      '1024x1792-low': 0.016,
      '1024x1792-medium': 0.063,
      '1024x1792-high': 0.25,
    },
  };

  const modelPricing = pricing[model];
  if (!modelPricing) return 0;

  const key = model === 'dall-e-2' 
    ? size 
    : `${size}-${quality}`;
  
  const pricePerImage = modelPricing[key] || 0.04;
  return pricePerImage * count;
}

/**
 * Generate images using OpenAI (DALL-E or GPT Image)
 */
export async function generateImage(
  apiKey: string,
  options: ImageGenerationOptions
): Promise<ImageGenerationResult> {
  const openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const {
    prompt,
    provider = 'openai',
    model = 'dall-e-3',
    size = '1024x1024',
    quality = 'standard',
    style = 'vivid',
    n = 1,
    outputFormat = 'url',
  } = options;

  // Validate size for model
  const validatedSize = validateSizeForModel(model, size);
  const validatedQuality = validateQualityForModel(model, quality);

  const response = await openai.images.generate({
    model,
    prompt,
    size: validatedSize as '1024x1024' | '1024x1792' | '1792x1024',
    quality: validatedQuality as 'standard' | 'hd',
    style: model === 'dall-e-3' ? style : undefined,
    n: model === 'dall-e-3' ? 1 : n, // DALL-E 3 only supports n=1
    response_format: outputFormat === 'b64_json' ? 'b64_json' : 'url',
  });

  const images: GeneratedImage[] = (response.data ?? []).map((img) => {
    const [width, height] = validatedSize.split('x').map(Number);
    return {
      url: img.url,
      base64: img.b64_json,
      revisedPrompt: img.revised_prompt,
      width,
      height,
    };
  });

  const cost = estimateImageCost(model, validatedSize, validatedQuality, images.length);

  return {
    images,
    model,
    provider,
    usage: { cost },
  };
}

/**
 * Validate and adjust size for model compatibility
 */
function validateSizeForModel(model: string, size: ImageSize): ImageSize {
  if (model === 'dall-e-2') {
    // DALL-E 2 only supports square sizes
    if (size === '1024x1792' || size === '1792x1024') {
      return '1024x1024';
    }
  }
  if (model === 'dall-e-3' || model === 'gpt-image-1') {
    // DALL-E 3 doesn't support 256x256 or 512x512
    if (size === '256x256' || size === '512x512') {
      return '1024x1024';
    }
  }
  return size;
}

/**
 * Validate quality for model compatibility
 */
function validateQualityForModel(model: string, quality: ImageQuality): ImageQuality {
  if (model === 'dall-e-2') {
    return 'standard';
  }
  if (model === 'gpt-image-1') {
    if (quality === 'hd') return 'high';
    if (quality === 'standard') return 'medium';
  }
  return quality;
}

/**
 * Edit an existing image using DALL-E (inpainting)
 */
export async function editImage(
  apiKey: string,
  options: {
    image: File;
    mask?: File;
    prompt: string;
    size?: '256x256' | '512x512' | '1024x1024';
    n?: number;
  }
): Promise<ImageGenerationResult> {
  const openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const { image, mask, prompt, size = '1024x1024', n = 1 } = options;

  const response = await openai.images.edit({
    model: 'dall-e-2', // Only dall-e-2 supports editing
    image,
    mask,
    prompt,
    size,
    n,
    response_format: 'url',
  });

  const images: GeneratedImage[] = (response.data ?? []).map((img) => ({
    url: img.url!,
  }));

  return {
    images,
    model: 'dall-e-2',
    provider: 'openai',
  };
}

/**
 * Create image variations
 */
export async function createImageVariation(
  apiKey: string,
  options: {
    image: File;
    size?: '256x256' | '512x512' | '1024x1024';
    n?: number;
  }
): Promise<ImageGenerationResult> {
  const openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const { image, size = '1024x1024', n = 1 } = options;

  const response = await openai.images.createVariation({
    model: 'dall-e-2', // Only dall-e-2 supports variations
    image,
    size,
    n,
    response_format: 'url',
  });

  const images: GeneratedImage[] = (response.data ?? []).map((img) => ({
    url: img.url!,
  }));

  return {
    images,
    model: 'dall-e-2',
    provider: 'openai',
  };
}

/**
 * Download image from URL to blob
 */
export async function downloadImageAsBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  return response.blob();
}

/**
 * Download and save image
 */
export function saveImageToFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Convert base64 to blob
 */
export function base64ToBlob(base64: string, mimeType: string = 'image/png'): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Convert base64 to data URL
 */
export function base64ToDataUrl(base64: string, mimeType: string = 'image/png'): string {
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Get available models for image generation
 */
export function getAvailableImageModels(): Array<{
  id: string;
  name: string;
  provider: ImageProvider;
  supportedSizes: ImageSize[];
  supportedQualities: ImageQuality[];
  maxImages: number;
}> {
  return [
    {
      id: 'dall-e-3',
      name: 'DALL-E 3',
      provider: 'openai',
      supportedSizes: ['1024x1024', '1024x1792', '1792x1024'],
      supportedQualities: ['standard', 'hd'],
      maxImages: 1,
    },
    {
      id: 'dall-e-2',
      name: 'DALL-E 2',
      provider: 'openai',
      supportedSizes: ['256x256', '512x512', '1024x1024'],
      supportedQualities: ['standard'],
      maxImages: 10,
    },
    {
      id: 'gpt-image-1',
      name: 'GPT Image 1',
      provider: 'openai',
      supportedSizes: ['1024x1024', '1024x1792', '1792x1024'],
      supportedQualities: ['low', 'medium', 'high'],
      maxImages: 1,
    },
    {
      id: 'imagen-3',
      name: 'Google Imagen 3',
      provider: 'google-imagen',
      supportedSizes: ['1024x1024', '1024x1792', '1792x1024'],
      supportedQualities: ['standard', 'hd'],
      maxImages: 4,
    },
    {
      id: 'imagen-4',
      name: 'Google Imagen 4',
      provider: 'google-imagen',
      supportedSizes: ['1024x1024', '1024x1792', '1792x1024'],
      supportedQualities: ['standard', 'hd'],
      maxImages: 4,
    },
    {
      id: 'stable-diffusion-xl',
      name: 'Stable Diffusion XL',
      provider: 'stability',
      supportedSizes: ['1024x1024', '1024x1792', '1792x1024'],
      supportedQualities: ['standard', 'hd'],
      maxImages: 10,
    },
  ];
}

// =====================
// PPT Slide Image Generation
// =====================

/**
 * Slide image generation options
 */
export interface SlideImageOptions {
  slideTitle: string;
  slideContent: string;
  slideLayout: PPTSlideLayout;
  presentationStyle: string;
  theme: PPTTheme;
  imageStyle: PPTImageStyle;
  provider?: ImageProvider;
  model?: string;
  size?: ImageSize;
  quality?: ImageQuality;
  customPrompt?: string;
  negativePrompt?: string;
}

/**
 * Slide image generation result
 */
export interface SlideImageResult {
  success: boolean;
  imageUrl?: string;
  imageBase64?: string;
  generatedPrompt: string;
  revisedPrompt?: string;
  provider: ImageProvider;
  model: string;
  error?: string;
}

/**
 * Image style prompt modifiers
 */
const IMAGE_STYLE_MODIFIERS: Record<PPTImageStyle, string> = {
  'photorealistic': 'photorealistic, high detail, professional photography, natural lighting, sharp focus',
  'illustration': 'digital illustration, clean lines, vibrant colors, modern flat design style',
  'minimalist': 'minimalist design, simple shapes, clean background, elegant, whitespace',
  'corporate': 'professional business style, clean and modern, corporate aesthetic, polished',
  'artistic': 'artistic interpretation, creative, expressive, unique visual style, painterly',
  'infographic': 'infographic style, data visualization, icons, clean layout, information design',
  'icon-based': 'flat icons, simple graphics, vector style, clean design, symbolic',
  'abstract': 'abstract art, geometric shapes, modern art style, conceptual, non-representational',
  'diagram': 'technical diagram, schematic style, clear labels, professional, blueprint style',
  '3d-render': '3D rendered, realistic materials, professional lighting, high quality render, octane',
};

/**
 * Layout-specific prompt additions
 */
const LAYOUT_PROMPT_ADDITIONS: Partial<Record<PPTSlideLayout, string>> = {
  'title': 'bold, impactful, suitable for title slide, hero image',
  'full-image': 'full bleed, edge-to-edge, high resolution, immersive',
  'image-left': 'vertical composition, suitable for left panel, portrait orientation friendly',
  'image-right': 'vertical composition, suitable for right panel, portrait orientation friendly',
  'comparison': 'split composition, two distinct elements, side by side comparison',
  'quote': 'inspirational, atmospheric, subtle, background suitable for text overlay',
  'chart': 'data visualization friendly, clean background, space for overlays',
  'timeline': 'horizontal flow, sequential, process-oriented',
};

/**
 * Generate prompt for slide image
 */
export function generateSlideImagePrompt(options: SlideImageOptions): string {
  const parts: string[] = [];
  
  // Base content description
  if (options.customPrompt) {
    parts.push(options.customPrompt);
  } else {
    // Generate from slide content
    const contentSummary = options.slideContent
      .replace(/[#*_\[\]]/g, '')
      .substring(0, 200);
    
    parts.push(`Visual representation for: "${options.slideTitle}"`);
    if (contentSummary) {
      parts.push(`Context: ${contentSummary}`);
    }
  }
  
  // Add style modifier
  const styleModifier = IMAGE_STYLE_MODIFIERS[options.imageStyle] || IMAGE_STYLE_MODIFIERS['corporate'];
  parts.push(styleModifier);
  
  // Add layout-specific additions
  const layoutAddition = LAYOUT_PROMPT_ADDITIONS[options.slideLayout];
  if (layoutAddition) {
    parts.push(layoutAddition);
  }
  
  // Add theme-based color guidance
  parts.push(`Color palette: primary ${options.theme.primaryColor}, accent ${options.theme.accentColor}`);
  
  // Add presentation style
  parts.push(`Style: ${options.presentationStyle}`);
  
  // Add quality modifiers
  parts.push('high quality, professional, suitable for presentation');
  
  // Combine all parts
  let prompt = parts.join('. ');
  
  // Add negative prompt handling for certain providers
  if (options.negativePrompt) {
    prompt += ` [Avoid: ${options.negativePrompt}]`;
  }
  
  return prompt;
}

/**
 * Generate image for a presentation slide
 */
export async function generateSlideImage(
  apiKey: string,
  options: SlideImageOptions
): Promise<SlideImageResult> {
  const provider = options.provider || 'openai';
  const model = options.model || 'dall-e-3';
  const size = options.size || '1792x1024';
  const quality = options.quality || 'standard';
  
  // Generate the prompt
  const generatedPrompt = generateSlideImagePrompt(options);
  
  try {
    switch (provider) {
      case 'openai':
        return await generateSlideImageOpenAI(apiKey, generatedPrompt, model, size, quality);
      
      case 'google-imagen':
        return await generateSlideImageGoogleImagen(apiKey, generatedPrompt, model, size, quality);
      
      case 'stability':
        return await generateSlideImageStability(apiKey, generatedPrompt, model, size, quality);
      
      default:
        return {
          success: false,
          generatedPrompt,
          provider,
          model,
          error: `Unsupported provider: ${provider}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      generatedPrompt,
      provider,
      model,
      error: error instanceof Error ? error.message : 'Image generation failed',
    };
  }
}

/**
 * Generate slide image using OpenAI
 */
async function generateSlideImageOpenAI(
  apiKey: string,
  prompt: string,
  model: string,
  size: ImageSize,
  quality: ImageQuality
): Promise<SlideImageResult> {
  const openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });
  
  const validatedSize = validateSizeForModel(model, size);
  const validatedQuality = validateQualityForModel(model, quality);
  
  const response = await openai.images.generate({
    model: model as 'dall-e-3' | 'dall-e-2',
    prompt,
    size: validatedSize as '1024x1024' | '1024x1792' | '1792x1024',
    quality: validatedQuality as 'standard' | 'hd',
    n: 1,
    response_format: 'url',
  });
  
  const imageData = response.data?.[0];
  
  return {
    success: true,
    imageUrl: imageData?.url,
    generatedPrompt: prompt,
    revisedPrompt: imageData?.revised_prompt,
    provider: 'openai',
    model,
  };
}

/**
 * Generate slide image using Google Imagen via Vertex AI
 * Note: Requires Google Cloud credentials and Vertex AI setup
 */
async function generateSlideImageGoogleImagen(
  apiKey: string,
  prompt: string,
  model: string,
  size: ImageSize,
  _quality: ImageQuality
): Promise<SlideImageResult> {
  // Google Imagen implementation via Vertex AI
  // This requires additional setup:
  // 1. Google Cloud project with Vertex AI enabled
  // 2. Service account with appropriate permissions
  // 3. Installed @google-cloud/aiplatform package
  
  // For now, return a placeholder that indicates configuration needed
  // In production, this would use the Vertex AI client
  
  try {
    // Vertex AI endpoint format:
    // https://{REGION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{REGION}/publishers/google/models/{MODEL_ID}:predict
    
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    const region = process.env.GOOGLE_CLOUD_REGION || 'us-central1';
    
    if (!projectId) {
      return {
        success: false,
        generatedPrompt: prompt,
        provider: 'google-imagen',
        model,
        error: 'Google Cloud project not configured. Set GOOGLE_CLOUD_PROJECT environment variable.',
      };
    }
    
    // Map size to Imagen format
    const [width, height] = size.split('x').map(Number);
    const aspectRatio = width > height ? '16:9' : height > width ? '9:16' : '1:1';
    
    // Make request to Vertex AI
    const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${model}:predict`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio,
          safetyFilterLevel: 'block_few',
          personGeneration: 'allow_adult',
        },
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        generatedPrompt: prompt,
        provider: 'google-imagen',
        model,
        error: `Imagen API error: ${response.status} - ${errorText}`,
      };
    }
    
    const data = await response.json();
    const imageBase64 = data.predictions?.[0]?.bytesBase64Encoded;
    
    if (!imageBase64) {
      return {
        success: false,
        generatedPrompt: prompt,
        provider: 'google-imagen',
        model,
        error: 'No image returned from Imagen API',
      };
    }
    
    return {
      success: true,
      imageBase64,
      generatedPrompt: prompt,
      provider: 'google-imagen',
      model,
    };
  } catch (error) {
    return {
      success: false,
      generatedPrompt: prompt,
      provider: 'google-imagen',
      model,
      error: error instanceof Error ? error.message : 'Google Imagen generation failed',
    };
  }
}

/**
 * Generate slide image using Stability AI
 */
async function generateSlideImageStability(
  apiKey: string,
  prompt: string,
  model: string,
  size: ImageSize,
  quality: ImageQuality
): Promise<SlideImageResult> {
  try {
    const [width, height] = size.split('x').map(Number);
    
    // Stability AI API endpoint
    const endpoint = 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        text_prompts: [
          { text: prompt, weight: 1 },
        ],
        cfg_scale: 7,
        height: Math.min(height, 1024),
        width: Math.min(width, 1024),
        samples: 1,
        steps: quality === 'hd' || quality === 'high' ? 50 : 30,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        generatedPrompt: prompt,
        provider: 'stability',
        model,
        error: `Stability API error: ${response.status} - ${errorText}`,
      };
    }
    
    const data = await response.json();
    const imageBase64 = data.artifacts?.[0]?.base64;
    
    if (!imageBase64) {
      return {
        success: false,
        generatedPrompt: prompt,
        provider: 'stability',
        model,
        error: 'No image returned from Stability API',
      };
    }
    
    return {
      success: true,
      imageBase64,
      generatedPrompt: prompt,
      provider: 'stability',
      model,
    };
  } catch (error) {
    return {
      success: false,
      generatedPrompt: prompt,
      provider: 'stability',
      model,
      error: error instanceof Error ? error.message : 'Stability AI generation failed',
    };
  }
}

/**
 * Batch generate images for multiple slides
 */
export async function generateSlideImagesBatch(
  apiKey: string,
  slides: Array<{
    slideId: string;
    options: SlideImageOptions;
  }>,
  options?: {
    concurrency?: number;
    onProgress?: (completed: number, total: number, slideId: string) => void;
  }
): Promise<Map<string, SlideImageResult>> {
  const results = new Map<string, SlideImageResult>();
  const concurrency = options?.concurrency || 2;
  
  // Process in batches to respect rate limits
  for (let i = 0; i < slides.length; i += concurrency) {
    const batch = slides.slice(i, i + concurrency);
    
    const batchPromises = batch.map(async (slide) => {
      const result = await generateSlideImage(apiKey, slide.options);
      results.set(slide.slideId, result);
      options?.onProgress?.(results.size, slides.length, slide.slideId);
      return result;
    });
    
    await Promise.all(batchPromises);
    
    // Rate limiting delay between batches
    if (i + concurrency < slides.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

