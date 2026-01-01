/**
 * Jupyter Parser Tests
 */

import {
  parseNotebook,
  getCellSource,
  getCellTextOutput,
  getCellHtmlOutput,
  getCellImageOutput,
  getNotebookLanguage,
  notebookToScript,
  notebookToMarkdown,
  createEmptyNotebook,
  createCodeCell,
  createMarkdownCell,
  addCell,
  removeCell,
  moveCell,
  updateCell,
  clearAllOutputs,
  serializeNotebook,
  isValidNotebook,
} from './parser';
import type { JupyterCell } from '@/types';

// Sample notebook JSON for testing
const sampleNotebookJson = JSON.stringify({
  cells: [
    {
      cell_type: 'markdown',
      source: ['# Test Notebook\n', 'This is a test.'],
      metadata: {},
    },
    {
      cell_type: 'code',
      source: 'print("Hello, World!")',
      outputs: [
        {
          output_type: 'stream',
          name: 'stdout',
          text: 'Hello, World!\n',
        },
      ],
      execution_count: 1,
      metadata: {},
    },
    {
      cell_type: 'code',
      source: ['x = 1 + 2\n', 'x'],
      outputs: [
        {
          output_type: 'execute_result',
          data: {
            'text/plain': '3',
          },
          execution_count: 2,
        },
      ],
      execution_count: 2,
      metadata: {},
    },
  ],
  metadata: {
    kernelspec: {
      name: 'python3',
      language: 'python',
      display_name: 'Python 3',
    },
    language_info: {
      name: 'python',
      version: '3.10.0',
    },
  },
  nbformat: 4,
  nbformat_minor: 5,
});

