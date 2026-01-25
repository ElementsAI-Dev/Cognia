/**
 * Tests for Virtual Environment Store
 */

import { act, renderHook } from '@testing-library/react';
import {
  useVirtualEnvStore,
  selectActiveEnv,
  selectEnvById,
  selectEnvsByProject,
  selectProjectConfigByPath,
  selectFilteredEnvironments,
  selectEnvsByType,
  selectEnvsByStatus,
  selectSelectedEnvs,
  selectEnvCount,
  selectActiveEnvCount,
  selectTotalPackages,
  selectRecentEnvs,
  selectHasSelection,
  selectSelectionCount,
  selectIsEnvSelected,
} from './virtual-env-store';
import type { VirtualEnvInfo, ProjectEnvConfig } from '@/types/system/environment';

describe('Virtual Environment Store', () => {
  beforeEach(() => {
    // Reset the store before each test
    const { result } = renderHook(() => useVirtualEnvStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('Initial State', () => {
    it('should have empty environments array initially', () => {
      const { result } = renderHook(() => useVirtualEnvStore());
      expect(result.current.environments).toEqual([]);
    });

    it('should have null activeEnvId initially', () => {
      const { result } = renderHook(() => useVirtualEnvStore());
      expect(result.current.activeEnvId).toBeNull();
    });

    it('should have default Python versions', () => {
      const { result } = renderHook(() => useVirtualEnvStore());
      expect(result.current.availablePythonVersions).toContain('3.12');
      expect(result.current.availablePythonVersions).toContain('3.11');
    });

    it('should not be loading initially', () => {
      const { result } = renderHook(() => useVirtualEnvStore());
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isCreating).toBe(false);
      expect(result.current.isInstalling).toBe(false);
    });
  });

  describe('Environment Management', () => {
    const mockEnv: VirtualEnvInfo = {
      id: 'env-1',
      name: 'test-env',
      type: 'uv',
      path: '/path/to/test-env',
      pythonVersion: '3.11.0',
      pythonPath: '/path/to/test-env/bin/python',
      status: 'inactive',
      packages: 10,
      size: '50 MB',
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      isDefault: false,
      projectPath: null,
    };

    it('should add an environment', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.addEnvironment(mockEnv);
      });

      expect(result.current.environments).toHaveLength(1);
      expect(result.current.environments[0]).toEqual(mockEnv);
    });

    it('should set environments', () => {
      const { result } = renderHook(() => useVirtualEnvStore());
      const envs = [mockEnv, { ...mockEnv, id: 'env-2', name: 'test-env-2' }];

      act(() => {
        result.current.setEnvironments(envs);
      });

      expect(result.current.environments).toHaveLength(2);
      expect(result.current.lastRefreshed).not.toBeNull();
    });

    it('should update an environment', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.addEnvironment(mockEnv);
      });

      act(() => {
        result.current.updateEnvironment('env-1', { name: 'updated-env' });
      });

      expect(result.current.environments[0].name).toBe('updated-env');
    });

    it('should remove an environment', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.addEnvironment(mockEnv);
      });

      act(() => {
        result.current.removeEnvironment('env-1');
      });

      expect(result.current.environments).toHaveLength(0);
    });

    it('should clear activeEnvId when removing active environment', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.addEnvironment(mockEnv);
        result.current.setActiveEnv('env-1');
      });

      expect(result.current.activeEnvId).toBe('env-1');

      act(() => {
        result.current.removeEnvironment('env-1');
      });

      expect(result.current.activeEnvId).toBeNull();
    });
  });

  describe('Active Environment', () => {
    const mockEnv: VirtualEnvInfo = {
      id: 'env-1',
      name: 'test-env',
      type: 'uv',
      path: '/path/to/test-env',
      pythonVersion: '3.11.0',
      pythonPath: '/path/to/test-env/bin/python',
      status: 'inactive',
      packages: 10,
      size: '50 MB',
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      isDefault: false,
      projectPath: null,
    };

    it('should set active environment', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.addEnvironment(mockEnv);
        result.current.setActiveEnv('env-1');
      });

      expect(result.current.activeEnvId).toBe('env-1');
    });

    it('should update environment status when activating', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.addEnvironment(mockEnv);
        result.current.setActiveEnv('env-1');
      });

      expect(result.current.environments[0].status).toBe('active');
      expect(result.current.environments[0].lastUsedAt).not.toBeNull();
    });

    it('should deactivate when setting activeEnvId to null', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.addEnvironment(mockEnv);
        result.current.setActiveEnv('env-1');
      });

      act(() => {
        result.current.setActiveEnv(null);
      });

      expect(result.current.activeEnvId).toBeNull();
      expect(result.current.environments[0].status).toBe('inactive');
    });
  });

  describe('Progress Tracking', () => {
    it('should set progress', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.setProgress({
          stage: 'creating',
          progress: 50,
          message: 'Creating environment...',
          error: null,
        });
      });

      expect(result.current.progress?.stage).toBe('creating');
      expect(result.current.progress?.progress).toBe(50);
    });

    it('should clear progress', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.setProgress({
          stage: 'creating',
          progress: 50,
          message: 'Creating...',
          error: null,
        });
      });

      act(() => {
        result.current.setProgress(null);
      });

      expect(result.current.progress).toBeNull();
    });

    it('should set creating state', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.setCreating(true);
      });

      expect(result.current.isCreating).toBe(true);
    });

    it('should set installing state', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.setInstalling(true);
      });

      expect(result.current.isInstalling).toBe(true);
    });
  });

  describe('Project Configuration', () => {
    const mockConfig: ProjectEnvConfig = {
      id: 'proj-1',
      projectPath: '/path/to/project',
      projectName: 'My Project',
      pythonVersion: '3.11',
      nodeVersion: null,
      virtualEnvId: null,
      virtualEnvPath: null,
      autoActivate: true,
      envVars: { DEBUG: 'true' },
      scripts: {},
      dependencies: { python: [], node: [], system: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('should add project config', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.addProjectConfig(mockConfig);
      });

      expect(result.current.projectConfigs).toHaveLength(1);
      expect(result.current.projectConfigs[0]).toEqual(mockConfig);
    });

    it('should update project config', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.addProjectConfig(mockConfig);
      });

      act(() => {
        result.current.updateProjectConfig('proj-1', { projectName: 'Updated Project' });
      });

      expect(result.current.projectConfigs[0].projectName).toBe('Updated Project');
      expect(result.current.projectConfigs[0].updatedAt).not.toBe(mockConfig.updatedAt);
    });

    it('should remove project config', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.addProjectConfig(mockConfig);
      });

      act(() => {
        result.current.removeProjectConfig('proj-1');
      });

      expect(result.current.projectConfigs).toHaveLength(0);
    });

    it('should get project config by path', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.addProjectConfig(mockConfig);
      });

      const config = result.current.getProjectConfig('/path/to/project');
      expect(config).toEqual(mockConfig);
    });

    it('should return undefined for non-existent project', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      const config = result.current.getProjectConfig('/non/existent/path');
      expect(config).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should set error', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.setError('Something went wrong');
      });

      expect(result.current.error).toBe('Something went wrong');
    });

    it('should clear error', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.setError('Error message');
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Python Versions', () => {
    it('should set available Python versions', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.setAvailablePythonVersions(['3.13', '3.12', '3.11']);
      });

      expect(result.current.availablePythonVersions).toContain('3.13');
      expect(result.current.availablePythonVersions).toHaveLength(3);
    });
  });

  describe('Selectors', () => {
    const mockEnv: VirtualEnvInfo = {
      id: 'env-1',
      name: 'test-env',
      type: 'uv',
      path: '/path/to/test-env',
      pythonVersion: '3.11.0',
      pythonPath: '/path/to/test-env/bin/python',
      status: 'inactive',
      packages: 10,
      size: '50 MB',
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      isDefault: false,
      projectPath: '/project/path',
    };

    const mockConfig: ProjectEnvConfig = {
      id: 'proj-1',
      projectPath: '/project/path',
      projectName: 'Test Project',
      pythonVersion: '3.11',
      nodeVersion: null,
      virtualEnvId: 'env-1',
      virtualEnvPath: '/path/to/test-env',
      autoActivate: true,
      envVars: {},
      scripts: {},
      dependencies: { python: [], node: [], system: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('should select active environment', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.addEnvironment(mockEnv);
        result.current.setActiveEnv('env-1');
      });

      const state = result.current;
      const activeEnv = selectActiveEnv(state);

      expect(activeEnv).toBeDefined();
      expect(activeEnv?.id).toBe('env-1');
    });

    it('should select environment by id', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.addEnvironment(mockEnv);
      });

      const state = result.current;
      const env = selectEnvById(state, 'env-1');

      expect(env).toBeDefined();
      expect(env?.name).toBe('test-env');
    });

    it('should select environments by project', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.addEnvironment(mockEnv);
        result.current.addEnvironment({
          ...mockEnv,
          id: 'env-2',
          projectPath: null,
        });
      });

      const state = result.current;
      const envs = selectEnvsByProject(state, '/project/path');

      expect(envs).toHaveLength(1);
      expect(envs[0].id).toBe('env-1');
    });

    it('should select project config by path', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.addProjectConfig(mockConfig);
      });

      const state = result.current;
      const config = selectProjectConfigByPath(state, '/project/path');

      expect(config).toBeDefined();
      expect(config?.projectName).toBe('Test Project');
    });
  });

  describe('Reset', () => {
    it('should reset store to initial state', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.addEnvironment({
          id: 'env-1',
          name: 'test',
          type: 'uv',
          path: '/path',
          pythonVersion: '3.11',
          pythonPath: null,
          status: 'active',
          packages: 0,
          size: null,
          createdAt: new Date().toISOString(),
          lastUsedAt: null,
          isDefault: false,
          projectPath: null,
        });
        result.current.setActiveEnv('env-1');
        result.current.setError('test error');
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.environments).toHaveLength(0);
      expect(result.current.activeEnvId).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('Batch Operations', () => {
    const mockEnvs: VirtualEnvInfo[] = [
      {
        id: 'env-1',
        name: 'env-1',
        type: 'uv',
        path: '/path/1',
        pythonVersion: '3.11',
        pythonPath: null,
        status: 'inactive',
        packages: 10,
        size: '50 MB',
        createdAt: '2024-01-01T00:00:00Z',
        lastUsedAt: null,
        isDefault: false,
        projectPath: null,
      },
      {
        id: 'env-2',
        name: 'env-2',
        type: 'venv',
        path: '/path/2',
        pythonVersion: '3.10',
        pythonPath: null,
        status: 'active',
        packages: 20,
        size: '100 MB',
        createdAt: '2024-02-01T00:00:00Z',
        lastUsedAt: '2024-06-01T00:00:00Z',
        isDefault: false,
        projectPath: '/project',
      },
      {
        id: 'env-3',
        name: 'env-3',
        type: 'conda',
        path: '/path/3',
        pythonVersion: '3.9',
        pythonPath: null,
        status: 'inactive',
        packages: 30,
        size: '200 MB',
        createdAt: '2024-03-01T00:00:00Z',
        lastUsedAt: null,
        isDefault: false,
        projectPath: null,
      },
    ];

    it('should remove multiple environments', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.setEnvironments(mockEnvs);
      });

      expect(result.current.environments).toHaveLength(3);

      act(() => {
        result.current.removeEnvironments(['env-1', 'env-3']);
      });

      expect(result.current.environments).toHaveLength(1);
      expect(result.current.environments[0].id).toBe('env-2');
    });

    it('should clear activeEnvId when removing active env in batch', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.setEnvironments(mockEnvs);
        result.current.setActiveEnv('env-2');
      });

      expect(result.current.activeEnvId).toBe('env-2');

      act(() => {
        result.current.removeEnvironments(['env-1', 'env-2']);
      });

      expect(result.current.activeEnvId).toBeNull();
    });

    it('should clear selected envs when removing them', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.setEnvironments(mockEnvs);
        result.current.selectEnv('env-1');
        result.current.selectEnv('env-2');
      });

      expect(result.current.selectedEnvIds).toHaveLength(2);

      act(() => {
        result.current.removeEnvironments(['env-1']);
      });

      expect(result.current.selectedEnvIds).toEqual(['env-2']);
    });
  });

  describe('Selection Operations', () => {
    const mockEnvs: VirtualEnvInfo[] = [
      {
        id: 'env-1',
        name: 'env-1',
        type: 'uv',
        path: '/path/1',
        pythonVersion: '3.11',
        pythonPath: null,
        status: 'inactive',
        packages: 10,
        size: null,
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
        isDefault: false,
        projectPath: null,
      },
      {
        id: 'env-2',
        name: 'env-2',
        type: 'venv',
        path: '/path/2',
        pythonVersion: '3.10',
        pythonPath: null,
        status: 'active',
        packages: 20,
        size: null,
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
        isDefault: false,
        projectPath: null,
      },
    ];

    it('should select an environment', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.setEnvironments(mockEnvs);
        result.current.selectEnv('env-1');
      });

      expect(result.current.selectedEnvIds).toContain('env-1');
    });

    it('should not duplicate selection', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.setEnvironments(mockEnvs);
        result.current.selectEnv('env-1');
        result.current.selectEnv('env-1');
      });

      expect(result.current.selectedEnvIds).toHaveLength(1);
    });

    it('should deselect an environment', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.setEnvironments(mockEnvs);
        result.current.selectEnv('env-1');
        result.current.selectEnv('env-2');
      });

      act(() => {
        result.current.deselectEnv('env-1');
      });

      expect(result.current.selectedEnvIds).toEqual(['env-2']);
    });

    it('should toggle selection', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.setEnvironments(mockEnvs);
        result.current.toggleEnvSelection('env-1');
      });

      expect(result.current.selectedEnvIds).toContain('env-1');

      act(() => {
        result.current.toggleEnvSelection('env-1');
      });

      expect(result.current.selectedEnvIds).not.toContain('env-1');
    });

    it('should select all environments', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.setEnvironments(mockEnvs);
        result.current.selectAllEnvs();
      });

      expect(result.current.selectedEnvIds).toHaveLength(2);
      expect(result.current.selectedEnvIds).toContain('env-1');
      expect(result.current.selectedEnvIds).toContain('env-2');
    });

    it('should deselect all environments', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.setEnvironments(mockEnvs);
        result.current.selectAllEnvs();
      });

      act(() => {
        result.current.deselectAllEnvs();
      });

      expect(result.current.selectedEnvIds).toHaveLength(0);
    });
  });

  describe('Package Cache', () => {
    it('should cache packages for an environment', () => {
      const { result } = renderHook(() => useVirtualEnvStore());
      const packages = [
        { name: 'numpy', version: '1.24.0', latest: null, description: null, location: null },
        { name: 'pandas', version: '2.0.0', latest: null, description: null, location: null },
      ];

      act(() => {
        result.current.cachePackages('/path/to/env', packages);
      });

      expect(result.current.getCachedPackages('/path/to/env')).toEqual(packages);
    });

    it('should return null for uncached path', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      expect(result.current.getCachedPackages('/unknown/path')).toBeNull();
    });

    it('should clear specific package cache', () => {
      const { result } = renderHook(() => useVirtualEnvStore());
      const packages = [
        { name: 'numpy', version: '1.0', latest: null, description: null, location: null },
      ];

      act(() => {
        result.current.cachePackages('/path/1', packages);
        result.current.cachePackages('/path/2', packages);
      });

      act(() => {
        result.current.clearPackageCache('/path/1');
      });

      expect(result.current.getCachedPackages('/path/1')).toBeNull();
      expect(result.current.getCachedPackages('/path/2')).toEqual(packages);
    });

    it('should clear all package cache', () => {
      const { result } = renderHook(() => useVirtualEnvStore());
      const packages = [
        { name: 'numpy', version: '1.0', latest: null, description: null, location: null },
      ];

      act(() => {
        result.current.cachePackages('/path/1', packages);
        result.current.cachePackages('/path/2', packages);
      });

      act(() => {
        result.current.clearPackageCache();
      });

      expect(result.current.getCachedPackages('/path/1')).toBeNull();
      expect(result.current.getCachedPackages('/path/2')).toBeNull();
    });
  });

  describe('Filter Options', () => {
    it('should set filter options', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.setFilterOptions({ search: 'test', types: ['uv'] });
      });

      expect(result.current.filterOptions.search).toBe('test');
      expect(result.current.filterOptions.types).toEqual(['uv']);
    });

    it('should merge filter options', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.setFilterOptions({ search: 'test' });
      });

      act(() => {
        result.current.setFilterOptions({ types: ['uv'] });
      });

      expect(result.current.filterOptions.search).toBe('test');
      expect(result.current.filterOptions.types).toEqual(['uv']);
    });

    it('should clear filters', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.setFilterOptions({ search: 'test', types: ['uv'] });
      });

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filterOptions).toEqual({});
    });
  });

  describe('Health Checks', () => {
    it('should set health check for environment', () => {
      const { result } = renderHook(() => useVirtualEnvStore());
      const healthCheck = {
        status: 'healthy' as const,
        pythonValid: true,
        pipValid: true,
        packagesValid: true,
        issues: [],
        warnings: [],
        checkedAt: new Date().toISOString(),
      };

      act(() => {
        result.current.setHealthCheck('env-1', healthCheck);
      });

      expect(result.current.getHealthCheck('env-1')).toEqual(healthCheck);
    });

    it('should return null for unchecked environment', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      expect(result.current.getHealthCheck('unknown')).toBeNull();
    });

    it('should clear all health checks', () => {
      const { result } = renderHook(() => useVirtualEnvStore());
      const healthCheck = {
        status: 'healthy' as const,
        pythonValid: true,
        pipValid: true,
        packagesValid: true,
        issues: [],
        warnings: [],
        checkedAt: new Date().toISOString(),
      };

      act(() => {
        result.current.setHealthCheck('env-1', healthCheck);
        result.current.setHealthCheck('env-2', healthCheck);
      });

      act(() => {
        result.current.clearHealthChecks();
      });

      expect(result.current.getHealthCheck('env-1')).toBeNull();
      expect(result.current.getHealthCheck('env-2')).toBeNull();
    });
  });

  describe('New Selectors', () => {
    const mockEnvs: VirtualEnvInfo[] = [
      {
        id: 'env-1',
        name: 'data-env',
        type: 'uv',
        path: '/path/1',
        pythonVersion: '3.11',
        pythonPath: null,
        status: 'active',
        packages: 50,
        size: null,
        createdAt: '2024-01-01T00:00:00Z',
        lastUsedAt: '2024-06-01T00:00:00Z',
        isDefault: false,
        projectPath: null,
      },
      {
        id: 'env-2',
        name: 'web-env',
        type: 'venv',
        path: '/path/2',
        pythonVersion: '3.10',
        pythonPath: null,
        status: 'inactive',
        packages: 30,
        size: null,
        createdAt: '2024-02-01T00:00:00Z',
        lastUsedAt: null,
        isDefault: false,
        projectPath: null,
      },
      {
        id: 'env-3',
        name: 'old-env',
        type: 'uv',
        path: '/path/3',
        pythonVersion: '3.9',
        pythonPath: null,
        status: 'inactive',
        packages: 20,
        size: null,
        createdAt: '2024-03-01T00:00:00Z',
        lastUsedAt: '2024-05-01T00:00:00Z',
        isDefault: false,
        projectPath: null,
      },
    ];

    it('selectEnvsByType should filter by type', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.setEnvironments(mockEnvs);
      });

      const uvEnvs = selectEnvsByType(result.current, 'uv');
      expect(uvEnvs).toHaveLength(2);
      expect(uvEnvs.every((e) => e.type === 'uv')).toBe(true);
    });

    it('selectEnvsByStatus should filter by status', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.setEnvironments(mockEnvs);
      });

      const activeEnvs = selectEnvsByStatus(result.current, 'active');
      expect(activeEnvs).toHaveLength(1);
      expect(activeEnvs[0].status).toBe('active');
    });

    it('selectEnvCount should return total count', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.setEnvironments(mockEnvs);
      });

      expect(selectEnvCount(result.current)).toBe(3);
    });

    it('selectActiveEnvCount should return active count', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.setEnvironments(mockEnvs);
      });

      expect(selectActiveEnvCount(result.current)).toBe(1);
    });

    it('selectTotalPackages should sum all packages', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.setEnvironments(mockEnvs);
      });

      expect(selectTotalPackages(result.current)).toBe(100); // 50 + 30 + 20
    });

    it('selectSelectedEnvs should return selected environments', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.setEnvironments(mockEnvs);
        result.current.selectEnv('env-1');
        result.current.selectEnv('env-3');
      });

      const selected = selectSelectedEnvs(result.current);
      expect(selected).toHaveLength(2);
      expect(selected.map((e) => e.id)).toContain('env-1');
      expect(selected.map((e) => e.id)).toContain('env-3');
    });

    it('selectRecentEnvs should return most recent environments', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.setEnvironments(mockEnvs);
      });

      const recent = selectRecentEnvs(result.current, 2);
      expect(recent).toHaveLength(2);
      // env-1 was last used most recently (2024-06-01)
      expect(recent[0].id).toBe('env-1');
    });

    it('selectHasSelection should return true when selections exist', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.setEnvironments(mockEnvs);
      });

      expect(selectHasSelection(result.current)).toBe(false);

      act(() => {
        result.current.selectEnv('env-1');
      });

      expect(selectHasSelection(result.current)).toBe(true);
    });

    it('selectSelectionCount should return selection count', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.setEnvironments(mockEnvs);
        result.current.selectEnv('env-1');
        result.current.selectEnv('env-2');
      });

      expect(selectSelectionCount(result.current)).toBe(2);
    });

    it('selectIsEnvSelected should check if env is selected', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.setEnvironments(mockEnvs);
        result.current.selectEnv('env-1');
      });

      expect(selectIsEnvSelected(result.current, 'env-1')).toBe(true);
      expect(selectIsEnvSelected(result.current, 'env-2')).toBe(false);
    });

    it('selectFilteredEnvironments should apply filters', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.setEnvironments(mockEnvs);
        result.current.setFilterOptions({ search: 'data' });
      });

      const filtered = selectFilteredEnvironments(result.current);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('data-env');
    });
  });

  describe('Additional Progress States', () => {
    it('should set deleting state', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.setDeleting(true);
      });

      expect(result.current.isDeleting).toBe(true);

      act(() => {
        result.current.setDeleting(false);
      });

      expect(result.current.isDeleting).toBe(false);
    });

    it('should set exporting state', () => {
      const { result } = renderHook(() => useVirtualEnvStore());

      act(() => {
        result.current.setExporting(true);
      });

      expect(result.current.isExporting).toBe(true);

      act(() => {
        result.current.setExporting(false);
      });

      expect(result.current.isExporting).toBe(false);
    });
  });
});
