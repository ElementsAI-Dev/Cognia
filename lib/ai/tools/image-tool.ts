/**
 * Image Generation Tool - AI tool for generating images
 * 
 * Provides tools for:
 * - Text-to-image generation
 * - Image editing (inpainting)
 * - Image variations
 * 
 * Supports providers:
 * - OpenAI DALL-E (dall-e-3, dall-e-2, gpt-image-1)
 * - Google Imagen (imagen-3, imagen-4)
 * - Stability AI (stable-diffusion-xl)
 */

import { z } from 'zod';
import type { ToolDefinition } from './registry';
import {
  generateImage,
  editImage,
  createImageVariation,
  estimateImageCost,
  getAvailableImageModels,
} from '../media/image-generation';
import type {
  ImageProvider,
  ImageSize,
  ImageQuality,
  ImageStyle,
  ImageOutputFormat,
  ImageGenerationResult,
  GeneratedImage,
} from '../media/image-generation';

/**
 * Image generation input schema
 */
export const imageGenerateInputSchema = z.object({
  prompt: z.string().min(1).max(4000).describe('Text prompt describing the image to generate'),
  provider: z.enum(['openai', 'google-imagen', 'stability']).optional().describe('Image generation provider (default: openai)'),
  model: z.enum(['dall-e-3', 'dall-e-2', 'gpt-image-1', 'imagen-3', 'imagen-4', 'stable-diffusion-xl']).optional().describe('Model to use for generation'),
  size: z.enum(['256x256', '512x512', '1024x1024', '1024x1792', '1792x1024']).optional().describe('Output image size (default: 1024x1024)'),
  quality: z.enum(['standard', 'hd']).optional().describe('Image quality (default: standard)'),
  style: z.enum(['natural', 'vivid']).optional().describe('Visual style (default: vivid, DALL-E 3 only)'),
  n: z.number().min(1).max(10).optional().describe('Number of images to generate (default: 1, DALL-E 2 supports up to 10)'),
  outputFormat: z.enum(['url', 'b64_json']).optional().describe('Output format (default: url)'),
  negativePrompt: z.string().optional().describe('Things to avoid in the image'),
});

export type ImageGenerateInput = z.infer<typeof imageGenerateInputSchema>;

/**
 * Image edit input schema
 */
export const imageEditInputSchema = z.object({
  imageBase64: z.string().describe('Base64 encoded image to edit (PNG format, must be square and less than 4MB)'),
  prompt: z.string().min(1).describe('Description of the edit to make'),
  maskBase64: z.string().optional().describe('Base64 encoded mask image (transparent areas indicate where to edit)'),
  size: z.enum(['256x256', '512x512', '1024x1024']).optional().describe('Output size (default: 1024x1024)'),
  n: z.number().min(1).max(10).optional().describe('Number of images to generate (default: 1)'),
});

export type ImageEditInput = z.infer<typeof imageEditInputSchema>;

/**
 * Image variation input schema
 */
export const imageVariationInputSchema = z.object({
  imageBase64: z.string().describe('Base64 encoded image to create variations of (PNG format, must be square and less than 4MB)'),
  n: z.number().min(1).max(10).optional().describe('Number of variations to generate (default: 1)'),
  size: z.enum(['256x256', '512x512', '1024x1024']).optional().describe('Output size (default: 1024x1024)'),
});

export type ImageVariationInput = z.infer<typeof imageVariationInputSchema>;

/**
 * Image tool result interface
 */
export interface ImageToolResult {
  success: boolean;
  data?: {
    images?: Array<{
      url?: string;
      base64?: string;
      revisedPrompt?: string;
      width?: number;
      height?: number;
    }>;
    model?: string;
    provider?: string;
    estimatedCost?: number;
  };
  error?: string;
}

/**
 * Convert base64 string to File object for API compatibility
 */
function base64ToFile(base64: string, filename: string = 'image.png'): File {
  const byteCharacters = atob(base64.replace(/^data:image\/\w+;base64,/, ''));
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'image/png' });
  return new File([blob], filename, { type: 'image/png' });
}

/**
 * Execute image generation
 */
export async function executeImageGenerate(
  input: ImageGenerateInput,
  apiKey: string
): Promise<ImageToolResult> {
  try {
    const result = await generateImage(apiKey, {
      prompt: input.prompt,
      provider: input.provider as ImageProvider | undefined,
      model: input.model as 'dall-e-3' | 'dall-e-2' | 'gpt-image-1' | undefined,
      size: input.size as ImageSize | undefined,
      quality: input.quality as ImageQuality | undefined,
      style: input.style as ImageStyle | undefined,
      n: input.n,
      outputFormat: input.outputFormat as ImageOutputFormat | undefined,
      negativePrompt: input.negativePrompt,
    });

    return formatImageResult(result);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate image',
    };
  }
}

/**
 * Execute image edit
 */
