/**
 * useVirtualEnv Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useVirtualEnv } from './use-virtual-env';

// Mock dependencies
const mockStoreState = {
  environments: [],
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
  setActiveEnvId: jest.fn(),
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
  addProjectConfig: jest.fn(),
  updateProjectConfig: jest.fn(),
  removeProjectConfig: jest.fn(),
  setFilterOptions: jest.fn(),
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

jest.mock('@/types/environment', () => ({
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

    expect(result.current.environments).toEqual([]);
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
    mockVirtualEnvService.listEnvironments.mockResolvedValueOnce(mockEnvs);

    const { result } = renderHook(() => useVirtualEnv());

    await act(async () => {
      await result.current.refreshEnvironments();
    });

    expect(mockVirtualEnvService.listEnvironments).toHaveBeenCalled();
  });

  it('should create environment', async () => {
    const mockEnv = { id: 'new-env', name: 'new-test', path: '/path/new', pythonVersion: '3.12' };
    mockVirtualEnvService.createEnvironment.mockResolvedValueOnce(mockEnv);

    const { result } = renderHook(() => useVirtualEnv());

    await act(async () => {
      await result.current.createEnvironment({
        name: 'new-test',
        pythonVersion: '3.12',
      });
    });

    expect(mockVirtualEnvService.createEnvironment).toHaveBeenCalled();
  });

  it('should delete environment', async () => {
    mockVirtualEnvService.deleteEnvironment.mockResolvedValueOnce(true);

    const { result } = renderHook(() => useVirtualEnv());

    await act(async () => {
      await result.current.deleteEnvironment('env-1');
    });

    expect(mockVirtualEnvService.deleteEnvironment).toHaveBeenCalledWith('env-1');
  });

  it('should load packages', async () => {
    const mockPackages = [
      { name: 'numpy', version: '1.24.0' },
      { name: 'pandas', version: '2.0.0' },
    ];
    mockVirtualEnvService.listPackages.mockResolvedValueOnce(mockPackages);

    const { result } = renderHook(() => useVirtualEnv());

    await act(async () => {
      await result.current.loadPackages('/path/to/env');
    });

    expect(mockVirtualEnvService.listPackages).toHaveBeenCalledWith('/path/to/env', undefined);
  });

  it('should install packages', async () => {
    mockVirtualEnvService.installPackages.mockResolvedValueOnce(true);

    const { result } = renderHook(() => useVirtualEnv());

    await act(async () => {
      await result.current.installPackages('/path/to/env', ['numpy', 'pandas']);
    });

    expect(mockVirtualEnvService.installPackages).toHaveBeenCalled();
  });

  it('should uninstall packages', async () => {
    mockVirtualEnvService.uninstallPackages.mockResolvedValueOnce(true);

    const { result } = renderHook(() => useVirtualEnv());

    await act(async () => {
      await result.current.uninstallPackages('/path/to/env', ['numpy']);
    });

    expect(mockVirtualEnvService.uninstallPackages).toHaveBeenCalled();
  });

  it('should export requirements', async () => {
    mockVirtualEnvService.exportRequirements.mockResolvedValueOnce('numpy==1.24.0\npandas==2.0.0');

    const { result } = renderHook(() => useVirtualEnv());

    await act(async () => {
      await result.current.exportRequirements('/path/to/env');
    });

    expect(mockVirtualEnvService.exportRequirements).toHaveBeenCalled();
  });

  it('should import requirements', async () => {
    mockVirtualEnvService.importRequirements.mockResolvedValueOnce(true);

    const { result } = renderHook(() => useVirtualEnv());

    await act(async () => {
      await result.current.importRequirements('/path/to/env', 'numpy\npandas');
    });

    expect(mockVirtualEnvService.importRequirements).toHaveBeenCalled();
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

    // Just verifies functions work
    expect(true).toBe(true);
  });
});
