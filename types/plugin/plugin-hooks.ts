/**
 * Extended Plugin Hooks Types
 * 
 * Additional hook definitions for deeper integration with the application.
 */

import type { PluginHooks, PluginMessage } from './plugin';
import type { Project, KnowledgeFile } from '../project/project';
import type { Artifact } from '../artifact/artifact';
import type { PluginCanvasDocument } from './plugin-extended';

// =============================================================================
// Project Hooks
// =============================================================================

/**
 * Project-related hook events
 */
export interface ProjectHookEvents {
  /** Called when a project is created */
  onProjectCreate?: (project: Project) => void | Promise<void>;
  
  /** Called when a project is updated */
  onProjectUpdate?: (project: Project, changes: Partial<Project>) => void | Promise<void>;
  
  /** Called when a project is deleted */
  onProjectDelete?: (projectId: string) => void | Promise<void>;
  
  /** Called when the active project changes */
  onProjectSwitch?: (projectId: string | null, previousProjectId: string | null) => void;
  
  /** Called when a file is added to project knowledge base */
  onKnowledgeFileAdd?: (projectId: string, file: KnowledgeFile) => void | Promise<void>;
  
  /** Called when a knowledge file is removed */
  onKnowledgeFileRemove?: (projectId: string, fileId: string) => void | Promise<void>;
  
  /** Called when a session is linked to a project */
  onSessionLinked?: (projectId: string, sessionId: string) => void;
  
  /** Called when a session is unlinked from a project */
  onSessionUnlinked?: (projectId: string, sessionId: string) => void;
}

// =============================================================================
// Canvas Hooks
// =============================================================================

/**
 * Canvas-related hook events
 */
export interface CanvasHookEvents {
  /** Called when a canvas document is created */
  onCanvasCreate?: (document: PluginCanvasDocument) => void | Promise<void>;
  
  /** Called when a canvas document is updated */
  onCanvasUpdate?: (document: PluginCanvasDocument, changes: Partial<PluginCanvasDocument>) => void;
  
  /** Called when a canvas document is deleted */
  onCanvasDelete?: (documentId: string) => void;
  
  /** Called when the active canvas changes */
  onCanvasSwitch?: (documentId: string | null) => void;
  
  /** Called when canvas content changes (debounced) */
  onCanvasContentChange?: (documentId: string, content: string, previousContent: string) => void;
  
  /** Called when a canvas version is saved */
  onCanvasVersionSave?: (documentId: string, versionId: string) => void;
  
  /** Called when a canvas version is restored */
  onCanvasVersionRestore?: (documentId: string, versionId: string) => void;
  
  /** Called when user selects text in canvas */
  onCanvasSelection?: (documentId: string, selection: { start: number; end: number; text: string }) => void;
}

// =============================================================================
// Artifact Hooks
// =============================================================================

/**
 * Artifact-related hook events
 */
export interface ArtifactHookEvents {
  /** Called when an artifact is created */
  onArtifactCreate?: (artifact: Artifact) => void | Promise<void>;
  
  /** Called when an artifact is updated */
  onArtifactUpdate?: (artifact: Artifact, changes: Partial<Artifact>) => void;
  
  /** Called when an artifact is deleted */
  onArtifactDelete?: (artifactId: string) => void;
  
  /** Called when the artifact panel is opened */
  onArtifactOpen?: (artifactId: string) => void;
  
  /** Called when the artifact panel is closed */
  onArtifactClose?: () => void;
  
  /** Called when artifact code is executed (for React/HTML artifacts) */
  onArtifactExecute?: (artifactId: string, result: { success: boolean; error?: string }) => void;
  
  /** Called when an artifact is exported */
  onArtifactExport?: (artifactId: string, format: string) => void;
}

// =============================================================================
// Export Hooks
// =============================================================================

/**
 * Export-related hook events
 */
export interface ExportHookEvents {
  /** Called before a session export starts */
  onExportStart?: (sessionId: string, format: string) => void | Promise<void>;
  
  /** Called after a session export completes */
  onExportComplete?: (sessionId: string, format: string, success: boolean) => void;
  
  /** Called to allow modification of export content */
  onExportTransform?: (content: string, format: string) => string | Promise<string>;
  
  /** Called before a project export starts */
  onProjectExportStart?: (projectId: string, format: string) => void | Promise<void>;
  
