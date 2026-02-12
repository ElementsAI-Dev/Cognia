/**
 * Tests for Preset AI Service
 */

import { generatePresetFromDescription, optimizePresetPrompt, generateBuiltinPrompts } from './preset-ai-service';
import type { PresetAIServiceConfig } from './preset-ai-service';

// Mock the AI SDK
const mockGenerateText = jest.fn();
jest.mock('ai', () => ({
  generateText: (opts: unknown) => mockGenerateText(opts),
}));

// Mock the provider model
jest.mock('../core/client', () => ({
  getProviderModel: jest.fn(() => 'mock-model'),
}));

// Mock the prompt optimizer
const mockDetectLanguage = jest.fn((_text: unknown) => 'en');
jest.mock('../prompts/prompt-optimizer', () => ({
  detectPromptLanguage: (text: unknown) => mockDetectLanguage(text),
}));

const mockConfig: PresetAIServiceConfig = {
  provider: 'openai',
  apiKey: 'test-key',
  baseURL: 'https://api.openai.com',
};

describe('preset-ai-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generatePresetFromDescription', () => {
    it('should generate a preset from description', async () => {
      const mockPreset = {
        name: 'Code Helper',
        description: 'Helps with coding tasks',
        icon: '💻',
        color: '#6366f1',
        mode: 'agent',
        systemPrompt: 'You are an expert programmer.',
        temperature: 0.5,
        webSearchEnabled: false,
        thinkingEnabled: true,
        builtinPrompts: [
          { name: 'Review Code', content: 'Review this code', description: 'Code review' },
        ],
        category: 'coding',
      };

      mockGenerateText.mockResolvedValueOnce({
        text: JSON.stringify(mockPreset),
      });

      const result = await generatePresetFromDescription('A coding assistant', mockConfig);

      expect(result.success).toBe(true);
      expect(result.preset).toBeDefined();
      expect(result.preset!.name).toBe('Code Helper');
      expect(result.preset!.mode).toBe('agent');
      expect(result.preset!.category).toBe('coding');
      expect(result.preset!.temperature).toBe(0.5);
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
    });

    it('should handle JSON wrapped in markdown code blocks', async () => {
      const mockPreset = {
        name: 'Writer',
        description: 'Creative writing assistant',
        icon: '📝',
        color: '#8b5cf6',
        mode: 'chat',
        systemPrompt: 'You are a creative writer.',
        temperature: 0.9,
        webSearchEnabled: false,
        thinkingEnabled: false,
        category: 'writing',
      };

      mockGenerateText.mockResolvedValueOnce({
        text: '```json\n' + JSON.stringify(mockPreset) + '\n```',
      });

      const result = await generatePresetFromDescription('A creative writer', mockConfig);

      expect(result.success).toBe(true);
      expect(result.preset!.name).toBe('Writer');
    });

    it('should sanitize invalid icon', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: JSON.stringify({
          name: 'Test',
          description: 'Test',
          icon: '🦄', // Not in allowed list
          color: '#6366f1',
          mode: 'chat',
          systemPrompt: 'Test',
          temperature: 0.7,
          webSearchEnabled: false,
          thinkingEnabled: false,
        }),
      });

      const result = await generatePresetFromDescription('test', mockConfig);

      expect(result.success).toBe(true);
      expect(result.preset!.icon).toBe('✨'); // Fallback
    });

    it('should sanitize invalid color', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: JSON.stringify({
          name: 'Test',
          description: 'Test',
          icon: '💬',
          color: '#999999', // Not in allowed list
          mode: 'chat',
          systemPrompt: 'Test',
          temperature: 0.7,
          webSearchEnabled: false,
          thinkingEnabled: false,
        }),
      });

      const result = await generatePresetFromDescription('test', mockConfig);

      expect(result.success).toBe(true);
      expect(result.preset!.color).toBe('#6366f1'); // Fallback
    });

    it('should sanitize invalid mode', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: JSON.stringify({
          name: 'Test',
          description: 'Test',
          icon: '💬',
          color: '#6366f1',
          mode: 'invalid',
          systemPrompt: 'Test',
          temperature: 0.7,
          webSearchEnabled: false,
          thinkingEnabled: false,
        }),
      });

      const result = await generatePresetFromDescription('test', mockConfig);

      expect(result.success).toBe(true);
      expect(result.preset!.mode).toBe('chat'); // Fallback
    });

    it('should clamp temperature to valid range', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: JSON.stringify({
          name: 'Test',
          description: 'Test',
          icon: '💬',
          color: '#6366f1',
          mode: 'chat',
          systemPrompt: 'Test',
          temperature: 5.0,
          webSearchEnabled: false,
          thinkingEnabled: false,
        }),
      });

      const result = await generatePresetFromDescription('test', mockConfig);

      expect(result.success).toBe(true);
      expect(result.preset!.temperature).toBe(2);
    });

    it('should handle Chinese description with language detection', async () => {
      mockDetectLanguage.mockReturnValueOnce('zh');

      mockGenerateText.mockResolvedValueOnce({
        text: JSON.stringify({
          name: '代码助手',
          description: '帮助编程',
          icon: '💻',
          color: '#6366f1',
          mode: 'chat',
          systemPrompt: '你是一个编程助手。',
          temperature: 0.7,
          webSearchEnabled: false,
          thinkingEnabled: false,
        }),
      });

      const result = await generatePresetFromDescription('一个编程助手', mockConfig);

      expect(result.success).toBe(true);
      expect(result.preset!.name).toBe('代码助手');
      // Verify the system prompt includes Chinese instruction
      const callArgs = mockGenerateText.mock.calls[0][0];
      expect(callArgs.system).toContain('Chinese');
    });

    it('should return error on API failure', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('API rate limit exceeded'));

      const result = await generatePresetFromDescription('test', mockConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBe('API rate limit exceeded');
      expect(result.preset).toBeUndefined();
    });

    it('should return error on invalid JSON response', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: 'This is not valid JSON',
      });

      const result = await generatePresetFromDescription('test', mockConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('optimizePresetPrompt', () => {
    it('should optimize a system prompt', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: 'You are an expert AI assistant specializing in code review. Provide clear, actionable feedback.',
      });

      const result = await optimizePresetPrompt('You help with code', mockConfig);

      expect(result.success).toBe(true);
      expect(result.optimizedPrompt).toContain('expert AI assistant');
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
    });

    it('should trim whitespace from optimized prompt', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: '  Optimized prompt with spaces  ',
      });

      const result = await optimizePresetPrompt('original prompt', mockConfig);

      expect(result.success).toBe(true);
      expect(result.optimizedPrompt).toBe('Optimized prompt with spaces');
    });

    it('should handle Chinese prompts', async () => {
      mockDetectLanguage.mockReturnValueOnce('zh');

      mockGenerateText.mockResolvedValueOnce({
        text: '你是一个专业的编程助手，擅长代码审查。',
      });

      const result = await optimizePresetPrompt('你帮助写代码', mockConfig);

      expect(result.success).toBe(true);
      const callArgs = mockGenerateText.mock.calls[0][0];
      expect(callArgs.system).toContain('Chinese');
    });

    it('should return error on failure', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('Network error'));

      const result = await optimizePresetPrompt('test prompt', mockConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(result.optimizedPrompt).toBeUndefined();
    });
  });

  describe('generateBuiltinPrompts', () => {
    it('should generate builtin prompts for a preset', async () => {
      const mockPrompts = [
        { name: 'Review Code', content: 'Review this code for bugs', description: 'Code review' },
        { name: 'Explain Code', content: 'Explain this code', description: 'Code explanation' },
        { name: 'Refactor', content: 'Refactor this code', description: 'Code refactoring' },
      ];

      mockGenerateText.mockResolvedValueOnce({
        text: JSON.stringify(mockPrompts),
      });

      const result = await generateBuiltinPrompts(
        'Code Assistant',
        'Helps with coding',
        'You are a programmer',
        [],
        mockConfig,
        3
      );

      expect(result.success).toBe(true);
      expect(result.prompts).toHaveLength(3);
      expect(result.prompts![0].name).toBe('Review Code');
    });

    it('should handle enhance mode with existing prompts', async () => {
      const existingPrompts = [
        { name: 'Existing', content: 'Existing prompt' },
      ];

      mockGenerateText.mockResolvedValueOnce({
        text: JSON.stringify([
          { name: 'New Prompt', content: 'New content', description: 'New' },
        ]),
      });

      const result = await generateBuiltinPrompts(
        'Test Preset',
        undefined,
        undefined,
        existingPrompts,
        mockConfig,
        1
      );

      expect(result.success).toBe(true);
      expect(result.prompts).toHaveLength(1);
      // Verify the prompt mentions existing prompts
      const callArgs = mockGenerateText.mock.calls[0][0];
      expect(callArgs.prompt).toContain('Existing');
      expect(callArgs.system).toContain('additional');
    });

    it('should handle markdown-wrapped JSON response', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: '```json\n[{"name":"Test","content":"Test content","description":"Desc"}]\n```',
      });

      const result = await generateBuiltinPrompts('Test', undefined, undefined, [], mockConfig, 1);

      expect(result.success).toBe(true);
      expect(result.prompts).toHaveLength(1);
    });

    it('should return error for non-array response', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: JSON.stringify({ name: 'Not an array' }),
      });

      const result = await generateBuiltinPrompts('Test', undefined, undefined, [], mockConfig, 1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid response format');
    });

    it('should return error on API failure', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('Timeout'));

      const result = await generateBuiltinPrompts('Test', undefined, undefined, [], mockConfig, 1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Timeout');
    });

    it('should pass preset context to the AI', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: JSON.stringify([{ name: 'P', content: 'C', description: 'D' }]),
      });

      await generateBuiltinPrompts(
        'Research Bot',
        'Deep research assistant',
        'You are a researcher',
        [],
        mockConfig,
        1
      );

      const callArgs = mockGenerateText.mock.calls[0][0];
      expect(callArgs.prompt).toContain('Research Bot');
      expect(callArgs.prompt).toContain('Deep research assistant');
      expect(callArgs.prompt).toContain('You are a researcher');
    });
  });
});
