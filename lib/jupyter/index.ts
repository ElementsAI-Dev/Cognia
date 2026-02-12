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
  getSessionById,
  deleteSession,
  listKernels,
  restartKernel,
  interruptKernel,
  getKernelStatus,
  isKernelAlive,
  execute,
  quickExecute,
  executeCell,
  executeNotebook,
  getVariables,
  getCachedVariables,
  inspectVariable,
  checkKernelAvailable,
  ensureKernel,
  shutdownAll,
  cleanup,
  getKernelConfig,
  openNotebook,
  saveNotebook,
  getNotebookInfo,
  onKernelStatus,
  onKernelOutput,
  onCellOutput,
} from './kernel';

// Constants
export { KERNEL_STATUS_CONFIG, VARIABLE_TYPE_COLORS } from './constants';

// Notebook utilities
export { toJupyterOutputs, applyCellsToNotebook } from './notebook-utils';
