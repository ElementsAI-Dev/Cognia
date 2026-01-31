/**
 * Plugin Hooks Tests
 *
 * @description Tests for complete plugin hook definitions.
 */

import type { PluginHooksAll } from './extended';

describe('Plugin Hooks Types', () => {
  describe('PluginHooksAll', () => {
    it('should inherit from base PluginHooks', () => {
      const hooks: PluginHooksAll = {
        // Base hooks
        onLoad: jest.fn(),
        onEnable: jest.fn(),
        onAgentStart: jest.fn(),
        // Feature hooks
        onProjectCreate: jest.fn(),
      };

      expect(hooks.onLoad).toBeDefined();
      expect(hooks.onEnable).toBeDefined();
      expect(hooks.onAgentStart).toBeDefined();
      expect(hooks.onProjectCreate).toBeDefined();
    });

    it('should support project hooks', () => {
      const hooks: PluginHooksAll = {
        onProjectCreate: jest.fn(),
        onProjectUpdate: jest.fn(),
        onProjectDelete: jest.fn(),
        onProjectSwitch: jest.fn(),
        onKnowledgeFileAdd: jest.fn(),
        onKnowledgeFileRemove: jest.fn(),
        onSessionLinked: jest.fn(),
        onSessionUnlinked: jest.fn(),
      };

      expect(hooks.onProjectCreate).toBeDefined();
      expect(hooks.onProjectUpdate).toBeDefined();
      expect(hooks.onProjectDelete).toBeDefined();
      expect(hooks.onProjectSwitch).toBeDefined();
      expect(hooks.onKnowledgeFileAdd).toBeDefined();
      expect(hooks.onKnowledgeFileRemove).toBeDefined();
      expect(hooks.onSessionLinked).toBeDefined();
      expect(hooks.onSessionUnlinked).toBeDefined();
    });

    it('should support canvas hooks', () => {
      const hooks: PluginHooksAll = {
        onCanvasCreate: jest.fn(),
        onCanvasUpdate: jest.fn(),
        onCanvasDelete: jest.fn(),
        onCanvasSwitch: jest.fn(),
        onCanvasContentChange: jest.fn(),
        onCanvasVersionSave: jest.fn(),
        onCanvasVersionRestore: jest.fn(),
        onCanvasSelection: jest.fn(),
      };

      expect(hooks.onCanvasCreate).toBeDefined();
      expect(hooks.onCanvasUpdate).toBeDefined();
      expect(hooks.onCanvasDelete).toBeDefined();
      expect(hooks.onCanvasSwitch).toBeDefined();
      expect(hooks.onCanvasContentChange).toBeDefined();
      expect(hooks.onCanvasVersionSave).toBeDefined();
      expect(hooks.onCanvasVersionRestore).toBeDefined();
      expect(hooks.onCanvasSelection).toBeDefined();
    });

    it('should support artifact hooks', () => {
      const hooks: PluginHooksAll = {
        onArtifactCreate: jest.fn(),
        onArtifactUpdate: jest.fn(),
        onArtifactDelete: jest.fn(),
        onArtifactOpen: jest.fn(),
        onArtifactClose: jest.fn(),
        onArtifactExecute: jest.fn(),
        onArtifactExport: jest.fn(),
      };

      expect(hooks.onArtifactCreate).toBeDefined();
      expect(hooks.onArtifactUpdate).toBeDefined();
      expect(hooks.onArtifactDelete).toBeDefined();
      expect(hooks.onArtifactOpen).toBeDefined();
      expect(hooks.onArtifactClose).toBeDefined();
      expect(hooks.onArtifactExecute).toBeDefined();
      expect(hooks.onArtifactExport).toBeDefined();
    });

    it('should support export hooks', () => {
      const hooks: PluginHooksAll = {
        onExportStart: jest.fn(),
        onExportComplete: jest.fn(),
        onExportTransform: jest.fn(),
        onProjectExportStart: jest.fn(),
        onProjectExportComplete: jest.fn(),
      };

      expect(hooks.onExportStart).toBeDefined();
      expect(hooks.onExportComplete).toBeDefined();
      expect(hooks.onExportTransform).toBeDefined();
      expect(hooks.onProjectExportStart).toBeDefined();
      expect(hooks.onProjectExportComplete).toBeDefined();
    });

    it('should support theme hooks', () => {
      const hooks: PluginHooksAll = {
        onThemeModeChange: jest.fn(),
        onColorPresetChange: jest.fn(),
        onCustomThemeActivate: jest.fn(),
      };

      expect(hooks.onThemeModeChange).toBeDefined();
      expect(hooks.onColorPresetChange).toBeDefined();
      expect(hooks.onCustomThemeActivate).toBeDefined();
    });

    it('should support AI/Chat hooks', () => {
      const hooks: PluginHooksAll = {
        onChatRequest: jest.fn(),
        onStreamStart: jest.fn(),
        onStreamChunk: jest.fn(),
        onStreamEnd: jest.fn(),
        onChatError: jest.fn(),
        onTokenUsage: jest.fn(),
      };

      expect(hooks.onChatRequest).toBeDefined();
      expect(hooks.onStreamStart).toBeDefined();
      expect(hooks.onStreamChunk).toBeDefined();
      expect(hooks.onStreamEnd).toBeDefined();
      expect(hooks.onChatError).toBeDefined();
      expect(hooks.onTokenUsage).toBeDefined();
    });

    it('should support Vector/RAG hooks', () => {
      const hooks: PluginHooksAll = {
        onDocumentsIndexed: jest.fn(),
        onVectorSearch: jest.fn(),
        onRAGContextRetrieved: jest.fn(),
      };

      expect(hooks.onDocumentsIndexed).toBeDefined();
      expect(hooks.onVectorSearch).toBeDefined();
      expect(hooks.onRAGContextRetrieved).toBeDefined();
    });

    it('should support workflow hooks', () => {
      const hooks: PluginHooksAll = {
        onWorkflowStart: jest.fn(),
        onWorkflowStepComplete: jest.fn(),
        onWorkflowComplete: jest.fn(),
        onWorkflowError: jest.fn(),
      };

      expect(hooks.onWorkflowStart).toBeDefined();
      expect(hooks.onWorkflowStepComplete).toBeDefined();
      expect(hooks.onWorkflowComplete).toBeDefined();
      expect(hooks.onWorkflowError).toBeDefined();
    });

    it('should support UI hooks', () => {
      const hooks: PluginHooksAll = {
        onSidebarToggle: jest.fn(),
        onPanelOpen: jest.fn(),
        onPanelClose: jest.fn(),
        onShortcut: jest.fn(),
        onContextMenuShow: jest.fn(),
      };

      expect(hooks.onSidebarToggle).toBeDefined();
      expect(hooks.onPanelOpen).toBeDefined();
      expect(hooks.onPanelClose).toBeDefined();
      expect(hooks.onShortcut).toBeDefined();
      expect(hooks.onContextMenuShow).toBeDefined();
    });

    it('should call project hooks with correct arguments', () => {
      const onProjectCreate = jest.fn();
      const onProjectSwitch = jest.fn();
      const hooks: PluginHooksAll = {
        onProjectCreate,
        onProjectSwitch,
      };

      const project = { id: 'proj-1', name: 'Test Project' };
      hooks.onProjectCreate?.(project);
      hooks.onProjectSwitch?.('proj-1', 'proj-0');

      expect(onProjectCreate).toHaveBeenCalledWith(project);
      expect(onProjectSwitch).toHaveBeenCalledWith('proj-1', 'proj-0');
    });

    it('should call canvas hooks with correct arguments', () => {
      const onCanvasContentChange = jest.fn();
      const onCanvasSelection = jest.fn();
      const hooks: PluginHooksAll = {
        onCanvasContentChange,
        onCanvasSelection,
      };

      hooks.onCanvasContentChange?.('doc-1', 'new content', 'old content');
      hooks.onCanvasSelection?.('doc-1', { start: 0, end: 10, text: 'selected' });

      expect(onCanvasContentChange).toHaveBeenCalledWith('doc-1', 'new content', 'old content');
      expect(onCanvasSelection).toHaveBeenCalledWith('doc-1', {
        start: 0,
        end: 10,
        text: 'selected',
      });
    });

    it('should call theme hooks with correct arguments', () => {
      const onThemeModeChange = jest.fn();
      const hooks: PluginHooksAll = {
        onThemeModeChange,
      };

      hooks.onThemeModeChange?.('dark', 'dark');
      hooks.onThemeModeChange?.('system', 'light');

      expect(onThemeModeChange).toHaveBeenCalledWith('dark', 'dark');
      expect(onThemeModeChange).toHaveBeenCalledWith('system', 'light');
    });

    it('should call chat hooks and allow message modification', async () => {
      const onChatRequest = jest.fn((messages) => [
        ...messages,
        { role: 'system', content: 'Additional context' },
      ]);
      const hooks: PluginHooksAll = {
        onChatRequest,
      };

      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const modified = await hooks.onChatRequest?.(
        messages as any,
        'gpt-4',
      );

      expect(modified).toHaveLength(2);
    });

    it('should call token usage hook', () => {
      const onTokenUsage = jest.fn();
      const hooks: PluginHooksAll = {
        onTokenUsage,
      };

      hooks.onTokenUsage?.('session-1', {
        prompt: 100,
        completion: 50,
        total: 150,
      });

      expect(onTokenUsage).toHaveBeenCalledWith('session-1', {
        prompt: 100,
        completion: 50,
        total: 150,
      });
    });

    it('should call export transform hook', async () => {
      const onExportTransform = jest.fn(async (content: string, format: string) => {
        return `<!-- Format: ${format} -->\n${content}`;
      });
      const hooks: PluginHooksAll = {
        onExportTransform,
      };

      const transformed = await hooks.onExportTransform?.('Hello World', 'markdown');
      expect(transformed).toBe('<!-- Format: markdown -->\nHello World');
    });

    it('should call workflow hooks with correct arguments', () => {
      const onWorkflowStart = jest.fn();
      const onWorkflowStepComplete = jest.fn();
      const onWorkflowComplete = jest.fn();
      const hooks: PluginHooksAll = {
        onWorkflowStart,
        onWorkflowStepComplete,
        onWorkflowComplete,
      };

      hooks.onWorkflowStart?.('workflow-1', 'Data Processing');
      hooks.onWorkflowStepComplete?.('workflow-1', 2, { processed: 100 });
      hooks.onWorkflowComplete?.('workflow-1', true, { total: 500 });

      expect(onWorkflowStart).toHaveBeenCalledWith('workflow-1', 'Data Processing');
      expect(onWorkflowStepComplete).toHaveBeenCalledWith('workflow-1', 2, { processed: 100 });
      expect(onWorkflowComplete).toHaveBeenCalledWith('workflow-1', true, { total: 500 });
    });

    it('should handle shortcut hook with return value', () => {
      const onShortcut = jest.fn((shortcut: string) => {
        if (shortcut === 'Ctrl+K') {
          return true; // handled
        }
        return false; // not handled
      });
      const hooks: PluginHooksAll = {
        onShortcut,
      };

      expect(hooks.onShortcut?.('Ctrl+K')).toBe(true);
      expect(hooks.onShortcut?.('Ctrl+L')).toBe(false);
    });

    it('should handle context menu show hook', () => {
      const onContextMenuShow = jest.fn((context) => {
        if (context.type === 'message') {
          return {
            items: [{ id: 'custom-action', label: 'Custom Action' }],
          };
        }
        return undefined;
      });
      const hooks: PluginHooksAll = {
        onContextMenuShow,
      };

      const result = hooks.onContextMenuShow?.({ type: 'message', target: {} });
      expect(result?.items).toHaveLength(1);

      const emptyResult = hooks.onContextMenuShow?.({ type: 'other' });
      expect(emptyResult).toBeUndefined();
    });
  });
});
