/**
 * Jupyter Notebook Parser
 * Parses .ipynb JSON format and provides utilities for working with notebooks
 */

import type { JupyterNotebook, JupyterCell } from '@/types';

/**
 * Parse a raw JSON string into a JupyterNotebook object
 */
export function parseNotebook(content: string): JupyterNotebook {
  try {
    const notebook = JSON.parse(content) as JupyterNotebook;

    // Validate required fields
    if (!notebook.cells || !Array.isArray(notebook.cells)) {
      throw new Error('Invalid notebook: missing cells array');
    }

    if (typeof notebook.nbformat !== 'number') {
      throw new Error('Invalid notebook: missing nbformat');
    }

    // Normalize cells
    notebook.cells = notebook.cells.map(normalizeCell);

    return notebook;
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error('Invalid notebook: not valid JSON');
    }
    throw err;
  }
}

/**
 * Normalize a cell to ensure consistent structure
 */
function normalizeCell(cell: JupyterCell): JupyterCell {
  return {
    ...cell,
    // Ensure source is always a string
    source: Array.isArray(cell.source) ? cell.source.join('') : cell.source,
    // Ensure outputs is always an array for code cells
    outputs: cell.cell_type === 'code' ? (cell.outputs || []) : undefined,
    // Normalize execution_count
    execution_count: cell.cell_type === 'code' ? (cell.execution_count ?? null) : undefined,
  };
}

/**
 * Get the source code from a cell as a string
 */
export function getCellSource(cell: JupyterCell): string {
  if (Array.isArray(cell.source)) {
    return cell.source.join('');
  }
  return cell.source || '';
}

/**
 * Get the text output from a cell's outputs
 */
export function getCellTextOutput(cell: JupyterCell): string {
  if (!cell.outputs || cell.outputs.length === 0) {
    return '';
  }

  const textOutputs: string[] = [];

  for (const output of cell.outputs) {
    if (output.output_type === 'stream') {
      const text = Array.isArray(output.text) ? output.text.join('') : (output.text || '');
      textOutputs.push(text);
    } else if (output.output_type === 'execute_result' || output.output_type === 'display_data') {
      // Try to get text/plain first
      if (output.data?.['text/plain']) {
        const text = Array.isArray(output.data['text/plain'])
          ? output.data['text/plain'].join('')
          : output.data['text/plain'];
        textOutputs.push(text);
      }
    } else if (output.output_type === 'error') {
      textOutputs.push(`${output.ename}: ${output.evalue}`);
      if (output.traceback) {
        textOutputs.push(output.traceback.join('\n'));
      }
    }
  }

  return textOutputs.join('\n');
}

/**
 * Get HTML output from a cell if available
 */
export function getCellHtmlOutput(cell: JupyterCell): string | null {
  if (!cell.outputs) return null;

  for (const output of cell.outputs) {
    if (output.output_type === 'display_data' || output.output_type === 'execute_result') {
      if (output.data?.['text/html']) {
        return Array.isArray(output.data['text/html'])
          ? output.data['text/html'].join('')
          : output.data['text/html'];
      }
    }
  }

  return null;
}

/**
 * Get image output from a cell if available (base64 encoded)
 */
export function getCellImageOutput(cell: JupyterCell): { mimeType: string; data: string } | null {
  if (!cell.outputs) return null;

  const imageMimeTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'];

  for (const output of cell.outputs) {
    if (output.output_type === 'display_data' || output.output_type === 'execute_result') {
      for (const mimeType of imageMimeTypes) {
        if (output.data?.[mimeType]) {
          const data = Array.isArray(output.data[mimeType])
            ? output.data[mimeType].join('')
            : output.data[mimeType];
          return { mimeType, data };
        }
      }
    }
  }

  return null;
}

/**
 * Detect the programming language of the notebook
 */
export function getNotebookLanguage(notebook: JupyterNotebook): string {
  // Try kernelspec first
  if (notebook.metadata?.kernelspec?.language) {
    return notebook.metadata.kernelspec.language;
  }

  // Try language_info
  if (notebook.metadata?.language_info?.name) {
    return notebook.metadata.language_info.name;
  }

  // Default to python
  return 'python';
}

