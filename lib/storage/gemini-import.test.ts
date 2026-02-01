/**
 * Gemini Import Tests
 */

import {
  isGeminiFormat,
  GeminiImporter,
  parseGeminiExport,
  previewGeminiImport,
} from './gemini-import';
import type {
  GeminiTakeoutExport,
  GeminiSimpleExport,
  GeminiAIStudioExport,
} from '@/types/import/gemini';

describe('Gemini Import', () => {
  const mockTakeoutExport: GeminiTakeoutExport = {
    conversations: [
      {
        id: 'gemini-conv-123',
        title: 'Travel Planning',
        create_time: '2024-01-15T10:00:00Z',
        update_time: '2024-01-15T10:30:00Z',
        messages: [
          {
            role: 'user',
            content: 'Plan a 5-day trip to Tokyo',
            timestamp: '2024-01-15T10:00:00Z',
          },
          {
            role: 'model',
            content:
              "Here's a suggested 5-day Tokyo itinerary:\n\nDay 1: Arrival and Shibuya\nDay 2: Traditional Tokyo - Senso-ji and Asakusa\nDay 3: Modern Tokyo - Akihabara and Harajuku\nDay 4: Day trip to Nikko\nDay 5: Shopping and departure",
            timestamp: '2024-01-15T10:00:15Z',
            metadata: {
              model_version: 'gemini-pro',
            },
          },
        ],
      },
      {
        id: 'gemini-conv-456',
        title: 'Code Review',
        create_time: '2024-01-16T14:00:00Z',
        update_time: '2024-01-16T14:15:00Z',
        messages: [
          {
            role: 'user',
            content: 'Review this Python function',
            timestamp: '2024-01-16T14:00:00Z',
          },
          {
            role: 'model',
            content: 'The function looks good, but here are some suggestions...',
            timestamp: '2024-01-16T14:00:30Z',
          },
        ],
      },
    ],
  };

  const mockSimpleExport: GeminiSimpleExport = {
    title: 'Simple Gemini Chat',
    exported_at: '2024-01-15T12:00:00Z',
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: 'What is quantum computing?' }],
      },
      {
        role: 'model',
        content: [
          {
            type: 'text',
            text: 'Quantum computing uses quantum mechanics principles to process information.',
          },
        ],
      },
    ],
  };

  const mockAIStudioExport: GeminiAIStudioExport = {
    model: 'gemini-1.5-pro',
    temperature: 0.7,
    messages: [
      {
        role: 'user',
        parts: [{ text: 'Explain recursion' }],
      },
      {
        role: 'model',
        parts: [
          {
            text: 'Recursion is a programming technique where a function calls itself.',
          },
        ],
      },
    ],
  };

  describe('isGeminiFormat', () => {
    it('should detect valid Takeout format', () => {
      expect(isGeminiFormat(mockTakeoutExport)).toBe(true);
    });

    it('should detect valid simple export format', () => {
      expect(isGeminiFormat(mockSimpleExport)).toBe(true);
    });

    it('should detect valid AI Studio format', () => {
      expect(isGeminiFormat(mockAIStudioExport)).toBe(true);
    });

    it('should reject ChatGPT format', () => {
      const chatGPTData = [
        {
          id: 'conv-1',
          title: 'Test',
          create_time: 1704067200,
          update_time: 1704070800,
          mapping: {},
          current_node: 'node-1',
        },
      ];
      expect(isGeminiFormat(chatGPTData)).toBe(false);
    });

    it('should reject null and undefined', () => {
      expect(isGeminiFormat(null)).toBe(false);
      expect(isGeminiFormat(undefined)).toBe(false);
    });

    it('should reject empty objects', () => {
      expect(isGeminiFormat({})).toBe(false);
    });
  });

  describe('GeminiImporter', () => {
    const importer = new GeminiImporter();

    it('should return correct format', () => {
      expect(importer.getFormat()).toBe('gemini');
    });

    it('should return correct provider info', () => {
      const info = importer.getProviderInfo();
      expect(info.name).toBe('google');
      expect(info.defaultModel).toBe('gemini-pro');
    });

    it('should detect all Gemini formats', () => {
      expect(importer.detect(mockTakeoutExport)).toBe(true);
      expect(importer.detect(mockSimpleExport)).toBe(true);
      expect(importer.detect(mockAIStudioExport)).toBe(true);
    });

    it('should parse Takeout export correctly', async () => {
      const result = await importer.parse(mockTakeoutExport, {
        mergeStrategy: 'merge',
        generateNewIds: true,
        preserveTimestamps: true,
        defaultProvider: 'google',
        defaultModel: 'gemini-pro',
        defaultMode: 'chat',
      });

      expect(result.errors).toHaveLength(0);
      expect(result.conversations).toHaveLength(2);

      const conv1 = result.conversations[0];
      expect(conv1.session.title).toBe('Travel Planning');
      expect(conv1.messages).toHaveLength(2);
      expect(conv1.messages[0].role).toBe('user');
      expect(conv1.messages[1].role).toBe('assistant');
    });

    it('should parse simple export correctly', async () => {
      const result = await importer.parse(mockSimpleExport, {
        mergeStrategy: 'merge',
        generateNewIds: true,
        preserveTimestamps: true,
        defaultProvider: 'google',
        defaultModel: 'gemini-pro',
        defaultMode: 'chat',
      });

      expect(result.errors).toHaveLength(0);
      expect(result.conversations).toHaveLength(1);

      const conv = result.conversations[0];
      expect(conv.session.title).toBe('Simple Gemini Chat');
      expect(conv.messages).toHaveLength(2);
    });

    it('should parse AI Studio export correctly', async () => {
      const result = await importer.parse(mockAIStudioExport, {
        mergeStrategy: 'merge',
        generateNewIds: true,
        preserveTimestamps: true,
        defaultProvider: 'google',
        defaultModel: 'gemini-pro',
        defaultMode: 'chat',
      });

      expect(result.errors).toHaveLength(0);
      expect(result.conversations).toHaveLength(1);

      const conv = result.conversations[0];
      expect(conv.session.model).toBe('gemini-1.5-pro');
      expect(conv.messages).toHaveLength(2);
    });

    it('should map model role to assistant', async () => {
      const result = await importer.parse(mockTakeoutExport, {
        mergeStrategy: 'merge',
        generateNewIds: true,
        preserveTimestamps: true,
        defaultProvider: 'google',
        defaultModel: 'gemini-pro',
        defaultMode: 'chat',
      });

      const messages = result.conversations[0].messages;
      expect(messages[1].role).toBe('assistant');
    });
  });

  describe('parseGeminiExport', () => {
    it('should parse valid JSON content', async () => {
      const content = JSON.stringify(mockTakeoutExport);
      const result = await parseGeminiExport(content);

      expect(result.errors).toHaveLength(0);
      expect(result.conversations).toHaveLength(2);
    });

    it('should return error for invalid JSON', async () => {
      const result = await parseGeminiExport('not valid json');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Invalid JSON format');
      expect(result.conversations).toHaveLength(0);
    });

    it('should return error for non-Gemini format', async () => {
      const claudeContent = JSON.stringify({
        meta: { title: 'Test', exported_at: '2024-01-01' },
        chats: [],
      });
      const result = await parseGeminiExport(claudeContent);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Not a valid Gemini export format');
    });
  });

  describe('previewGeminiImport', () => {
    it('should generate preview for Takeout export', async () => {
      const content = JSON.stringify(mockTakeoutExport);
      const result = await previewGeminiImport(content);

      expect(result.errors).toHaveLength(0);
      expect(result.conversations).toHaveLength(2);
      expect(result.totalMessages).toBe(4);

      expect(result.conversations[0].title).toBe('Travel Planning');
      expect(result.conversations[0].messageCount).toBe(2);
      expect(result.conversations[1].title).toBe('Code Review');
    });

    it('should return error for invalid content', async () => {
      const result = await previewGeminiImport('invalid');

      expect(result.errors).toHaveLength(1);
      expect(result.conversations).toHaveLength(0);
      expect(result.totalMessages).toBe(0);
    });
  });

  describe('Content handling', () => {
    it('should handle empty conversations in Takeout', async () => {
      const emptyExport: GeminiTakeoutExport = {
        conversations: [],
      };

      const importer = new GeminiImporter();
      const result = await importer.parse(emptyExport, {
        mergeStrategy: 'merge',
        generateNewIds: true,
        preserveTimestamps: true,
        defaultProvider: 'google',
        defaultModel: 'gemini-pro',
        defaultMode: 'chat',
      });

      expect(result.conversations).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle code content in simple format', async () => {
      const codeExport: GeminiSimpleExport = {
        messages: [
          {
            role: 'model',
            content: [
              {
                type: 'code',
                text: 'console.log("hello")',
                language: 'javascript',
              },
            ],
          },
        ],
      };

      const importer = new GeminiImporter();
      const result = await importer.parse(codeExport, {
        mergeStrategy: 'merge',
        generateNewIds: true,
        preserveTimestamps: true,
        defaultProvider: 'google',
        defaultModel: 'gemini-pro',
        defaultMode: 'chat',
      });

      const content = result.conversations[0].messages[0].content;
      expect(content).toContain('```javascript');
      expect(content).toContain('console.log');
    });

    it('should preserve model version from metadata', async () => {
      const result = await parseGeminiExport(JSON.stringify(mockTakeoutExport));

      const model = result.conversations[0].messages[1].model;
      expect(model).toBe('gemini-pro');
    });
  });

  describe('isGeminiFormat - edge cases', () => {
    it('should return false for array with non-object items', () => {
      expect(isGeminiFormat(['string', 123, null])).toBe(false);
    });

    it('should return false for object missing conversations and messages', () => {
      expect(isGeminiFormat({ random: 'data' })).toBe(false);
    });

    it('should return true for minimal valid Takeout format', () => {
      const minimal: GeminiTakeoutExport = {
        conversations: [],
      };
      expect(isGeminiFormat(minimal)).toBe(true);
    });

    it('should return true for minimal valid simple format', () => {
      const minimal: GeminiSimpleExport = {
        messages: [],
      };
      expect(isGeminiFormat(minimal)).toBe(true);
    });

    it('should return true for minimal valid AI Studio format', () => {
      const minimal: GeminiAIStudioExport = {
        model: 'gemini-pro',
        messages: [],
      };
      expect(isGeminiFormat(minimal)).toBe(true);
    });
  });

  describe('parseGeminiExport - edge cases', () => {
    it('should handle empty conversations array', async () => {
      const emptyExport: GeminiTakeoutExport = {
        conversations: [],
      };
      const result = await parseGeminiExport(JSON.stringify(emptyExport));

      expect(result.conversations).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle whitespace-only content', async () => {
      const result = await parseGeminiExport('   \n\t  ');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Invalid JSON format');
    });

    it('should handle very long content gracefully', async () => {
      const longContent = 'A'.repeat(10000);
      const exportData: GeminiTakeoutExport = {
        conversations: [
          {
            id: 'long-conv',
            title: 'Long Content',
            create_time: '2024-01-01T00:00:00Z',
            update_time: '2024-01-01T00:00:00Z',
            messages: [
              {
                role: 'user',
                content: longContent,
                timestamp: '2024-01-01T00:00:00Z',
              },
            ],
          },
        ],
      };

      const result = await parseGeminiExport(JSON.stringify(exportData));

      expect(result.conversations).toHaveLength(1);
      expect(result.conversations[0].messages[0].content).toBe(longContent);
    });

    it('should preserve conversation order', async () => {
      const data: GeminiTakeoutExport = {
        conversations: [
          {
            id: 'first',
            title: 'First',
            create_time: '2024-01-01',
            update_time: '2024-01-01',
            messages: [],
          },
          {
            id: 'second',
            title: 'Second',
            create_time: '2024-01-02',
            update_time: '2024-01-02',
            messages: [],
          },
          {
            id: 'third',
            title: 'Third',
            create_time: '2024-01-03',
            update_time: '2024-01-03',
            messages: [],
          },
        ],
      };
      const result = await parseGeminiExport(JSON.stringify(data));

      expect(result.conversations[0].session.title).toBe('First');
      expect(result.conversations[1].session.title).toBe('Second');
      expect(result.conversations[2].session.title).toBe('Third');
    });
  });

  describe('GeminiImporter - edge cases', () => {
    const importer = new GeminiImporter();
    const defaultOptions = {
      mergeStrategy: 'merge' as const,
      generateNewIds: true,
      preserveTimestamps: true,
      defaultProvider: 'google',
      defaultModel: 'gemini-pro',
      defaultMode: 'chat' as const,
    };

    it('should use default title for conversations without title', async () => {
      const exportData: GeminiTakeoutExport = {
        conversations: [
          {
            id: 'no-title',
            title: '',
            create_time: '2024-01-01',
            update_time: '2024-01-01',
            messages: [
              { role: 'user', content: 'Hello', timestamp: '2024-01-01' },
            ],
          },
        ],
      };

      const result = await importer.parse(exportData, defaultOptions);
      expect(result.conversations[0].session.title).toBe('Imported Gemini Chat');
    });

    it('should use current timestamps when preserveTimestamps is false', async () => {
      const before = Date.now();
      const result = await importer.parse(mockTakeoutExport, {
        ...defaultOptions,
        preserveTimestamps: false,
      });
      const after = Date.now();

      const createdTime = result.conversations[0].session.createdAt.getTime();
      expect(createdTime).toBeGreaterThanOrEqual(before);
      expect(createdTime).toBeLessThanOrEqual(after);
    });

    it('should filter out empty messages', async () => {
      const exportData: GeminiTakeoutExport = {
        conversations: [
          {
            id: 'empty-msgs',
            title: 'Empty Messages',
            create_time: '2024-01-01',
            update_time: '2024-01-01',
            messages: [
              { role: 'user', content: '', timestamp: '2024-01-01' },
              { role: 'user', content: 'Valid message', timestamp: '2024-01-01' },
            ],
          },
        ],
      };

      const result = await importer.parse(exportData, defaultOptions);
      expect(result.conversations[0].messages).toHaveLength(1);
      expect(result.conversations[0].messages[0].content).toBe('Valid message');
    });

    it('should set correct session metadata', async () => {
      const result = await importer.parse(mockTakeoutExport, defaultOptions);
      const session = result.conversations[0].session;

      expect(session.provider).toBe('google');
      expect(session.model).toBe('gemini-pro');
      expect(session.mode).toBe('chat');
    });

    it('should handle AI Studio format with temperature', async () => {
      const result = await importer.parse(mockAIStudioExport, defaultOptions);
      const session = result.conversations[0].session;

      expect(session.model).toBe('gemini-1.5-pro');
    });

    it('should keep original IDs when generateNewIds is false', async () => {
      const result = await importer.parse(mockTakeoutExport, {
        ...defaultOptions,
        generateNewIds: false,
      });

      expect(result.conversations[0].session.id).toBe('gemini-conv-123');
    });
  });

  describe('previewGeminiImport - edge cases', () => {
    it('should include preview text from first message', async () => {
      const result = await previewGeminiImport(JSON.stringify(mockTakeoutExport));

      expect(result.conversations[0].preview).toContain('Plan a 5-day trip');
    });

    it('should truncate long preview text', async () => {
      const longMessage = 'A'.repeat(200);
      const exportData: GeminiTakeoutExport = {
        conversations: [
          {
            id: 'long',
            title: 'Long Preview',
            create_time: '2024-01-01',
            update_time: '2024-01-01',
            messages: [
              { role: 'user', content: longMessage, timestamp: '2024-01-01' },
            ],
          },
        ],
      };

      const result = await previewGeminiImport(JSON.stringify(exportData));

      expect(result.conversations[0].preview.length).toBeLessThanOrEqual(150);
    });

    it('should calculate total messages correctly', async () => {
      const result = await previewGeminiImport(JSON.stringify(mockTakeoutExport));

      // mockTakeoutExport has 2 conversations with 2 messages each = 4 total
      expect(result.totalMessages).toBe(4);
    });

    it('should handle empty preview for conversations without messages', async () => {
      const exportData: GeminiTakeoutExport = {
        conversations: [
          {
            id: 'empty',
            title: 'Empty Conv',
            create_time: '2024-01-01',
            update_time: '2024-01-01',
            messages: [],
          },
        ],
      };

      const result = await previewGeminiImport(JSON.stringify(exportData));

      expect(result.conversations[0].preview).toBe('');
      expect(result.conversations[0].messageCount).toBe(0);
    });
  });
});
