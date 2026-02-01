/**
 * Import Registry Tests
 */

import {
  detectImportFormat,
  getImporter,
  getProviderInfo,
  getSupportedFormats,
  parseImport,
  previewImport,
  PLATFORM_INFO,
} from './import-registry';

describe('Import Registry', () => {
  const mockChatGPTData = [
    {
      id: 'conv-1',
      title: 'Test Conversation',
      create_time: 1704067200,
      update_time: 1704070800,
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
            content: { content_type: 'text', parts: ['Hello'] },
            create_time: 1704067200,
          },
          parent: 'node-1',
          children: [],
        },
      },
      current_node: 'node-2',
    },
  ];

  const mockClaudeData = {
    meta: {
      exported_at: '2024-01-15T10:00:00Z',
      title: 'Claude Conversation',
    },
    chats: [
      {
        index: 0,
        type: 'prompt',
        message: [{ type: 'p', data: 'Hello Claude' }],
      },
      {
        index: 1,
        type: 'response',
        message: [{ type: 'p', data: 'Hello! How can I help?' }],
      },
    ],
  };

  const mockGeminiData = {
    conversations: [
      {
        id: 'gemini-1',
        title: 'Gemini Conversation',
        create_time: '2024-01-15T10:00:00Z',
        update_time: '2024-01-15T10:30:00Z',
        messages: [
          { role: 'user', content: 'Hello Gemini', timestamp: '2024-01-15T10:00:00Z' },
          { role: 'model', content: 'Hello! How can I help?', timestamp: '2024-01-15T10:00:15Z' },
        ],
      },
    ],
  };

  const mockCogniaData = {
    version: '1.0',
    exportedAt: '2024-01-15T10:00:00Z',
    sessions: [],
  };

  describe('detectImportFormat', () => {
    it('should detect ChatGPT format', () => {
      expect(detectImportFormat(mockChatGPTData)).toBe('chatgpt');
    });

    it('should detect Claude format', () => {
      expect(detectImportFormat(mockClaudeData)).toBe('claude');
    });

    it('should detect Gemini format', () => {
      expect(detectImportFormat(mockGeminiData)).toBe('gemini');
    });

    it('should detect Cognia format', () => {
      expect(detectImportFormat(mockCogniaData)).toBe('cognia');
    });

    it('should return unknown for unrecognized format', () => {
      expect(detectImportFormat({ random: 'data' })).toBe('unknown');
      expect(detectImportFormat(null)).toBe('unknown');
      expect(detectImportFormat(undefined)).toBe('unknown');
    });
  });

  describe('getImporter', () => {
    it('should return importer for chatgpt format', () => {
      const importer = getImporter('chatgpt');
      expect(importer).not.toBeNull();
      expect(importer?.getFormat()).toBe('chatgpt');
    });

    it('should return importer for claude format', () => {
      const importer = getImporter('claude');
      expect(importer).not.toBeNull();
      expect(importer?.getFormat()).toBe('claude');
    });

    it('should return importer for gemini format', () => {
      const importer = getImporter('gemini');
      expect(importer).not.toBeNull();
      expect(importer?.getFormat()).toBe('gemini');
    });

    it('should return null for unknown format', () => {
      expect(getImporter('unknown')).toBeNull();
    });

    it('should return null for cognia format', () => {
      expect(getImporter('cognia')).toBeNull();
    });
  });

  describe('getProviderInfo', () => {
    it('should return provider info for chatgpt', () => {
      const info = getProviderInfo('chatgpt');
      expect(info?.name).toBe('openai');
      expect(info?.defaultModel).toBe('gpt-4');
    });

    it('should return provider info for claude', () => {
      const info = getProviderInfo('claude');
      expect(info?.name).toBe('anthropic');
      expect(info?.defaultModel).toBe('claude-3-opus');
    });

    it('should return provider info for gemini', () => {
      const info = getProviderInfo('gemini');
      expect(info?.name).toBe('google');
      expect(info?.defaultModel).toBe('gemini-pro');
    });

    it('should return null for unknown format', () => {
      expect(getProviderInfo('unknown')).toBeNull();
    });
  });

  describe('getSupportedFormats', () => {
    it('should return all supported formats', () => {
      const formats = getSupportedFormats();
      expect(formats).toContain('chatgpt');
      expect(formats).toContain('claude');
      expect(formats).toContain('gemini');
    });
  });

  describe('PLATFORM_INFO', () => {
    it('should have info for all platforms', () => {
      expect(PLATFORM_INFO.chatgpt).toBeDefined();
      expect(PLATFORM_INFO.claude).toBeDefined();
      expect(PLATFORM_INFO.gemini).toBeDefined();
      expect(PLATFORM_INFO.cognia).toBeDefined();
    });

    it('should have correct colors', () => {
      expect(PLATFORM_INFO.chatgpt.color).toBe('#10a37f');
      expect(PLATFORM_INFO.claude.color).toBe('#d4a574');
      expect(PLATFORM_INFO.gemini.color).toBe('#4285f4');
    });
  });

  describe('parseImport', () => {
    it('should parse Claude content', async () => {
      const content = JSON.stringify(mockClaudeData);
      const result = await parseImport(content);

      expect(result.format).toBe('claude');
      expect(result.conversations).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should parse Gemini content', async () => {
      const content = JSON.stringify(mockGeminiData);
      const result = await parseImport(content);

      expect(result.format).toBe('gemini');
      expect(result.conversations).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for invalid JSON', async () => {
      const result = await parseImport('not json');

      expect(result.format).toBe('unknown');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Invalid JSON format');
    });

    it('should return error for unknown format', async () => {
      const content = JSON.stringify({ unknown: 'format' });
      const result = await parseImport(content);

      expect(result.format).toBe('unknown');
      expect(result.errors).toHaveLength(1);
    });

    it('should return error for Cognia format', async () => {
      const content = JSON.stringify(mockCogniaData);
      const result = await parseImport(content);

      expect(result.format).toBe('cognia');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Cognia');
    });
  });

  describe('previewImport', () => {
    it('should preview Claude export', async () => {
      const content = JSON.stringify(mockClaudeData);
      const result = await previewImport(content);

      expect(result.format).toBe('claude');
      expect(result.conversations).toHaveLength(1);
      expect(result.conversations[0].title).toBe('Claude Conversation');
      expect(result.totalMessages).toBe(2);
    });

    it('should preview Gemini export', async () => {
      const content = JSON.stringify(mockGeminiData);
      const result = await previewImport(content);

      expect(result.format).toBe('gemini');
      expect(result.conversations).toHaveLength(1);
      expect(result.conversations[0].title).toBe('Gemini Conversation');
      expect(result.totalMessages).toBe(2);
    });

    it('should return error for invalid content', async () => {
      const result = await previewImport('invalid');

      expect(result.format).toBe('unknown');
      expect(result.errors).toHaveLength(1);
      expect(result.totalMessages).toBe(0);
    });
  });
});
