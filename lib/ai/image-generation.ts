/**
 * Image Generation - Multi-provider image generation support
 * 
 * Supported providers:
 * - OpenAI DALL-E (dall-e-3, dall-e-2)
 * - OpenAI GPT Image (gpt-image-1)
 * 
 * Features:
 * - Image generation from text prompts
 * - Image editing (inpainting)
 * - Image variations
 * - Multiple output formats
 */

import OpenAI from 'openai';

export type ImageProvider = 'openai';

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
  ];
}
