import type { MonacoLspFeatureSupport } from '@/lib/monaco/lsp/monaco-lsp-adapter';
import type {
  EditorCommandContribution,
  EditorContextId,
  EditorRuntimeMode,
  RegisteredEditorContext,
} from '@/types/editor/workbench';
import { buildDefaultEditorCommands } from './default-commands';
import { resolveEditorCapabilityMatrix } from './editor-capability-resolver';
import {
  registerEditorContext,
  setActiveEditorContext,
  unregisterEditorContext,
  updateEditorContext,
} from './editor-context-registry';
import type { editor as MonacoEditor } from 'monaco-editor';

export interface MonacoContextBinding {
  token: string;
  update: (input: MonacoContextBindingUpdate) => void;
  dispose: () => void;
}

export interface MonacoContextBindingInput {
  contextId: EditorContextId;
  label: string;
  languageId: string;
  editor: MonacoEditor.IStandaloneCodeEditor;
  runtimeMode?: EditorRuntimeMode;
  lspConnected?: boolean;
  lspFeatures?: Partial<MonacoLspFeatureSupport>;
  fallbackReason?: string;
  commands?: EditorCommandContribution[];
}

export interface MonacoContextBindingUpdate {
  label?: string;
  languageId?: string;
  runtimeMode?: EditorRuntimeMode;
  lspConnected?: boolean;
  lspFeatures?: Partial<MonacoLspFeatureSupport>;
  fallbackReason?: string;
  commands?: EditorCommandContribution[];
}

function resolveRuntimeMode(runtimeMode?: EditorRuntimeMode): EditorRuntimeMode {
  if (runtimeMode) {
    return runtimeMode;
  }
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window ? 'tauri' : 'web';
}

function resolveCommands(
  contextId: EditorContextId,
  editor: MonacoEditor.IStandaloneCodeEditor,
  commands?: EditorCommandContribution[]
): EditorCommandContribution[] {
  return commands && commands.length > 0
    ? commands
    : buildDefaultEditorCommands({
        contextId,
        editor,
      });
}

export function bindMonacoEditorContext(input: MonacoContextBindingInput): MonacoContextBinding {
  const runtimeMode = resolveRuntimeMode(input.runtimeMode);
  const capabilities = resolveEditorCapabilityMatrix({
    contextId: input.contextId,
    languageId: input.languageId,
    runtimeMode,
    lspConnected: input.lspConnected,
    lspFeatures: input.lspFeatures,
    fallbackReason: input.fallbackReason,
  });

  const token = registerEditorContext({
    contextId: input.contextId,
    label: input.label,
    languageId: input.languageId,
    runtimeMode,
    editor: input.editor,
    capabilities,
    commands: resolveCommands(input.contextId, input.editor, input.commands),
  });

  const focusDisposable = input.editor.onDidFocusEditorText(() => {
    setActiveEditorContext(token);
  });

  const update = (updates: MonacoContextBindingUpdate) => {
    const nextRuntimeMode = resolveRuntimeMode(updates.runtimeMode ?? runtimeMode);
    const nextLanguageId = updates.languageId ?? input.languageId;
    const nextCapabilities = resolveEditorCapabilityMatrix({
      contextId: input.contextId,
      languageId: nextLanguageId,
      runtimeMode: nextRuntimeMode,
      lspConnected: updates.lspConnected,
      lspFeatures: updates.lspFeatures,
      fallbackReason: updates.fallbackReason,
    });
    updateEditorContext(token, {
      label: updates.label ?? input.label,
      languageId: nextLanguageId,
      runtimeMode: nextRuntimeMode,
      capabilities: nextCapabilities as RegisteredEditorContext['capabilities'],
      commands: resolveCommands(input.contextId, input.editor, updates.commands),
    });
  };

  const dispose = () => {
    focusDisposable.dispose();
    unregisterEditorContext(token);
  };

  return {
    token,
    update,
    dispose,
  };
}
