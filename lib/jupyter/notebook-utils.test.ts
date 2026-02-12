/**
 * Tests for Jupyter Notebook Utilities
 */

import { toJupyterOutputs, applyCellsToNotebook } from './notebook-utils';
import type { CellOutput, ExecutableCell } from '@/types/jupyter';
import type { JupyterNotebook } from '@/types';

describe('toJupyterOutputs', () => {
  it('returns empty array for empty input', () => {
    expect(toJupyterOutputs([])).toEqual([]);
  });

  it('converts stream stdout output', () => {
    const outputs: CellOutput[] = [
      { outputType: 'stream', name: 'stdout', text: 'Hello World' },
    ];
    const result = toJupyterOutputs(outputs);
    expect(result).toEqual([
      { output_type: 'stream', name: 'stdout', text: 'Hello World' },
    ]);
  });

  it('converts stream stderr output', () => {
    const outputs: CellOutput[] = [
      { outputType: 'stream', name: 'stderr', text: 'Warning message' },
    ];
    const result = toJupyterOutputs(outputs);
    expect(result).toEqual([
      { output_type: 'stream', name: 'stderr', text: 'Warning message' },
    ]);
  });

  it('converts stream output with undefined text to empty string', () => {
    const outputs: CellOutput[] = [
      { outputType: 'stream', name: 'stdout' },
    ];
    const result = toJupyterOutputs(outputs);
    expect(result).toEqual([
      { output_type: 'stream', name: 'stdout', text: '' },
    ]);
  });

  it('converts error output', () => {
    const outputs: CellOutput[] = [
      {
        outputType: 'error',
        ename: 'ValueError',
        evalue: 'invalid literal',
        traceback: ['Traceback...', 'ValueError: invalid literal'],
      },
    ];
    const result = toJupyterOutputs(outputs);
    expect(result).toEqual([
      {
        output_type: 'error',
        ename: 'ValueError',
        evalue: 'invalid literal',
        traceback: ['Traceback...', 'ValueError: invalid literal'],
      },
    ]);
  });

  it('converts execute_result output', () => {
    const outputs: CellOutput[] = [
      {
        outputType: 'execute_result',
        data: { 'text/plain': '42' },
        executionCount: 5,
      },
    ];
    const result = toJupyterOutputs(outputs);
    expect(result).toEqual([
      {
        output_type: 'execute_result',
        data: { 'text/plain': '42' },
        execution_count: 5,
      },
    ]);
  });

  it('converts execute_result with undefined executionCount to null', () => {
    const outputs: CellOutput[] = [
      {
        outputType: 'execute_result',
        data: { 'text/plain': '42' },
      },
    ];
    const result = toJupyterOutputs(outputs);
    expect(result[0]).toHaveProperty('execution_count', null);
  });

  it('converts display_data output', () => {
    const outputs: CellOutput[] = [
      {
        outputType: 'display_data',
        data: { 'image/png': 'base64data...' },
      },
    ];
    const result = toJupyterOutputs(outputs);
    expect(result).toEqual([
      {
        output_type: 'display_data',
        data: { 'image/png': 'base64data...' },
      },
    ]);
  });

  it('converts multiple mixed outputs', () => {
    const outputs: CellOutput[] = [
      { outputType: 'stream', name: 'stdout', text: 'line 1' },
      { outputType: 'stream', name: 'stderr', text: 'warning' },
      { outputType: 'display_data', data: { 'text/html': '<b>hi</b>' } },
    ];
    const result = toJupyterOutputs(outputs);
    expect(result).toHaveLength(3);
    expect(result[0]).toHaveProperty('output_type', 'stream');
    expect(result[1]).toHaveProperty('output_type', 'stream');
    expect(result[2]).toHaveProperty('output_type', 'display_data');
  });
});

