/**
 * Slide Image Tool Tests
 */

import {
  executeSlideImagePromptGenerate,
} from './slide-image-tool';

// Mock the image generation module
jest.mock('../image-generation', () => ({
  generateSlideImage: jest.fn().mockResolvedValue({
    success: true,
    imageUrl: 'https://example.com/image.png',
    generatedPrompt: 'Test prompt',
    revisedPrompt: 'Revised prompt',
    provider: 'openai',
    model: 'dall-e-3',
  }),
  generateSlideImagesBatch: jest.fn().mockResolvedValue(new Map([
    ['slide-1', {
      success: true,
      imageUrl: 'https://example.com/slide1.png',
      generatedPrompt: 'Prompt 1',
      provider: 'openai',
      model: 'dall-e-3',
    }],
    ['slide-2', {
      success: true,
      imageUrl: 'https://example.com/slide2.png',
      generatedPrompt: 'Prompt 2',
      provider: 'openai',
      model: 'dall-e-3',
    }],
  ])),
}));

describe('Slide Image Tool', () => {
  describe('executeSlideImagePromptGenerate', () => {
    it('should generate prompt for corporate style', () => {
      const result = executeSlideImagePromptGenerate({
        slideTitle: 'Company Overview',
        slideContent: 'Our company is a leader in technology innovation.',
        slideLayout: 'title-content',
        presentationStyle: 'professional',
        imageStyle: 'corporate',
      });

      expect(result.success).toBe(true);
      const data = result.data as { prompt: string; negativePrompt: string; style: string };
      expect(data.prompt).toContain('Company Overview');
      expect(data.prompt).toContain('Professional business');
      expect(data.style).toBe('corporate');
      expect(data.negativePrompt).toBeDefined();
    });

    it('should generate prompt for photorealistic style', () => {
      const result = executeSlideImagePromptGenerate({
        slideTitle: 'Nature Scene',
        slideContent: 'Beautiful mountain landscape',
        slideLayout: 'full-image',
        presentationStyle: 'creative',
        imageStyle: 'photorealistic',
      });

      expect(result.success).toBe(true);
      const data = result.data as { prompt: string };
      expect(data.prompt).toContain('Professional photograph');
      expect(data.prompt).toContain('Nature Scene');
    });

    it('should generate prompt for illustration style', () => {
      const result = executeSlideImagePromptGenerate({
        slideTitle: 'Process Flow',
        slideContent: 'Step by step workflow',
        slideLayout: 'timeline',
        presentationStyle: 'creative',
        imageStyle: 'illustration',
      });

      expect(result.success).toBe(true);
      const data = result.data as { prompt: string };
      expect(data.prompt).toContain('digital illustration');
    });

    it('should generate prompt for minimalist style', () => {
      const result = executeSlideImagePromptGenerate({
        slideTitle: 'Key Points',
        slideContent: 'Simple and clean',
        slideLayout: 'bullets',
        presentationStyle: 'minimal',
        imageStyle: 'minimalist',
      });

      expect(result.success).toBe(true);
      const data = result.data as { prompt: string };
      expect(data.prompt).toContain('Minimalist');
      expect(data.prompt).toContain('simple shapes');
    });

    it('should include keywords in prompt when provided', () => {
      const result = executeSlideImagePromptGenerate({
        slideTitle: 'AI Technology',
        slideContent: 'Machine learning applications',
        slideLayout: 'title-content',
        presentationStyle: 'professional',
        imageStyle: 'corporate',
        keywords: ['technology', 'innovation', 'future'],
      });

      expect(result.success).toBe(true);
      const data = result.data as { prompt: string };
      expect(data.prompt).toContain('technology');
      expect(data.prompt).toContain('innovation');
      expect(data.prompt).toContain('future');
    });

    it('should include mood in prompt when provided', () => {
      const result = executeSlideImagePromptGenerate({
        slideTitle: 'Inspiring Vision',
        slideContent: 'Our future goals',
        slideLayout: 'title',
        presentationStyle: 'creative',
        imageStyle: 'artistic',
        mood: 'inspirational and hopeful',
      });

      expect(result.success).toBe(true);
      const data = result.data as { prompt: string };
      expect(data.prompt).toContain('inspirational and hopeful');
    });

    it('should add layout-specific additions for title layout', () => {
      const result = executeSlideImagePromptGenerate({
        slideTitle: 'Welcome',
        slideContent: 'Introduction to our company',
        slideLayout: 'title',
        presentationStyle: 'professional',
        imageStyle: 'corporate',
      });

      expect(result.success).toBe(true);
      const data = result.data as { prompt: string };
      expect(data.prompt).toContain('hero image');
    });

    it('should add layout-specific additions for full-image layout', () => {
      const result = executeSlideImagePromptGenerate({
        slideTitle: 'Background',
        slideContent: 'Full screen visual',
        slideLayout: 'full-image',
        presentationStyle: 'creative',
        imageStyle: 'photorealistic',
      });

      expect(result.success).toBe(true);
      const data = result.data as { prompt: string };
      expect(data.prompt).toContain('hero image');
    });

    it('should add layout-specific additions for image-left layout', () => {
      const result = executeSlideImagePromptGenerate({
        slideTitle: 'Feature',
        slideContent: 'Product feature description',
        slideLayout: 'image-left',
        presentationStyle: 'professional',
        imageStyle: 'corporate',
      });

      expect(result.success).toBe(true);
      const data = result.data as { prompt: string };
      expect(data.prompt).toContain('side panel');
    });

    it('should add layout-specific additions for comparison layout', () => {
      const result = executeSlideImagePromptGenerate({
        slideTitle: 'Before vs After',
        slideContent: 'Comparison of results',
        slideLayout: 'comparison',
        presentationStyle: 'professional',
        imageStyle: 'corporate',
      });

      expect(result.success).toBe(true);
      const data = result.data as { prompt: string };
      expect(data.prompt).toContain('split composition');
    });

    it('should add layout-specific additions for quote layout', () => {
      const result = executeSlideImagePromptGenerate({
        slideTitle: 'Inspiration',
        slideContent: 'A famous quote',
        slideLayout: 'quote',
        presentationStyle: 'creative',
        imageStyle: 'artistic',
      });

      expect(result.success).toBe(true);
      const data = result.data as { prompt: string };
      expect(data.prompt).toContain('atmospheric background');
    });

    it('should include recommendations in result', () => {
      const result = executeSlideImagePromptGenerate({
        slideTitle: 'Test',
        slideContent: 'Test content',
        slideLayout: 'title-content',
        presentationStyle: 'professional',
        imageStyle: 'corporate',
      });

      expect(result.success).toBe(true);
      const data = result.data as { recommendations: { aspectRatio: string; size: string; quality: string } };
      expect(data.recommendations).toBeDefined();
      expect(data.recommendations.aspectRatio).toBe('16:9');
      expect(data.recommendations.size).toBe('1792x1024');
      expect(data.recommendations.quality).toBe('standard');
    });

    it('should handle all image styles', () => {
      const styles = [
        'photorealistic', 'illustration', 'minimalist', 'corporate',
        'artistic', 'infographic', 'icon-based', 'abstract', 'diagram', '3d-render'
      ];

      for (const style of styles) {
        const result = executeSlideImagePromptGenerate({
          slideTitle: 'Test',
          slideContent: 'Content',
          slideLayout: 'title-content',
          presentationStyle: 'professional',
          imageStyle: style as 'corporate',
        });

        expect(result.success).toBe(true);
        const data = result.data as { style: string };
        expect(data.style).toBe(style);
      }
    });

    it('should generate different prompts for different styles', () => {
      const corporateResult = executeSlideImagePromptGenerate({
        slideTitle: 'Same Title',
        slideContent: 'Same content',
        slideLayout: 'title-content',
        presentationStyle: 'professional',
        imageStyle: 'corporate',
      });

      const artisticResult = executeSlideImagePromptGenerate({
        slideTitle: 'Same Title',
        slideContent: 'Same content',
        slideLayout: 'title-content',
        presentationStyle: 'professional',
        imageStyle: 'artistic',
      });

      const corporateData = corporateResult.data as { prompt: string };
      const artisticData = artisticResult.data as { prompt: string };

      expect(corporateData.prompt).not.toBe(artisticData.prompt);
    });
  });

  describe('Image Style Configurations', () => {
    it('should have negative prompts for all styles', () => {
      const styles = [
        'photorealistic', 'illustration', 'minimalist', 'corporate',
        'artistic', 'infographic', 'icon-based', 'abstract', 'diagram', '3d-render'
      ];

      for (const style of styles) {
        const result = executeSlideImagePromptGenerate({
          slideTitle: 'Test',
          slideContent: 'Content',
          slideLayout: 'title-content',
          presentationStyle: 'professional',
          imageStyle: style as 'corporate',
        });

        const data = result.data as { negativePrompt: string };
        expect(data.negativePrompt).toBeDefined();
        expect(data.negativePrompt.length).toBeGreaterThan(0);
      }
    });
  });
});