describe('Jupyter Parser', () => {
  describe('parseNotebook', () => {
    it('should parse a valid notebook', () => {
      const notebook = parseNotebook(sampleNotebookJson);
      expect(notebook.cells).toHaveLength(3);
      expect(notebook.nbformat).toBe(4);
      expect(notebook.metadata.kernelspec?.language).toBe('python');
    });

    it('should normalize cell source from array to string', () => {
      const notebook = parseNotebook(sampleNotebookJson);
      expect(typeof notebook.cells[0].source).toBe('string');
      expect(notebook.cells[0].source).toBe('# Test Notebook\nThis is a test.');
    });

    it('should throw error for invalid JSON', () => {
      expect(() => parseNotebook('not json')).toThrow('Invalid notebook: not valid JSON');
    });

    it('should throw error for missing cells array', () => {
      expect(() => parseNotebook(JSON.stringify({ nbformat: 4 }))).toThrow(
        'Invalid notebook: missing cells array'
      );
    });

    it('should throw error for missing nbformat', () => {
      expect(() => parseNotebook(JSON.stringify({ cells: [] }))).toThrow(
        'Invalid notebook: missing nbformat'
      );
    });

    it('should ensure code cells have outputs array', () => {
      const notebookJson = JSON.stringify({
        cells: [{ cell_type: 'code', source: 'x = 1' }],
        nbformat: 4,
        nbformat_minor: 5,
        metadata: {},
      });
      const notebook = parseNotebook(notebookJson);
      expect(notebook.cells[0].outputs).toEqual([]);
    });

    it('should set execution_count to null if not provided', () => {
      const notebookJson = JSON.stringify({
        cells: [{ cell_type: 'code', source: 'x = 1' }],
        nbformat: 4,
        nbformat_minor: 5,
        metadata: {},
      });
      const notebook = parseNotebook(notebookJson);
      expect(notebook.cells[0].execution_count).toBeNull();
    });
  });

  describe('getCellSource', () => {
    it('should return source as string', () => {
      const cell: JupyterCell = { cell_type: 'code', source: 'print(1)' };
      expect(getCellSource(cell)).toBe('print(1)');
    });

    it('should join array source', () => {
      const cell: JupyterCell = { cell_type: 'code', source: ['line1\n', 'line2'] };
      expect(getCellSource(cell)).toBe('line1\nline2');
    });

    it('should return empty string for undefined source', () => {
      const cell: JupyterCell = { cell_type: 'code', source: '' };
      expect(getCellSource(cell)).toBe('');
    });
  });

  describe('getCellTextOutput', () => {
    it('should return empty string for cells without outputs', () => {
      const cell: JupyterCell = { cell_type: 'code', source: '' };
      expect(getCellTextOutput(cell)).toBe('');
    });

    it('should extract stream output', () => {
      const cell: JupyterCell = {
        cell_type: 'code',
        source: '',
        outputs: [{ output_type: 'stream', name: 'stdout', text: 'Hello' }],
      };
      expect(getCellTextOutput(cell)).toBe('Hello');
    });

    it('should extract execute_result text/plain', () => {
      const cell: JupyterCell = {
        cell_type: 'code',
        source: '',
        outputs: [
          { output_type: 'execute_result', data: { 'text/plain': '42' }, execution_count: 1 },
        ],
      };
      expect(getCellTextOutput(cell)).toBe('42');
    });

    it('should extract error output', () => {
      const cell: JupyterCell = {
        cell_type: 'code',
        source: '',
        outputs: [
          {
            output_type: 'error',
            ename: 'ValueError',
            evalue: 'test error',
            traceback: ['Traceback...'],
          },
        ],
      };
      const output = getCellTextOutput(cell);
      expect(output).toContain('ValueError: test error');
      expect(output).toContain('Traceback...');
    });

    it('should join array text in stream output', () => {
      const cell: JupyterCell = {
        cell_type: 'code',
        source: '',
        outputs: [{ output_type: 'stream', name: 'stdout', text: ['line1\n', 'line2'] }],
      };
      expect(getCellTextOutput(cell)).toBe('line1\nline2');
    });
  });

  describe('getCellHtmlOutput', () => {
    it('should return null for cells without outputs', () => {
      const cell: JupyterCell = { cell_type: 'code', source: '' };
      expect(getCellHtmlOutput(cell)).toBeNull();
    });

    it('should return null if no HTML output exists', () => {
      const cell: JupyterCell = {
        cell_type: 'code',
        source: '',
        outputs: [{ output_type: 'stream', text: 'plain text' }],
      };
      expect(getCellHtmlOutput(cell)).toBeNull();
    });

    it('should extract text/html from display_data', () => {
      const cell: JupyterCell = {
        cell_type: 'code',
        source: '',
        outputs: [
          { output_type: 'display_data', data: { 'text/html': '<b>Bold</b>' } },
        ],
      };
      expect(getCellHtmlOutput(cell)).toBe('<b>Bold</b>');
    });

    it('should join array HTML content', () => {
      const cell: JupyterCell = {
        cell_type: 'code',
        source: '',
        outputs: [
          { output_type: 'execute_result', data: { 'text/html': ['<p>', 'text', '</p>'] }, execution_count: 1 },
        ],
      };
      expect(getCellHtmlOutput(cell)).toBe('<p>text</p>');
    });
  });

  describe('getCellImageOutput', () => {
    it('should return null for cells without outputs', () => {
      const cell: JupyterCell = { cell_type: 'code', source: '' };
      expect(getCellImageOutput(cell)).toBeNull();
    });

    it('should extract image/png', () => {
      const cell: JupyterCell = {
        cell_type: 'code',
        source: '',
        outputs: [
          { output_type: 'display_data', data: { 'image/png': 'base64data' } },
        ],
      };
      const result = getCellImageOutput(cell);
      expect(result).toEqual({ mimeType: 'image/png', data: 'base64data' });
    });

    it('should prioritize PNG over JPEG', () => {
      const cell: JupyterCell = {
        cell_type: 'code',
        source: '',
        outputs: [
          {
            output_type: 'display_data',
            data: { 'image/png': 'pngdata', 'image/jpeg': 'jpegdata' },
          },
        ],
      };
      const result = getCellImageOutput(cell);
      expect(result?.mimeType).toBe('image/png');
    });

    it('should handle SVG', () => {
      const cell: JupyterCell = {
        cell_type: 'code',
        source: '',
        outputs: [
          { output_type: 'display_data', data: { 'image/svg+xml': '<svg></svg>' } },
        ],
      };
      const result = getCellImageOutput(cell);
      expect(result).toEqual({ mimeType: 'image/svg+xml', data: '<svg></svg>' });
    });
  });

  describe('getNotebookLanguage', () => {
    it('should return language from kernelspec', () => {
      const notebook = parseNotebook(sampleNotebookJson);
      expect(getNotebookLanguage(notebook)).toBe('python');
    });

    it('should fallback to language_info', () => {
      const notebookJson = JSON.stringify({
        cells: [],
        metadata: { language_info: { name: 'julia' } },
        nbformat: 4,
        nbformat_minor: 5,
      });
      const notebook = parseNotebook(notebookJson);
      expect(getNotebookLanguage(notebook)).toBe('julia');
    });

    it('should default to python', () => {
      const notebookJson = JSON.stringify({
        cells: [],
        metadata: {},
        nbformat: 4,
        nbformat_minor: 5,
      });
      const notebook = parseNotebook(notebookJson);
      expect(getNotebookLanguage(notebook)).toBe('python');
    });
  });

  describe('notebookToScript', () => {
    it('should extract only code cells', () => {
      const notebook = parseNotebook(sampleNotebookJson);
      const script = notebookToScript(notebook);
      expect(script).toContain('print("Hello, World!")');
      expect(script).toContain('x = 1 + 2');
      expect(script).not.toContain('# Test Notebook');
    });

    it('should join code cells with double newlines', () => {
      const notebook = parseNotebook(sampleNotebookJson);
      const script = notebookToScript(notebook);
      expect(script).toContain('\n\n');
    });
  });

  describe('notebookToMarkdown', () => {
    it('should include markdown cells as-is', () => {
      const notebook = parseNotebook(sampleNotebookJson);
      const md = notebookToMarkdown(notebook);
      expect(md).toContain('# Test Notebook');
    });

    it('should wrap code cells in fenced blocks', () => {
      const notebook = parseNotebook(sampleNotebookJson);
      const md = notebookToMarkdown(notebook);
      expect(md).toContain('```python');
      expect(md).toContain('print("Hello, World!")');
      expect(md).toContain('```');
    });

    it('should include output in markdown', () => {
      const notebook = parseNotebook(sampleNotebookJson);
      const md = notebookToMarkdown(notebook);
      expect(md).toContain('**Output:**');
      expect(md).toContain('Hello, World!');
    });
  });

  describe('createEmptyNotebook', () => {
    it('should create a valid empty notebook', () => {
      const notebook = createEmptyNotebook();
      expect(notebook.cells).toEqual([]);
      expect(notebook.nbformat).toBe(4);
      expect(notebook.metadata.kernelspec?.language).toBe('python');
    });

    it('should use provided language', () => {
      const notebook = createEmptyNotebook('r');
      expect(notebook.metadata.kernelspec?.language).toBe('r');
      expect(notebook.metadata.language_info?.name).toBe('r');
    });
  });

  describe('createCodeCell', () => {
    it('should create a code cell with given source', () => {
      const cell = createCodeCell('print(1)');
      expect(cell.cell_type).toBe('code');
      expect(cell.source).toBe('print(1)');
      expect(cell.outputs).toEqual([]);
      expect(cell.execution_count).toBeNull();
    });

    it('should create empty code cell when no source provided', () => {
      const cell = createCodeCell();
      expect(cell.source).toBe('');
    });
  });

  describe('createMarkdownCell', () => {
    it('should create a markdown cell with given source', () => {
      const cell = createMarkdownCell('# Header');
      expect(cell.cell_type).toBe('markdown');
      expect(cell.source).toBe('# Header');
    });
  });

  describe('addCell', () => {
    it('should add cell to end by default', () => {
      const notebook = createEmptyNotebook();
      const cell = createCodeCell('x = 1');
      const result = addCell(notebook, cell);
      expect(result.cells).toHaveLength(1);
      expect(result.cells[0].source).toBe('x = 1');
    });

    it('should add cell at specified index', () => {
      let notebook = createEmptyNotebook();
      notebook = addCell(notebook, createCodeCell('first'));
      notebook = addCell(notebook, createCodeCell('third'));
      notebook = addCell(notebook, createCodeCell('second'), 1);
      expect(notebook.cells[1].source).toBe('second');
    });

    it('should not mutate original notebook', () => {
      const notebook = createEmptyNotebook();
      const cell = createCodeCell('x = 1');
      const result = addCell(notebook, cell);
      expect(notebook.cells).toHaveLength(0);
      expect(result.cells).toHaveLength(1);
    });
  });

  describe('removeCell', () => {
    it('should remove cell at index', () => {
      let notebook = createEmptyNotebook();
      notebook = addCell(notebook, createCodeCell('first'));
      notebook = addCell(notebook, createCodeCell('second'));
      notebook = addCell(notebook, createCodeCell('third'));
      notebook = removeCell(notebook, 1);
      expect(notebook.cells).toHaveLength(2);
      expect(notebook.cells[1].source).toBe('third');
    });
  });

  describe('moveCell', () => {
    it('should move cell from one index to another', () => {
      let notebook = createEmptyNotebook();
      notebook = addCell(notebook, createCodeCell('a'));
      notebook = addCell(notebook, createCodeCell('b'));
      notebook = addCell(notebook, createCodeCell('c'));
      notebook = moveCell(notebook, 0, 2);
      expect(notebook.cells[0].source).toBe('b');
      expect(notebook.cells[1].source).toBe('c');
      expect(notebook.cells[2].source).toBe('a');
    });
  });

  describe('updateCell', () => {
    it('should update cell at index', () => {
      let notebook = createEmptyNotebook();
      notebook = addCell(notebook, createCodeCell('old'));
      notebook = updateCell(notebook, 0, { source: 'new' });
      expect(notebook.cells[0].source).toBe('new');
    });

    it('should preserve other cell properties', () => {
      let notebook = createEmptyNotebook();
      notebook = addCell(notebook, createCodeCell('code'));
      notebook = updateCell(notebook, 0, { execution_count: 5 });
      expect(notebook.cells[0].source).toBe('code');
      expect(notebook.cells[0].execution_count).toBe(5);
    });
  });

  describe('clearAllOutputs', () => {
    it('should clear outputs from all code cells', () => {
      const notebook = parseNotebook(sampleNotebookJson);
      expect(notebook.cells[1].outputs?.length).toBeGreaterThan(0);
      const cleared = clearAllOutputs(notebook);
      expect(cleared.cells[1].outputs).toEqual([]);
      expect(cleared.cells[1].execution_count).toBeNull();
    });

    it('should not affect markdown cells', () => {
      const notebook = parseNotebook(sampleNotebookJson);
      const cleared = clearAllOutputs(notebook);
      expect(cleared.cells[0].cell_type).toBe('markdown');
      expect(cleared.cells[0].outputs).toBeUndefined();
    });
  });

  describe('serializeNotebook', () => {
    it('should serialize notebook to JSON string', () => {
      const notebook = createEmptyNotebook();
      const json = serializeNotebook(notebook);
      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed.nbformat).toBe(4);
    });

    it('should produce pretty-printed JSON', () => {
      const notebook = createEmptyNotebook();
      const json = serializeNotebook(notebook);
      expect(json).toContain('\n');
    });
  });

  describe('isValidNotebook', () => {
    it('should return true for valid notebook', () => {
      expect(isValidNotebook(sampleNotebookJson)).toBe(true);
    });

    it('should return false for invalid JSON', () => {
      expect(isValidNotebook('not json')).toBe(false);
    });

    it('should return false for missing cells', () => {
      expect(isValidNotebook(JSON.stringify({ nbformat: 4, nbformat_minor: 5 }))).toBe(false);
    });

    it('should return false for missing nbformat', () => {
      expect(isValidNotebook(JSON.stringify({ cells: [] }))).toBe(false);
    });

    it('should return false for missing nbformat_minor', () => {
      expect(isValidNotebook(JSON.stringify({ cells: [], nbformat: 4 }))).toBe(false);
    });
  });
});
