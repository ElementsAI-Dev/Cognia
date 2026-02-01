/**
 * ChatGPT Import Tests
 */

import {
  isChatGPTFormat,
  detectImportFormat,
  convertConversation,
  parseChatGPTExport,
  previewChatGPTImport,
} from './chatgpt-import';
import type { ChatGPTConversation } from '@/types/import';

// Sample ChatGPT conversation for testing
const createMockConversation = (overrides: Partial<ChatGPTConversation> = {}): ChatGPTConversation => ({
  id: 'conv-123',
  title: 'Test Conversation',
  create_time: 1704067200, // 2024-01-01
  update_time: 1704153600, // 2024-01-02
  current_node: 'node-3',
  mapping: {
    'node-1': {
      id: 'node-1',
      message: null,
      parent: null,
      children: ['node-2'],
    },
    'node-2': {
      id: 'node-2',
      message: {
        id: 'msg-1',
        author: { role: 'user' },
        create_time: 1704067200,
        update_time: null,
        content: { content_type: 'text', parts: ['Hello, how are you?'] },
        status: 'finished_successfully',
      },
      parent: 'node-1',
      children: ['node-3'],
    },
    'node-3': {
      id: 'node-3',
      message: {
        id: 'msg-2',
        author: { role: 'assistant' },
        create_time: 1704067260,
        update_time: null,
        content: { content_type: 'text', parts: ['I am doing well, thank you!'] },
        status: 'finished_successfully',
        metadata: { model_slug: 'gpt-4' },
      },
      parent: 'node-2',
      children: [],
    },
  },
  ...overrides,
});

