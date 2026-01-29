/**
 * AI Generator Tests
 */

jest.mock('ai', () => ({
  generateText: jest.fn(),
  generateObject: jest.fn(),
}));

jest.mock('@/lib/ai/core/client', () => ({
  getProviderModel: jest.fn(() => ({ id: 'mock-model' })),
}));

jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'mock-id-123'),
}));

import {
  generateComponent,
  generateComponentVariants,
  generateVariantFromCode,
  type StyleType,
} from './ai-generator';

import { generateText, generateObject } from 'ai';
import type { DesignerAIConfig } from './ai';

const mockConfig: DesignerAIConfig = {
  provider: 'openai',
  model: 'gpt-4',
  apiKey: 'test-api-key',
};

describe('AI Generator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (generateText as jest.Mock).mockResolvedValue({
      text: 'export default function App() { return <div>Hello</div>; }',
    });
    (generateObject as jest.Mock).mockResolvedValue({
      object: {
        variants: [
          {
            name: 'Variant 1',
            description: 'A minimal variant',
            code: 'export default function App() { return <div>Variant 1</div>; }',
            style: 'minimal',
            features: ['responsive', 'clean'],
          },
        ],
      },
    });
  });

  describe('generateComponent', () => {
    it('should generate a component with given style', async () => {
      const result = await generateComponent(
        'Create a button component',
        'modern',
        'react',
        mockConfig
      );

      expect(result.success).toBe(true);
      expect(result.variant).toBeDefined();
      expect(result.variant?.framework).toBe('react');
      expect(result.variant?.style).toBe('modern');
    });

    it('should return error when API key is missing', async () => {
      const configWithoutKey: DesignerAIConfig = {
        ...mockConfig,
        apiKey: undefined,
      };

      const result = await generateComponent(
        'Create a button',
        'minimal',
        'react',
        configWithoutKey
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No API key');
    });

    it('should allow ollama without API key', async () => {
      const ollamaConfig: DesignerAIConfig = {
        ...mockConfig,
        provider: 'ollama',
        apiKey: undefined,
      };

      const result = await generateComponent(
        'Create a button',
        'minimal',
        'react',
        ollamaConfig
      );

      expect(result.success).toBe(true);
    });

    it('should handle API errors gracefully', async () => {
      (generateText as jest.Mock).mockRejectedValue(new Error('API Error'));

      const result = await generateComponent(
        'Create a button',
        'modern',
        'react',
        mockConfig
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });

    it('should generate component with different styles', async () => {
      const styles: StyleType[] = ['minimal', 'modern', 'brutalist', 'glassmorphism', 'neomorphism', 'gradient'];

      for (const style of styles) {
        const result = await generateComponent(
          'Create a card component',
          style,
          'react',
          mockConfig
        );

        expect(result.success).toBe(true);
        expect(result.variant?.style).toBe(style);
      }
    });

    it('should assign unique ID to generated variant', async () => {
      const result = await generateComponent(
        'Create a button',
        'modern',
        'react',
        mockConfig
      );

      expect(result.variant?.id).toBeDefined();
      expect(result.variant?.id).toBe('mock-id-123');
    });
  });

  describe('generateComponentVariants', () => {
    it('should generate multiple variants', async () => {
      (generateObject as jest.Mock).mockResolvedValue({
        object: {
          variants: [
            {
              name: 'Variant 1',
              description: 'Minimal style',
              code: 'export default function App() { return <div>V1</div>; }',
              style: 'minimal',
              features: ['clean'],
            },
            {
              name: 'Variant 2',
              description: 'Modern style',
              code: 'export default function App() { return <div>V2</div>; }',
              style: 'modern',
              features: ['animated'],
            },
          ],
        },
      });

      const result = await generateComponentVariants(
        {
          description: 'Create a card component',
          variants: 2,
          styles: ['minimal', 'modern'],
        },
        mockConfig
      );

      expect(result.success).toBe(true);
      expect(result.variants).toHaveLength(2);
    });

    it('should return error when API key is missing', async () => {
      const configWithoutKey: DesignerAIConfig = {
        ...mockConfig,
        apiKey: undefined,
      };

      const result = await generateComponentVariants(
        { description: 'Create a card' },
        configWithoutKey
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No API key');
    });

    it('should handle empty variants result', async () => {
      (generateObject as jest.Mock).mockResolvedValue({
        object: { variants: [] },
      });

      const result = await generateComponentVariants(
        { description: 'Create a card' },
        mockConfig
      );

      expect(result.success).toBe(true);
      expect(result.variants).toHaveLength(0);
    });

    it('should handle API errors', async () => {
      (generateObject as jest.Mock).mockRejectedValue(new Error('Generation failed'));

      const result = await generateComponentVariants(
        { description: 'Create a card' },
        mockConfig
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Generation failed');
    });

    it('should assign framework to all variants', async () => {
      (generateObject as jest.Mock).mockResolvedValue({
        object: {
          variants: [
            {
              name: 'V1',
              description: 'D1',
              code: 'code1',
              style: 'minimal',
              features: [],
            },
          ],
        },
      });

      const result = await generateComponentVariants(
        { description: 'Create a card', framework: 'react' },
        mockConfig
      );

      expect(result.variants?.[0].framework).toBe('react');
    });
  });

  describe('generateVariantFromCode', () => {
    it('should generate variant from existing code', async () => {
      const result = await generateVariantFromCode(
        'export default function App() { return <div>Hello</div>; }',
        'modern',
        mockConfig
      );

      expect(result.success).toBe(true);
      expect(result.variant).toBeDefined();
      expect(result.variant?.style).toBe('modern');
    });

    it('should return error when API key is missing', async () => {
      const configWithoutKey: DesignerAIConfig = {
        ...mockConfig,
        apiKey: undefined,
      };

      const result = await generateVariantFromCode(
        'code',
        'minimal',
        configWithoutKey
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No API key');
    });

    it('should handle API errors', async () => {
      (generateText as jest.Mock).mockRejectedValue(new Error('Transform failed'));

      const result = await generateVariantFromCode(
        'code',
        'brutalist',
        mockConfig
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Transform failed');
    });
  });
});
