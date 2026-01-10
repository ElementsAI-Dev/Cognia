/**
 * ExtendedHooksManager Tests
 */

import { ExtendedHooksManager, getExtendedHooksManager, resetExtendedHooksManager } from './hooks-manager';
import { usePluginStore } from '@/stores/plugin';

// Mock the plugin store
jest.mock('@/stores/plugin', () => ({
  usePluginStore: {
    getState: jest.fn(),
  },
}));

const mockGetState = usePluginStore.getState as jest.Mock;

describe('ExtendedHooksManager', () => {
  let manager: ExtendedHooksManager;

  beforeEach(() => {
    resetExtendedHooksManager();
    manager = new ExtendedHooksManager();
    jest.clearAllMocks();
  });

  describe('Priority Management', () => {
    it('should set and get hook priority', () => {
      manager.setPriority('plugin-1', 'onProjectCreate', 'high');
      expect(manager.getPriority('plugin-1', 'onProjectCreate')).toBe('high');
    });

    it('should return normal priority by default', () => {
      expect(manager.getPriority('unknown-plugin', 'onProjectCreate')).toBe('normal');
    });

    it('should handle multiple hooks for same plugin', () => {
      manager.setPriority('plugin-1', 'onProjectCreate', 'high');
      manager.setPriority('plugin-1', 'onProjectUpdate', 'low');
      
      expect(manager.getPriority('plugin-1', 'onProjectCreate')).toBe('high');
      expect(manager.getPriority('plugin-1', 'onProjectUpdate')).toBe('low');
    });
  });

  describe('Project Hooks', () => {
    const mockProject = {
      id: 'project-1',
      name: 'Test Project',
    };

    it('should dispatch onProjectCreate hook', async () => {
      const onProjectCreate = jest.fn();
      
      mockGetState.mockReturnValue({
        plugins: {
          'plugin-1': {
            manifest: { id: 'plugin-1' },
            status: 'enabled',
            hooks: { onProjectCreate },
          },
        },
      });

      await manager.dispatchProjectCreate(mockProject as never);

      expect(onProjectCreate).toHaveBeenCalledWith(mockProject);
    });

    it('should dispatch onProjectDelete hook', async () => {
      const onProjectDelete = jest.fn();
      
      mockGetState.mockReturnValue({
        plugins: {
          'plugin-1': {
            manifest: { id: 'plugin-1' },
            status: 'enabled',
            hooks: { onProjectDelete },
          },
        },
      });

      await manager.dispatchProjectDelete('project-1');

      expect(onProjectDelete).toHaveBeenCalledWith('project-1');
    });

    it('should not call hooks for disabled plugins', async () => {
      const onProjectCreate = jest.fn();
      
      mockGetState.mockReturnValue({
        plugins: {
          'plugin-1': {
            manifest: { id: 'plugin-1' },
            status: 'disabled',
            hooks: { onProjectCreate },
          },
        },
      });

      await manager.dispatchProjectCreate(mockProject as never);

      expect(onProjectCreate).not.toHaveBeenCalled();
    });
  });

  describe('Artifact Hooks', () => {
    const mockArtifact = {
      id: 'artifact-1',
      title: 'Test Artifact',
      type: 'code',
    };

    it('should dispatch onArtifactCreate hook', async () => {
      const onArtifactCreate = jest.fn();
      
      mockGetState.mockReturnValue({
        plugins: {
          'plugin-1': {
            manifest: { id: 'plugin-1' },
            status: 'enabled',
            hooks: { onArtifactCreate },
          },
        },
      });

      await manager.dispatchArtifactCreate(mockArtifact as never);

      expect(onArtifactCreate).toHaveBeenCalledWith(mockArtifact);
    });
  });

  describe('Export Hooks', () => {
    it('should dispatch onExportStart hook', async () => {
      const onExportStart = jest.fn();
      
      mockGetState.mockReturnValue({
        plugins: {
          'plugin-1': {
            manifest: { id: 'plugin-1' },
            status: 'enabled',
            hooks: { onExportStart },
          },
        },
      });

      await manager.dispatchExportStart('session-1', 'markdown');

      expect(onExportStart).toHaveBeenCalledWith('session-1', 'markdown');
    });

    it('should chain export transformations', async () => {
      const transform1 = jest.fn().mockResolvedValue('transformed-1');
      const transform2 = jest.fn().mockResolvedValue('transformed-2');
      
      mockGetState.mockReturnValue({
        plugins: {
          'plugin-1': {
            manifest: { id: 'plugin-1' },
            status: 'enabled',
            hooks: { onExportTransform: transform1 },
          },
          'plugin-2': {
            manifest: { id: 'plugin-2' },
            status: 'enabled',
            hooks: { onExportTransform: transform2 },
          },
        },
      });

      const result = await manager.dispatchExportTransform('original', 'markdown');

      expect(result).toBe('transformed-2');
    });
  });

  describe('Stream Hooks', () => {
    it('should dispatch stream hooks', () => {
      const onStreamStart = jest.fn();
      const onStreamChunk = jest.fn();
      const onStreamEnd = jest.fn();
      
      mockGetState.mockReturnValue({
        plugins: {
          'plugin-1': {
            manifest: { id: 'plugin-1' },
            status: 'enabled',
            hooks: { onStreamStart, onStreamChunk, onStreamEnd },
          },
        },
      });

      manager.dispatchStreamStart('session-1');
      manager.dispatchStreamChunk('session-1', 'chunk', 'fullContent');
      manager.dispatchStreamEnd('session-1', 'finalContent');

      expect(onStreamStart).toHaveBeenCalledWith('session-1');
      expect(onStreamChunk).toHaveBeenCalledWith('session-1', 'chunk', 'fullContent');
      expect(onStreamEnd).toHaveBeenCalledWith('session-1', 'finalContent');
    });
  });

  describe('Error Handling', () => {
    it('should continue execution when a hook throws', async () => {
      const errorHook = jest.fn().mockRejectedValue(new Error('Hook error'));
      const successHook = jest.fn();
      
      mockGetState.mockReturnValue({
        plugins: {
          'plugin-error': {
            manifest: { id: 'plugin-error' },
            status: 'enabled',
            hooks: { onProjectDelete: errorHook },
          },
          'plugin-success': {
            manifest: { id: 'plugin-success' },
            status: 'enabled',
            hooks: { onProjectDelete: successHook },
          },
        },
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const results = await manager.dispatchProjectDelete('project-1');

      expect(errorHook).toHaveBeenCalled();
      expect(successHook).toHaveBeenCalled();
      expect(results.some(r => !r.success)).toBe(true);
      
      consoleSpy.mockRestore();
    });

    it('should include execution time in results', async () => {
      const slowHook = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10))
      );
      
      mockGetState.mockReturnValue({
        plugins: {
          'plugin-1': {
            manifest: { id: 'plugin-1' },
            status: 'enabled',
            hooks: { onProjectDelete: slowHook },
          },
        },
      });

      const results = await manager.dispatchProjectDelete('project-1');

      expect(results[0].executionTime).toBeGreaterThan(0);
    });
  });

  describe('Singleton', () => {
    it('should return the same instance', () => {
      const instance1 = getExtendedHooksManager();
      const instance2 = getExtendedHooksManager();
      
      expect(instance1).toBe(instance2);
    });

    it('should reset singleton on reset call', () => {
      const instance1 = getExtendedHooksManager();
      resetExtendedHooksManager();
      const instance2 = getExtendedHooksManager();
      
      expect(instance1).not.toBe(instance2);
    });
  });
});
