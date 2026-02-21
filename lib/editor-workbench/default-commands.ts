import type * as Monaco from 'monaco-editor';
import type { EditorCommandContribution, EditorContextId } from '@/types/editor/workbench';

interface BuildDefaultEditorCommandsInput {
  contextId: EditorContextId;
  editor: Monaco.editor.IStandaloneCodeEditor;
}

function runMonacoAction(
  editor: Monaco.editor.IStandaloneCodeEditor,
  actionId: string,
  payload: unknown = null
): void {
  editor.trigger('editor-workbench', actionId, payload);
}

export function buildDefaultEditorCommands(
  input: BuildDefaultEditorCommandsInput
): EditorCommandContribution[] {
  const { contextId, editor } = input;
  const contextPrefix = `${contextId}.editor`;

  return [
    {
      id: `${contextPrefix}.format`,
      title: 'Format Document',
      group: 'Editor',
      shortcut: 'Shift+Alt+F',
      requiresCapability: 'formatting',
      run: () => runMonacoAction(editor, 'editor.action.formatDocument'),
    },
    {
      id: `${contextPrefix}.quickFix`,
      title: 'Quick Fix',
      group: 'Editor',
      shortcut: 'Ctrl+.',
      requiresCapability: 'codeActions',
      run: () => runMonacoAction(editor, 'editor.action.quickFix'),
    },
    {
      id: `${contextPrefix}.goToDefinition`,
      title: 'Go to Definition',
      group: 'Editor',
      shortcut: 'F12',
      requiresCapability: 'definition',
      run: () => runMonacoAction(editor, 'editor.action.revealDefinition'),
    },
    {
      id: `${contextPrefix}.findReferences`,
      title: 'Find References',
      group: 'Editor',
      shortcut: 'Shift+F12',
      requiresCapability: 'references',
      run: () => runMonacoAction(editor, 'editor.action.referenceSearch.trigger'),
    },
    {
      id: `${contextPrefix}.rename`,
      title: 'Rename Symbol',
      group: 'Editor',
      shortcut: 'F2',
      requiresCapability: 'rename',
      run: () => runMonacoAction(editor, 'editor.action.rename'),
    },
    {
      id: `${contextPrefix}.goToSymbol`,
      title: 'Go to Symbol in File',
      group: 'Editor',
      shortcut: 'Ctrl+Shift+O',
      requiresCapability: 'documentSymbols',
      run: () => runMonacoAction(editor, 'editor.action.quickOutline'),
    },
    {
      id: `${contextPrefix}.nextProblem`,
      title: 'Go to Next Problem',
      group: 'Editor',
      shortcut: 'F8',
      requiresCapability: 'diagnostics',
      run: () => runMonacoAction(editor, 'editor.action.marker.nextInFiles'),
    },
    {
      id: `${contextPrefix}.toggleWordWrap`,
      title: 'Toggle Word Wrap',
      group: 'Editor',
      shortcut: 'Alt+Z',
      run: () => runMonacoAction(editor, 'editor.action.toggleWordWrap'),
    },
    {
      id: `${contextPrefix}.toggleMinimap`,
      title: 'Toggle Minimap',
      group: 'Editor',
      run: () => {
        const rawOptions = (
          editor as unknown as { getRawOptions?: () => Monaco.editor.IEditorOptions }
        ).getRawOptions?.();
        const enabled =
          typeof rawOptions?.minimap === 'object' && rawOptions.minimap !== null
            ? Boolean(rawOptions.minimap.enabled)
            : true;
        editor.updateOptions({ minimap: { enabled: !enabled } });
      },
    },
  ];
}
