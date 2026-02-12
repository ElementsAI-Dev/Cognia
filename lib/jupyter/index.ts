/**
 * Jupyter notebook utilities and kernel management
 */

// Parser utilities
export {
  parseNotebook,
  getCellSource,
  getCellTextOutput,
  getCellHtmlOutput,
  getCellImageOutput,
  getCellLatexOutput,
  getCellJsonOutput,
  parseAnsiToHtml,
  hasAnsiCodes,
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

// Kernel service
export {
  kernelService,
  isKernelAvailable,
  createSession,
  listSessions,
  getSession,
  deleteSession,
  listKernels,
  restartKernel,
  interruptKernel,
  execute,
  quickExecute,
  executeCell,
  executeNotebook,
  getVariables,
  inspectVariable,
  checkKernelAvailable,
  ensureKernel,
  shutdownAll,
  onKernelStatus,
  onKernelOutput,
  onCellOutput,
} from './kernel';

// Constants
export { KERNEL_STATUS_CONFIG, VARIABLE_TYPE_COLORS } from './constants';

// Notebook utilities
export { toJupyterOutputs, applyCellsToNotebook } from './notebook-utils';
