/**
 * Tests for summary-prompts
 */

import {
  buildSummaryPrompt,
  buildKeyPointExtractionPrompt,
  buildTopicIdentificationPrompt,
  detectConversationLanguage,
  SUMMARY_STYLE_CONFIGS,
  SUMMARY_TEMPLATES,
} from './summary-prompts';
import type { UIMessage } from '@/types/message';

const createMockMessage = (content: string, role: 'user' | 'assistant' = 'user'): UIMessage => ({
  id: `msg-${Math.random()}`,
  role,
  content,
  createdAt: new Date(),
});

describe('summary-prompts', () => {
  describe('buildSummaryPrompt', () => {
    const messages: UIMessage[] = [
      createMockMessage('How do I sort an array in JavaScript?', 'user'),
      createMockMessage('You can use the sort() method. Here is an example:\n```js\nconst arr = [3, 1, 2];\narr.sort();\n```', 'assistant'),
    ];

    it('should build a prompt with brief format', () => {
      const prompt = buildSummaryPrompt({
        messages,
        format: 'brief',
      });
      
      expect(prompt).toContain('brief');
      expect(prompt).toContain('User');
      expect(prompt).toContain('Assistant');
    });

    it('should build a prompt with bullets format', () => {
      const prompt = buildSummaryPrompt({
        messages,
        format: 'bullets',
      });
      
      expect(prompt).toContain('bullet');
    });

    it('should build a prompt with structured format', () => {
      const prompt = buildSummaryPrompt({
        messages,
        format: 'structured',
      });
      
      expect(prompt).toContain('structured');
      expect(prompt).toContain('Overview');
    });

    it('should include session title when provided', () => {
      const prompt = buildSummaryPrompt({
        messages,
        format: 'detailed',
        sessionTitle: 'JavaScript Array Sorting',
      });
      
      expect(prompt).toContain('JavaScript Array Sorting');
    });

    it('should include language instruction when specified', () => {
      const prompt = buildSummaryPrompt({
        messages,
        format: 'detailed',
        language: 'Chinese',
      });
      
      expect(prompt).toContain('Chinese');
    });

    it('should include max length instruction when specified', () => {
      const prompt = buildSummaryPrompt({
        messages,
        format: 'detailed',
        maxLength: 500,
      });
      
      expect(prompt).toContain('500');
    });

    it('should apply style instructions', () => {
      const prompt = buildSummaryPrompt({
        messages,
        format: 'detailed',
        style: 'professional',
      });
      
      expect(prompt).toContain(SUMMARY_STYLE_CONFIGS.professional.instructions);
    });

    it('should omit code blocks when includeCode is false', () => {
      const prompt = buildSummaryPrompt({
        messages,
        format: 'detailed',
        includeCode: false,
      });
      
      expect(prompt).toContain('[code block omitted]');
      expect(prompt).not.toContain('const arr =');
    });

    it('should include code blocks by default', () => {
      const prompt = buildSummaryPrompt({
        messages,
        format: 'detailed',
      });
      
      expect(prompt).toContain('const arr =');
    });
  });

  describe('buildKeyPointExtractionPrompt', () => {
    const messages: UIMessage[] = [
      createMockMessage('What is React?', 'user'),
      createMockMessage('React is a JavaScript library for building user interfaces.', 'assistant'),
    ];

    it('should build a key point extraction prompt', () => {
      const prompt = buildKeyPointExtractionPrompt({ messages });
      
      expect(prompt).toContain('key point');
      expect(prompt).toContain('JSON');
      expect(prompt).toContain('category');
      expect(prompt).toContain('importance');
    });

    it('should respect maxPoints parameter', () => {
      const prompt = buildKeyPointExtractionPrompt({
        messages,
        maxPoints: 5,
      });
      
      expect(prompt).toContain('5');
    });

    it('should include language instruction when specified', () => {
      const prompt = buildKeyPointExtractionPrompt({
        messages,
        language: 'Spanish',
      });
      
      expect(prompt).toContain('Spanish');
    });
  });

  describe('buildTopicIdentificationPrompt', () => {
    const messages: UIMessage[] = [
      createMockMessage('Tell me about React hooks', 'user'),
      createMockMessage('React hooks are functions that let you use state in functional components.', 'assistant'),
    ];

    it('should build a topic identification prompt', () => {
      const prompt = buildTopicIdentificationPrompt({ messages });
      
      expect(prompt).toContain('topic');
      expect(prompt).toContain('JSON');
      expect(prompt).toContain('keywords');
    });

    it('should respect maxTopics parameter', () => {
      const prompt = buildTopicIdentificationPrompt({
        messages,
        maxTopics: 3,
      });
      
      expect(prompt).toContain('3');
    });
  });

  describe('detectConversationLanguage', () => {
    it('should detect English text', () => {
      const messages: UIMessage[] = [
        createMockMessage('Hello, how are you doing today?'),
        createMockMessage('I am fine, thank you for asking.'),
      ];
      
      const language = detectConversationLanguage(messages);
      expect(language).toBe('English');
    });

    it('should detect Chinese text', () => {
      const messages: UIMessage[] = [
        createMockMessage('你好，今天怎么样？'),
        createMockMessage('我很好，谢谢你的关心。'),
      ];
      
      const language = detectConversationLanguage(messages);
      expect(language).toBe('Chinese');
    });

    it('should detect Japanese text', () => {
      const messages: UIMessage[] = [
        createMockMessage('こんにちは、元気ですか？'),
        createMockMessage('はい、元気です。'),
      ];
      
      const language = detectConversationLanguage(messages);
      expect(language).toBe('Japanese');
    });

    it('should detect Korean text', () => {
      const messages: UIMessage[] = [
        createMockMessage('안녕하세요, 어떻게 지내세요?'),
        createMockMessage('잘 지내고 있어요.'),
      ];
      
      const language = detectConversationLanguage(messages);
      expect(language).toBe('Korean');
    });

    it('should detect Spanish text', () => {
      const messages: UIMessage[] = [
        createMockMessage('Hola, ¿cómo estás? ¿Qué tal tu día?'),
        createMockMessage('Estoy bien, gracias por preguntar.'),
      ];
      
      const language = detectConversationLanguage(messages);
      expect(language).toBe('Spanish');
    });

    it('should detect French text', () => {
      const messages: UIMessage[] = [
        createMockMessage('Bonjour, comment allez-vous? Je suis une personne.'),
        createMockMessage('Je vais bien, merci de demander.'),
      ];
      
      const language = detectConversationLanguage(messages);
      expect(language).toBe('French');
    });
  });

  describe('SUMMARY_STYLE_CONFIGS', () => {
    it('should have all required styles', () => {
      expect(SUMMARY_STYLE_CONFIGS).toHaveProperty('professional');
      expect(SUMMARY_STYLE_CONFIGS).toHaveProperty('concise');
      expect(SUMMARY_STYLE_CONFIGS).toHaveProperty('detailed');
      expect(SUMMARY_STYLE_CONFIGS).toHaveProperty('academic');
      expect(SUMMARY_STYLE_CONFIGS).toHaveProperty('casual');
    });

    it('should have name, description, and instructions for each style', () => {
      Object.values(SUMMARY_STYLE_CONFIGS).forEach((config) => {
        expect(config).toHaveProperty('name');
        expect(config).toHaveProperty('description');
        expect(config).toHaveProperty('instructions');
        expect(typeof config.name).toBe('string');
        expect(typeof config.description).toBe('string');
        expect(typeof config.instructions).toBe('string');
      });
    });
  });

  describe('SUMMARY_TEMPLATES', () => {
    it('should have all required templates', () => {
      expect(SUMMARY_TEMPLATES).toHaveProperty('meeting');
      expect(SUMMARY_TEMPLATES).toHaveProperty('technical');
      expect(SUMMARY_TEMPLATES).toHaveProperty('learning');
      expect(SUMMARY_TEMPLATES).toHaveProperty('debugging');
    });

    it('should have name, description, and prompt for each template', () => {
      Object.values(SUMMARY_TEMPLATES).forEach((template) => {
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('prompt');
        expect(typeof template.name).toBe('string');
        expect(typeof template.description).toBe('string');
        expect(typeof template.prompt).toBe('string');
      });
    });
  });
});
