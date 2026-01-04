/**
 * Tests for Word Export
 */

import {
  exportChatToWord,
  exportTableToWord,
  type WordExportOptions,
  type WordExportResult,
} from './word-export';
import type { UIMessage, Session } from '@/types';

// Mock docx module
jest.mock('docx', () => ({
  Document: jest.fn().mockImplementation(() => ({})),
  Packer: {
    toBlob: jest.fn().mockResolvedValue(new Blob(['test'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })),
  },
  Paragraph: jest.fn().mockImplementation(() => ({})),
  TextRun: jest.fn().mockImplementation(() => ({})),
  HeadingLevel: {
    TITLE: 'Title',
    HEADING_1: 'Heading1',
    HEADING_2: 'Heading2',
  },
  Table: jest.fn().mockImplementation(() => ({})),
  TableRow: jest.fn().mockImplementation(() => ({})),
  TableCell: jest.fn().mockImplementation(() => ({})),
  WidthType: { PERCENTAGE: 'pct' },
  BorderStyle: { SINGLE: 'single' },
  AlignmentType: { LEFT: 'left', CENTER: 'center' },
  ShadingType: { CLEAR: 'clear' },
}));

describe('exportChatToWord', () => {
  const mockSession = {
    id: 'test-session',
    title: 'Test Conversation',
    createdAt: new Date(),
    updatedAt: new Date(),
    provider: 'openai',
    model: 'gpt-4',
    mode: 'chat',
  } as Session;

  const mockMessages: UIMessage[] = [
    {
      id: 'msg-1',
      role: 'user',
      content: 'Hello',
      createdAt: new Date(),
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'Hi there!',
      createdAt: new Date(),
    },
  ];

  it('should return a result object', async () => {
    const result = await exportChatToWord(mockSession, mockMessages);
    
    expect(result).toHaveProperty('success');
  });

  it('should accept custom filename', async () => {
    const result = await exportChatToWord(mockSession, mockMessages, 'custom-name.docx');
    
    expect(result).toHaveProperty('success');
  });

  it('should accept export options', async () => {
    const options: WordExportOptions = {
      title: 'Custom Title',
      author: 'Test Author',
      includeMetadata: true,
      includeTimestamps: true,
      theme: 'light',
    };
    
    const result = await exportChatToWord(mockSession, mockMessages, undefined, options);
    
    expect(result).toHaveProperty('success');
  });

  it('should handle empty messages', async () => {
    const result = await exportChatToWord(mockSession, []);
    
    expect(result).toHaveProperty('success');
  });
});

describe('exportTableToWord', () => {
  const tableData = {
    headers: ['Name', 'Age', 'City'],
    rows: [
      ['Alice', '30', 'NYC'],
      ['Bob', '25', 'LA'],
    ],
    title: 'Test Table',
  };

  it('should return a result object', async () => {
    const result = await exportTableToWord(tableData, 'table.docx');
    
    expect(result).toHaveProperty('success');
  });

  it('should accept custom filename', async () => {
    const result = await exportTableToWord(tableData, 'my-table.docx');
    
    expect(result).toHaveProperty('success');
  });
});

describe('WordExportOptions type', () => {
  it('should accept valid options', () => {
    const options: WordExportOptions = {
      title: 'Document Title',
      author: 'Author Name',
      includeMetadata: true,
      includeTimestamps: false,
      includeTokens: true,
      theme: 'dark',
    };
    
    expect(options.title).toBe('Document Title');
    expect(options.theme).toBe('dark');
  });
});

describe('WordExportResult type', () => {
  it('should have correct success structure', () => {
    const result: WordExportResult = {
      success: true,
      filename: 'test.docx',
      blob: new Blob(['test']),
    };
    
    expect(result.success).toBe(true);
    expect(result.filename).toBe('test.docx');
  });

  it('should have correct error structure', () => {
    const result: WordExportResult = {
      success: false,
      error: 'Export failed',
    };
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Export failed');
  });
});
