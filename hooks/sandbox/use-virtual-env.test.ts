/**
 * useVirtualEnv Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useVirtualEnv } from './use-virtual-env';

// Mock dependencies
const mockStoreState = {
  environments: [{ id: 'env-1', name: 'test-env', path: '/path/to/env', pythonVersion: '3.11' }],
  activeEnvId: null,
  progress: null,
  isCreating: false,
  isInstalling: false,
  isDeleting: false,
  isExporting: false,
  isLoading: false,
  error: null,
  availablePythonVersions: ['3.10', '3.11', '3.12'],
  selectedEnvPackages: [],
  projectConfigs: [],
  filterOptions: {},
  selectedEnvIds: [],
  setEnvironments: jest.fn(),
  addEnvironment: jest.fn(),
  removeEnvironment: jest.fn(),
  removeEnvironments: jest.fn(),
  setActiveEnv: jest.fn(),
  setProgress: jest.fn(),
  setCreating: jest.fn(),
  setInstalling: jest.fn(),
  setDeleting: jest.fn(),
  setExporting: jest.fn(),
  setLoading: jest.fn(),
  setError: jest.fn(),
  clearError: jest.fn(),
  setAvailablePythonVersions: jest.fn(),
  setSelectedEnvPackages: jest.fn(),
  cachePackages: jest.fn(),
  getCachedPackages: jest.fn(() => null),
  clearPackageCache: jest.fn(),
  addProjectConfig: jest.fn(),
  updateProjectConfig: jest.fn(),
  removeProjectConfig: jest.fn(),
  getProjectConfig: jest.fn(() => undefined),
  setFilterOptions: jest.fn(),
  clearFilters: jest.fn(),
  selectEnv: jest.fn(),
  deselectEnv: jest.fn(),
  toggleEnvSelection: jest.fn(),
  selectAllEnvs: jest.fn(),
  deselectAllEnvs: jest.fn(),
};

jest.mock('@/stores/system', () => ({
  useVirtualEnvStore: jest.fn((selector) => {
    if (typeof selector === 'function') {
      return selector(mockStoreState);
    }
    return mockStoreState;
  }),
  selectActiveEnv: jest.fn(() => undefined),
}));

jest.mock('@/lib/native/environment', () => ({
  virtualEnvService: {
    isAvailable: jest.fn(() => true),
    list: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    delete: jest.fn(),
    listPackages: jest.fn().mockResolvedValue([]),
    installPackages: jest.fn(),
    runCommand: jest.fn(),
    getAvailablePythonVersions: jest.fn().mockResolvedValue(['3.10', '3.11', '3.12']),
    installPythonVersion: jest.fn(),
    onProgress: jest.fn().mockResolvedValue(() => {}),
    executePython: jest.fn(),
    executePythonStream: jest.fn(),
    executePythonFile: jest.fn(),
    getPythonInfo: jest.fn(),
    onPythonExecutionOutput: jest.fn().mockResolvedValue(() => {}),
    generateExecutionId: jest.fn(() => 'exec-123'),
  },
  isEnvironmentAvailable: jest.fn(() => true),
}));

jest.mock('@/types/system/environment', () => ({
  createDefaultProjectEnvConfig: jest.fn((path, name) => ({ 
    id: 'config-1', 
    projectPath: path, 
    projectName: name,
    envId: null,
  })),
  parseRequirements: jest.fn((content) => content.split('\n').map((l: string) => ({ name: l }))),
  generateRequirements: jest.fn((packages) => packages.map((p: { name: string }) => p.name).join('\n')),
  filterEnvironments: jest.fn((envs) => envs),
}));

import { virtualEnvService, isEnvironmentAvailable } from '@/lib/native/environment';

const mockVirtualEnvService = virtualEnvService as jest.Mocked<typeof virtualEnvService>;
const mockIsAvailable = isEnvironmentAvailable as jest.MockedFunction<typeof isEnvironmentAvailable>;

describe('useVirtualEnv', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAvailable.mockReturnValue(true);
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useVirtualEnv());

    expect(result.current.environments).toEqual(mockStoreState.environments);
    expect(result.current.activeEnv).toBeUndefined();
    expect(result.current.isAvailable).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should return isAvailable as false when not in Tauri', () => {
    mockIsAvailable.mockReturnValue(false);

    const { result } = renderHook(() => useVirtualEnv());

    expect(result.current.isAvailable).toBe(false);
  });

  it('should refresh environments', async () => {
    const mockEnvs = [
      { id: 'env-1', name: 'test-env', path: '/path/to/env', pythonVersion: '3.11' },
    ];
    mockVirtualEnvService.list.mockResolvedValueOnce(mockEnvs as never);

    const { result } = renderHook(() => useVirtualEnv());

    await act(async () => {
      await result.current.refreshEnvironments();
    });

    expect(mockVirtualEnvService.list).toHaveBeenCalled();
  });

  it('should create environment', async () => {
    const mockEnv = { id: 'new-env', name: 'new-test', path: '/path/new', pythonVersion: '3.12' };
    mockVirtualEnvService.create.mockResolvedValueOnce(mockEnv as never);

    const { result } = renderHook(() => useVirtualEnv());

    await act(async () => {
      await result.current.createEnvironment({
        name: 'new-test',
        type: 'venv',
        pythonVersion: '3.12',
      });
    });

    expect(mockVirtualEnvService.create).toHaveBeenCalled();
  });

  it('should delete environment', async () => {
    mockVirtualEnvService.delete.mockResolvedValueOnce(undefined as never);

    const { result } = renderHook(() => useVirtualEnv());

    await act(async () => {
      await result.current.deleteEnvironment('env-1');
    });

    expect(mockVirtualEnvService.delete).toHaveBeenCalled();
  });

  it('should load packages', async () => {
    const mockPackages = [
      { name: 'numpy', version: '1.24.0', latest: null, description: null, location: null },
      { name: 'pandas', version: '2.0.0', latest: null, description: null, location: null },
    ];
    mockVirtualEnvService.listPackages.mockResolvedValueOnce(mockPackages);

    const { result } = renderHook(() => useVirtualEnv());

    await act(async () => {
      await result.current.loadPackages('/path/to/env');
    });

    expect(mockVirtualEnvService.listPackages).toHaveBeenCalledWith('/path/to/env');
  });

  it('should install packages', async () => {
    mockVirtualEnvService.installPackages.mockResolvedValueOnce(undefined as never);

    const { result } = renderHook(() => useVirtualEnv());

    await act(async () => {
      await result.current.installPackages('/path/to/env', ['numpy', 'pandas']);
    });

    expect(mockVirtualEnvService.installPackages).toHaveBeenCalled();
  });

  it('should uninstall packages', async () => {
    mockVirtualEnvService.runCommand.mockResolvedValueOnce('Successfully uninstalled');

    const { result } = renderHook(() => useVirtualEnv());

    await act(async () => {
      await result.current.uninstallPackages('/path/to/env', ['numpy']);
    });

    expect(mockVirtualEnvService.runCommand).toHaveBeenCalled();
  });

  it('should export requirements', async () => {
    mockVirtualEnvService.listPackages.mockResolvedValueOnce([
      { name: 'numpy', version: '1.24.0' },
      { name: 'pandas', version: '2.0.0' },
    ] as never);

    const { result } = renderHook(() => useVirtualEnv());

    await act(async () => {
      await result.current.exportRequirements('/path/to/env');
    });

    expect(mockVirtualEnvService.listPackages).toHaveBeenCalled();
  });

  it('should import requirements', async () => {
    mockVirtualEnvService.installPackages.mockResolvedValueOnce(undefined as never);

    const { result } = renderHook(() => useVirtualEnv());

    await act(async () => {
      await result.current.importRequirements('/path/to/env', 'numpy\npandas');
    });

    expect(mockVirtualEnvService.installPackages).toHaveBeenCalled();
  });

  it('should run command', async () => {
    mockVirtualEnvService.runCommand.mockResolvedValueOnce('Command output');

    const { result } = renderHook(() => useVirtualEnv());

    await act(async () => {
      await result.current.runCommand('/path/to/env', 'pip list');
    });

    expect(mockVirtualEnvService.runCommand).toHaveBeenCalled();
  });

  it('should refresh python versions', async () => {
    mockVirtualEnvService.getAvailablePythonVersions.mockResolvedValueOnce(['3.10', '3.11', '3.12']);

    const { result } = renderHook(() => useVirtualEnv());

    await act(async () => {
      await result.current.refreshPythonVersions();
    });

    expect(mockVirtualEnvService.getAvailablePythonVersions).toHaveBeenCalled();
  });

  it('should parse requirements file', () => {
    const { result } = renderHook(() => useVirtualEnv());

    const parsed = result.current.parseRequirementsFile('numpy\npandas');

    expect(Array.isArray(parsed)).toBe(true);
  });

  it('should create project config', () => {
    const { result } = renderHook(() => useVirtualEnv());

    const config = result.current.createProjectConfig('/path/to/project', 'My Project');

    expect(config).toBeDefined();
    expect(config.projectPath).toBe('/path/to/project');
  });

  it('should clear error', () => {
    const { result } = renderHook(() => useVirtualEnv());

    act(() => {
      result.current.clearError();
    });

    // Just verifies it doesn't throw
    expect(true).toBe(true);
  });

  it('should activate/deactivate environment', () => {
    const { result } = renderHook(() => useVirtualEnv());

    act(() => {
      result.current.activateEnvironment('env-1');
    });

    act(() => {
      result.current.deactivateEnvironment();
    });

    // Just verifies functions work
    expect(true).toBe(true);
  });

  it('should handle selection', () => {
    const { result } = renderHook(() => useVirtualEnv());

    act(() => {
      result.current.selectEnv('env-1');
      result.current.deselectEnv('env-1');
      result.current.toggleEnvSelection('env-2');
      result.current.selectAllEnvs();
      result.current.deselectAllEnvs();
    });

    // Just verifies functions work
    expect(true).toBe(true);
  });

  it('should set and clear filters', () => {
    const { result } = renderHook(() => useVirtualEnv());

    act(() => {
      result.current.setFilter({ search: 'test' });
      result.current.clearFilters();
    });

    expect(mockStoreState.setFilterOptions).toHaveBeenCalledWith({ search: 'test' });
    expect(mockStoreState.clearFilters).toHaveBeenCalled();
  });

  describe('batch operations', () => {
    it('should delete multiple environments', async () => {
      mockVirtualEnvService.delete.mockResolvedValue(undefined as never);

      const { result } = renderHook(() => useVirtualEnv());

      await act(async () => {
        await result.current.deleteEnvironments(['env-1']);
      });

      expect(mockVirtualEnvService.delete).toHaveBeenCalled();
      expect(mockStoreState.removeEnvironments).toHaveBeenCalledWith(['env-1']);
    });

    it('should return false when deleting empty array', async () => {
      const { result } = renderHook(() => useVirtualEnv());

      let success = false;
      await act(async () => {
        success = await result.current.deleteEnvironments([]);
      });

      expect(success).toBe(false);
      expect(mockVirtualEnvService.delete).not.toHaveBeenCalled();
    });
  });

  describe('clone environment', () => {
    it('should clone environment with packages', async () => {
      const sourcePackages = [{ name: 'numpy', version: '1.24.0' }];
      const clonedEnv = { id: 'cloned-env', name: 'cloned', path: '/path/cloned', pythonVersion: '3.11' };
      
      mockVirtualEnvService.listPackages.mockResolvedValueOnce(sourcePackages as never);
      mockVirtualEnvService.create.mockResolvedValueOnce(clonedEnv as never);

      const { result } = renderHook(() => useVirtualEnv());

      await act(async () => {
        await result.current.cloneEnvironment('env-1', 'cloned');
      });

      expect(mockVirtualEnvService.listPackages).toHaveBeenCalledWith('/path/to/env');
      expect(mockVirtualEnvService.create).toHaveBeenCalled();
    });

    it('should return null when source env not found', async () => {
      const { result } = renderHook(() => useVirtualEnv());

      let cloned = null;
      await act(async () => {
        cloned = await result.current.cloneEnvironment('non-existent', 'cloned');
      });

      expect(cloned).toBeNull();
    });
  });

  describe('package upgrade', () => {
    it('should upgrade all packages', async () => {
      const packages = [{ name: 'numpy', version: '1.24.0' }];
      mockVirtualEnvService.listPackages.mockResolvedValueOnce(packages as never);
      mockVirtualEnvService.installPackages.mockResolvedValueOnce(undefined as never);
      mockVirtualEnvService.listPackages.mockResolvedValueOnce(packages as never);

      const { result } = renderHook(() => useVirtualEnv());

      await act(async () => {
        await result.current.upgradeAllPackages('/path/to/env');
      });

      expect(mockVirtualEnvService.installPackages).toHaveBeenCalledWith(
        '/path/to/env',
        ['numpy'],
        true
      );
    });
  });

  describe('python version management', () => {
    it('should install python version', async () => {
      mockVirtualEnvService.installPythonVersion.mockResolvedValueOnce(undefined as never);
      mockVirtualEnvService.getAvailablePythonVersions.mockResolvedValueOnce(['3.10', '3.11', '3.12']);

      const { result } = renderHook(() => useVirtualEnv());

      let success = false;
      await act(async () => {
        success = await result.current.installPythonVersion('3.12');
      });

      expect(success).toBe(true);
      expect(mockVirtualEnvService.installPythonVersion).toHaveBeenCalledWith('3.12');
    });
  });

  describe('project config management', () => {
    it('should get project config', () => {
      const mockConfig = { id: 'config-1', projectPath: '/project', projectName: 'Test' };
      mockStoreState.getProjectConfig.mockReturnValueOnce(mockConfig as never);

      const { result } = renderHook(() => useVirtualEnv());
      const config = result.current.getProjectConfig('/project');

      expect(config).toEqual(mockConfig);
    });

    it('should set project environment', () => {
      const mockConfig = { id: 'config-1', projectPath: '/project', projectName: 'Test' };
      mockStoreState.getProjectConfig.mockReturnValueOnce(mockConfig as never);

      const { result } = renderHook(() => useVirtualEnv());

      act(() => {
        result.current.setProjectEnv('/project', 'env-1');
      });

      expect(mockStoreState.updateProjectConfig).toHaveBeenCalledWith('config-1', {
        virtualEnvId: 'env-1',
        virtualEnvPath: '/path/to/env',
      });
    });

    it('should update project config', () => {
      const { result } = renderHook(() => useVirtualEnv());

      act(() => {
        result.current.updateProjectConfig('config-1', { projectName: 'Updated' });
      });

      expect(mockStoreState.updateProjectConfig).toHaveBeenCalledWith('config-1', { projectName: 'Updated' });
    });

    it('should remove project config', () => {
      const { result } = renderHook(() => useVirtualEnv());

      act(() => {
        result.current.removeProjectConfig('config-1');
      });

      expect(mockStoreState.removeProjectConfig).toHaveBeenCalledWith('config-1');
    });
  });

  describe('package cache', () => {
    it('should use cached packages when available', async () => {
      const cachedPackages = [{ name: 'cached-pkg', version: '1.0.0' }];
      mockStoreState.getCachedPackages.mockReturnValueOnce(cachedPackages as never);

      const { result } = renderHook(() => useVirtualEnv());

      await act(async () => {
        await result.current.loadPackages('/path/to/env', true);
      });

      expect(mockStoreState.getCachedPackages).toHaveBeenCalledWith('/path/to/env');
      expect(mockVirtualEnvService.listPackages).not.toHaveBeenCalled();
      expect(mockStoreState.setSelectedEnvPackages).toHaveBeenCalledWith(cachedPackages);
    });

    it('should fetch packages when cache miss', async () => {
      const freshPackages = [{ name: 'fresh-pkg', version: '2.0.0' }];
      mockStoreState.getCachedPackages.mockReturnValueOnce(null);
      mockVirtualEnvService.listPackages.mockResolvedValueOnce(freshPackages as never);

      const { result } = renderHook(() => useVirtualEnv());

      await act(async () => {
        await result.current.loadPackages('/path/to/env', true);
      });

      expect(mockVirtualEnvService.listPackages).toHaveBeenCalledWith('/path/to/env');
      expect(mockStoreState.cachePackages).toHaveBeenCalledWith('/path/to/env', freshPackages);
    });
  });

  describe('error handling', () => {
    it('should handle refresh environments error', async () => {
      mockVirtualEnvService.list.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useVirtualEnv());

      await act(async () => {
        await result.current.refreshEnvironments();
      });

      expect(mockStoreState.setError).toHaveBeenCalledWith('Network error');
    });

    it('should handle create environment error', async () => {
      mockVirtualEnvService.create.mockRejectedValueOnce(new Error('Create failed'));

      const { result } = renderHook(() => useVirtualEnv());

      let env = null;
      await act(async () => {
        env = await result.current.createEnvironment({ name: 'test' } as never);
      });

      expect(env).toBeNull();
      expect(mockStoreState.setError).toHaveBeenCalledWith('Create failed');
    });

    it('should handle delete environment error', async () => {
      mockVirtualEnvService.delete.mockRejectedValueOnce(new Error('Delete failed'));

      const { result } = renderHook(() => useVirtualEnv());

      let success = false;
      await act(async () => {
        success = await result.current.deleteEnvironment('env-1');
      });

      expect(success).toBe(false);
      expect(mockStoreState.setError).toHaveBeenCalledWith('Delete failed');
    });

    it('should handle run command error', async () => {
      mockVirtualEnvService.runCommand.mockRejectedValueOnce(new Error('Command failed'));

      const { result } = renderHook(() => useVirtualEnv());

      await expect(
        act(async () => {
          await result.current.runCommand('/path/to/env', 'invalid command');
        })
      ).rejects.toThrow('Command failed');

      expect(mockStoreState.setError).toHaveBeenCalledWith('Command failed');
    });
  });

  describe('unavailable environment', () => {
    beforeEach(() => {
      mockIsAvailable.mockReturnValue(false);
    });

    it('should return empty array for refreshEnvironments when unavailable', async () => {
      const { result } = renderHook(() => useVirtualEnv());

      await act(async () => {
        await result.current.refreshEnvironments();
      });

      expect(mockVirtualEnvService.list).not.toHaveBeenCalled();
    });

    it('should return null for createEnvironment when unavailable', async () => {
      const { result } = renderHook(() => useVirtualEnv());

      let env = null;
      await act(async () => {
        env = await result.current.createEnvironment({ name: 'test' } as never);
      });

      expect(env).toBeNull();
    });

    it('should return false for deleteEnvironment when unavailable', async () => {
      const { result } = renderHook(() => useVirtualEnv());

      let success = false;
      await act(async () => {
        success = await result.current.deleteEnvironment('env-1');
      });

      expect(success).toBe(false);
    });

    it('should return empty array for loadPackages when unavailable', async () => {
      const { result } = renderHook(() => useVirtualEnv());

      let packages: unknown[] = [];
      await act(async () => {
        packages = await result.current.loadPackages('/path/to/env');
      });

      expect(packages).toEqual([]);
    });

    it('should throw error for runCommand when unavailable', async () => {
      const { result } = renderHook(() => useVirtualEnv());

      await expect(
        act(async () => {
          await result.current.runCommand('/path/to/env', 'pip list');
        })
      ).rejects.toThrow('Virtual environment management requires Tauri environment');
    });
  });

  describe('state properties', () => {
    it('should expose all state properties', () => {
      const { result } = renderHook(() => useVirtualEnv());

      expect(result.current).toHaveProperty('environments');
      expect(result.current).toHaveProperty('filteredEnvironments');
      expect(result.current).toHaveProperty('activeEnv');
      expect(result.current).toHaveProperty('activeEnvId');
      expect(result.current).toHaveProperty('progress');
      expect(result.current).toHaveProperty('isCreating');
      expect(result.current).toHaveProperty('isInstalling');
      expect(result.current).toHaveProperty('isDeleting');
      expect(result.current).toHaveProperty('isExporting');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('isAvailable');
      expect(result.current).toHaveProperty('availablePythonVersions');
      expect(result.current).toHaveProperty('selectedEnvPackages');
      expect(result.current).toHaveProperty('projectConfigs');
      expect(result.current).toHaveProperty('filterOptions');
      expect(result.current).toHaveProperty('selectedEnvIds');
    });

    it('should expose all action functions', () => {
      const { result } = renderHook(() => useVirtualEnv());

      expect(typeof result.current.refreshEnvironments).toBe('function');
      expect(typeof result.current.createEnvironment).toBe('function');
      expect(typeof result.current.deleteEnvironment).toBe('function');
      expect(typeof result.current.deleteEnvironments).toBe('function');
      expect(typeof result.current.activateEnvironment).toBe('function');
      expect(typeof result.current.deactivateEnvironment).toBe('function');
      expect(typeof result.current.cloneEnvironment).toBe('function');
      expect(typeof result.current.loadPackages).toBe('function');
      expect(typeof result.current.installPackages).toBe('function');
      expect(typeof result.current.uninstallPackages).toBe('function');
      expect(typeof result.current.upgradeAllPackages).toBe('function');
      expect(typeof result.current.exportRequirements).toBe('function');
      expect(typeof result.current.importRequirements).toBe('function');
      expect(typeof result.current.parseRequirementsFile).toBe('function');
      expect(typeof result.current.runCommand).toBe('function');
      expect(typeof result.current.refreshPythonVersions).toBe('function');
      expect(typeof result.current.installPythonVersion).toBe('function');
      expect(typeof result.current.setFilter).toBe('function');
      expect(typeof result.current.clearFilters).toBe('function');
      expect(typeof result.current.selectEnv).toBe('function');
      expect(typeof result.current.deselectEnv).toBe('function');
      expect(typeof result.current.toggleEnvSelection).toBe('function');
      expect(typeof result.current.selectAllEnvs).toBe('function');
      expect(typeof result.current.deselectAllEnvs).toBe('function');
      expect(typeof result.current.getProjectConfig).toBe('function');
      expect(typeof result.current.setProjectEnv).toBe('function');
      expect(typeof result.current.createProjectConfig).toBe('function');
      expect(typeof result.current.updateProjectConfig).toBe('function');
      expect(typeof result.current.removeProjectConfig).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });
  });
});
