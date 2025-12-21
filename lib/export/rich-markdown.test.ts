/**
 * Tests for rich-markdown export functionality
 */

import { exportToRichMarkdown, exportToRichJSON, type RichExportData } from './rich-markdown';
import type { UIMessage, Session } from '@/types';

// Mock session data
const mockSession: Session = {
  id: 'session-123',
  title: 'Test Conversation',
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T11:00:00Z'),
  provider: 'openai',
  model: 'gpt-4o',
  mode: 'chat',
  systemPrompt: 'You are a helpful assistant.',
  temperature: 0.7,
  maxTokens: 4096,
};

// Mock messages data
const mockMessages: UIMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'Hello, how are you?',
    createdAt: new Date('2024-01-15T10:01:00Z'),
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: 'I am doing well, thank you for asking!',
    createdAt: new Date('2024-01-15T10:01:30Z'),
    model: 'gpt-4o',
    provider: 'openai',
    tokens: { prompt: 10, completion: 15, total: 25 },
  },
];

// Mock messages with parts
const mockMessagesWithParts: UIMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'Search for the latest news',
    createdAt: new Date('2024-01-15T10:01:00Z'),
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: 'Here are the latest news headlines.',
    createdAt: new Date('2024-01-15T10:01:30Z'),
    parts: [
      {
        type: 'reasoning',
        content: 'I need to search for news and summarize the results.',
        isStreaming: false,
        duration: 2.5,
      },
      {
        type: 'tool-invocation',
        toolCallId: 'tool-1',
        toolName: 'web-search',
        state: 'output-available',
        args: { query: 'latest news' },
        result: { results: [{ title: 'News 1' }, { title: 'News 2' }] },
      },
      {
        type: 'text',
        content: 'Here are the latest news headlines.',
      },
      {
        type: 'sources',
        sources: [
          { id: 'src-1', url: 'https://example.com/news1', title: 'News Article 1', snippet: 'This is a snippet...', relevance: 0.9 },
          { id: 'src-2', url: 'https://example.com/news2', title: 'News Article 2', snippet: 'Another snippet', relevance: 0.8 },
        ],
      },
    ],
  },
];

// Mock messages with attachments
const mockMessagesWithAttachments: UIMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'Check this image',
    createdAt: new Date('2024-01-15T10:01:00Z'),
    attachments: [
      {
        id: 'att-1',
        name: 'photo.jpg',
        type: 'image',
        url: 'data:image/jpeg;base64,/9j/4AAQ...',
        size: 1024,
        mimeType: 'image/jpeg',
      },
    ],
  },
];

describe('exportToRichMarkdown', () => {
  const exportedAt = new Date('2024-01-15T12:00:00Z');

  it('should export basic conversation to markdown', () => {
    const data: RichExportData = {
      session: mockSession,
      messages: mockMessages,
      exportedAt,
    };

    const result = exportToRichMarkdown(data);

    // Check header
    expect(result).toContain('# Test Conversation');
    expect(result).toContain('**Provider** | openai');
    expect(result).toContain('**Model** | gpt-4o');
    expect(result).toContain('**Mode** | chat');

    // Check system prompt
    expect(result).toContain('## System Prompt');
    expect(result).toContain('You are a helpful assistant.');

    // Check messages
    expect(result).toContain('👤 **You**');
    expect(result).toContain('🤖 **Assistant**');
    expect(result).toContain('Hello, how are you?');
    expect(result).toContain('I am doing well, thank you for asking!');
  });

  it('should include token usage when enabled', () => {
    const data: RichExportData = {
      session: mockSession,
      messages: mockMessages,
      exportedAt,
      includeTokens: true,
    };

    const result = exportToRichMarkdown(data);

    expect(result).toContain('Token Usage');
    expect(result).toContain('Prompt: 10');
    expect(result).toContain('Completion: 15');
    expect(result).toContain('Total: 25');
  });

  it('should not include metadata when disabled', () => {
    const data: RichExportData = {
      session: mockSession,
      messages: mockMessages,
      exportedAt,
      includeMetadata: false,
    };

    const result = exportToRichMarkdown(data);

    expect(result).not.toContain('## Conversation Info');
    expect(result).not.toContain('**Provider** | openai');
  });

  it('should render message parts correctly', () => {
    const data: RichExportData = {
      session: mockSession,
      messages: mockMessagesWithParts,
      exportedAt,
    };

    const result = exportToRichMarkdown(data);

    // Reasoning
    expect(result).toContain('💭 Thinking');
    expect(result).toContain('2.5s');
    expect(result).toContain('I need to search for news');

    // Tool invocation
    expect(result).toContain('🔧 Tool: Web Search');
    expect(result).toContain('output-available');
    expect(result).toContain('"query": "latest news"');

    // Sources
    expect(result).toContain('📚 Sources');
    expect(result).toContain('News Article 1');
    expect(result).toContain('https://example.com/news1');
  });

  it('should render attachments correctly', () => {
    const data: RichExportData = {
      session: mockSession,
      messages: mockMessagesWithAttachments,
      exportedAt,
      includeAttachments: true,
    };

    const result = exportToRichMarkdown(data);

    expect(result).toContain('📎 Attachments');
    expect(result).toContain('photo.jpg');
    expect(result).toContain('1.0 KB');
  });

  it('should not include attachments when disabled', () => {
    const data: RichExportData = {
      session: mockSession,
      messages: mockMessagesWithAttachments,
      exportedAt,
      includeAttachments: false,
    };

    const result = exportToRichMarkdown(data);

    expect(result).not.toContain('📎 Attachments');
  });

  it('should include footer with export timestamp', () => {
    const data: RichExportData = {
      session: mockSession,
      messages: mockMessages,
      exportedAt,
    };

    const result = exportToRichMarkdown(data);

    expect(result).toContain('*Exported from Cognia');
  });
});

