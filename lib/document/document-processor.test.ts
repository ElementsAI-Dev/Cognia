/**
 * Tests for Document Processor
 */

import {
  detectDocumentType,
  processDocument,
  processDocuments,
  extractSummary,
  getFileExtension,
  isTextFile,
  estimateTokenCount,
} from './document-processor';

jest.mock('@/lib/ai/embedding/chunking', () => ({
  chunkDocument: jest.fn((content: string) => {
    const chunks = content.length > 100
      ? [
          { id: 'chunk-0', content: 'chunk-0', index: 0, startOffset: 0, endOffset: 7 },
          { id: 'chunk-1', content: 'chunk-1', index: 1, startOffset: 7, endOffset: 14 },
        ]
      : [{ id: 'chunk-0', content: 'chunk-0', index: 0, startOffset: 0, endOffset: 7 }];

    return {
      chunks,
      totalChunks: chunks.length,
      originalLength: content.length,
      strategy: 'fixed',
    };
  }),
  chunkDocumentAsync: jest.fn(async (content: string, options: unknown, id?: string) =>
    Promise.resolve(
      (jest.requireActual('@/lib/ai/embedding/chunking') as typeof import('@/lib/ai/embedding/chunking')).chunkDocument(
        content,
        options as Parameters<typeof import('@/lib/ai/embedding/chunking').chunkDocument>[1],
        id
      )
    )
  ),
}));

describe('detectDocumentType', () => {
  describe('markdown files', () => {
    it('detects .md files', () => {
      expect(detectDocumentType('readme.md')).toBe('markdown');
    });

    it('detects .markdown files', () => {
      expect(detectDocumentType('doc.markdown')).toBe('markdown');
    });

    it('detects .mdx files', () => {
      expect(detectDocumentType('component.mdx')).toBe('markdown');
    });
  });

  describe('code files', () => {
    it('detects JavaScript files', () => {
      expect(detectDocumentType('app.js')).toBe('code');
      expect(detectDocumentType('app.jsx')).toBe('code');
    });

    it('detects TypeScript files', () => {
      expect(detectDocumentType('app.ts')).toBe('code');
      expect(detectDocumentType('app.tsx')).toBe('code');
    });

    it('detects Python files', () => {
      expect(detectDocumentType('script.py')).toBe('code');
    });

    it('detects Go files', () => {
      expect(detectDocumentType('main.go')).toBe('code');
    });

    it('detects Rust files', () => {
      expect(detectDocumentType('lib.rs')).toBe('code');
    });

    it('detects C/C++ files', () => {
      expect(detectDocumentType('main.c')).toBe('code');
      expect(detectDocumentType('main.cpp')).toBe('code');
      expect(detectDocumentType('header.h')).toBe('code');
      expect(detectDocumentType('header.hpp')).toBe('code');
    });

    it('detects Java files', () => {
      expect(detectDocumentType('Main.java')).toBe('code');
    });

    it('detects shell scripts', () => {
      expect(detectDocumentType('script.sh')).toBe('code');
      expect(detectDocumentType('script.bash')).toBe('code');
    });

    it('detects CSS/SCSS files', () => {
      expect(detectDocumentType('style.css')).toBe('code');
      expect(detectDocumentType('style.scss')).toBe('code');
    });

    it('detects XML files', () => {
      expect(detectDocumentType('config.xml')).toBe('code');
    });

    it('detects YAML files', () => {
      expect(detectDocumentType('config.yaml')).toBe('code');
      expect(detectDocumentType('config.yml')).toBe('code');
    });

    it('detects SQL files', () => {
      expect(detectDocumentType('query.sql')).toBe('code');
    });
  });

  describe('JSON files', () => {
    it('detects JSON files', () => {
      expect(detectDocumentType('package.json')).toBe('json');
    });
  });

  describe('text files', () => {
    it('detects .txt files', () => {
      expect(detectDocumentType('notes.txt')).toBe('text');
    });
  });

  describe('HTML files', () => {
    it('detects .html files', () => {
      expect(detectDocumentType('index.html')).toBe('html');
    });

    it('detects .htm files', () => {
      expect(detectDocumentType('page.htm')).toBe('html');
    });

    it('detects .xhtml files', () => {
      expect(detectDocumentType('doc.xhtml')).toBe('html');
    });
  });

  describe('PDF files', () => {
    it('detects .pdf files', () => {
      expect(detectDocumentType('document.pdf')).toBe('pdf');
    });
  });

  describe('Word documents', () => {
    it('detects .docx files', () => {
      expect(detectDocumentType('document.docx')).toBe('word');
    });

    it('detects .doc files', () => {
      expect(detectDocumentType('document.doc')).toBe('word');
    });
  });

  describe('Excel files', () => {
    it('detects .xlsx files', () => {
      expect(detectDocumentType('spreadsheet.xlsx')).toBe('excel');
    });

    it('detects .xls files', () => {
      expect(detectDocumentType('spreadsheet.xls')).toBe('excel');
    });
  });

  describe('CSV files', () => {
    it('detects .csv files', () => {
      expect(detectDocumentType('data.csv')).toBe('csv');
    });

    it('detects .tsv files', () => {
      expect(detectDocumentType('data.tsv')).toBe('csv');
    });
  });

  describe('unknown files', () => {
    it('returns unknown for unrecognized extensions', () => {
      expect(detectDocumentType('file.xyz')).toBe('unknown');
    });

    it('returns unknown for files without extension', () => {
      expect(detectDocumentType('Dockerfile')).toBe('unknown');
    });
  });
});

