/**
 * Canvas Hooks - React hooks for Canvas functionality
 */

export { useCanvasSuggestions } from './use-canvas-suggestions';
export { useCodeExecution as useCanvasCodeExecution } from './use-code-execution';
export { useCanvasDocuments } from './use-canvas-documents';
export { useChunkLoader } from './use-chunk-loader';
export { useCollaborativeSession } from './use-collaborative-session';
export { useCanvasMonacoSetup } from './use-canvas-monaco-setup';
export { useCanvasActions } from './use-canvas-actions';

export type { CodeSandboxExecutionResult, ExecutionOptions } from './use-code-execution';
export type {
  SuggestionContext as CanvasSuggestionContext,
  GenerateSuggestionsOptions as CanvasGenerateSuggestionsOptions,
} from './use-canvas-suggestions';
export type { CreateDocumentOptions as CanvasCreateDocumentOptions } from './use-canvas-documents';
