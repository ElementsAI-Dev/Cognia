/**
 * PluginWorkflowIntegration Tests
 */

import { 
  PluginWorkflowIntegration, 
  getPluginWorkflowIntegration, 
  resetPluginWorkflowIntegration,
  usePluginWorkflowIntegration,
} from './workflow-integration';
import { usePluginStore } from '@/stores/plugin';
import * as hooksManager from './hooks-manager';

// Mock dependencies
jest.mock('@/stores/plugin', () => ({
  usePluginStore: {
    getState: jest.fn(),
  },
}));

jest.mock('./hooks-manager', () => ({
  getExtendedHooksManager: jest.fn(),
}));

const mockGetState = usePluginStore.getState as jest.Mock;
const mockGetExtendedHooksManager = hooksManager.getExtendedHooksManager as jest.Mock;

describe('PluginWorkflowIntegration', () => {
  let integration: PluginWorkflowIntegration;
  let mockHooksManager: {
    dispatchStreamStart: jest.Mock;
    dispatchStreamChunk: jest.Mock;
    dispatchStreamEnd: jest.Mock;
    dispatchChatError: jest.Mock;
    dispatchTokenUsage: jest.Mock;
    dispatchWorkflowStart: jest.Mock;
    dispatchWorkflowStepComplete: jest.Mock;
    dispatchWorkflowComplete: jest.Mock;
    dispatchWorkflowError: jest.Mock;
    dispatchExportTransform: jest.Mock;
    dispatchExportStart: jest.Mock;
    dispatchExportComplete: jest.Mock;
    dispatchRAGContextRetrieved: jest.Mock;
    dispatchDocumentsIndexed: jest.Mock;
    dispatchVectorSearch: jest.Mock;
    dispatchShortcut: jest.Mock;
  };

  beforeEach(() => {
    resetPluginWorkflowIntegration();
    
    mockHooksManager = {
      dispatchStreamStart: jest.fn(),
      dispatchStreamChunk: jest.fn(),
      dispatchStreamEnd: jest.fn(),
      dispatchChatError: jest.fn(),
      dispatchTokenUsage: jest.fn(),
      dispatchWorkflowStart: jest.fn(),
      dispatchWorkflowStepComplete: jest.fn(),
      dispatchWorkflowComplete: jest.fn(),
      dispatchWorkflowError: jest.fn(),
      dispatchExportTransform: jest.fn().mockResolvedValue('transformed'),
      dispatchExportStart: jest.fn().mockResolvedValue(undefined),
      dispatchExportComplete: jest.fn(),
      dispatchRAGContextRetrieved: jest.fn(),
      dispatchDocumentsIndexed: jest.fn(),
      dispatchVectorSearch: jest.fn(),
      dispatchShortcut: jest.fn().mockResolvedValue(false),
    };
    
    mockGetExtendedHooksManager.mockReturnValue(mockHooksManager);
    mockGetState.mockReturnValue({ plugins: {} });
    
    integration = new PluginWorkflowIntegration();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Message Processing', () => {
    it('should process message before send through plugin hooks', async () => {
      const onChatRequest = jest.fn().mockResolvedValue([
        { role: 'user', content: 'transformed message' },
      ]);

      mockGetState.mockReturnValue({
        plugins: {
          'plugin-1': {
            status: 'enabled',
            hooks: { onChatRequest },
          },
        },
      });

      const message = { role: 'user', content: 'original' };
      const result = await integration.processMessageBeforeSend(message as never, 'gpt-4');

      expect(onChatRequest).toHaveBeenCalled();
      expect(result).toEqual([{ role: 'user', content: 'transformed message' }]);
    });

    it('should return original message if no plugins transform it', async () => {
      mockGetState.mockReturnValue({ plugins: {} });

      const message = { role: 'user', content: 'original' };
      const result = await integration.processMessageBeforeSend(message as never, 'gpt-4');

      expect(result).toEqual([message]);
    });

    it('should handle plugin errors gracefully', async () => {
      const onChatRequest = jest.fn().mockRejectedValue(new Error('Plugin error'));

      mockGetState.mockReturnValue({
        plugins: {
          'plugin-1': {
            status: 'enabled',
            hooks: { onChatRequest },
          },
        },
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const message = { role: 'user', content: 'original' };
      const result = await integration.processMessageBeforeSend(message as never, 'gpt-4');

      expect(result).toEqual([message]);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Stream Notifications', () => {
    it('should notify stream start', () => {
      integration.notifyStreamStart('session-1');
      expect(mockHooksManager.dispatchStreamStart).toHaveBeenCalledWith('session-1');
    });

    it('should notify stream chunk', () => {
      integration.notifyStreamChunk('session-1', 'chunk', 'fullContent');
      expect(mockHooksManager.dispatchStreamChunk).toHaveBeenCalledWith('session-1', 'chunk', 'fullContent');
    });

    it('should notify stream end', () => {
      integration.notifyStreamEnd('session-1', 'finalContent');
      expect(mockHooksManager.dispatchStreamEnd).toHaveBeenCalledWith('session-1', 'finalContent');
    });

    it('should notify chat error', () => {
      const error = new Error('Chat error');
      integration.notifyChatError('session-1', error);
      expect(mockHooksManager.dispatchChatError).toHaveBeenCalledWith('session-1', error);
    });

    it('should notify token usage', () => {
      const usage = { prompt: 100, completion: 50, total: 150 };
      integration.notifyTokenUsage('session-1', usage);
      expect(mockHooksManager.dispatchTokenUsage).toHaveBeenCalledWith('session-1', usage);
    });
  });

  describe('Workflow Notifications', () => {
    it('should notify workflow start', () => {
      integration.notifyWorkflowStart('workflow-1', 'Test Workflow');
      expect(mockHooksManager.dispatchWorkflowStart).toHaveBeenCalledWith('workflow-1', 'Test Workflow');
    });

    it('should notify workflow step complete', () => {
      integration.notifyWorkflowStepComplete('workflow-1', 0, { data: 'result' });
      expect(mockHooksManager.dispatchWorkflowStepComplete).toHaveBeenCalledWith('workflow-1', 0, { data: 'result' });
    });

    it('should notify workflow complete', () => {
      integration.notifyWorkflowComplete('workflow-1', true, { success: true });
      expect(mockHooksManager.dispatchWorkflowComplete).toHaveBeenCalledWith('workflow-1', true, { success: true });
    });

    it('should notify workflow error', () => {
      const error = new Error('Workflow error');
      integration.notifyWorkflowError('workflow-1', error);
      expect(mockHooksManager.dispatchWorkflowError).toHaveBeenCalledWith('workflow-1', error);
    });
  });

  describe('Export Processing', () => {
    it('should process export content through plugins', async () => {
      const result = await integration.processExportContent('original', 'markdown');
      expect(mockHooksManager.dispatchExportTransform).toHaveBeenCalledWith('original', 'markdown');
      expect(result).toBe('transformed');
    });

    it('should notify export start', async () => {
      await integration.notifyExportStart('session-1', 'pdf');
      expect(mockHooksManager.dispatchExportStart).toHaveBeenCalledWith('session-1', 'pdf');
    });

    it('should notify export complete', () => {
      integration.notifyExportComplete('session-1', 'pdf', true);
      expect(mockHooksManager.dispatchExportComplete).toHaveBeenCalledWith('session-1', 'pdf', true);
    });
  });

  describe('RAG/Vector Notifications', () => {
    it('should notify RAG context retrieved', () => {
      const sources = [{ id: '1', content: 'test', score: 0.9 }];
      integration.notifyRAGContextRetrieved('session-1', sources);
      expect(mockHooksManager.dispatchRAGContextRetrieved).toHaveBeenCalledWith('session-1', sources);
    });

    it('should notify documents indexed', () => {
      integration.notifyDocumentsIndexed('collection-1', 10);
      expect(mockHooksManager.dispatchDocumentsIndexed).toHaveBeenCalledWith('collection-1', 10);
    });

    it('should notify vector search', () => {
      integration.notifyVectorSearch('collection-1', 'query', 5);
      expect(mockHooksManager.dispatchVectorSearch).toHaveBeenCalledWith('collection-1', 'query', 5);
    });
  });

  describe('Shortcut Handling', () => {
    it('should handle shortcut and return result', async () => {
      mockHooksManager.dispatchShortcut.mockResolvedValue(true);
      
      const result = await integration.handleShortcut('Ctrl+S');
      
      expect(mockHooksManager.dispatchShortcut).toHaveBeenCalledWith('Ctrl+S');
      expect(result).toBe(true);
    });
  });

  describe('Singleton', () => {
    it('should return the same instance', () => {
      const instance1 = getPluginWorkflowIntegration();
      const instance2 = getPluginWorkflowIntegration();
      
      expect(instance1).toBe(instance2);
    });

    it('should reset singleton on reset call', () => {
      const instance1 = getPluginWorkflowIntegration();
      resetPluginWorkflowIntegration();
      const instance2 = getPluginWorkflowIntegration();
      
      expect(instance1).not.toBe(instance2);
    });

    it('should provide hook for accessing integration', () => {
      const result = usePluginWorkflowIntegration();
      expect(result).toBeInstanceOf(PluginWorkflowIntegration);
    });
  });
});
