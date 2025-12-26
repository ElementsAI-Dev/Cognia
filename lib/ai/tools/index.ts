/**
 * AI Tool Definitions - MCP-style tools for AI agents
 */

export { webSearchTool, executeWebSearch, webSearchInputSchema, type WebSearchToolInput, type WebSearchResult, type WebSearchConfig } from './web-search';
export { type ToolDefinition, type ToolRegistry, type ToolFunction, createToolRegistry, getGlobalToolRegistry } from './registry';
export { ragSearchTool, executeRAGSearch, ragSearchInputSchema, type RAGSearchInput, type RAGSearchResult } from './rag-search';
export { calculatorTool, executeCalculator, calculatorInputSchema, convertUnit, unitConversions, type CalculatorInput, type CalculatorResult } from './calculator';
export { documentTools, executeDocumentSummarize, executeDocumentChunk, executeDocumentAnalyze, type DocumentToolResult } from './document-tool';
export { 
  fileTools,
  executeFileRead,
  executeFileWrite,
  executeFileList,
  executeFileExists,
  executeFileDelete,
  executeDirectoryCreate,
  executeFileCopy,
  executeFileRename,
  executeFileInfo,
  executeFileSearch,
  executeFileAppend,
  fileReadInputSchema,
  fileWriteInputSchema,
  fileListInputSchema,
  fileExistsInputSchema,
  fileDeleteInputSchema,
  directoryCreateInputSchema,
  fileCopyInputSchema,
  fileRenameInputSchema,
  fileInfoInputSchema,
  fileSearchInputSchema,
  fileAppendInputSchema,
  type FileReadInput,
  type FileWriteInput,
  type FileListInput,
  type FileExistsInput,
  type FileDeleteInput,
  type DirectoryCreateInput,
  type FileCopyInput,
  type FileRenameInput,
  type FileInfoInput,
  type FileSearchInput,
  type FileAppendInput,
  type FileToolResult,
} from './file-tool';
export {
  pptTools,
  executePPTOutline,
  executePPTSlideContent,
  executePPTFinalize,
  executePPTExport,
  registerPPTTools,
  pptOutlineInputSchema,
  pptSlideContentInputSchema,
  pptFinalizeInputSchema,
  pptExportInputSchema,
  type PPTOutlineInput,
  type PPTSlideContentInput,
  type PPTFinalizeInput,
  type PPTExportInput,
  type PPTToolResult,
} from './ppt-tool';

// Unified Tool Registry
export {
  UnifiedToolRegistry,
  getUnifiedToolRegistry,
  setUnifiedToolRegistry,
  registerBuiltinTools,
  registerSkillTools,
  registerMcpTools,
  registerCustomTools,
  inferToolCategory,
  type ToolSource,
  type ToolCategory,
  type ToolMetadata,
  type ToolRegistrationMetadata,
  type RegisteredTool,
  type ToolRegistryConfig,
  type ToolFilterOptions,
} from './unified-registry';
