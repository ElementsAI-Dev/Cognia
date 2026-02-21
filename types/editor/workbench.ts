import type { editor } from 'monaco-editor';

export type EditorContextId =
  | 'designer'
  | 'canvas'
  | 'artifact'
  | 'workflow'
  | 'scheduler'
  | 'skill'
  | 'mermaid'
  | 'rules';

export type EditorRuntimeMode = 'web' | 'tauri';

export type EditorCapabilityLevel = 'l1' | 'l2' | 'l3';

export type EditorCapabilityKey =
  | 'completion'
  | 'hover'
  | 'definition'
  | 'references'
  | 'rename'
  | 'implementation'
  | 'typeDefinition'
  | 'signatureHelp'
  | 'documentHighlight'
  | 'documentSymbols'
  | 'workspaceSymbols'
  | 'codeActions'
  | 'formatting'
  | 'inlayHints'
  | 'semanticTokens'
  | 'diagnostics';

export interface EditorCapabilityMatrix {
  contextId: EditorContextId;
  languageId: string;
  runtimeMode: EditorRuntimeMode;
  level: EditorCapabilityLevel;
  source: 'lsp' | 'monaco' | 'mixed';
  fallbackReason?: string;
  capabilities: Record<EditorCapabilityKey, boolean>;
}

export interface EditorCommandContribution {
  id: string;
  title: string;
  group?: string;
  shortcut?: string;
  keywords?: string[];
  requiresCapability?: EditorCapabilityKey | EditorCapabilityKey[];
  when?: () => boolean;
  run: () => void | Promise<void>;
}

export interface EditorContextSnapshot {
  token: string;
  contextId: EditorContextId;
  label: string;
  languageId: string;
  runtimeMode: EditorRuntimeMode;
  capabilities: EditorCapabilityMatrix;
  commandCount: number;
  isActive: boolean;
}

export interface RegisteredEditorContext {
  token: string;
  contextId: EditorContextId;
  label: string;
  languageId: string;
  runtimeMode: EditorRuntimeMode;
  editor: editor.IStandaloneCodeEditor;
  capabilities: EditorCapabilityMatrix;
  commands: EditorCommandContribution[];
}
