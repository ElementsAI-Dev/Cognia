/**
 * JupyterRenderer Component Tests
 */

import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { JupyterRenderer } from './jupyter-renderer';

// Mock sandbox hooks to avoid infinite loop issues
jest.mock('@/hooks/sandbox', () => ({
  useSandbox: () => ({ isAvailable: false }),
  useCodeExecution: () => ({
    result: null,
    executing: false,
    error: null,
    quickExecute: jest.fn(),
    reset: jest.fn(),
  }),
  useSnippets: () => ({ createSnippet: jest.fn() }),
}));

jest.mock('@/hooks/sandbox/use-sandbox-db', () => ({
  useSandboxDb: () => ({
    snippets: [],
    refresh: jest.fn(),
    saveSnippet: jest.fn(),
    deleteSnippet: jest.fn(),
  }),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

// Sample notebook for testing
const sampleNotebook = JSON.stringify({
  cells: [
    {
      cell_type: 'markdown',
      source: '# Test Notebook\n\nThis is a test.',
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
      source: 'x = 1 + 2\nx',
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

// Messages for testing
const messages = {
  jupyterRenderer: {
    parseError: 'Failed to parse Jupyter notebook',
    cells: 'cells',
    runCell: 'Run cell',
    output: 'Output',
    outputs: 'outputs',
    codeCells: 'code cells',
    markdownCells: 'markdown cells',
    expandAll: 'Expand all cells',
    collapseAll: 'Collapse all cells',
    exportScript: 'Export as Python script',
    exportMarkdown: 'Export as Markdown',
    exportNotebook: 'Download notebook',
    clearOutputs: 'Clear all outputs',
    copyCell: 'Copy cell',
    copied: 'Copied!',
  },
};

const renderWithIntl = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('JupyterRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render notebook cells', () => {
      renderWithIntl(<JupyterRenderer content={sampleNotebook} />);

      // Check that cells are rendered - look for cell type badges
      const badges = document.querySelectorAll('[data-slot="badge"]');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('should display language badge', () => {
      renderWithIntl(<JupyterRenderer content={sampleNotebook} />);

      // Language badge should be in the toolbar
      const badges = document.querySelectorAll('[data-slot="badge"]');
      const pythonBadge = Array.from(badges).find((b) => b.textContent === 'python');
      expect(pythonBadge).toBeInTheDocument();
    });

    it('should display cell counts in toolbar', () => {
      renderWithIntl(<JupyterRenderer content={sampleNotebook} />);

      // Stats should be displayed
      expect(screen.getByText(/code cells/)).toBeInTheDocument();
    });

    it('should render error state for invalid notebook', () => {
      renderWithIntl(<JupyterRenderer content="invalid json" />);

      expect(screen.getByText('Failed to parse Jupyter notebook')).toBeInTheDocument();
    });

    it('should render cell outputs', () => {
      renderWithIntl(<JupyterRenderer content={sampleNotebook} />);

      expect(screen.getByText('Hello, World!')).toBeInTheDocument();
    });

    it('should hide toolbar when showToolbar is false', () => {
      renderWithIntl(<JupyterRenderer content={sampleNotebook} showToolbar={false} />);

      // Toolbar buttons should not be present
      expect(screen.queryByRole('button', { name: /expand all/i })).not.toBeInTheDocument();
    });
  });

  describe('cell interactions', () => {
    it('should have collapse buttons for cells', () => {
      renderWithIntl(<JupyterRenderer content={sampleNotebook} />);

      // Find collapse buttons (chevron icons)
      const buttons = screen.getAllByRole('button');
      const collapseButtons = buttons.filter(
        (btn) =>
          btn.querySelector('.lucide-chevron-down') || btn.querySelector('.lucide-chevron-right')
      );

      expect(collapseButtons.length).toBeGreaterThan(0);
    });

    it('should display output section for code cells with outputs', () => {
      renderWithIntl(<JupyterRenderer content={sampleNotebook} />);

      // Output section should be visible
      expect(screen.getAllByText(/Output/).length).toBeGreaterThan(0);
    });
  });

  describe('toolbar actions', () => {
    it('should have expand/collapse all buttons in toolbar', () => {
      renderWithIntl(<JupyterRenderer content={sampleNotebook} />);

      // Toolbar should have expand and collapse buttons
      expect(screen.getByText('Expand all cells')).toBeInTheDocument();
      expect(screen.getByText('Collapse all cells')).toBeInTheDocument();
    });

    it('should have export buttons in toolbar', () => {
      renderWithIntl(<JupyterRenderer content={sampleNotebook} />);

      expect(screen.getByText('Export as Python script')).toBeInTheDocument();
      expect(screen.getByText('Export as Markdown')).toBeInTheDocument();
      expect(screen.getByText('Download notebook')).toBeInTheDocument();
    });
  });

  describe('output types', () => {
    it('should render stream output', () => {
      renderWithIntl(<JupyterRenderer content={sampleNotebook} />);

      expect(screen.getByText('Hello, World!')).toBeInTheDocument();
    });

    it('should render execute_result output', () => {
      renderWithIntl(<JupyterRenderer content={sampleNotebook} />);

      // The output "3" should be in a pre element
      const preElements = document.querySelectorAll('pre');
      const hasThreeOutput = Array.from(preElements).some((pre) => pre.textContent?.includes('3'));
      expect(hasThreeOutput).toBe(true);
    });

    it('should render error output', () => {
      const notebookWithError = JSON.stringify({
        cells: [
          {
            cell_type: 'code',
            source: '1/0',
            outputs: [
              {
                output_type: 'error',
                ename: 'ZeroDivisionError',
                evalue: 'division by zero',
                traceback: ['Traceback...'],
              },
            ],
            execution_count: 1,
            metadata: {},
          },
        ],
        metadata: {},
        nbformat: 4,
        nbformat_minor: 5,
      });

      renderWithIntl(<JupyterRenderer content={notebookWithError} />);

      // Error header shows ename: evalue
      expect(screen.getByText('ZeroDivisionError: division by zero')).toBeInTheDocument();
    });

    it('should render HTML output', () => {
      const notebookWithHtml = JSON.stringify({
        cells: [
          {
            cell_type: 'code',
            source: 'df.head()',
            outputs: [
              {
                output_type: 'execute_result',
                data: {
                  'text/html': '<table><tr><td>testdata</td></tr></table>',
                  'text/plain': 'DataFrame...',
                },
                execution_count: 1,
              },
            ],
            execution_count: 1,
            metadata: {},
          },
        ],
        metadata: {},
        nbformat: 4,
        nbformat_minor: 5,
      });

      renderWithIntl(<JupyterRenderer content={notebookWithHtml} />);

      // HTML content should be rendered
      expect(screen.getByText('testdata')).toBeInTheDocument();
    });

    it('should render image output', () => {
      const notebookWithImage = JSON.stringify({
        cells: [
          {
            cell_type: 'code',
            source: 'plt.plot([1,2,3])',
            outputs: [
              {
                output_type: 'display_data',
                data: {
                  'image/png':
                    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                  'text/plain': '<Figure size 640x480>',
                },
              },
            ],
            execution_count: 1,
            metadata: {},
          },
        ],
        metadata: {},
        nbformat: 4,
        nbformat_minor: 5,
      });

      renderWithIntl(<JupyterRenderer content={notebookWithImage} />);

      // Image should be rendered
      expect(document.querySelector('img')).toBeInTheDocument();
    });
  });

  describe('copy functionality', () => {
    it('should have copy buttons for cells', () => {
      renderWithIntl(<JupyterRenderer content={sampleNotebook} />);

      // Copy buttons exist (in cell headers)
      const buttons = screen.getAllByRole('button');
      const copyButtons = buttons.filter((btn) => btn.querySelector('.lucide-copy'));

      expect(copyButtons.length).toBeGreaterThan(0);
    });
  });

  describe('clear outputs', () => {
    it('should show clear outputs button when onNotebookChange is provided', () => {
      const onNotebookChange = jest.fn();
      renderWithIntl(
        <JupyterRenderer content={sampleNotebook} onNotebookChange={onNotebookChange} />
      );

      expect(screen.getByText('Clear all outputs')).toBeInTheDocument();
    });

    it('should not show clear outputs button when onNotebookChange is not provided', () => {
      renderWithIntl(<JupyterRenderer content={sampleNotebook} />);

      expect(screen.queryByText('Clear all outputs')).not.toBeInTheDocument();
    });
  });
});