describe('applyCellsToNotebook', () => {
  const createNotebook = (cells: JupyterNotebook['cells']): JupyterNotebook => ({
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
      language_info: { name: 'python', version: '3.10.0' },
    },
    cells,
  });

  const createExecCell = (overrides: Partial<ExecutableCell> = {}): ExecutableCell => ({
    id: 'c1',
    type: 'code',
    source: '',
    executionState: 'idle',
    executionCount: null,
    outputs: [],
    metadata: {},
    ...overrides,
  });

  it('returns notebook unchanged when cells array is empty', () => {
    const notebook = createNotebook([
      { cell_type: 'code', source: 'x = 1', metadata: {}, outputs: [] },
    ]);
    const result = applyCellsToNotebook(notebook, []);
    expect(result.cells[0].outputs).toEqual([]);
  });

  it('merges execution results into code cells', () => {
    const notebook = createNotebook([
      { cell_type: 'code', source: 'print("hi")', metadata: {}, outputs: [] },
    ]);
    const cells: ExecutableCell[] = [
      createExecCell({
        executionCount: 1,
        outputs: [{ outputType: 'stream', name: 'stdout', text: 'hi' }],
      }),
    ];
    const result = applyCellsToNotebook(notebook, cells);
    expect(result.cells[0].outputs!).toHaveLength(1);
    expect(result.cells[0].outputs![0]).toHaveProperty('output_type', 'stream');
    expect(result.cells[0].execution_count).toBe(1);
  });

  it('skips markdown cells', () => {
    const notebook = createNotebook([
      { cell_type: 'markdown', source: '# Title', metadata: {} },
      { cell_type: 'code', source: 'x = 1', metadata: {}, outputs: [] },
    ]);
    const cells: ExecutableCell[] = [
      createExecCell({ executionCount: null, outputs: [] }),
      createExecCell({
        executionCount: 1,
        outputs: [{ outputType: 'stream', name: 'stdout', text: '1' }],
      }),
    ];
    const result = applyCellsToNotebook(notebook, cells);
    // Markdown cell untouched
    expect(result.cells[0]).not.toHaveProperty('outputs');
    // Code cell updated
    expect(result.cells[1].outputs).toHaveLength(1);
    expect(result.cells[1].execution_count).toBe(1);
  });

  it('handles mixed markdown and code cells correctly', () => {
    const notebook = createNotebook([
      { cell_type: 'markdown', source: '# Header', metadata: {} },
      { cell_type: 'code', source: 'a = 1', metadata: {}, outputs: [] },
      { cell_type: 'markdown', source: '## Sub', metadata: {} },
      { cell_type: 'code', source: 'b = 2', metadata: {}, outputs: [] },
    ]);
    const cells: ExecutableCell[] = [
      createExecCell({ executionCount: null, outputs: [] }),
      createExecCell({
        executionCount: 1,
        outputs: [{ outputType: 'stream', name: 'stdout', text: 'a' }],
      }),
      createExecCell({ executionCount: null, outputs: [] }),
      createExecCell({
        executionCount: 2,
        outputs: [{ outputType: 'stream', name: 'stdout', text: 'b' }],
      }),
    ];
    const result = applyCellsToNotebook(notebook, cells);
    expect(result.cells[1].execution_count).toBe(1);
    expect(result.cells[3].execution_count).toBe(2);
  });

  it('prefers absoluteCell over ordinalCell when both have results', () => {
    const notebook = createNotebook([
      { cell_type: 'code', source: 'x = 1', metadata: {}, outputs: [] },
    ]);
    const cells: ExecutableCell[] = [
      createExecCell({
        executionCount: 5,
        outputs: [{ outputType: 'stream', name: 'stdout', text: 'absolute' }],
      }),
    ];
    const result = applyCellsToNotebook(notebook, cells);
    expect(result.cells[0].execution_count).toBe(5);
  });

  it('uses ordinalCell when absoluteCell has no meaningful result', () => {
    const notebook = createNotebook([
      { cell_type: 'markdown', source: '# Title', metadata: {} },
      { cell_type: 'code', source: 'print("hello")', metadata: {}, outputs: [] },
    ]);
    // cells[0] = no result (matches absoluteCell at index 1 which doesn't exist)
    // cells[1] has no result, but ordinalCell (cells[0]) has results
    const cells: ExecutableCell[] = [
      createExecCell({
        executionCount: 1,
        outputs: [{ outputType: 'stream', name: 'stdout', text: 'ordinal' }],
      }),
    ];
    const result = applyCellsToNotebook(notebook, cells);
    // ordinalCell[0] should be chosen since absoluteCell[1] doesn't exist
    expect(result.cells[1].execution_count).toBe(1);
  });

  it('does not mutate original notebook', () => {
    const notebook = createNotebook([
      { cell_type: 'code', source: 'x = 1', metadata: {}, outputs: [] },
    ]);
    const cells: ExecutableCell[] = [
      createExecCell({
        executionCount: 1,
        outputs: [{ outputType: 'stream', name: 'stdout', text: 'ok' }],
      }),
    ];
    const result = applyCellsToNotebook(notebook, cells);
    // Original should be unchanged
    expect(notebook.cells[0].outputs).toEqual([]);
    // Result should have outputs
    expect(result.cells[0].outputs).toHaveLength(1);
  });

  it('sets execution_count to null when chosen cell has null executionCount', () => {
    const notebook = createNotebook([
      { cell_type: 'code', source: 'x = 1', metadata: {}, outputs: [], execution_count: 3 },
    ]);
    const cells: ExecutableCell[] = [
      createExecCell({
        executionCount: null,
        outputs: [{ outputType: 'stream', name: 'stdout', text: 'ok' }],
      }),
    ];
    const result = applyCellsToNotebook(notebook, cells);
    expect(result.cells[0].execution_count).toBeNull();
  });
});
