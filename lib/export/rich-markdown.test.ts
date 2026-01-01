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

// Mock messages with image parts
const mockMessagesWithImages: UIMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'Generate an image of a sunset',
    createdAt: new Date('2024-01-15T10:01:00Z'),
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: 'Here is the generated image:',
    createdAt: new Date('2024-01-15T10:01:30Z'),
    parts: [
      {
        type: 'text',
        content: 'Here is the generated image:',
      },
      {
        type: 'image',
        url: 'https://example.com/sunset.png',
        alt: 'A beautiful sunset',
        width: 1024,
        height: 768,
        isGenerated: true,
        prompt: 'Generate a beautiful sunset over the ocean',
        revisedPrompt: 'A stunning sunset with orange and purple hues over a calm ocean',
      },
    ],
  },
];

// Mock messages with video parts
const mockMessagesWithVideos: UIMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'Generate a video of a dancing cat',
    createdAt: new Date('2024-01-15T10:01:00Z'),
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: 'Here is the generated video:',
    createdAt: new Date('2024-01-15T10:01:30Z'),
    parts: [
      {
        type: 'text',
        content: 'Here is the generated video:',
      },
      {
        type: 'video',
        url: 'https://example.com/dancing-cat.mp4',
        title: 'Dancing Cat Video',
        thumbnailUrl: 'https://example.com/thumbnail.jpg',
        durationSeconds: 15,
        width: 1920,
        height: 1080,
        fps: 30,
        isGenerated: true,
        provider: 'google-veo',
        model: 'veo-2',
        prompt: 'A cute cat dancing to music',
        revisedPrompt: 'A fluffy orange cat performing dance moves in a living room',
      },
    ],
  },
];

// Mock messages with base64 image
const mockMessagesWithBase64Image: UIMessage[] = [
  {
    id: 'msg-1',
    role: 'assistant',
    content: 'Generated image:',
    createdAt: new Date('2024-01-15T10:01:30Z'),
    parts: [
      {
        type: 'image',
        url: '',
        base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        mimeType: 'image/png',
        isGenerated: true,
      },
    ],
  },
];

describe('exportToRichMarkdown - Image Parts', () => {
  const exportedAt = new Date('2024-01-15T12:00:00Z');

  it('should render AI generated image with metadata', () => {
    const data: RichExportData = {
      session: mockSession,
      messages: mockMessagesWithImages,
      exportedAt,
    };

    const result = exportToRichMarkdown(data);

    // Check AI generated indicator
    expect(result).toContain('✨ **AI Generated Image**');
    
    // Check image markdown
    expect(result).toContain('![A beautiful sunset]');
    expect(result).toContain('https://example.com/sunset.png');
    
    // Check dimensions
    expect(result).toContain('1024×768');
    
    // Check prompt
    expect(result).toContain('View prompt');
    expect(result).toContain('Generate a beautiful sunset over the ocean');
    
    // Check revised prompt
    expect(result).toContain('**Revised:**');
    expect(result).toContain('stunning sunset with orange and purple hues');
  });

  it('should render image with base64 data', () => {
    const data: RichExportData = {
      session: mockSession,
      messages: mockMessagesWithBase64Image,
      exportedAt,
    };

    const result = exportToRichMarkdown(data);

    // Check that base64 data URL is included
    expect(result).toContain('data:image/png;base64,');
  });

  it('should render non-AI image without generated indicator', () => {
    const messagesWithRegularImage: UIMessage[] = [
      {
        id: 'msg-1',
        role: 'assistant',
        content: 'Here is the image:',
        createdAt: new Date('2024-01-15T10:01:30Z'),
        parts: [
          {
            type: 'image',
            url: 'https://example.com/photo.jpg',
            alt: 'A photo',
          },
        ],
      },
    ];

    const data: RichExportData = {
      session: mockSession,
      messages: messagesWithRegularImage,
      exportedAt,
    };

    const result = exportToRichMarkdown(data);

    // Should not contain AI generated indicator
    expect(result).not.toContain('✨ **AI Generated Image**');
    
    // Should still render the image
    expect(result).toContain('![A photo]');
  });
});

describe('exportToRichMarkdown - Video Parts', () => {
  const exportedAt = new Date('2024-01-15T12:00:00Z');

  it('should render AI generated video with full metadata', () => {
    const data: RichExportData = {
      session: mockSession,
      messages: mockMessagesWithVideos,
      exportedAt,
    };

    const result = exportToRichMarkdown(data);

    // Check AI generated indicator with provider
    expect(result).toContain('🎬 **AI Generated Video**');
    expect(result).toContain('google-veo');
    expect(result).toContain('veo-2');
    
    // Check video title
    expect(result).toContain('🎥 **Video:** Dancing Cat Video');
    
    // Check duration formatting
    expect(result).toContain('⏱️ 15s');
    
    // Check dimensions
    expect(result).toContain('📐 1920×1080');
    
    // Check FPS
    expect(result).toContain('🎞️ 30fps');
    
    // Check video link
    expect(result).toContain('[▶️ Play Video]');
    expect(result).toContain('https://example.com/dancing-cat.mp4');
    
    // Check thumbnail
    expect(result).toContain('![Video Thumbnail]');
    expect(result).toContain('https://example.com/thumbnail.jpg');
    
    // Check prompt
    expect(result).toContain('A cute cat dancing to music');
  });

  it('should format duration correctly for videos over 1 minute', () => {
    const messagesWithLongVideo: UIMessage[] = [
      {
        id: 'msg-1',
        role: 'assistant',
        content: 'Video:',
        createdAt: new Date('2024-01-15T10:01:30Z'),
        parts: [
          {
            type: 'video',
            url: 'https://example.com/video.mp4',
            durationSeconds: 125, // 2:05
            isGenerated: false,
          },
        ],
      },
    ];

    const data: RichExportData = {
      session: mockSession,
      messages: messagesWithLongVideo,
      exportedAt,
    };

    const result = exportToRichMarkdown(data);

    // Should show 2:05 format
    expect(result).toContain('⏱️ 2:05');
  });

  it('should render video without optional metadata', () => {
    const messagesWithMinimalVideo: UIMessage[] = [
      {
        id: 'msg-1',
        role: 'assistant',
        content: 'Video:',
        createdAt: new Date('2024-01-15T10:01:30Z'),
        parts: [
          {
            type: 'video',
            url: 'https://example.com/video.mp4',
          },
        ],
      },
    ];

    const data: RichExportData = {
      session: mockSession,
      messages: messagesWithMinimalVideo,
      exportedAt,
    };

    const result = exportToRichMarkdown(data);

    // Should have video section
    expect(result).toContain('🎥 **Video:**');
    expect(result).toContain('[▶️ Play Video]');
    
    // Should not have metadata sections
    expect(result).not.toContain('⏱️');
    expect(result).not.toContain('📐');
    expect(result).not.toContain('🎞️');
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
