/**
 * Tests for Image Generation Tool
 */

import {
  imageGenerateInputSchema,
  imageEditInputSchema,
  imageVariationInputSchema,
  executeImageGenerate,
  executeImageEdit,
  executeImageVariation,
  executeGetImageModels,
  executeEstimateCost,
  imageGenerateTool,
  imageEditTool,
  imageVariationTool,
  imageTools,
  registerImageTools,
  type ImageGenerateInput,
  type ImageEditInput,
  type ImageVariationInput,
} from './image-tool';

// Mock the image generation module
jest.mock('../media/image-generation', () => ({
  generateImage: jest.fn(),
  editImage: jest.fn(),
  createImageVariation: jest.fn(),
  estimateImageCost: jest.fn(),
  getAvailableImageModels: jest.fn(),
}));

import {
  generateImage,
  editImage,
  createImageVariation,
  estimateImageCost,
  getAvailableImageModels,
} from '../media/image-generation';

const mockGenerateImage = generateImage as jest.MockedFunction<typeof generateImage>;
const mockEditImage = editImage as jest.MockedFunction<typeof editImage>;
const mockCreateImageVariation = createImageVariation as jest.MockedFunction<typeof createImageVariation>;
const mockEstimateImageCost = estimateImageCost as jest.MockedFunction<typeof estimateImageCost>;
const mockGetAvailableImageModels = getAvailableImageModels as jest.MockedFunction<typeof getAvailableImageModels>;

