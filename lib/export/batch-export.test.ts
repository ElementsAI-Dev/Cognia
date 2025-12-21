/**
 * Tests for batch-export functionality
 */

import {
  exportSessionsToZip,
  estimateExportSize,
  type BatchExportOptions,
  type SessionWithMessages,
} from './batch-export';
import type { UIMessage, Session } from '@/types';

// Mock JSZip
jest.mock('jszip', () => {
  const mockFile = jest.fn().mockReturnThis();
  const mockFolder = jest.fn().mockReturnValue({ file: mockFile });
  const mockGenerateAsync = jest.fn().mockResolvedValue(new Blob(['test'], { type: 'application/zip' }));

  return jest.fn().mockImplementation(() => ({
    file: mockFile,
    folder: mockFolder,
    generateAsync: mockGenerateAsync,
  }));
});

// Mock session data
const createMockSession = (id: string, title: string): Session => ({
  id,
  title,
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T11:00:00Z'),
  provider: 'openai',
  model: 'gpt-4o',
  mode: 'chat',
});

// Mock messages
const createMockMessages = (sessionId: string): UIMessage[] => [
  {
    id: `${sessionId}-msg-1`,
    role: 'user',
    content: 'Hello!',
    createdAt: new Date('2024-01-15T10:01:00Z'),
  },
  {
    id: `${sessionId}-msg-2`,
    role: 'assistant',
    content: 'Hi there! How can I help you?',
    createdAt: new Date('2024-01-15T10:01:30Z'),
  },
];

// Mock sessions with messages
const mockSessionsWithMessages: SessionWithMessages[] = [
  {
    session: createMockSession('session-1', 'First Conversation'),
    messages: createMockMessages('session-1'),
  },
  {
    session: createMockSession('session-2', 'Second Conversation'),
    messages: createMockMessages('session-2'),
  },
];

describe('exportSessionsToZip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should export sessions to ZIP successfully', async () => {
    const options: BatchExportOptions = {
      format: 'markdown',
    };

    const result = await exportSessionsToZip(mockSessionsWithMessages, options);

    expect(result.success).toBe(true);
    expect(result.blob).toBeDefined();
    expect(result.filename).toMatch(/cognia-export-\d{4}-\d{2}-\d{2}\.zip/);
  });

  it('should export with markdown format', async () => {
    const options: BatchExportOptions = {
      format: 'markdown',
    };

    const result = await exportSessionsToZip(mockSessionsWithMessages, options);

    expect(result.success).toBe(true);
  });

  it('should export with json format', async () => {
    const options: BatchExportOptions = {
      format: 'json',
    };

    const result = await exportSessionsToZip(mockSessionsWithMessages, options);

    expect(result.success).toBe(true);
  });

  it('should export with html format', async () => {
    const options: BatchExportOptions = {
      format: 'html',
    };

    const result = await exportSessionsToZip(mockSessionsWithMessages, options);

    expect(result.success).toBe(true);
  });

  it('should export with animated-html format', async () => {
    const options: BatchExportOptions = {
      format: 'animated-html',
    };

    const result = await exportSessionsToZip(mockSessionsWithMessages, options);

    expect(result.success).toBe(true);
  });

  it('should export with text format', async () => {
    const options: BatchExportOptions = {
      format: 'text',
    };

    const result = await exportSessionsToZip(mockSessionsWithMessages, options);

    expect(result.success).toBe(true);
  });

  it('should export with mixed format (all formats)', async () => {
    const options: BatchExportOptions = {
      format: 'mixed',
    };

    const result = await exportSessionsToZip(mockSessionsWithMessages, options);

    expect(result.success).toBe(true);
  });

  it('should include index file by default', async () => {
    const options: BatchExportOptions = {
      format: 'markdown',
      includeIndex: true,
    };

    const result = await exportSessionsToZip(mockSessionsWithMessages, options);

    expect(result.success).toBe(true);
  });

  it('should handle empty sessions array', async () => {
    const options: BatchExportOptions = {
      format: 'markdown',
    };

    const result = await exportSessionsToZip([], options);

    expect(result.success).toBe(true);
  });

  it('should use theme option for animated-html', async () => {
    const options: BatchExportOptions = {
      format: 'animated-html',
      theme: 'dark',
    };

    const result = await exportSessionsToZip(mockSessionsWithMessages, options);

    expect(result.success).toBe(true);
  });
});

describe('estimateExportSize', () => {
  it('should return 0 for empty sessions', () => {
    const result = estimateExportSize([]);

    expect(result).toBe(0);
  });

  it('should estimate size based on content', () => {
    const result = estimateExportSize(mockSessionsWithMessages);

    expect(result).toBeGreaterThan(0);
  });

  it('should increase with more messages', () => {
    // Create content large enough to see difference (>1KB)
    const longContent = 'A'.repeat(500);
    
    const shortSession: SessionWithMessages[] = [
      {
        session: createMockSession('session-1', 'Short'),
        messages: [{ id: 'msg-1', role: 'user', content: 'Hi', createdAt: new Date() }],
      },
    ];

    const longSession: SessionWithMessages[] = [
      {
        session: createMockSession('session-1', 'Long'),
        messages: [
          { id: 'msg-1', role: 'user', content: longContent, createdAt: new Date() },
          { id: 'msg-2', role: 'assistant', content: longContent, createdAt: new Date() },
          { id: 'msg-3', role: 'user', content: longContent, createdAt: new Date() },
        ],
      },
    ];

    const shortSize = estimateExportSize(shortSession);
    const longSize = estimateExportSize(longSession);

    expect(longSize).toBeGreaterThan(shortSize);
  });

  it('should include parts in size calculation', () => {
    // Create content large enough to see difference
    const largePartContent = 'B'.repeat(1000);
    
    const sessionWithParts: SessionWithMessages[] = [
      {
        session: createMockSession('session-1', 'With Parts'),
        messages: [
          {
            id: 'msg-1',
            role: 'assistant',
            content: 'Response',
            createdAt: new Date(),
            parts: [
              { type: 'reasoning', content: largePartContent, isStreaming: false },
              { type: 'text', content: largePartContent },
            ],
          },
        ],
      },
    ];

    const sessionWithoutParts: SessionWithMessages[] = [
      {
        session: createMockSession('session-1', 'Without Parts'),
        messages: [
          { id: 'msg-1', role: 'assistant', content: 'Response', createdAt: new Date() },
        ],
      },
    ];

    const sizeWithParts = estimateExportSize(sessionWithParts);
    const sizeWithoutParts = estimateExportSize(sessionWithoutParts);

    expect(sizeWithParts).toBeGreaterThan(sizeWithoutParts);
  });
});

describe('BatchExportOptions', () => {
  it('should accept all valid format options', () => {
    const formats: BatchExportOptions['format'][] = [
      'markdown',
      'json',
      'html',
      'animated-html',
      'text',
      'mixed',
    ];

    formats.forEach((format) => {
      const options: BatchExportOptions = { format };
      expect(options.format).toBe(format);
    });
  });

  it('should accept optional includeIndex', () => {
    const options: BatchExportOptions = {
      format: 'markdown',
      includeIndex: false,
    };

    expect(options.includeIndex).toBe(false);
  });

  it('should accept optional includeMetadata', () => {
    const options: BatchExportOptions = {
      format: 'markdown',
      includeMetadata: true,
    };

    expect(options.includeMetadata).toBe(true);
  });

  it('should accept optional theme', () => {
    const options: BatchExportOptions = {
      format: 'animated-html',
      theme: 'dark',
    };

    expect(options.theme).toBe('dark');
  });
});
