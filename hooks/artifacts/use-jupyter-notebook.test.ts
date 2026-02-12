/**
 * Tests for useJupyterNotebook hook
 */

import { renderHook, act } from '@testing-library/react';
import { useJupyterNotebook } from './use-jupyter-notebook';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  loggers: { ui: { error: jest.fn() } },
}));

// Mock download
import { downloadFile } from '@/lib/utils/download';
jest.mock('@/lib/utils/download', () => ({
  downloadFile: jest.fn(),
}));
const mockDownloadFile = downloadFile as jest.Mock;

// Mock clipboard
Object.assign(navigator, {
  clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
});

const VALID_NOTEBOOK = JSON.stringify({
  cells: [
    {
      cell_type: 'code',
      source: 'print("hello")',
      outputs: [{ output_type: 'stream', text: 'hello\n', name: 'stdout' }],
      execution_count: 1,
      metadata: {},
    },
    {
      cell_type: 'markdown',
      source: '# Title',
      metadata: {},
    },
  ],
  metadata: {
    kernelspec: { name: 'python3', language: 'python', display_name: 'Python 3' },
    language_info: { name: 'python' },
  },
  nbformat: 4,
  nbformat_minor: 5,
});

describe('useJupyterNotebook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should parse a valid notebook', () => {
    const { result } = renderHook(() =>
      useJupyterNotebook({ content: VALID_NOTEBOOK })
    );
    expect(result.current.notebook).not.toBeNull();
    expect(result.current.notebook!.cells).toHaveLength(2);
    expect(result.current.language).toBe('python');
  });

  it('should return null notebook for invalid content', () => {
    const { result } = renderHook(() =>
      useJupyterNotebook({ content: 'not json' })
    );
    expect(result.current.notebook).toBeNull();
  });

  it('should compute stats correctly', () => {
    const { result } = renderHook(() =>
      useJupyterNotebook({ content: VALID_NOTEBOOK })
    );
    expect(result.current.stats).toEqual({ code: 1, markdown: 1, outputs: 1 });
  });

  it('should toggle cell collapse', () => {
    const { result } = renderHook(() =>
      useJupyterNotebook({ content: VALID_NOTEBOOK })
    );
    expect(result.current.collapsedCells.has(0)).toBe(false);

    act(() => { result.current.toggleCellCollapse(0); });
    expect(result.current.collapsedCells.has(0)).toBe(true);

    act(() => { result.current.toggleCellCollapse(0); });
    expect(result.current.collapsedCells.has(0)).toBe(false);
  });

  it('should toggle output collapse', () => {
    const { result } = renderHook(() =>
      useJupyterNotebook({ content: VALID_NOTEBOOK })
    );
    expect(result.current.collapsedOutputs.has(0)).toBe(false);

    act(() => { result.current.toggleOutputCollapse(0); });
    expect(result.current.collapsedOutputs.has(0)).toBe(true);

    act(() => { result.current.toggleOutputCollapse(0); });
    expect(result.current.collapsedOutputs.has(0)).toBe(false);
  });

  it('should collapse all and expand all', () => {
    const { result } = renderHook(() =>
      useJupyterNotebook({ content: VALID_NOTEBOOK })
    );

    act(() => { result.current.collapseAll(); });
    expect(result.current.collapsedCells.size).toBe(2);

    act(() => { result.current.expandAll(); });
    expect(result.current.collapsedCells.size).toBe(0);
  });

  it('should copy cell content to clipboard', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() =>
      useJupyterNotebook({ content: VALID_NOTEBOOK })
    );

    act(() => { result.current.handleCopyCell(0); });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('print("hello")');
    expect(result.current.copied).toBe('cell-0');

    act(() => { jest.advanceTimersByTime(2000); });
    expect(result.current.copied).toBeNull();
    jest.useRealTimers();
  });

  it('should start and cancel edit', () => {
    const { result } = renderHook(() =>
      useJupyterNotebook({ content: VALID_NOTEBOOK })
    );

    act(() => { result.current.handleStartEdit(0); });
    expect(result.current.editingCell).toBe(0);
    expect(result.current.editSource).toBe('print("hello")');

    act(() => { result.current.handleCancelEdit(); });
    expect(result.current.editingCell).toBeNull();
    expect(result.current.editSource).toBe('');
  });

  it('should call onNotebookChange when saving edit', () => {
    const onNotebookChange = jest.fn();
    const { result } = renderHook(() =>
      useJupyterNotebook({ content: VALID_NOTEBOOK, onNotebookChange })
    );

    act(() => { result.current.handleStartEdit(0); });
    act(() => { result.current.setEditSource('print("updated")'); });
    act(() => { result.current.handleSaveEdit(0); });

    expect(onNotebookChange).toHaveBeenCalledTimes(1);
    expect(result.current.editingCell).toBeNull();
  });

  it('should add a cell', () => {
    const onNotebookChange = jest.fn();
    const { result } = renderHook(() =>
      useJupyterNotebook({ content: VALID_NOTEBOOK, onNotebookChange })
    );

    act(() => { result.current.handleAddCell(0, 'code'); });
    expect(onNotebookChange).toHaveBeenCalledTimes(1);
  });

  it('should delete a cell', () => {
    const onNotebookChange = jest.fn();
    const { result } = renderHook(() =>
      useJupyterNotebook({ content: VALID_NOTEBOOK, onNotebookChange })
    );

    act(() => { result.current.handleDeleteCell(0); });
    expect(onNotebookChange).toHaveBeenCalledTimes(1);
  });

  it('should move a cell', () => {
    const onNotebookChange = jest.fn();
    const { result } = renderHook(() =>
      useJupyterNotebook({ content: VALID_NOTEBOOK, onNotebookChange })
    );

    act(() => { result.current.handleMoveCell(0, 'down'); });
    expect(onNotebookChange).toHaveBeenCalledTimes(1);
  });

  it('should not move cell out of bounds', () => {
    const onNotebookChange = jest.fn();
    const { result } = renderHook(() =>
      useJupyterNotebook({ content: VALID_NOTEBOOK, onNotebookChange })
    );

    act(() => { result.current.handleMoveCell(0, 'up'); });
    expect(onNotebookChange).not.toHaveBeenCalled();

    act(() => { result.current.handleMoveCell(1, 'down'); });
    expect(onNotebookChange).not.toHaveBeenCalled();
  });

  it('should export script via downloadFile', () => {
    const { result } = renderHook(() =>
      useJupyterNotebook({ content: VALID_NOTEBOOK })
    );

    act(() => { result.current.handleExportScript(); });
    expect(mockDownloadFile).toHaveBeenCalledWith(
      expect.any(String),
      'notebook.py',
      'text/x-python'
    );
  });

  it('should export markdown via downloadFile', () => {
    const { result } = renderHook(() =>
      useJupyterNotebook({ content: VALID_NOTEBOOK })
    );

    act(() => { result.current.handleExportMarkdown(); });
    expect(mockDownloadFile).toHaveBeenCalledWith(
      expect.any(String),
      'notebook.md',
      'text/markdown'
    );
  });

  it('should export notebook via downloadFile', () => {
    const { result } = renderHook(() =>
      useJupyterNotebook({ content: VALID_NOTEBOOK })
    );

    act(() => { result.current.handleExportNotebook(); });
    expect(mockDownloadFile).toHaveBeenCalledWith(
      expect.any(String),
      'notebook.ipynb',
      'application/json'
    );
  });

  it('should clear outputs when onNotebookChange provided', () => {
    const onNotebookChange = jest.fn();
    const { result } = renderHook(() =>
      useJupyterNotebook({ content: VALID_NOTEBOOK, onNotebookChange })
    );

    act(() => { result.current.handleClearOutputs(); });
    expect(onNotebookChange).toHaveBeenCalledTimes(1);
    // The updated notebook JSON should have empty outputs
    const parsed = JSON.parse(onNotebookChange.mock.calls[0][0]);
    expect(parsed.cells[0].outputs).toHaveLength(0);
  });
});