describe('exportToRichJSON', () => {
  const exportedAt = new Date('2024-01-15T12:00:00Z');

  it('should export basic conversation to JSON', () => {
    const data: RichExportData = {
      session: mockSession,
      messages: mockMessages,
      exportedAt,
    };

    const result = exportToRichJSON(data);
    const parsed = JSON.parse(result);

    expect(parsed.version).toBe('2.0');
    expect(parsed.session.id).toBe('session-123');
    expect(parsed.session.title).toBe('Test Conversation');
    expect(parsed.session.provider).toBe('openai');
    expect(parsed.session.model).toBe('gpt-4o');
    expect(parsed.messages).toHaveLength(2);
  });

  it('should include message parts in JSON', () => {
    const data: RichExportData = {
      session: mockSession,
      messages: mockMessagesWithParts,
      exportedAt,
    };

    const result = exportToRichJSON(data);
    const parsed = JSON.parse(result);

    const assistantMsg = parsed.messages[1];
    expect(assistantMsg.parts).toBeDefined();
    expect(assistantMsg.parts).toHaveLength(4);
    expect(assistantMsg.parts[0].type).toBe('reasoning');
    expect(assistantMsg.parts[1].type).toBe('tool-invocation');
  });

  it('should include statistics', () => {
    const data: RichExportData = {
      session: mockSession,
      messages: mockMessages,
      exportedAt,
    };

    const result = exportToRichJSON(data);
    const parsed = JSON.parse(result);

    expect(parsed.statistics).toBeDefined();
    expect(parsed.statistics.totalMessages).toBe(2);
    expect(parsed.statistics.userMessages).toBe(1);
    expect(parsed.statistics.assistantMessages).toBe(1);
    expect(parsed.statistics.totalTokens).toBe(25);
  });

  it('should include session configuration', () => {
    const data: RichExportData = {
      session: mockSession,
      messages: mockMessages,
      exportedAt,
    };

    const result = exportToRichJSON(data);
    const parsed = JSON.parse(result);

    expect(parsed.session.systemPrompt).toBe('You are a helpful assistant.');
    expect(parsed.session.temperature).toBe(0.7);
    expect(parsed.session.maxTokens).toBe(4096);
  });

  it('should format dates as ISO strings', () => {
    const data: RichExportData = {
      session: mockSession,
      messages: mockMessages,
      exportedAt,
    };

    const result = exportToRichJSON(data);
    const parsed = JSON.parse(result);

    expect(parsed.exportedAt).toBe('2024-01-15T12:00:00.000Z');
    expect(parsed.session.createdAt).toBe('2024-01-15T10:00:00.000Z');
    expect(parsed.messages[0].createdAt).toBe('2024-01-15T10:01:00.000Z');
  });
});