describe('processDocument', () => {
  it('processes markdown document', () => {
    const result = processDocument(
      'doc-1',
      'readme.md',
      '# Title\n\nContent here'
    );
    
    expect(result.id).toBe('doc-1');
    expect(result.filename).toBe('readme.md');
    expect(result.type).toBe('markdown');
    expect(result.metadata.language).toBe('markdown');
  });

  it('processes code document', () => {
    const result = processDocument(
      'doc-2',
      'app.ts',
      'function hello() { return "world"; }'
    );
    
    expect(result.type).toBe('code');
    expect(result.metadata.language).toBe('typescript');
  });

  it('processes JSON document', () => {
    const result = processDocument(
      'doc-3',
      'config.json',
      '{"key": "value", "array": [1, 2, 3]}'
    );
    
    expect(result.type).toBe('json');
    expect(result.metadata.language).toBe('json');
    expect(result.metadata.isArray).toBe(false);
    expect(result.metadata.keyCount).toBe(2);
  });

  it('handles JSON arrays', () => {
    const result = processDocument(
      'doc-4',
      'data.json',
      '[1, 2, 3]'
    );
    
    expect(result.metadata.isArray).toBe(true);
  });

  it('handles invalid JSON gracefully', () => {
    const result = processDocument(
      'doc-5',
      'bad.json',
      '{invalid json}'
    );
    
    expect(result.type).toBe('json');
    expect(result.metadata.keyCount).toBeUndefined();
  });

  it('calculates correct metadata', () => {
    const content = 'Line 1\nLine 2\nLine 3';
    const result = processDocument('doc-6', 'file.txt', content);
    
    expect(result.metadata.size).toBe(content.length);
    expect(result.metadata.lineCount).toBe(3);
    expect(result.metadata.wordCount).toBe(6);
  });

  it('extracts embeddable content when enabled', () => {
    const result = processDocument(
      'doc-7',
      'readme.md',
      '# Title\n\nContent',
      { extractEmbeddable: true }
    );
    
    expect(result.embeddableContent).toBeDefined();
  });

  it('generates chunks when requested', () => {
    const longContent = 'word '.repeat(500);
    const result = processDocument(
      'doc-8',
      'large.md',
      longContent,
      { generateChunks: true, chunkingOptions: { chunkSize: 100 } }
    );
    
    expect(result.chunks).toBeDefined();
    expect(result.chunks!.length).toBeGreaterThan(1);
  });

  it('skips chunk generation by default', () => {
    const result = processDocument('doc-9', 'file.txt', 'content');
    
    expect(result.chunks).toBeUndefined();
  });
});

describe('processDocuments', () => {
  it('processes multiple documents', () => {
    const docs = [
      { id: '1', filename: 'a.md', content: '# A' },
      { id: '2', filename: 'b.ts', content: 'const x = 1;' },
    ];
    
    const results = processDocuments(docs);
    
    expect(results).toHaveLength(2);
    expect(results[0].type).toBe('markdown');
    expect(results[1].type).toBe('code');
  });

  it('applies options to all documents', () => {
    const docs = [
      { id: '1', filename: 'a.md', content: 'word '.repeat(100) },
      { id: '2', filename: 'b.md', content: 'word '.repeat(100) },
    ];
    
    const results = processDocuments(docs, { generateChunks: true });
    
    results.forEach((result) => {
      expect(result.chunks).toBeDefined();
    });
  });

  it('handles empty array', () => {
    const results = processDocuments([]);
    
    expect(results).toHaveLength(0);
  });
});

// Note: processDocumentAsync tests are in a separate file (document-processor-async.test.ts)
// to avoid memory issues from loading heavy parser libraries in the same test run.
// The async processor is tested there with CSV processing tests.

