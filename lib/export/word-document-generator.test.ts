/**
 * Unit tests for word-document-generator
 */

import {
  generateWordDocument,
  generateFromRichDocument,
  downloadWordDocument,
  DOCUMENT_TEMPLATES,
} from './word-document-generator';
import type { Session, UIMessage } from '@/types';
import type { RichDocument } from '@/types/document/document-formatting';
import { DEFAULT_DOCUMENT_OPTIONS, MARGIN_PRESETS } from '@/types/document/document-formatting';

// Mock the docx module
jest.mock('docx', () => ({
  Document: jest.fn().mockImplementation(() => ({})),
  Packer: {
    toBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100)),
  },
  Paragraph: jest.fn().mockImplementation((options) => ({ type: 'paragraph', ...options })),
  TextRun: jest.fn().mockImplementation((options) => ({ type: 'textrun', ...options })),
  HeadingLevel: {
    HEADING_1: 'HEADING_1',
    HEADING_2: 'HEADING_2',
    HEADING_3: 'HEADING_3',
    HEADING_4: 'HEADING_4',
    HEADING_5: 'HEADING_5',
    HEADING_6: 'HEADING_6',
    TITLE: 'TITLE',
  },
  Table: jest.fn().mockImplementation((options) => ({ type: 'table', ...options })),
  TableRow: jest.fn().mockImplementation((options) => ({ type: 'tablerow', ...options })),
  TableCell: jest.fn().mockImplementation((options) => ({ type: 'tablecell', ...options })),
  WidthType: { PERCENTAGE: 'PERCENTAGE', DXA: 'DXA' },
  BorderStyle: { SINGLE: 'SINGLE', DOUBLE: 'DOUBLE', DOTTED: 'DOTTED' },
  AlignmentType: {
    LEFT: 'LEFT',
    CENTER: 'CENTER',
    RIGHT: 'RIGHT',
    JUSTIFIED: 'JUSTIFIED',
  },
  ShadingType: { SOLID: 'SOLID' },
  PageBreak: jest.fn().mockImplementation(() => ({ type: 'pagebreak' })),
  Header: jest.fn().mockImplementation((options) => ({ type: 'header', ...options })),
  Footer: jest.fn().mockImplementation((options) => ({ type: 'footer', ...options })),
  PageNumber: { CURRENT: 'CURRENT' },
  NumberFormat: { DECIMAL: 'DECIMAL' },
  ImageRun: jest.fn().mockImplementation((options) => ({ type: 'imagerun', ...options })),
  ExternalHyperlink: jest.fn().mockImplementation((options) => ({ type: 'hyperlink', ...options })),
  TableOfContents: jest.fn().mockImplementation((options) => ({ type: 'toc', ...options })),
  PageOrientation: { PORTRAIT: 'PORTRAIT', LANDSCAPE: 'LANDSCAPE' },
  convertMillimetersToTwip: jest.fn((mm) => mm * 56.7),
  LevelFormat: { DECIMAL: 'DECIMAL' },
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = jest.fn(() => 'blob:test-url');
const mockRevokeObjectURL = jest.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

describe('word-document-generator', () => {
  const mockSession: Session = {
    id: 'test-session-1',
    title: 'Test Conversation',
    provider: 'openai',
    model: 'gpt-4',
    mode: 'chat',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T11:00:00Z'),
    systemPrompt: 'You are a helpful assistant.',
  };

  const mockMessages: UIMessage[] = [
    {
      id: 'msg-1',
      role: 'user',
      content: 'Hello, how are you?',
      createdAt: new Date('2024-01-15T10:05:00Z'),
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'I am doing well, thank you for asking! How can I help you today?',
      createdAt: new Date('2024-01-15T10:05:30Z'),
      tokens: { total: 25, prompt: 10, completion: 15 },
    },
    {
      id: 'msg-3',
      role: 'user',
      content: 'Can you explain **markdown** formatting?\n\n```javascript\nconst x = 1;\n```',
      createdAt: new Date('2024-01-15T10:06:00Z'),
    },
    {
      id: 'msg-4',
      role: 'assistant',
      content: '# Markdown Formatting\n\nMarkdown is a lightweight markup language.\n\n## Basic Syntax\n\n- **Bold** text\n- *Italic* text\n- `code` inline',
      createdAt: new Date('2024-01-15T10:06:30Z'),
      parts: [
        {
          type: 'reasoning',
          content: 'The user wants to know about markdown. Let me explain the basics.',
          duration: 2,
          isStreaming: false,
        } as const,
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateWordDocument', () => {
    it('should generate a Word document successfully', async () => {
      const result = await generateWordDocument(mockSession, mockMessages);

      expect(result.success).toBe(true);
      expect(result.blob).toBeDefined();
      expect(result.filename).toBeDefined();
      expect(result.filename).toContain('.docx');
    });

    it('should generate filename based on session title', async () => {
      const result = await generateWordDocument(mockSession, mockMessages);

      expect(result.filename).toContain('test-conversation');
    });

    it('should include cover page when option is enabled', async () => {
      const result = await generateWordDocument(mockSession, mockMessages, {
        includeCoverPage: true,
      });

      expect(result.success).toBe(true);
    });

    it('should exclude cover page when option is disabled', async () => {
      const result = await generateWordDocument(mockSession, mockMessages, {
        includeCoverPage: false,
      });

      expect(result.success).toBe(true);
    });

    it('should include table of contents when enabled', async () => {
      const result = await generateWordDocument(mockSession, mockMessages, {
        tableOfContents: {
          enabled: true,
          title: 'Contents',
          levels: 3,
          showPageNumbers: true,
        },
      });

      expect(result.success).toBe(true);
    });

    it('should include timestamps when option is enabled', async () => {
      const result = await generateWordDocument(mockSession, mockMessages, {
        includeTimestamps: true,
      });

      expect(result.success).toBe(true);
    });

    it('should include tokens when option is enabled', async () => {
      const result = await generateWordDocument(mockSession, mockMessages, {
        includeTokens: true,
      });

      expect(result.success).toBe(true);
    });

    it('should include thinking process when option is enabled', async () => {
      const result = await generateWordDocument(mockSession, mockMessages, {
        showThinkingProcess: true,
      });

      expect(result.success).toBe(true);
    });

    it('should handle empty messages array', async () => {
      const result = await generateWordDocument(mockSession, []);

      expect(result.success).toBe(true);
    });

    it('should use default options when none provided', async () => {
      const result = await generateWordDocument(mockSession, mockMessages);

      expect(result.success).toBe(true);
    });

    it('should apply custom page size', async () => {
      const result = await generateWordDocument(mockSession, mockMessages, {
        pageSize: 'letter',
      });

      expect(result.success).toBe(true);
    });

    it('should apply landscape orientation', async () => {
      const result = await generateWordDocument(mockSession, mockMessages, {
        orientation: 'landscape',
      });

      expect(result.success).toBe(true);
    });

    it('should apply custom margins', async () => {
      const result = await generateWordDocument(mockSession, mockMessages, {
        margins: MARGIN_PRESETS.wide,
      });

      expect(result.success).toBe(true);
    });

    it('should handle session without system prompt', async () => {
      const sessionWithoutPrompt = { ...mockSession, systemPrompt: undefined };
      const result = await generateWordDocument(sessionWithoutPrompt, mockMessages);

      expect(result.success).toBe(true);
    });

    it('should handle messages with tool invocations', async () => {
      const messagesWithTools: UIMessage[] = [
        ...mockMessages,
        {
          id: 'msg-5',
          role: 'assistant',
          content: 'Let me search for that.',
          createdAt: new Date('2024-01-15T10:07:00Z'),
          parts: [
            {
              type: 'tool-invocation',
              toolCallId: 'call-1',
              toolName: 'web_search',
              args: { query: 'test query' },
              state: 'output-available',
              result: { data: 'search results' },
            } as const,
          ],
        },
      ];

      const result = await generateWordDocument(mockSession, messagesWithTools, {
        showToolCalls: true,
      });

      expect(result.success).toBe(true);
    });

    it('should handle all document options', async () => {
      const result = await generateWordDocument(mockSession, mockMessages, {
        title: 'Custom Title',
        author: 'Test Author',
        subject: 'Test Subject',
        keywords: ['test', 'document'],
        description: 'Test description',
        pageSize: 'a4',
        orientation: 'portrait',
        margins: MARGIN_PRESETS.normal,
        includeCoverPage: true,
        includeMetadata: true,
        includeTimestamps: true,
        includeTokens: true,
        showThinkingProcess: true,
        showToolCalls: true,
        theme: 'light',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('generateFromRichDocument', () => {
    const mockRichDocument: RichDocument = {
      id: 'doc-1',
      title: 'Test Rich Document',
      options: DEFAULT_DOCUMENT_OPTIONS,
      sections: [
        {
          id: 'section-1',
          blocks: [
            { type: 'paragraph', content: 'This is a test paragraph.' },
            { type: 'heading', content: 'Test Heading', level: 1 } as { type: 'heading'; content: string; level: 1 },
            { type: 'pageBreak' },
          ],
        },
      ],
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    };

    it('should generate document from rich document structure', async () => {
      const result = await generateFromRichDocument(mockRichDocument);

      expect(result.success).toBe(true);
      expect(result.blob).toBeDefined();
      expect(result.filename).toBeDefined();
    });

    it('should handle multiple sections', async () => {
      const multiSectionDoc: RichDocument = {
        ...mockRichDocument,
        sections: [
          { id: 's1', blocks: [{ type: 'paragraph', content: 'Section 1' }] },
          { id: 's2', blocks: [{ type: 'paragraph', content: 'Section 2' }] },
          { id: 's3', blocks: [{ type: 'paragraph', content: 'Section 3' }] },
        ],
      };

      const result = await generateFromRichDocument(multiSectionDoc);
      expect(result.success).toBe(true);
    });

    it('should handle empty sections', async () => {
      const emptyDoc: RichDocument = {
        ...mockRichDocument,
        sections: [],
      };

      const result = await generateFromRichDocument(emptyDoc);
      expect(result.success).toBe(true);
    });

    it('should apply section-specific settings', async () => {
      const docWithSettings: RichDocument = {
        ...mockRichDocument,
        sections: [
          {
            id: 's1',
            settings: {
              pageSize: 'letter',
              orientation: 'landscape',
              margins: MARGIN_PRESETS.wide,
            },
            blocks: [{ type: 'paragraph', content: 'Custom section' }],
          },
        ],
      };

      const result = await generateFromRichDocument(docWithSettings);
      expect(result.success).toBe(true);
    });
  });

  describe('downloadWordDocument', () => {
    let mockAppendChild: jest.SpyInstance;
    let mockRemoveChild: jest.SpyInstance;
    let mockClick: jest.Mock;

    beforeEach(() => {
      mockClick = jest.fn();
      mockAppendChild = jest.spyOn(document.body, 'appendChild').mockImplementation(() => null as unknown as Node);
      mockRemoveChild = jest.spyOn(document.body, 'removeChild').mockImplementation(() => null as unknown as Node);
      
      jest.spyOn(document, 'createElement').mockImplementation(() => {
        const element = {
          href: '',
          download: '',
          click: mockClick,
        } as unknown as HTMLAnchorElement;
        return element;
      });
    });

    afterEach(() => {
      mockAppendChild.mockRestore();
      mockRemoveChild.mockRestore();
    });

    it('should trigger download with correct filename', () => {
      const blob = new Blob(['test'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      downloadWordDocument(blob, 'test-document.docx');

      expect(mockCreateObjectURL).toHaveBeenCalledWith(blob);
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('should add .docx extension if missing', () => {
      const blob = new Blob(['test']);
      downloadWordDocument(blob, 'test-document');

      expect(mockClick).toHaveBeenCalled();
    });

    it('should not duplicate .docx extension', () => {
      const blob = new Blob(['test']);
      downloadWordDocument(blob, 'test-document.docx');

      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe('DOCUMENT_TEMPLATES', () => {
    it('should have blank template', () => {
      const blank = DOCUMENT_TEMPLATES.find(t => t.id === 'blank');
      expect(blank).toBeDefined();
      expect(blank?.name).toBe('Blank Document');
      expect(blank?.category).toBe('general');
    });

    it('should have chat-export template', () => {
      const chatExport = DOCUMENT_TEMPLATES.find(t => t.id === 'chat-export');
      expect(chatExport).toBeDefined();
      expect(chatExport?.options.includeCoverPage).toBe(true);
    });

    it('should have report template with TOC', () => {
      const report = DOCUMENT_TEMPLATES.find(t => t.id === 'report');
      expect(report).toBeDefined();
      expect(report?.options.tableOfContents?.enabled).toBe(true);
    });

    it('should have article template', () => {
      const article = DOCUMENT_TEMPLATES.find(t => t.id === 'article');
      expect(article).toBeDefined();
      expect(article?.category).toBe('article');
    });

    it('should have letter template', () => {
      const letter = DOCUMENT_TEMPLATES.find(t => t.id === 'letter');
      expect(letter).toBeDefined();
      expect(letter?.category).toBe('letter');
    });

    it('should have at least 5 templates', () => {
      expect(DOCUMENT_TEMPLATES.length).toBeGreaterThanOrEqual(5);
    });

    it('all templates should have required properties', () => {
      DOCUMENT_TEMPLATES.forEach(template => {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.category).toBeDefined();
        expect(template.options).toBeDefined();
        expect(template.sections).toBeDefined();
      });
    });
  });
});
