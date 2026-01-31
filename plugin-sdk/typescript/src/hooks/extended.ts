/**
 * Plugin Hooks (Complete)
 *
 * @description Complete hook definitions for deeper integration with application features.
 * Includes additional event hooks for projects, canvas, artifacts, export, themes, etc.
 */

import type { PluginHooks, PluginMessage } from './base';
import type { PluginCanvasDocument } from '../context/extended';

/**
 * Complete plugin hooks combining base and event hooks
 *
 * @remarks
 * Includes all base hooks plus additional event hooks for deeper
 * integration with application features.
 *
 * @example
 * ```typescript
 * const hooks: PluginHooksAll = {
 *   // Base hooks
 *   onEnable: async () => {},
 *   onAgentStep: (agentId, step) => {},
 *
 *   // Feature hooks
 *   onProjectCreate: (project) => {
 *     console.log('Project created:', project.id);
 *   },
 *   onCanvasContentChange: (docId, content, prev) => {
 *     console.log('Canvas content changed');
 *   },
 *   onThemeModeChange: (mode, resolved) => {
 *     console.log('Theme changed to', resolved);
 *   },
 * };
 * ```
 */
export interface PluginHooksAll extends PluginHooks {
  // Project hooks
  /** Called when a project is created */
  onProjectCreate?: (project: unknown) => void | Promise<void>; // Project
  /** Called when a project is updated */
  onProjectUpdate?: (project: unknown, changes: unknown) => void | Promise<void>; // Project, Partial<Project>
  /** Called when a project is deleted */
  onProjectDelete?: (projectId: string) => void | Promise<void>;
  /** Called when the active project changes */
  onProjectSwitch?: (projectId: string | null, previousProjectId: string | null) => void;
  /** Called when a file is added to project knowledge base */
  onKnowledgeFileAdd?: (projectId: string, file: unknown) => void | Promise<void>; // KnowledgeFile
  /** Called when a knowledge file is removed */
  onKnowledgeFileRemove?: (projectId: string, fileId: string) => void | Promise<void>;
  /** Called when a session is linked to a project */
  onSessionLinked?: (projectId: string, sessionId: string) => void;
  /** Called when a session is unlinked from a project */
  onSessionUnlinked?: (projectId: string, sessionId: string) => void;

  // Canvas hooks
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

  // Artifact hooks
  /** Called when an artifact is created */
  onArtifactCreate?: (artifact: unknown) => void | Promise<void>; // Artifact
  /** Called when an artifact is updated */
  onArtifactUpdate?: (artifact: unknown, changes: unknown) => void; // Artifact, Partial<Artifact>
  /** Called when an artifact is deleted */
  onArtifactDelete?: (artifactId: string) => void;
  /** Called when the artifact panel is opened */
  onArtifactOpen?: (artifactId: string) => void;
  /** Called when the artifact panel is closed */
  onArtifactClose?: () => void;
  /** Called when artifact code is executed */
  onArtifactExecute?: (artifactId: string, result: { success: boolean; error?: string }) => void;
  /** Called when an artifact is exported */
  onArtifactExport?: (artifactId: string, format: string) => void;

  // Export hooks
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

  // Theme hooks
  /** Called when theme mode changes */
  onThemeModeChange?: (mode: 'light' | 'dark' | 'system', resolvedMode: 'light' | 'dark') => void;
  /** Called when color preset changes */
  onColorPresetChange?: (preset: string) => void;
  /** Called when a custom theme is activated */
  onCustomThemeActivate?: (themeId: string) => void;

  // AI/Chat hooks
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

  // Vector/RAG hooks
  /** Called when documents are added to vector store */
  onDocumentsIndexed?: (collection: string, count: number) => void;
  /** Called when a vector search is performed */
  onVectorSearch?: (collection: string, query: string, resultCount: number) => void;
  /** Called when RAG context is retrieved for a message */
  onRAGContextRetrieved?: (sessionId: string, sources: { id: string; content: string; score: number }[]) => void;

  // Workflow hooks
  /** Called when a workflow starts */
  onWorkflowStart?: (workflowId: string, name: string) => void;
  /** Called when a workflow step completes */
  onWorkflowStepComplete?: (workflowId: string, stepIndex: number, result: unknown) => void;
  /** Called when a workflow completes */
  onWorkflowComplete?: (workflowId: string, success: boolean, result?: unknown) => void;
  /** Called when a workflow errors */
  onWorkflowError?: (workflowId: string, error: Error) => void;

  // UI hooks
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
// Backward Compatibility Aliases (Deprecated)
// =============================================================================

/**
 * @deprecated Use `PluginHooksAll` instead
 */
export type ExtendedPluginHooks = PluginHooksAll;
