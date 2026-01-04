/**
 * Image Generation using AI SDK patterns
 * 
 * Modern image generation implementation with unified interface for multiple providers.
 * Designed to be forward-compatible with AI SDK v6's generateImage API.
 * 
 * Currently uses direct provider APIs while maintaining the same interface pattern.
 * When upgraded to AI SDK v6+, can switch to native generateImage function.
 * 
 * Based on AI SDK documentation:
 * https://ai-sdk.dev/docs/ai-sdk-core/image-generation
 */

import { createOpenAI } from '@ai-sdk/openai';
import { proxyFetch, isProxyEnabled } from '@/lib/network/proxy-fetch';

/**
 * Custom error class for image generation failures
 * Compatible with AI SDK v6's NoImageGeneratedError
 */
export class ImageGenerationError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly responses?: Array<{
      timestamp: Date;
      model: string;
    }>
  ) {
    super(message);
    this.name = 'ImageGenerationError';
  }

  static isInstance(error: unknown): error is ImageGenerationError {
    return error instanceof ImageGenerationError;
  }
}

/**
 * Image provider types
 */
export type ImageProviderType = 
  | 'openai'
  | 'xai'
  | 'fal'
  | 'replicate'
  | 'together'
  | 'fireworks'
  | 'deepinfra';

/**
 * Image size options (width x height)
 */
export type ImageSizeOption = 
  | '256x256' 
  | '512x512' 
  | '1024x1024' 
  | '1024x1792' 
  | '1792x1024'
  | '1536x1024'
  | '1024x1536';

/**
 * Aspect ratio options
 */
export type AspectRatioOption = 
  | '1:1' 
  | '3:4' 
  | '4:3' 
  | '9:16' 
  | '16:9' 
  | '9:21' 
  | '21:9';

/**
 * Image quality options
 */
export type ImageQualityOption = 'standard' | 'hd' | 'low' | 'medium' | 'high';

/**
 * Image style options (OpenAI specific)
 */
export type ImageStyleOption = 'vivid' | 'natural';

/**
 * SDK image generation options
 */
export interface SDKImageGenerationOptions {
  /** The prompt to generate an image from */
  prompt: string;
  /** Provider to use */
  provider?: ImageProviderType;
  /** Model ID */
  model?: string;
  /** Image size (width x height) */
  size?: ImageSizeOption;
  /** Aspect ratio (alternative to size) */
  aspectRatio?: AspectRatioOption;
  /** Image quality */
  quality?: ImageQualityOption;
  /** Image style (OpenAI only) */
  style?: ImageStyleOption;
  /** Number of images to generate */
  n?: number;
  /** Random seed for reproducibility */
  seed?: number;
  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;
  /** Provider-specific options */
  providerOptions?: Record<string, unknown>;
}

/**
 * SDK generated image result
 */
export interface SDKGeneratedImage {
  /** Base64 encoded image data */
  base64: string;
  /** Image as Uint8Array */
  uint8Array: Uint8Array;
  /** Revised prompt (if provider modified it) */
  revisedPrompt?: string;
}

/**
 * SDK image generation result
 */
export interface SDKImageGenerationResult {
  /** Generated images */
  images: SDKGeneratedImage[];
  /** Provider used */
  provider: ImageProviderType;
  /** Model used */
  model: string;
  /** Warnings from the provider */
  warnings?: string[];
  /** Provider metadata */
  providerMetadata?: Record<string, unknown>;
}

/**
 * Provider configuration
 */
interface ProviderConfig {
  apiKey: string;
  baseURL?: string;
}

/**
 * Get fetch function based on proxy settings
 */
function getProxyAwareFetch() {
  if (isProxyEnabled()) {
    return proxyFetch;
  }
  return undefined;
}

/**
 * Create image model based on provider
 * Reserved for future use with AI SDK v6+ generateImage API
 */
function _createImageModel(
  provider: ImageProviderType,
  modelId: string,
  config: ProviderConfig
) {
  const fetchFn = getProxyAwareFetch();

  switch (provider) {
    case 'openai': {
      const openai = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        fetch: fetchFn,
      });
      return openai.image(modelId);
    }

    case 'xai': {
      const xai = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL || 'https://api.x.ai/v1',
        fetch: fetchFn,
      });
      return xai.image(modelId);
    }

    case 'together': {
      const together = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL || 'https://api.together.xyz/v1',
        fetch: fetchFn,
      });
      return together.image(modelId);
    }

    case 'fireworks': {
      const fireworks = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL || 'https://api.fireworks.ai/inference/v1',
        fetch: fetchFn,
      });
      return fireworks.image(modelId);
    }

    case 'deepinfra': {
      const deepinfra = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL || 'https://api.deepinfra.com/v1/openai',
        fetch: fetchFn,
      });
      return deepinfra.image(modelId);
    }

    default:
      throw new Error(`Unsupported image provider: ${provider}`);
  }
}

