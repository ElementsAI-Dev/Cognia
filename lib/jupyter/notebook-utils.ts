/**
 * Jupyter Notebook Utilities
 *
 * Pure utility functions for converting between internal cell output
 * formats and Jupyter notebook (.ipynb) output formats.
 */

import type { CellOutput, ExecutableCell } from '@/types/jupyter';
import type { JupyterNotebook, JupyterOutput } from '@/types';

/** Convert internal CellOutput[] to Jupyter .ipynb JupyterOutput[] */
export function toJupyterOutputs(outputs: CellOutput[]): JupyterOutput[] {
  return outputs.map((output) => {
    if (output.outputType === 'stream') {
      return {
        output_type: 'stream',
        name: output.name,
        text: output.text ?? '',
      };
    }

    if (output.outputType === 'error') {
      return {
        output_type: 'error',
        ename: output.ename,
        evalue: output.evalue,
        traceback: output.traceback,
      };
    }

    if (output.outputType === 'execute_result') {
      return {
        output_type: 'execute_result',
        data: output.data,
        execution_count: output.executionCount ?? null,
      };
    }

    return {
      output_type: 'display_data',
      data: output.data,
    };
  });
}

/** Merge execution results from ExecutableCell[] back into a JupyterNotebook */
export function applyCellsToNotebook(
  notebook: JupyterNotebook,
  cells: ExecutableCell[]
): JupyterNotebook {
  const nextCells = [...notebook.cells];

  const codeCellIndices = nextCells
    .map((cell, idx) => ({ cell, idx }))
    .filter(({ cell }) => cell.cell_type === 'code')
    .map(({ idx }) => idx);

  const hasMeaningfulResult = (cell?: ExecutableCell) => {
    if (!cell) return false;
    return cell.outputs.length > 0 || cell.executionCount !== null;
  };

  for (let ordinal = 0; ordinal < codeCellIndices.length; ordinal++) {
    const notebookCellIndex = codeCellIndices[ordinal];
    const notebookCell = nextCells[notebookCellIndex];
    if (!notebookCell || notebookCell.cell_type !== 'code') continue;

    const absoluteCell = cells[notebookCellIndex];
    const ordinalCell = cells[ordinal];

    const chosen = hasMeaningfulResult(absoluteCell)
      ? absoluteCell
      : hasMeaningfulResult(ordinalCell)
        ? ordinalCell
        : (absoluteCell ?? ordinalCell);

    if (!chosen) continue;

    nextCells[notebookCellIndex] = {
      ...notebookCell,
      outputs: toJupyterOutputs(chosen.outputs),
      execution_count: chosen.executionCount ?? null,
    };
  }

  return { ...notebook, cells: nextCells };
}
