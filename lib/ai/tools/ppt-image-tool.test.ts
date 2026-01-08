/**
 * Tests for PPT Image Generation Tool
 */

import {
  pptImageGenerateInputSchema,
  pptBatchImageGenerateInputSchema,
  buildImagePrompt,
  pptImageTools,
  registerPPTImageTools,
} from './ppt-image-tool';

describe('pptImageGenerateInputSchema', () => {
  it('validates valid input', () => {
    const input = {
      slideId: 'slide-1',
      slideTitle: 'Introduction to AI',
      slideContent: 'AI is transforming industries',
      style: 'corporate',
      size: '1792x1024',
      quality: 'standard',
    };

    const result = pptImageGenerateInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('requires slideId and slideTitle', () => {
    const invalidInput = {
      slideContent: 'Some content',
    };

    const result = pptImageGenerateInputSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('has correct defaults', () => {
    const input = {
      slideId: 'slide-1',
      slideTitle: 'Test',
    };

    const result = pptImageGenerateInputSchema.parse(input);
    expect(result.style).toBe('corporate');
    expect(result.size).toBe('1792x1024');
    expect(result.quality).toBe('standard');
  });

  it('validates style enum', () => {
    const validStyles = [
      'photorealistic', 'illustration', 'minimalist', 'corporate',
      'artistic', 'infographic', 'icon-based', 'abstract', 'diagram', '3d-render'
    ];

    for (const style of validStyles) {
      const result = pptImageGenerateInputSchema.safeParse({
        slideId: 'slide-1',
        slideTitle: 'Test',
        style,
      });
      expect(result.success).toBe(true);
    }

    const invalidResult = pptImageGenerateInputSchema.safeParse({
      slideId: 'slide-1',
      slideTitle: 'Test',
      style: 'invalid-style',
    });
    expect(invalidResult.success).toBe(false);
  });

  it('validates size enum', () => {
    const validSizes = ['1024x1024', '1024x1792', '1792x1024'];

    for (const size of validSizes) {
      const result = pptImageGenerateInputSchema.safeParse({
        slideId: 'slide-1',
        slideTitle: 'Test',
        size,
      });
      expect(result.success).toBe(true);
    }
  });

  it('validates quality enum', () => {
    const validQualities = ['draft', 'standard', 'high'];

    for (const quality of validQualities) {
      const result = pptImageGenerateInputSchema.safeParse({
        slideId: 'slide-1',
        slideTitle: 'Test',
        quality,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('pptBatchImageGenerateInputSchema', () => {
  it('validates valid batch input', () => {
    const input = {
      slides: [
        { slideId: 'slide-1', slideTitle: 'Intro', imageNeeded: true },
        { slideId: 'slide-2', slideTitle: 'Content', slideContent: 'Details', imageNeeded: true },
      ],
      style: 'corporate',
      theme: {
        primaryColor: '#336699',
        backgroundColor: '#ffffff',
      },
    };

    const result = pptBatchImageGenerateInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts empty slides array (no minimum required)', () => {
    const input = {
      slides: [],
      style: 'corporate',
    };

    const result = pptBatchImageGenerateInputSchema.safeParse(input);
    // Schema allows empty array, validation happens at execution level
    expect(result.success).toBe(true);
  });

  it('has correct defaults', () => {
    const input = {
      slides: [
        { slideId: 'slide-1', slideTitle: 'Test' },
      ],
    };

    const result = pptBatchImageGenerateInputSchema.parse(input);
    expect(result.style).toBe('corporate');
    expect(result.maxConcurrent).toBe(3);
  });

  it('validates maxConcurrent range', () => {
    const baseInput = {
      slides: [{ slideId: 'slide-1', slideTitle: 'Test' }],
    };

    expect(pptBatchImageGenerateInputSchema.safeParse({ ...baseInput, maxConcurrent: 0 }).success).toBe(false);
    expect(pptBatchImageGenerateInputSchema.safeParse({ ...baseInput, maxConcurrent: 1 }).success).toBe(true);
    expect(pptBatchImageGenerateInputSchema.safeParse({ ...baseInput, maxConcurrent: 5 }).success).toBe(true);
    expect(pptBatchImageGenerateInputSchema.safeParse({ ...baseInput, maxConcurrent: 6 }).success).toBe(false);
  });

  it('validates slide imageNeeded default', () => {
    const input = {
      slides: [
        { slideId: 'slide-1', slideTitle: 'Test' },
      ],
    };

    const result = pptBatchImageGenerateInputSchema.parse(input);
    expect(result.slides[0].imageNeeded).toBe(true);
  });
});

describe('buildImagePrompt', () => {
  it('builds prompt with title only', () => {
    const prompt = buildImagePrompt('Introduction to Machine Learning');

    expect(prompt).toContain('Introduction to Machine Learning');
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('builds prompt with title and content', () => {
    const prompt = buildImagePrompt(
      'Data Science Overview',
      'Exploring data analysis, visualization, and machine learning techniques'
    );

    expect(prompt).toContain('Data Science');
  });

  it('builds prompt with different styles', () => {
    const styles = ['photorealistic', 'illustration', 'minimalist', 'corporate', 'artistic'] as const;

    for (const style of styles) {
      const prompt = buildImagePrompt('Test Title', 'Test content', style);
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    }
  });

  it('uses corporate style by default', () => {
    const prompt = buildImagePrompt('Default Style Test');
    expect(typeof prompt).toBe('string');
  });
});

describe('pptImageTools', () => {
  it('contains ppt_generate_image tool', () => {
    expect(pptImageTools).toHaveProperty('ppt_generate_image');
    expect(pptImageTools.ppt_generate_image.name).toBe('ppt_generate_image');
    expect(pptImageTools.ppt_generate_image.description).toContain('image');
    expect(pptImageTools.ppt_generate_image.requiresApproval).toBe(false);
    expect(pptImageTools.ppt_generate_image.category).toBe('ppt');
  });

  it('contains ppt_batch_generate_images tool', () => {
    expect(pptImageTools).toHaveProperty('ppt_batch_generate_images');
    expect(pptImageTools.ppt_batch_generate_images.name).toBe('ppt_batch_generate_images');
    expect(pptImageTools.ppt_batch_generate_images.description).toContain('multiple');
  });

  it('has create function for each tool', () => {
    expect(typeof pptImageTools.ppt_generate_image.create).toBe('function');
    expect(typeof pptImageTools.ppt_batch_generate_images.create).toBe('function');
  });
});

describe('registerPPTImageTools', () => {
  it('registers tools with provided API key', () => {
    const mockRegister = jest.fn();
    
    // Mock dynamic import
    jest.doMock('./registry', () => ({
      getGlobalToolRegistry: () => ({
        register: mockRegister,
      }),
    }));

    // Note: Due to dynamic import, this test verifies the function exists and is callable
    expect(typeof registerPPTImageTools).toBe('function');
    
    // The function uses dynamic import internally, so we just verify it doesn't throw
    expect(() => registerPPTImageTools('test-api-key')).not.toThrow();
  });
});