describe('ChatGPT Import Utilities', () => {
  describe('isChatGPTFormat', () => {
    it('should return true for valid ChatGPT format', () => {
      const data = [createMockConversation()];
      expect(isChatGPTFormat(data)).toBe(true);
    });

    it('should return false for empty array', () => {
      expect(isChatGPTFormat([])).toBe(false);
    });

    it('should return false for non-array', () => {
      expect(isChatGPTFormat({ mapping: {} })).toBe(false);
    });

    it('should return false for array without mapping', () => {
      expect(isChatGPTFormat([{ id: '123', title: 'Test' }])).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isChatGPTFormat(null)).toBe(false);
      expect(isChatGPTFormat(undefined)).toBe(false);
    });
  });

  describe('detectImportFormat', () => {
    it('should detect ChatGPT format', () => {
      const data = [createMockConversation()];
      expect(detectImportFormat(data)).toBe('chatgpt');
    });

    it('should detect Cognia format', () => {
      const data = {
        version: '2.0',
        exportedAt: '2024-01-01T00:00:00Z',
        sessions: [],
      };
      expect(detectImportFormat(data)).toBe('cognia');
    });

    it('should return unknown for unrecognized format', () => {
      expect(detectImportFormat({ random: 'data' })).toBe('unknown');
      expect(detectImportFormat(null)).toBe('unknown');
      expect(detectImportFormat('string')).toBe('unknown');
    });

  });

  describe('convertConversation', () => {
    it('should convert ChatGPT conversation to Session and Messages', () => {
      const conversation = createMockConversation();
      const result = convertConversation(conversation);

      expect(result.session).toBeDefined();
      expect(result.session.title).toBe('Test Conversation');
      expect(result.messages).toHaveLength(2);
    });

    it('should preserve timestamps when option is enabled', () => {
      const conversation = createMockConversation();
      const result = convertConversation(conversation, {
        mergeStrategy: 'merge',
        generateNewIds: true,
        preserveTimestamps: true,
      });

      expect(result.session.createdAt.getTime()).toBe(1704067200000);
    });

    it('should generate new IDs when option is enabled', () => {
      const conversation = createMockConversation();
      const result = convertConversation(conversation, {
        mergeStrategy: 'merge',
        generateNewIds: true,
        preserveTimestamps: true,
      });

      expect(result.session.id).not.toBe('conv-123');
      expect(result.messages[0].id).not.toBe('msg-1');
    });

    it('should keep original IDs when generateNewIds is false', () => {
      const conversation = createMockConversation();
      const result = convertConversation(conversation, {
        mergeStrategy: 'merge',
        generateNewIds: false,
        preserveTimestamps: true,
      });

      expect(result.session.id).toBe('conv-123');
    });

    it('should map user and assistant roles correctly', () => {
      const conversation = createMockConversation();
      const result = convertConversation(conversation);

      expect(result.messages[0].role).toBe('user');
      expect(result.messages[1].role).toBe('assistant');
    });

    it('should extract text content from parts', () => {
      const conversation = createMockConversation();
      const result = convertConversation(conversation);

      expect(result.messages[0].content).toBe('Hello, how are you?');
      expect(result.messages[1].content).toBe('I am doing well, thank you!');
    });

    it('should set messageCount and lastMessagePreview', () => {
      const conversation = createMockConversation();
      const result = convertConversation(conversation);

      expect(result.session.messageCount).toBe(2);
      expect(result.session.lastMessagePreview).toBe('I am doing well, thank you!');
    });

    it('should handle empty conversations', () => {
      const conversation: ChatGPTConversation = {
        id: 'empty-conv',
        title: 'Empty',
        create_time: 1704067200,
        update_time: 1704067200,
        current_node: 'node-1',
        mapping: {
          'node-1': {
            id: 'node-1',
            message: null,
            parent: null,
            children: [],
          },
        },
      };
      const result = convertConversation(conversation);

      expect(result.messages).toHaveLength(0);
      expect(result.session.messageCount).toBe(0);
    });
  });

  describe('parseChatGPTExport', () => {
    it('should parse valid ChatGPT export', async () => {
      const data = [createMockConversation()];
      const result = await parseChatGPTExport(JSON.stringify(data));

      expect(result.conversations).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle multiple conversations', async () => {
      const data = [
        createMockConversation({ id: 'conv-1', title: 'First' }),
        createMockConversation({ id: 'conv-2', title: 'Second' }),
      ];
      const result = await parseChatGPTExport(JSON.stringify(data));

      expect(result.conversations).toHaveLength(2);
    });

    it('should return error for invalid JSON', async () => {
      const result = await parseChatGPTExport('not valid json');

      expect(result.conversations).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Invalid JSON format');
    });

    it('should return error for non-ChatGPT format', async () => {
      const result = await parseChatGPTExport(JSON.stringify({ random: 'data' }));

      expect(result.conversations).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Not a valid ChatGPT export format');
    });
  });

  describe('previewChatGPTImport', () => {
    it('should generate preview for ChatGPT export', async () => {
      const data = [createMockConversation()];
      const result = await previewChatGPTImport(JSON.stringify(data));

      expect(result.conversations).toHaveLength(1);
      expect(result.conversations[0].title).toBe('Test Conversation');
      expect(result.conversations[0].messageCount).toBe(2);
      expect(result.totalMessages).toBe(2);
    });

    it('should include preview text from first message', async () => {
      const data = [createMockConversation()];
      const result = await previewChatGPTImport(JSON.stringify(data));

      expect(result.conversations[0].preview).toBe('Hello, how are you?');
    });

    it('should handle empty conversations in preview', async () => {
      const emptyConv: ChatGPTConversation = {
        id: 'empty',
        title: 'Empty Chat',
        create_time: 1704067200,
        update_time: 1704067200,
        current_node: 'node-1',
        mapping: {
          'node-1': { id: 'node-1', message: null, parent: null, children: [] },
        },
      };
      const result = await previewChatGPTImport(JSON.stringify([emptyConv]));

      expect(result.conversations[0].messageCount).toBe(0);
      expect(result.conversations[0].preview).toBe('');
    });

    it('should calculate total messages across multiple conversations', async () => {
      const data = [
        createMockConversation({ id: 'conv-1' }),
        createMockConversation({ id: 'conv-2' }),
        createMockConversation({ id: 'conv-3' }),
      ];
      const result = await previewChatGPTImport(JSON.stringify(data));

      expect(result.totalMessages).toBe(6); // 2 messages * 3 conversations
    });
  });

  describe('convertConversation - edge cases', () => {
    it('should handle system messages', () => {
      const conv: ChatGPTConversation = {
        id: 'sys-conv',
        title: 'System Test',
        create_time: 1704067200,
        update_time: 1704067200,
        current_node: 'node-2',
        mapping: {
          'node-1': {
            id: 'node-1',
            message: {
              id: 'sys-msg',
              author: { role: 'system' },
              create_time: 1704067200,
              update_time: null,
              content: { content_type: 'text', parts: ['You are a helpful assistant.'] },
              status: 'finished_successfully',
            },
            parent: null,
            children: ['node-2'],
          },
          'node-2': {
            id: 'node-2',
            message: {
              id: 'user-msg',
              author: { role: 'user' },
              create_time: 1704067260,
              update_time: null,
              content: { content_type: 'text', parts: ['Hello'] },
              status: 'finished_successfully',
            },
            parent: 'node-1',
            children: [],
          },
        },
      };
      const result = convertConversation(conv);

      // System message with content should be included
      expect(result.messages.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle tool role messages', () => {
      const conv: ChatGPTConversation = {
        id: 'tool-conv',
        title: 'Tool Test',
        create_time: 1704067200,
        update_time: 1704067200,
        current_node: 'node-2',
        mapping: {
          'node-1': {
            id: 'node-1',
            message: null,
            parent: null,
            children: ['node-2'],
          },
          'node-2': {
            id: 'node-2',
            message: {
              id: 'tool-msg',
              author: { role: 'tool', name: 'web_search' },
              create_time: 1704067200,
              update_time: null,
              content: { content_type: 'text', parts: ['Search results...'] },
              status: 'finished_successfully',
            },
            parent: 'node-1',
            children: [],
          },
        },
      };
      const result = convertConversation(conv);

      // Tool messages should be mapped to assistant
      expect(result.messages[0].role).toBe('assistant');
    });

    it('should handle multipart content', () => {
      const conv: ChatGPTConversation = {
        id: 'multi-conv',
        title: 'Multipart Test',
        create_time: 1704067200,
        update_time: 1704067200,
        current_node: 'node-2',
        mapping: {
          'node-1': {
            id: 'node-1',
            message: null,
            parent: null,
            children: ['node-2'],
          },
          'node-2': {
            id: 'node-2',
            message: {
              id: 'multi-msg',
              author: { role: 'user' },
              create_time: 1704067200,
              update_time: null,
              content: {
                content_type: 'multimodal_text',
                parts: ['First part', 'Second part', 'Third part'],
              },
              status: 'finished_successfully',
            },
            parent: 'node-1',
            children: [],
          },
        },
      };
      const result = convertConversation(conv);

      expect(result.messages[0].content).toBe('First part\nSecond part\nThird part');
    });

    it('should handle image asset pointers', () => {
      const conv: ChatGPTConversation = {
        id: 'img-conv',
        title: 'Image Test',
        create_time: 1704067200,
        update_time: 1704067200,
        current_node: 'node-2',
        mapping: {
          'node-1': {
            id: 'node-1',
            message: null,
            parent: null,
            children: ['node-2'],
          },
          'node-2': {
            id: 'node-2',
            message: {
              id: 'img-msg',
              author: { role: 'user' },
              create_time: 1704067200,
              update_time: null,
              content: {
                content_type: 'multimodal_text',
                parts: [
                  'Check this image:',
                  { content_type: 'image_asset_pointer', asset_pointer: 'file-abc123' },
                ],
              },
              status: 'finished_successfully',
            },
            parent: 'node-1',
            children: [],
          },
        },
      };
      const result = convertConversation(conv);

      expect(result.messages[0].content).toContain('Check this image:');
      expect(result.messages[0].content).toContain('[Image]');
    });

    it('should use default title for untitled conversations', () => {
      const conv = createMockConversation({ title: '' });
      const result = convertConversation(conv);

      expect(result.session.title).toBe('Imported Chat');
    });

    it('should use current timestamps when preserveTimestamps is false', () => {
      const conv = createMockConversation();
      const before = Date.now();
      const result = convertConversation(conv, {
        mergeStrategy: 'merge',
        generateNewIds: true,
        preserveTimestamps: false,
      });
      const after = Date.now();

      const createdTime = result.session.createdAt.getTime();
      expect(createdTime).toBeGreaterThanOrEqual(before);
      expect(createdTime).toBeLessThanOrEqual(after);
    });

    it('should extract model from metadata', () => {
      const conv = createMockConversation();
      const result = convertConversation(conv);

      // The assistant message should have model from metadata
      const assistantMsg = result.messages.find((m) => m.role === 'assistant');
      expect(assistantMsg?.model).toBe('gpt-4');
    });

    it('should handle missing model metadata', () => {
      const conv: ChatGPTConversation = {
        id: 'no-model',
        title: 'No Model',
        create_time: 1704067200,
        update_time: 1704067200,
        current_node: 'node-2',
        mapping: {
          'node-1': {
            id: 'node-1',
            message: null,
            parent: null,
            children: ['node-2'],
          },
          'node-2': {
            id: 'node-2',
            message: {
              id: 'msg',
              author: { role: 'assistant' },
              create_time: 1704067200,
              update_time: null,
              content: { content_type: 'text', parts: ['Response'] },
              status: 'finished_successfully',
              // No metadata
            },
            parent: 'node-1',
            children: [],
          },
        },
      };
      const result = convertConversation(conv, {
        mergeStrategy: 'merge',
        generateNewIds: true,
        preserveTimestamps: true,
        defaultModel: 'gpt-3.5-turbo',
      });

      expect(result.messages[0].model).toBe('gpt-3.5-turbo');
    });

    it('should handle branched conversations (follow current_node path)', () => {
      // Conversation with branches - should only follow the path to current_node
      const conv: ChatGPTConversation = {
        id: 'branched',
        title: 'Branched',
        create_time: 1704067200,
        update_time: 1704067200,
        current_node: 'node-3a', // Following branch A
        mapping: {
          'node-1': {
            id: 'node-1',
            message: null,
            parent: null,
            children: ['node-2'],
          },
          'node-2': {
            id: 'node-2',
            message: {
              id: 'msg-1',
              author: { role: 'user' },
              create_time: 1704067200,
              update_time: null,
              content: { content_type: 'text', parts: ['Question'] },
              status: 'finished_successfully',
            },
            parent: 'node-1',
            children: ['node-3a', 'node-3b'], // Two branches
          },
          'node-3a': {
            id: 'node-3a',
            message: {
              id: 'msg-2a',
              author: { role: 'assistant' },
              create_time: 1704067260,
              update_time: null,
              content: { content_type: 'text', parts: ['Answer A'] },
              status: 'finished_successfully',
            },
            parent: 'node-2',
            children: [],
          },
          'node-3b': {
            id: 'node-3b',
            message: {
              id: 'msg-2b',
              author: { role: 'assistant' },
              create_time: 1704067260,
              update_time: null,
              content: { content_type: 'text', parts: ['Answer B'] },
              status: 'finished_successfully',
            },
            parent: 'node-2',
            children: [],
          },
        },
      };
      const result = convertConversation(conv);

      // Should only have 2 messages (user + answer A), not answer B
      expect(result.messages).toHaveLength(2);
      expect(result.messages[1].content).toBe('Answer A');
    });
  });

  describe('isChatGPTFormat - edge cases', () => {
    it('should return false for array with non-object items', () => {
      expect(isChatGPTFormat(['string', 123, null])).toBe(false);
    });

    it('should return false for array with missing current_node', () => {
      expect(isChatGPTFormat([{ mapping: {}, create_time: 123 }])).toBe(false);
    });

    it('should return false for array with missing create_time', () => {
      expect(isChatGPTFormat([{ mapping: {}, current_node: 'x' }])).toBe(false);
    });

    it('should return true for minimal valid ChatGPT format', () => {
      const minimal = [{
        id: 'x',
        title: 'x',
        create_time: 1,
        update_time: 1,
        current_node: 'n1',
        mapping: { n1: { id: 'n1', message: null, parent: null, children: [] } },
      }];
      expect(isChatGPTFormat(minimal)).toBe(true);
    });
  });

  describe('detectImportFormat - edge cases', () => {
    it('should return unknown for empty object', () => {
      expect(detectImportFormat({})).toBe('unknown');
    });

    it('should return unknown for array without ChatGPT structure', () => {
      expect(detectImportFormat([1, 2, 3])).toBe('unknown');
    });

    it('should detect Cognia format with minimal fields', () => {
      expect(detectImportFormat({ version: '1.0', exportedAt: 'x' })).toBe('cognia');
    });

    it('should return unknown for number', () => {
      expect(detectImportFormat(123)).toBe('unknown');
    });

    it('should return unknown for boolean', () => {
      expect(detectImportFormat(true)).toBe('unknown');
    });
  });

  describe('parseChatGPTExport - edge cases', () => {
    it('should handle empty array', async () => {
      const result = await parseChatGPTExport('[]');

      expect(result.conversations).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Not a valid ChatGPT export format');
    });

    it('should handle whitespace-only content', async () => {
      const result = await parseChatGPTExport('   \n\t  ');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Invalid JSON format');
    });

    it('should handle very long content gracefully', async () => {
      const longContent = 'A'.repeat(10000);
      const conv = createMockConversation();
      conv.mapping['node-2'].message!.content.parts = [longContent];

      const result = await parseChatGPTExport(JSON.stringify([conv]));

      expect(result.conversations).toHaveLength(1);
      expect(result.conversations[0].messages[0].content).toBe(longContent);
    });

    it('should preserve conversation order', async () => {
      const data = [
        createMockConversation({ id: 'first', title: 'First' }),
        createMockConversation({ id: 'second', title: 'Second' }),
        createMockConversation({ id: 'third', title: 'Third' }),
      ];
      const result = await parseChatGPTExport(JSON.stringify(data));

      expect(result.conversations[0].session.title).toBe('First');
      expect(result.conversations[1].session.title).toBe('Second');
      expect(result.conversations[2].session.title).toBe('Third');
    });
  });
});