/**
 * Convert a notebook to a simple script (just code cells)
 */
export function notebookToScript(notebook: JupyterNotebook): string {
  return notebook.cells
    .filter(cell => cell.cell_type === 'code')
    .map(cell => getCellSource(cell))
    .join('\n\n');
}

/**
 * Convert a notebook to markdown (all cells)
 */
export function notebookToMarkdown(notebook: JupyterNotebook): string {
  const language = getNotebookLanguage(notebook);

  return notebook.cells.map(cell => {
    const source = getCellSource(cell);

    if (cell.cell_type === 'markdown') {
      return source;
    } else if (cell.cell_type === 'code') {
      let output = `\`\`\`${language}\n${source}\n\`\`\``;

      // Add output if present
      const textOutput = getCellTextOutput(cell);
      if (textOutput) {
        output += `\n\n**Output:**\n\`\`\`\n${textOutput}\n\`\`\``;
      }

      return output;
    } else {
      // raw cell
      return `\`\`\`\n${source}\n\`\`\``;
    }
  }).join('\n\n---\n\n');
}

/**
 * Create a new empty notebook
 */
export function createEmptyNotebook(language: string = 'python'): JupyterNotebook {
  return {
    cells: [],
    metadata: {
      kernelspec: {
        name: language === 'python' ? 'python3' : language,
        language,
        display_name: language === 'python' ? 'Python 3' : language,
      },
      language_info: {
        name: language,
      },
    },
    nbformat: 4,
    nbformat_minor: 5,
  };
}

/**
 * Create a new code cell
 */
export function createCodeCell(source: string = ''): JupyterCell {
  return {
    cell_type: 'code',
    source,
    outputs: [],
    execution_count: null,
    metadata: {},
  };
}

/**
 * Create a new markdown cell
 */
export function createMarkdownCell(source: string = ''): JupyterCell {
  return {
    cell_type: 'markdown',
    source,
    metadata: {},
  };
}

/**
 * Add a cell to a notebook
 */
export function addCell(notebook: JupyterNotebook, cell: JupyterCell, index?: number): JupyterNotebook {
  const cells = [...notebook.cells];
  if (index !== undefined && index >= 0 && index <= cells.length) {
    cells.splice(index, 0, cell);
  } else {
    cells.push(cell);
  }
  return { ...notebook, cells };
}

/**
 * Remove a cell from a notebook
 */
export function removeCell(notebook: JupyterNotebook, index: number): JupyterNotebook {
  const cells = notebook.cells.filter((_, i) => i !== index);
  return { ...notebook, cells };
}

/**
 * Move a cell in a notebook
 */
export function moveCell(notebook: JupyterNotebook, fromIndex: number, toIndex: number): JupyterNotebook {
  const cells = [...notebook.cells];
  const [cell] = cells.splice(fromIndex, 1);
  cells.splice(toIndex, 0, cell);
  return { ...notebook, cells };
}

/**
 * Update a cell in a notebook
 */
export function updateCell(notebook: JupyterNotebook, index: number, updates: Partial<JupyterCell>): JupyterNotebook {
  const cells = notebook.cells.map((cell, i) =>
    i === index ? { ...cell, ...updates } : cell
  );
  return { ...notebook, cells };
}

/**
 * Clear all outputs from a notebook
 */
export function clearAllOutputs(notebook: JupyterNotebook): JupyterNotebook {
  const cells = notebook.cells.map(cell => {
    if (cell.cell_type === 'code') {
      return { ...cell, outputs: [], execution_count: null };
    }
    return cell;
  });
  return { ...notebook, cells };
}

/**
 * Serialize a notebook back to JSON string
 */
export function serializeNotebook(notebook: JupyterNotebook): string {
  return JSON.stringify(notebook, null, 2);
}

/**
 * Check if content is a valid Jupyter notebook
 */
export function isValidNotebook(content: string): boolean {
  try {
    const data = JSON.parse(content);
    return (
      Array.isArray(data.cells) &&
      typeof data.nbformat === 'number' &&
      typeof data.nbformat_minor === 'number'
    );
  } catch {
    return false;
  }
}

const jupyterParser = {
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
};

export default jupyterParser;
