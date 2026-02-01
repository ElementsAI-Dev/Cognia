/**
 * Claude Import Tests
 */

import {
  isClaudeFormat,
  ClaudeImporter,
  parseClaudeExport,
  previewClaudeImport,
} from './claude-import';
import type { ClaudeExport, ClaudeSimpleExport } from '@/types/import/claude';

describe('Claude Import', () => {
  const mockStandardExport: ClaudeExport = {
    meta: {
      exported_at: '2024-01-15T10:00:00Z',
      title: 'Test Claude Conversation',
      conversation_id: 'claude-conv-123',
    },
    chats: [
      {
        index: 0,
        type: 'prompt',
        message: [
          { type: 'p', data: 'How do I implement a binary search in Python?' },
        ],
      },
      {
        index: 1,
        type: 'response',
        message: [
          { type: 'p', data: 'Here is how you can implement binary search:' },
          {
            type: 'pre',
            language: 'python',
            data: 'def binary_search(arr, target):\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1',
          },
        ],
      },
    ],
  };

  const mockSimpleExport: ClaudeSimpleExport = {
    title: 'Simple Claude Chat',
    timestamp: '2024-01-15T12:00:00Z',
    messages: [
      { role: 'human', content: 'What is machine learning?' },
      {
        role: 'assistant',
        content:
          'Machine learning is a subset of artificial intelligence that enables systems to learn from data.',
      },
    ],
  };

  describe('isClaudeFormat', () => {
    it('should detect valid standard Claude export format', () => {
      expect(isClaudeFormat(mockStandardExport)).toBe(true);
    });

    it('should detect valid simple Claude export format', () => {
      expect(isClaudeFormat(mockSimpleExport)).toBe(true);
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
      expect(isClaudeFormat(chatGPTData)).toBe(false);
    });

    it('should reject null and undefined', () => {
      expect(isClaudeFormat(null)).toBe(false);
      expect(isClaudeFormat(undefined)).toBe(false);
    });

    it('should reject empty objects', () => {
      expect(isClaudeFormat({})).toBe(false);
    });

    it('should reject arrays without proper structure', () => {
      expect(isClaudeFormat([])).toBe(false);
      expect(isClaudeFormat([1, 2, 3])).toBe(false);
    });
  });

  describe('ClaudeImporter', () => {
    const importer = new ClaudeImporter();

    it('should return correct format', () => {
      expect(importer.getFormat()).toBe('claude');
    });

    it('should return correct provider info', () => {
      const info = importer.getProviderInfo();
      expect(info.name).toBe('anthropic');
      expect(info.defaultModel).toBe('claude-3-opus');
    });

    it('should detect Claude format', () => {
      expect(importer.detect(mockStandardExport)).toBe(true);
      expect(importer.detect(mockSimpleExport)).toBe(true);
    });

    it('should parse standard export correctly', async () => {
      const result = await importer.parse(mockStandardExport, {
        mergeStrategy: 'merge',
        generateNewIds: true,
        preserveTimestamps: true,
        defaultProvider: 'anthropic',
        defaultModel: 'claude-3-opus',
        defaultMode: 'chat',
      });

      expect(result.errors).toHaveLength(0);
      expect(result.conversations).toHaveLength(1);

      const conv = result.conversations[0];
      expect(conv.session.title).toBe('Test Claude Conversation');
      expect(conv.messages).toHaveLength(2);
      expect(conv.messages[0].role).toBe('user');
      expect(conv.messages[1].role).toBe('assistant');
    });

    it('should parse simple export correctly', async () => {
      const result = await importer.parse(mockSimpleExport, {
        mergeStrategy: 'merge',
        generateNewIds: true,
        preserveTimestamps: true,
        defaultProvider: 'anthropic',
        defaultModel: 'claude-3-opus',
        defaultMode: 'chat',
      });

      expect(result.errors).toHaveLength(0);
      expect(result.conversations).toHaveLength(1);

      const conv = result.conversations[0];
      expect(conv.session.title).toBe('Simple Claude Chat');
      expect(conv.messages).toHaveLength(2);
    });

    it('should handle code blocks with language', async () => {
      const result = await importer.parse(mockStandardExport, {
        mergeStrategy: 'merge',
        generateNewIds: true,
        preserveTimestamps: true,
        defaultProvider: 'anthropic',
        defaultModel: 'claude-3-opus',
        defaultMode: 'chat',
      });

      const assistantMessage = result.conversations[0].messages[1];
      expect(assistantMessage.content).toContain('```python');
      expect(assistantMessage.content).toContain('def binary_search');
    });
  });

  describe('parseClaudeExport', () => {
    it('should parse valid JSON content', async () => {
      const content = JSON.stringify(mockStandardExport);
      const result = await parseClaudeExport(content);

      expect(result.errors).toHaveLength(0);
      expect(result.conversations).toHaveLength(1);
    });

    it('should return error for invalid JSON', async () => {
      const result = await parseClaudeExport('not valid json');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Invalid JSON format');
      expect(result.conversations).toHaveLength(0);
    });

    it('should return error for non-Claude format', async () => {
      const chatGPTContent = JSON.stringify([
        {
          id: 'conv-1',
          mapping: {},
          current_node: 'node-1',
          create_time: 123,
        },
      ]);
      const result = await parseClaudeExport(chatGPTContent);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Not a valid Claude export format');
    });
  });

  describe('previewClaudeImport', () => {
    it('should generate preview for valid export', async () => {
      const content = JSON.stringify(mockStandardExport);
      const result = await previewClaudeImport(content);

      expect(result.errors).toHaveLength(0);
      expect(result.conversations).toHaveLength(1);
      expect(result.totalMessages).toBe(2);

      const preview = result.conversations[0];
      expect(preview.title).toBe('Test Claude Conversation');
      expect(preview.messageCount).toBe(2);
    });

    it('should return error for invalid content', async () => {
      const result = await previewClaudeImport('invalid');

      expect(result.errors).toHaveLength(1);
      expect(result.conversations).toHaveLength(0);
      expect(result.totalMessages).toBe(0);
    });
  });

  describe('Content extraction', () => {
    it('should extract list content correctly', async () => {
      const exportWithList: ClaudeExport = {
        meta: { exported_at: '2024-01-15T10:00:00Z', title: 'List Test' },
        chats: [
          {
            index: 0,
            type: 'response',
            message: [
              {
                type: 'ul',
                data: 'Item 1\nItem 2\nItem 3',
              },
            ],
          },
        ],
      };

      const importer = new ClaudeImporter();
      const result = await importer.parse(exportWithList, {
        mergeStrategy: 'merge',
        generateNewIds: true,
        preserveTimestamps: true,
        defaultProvider: 'anthropic',
        defaultModel: 'claude-3-opus',
        defaultMode: 'chat',
      });

      const content = result.conversations[0].messages[0].content;
      expect(content).toContain('- Item 1');
      expect(content).toContain('- Item 2');
      expect(content).toContain('- Item 3');
    });

    it('should handle empty conversations', async () => {
      const emptyExport: ClaudeExport = {
        meta: { exported_at: '2024-01-15T10:00:00Z', title: 'Empty' },
        chats: [],
      };

      const importer = new ClaudeImporter();
      const result = await importer.parse(emptyExport, {
        mergeStrategy: 'merge',
        generateNewIds: true,
        preserveTimestamps: true,
        defaultProvider: 'anthropic',
        defaultModel: 'claude-3-opus',
        defaultMode: 'chat',
      });

      expect(result.conversations).toHaveLength(1);
      expect(result.conversations[0].messages).toHaveLength(0);
    });
  });

  describe('isClaudeFormat - edge cases', () => {
    it('should return false for array with non-object items', () => {
      expect(isClaudeFormat(['string', 123, null])).toBe(false);
    });

    it('should return false for object missing meta', () => {
      expect(isClaudeFormat({ chats: [] })).toBe(false);
    });

    it('should return false for object missing chats', () => {
      expect(isClaudeFormat({ meta: { title: 'x' } })).toBe(false);
    });

    it('should return true for minimal valid standard format', () => {
      const minimal = {
        meta: { exported_at: '2024-01-01' },
        chats: [],
      };
      expect(isClaudeFormat(minimal)).toBe(true);
    });

    it('should return true for minimal valid simple format', () => {
      const minimal: ClaudeSimpleExport = {
        messages: [
          { role: 'human', content: 'Hi' },
        ],
      };
      expect(isClaudeFormat(minimal)).toBe(true);
    });
  });

  describe('parseClaudeExport - edge cases', () => {
    it('should handle empty chats array', async () => {
      const emptyExport: ClaudeExport = {
        meta: { exported_at: '2024-01-01', title: 'Empty' },
        chats: [],
      };
      const result = await parseClaudeExport(JSON.stringify(emptyExport));

      expect(result.conversations).toHaveLength(1);
      expect(result.conversations[0].messages).toHaveLength(0);
    });

    it('should handle whitespace-only content', async () => {
      const result = await parseClaudeExport('   \n\t  ');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Invalid JSON format');
    });

    it('should handle very long content gracefully', async () => {
      const longContent = 'A'.repeat(10000);
      const exportData: ClaudeExport = {
        meta: { exported_at: '2024-01-01', title: 'Long' },
        chats: [
          {
            index: 0,
            type: 'prompt',
            message: [{ type: 'p', data: longContent }],
          },
        ],
      };

      const result = await parseClaudeExport(JSON.stringify(exportData));

      expect(result.conversations).toHaveLength(1);
      expect(result.conversations[0].messages[0].content).toBe(longContent);
    });
  });

  describe('ClaudeImporter - edge cases', () => {
    const importer = new ClaudeImporter();
    const defaultOptions = {
      mergeStrategy: 'merge' as const,
      generateNewIds: true,
      preserveTimestamps: true,
      defaultProvider: 'anthropic',
      defaultModel: 'claude-3-opus',
      defaultMode: 'chat' as const,
    };

    it('should use default title for conversations without title', async () => {
      const exportData: ClaudeExport = {
        meta: { exported_at: '2024-01-01', title: '' },
        chats: [
          {
            index: 0,
            type: 'prompt',
            message: [{ type: 'p', data: 'Hello' }],
          },
        ],
      };

      const result = await importer.parse(exportData, defaultOptions);
      expect(result.conversations[0].session.title).toBe('Imported Claude Chat');
    });

    it('should use current timestamps when preserveTimestamps is false', async () => {
      const before = Date.now();
      const result = await importer.parse(mockStandardExport, {
        ...defaultOptions,
        preserveTimestamps: false,
      });
      const after = Date.now();

      const createdTime = result.conversations[0].session.createdAt.getTime();
      expect(createdTime).toBeGreaterThanOrEqual(before);
      expect(createdTime).toBeLessThanOrEqual(after);
    });

    it('should handle ordered list content', async () => {
      const exportData: ClaudeExport = {
        meta: { exported_at: '2024-01-01', title: 'OL Test' },
        chats: [
          {
            index: 0,
            type: 'response',
            message: [
              { type: 'ol', data: 'First\nSecond\nThird' },
            ],
          },
        ],
      };

      const result = await importer.parse(exportData, defaultOptions);
      const content = result.conversations[0].messages[0].content;

      expect(content).toContain('1. First');
      expect(content).toContain('2. Second');
      expect(content).toContain('3. Third');
    });

    it('should handle table content', async () => {
      const exportData: ClaudeExport = {
        meta: { exported_at: '2024-01-01', title: 'Table Test' },
        chats: [
          {
            index: 0,
            type: 'response',
            message: [
              { type: 'table', data: 'Header1|Header2\nCell1|Cell2' },
            ],
          },
        ],
      };

      const result = await importer.parse(exportData, defaultOptions);
      const content = result.conversations[0].messages[0].content;

      expect(content).toContain('Header1');
      expect(content).toContain('Cell1');
    });

    it('should handle heading content', async () => {
      const exportData: ClaudeExport = {
        meta: { exported_at: '2024-01-01', title: 'Heading Test' },
        chats: [
          {
            index: 0,
            type: 'response',
            message: [
              { type: 'heading', data: 'Main Heading' },
              { type: 'p', data: 'Some paragraph content' },
            ],
          },
        ],
      };

      const result = await importer.parse(exportData, defaultOptions);
      const content = result.conversations[0].messages[0].content;

      expect(content).toContain('Main Heading');
      expect(content).toContain('Some paragraph content');
    });

    it('should filter out empty messages', async () => {
      const exportData: ClaudeExport = {
        meta: { exported_at: '2024-01-01', title: 'Empty Msg Test' },
        chats: [
          {
            index: 0,
            type: 'prompt',
            message: [{ type: 'p', data: '' }],
          },
          {
            index: 1,
            type: 'prompt',
            message: [{ type: 'p', data: 'Valid message' }],
          },
        ],
      };

      const result = await importer.parse(exportData, defaultOptions);
      expect(result.conversations[0].messages).toHaveLength(1);
      expect(result.conversations[0].messages[0].content).toBe('Valid message');
    });

    it('should set correct session metadata', async () => {
      const result = await importer.parse(mockStandardExport, defaultOptions);
      const session = result.conversations[0].session;

      expect(session.provider).toBe('anthropic');
      expect(session.model).toBe('claude-3-opus');
      expect(session.mode).toBe('chat');
      expect(session.messageCount).toBe(2);
    });
  });

  describe('previewClaudeImport - edge cases', () => {
    it('should include preview text from first message', async () => {
      const result = await previewClaudeImport(JSON.stringify(mockStandardExport));

      expect(result.conversations[0].preview).toContain('How do I implement');
    });

    it('should truncate long preview text', async () => {
      const longMessage = 'A'.repeat(200);
      const exportData: ClaudeExport = {
        meta: { exported_at: '2024-01-01', title: 'Long Preview' },
        chats: [
          {
            index: 0,
            type: 'prompt',
            message: [{ type: 'p', data: longMessage }],
          },
        ],
      };

      const result = await previewClaudeImport(JSON.stringify(exportData));

      expect(result.conversations[0].preview.length).toBeLessThanOrEqual(150);
    });
  });
});
