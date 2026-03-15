/**
 * Tests for Knowledge Base Utilities
 */

import { FILE_TYPE_ICONS, FILE_TYPE_COLORS, detectFileType } from './knowledge-base-utils';

// Mock detectDocumentType
jest.mock('@/lib/document', () => ({
  detectDocumentType: (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const map: Record<string, string> = {
      md: 'markdown', py: 'code', ts: 'code', js: 'code',
      json: 'json', pdf: 'pdf', docx: 'word', docm: 'word', odt: 'word', xlsx: 'excel', xlsm: 'excel', ods: 'excel',
      csv: 'csv', html: 'html', txt: 'text',
      pptx: 'presentation', ppt: 'presentation', pptm: 'presentation', odp: 'presentation', rtf: 'rtf', epub: 'epub',
    };
    return map[ext] || 'unknown';
  },
  mapDocumentTypeToKnowledgeFileType: (type: string) => (type === 'unknown' ? 'text' : type),
}));

describe('FILE_TYPE_ICONS', () => {
  it('should have icons for all expected file types', () => {
    const expectedTypes = [
      'text', 'pdf', 'code', 'markdown', 'json', 'word', 'excel', 'csv', 'html',
      'presentation', 'rtf', 'epub',
    ];
    for (const type of expectedTypes) {
      expect(FILE_TYPE_ICONS[type]).toBeDefined();
    }
  });

  it('each icon should be a valid React component', () => {
    for (const icon of Object.values(FILE_TYPE_ICONS)) {
      // Lucide icons can be functions or forwardRef objects
      expect(icon).toBeDefined();
      expect(typeof icon === 'function' || typeof icon === 'object').toBe(true);
    }
  });
});

describe('FILE_TYPE_COLORS', () => {
  it('should have colors for all expected file types', () => {
    const expectedTypes = [
      'text', 'pdf', 'code', 'markdown', 'json', 'word', 'excel', 'csv', 'html',
      'presentation', 'rtf', 'epub',
    ];
    for (const type of expectedTypes) {
      expect(FILE_TYPE_COLORS[type]).toBeDefined();
      expect(typeof FILE_TYPE_COLORS[type]).toBe('string');
      expect(FILE_TYPE_COLORS[type].length).toBeGreaterThan(0);
    }
  });

  it('each color class should contain bg- and text-', () => {
    for (const colorClass of Object.values(FILE_TYPE_COLORS)) {
      expect(colorClass).toContain('bg-');
      expect(colorClass).toContain('text-');
    }
  });
});

describe('detectFileType', () => {
  it('should detect markdown files', () => {
    expect(detectFileType('readme.md')).toBe('markdown');
  });

  it('should detect code files', () => {
    expect(detectFileType('app.ts')).toBe('code');
    expect(detectFileType('main.py')).toBe('code');
    expect(detectFileType('index.js')).toBe('code');
  });

  it('should detect JSON files', () => {
    expect(detectFileType('data.json')).toBe('json');
  });

  it('should detect PDF files', () => {
    expect(detectFileType('document.pdf')).toBe('pdf');
  });

  it('should detect Word files', () => {
    expect(detectFileType('report.docx')).toBe('word');
    expect(detectFileType('template.docm')).toBe('word');
    expect(detectFileType('notes.odt')).toBe('word');
  });

  it('should detect Excel files', () => {
    expect(detectFileType('data.xlsx')).toBe('excel');
    expect(detectFileType('data.xlsm')).toBe('excel');
    expect(detectFileType('data.ods')).toBe('excel');
  });

  it('should detect CSV files', () => {
    expect(detectFileType('data.csv')).toBe('csv');
  });

  it('should detect HTML files', () => {
    expect(detectFileType('page.html')).toBe('html');
  });

  it('should detect presentation files', () => {
    expect(detectFileType('deck.pptx')).toBe('presentation');
    expect(detectFileType('legacy.ppt')).toBe('presentation');
    expect(detectFileType('deck.pptm')).toBe('presentation');
    expect(detectFileType('deck.odp')).toBe('presentation');
  });

  it('should detect RTF files', () => {
    expect(detectFileType('notes.rtf')).toBe('rtf');
  });

  it('should detect EPUB files', () => {
    expect(detectFileType('book.epub')).toBe('epub');
  });

  it('should detect plain text files', () => {
    expect(detectFileType('notes.txt')).toBe('text');
  });

  it('should fallback to text for unknown extensions', () => {
    expect(detectFileType('file.xyz')).toBe('text');
  });

  it('should detect JSON from content when extension is unknown', () => {
    expect(detectFileType('data.unknown', '{"key": "value"}')).toBe('json');
    expect(detectFileType('data.unknown', '[1, 2, 3]')).toBe('json');
  });

  it('should detect markdown from content when extension is unknown', () => {
    expect(detectFileType('file.unknown', '# Heading')).toBe('markdown');
    expect(detectFileType('file.unknown', 'Some text with ```code```')).toBe('markdown');
  });

  it('should return text when no detection matches', () => {
    expect(detectFileType('file.unknown', 'plain text content')).toBe('text');
  });
});