  /** Called after a project export completes */
  onProjectExportComplete?: (projectId: string, format: string, success: boolean) => void;
}

// =============================================================================
// Theme Hooks
// =============================================================================

/**
 * Theme-related hook events
 */
export interface ThemeHookEvents {
  /** Called when theme mode changes (light/dark/system) */
  onThemeModeChange?: (mode: 'light' | 'dark' | 'system', resolvedMode: 'light' | 'dark') => void;
  
  /** Called when color preset changes */
  onColorPresetChange?: (preset: string) => void;
  
  /** Called when a custom theme is activated */
  onCustomThemeActivate?: (themeId: string) => void;
}

// =============================================================================
// AI/Chat Hooks
// =============================================================================

/**
 * AI and chat-related hook events
 */
export interface AIHookEvents {
  /** Called before a chat request is sent */
  onChatRequest?: (messages: PluginMessage[], model: string) => PluginMessage[] | Promise<PluginMessage[]>;
  
  /** Called when streaming response starts */
  onStreamStart?: (sessionId: string) => void;
  
  /** Called for each streaming chunk */
  onStreamChunk?: (sessionId: string, chunk: string, fullContent: string) => void;
  
  /** Called when streaming response ends */
  onStreamEnd?: (sessionId: string, finalContent: string) => void;
  
  /** Called when a chat error occurs */
  onChatError?: (sessionId: string, error: Error) => void;
  
  /** Called when token usage is reported */
  onTokenUsage?: (sessionId: string, usage: { prompt: number; completion: number; total: number }) => void;
}

// =============================================================================
// RAG/Vector Hooks
// =============================================================================

/**
 * RAG and vector-related hook events
 */
export interface VectorHookEvents {
  /** Called when documents are added to vector store */
  onDocumentsIndexed?: (collection: string, count: number) => void;
  
  /** Called when a vector search is performed */
  onVectorSearch?: (collection: string, query: string, resultCount: number) => void;
  
  /** Called when RAG context is retrieved for a message */
  onRAGContextRetrieved?: (sessionId: string, sources: { id: string; content: string; score: number }[]) => void;
}

// =============================================================================
// Workflow Hooks
// =============================================================================

/**
 * Workflow integration hook events
 */
export interface WorkflowHookEvents {
  /** Called when a workflow starts */
  onWorkflowStart?: (workflowId: string, name: string) => void;
  
  /** Called when a workflow step completes */
  onWorkflowStepComplete?: (workflowId: string, stepIndex: number, result: unknown) => void;
  
  /** Called when a workflow completes */
  onWorkflowComplete?: (workflowId: string, success: boolean, result?: unknown) => void;
  
  /** Called when a workflow errors */
  onWorkflowError?: (workflowId: string, error: Error) => void;
}

// =============================================================================
// UI Hooks
// =============================================================================

/**
 * UI interaction hook events
 */
export interface UIHookEvents {
  /** Called when sidebar visibility changes */
  onSidebarToggle?: (visible: boolean) => void;
  
  /** Called when a panel is opened */
  onPanelOpen?: (panelId: string) => void;
  
  /** Called when a panel is closed */
  onPanelClose?: (panelId: string) => void;
  
  /** Called when a keyboard shortcut is triggered */
  onShortcut?: (shortcut: string) => boolean | void;
  
  /** Called when a context menu is about to be shown */
  onContextMenuShow?: (context: { type: string; target?: unknown }) => { items?: unknown[] } | void;
}

// =============================================================================
// Extended Plugin Hooks
// =============================================================================

/**
 * Complete extended hooks interface combining base and new hooks
 */
export interface ExtendedPluginHooks extends PluginHooks {
  // Project hooks
  onProjectCreate?: ProjectHookEvents['onProjectCreate'];
  onProjectUpdate?: ProjectHookEvents['onProjectUpdate'];
  onProjectDelete?: ProjectHookEvents['onProjectDelete'];
  onProjectSwitch?: ProjectHookEvents['onProjectSwitch'];
  onKnowledgeFileAdd?: ProjectHookEvents['onKnowledgeFileAdd'];
  onKnowledgeFileRemove?: ProjectHookEvents['onKnowledgeFileRemove'];
  onSessionLinked?: ProjectHookEvents['onSessionLinked'];
  onSessionUnlinked?: ProjectHookEvents['onSessionUnlinked'];
  
