import type { editor as MonacoEditor } from 'monaco-editor';
import { getActiveEditorCommandGroup, routeEditorCommand } from './editor-command-router';
import {
  listEditorContexts,
  registerEditorContext,
  setActiveEditorContext,
  unregisterEditorContext,
} from './editor-context-registry';
import type { EditorCapabilityMatrix } from '@/types/editor/workbench';

function createCapabilityMatrix(partial?: Partial<EditorCapabilityMatrix>): EditorCapabilityMatrix {
  return {
    contextId: 'designer',
    languageId: 'typescript',
    runtimeMode: 'web',
    level: 'l2',
    source: 'mixed',
    capabilities: {
      completion: true,
      hover: true,
      definition: true,
      references: false,
      rename: false,
      implementation: false,
      typeDefinition: false,
      signatureHelp: false,
      documentHighlight: true,
      documentSymbols: true,
      workspaceSymbols: false,
      codeActions: true,
      formatting: true,
      inlayHints: false,
      semanticTokens: false,
      diagnostics: true,
    },
    ...partial,
  };
}

function createEditorMock(): MonacoEditor.IStandaloneCodeEditor {
  return {
    onDidFocusEditorText: () => ({ dispose: () => {} }),
    trigger: () => {},
  } as unknown as MonacoEditor.IStandaloneCodeEditor;
}

describe('editor-command-router', () => {
  beforeEach(() => {
    for (const context of listEditorContexts()) {
      unregisterEditorContext(context.token);
    }
    setActiveEditorContext(null);
  });

  it('returns null when no active editor exists', () => {
    expect(getActiveEditorCommandGroup()).toBeNull();
  });

  it('filters commands by capability and executes routed commands', async () => {
    const executeAllowed = jest.fn();
    const executeBlocked = jest.fn();

    const token = registerEditorContext({
      contextId: 'designer',
      label: 'Designer',
      languageId: 'typescript',
      runtimeMode: 'web',
      editor: createEditorMock(),
      capabilities: createCapabilityMatrix(),
      commands: [
        {
          id: 'editor.format',
          title: 'Format Document',
          requiresCapability: 'formatting',
          run: executeAllowed,
        },
        {
          id: 'editor.references',
          title: 'Find References',
          requiresCapability: 'references',
          run: executeBlocked,
        },
      ],
    });

    setActiveEditorContext(token);
    const commandGroup = getActiveEditorCommandGroup();
    expect(commandGroup).not.toBeNull();
    expect(commandGroup?.commands.map((item) => item.id)).toEqual(['editor.format']);

    await expect(routeEditorCommand('editor.format')).resolves.toBe(true);
    expect(executeAllowed).toHaveBeenCalledTimes(1);
    await expect(routeEditorCommand('editor.references')).resolves.toBe(false);
    expect(executeBlocked).not.toHaveBeenCalled();
  });
});

