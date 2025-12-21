'use client';

/**
 * useImageGeneration - Hook for AI-powered image generation
 * Provides easy access to DALL-E image generation functionality
 */

import { useCallback, useState } from 'react';
import { useSettingsStore } from '@/stores';
import {
  generateImage,
  editImage,
  createImageVariation,
  type ImageGenerationOptions,
  type ImageSize,
  type ImageQuality,
  type ImageStyle,
  type GeneratedImage,
} from '@/lib/ai/image-generation';

export interface UseImageGenerationOptions {
  defaultSize?: ImageSize;
  defaultQuality?: ImageQuality;
  defaultStyle?: ImageStyle;
}

export interface UseImageGenerationReturn {
  // State
  isLoading: boolean;
  error: string | null;
  images: GeneratedImage[];

  // Generation methods
  generate: (
    prompt: string,
    options?: Partial<Omit<ImageGenerationOptions, 'prompt'>>
  ) => Promise<GeneratedImage[] | null>;

  edit: (
    image: File,
    prompt: string,
    mask?: File,
    options?: { size?: '256x256' | '512x512' | '1024x1024'; n?: number }
  ) => Promise<GeneratedImage[] | null>;

  createVariations: (
    image: File,
    options?: { size?: '256x256' | '512x512' | '1024x1024'; n?: number }
  ) => Promise<GeneratedImage[] | null>;

  // Utilities
  clearImages: () => void;
  reset: () => void;
}

export function useImageGeneration(
  options: UseImageGenerationOptions = {}
): UseImageGenerationReturn {
  const {
    defaultSize = '1024x1024',
    defaultQuality = 'standard',
    defaultStyle = 'vivid',
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<GeneratedImage[]>([]);

  const providerSettings = useSettingsStore((state) => state.providerSettings);

  // Get OpenAI API key (required for DALL-E)
  const getApiKey = useCallback((): string => {
    const settings = providerSettings.openai;
    return settings?.apiKey || '';
  }, [providerSettings]);

  // Generate images
  const generate = useCallback(
    async (
      prompt: string,
      opts?: Partial<Omit<ImageGenerationOptions, 'prompt'>>
    ): Promise<GeneratedImage[] | null> => {
      const apiKey = getApiKey();
      if (!apiKey) {
        setError('OpenAI API key is required for image generation');
        return null;
      }

      setIsLoading(true);
      setError(null);
      try {
        const result = await generateImage(apiKey, {
          prompt,
          size: opts?.size || defaultSize,
          quality: opts?.quality || defaultQuality,
          style: opts?.style || defaultStyle,
          n: opts?.n || 1,
          model: opts?.model || 'dall-e-3',
        });

        setImages((prev) => [...prev, ...result.images]);
        return result.images;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Image generation failed';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [getApiKey, defaultSize, defaultQuality, defaultStyle]
  );

  // Edit images
  const edit = useCallback(
    async (
      image: File,
      prompt: string,
      mask?: File,
      opts?: { size?: '256x256' | '512x512' | '1024x1024'; n?: number }
    ): Promise<GeneratedImage[] | null> => {
      const apiKey = getApiKey();
      if (!apiKey) {
        setError('OpenAI API key is required for image editing');
        return null;
      }

      setIsLoading(true);
      setError(null);
      try {
        const result = await editImage(apiKey, {
          image,
          prompt,
          mask,
          size: opts?.size || '1024x1024',
          n: opts?.n || 1,
        });

        setImages((prev) => [...prev, ...result.images]);
        return result.images;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Image editing failed';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [getApiKey]
  );

  // Create variations
  const createVariations = useCallback(
    async (
      image: File,
      opts?: { size?: '256x256' | '512x512' | '1024x1024'; n?: number }
    ): Promise<GeneratedImage[] | null> => {
      const apiKey = getApiKey();
      if (!apiKey) {
        setError('OpenAI API key is required for creating variations');
        return null;
      }

      setIsLoading(true);
      setError(null);
      try {
        const result = await createImageVariation(apiKey, {
          image,
          size: opts?.size || '1024x1024',
          n: opts?.n || 1,
        });

        setImages((prev) => [...prev, ...result.images]);
        return result.images;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Creating variations failed';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [getApiKey]
  );

  // Clear images
  const clearImages = useCallback(() => {
    setImages([]);
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setImages([]);
  }, []);

  return {
    isLoading,
    error,
    images,
    generate,
    edit,
    createVariations,
    clearImages,
    reset,
  };
}

export type { GeneratedImage, ImageGenerationOptions, ImageSize, ImageQuality, ImageStyle };
export default useImageGeneration;