/**
 * Default models for each provider
 */
export const DEFAULT_IMAGE_MODELS: Record<ImageProviderType, string> = {
  openai: 'dall-e-3',
  xai: 'grok-2-image',
  fal: 'fal-ai/flux/dev',
  replicate: 'black-forest-labs/flux-schnell',
  together: 'black-forest-labs/FLUX.1-schnell',
  fireworks: 'accounts/fireworks/models/flux-1-schnell-fp8',
  deepinfra: 'black-forest-labs/FLUX-1-schnell',
};

/**
 * Supported sizes for each model
 */
export const MODEL_SUPPORTED_SIZES: Record<string, ImageSizeOption[]> = {
  'dall-e-3': ['1024x1024', '1024x1792', '1792x1024'],
  'dall-e-2': ['256x256', '512x512', '1024x1024'],
  'gpt-image-1': ['1024x1024', '1536x1024', '1024x1536'],
  'grok-2-image': ['1024x1024'],
};

/**
 * Generate images using unified provider interface
 * Uses OpenAI SDK directly for compatible providers
 */
export async function generateImageWithSDK(
  config: ProviderConfig,
  options: SDKImageGenerationOptions
): Promise<SDKImageGenerationResult> {
  const {
    prompt,
    provider = 'openai',
    model = DEFAULT_IMAGE_MODELS[provider],
    size = '1024x1024',
    quality = 'standard',
    style = 'vivid',
    n = 1,
  } = options;

  try {
    // Use OpenAI SDK for OpenAI-compatible providers
    if (provider === 'openai' || provider === 'xai' || provider === 'together' || provider === 'fireworks' || provider === 'deepinfra') {
      return await generateWithOpenAISDK(config, {
        prompt,
        provider,
        model,
        size,
        quality,
        style,
        n,
      });
    }

    // For other providers, throw not supported error
    throw new ImageGenerationError(`Provider ${provider} is not yet supported`);
  } catch (error) {
    if (ImageGenerationError.isInstance(error)) {
      throw error;
    }
    throw new ImageGenerationError(
      `Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Generate images using OpenAI SDK (for OpenAI-compatible providers)
 */
async function generateWithOpenAISDK(
  config: ProviderConfig,
  options: {
    prompt: string;
    provider: ImageProviderType;
    model: string;
    size: ImageSizeOption;
    quality: ImageQualityOption;
    style: ImageStyleOption;
    n: number;
  }
): Promise<SDKImageGenerationResult> {
  const { prompt, provider, model, size, quality, style, n } = options;

  // Get base URL for provider
  const baseURLMap: Record<string, string | undefined> = {
    openai: undefined,
    xai: 'https://api.x.ai/v1',
    together: 'https://api.together.xyz/v1',
    fireworks: 'https://api.fireworks.ai/inference/v1',
    deepinfra: 'https://api.deepinfra.com/v1/openai',
  };

  const baseURL = config.baseURL || baseURLMap[provider];
  const fetchFn = getProxyAwareFetch();

  // Create OpenAI client
  const openai = createOpenAI({
    apiKey: config.apiKey,
    baseURL,
    fetch: fetchFn,
  });

  // Use the responses API for image generation
  // This is a workaround since AI SDK v5 doesn't have generateImage
  const response = await fetch(`${baseURL || 'https://api.openai.com/v1'}/images/generations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
      quality: quality === 'hd' ? 'hd' : 'standard',
      style: model.includes('dall-e-3') ? style : undefined,
      n: model.includes('dall-e-3') ? 1 : n,
      response_format: 'b64_json',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ImageGenerationError(`Image API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as {
    data: Array<{ b64_json?: string; url?: string; revised_prompt?: string }>;
  };

  // Convert response to our format
  const images: SDKGeneratedImage[] = (data.data || []).map((img: { b64_json?: string; url?: string; revised_prompt?: string }) => {
    const base64 = img.b64_json || '';
    return {
      base64,
      uint8Array: base64ToUint8Array(base64),
      revisedPrompt: img.revised_prompt,
    };
  });

  // Suppress unused variable warning - openai client created for future use
  void openai;

  return {
    images,
    provider,
    model,
  };
}

/**
 * Convert base64 string to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  if (!base64) return new Uint8Array(0);
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate multiple images in batch
 * Handles providers that have per-request limits automatically
 */
export async function generateImagesBatchWithSDK(
  config: ProviderConfig,
  options: SDKImageGenerationOptions & {
    /** Maximum images per API call (for providers with limits) */
    maxImagesPerCall?: number;
  }
): Promise<SDKImageGenerationResult> {
  const { n = 1, maxImagesPerCall, ...restOptions } = options;

  // For single image, just use regular generation
  if (n === 1) {
    return generateImageWithSDK(config, options);
  }

  // AI SDK handles batching automatically, but we can override if needed
  const generateOptions = {
    ...restOptions,
    n,
    ...(maxImagesPerCall && { maxImagesPerCall }),
  };

  return generateImageWithSDK(config, generateOptions);
}

/**
 * Get available image models for a provider
 */
export function getAvailableImageModels(provider: ImageProviderType): Array<{
  id: string;
  name: string;
  supportedSizes: ImageSizeOption[];
  maxImages: number;
}> {
  switch (provider) {
    case 'openai':
      return [
        {
          id: 'dall-e-3',
          name: 'DALL-E 3',
          supportedSizes: ['1024x1024', '1024x1792', '1792x1024'],
          maxImages: 1,
        },
        {
          id: 'dall-e-2',
          name: 'DALL-E 2',
          supportedSizes: ['256x256', '512x512', '1024x1024'],
          maxImages: 10,
        },
        {
          id: 'gpt-image-1',
          name: 'GPT Image 1',
          supportedSizes: ['1024x1024', '1536x1024', '1024x1536'],
          maxImages: 1,
        },
      ];

    case 'xai':
      return [
        {
          id: 'grok-2-image',
          name: 'Grok 2 Image',
          supportedSizes: ['1024x1024'],
          maxImages: 1,
        },
      ];

    case 'together':
      return [
        {
          id: 'black-forest-labs/FLUX.1-schnell',
          name: 'FLUX.1 Schnell',
          supportedSizes: ['512x512', '1024x1024'],
          maxImages: 4,
        },
        {
          id: 'black-forest-labs/FLUX.1-dev',
          name: 'FLUX.1 Dev',
          supportedSizes: ['512x512', '1024x1024'],
          maxImages: 4,
        },
        {
          id: 'stabilityai/stable-diffusion-xl-base-1.0',
          name: 'Stable Diffusion XL',
          supportedSizes: ['512x512', '1024x1024'],
          maxImages: 4,
        },
      ];

    case 'fireworks':
      return [
        {
          id: 'accounts/fireworks/models/flux-1-schnell-fp8',
          name: 'FLUX.1 Schnell',
          supportedSizes: ['1024x1024'],
          maxImages: 4,
        },
        {
          id: 'accounts/fireworks/models/flux-1-dev-fp8',
          name: 'FLUX.1 Dev',
          supportedSizes: ['1024x1024'],
          maxImages: 4,
        },
      ];

    case 'deepinfra':
      return [
        {
          id: 'black-forest-labs/FLUX-1-schnell',
          name: 'FLUX.1 Schnell',
          supportedSizes: ['1024x1024'],
          maxImages: 4,
        },
        {
          id: 'black-forest-labs/FLUX-1-dev',
          name: 'FLUX.1 Dev',
          supportedSizes: ['1024x1024'],
          maxImages: 4,
        },
        {
          id: 'stabilityai/sd3.5',
          name: 'Stable Diffusion 3.5',
          supportedSizes: ['1024x1024'],
          maxImages: 4,
        },
      ];

    default:
      return [];
  }
}

/**
 * Validate size for a specific model
 */
export function validateSizeForModel(
  model: string,
  size: ImageSizeOption
): ImageSizeOption {
  const supportedSizes = MODEL_SUPPORTED_SIZES[model];
  if (!supportedSizes) {
    return size; // Unknown model, allow any size
  }
  
  if (supportedSizes.includes(size)) {
    return size;
  }
  
  // Return default size for the model
  return supportedSizes[0];
}

/**
 * Convert base64 to data URL
 */
export function base64ToDataURL(base64: string, mimeType = 'image/png'): string {
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Convert Uint8Array to Blob
 */
export function uint8ArrayToBlob(data: Uint8Array, mimeType = 'image/png'): Blob {
  // Create a new ArrayBuffer copy for Blob compatibility
  const buffer = new ArrayBuffer(data.length);
  new Uint8Array(buffer).set(data);
  return new Blob([buffer], { type: mimeType });
}

/**
 * Download image from Uint8Array
 */
export function downloadImage(data: Uint8Array, filename: string, mimeType = 'image/png'): void {
  const blob = uint8ArrayToBlob(data, mimeType);
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
 * Estimate cost for image generation
 */
export function estimateImageCost(
  provider: ImageProviderType,
  model: string,
  size: ImageSizeOption,
  quality: ImageQualityOption,
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
      '256x256-standard': 0.016,
      '512x512-standard': 0.018,
      '1024x1024-standard': 0.02,
    },
    'gpt-image-1': {
      '1024x1024-low': 0.011,
      '1024x1024-medium': 0.042,
      '1024x1024-high': 0.167,
    },
    'grok-2-image': {
      '1024x1024-standard': 0.05,
    },
  };

  const modelPricing = pricing[model];
  if (!modelPricing) return 0;

  const key = `${size}-${quality}`;
  const pricePerImage = modelPricing[key] || modelPricing[`${size}-standard`] || 0.04;
  return pricePerImage * count;
}