  // Canvas hooks
  onCanvasCreate?: CanvasHookEvents['onCanvasCreate'];
  onCanvasUpdate?: CanvasHookEvents['onCanvasUpdate'];
  onCanvasDelete?: CanvasHookEvents['onCanvasDelete'];
  onCanvasSwitch?: CanvasHookEvents['onCanvasSwitch'];
  onCanvasContentChange?: CanvasHookEvents['onCanvasContentChange'];
  onCanvasVersionSave?: CanvasHookEvents['onCanvasVersionSave'];
  onCanvasVersionRestore?: CanvasHookEvents['onCanvasVersionRestore'];
  onCanvasSelection?: CanvasHookEvents['onCanvasSelection'];
  
  // Artifact hooks
  onArtifactCreate?: ArtifactHookEvents['onArtifactCreate'];
  onArtifactUpdate?: ArtifactHookEvents['onArtifactUpdate'];
  onArtifactDelete?: ArtifactHookEvents['onArtifactDelete'];
  onArtifactOpen?: ArtifactHookEvents['onArtifactOpen'];
  onArtifactClose?: ArtifactHookEvents['onArtifactClose'];
  onArtifactExecute?: ArtifactHookEvents['onArtifactExecute'];
  onArtifactExport?: ArtifactHookEvents['onArtifactExport'];
  
  // Export hooks
  onExportStart?: ExportHookEvents['onExportStart'];
  onExportComplete?: ExportHookEvents['onExportComplete'];
  onExportTransform?: ExportHookEvents['onExportTransform'];
  onProjectExportStart?: ExportHookEvents['onProjectExportStart'];
  onProjectExportComplete?: ExportHookEvents['onProjectExportComplete'];
  
  // Theme hooks
  onThemeModeChange?: ThemeHookEvents['onThemeModeChange'];
  onColorPresetChange?: ThemeHookEvents['onColorPresetChange'];
  onCustomThemeActivate?: ThemeHookEvents['onCustomThemeActivate'];
  
  // AI hooks
  onChatRequest?: AIHookEvents['onChatRequest'];
  onStreamStart?: AIHookEvents['onStreamStart'];
  onStreamChunk?: AIHookEvents['onStreamChunk'];
  onStreamEnd?: AIHookEvents['onStreamEnd'];
  onChatError?: AIHookEvents['onChatError'];
  onTokenUsage?: AIHookEvents['onTokenUsage'];
  
  // Vector/RAG hooks
  onDocumentsIndexed?: VectorHookEvents['onDocumentsIndexed'];
  onVectorSearch?: VectorHookEvents['onVectorSearch'];
  onRAGContextRetrieved?: VectorHookEvents['onRAGContextRetrieved'];
  
  // Workflow hooks
  onWorkflowStart?: WorkflowHookEvents['onWorkflowStart'];
  onWorkflowStepComplete?: WorkflowHookEvents['onWorkflowStepComplete'];
  onWorkflowComplete?: WorkflowHookEvents['onWorkflowComplete'];
  onWorkflowError?: WorkflowHookEvents['onWorkflowError'];
  
  // UI hooks
  onSidebarToggle?: UIHookEvents['onSidebarToggle'];
  onPanelOpen?: UIHookEvents['onPanelOpen'];
  onPanelClose?: UIHookEvents['onPanelClose'];
  onShortcut?: UIHookEvents['onShortcut'];
  onContextMenuShow?: UIHookEvents['onContextMenuShow'];
}

/**
 * Hook priority levels
 */
export type HookPriority = 'high' | 'normal' | 'low';

/**
 * Hook registration options
 */
export interface HookRegistrationOptions {
  /** Priority level for hook execution order */
  priority?: HookPriority;
  
  /** Whether this hook can cancel the event */
  cancellable?: boolean;
  
  /** Timeout in ms for async hooks */
  timeout?: number;
}

/**
 * Hook execution result
 */
export interface HookSandboxExecutionResult<T = unknown> {
  /** Whether hook executed successfully */
  success: boolean;

  /** Result value if any */
  result?: T;

  /** Error if hook failed */
  error?: Error;

  /** Plugin ID that produced the result */
  pluginId: string;

  /** Execution time in ms */
  executionTime: number;

  /** Duration in ms (alternative to executionTime) */
  duration?: number;

  /** Whether hook was skipped */
  skipped?: boolean;
}
