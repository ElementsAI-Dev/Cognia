import type { editor as MonacoEditor } from 'monaco-editor';
import { buildDefaultEditorCommands } from './default-commands';

function createEditorMock(): MonacoEditor.IStandaloneCodeEditor {
  return {
    trigger: jest.fn(),
    updateOptions: jest.fn(),
    getRawOptions: jest.fn(() => ({
      minimap: { enabled: true },
    })),
  } as unknown as MonacoEditor.IStandaloneCodeEditor;
}

describe('default-commands', () => {
  it('includes workspace symbol command gated by workspaceSymbols capability', async () => {
    const editor = createEditorMock();
    const commands = buildDefaultEditorCommands({
      contextId: 'designer',
      editor,
    });

    const workspaceCommand = commands.find(
      (command) => command.id === 'designer.editor.goToWorkspaceSymbol'
    );

    expect(workspaceCommand).toBeDefined();
    expect(workspaceCommand?.requiresCapability).toBe('workspaceSymbols');

    await workspaceCommand?.run();
    expect(editor.trigger).toHaveBeenCalledWith(
      'editor-workbench',
      'editor.action.lspWorkspaceSymbols',
      null
    );
  });
});
