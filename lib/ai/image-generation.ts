/**
 * Image Generation - DALL-E integration
 */

import OpenAI from 'openai';

export type ImageSize = '1024x1024' | '1024x1792' | '1792x1024';
export type ImageQuality = 'standard' | 'hd';
export type ImageStyle = 'vivid' | 'natural';

export interface ImageGenerationOptions {
  prompt: string;
  model?: 'dall-e-3' | 'dall-e-2';
  size?: ImageSize;
  quality?: ImageQuality;
  style?: ImageStyle;
  n?: number;
}

export interface GeneratedImage {
  url: string;
  revisedPrompt?: string;
}

export interface ImageGenerationResult {
  images: GeneratedImage[];
  model: string;
}

/**
 * Generate images using DALL-E
 */
export async function generateImage(
  apiKey: string,
  options: ImageGenerationOptions
): Promise<ImageGenerationResult> {
  const openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true, // For client-side use
  });

  const {
    prompt,
    model = 'dall-e-3',
    size = '1024x1024',
    quality = 'standard',
    style = 'vivid',
    n = 1,
  } = options;

  const response = await openai.images.generate({
    model,
    prompt,
    size,
    quality,
    style,
    n,
    response_format: 'url',
  });

  const images: GeneratedImage[] = (response.data ?? []).map((img) => ({
    url: img.url!,
    revisedPrompt: img.revised_prompt,
  }));

  return {
    images,
    model,
  };
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