describe('extractSummary', () => {
  it('returns full content when shorter than maxLength', () => {
    const content = 'Short content';
    const result = extractSummary(content, 200);
    
    expect(result).toBe('Short content');
  });

  it('truncates at sentence boundary', () => {
    const content = 'First sentence. Second sentence. Third sentence.';
    const result = extractSummary(content, 30);
    
    expect(result).toContain('First sentence.');
  });

  it('truncates at word boundary with ellipsis', () => {
    const content = 'A long content without sentence markers that needs truncation';
    const result = extractSummary(content, 30);
    
    expect(result.endsWith('...')).toBe(true);
  });

  it('handles question marks as sentence endings', () => {
    const content = 'Is this a question? Here is more content.';
    const result = extractSummary(content, 25);
    
    expect(result).toContain('?');
  });

  it('handles exclamation marks as sentence endings', () => {
    const content = 'Wow! That is amazing. More content here.';
    const result = extractSummary(content, 10);
    
    expect(result).toContain('!');
  });

  it('normalizes whitespace', () => {
    const content = 'Multiple   spaces   and\n\nnewlines';
    const result = extractSummary(content, 200);
    
    expect(result).not.toContain('  ');
    expect(result).not.toContain('\n');
  });

  it('uses default maxLength of 200', () => {
    const longContent = 'word '.repeat(100);
    const result = extractSummary(longContent);
    
    expect(result.length).toBeLessThanOrEqual(203);
  });
});

describe('getFileExtension', () => {
  it('returns extension for normal files', () => {
    expect(getFileExtension('file.txt')).toBe('txt');
  });

  it('returns last extension for multiple dots', () => {
    expect(getFileExtension('file.test.ts')).toBe('ts');
  });

  it('returns lowercase extension', () => {
    expect(getFileExtension('FILE.TXT')).toBe('txt');
  });

  it('returns empty string for files without extension', () => {
    expect(getFileExtension('Dockerfile')).toBe('');
  });

  it('handles dotfiles', () => {
    expect(getFileExtension('.gitignore')).toBe('');
  });
});

describe('isTextFile', () => {
  describe('text files', () => {
    it('returns true for .txt', () => {
      expect(isTextFile('file.txt')).toBe(true);
    });

    it('returns true for markdown', () => {
      expect(isTextFile('file.md')).toBe(true);
      expect(isTextFile('file.markdown')).toBe(true);
    });
  });

  describe('code files', () => {
    it('returns true for JavaScript', () => {
      expect(isTextFile('file.js')).toBe(true);
      expect(isTextFile('file.jsx')).toBe(true);
    });

    it('returns true for TypeScript', () => {
      expect(isTextFile('file.ts')).toBe(true);
      expect(isTextFile('file.tsx')).toBe(true);
    });

    it('returns true for Python', () => {
      expect(isTextFile('file.py')).toBe(true);
    });

    it('returns true for Go', () => {
      expect(isTextFile('file.go')).toBe(true);
    });

    it('returns true for Rust', () => {
      expect(isTextFile('file.rs')).toBe(true);
    });

    it('returns true for Java', () => {
      expect(isTextFile('file.java')).toBe(true);
    });
  });

  describe('config files', () => {
    it('returns true for JSON', () => {
      expect(isTextFile('package.json')).toBe(true);
    });

    it('returns true for YAML', () => {
      expect(isTextFile('config.yaml')).toBe(true);
      expect(isTextFile('config.yml')).toBe(true);
    });

    it('returns true for TOML', () => {
      expect(isTextFile('config.toml')).toBe(true);
    });

    it('returns true for XML', () => {
      expect(isTextFile('config.xml')).toBe(true);
    });
  });

  describe('dotfiles', () => {
    it('returns true for env files', () => {
      expect(isTextFile('.env')).toBe(true);
    });

    it('returns true for gitignore', () => {
      expect(isTextFile('.gitignore')).toBe(true);
    });
  });

  describe('binary files', () => {
    it('returns false for images', () => {
      expect(isTextFile('image.png')).toBe(false);
      expect(isTextFile('image.jpg')).toBe(false);
    });

    it('returns false for executables', () => {
      expect(isTextFile('app.exe')).toBe(false);
    });

    it('returns false for archives', () => {
      expect(isTextFile('file.zip')).toBe(false);
    });
  });
});

describe('estimateTokenCount', () => {
  it('estimates tokens for short text', () => {
    const result = estimateTokenCount('Hello world');
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(10);
  });

  it('estimates tokens for longer text', () => {
    const content = 'word '.repeat(100);
    const result = estimateTokenCount(content);
    expect(result).toBeGreaterThan(50);
  });

  it('returns 0 for empty string', () => {
    expect(estimateTokenCount('')).toBe(0);
  });

  it('uses roughly 4 characters per token', () => {
    const content = 'A'.repeat(100);
    const result = estimateTokenCount(content);
    expect(result).toBeCloseTo(25, 0);
  });
});