export async function executeImageEdit(
  input: ImageEditInput,
  apiKey: string
): Promise<ImageToolResult> {
  try {
    const imageFile = base64ToFile(input.imageBase64, 'image.png');
    const maskFile = input.maskBase64 ? base64ToFile(input.maskBase64, 'mask.png') : undefined;

    const result = await editImage(apiKey, {
      image: imageFile,
      prompt: input.prompt,
      mask: maskFile,
      size: input.size as '256x256' | '512x512' | '1024x1024' | undefined,
      n: input.n,
    });

    return formatImageResult(result);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to edit image',
    };
  }
}

/**
 * Execute image variation
 */
export async function executeImageVariation(
  input: ImageVariationInput,
  apiKey: string
): Promise<ImageToolResult> {
  try {
    const imageFile = base64ToFile(input.imageBase64, 'image.png');

    const result = await createImageVariation(apiKey, {
      image: imageFile,
      n: input.n,
      size: input.size as '256x256' | '512x512' | '1024x1024' | undefined,
    });

    return formatImageResult(result);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create image variation',
    };
  }
}

/**
 * Format image generation result for tool output
 */
function formatImageResult(result: ImageGenerationResult): ImageToolResult {
  if (!result.images || result.images.length === 0) {
    return {
      success: false,
      error: 'No images generated',
    };
  }

  const images = result.images.map((img: GeneratedImage) => ({
    url: img.url,
    base64: img.base64,
    revisedPrompt: img.revisedPrompt,
    width: img.width,
    height: img.height,
  }));

  return {
    success: true,
    data: {
      images,
      model: result.model,
      provider: result.provider,
      estimatedCost: result.usage?.cost,
    },
  };
}

/**
 * Get available image models tool
 */
export function executeGetImageModels(): ImageToolResult {
  try {
    const models = getAvailableImageModels();
    return {
      success: true,
      data: {
        // @ts-expect-error - extending data for models list
        models: models.map(m => ({
          id: m.id,
          name: m.name,
          provider: m.provider,
          supportedSizes: m.supportedSizes,
          supportedQualities: m.supportedQualities,
          maxImages: m.maxImages,
        })),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get image models',
    };
  }
}

/**
 * Estimate image generation cost
 */
export function executeEstimateCost(
  model: string,
  size: ImageSize,
  quality: ImageQuality,
  count: number
): ImageToolResult {
  try {
    const cost = estimateImageCost(model, size, quality, count);
    return {
      success: true,
      data: {
        estimatedCost: cost,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to estimate cost',
    };
  }
}

/**
 * Image generation tool definition
 */
export const imageGenerateTool: ToolDefinition<typeof imageGenerateInputSchema> = {
  name: 'image_generate',
  description: `Generate an image from a text prompt using AI. Supports OpenAI DALL-E (dall-e-3, dall-e-2), and other providers.

Features:
- Text-to-image generation with detailed prompts
- Multiple sizes (256x256 to 1792x1024)
- Quality options (standard, HD)
- Style options (natural, vivid)
- Generate multiple images at once (DALL-E 2)

Tips for better results:
- Be specific and detailed in your prompt
- Describe style, lighting, perspective, and mood
- Use negativePrompt to exclude unwanted elements
- DALL-E 3 automatically enhances prompts`,
  parameters: imageGenerateInputSchema,
  requiresApproval: false,
  category: 'custom',
  create: (config) => {
    const apiKey = (config.apiKey as string) || '';
    return (input: unknown) => executeImageGenerate(input as ImageGenerateInput, apiKey);
  },
};

/**
 * Image edit tool definition
 */
export const imageEditTool: ToolDefinition<typeof imageEditInputSchema> = {
  name: 'image_edit',
  description: `Edit an existing image using AI (inpainting). Provide a base64 encoded PNG image and a description of the edit.

Requirements:
- Image must be PNG format
- Image must be square
- Image must be less than 4MB
- Mask is optional - transparent areas indicate where to edit

Use cases:
- Add or remove objects
- Change backgrounds
- Extend images
- Fix or modify specific areas`,
  parameters: imageEditInputSchema,
  requiresApproval: false,
  category: 'custom',
  create: (config) => {
    const apiKey = (config.apiKey as string) || '';
    return (input: unknown) => executeImageEdit(input as ImageEditInput, apiKey);
  },
};

/**
 * Image variation tool definition
 */
export const imageVariationTool: ToolDefinition<typeof imageVariationInputSchema> = {
  name: 'image_variation',
  description: `Create variations of an existing image. Provide a base64 encoded PNG image.

Requirements:
- Image must be PNG format
- Image must be square
- Image must be less than 4MB

The AI will generate similar but unique versions of the input image.`,
  parameters: imageVariationInputSchema,
  requiresApproval: false,
  category: 'custom',
  create: (config) => {
    const apiKey = (config.apiKey as string) || '';
    return (input: unknown) => executeImageVariation(input as ImageVariationInput, apiKey);
  },
};

/**
 * Image tools collection
 */
export const imageTools = {
  image_generate: imageGenerateTool,
  image_edit: imageEditTool,
  image_variation: imageVariationTool,
};

/**
 * Register image tools to a registry
 */
export function registerImageTools(
  registry: { register: (tool: ToolDefinition) => void }
): void {
  registry.register(imageGenerateTool);
  registry.register(imageEditTool);
  registry.register(imageVariationTool);
}