describe('Image Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('imageGenerateInputSchema', () => {
    it('validates valid input', () => {
      const input = {
        prompt: 'A beautiful sunset over mountains',
        provider: 'openai',
        model: 'dall-e-3',
        size: '1024x1024',
        quality: 'hd',
        style: 'vivid',
        n: 1,
      };
      const result = imageGenerateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('requires prompt', () => {
      const input = { provider: 'openai' };
      const result = imageGenerateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates prompt min length', () => {
      const input = { prompt: '' };
      const result = imageGenerateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates provider enum', () => {
      const input = { prompt: 'test', provider: 'invalid' };
      const result = imageGenerateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates model enum', () => {
      const input = { prompt: 'test', model: 'invalid-model' };
      const result = imageGenerateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates size enum', () => {
      const input = { prompt: 'test', size: '800x600' };
      const result = imageGenerateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates n range', () => {
      const input = { prompt: 'test', n: 15 };
      const result = imageGenerateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('allows optional fields', () => {
      const input = { prompt: 'A simple test prompt' };
      const result = imageGenerateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('imageEditInputSchema', () => {
    it('validates valid input', () => {
      const input = {
        imageBase64: 'base64encodedimage',
        prompt: 'Add a rainbow to the sky',
        size: '1024x1024',
      };
      const result = imageEditInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('requires imageBase64', () => {
      const input = { prompt: 'Edit the image' };
      const result = imageEditInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('requires prompt', () => {
      const input = { imageBase64: 'base64data' };
      const result = imageEditInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('allows optional maskBase64', () => {
      const input = {
        imageBase64: 'base64data',
        prompt: 'Edit',
        maskBase64: 'maskdata',
      };
      const result = imageEditInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('imageVariationInputSchema', () => {
    it('validates valid input', () => {
      const input = {
        imageBase64: 'base64encodedimage',
        n: 3,
        size: '512x512',
      };
      const result = imageVariationInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('requires imageBase64', () => {
      const input = { n: 2 };
      const result = imageVariationInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates n range', () => {
      const input = { imageBase64: 'data', n: 20 };
      const result = imageVariationInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('executeImageGenerate', () => {
    it('generates image successfully', async () => {
      const mockResult = {
        images: [
          {
            url: 'https://example.com/image.png',
            revisedPrompt: 'Enhanced prompt',
            width: 1024,
            height: 1024,
          },
        ],
        model: 'dall-e-3',
        provider: 'openai' as const,
        usage: { cost: 0.04 },
      };
      mockGenerateImage.mockResolvedValue(mockResult as never);

      const input: ImageGenerateInput = {
        prompt: 'A beautiful sunset',
        provider: 'openai',
        model: 'dall-e-3',
      };

      const result = await executeImageGenerate(input, 'test-api-key');

      expect(result.success).toBe(true);
      expect(result.data?.images).toHaveLength(1);
      expect(result.data?.images?.[0].url).toBe('https://example.com/image.png');
      expect(result.data?.model).toBe('dall-e-3');
      expect(result.data?.provider).toBe('openai');
      expect(result.data?.estimatedCost).toBe(0.04);
    });

    it('handles generation with base64 output', async () => {
      const mockResult = {
        images: [{ base64: 'base64imagedata' }],
        model: 'dall-e-2',
        provider: 'openai' as const,
      };
      mockGenerateImage.mockResolvedValue(mockResult as never);

      const input: ImageGenerateInput = {
        prompt: 'Test image',
        outputFormat: 'b64_json',
      };

      const result = await executeImageGenerate(input, 'test-api-key');

      expect(result.success).toBe(true);
      expect(result.data?.images?.[0].base64).toBe('base64imagedata');
    });

    it('handles empty images result', async () => {
      mockGenerateImage.mockResolvedValue({ images: [], model: 'dall-e-3', provider: 'openai' as const } as never);

      const input: ImageGenerateInput = { prompt: 'Test' };
      const result = await executeImageGenerate(input, 'test-api-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No images generated');
    });

    it('handles generation error', async () => {
      mockGenerateImage.mockRejectedValue(new Error('API rate limit exceeded'));

      const input: ImageGenerateInput = { prompt: 'Test' };
      const result = await executeImageGenerate(input, 'test-api-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API rate limit exceeded');
    });

    it('handles non-Error exceptions', async () => {
      mockGenerateImage.mockRejectedValue('Unknown error');

      const input: ImageGenerateInput = { prompt: 'Test' };
      const result = await executeImageGenerate(input, 'test-api-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to generate image');
    });
  });

  describe('executeImageEdit', () => {
    it('edits image successfully', async () => {
      const mockResult = {
        images: [{ url: 'https://example.com/edited.png' }],
        model: 'dall-e-2',
        provider: 'openai' as const,
      };
      mockEditImage.mockResolvedValue(mockResult as never);

      const input: ImageEditInput = {
        imageBase64: 'aW1hZ2VkYXRh', // base64 data
        prompt: 'Add a hat',
      };

      const result = await executeImageEdit(input, 'test-api-key');

      expect(result.success).toBe(true);
      expect(result.data?.images).toHaveLength(1);
      expect(mockEditImage).toHaveBeenCalled();
    });

    it('edits image with mask', async () => {
      const mockResult = {
        images: [{ url: 'https://example.com/edited.png' }],
        model: 'dall-e-2',
        provider: 'openai' as const,
      };
      mockEditImage.mockResolvedValue(mockResult as never);

      const input: ImageEditInput = {
        imageBase64: 'aW1hZ2VkYXRh',
        prompt: 'Replace background',
        maskBase64: 'bWFza2RhdGE=',
      };

      const result = await executeImageEdit(input, 'test-api-key');

      expect(result.success).toBe(true);
    });

    it('handles edit error', async () => {
      mockEditImage.mockRejectedValue(new Error('Invalid image format'));

      const input: ImageEditInput = {
        imageBase64: 'invalid',
        prompt: 'Edit',
      };

      const result = await executeImageEdit(input, 'test-api-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid image format');
    });

    it('handles non-Error exceptions', async () => {
      mockEditImage.mockRejectedValue('Unknown');

      const input: ImageEditInput = {
        imageBase64: 'data',
        prompt: 'Edit',
      };

      const result = await executeImageEdit(input, 'test-api-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to edit image');
    });
  });

  describe('executeImageVariation', () => {
    it('creates variations successfully', async () => {
      const mockResult = {
        images: [
          { url: 'https://example.com/var1.png' },
          { url: 'https://example.com/var2.png' },
        ],
        model: 'dall-e-2',
        provider: 'openai' as const,
      };
      mockCreateImageVariation.mockResolvedValue(mockResult as never);

      const input: ImageVariationInput = {
        imageBase64: 'aW1hZ2VkYXRh',
        n: 2,
      };

      const result = await executeImageVariation(input, 'test-api-key');

      expect(result.success).toBe(true);
      expect(result.data?.images).toHaveLength(2);
    });

    it('handles variation error', async () => {
      mockCreateImageVariation.mockRejectedValue(new Error('Image too large'));

      const input: ImageVariationInput = {
        imageBase64: 'largeimage',
      };

      const result = await executeImageVariation(input, 'test-api-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Image too large');
    });

    it('handles non-Error exceptions', async () => {
      mockCreateImageVariation.mockRejectedValue(null);

      const input: ImageVariationInput = {
        imageBase64: 'data',
      };

      const result = await executeImageVariation(input, 'test-api-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create image variation');
    });
  });

  describe('executeGetImageModels', () => {
    it('returns available models', () => {
      const mockModels = [
        {
          id: 'dall-e-3',
          name: 'DALL-E 3',
          provider: 'openai' as const,
          supportedSizes: ['1024x1024', '1024x1792'] as const,
          supportedQualities: ['standard', 'hd'] as const,
          maxImages: 1,
        },
        {
          id: 'dall-e-2',
          name: 'DALL-E 2',
          provider: 'openai' as const,
          supportedSizes: ['256x256', '512x512', '1024x1024'] as const,
          supportedQualities: ['standard'] as const,
          maxImages: 10,
        },
      ];
      mockGetAvailableImageModels.mockReturnValue(mockModels as never);

      const result = executeGetImageModels();

      expect(result.success).toBe(true);
      expect((result.data as { models: unknown[] })?.models).toHaveLength(2);
    });

    it('handles error', () => {
      mockGetAvailableImageModels.mockImplementation(() => {
        throw new Error('Failed to fetch models');
      });

      const result = executeGetImageModels();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch models');
    });

    it('handles non-Error exceptions', () => {
      mockGetAvailableImageModels.mockImplementation(() => {
        throw 'Unknown';
      });

      const result = executeGetImageModels();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get image models');
    });
  });

  describe('executeEstimateCost', () => {
    it('estimates cost correctly', () => {
      mockEstimateImageCost.mockReturnValue(0.08);

      const result = executeEstimateCost('dall-e-3', '1024x1024', 'hd', 2);

      expect(result.success).toBe(true);
      expect(result.data?.estimatedCost).toBe(0.08);
      expect(mockEstimateImageCost).toHaveBeenCalledWith('dall-e-3', '1024x1024', 'hd', 2);
    });

    it('handles error', () => {
      mockEstimateImageCost.mockImplementation(() => {
        throw new Error('Unknown model');
      });

      const result = executeEstimateCost('unknown', '1024x1024', 'standard', 1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown model');
    });

    it('handles non-Error exceptions', () => {
      mockEstimateImageCost.mockImplementation(() => {
        throw null;
      });

      const result = executeEstimateCost('model', '1024x1024', 'standard', 1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to estimate cost');
    });
  });

  describe('Tool Definitions', () => {
    describe('imageGenerateTool', () => {
      it('has correct properties', () => {
        expect(imageGenerateTool.name).toBe('image_generate');
        expect(imageGenerateTool.description).toContain('Generate an image');
        expect(imageGenerateTool.requiresApproval).toBe(false);
        expect(imageGenerateTool.category).toBe('custom');
        expect(imageGenerateTool.parameters).toBe(imageGenerateInputSchema);
      });

      it('creates executable function', () => {
        const fn = imageGenerateTool.create({ apiKey: 'test-key' });
        expect(typeof fn).toBe('function');
      });
    });

    describe('imageEditTool', () => {
      it('has correct properties', () => {
        expect(imageEditTool.name).toBe('image_edit');
        expect(imageEditTool.description).toContain('Edit an existing image');
        expect(imageEditTool.requiresApproval).toBe(false);
        expect(imageEditTool.category).toBe('custom');
      });

      it('creates executable function', () => {
        const fn = imageEditTool.create({ apiKey: 'test-key' });
        expect(typeof fn).toBe('function');
      });
    });

    describe('imageVariationTool', () => {
      it('has correct properties', () => {
        expect(imageVariationTool.name).toBe('image_variation');
        expect(imageVariationTool.description).toContain('Create variations');
        expect(imageVariationTool.requiresApproval).toBe(false);
        expect(imageVariationTool.category).toBe('custom');
      });

      it('creates executable function', () => {
        const fn = imageVariationTool.create({ apiKey: 'test-key' });
        expect(typeof fn).toBe('function');
      });
    });
  });

  describe('imageTools collection', () => {
    it('contains all image tools', () => {
      expect(imageTools.image_generate).toBe(imageGenerateTool);
      expect(imageTools.image_edit).toBe(imageEditTool);
      expect(imageTools.image_variation).toBe(imageVariationTool);
    });
  });

  describe('registerImageTools', () => {
    it('registers all tools to registry', () => {
      const mockRegistry = {
        register: jest.fn(),
      };

      registerImageTools(mockRegistry);

      expect(mockRegistry.register).toHaveBeenCalledTimes(3);
      expect(mockRegistry.register).toHaveBeenCalledWith(imageGenerateTool);
      expect(mockRegistry.register).toHaveBeenCalledWith(imageEditTool);
      expect(mockRegistry.register).toHaveBeenCalledWith(imageVariationTool);
    });
  });
});
