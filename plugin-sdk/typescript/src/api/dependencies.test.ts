/**
 * Dependencies API Tests
 *
 * @description Tests for dependency management API type definitions.
 */

import type {
  DependencySpec,
  ResolvedDependency,
  DependencyNode,
  DependencyConflict,
  DependencyCheckResult,
  PluginDependencyAPI,
} from './dependencies';

describe('Dependencies API Types', () => {
  describe('DependencySpec', () => {
    it('should create a required dependency', () => {
      const dep: DependencySpec = {
        pluginId: 'other-plugin',
        version: '^1.0.0',
      };

      expect(dep.pluginId).toBe('other-plugin');
      expect(dep.version).toBe('^1.0.0');
      expect(dep.optional).toBeUndefined();
    });

    it('should create an optional dependency', () => {
      const dep: DependencySpec = {
        pluginId: 'optional-plugin',
        version: '>=2.0.0',
        optional: true,
      };

      expect(dep.optional).toBe(true);
    });
  });

  describe('ResolvedDependency', () => {
    it('should create a satisfied dependency', () => {
      const resolved: ResolvedDependency = {
        pluginId: 'my-dependency',
        requiredVersion: '^1.0.0',
        resolvedVersion: '1.2.3',
        satisfied: true,
        loaded: true,
        enabled: true,
      };

      expect(resolved.satisfied).toBe(true);
      expect(resolved.loaded).toBe(true);
      expect(resolved.enabled).toBe(true);
      expect(resolved.error).toBeUndefined();
    });

    it('should create an unsatisfied dependency with error', () => {
      const resolved: ResolvedDependency = {
        pluginId: 'missing-plugin',
        requiredVersion: '^2.0.0',
        resolvedVersion: '1.5.0',
        satisfied: false,
        loaded: true,
        enabled: true,
        error: 'Version 1.5.0 does not satisfy ^2.0.0',
      };

      expect(resolved.satisfied).toBe(false);
      expect(resolved.error).toContain('does not satisfy');
    });

    it('should create an unloaded dependency', () => {
      const resolved: ResolvedDependency = {
        pluginId: 'unloaded-plugin',
        requiredVersion: '1.0.0',
        resolvedVersion: '1.0.0',
        satisfied: true,
        loaded: false,
        enabled: false,
      };

      expect(resolved.loaded).toBe(false);
      expect(resolved.enabled).toBe(false);
    });
  });

  describe('DependencyNode', () => {
    it('should create a node without dependencies', () => {
      const node: DependencyNode = {
        pluginId: 'leaf-plugin',
        version: '1.0.0',
        dependencies: [],
        dependents: [],
        loadOrder: 0,
      };

      expect(node.dependencies).toHaveLength(0);
      expect(node.dependents).toHaveLength(0);
      expect(node.loadOrder).toBe(0);
    });

    it('should create a node with dependencies and dependents', () => {
      const node: DependencyNode = {
        pluginId: 'middle-plugin',
        version: '2.0.0',
        dependencies: ['base-plugin'],
        dependents: ['top-plugin-1', 'top-plugin-2'],
        loadOrder: 1,
      };

      expect(node.dependencies).toContain('base-plugin');
      expect(node.dependents).toHaveLength(2);
      expect(node.loadOrder).toBe(1);
    });
  });

  describe('DependencyConflict', () => {
    it('should create a version conflict', () => {
      const conflict: DependencyConflict = {
        pluginId: 'shared-plugin',
        requiredBy: [
          { pluginId: 'plugin-a', version: '^1.0.0' },
          { pluginId: 'plugin-b', version: '^2.0.0' },
        ],
        description: 'Incompatible version requirements: ^1.0.0 and ^2.0.0',
      };

      expect(conflict.pluginId).toBe('shared-plugin');
      expect(conflict.requiredBy).toHaveLength(2);
      expect(conflict.description).toContain('Incompatible');
    });
  });

  describe('DependencyCheckResult', () => {
    it('should create a successful check result', () => {
      const result: DependencyCheckResult = {
        satisfied: true,
        resolved: [
          {
            pluginId: 'dep-1',
            requiredVersion: '^1.0.0',
            resolvedVersion: '1.2.0',
            satisfied: true,
            loaded: true,
            enabled: true,
          },
        ],
        missing: [],
        conflicts: [],
        circular: [],
      };

      expect(result.satisfied).toBe(true);
      expect(result.resolved).toHaveLength(1);
      expect(result.missing).toHaveLength(0);
      expect(result.conflicts).toHaveLength(0);
      expect(result.circular).toHaveLength(0);
    });

    it('should create a failed check result with missing dependencies', () => {
      const result: DependencyCheckResult = {
        satisfied: false,
        resolved: [],
        missing: [
          { pluginId: 'required-plugin', version: '^1.0.0' },
          { pluginId: 'another-plugin', version: '>=2.0.0', optional: false },
        ],
        conflicts: [],
        circular: [],
      };

      expect(result.satisfied).toBe(false);
      expect(result.missing).toHaveLength(2);
    });

    it('should create a result with conflicts and circular dependencies', () => {
      const result: DependencyCheckResult = {
        satisfied: false,
        resolved: [],
        missing: [],
        conflicts: [
          {
            pluginId: 'conflicted-plugin',
            requiredBy: [
              { pluginId: 'a', version: '^1.0.0' },
              { pluginId: 'b', version: '^2.0.0' },
            ],
            description: 'Version conflict',
          },
        ],
        circular: [
          ['plugin-a', 'plugin-b', 'plugin-c', 'plugin-a'],
        ],
      };

      expect(result.conflicts).toHaveLength(1);
      expect(result.circular).toHaveLength(1);
      expect(result.circular[0]).toContain('plugin-a');
    });
  });

  describe('PluginDependencyAPI', () => {
    it('should define all required API methods', () => {
      const mockAPI: PluginDependencyAPI = {
        check: jest.fn(),
        getDeclared: jest.fn(),
        getResolved: jest.fn(),
        has: jest.fn(),
        hasVersion: jest.fn(),
        getAPI: jest.fn(),
        waitFor: jest.fn(),
        getGraph: jest.fn(),
        getLoadOrder: jest.fn(),
        getDependents: jest.fn(),
        exposeAPI: jest.fn(),
        onDependencyLoaded: jest.fn(),
        onDependencyUnloaded: jest.fn(),
        requestInstall: jest.fn(),
      };

      expect(mockAPI.check).toBeDefined();
      expect(mockAPI.getDeclared).toBeDefined();
      expect(mockAPI.getResolved).toBeDefined();
      expect(mockAPI.has).toBeDefined();
      expect(mockAPI.hasVersion).toBeDefined();
      expect(mockAPI.getAPI).toBeDefined();
      expect(mockAPI.waitFor).toBeDefined();
      expect(mockAPI.getGraph).toBeDefined();
      expect(mockAPI.getLoadOrder).toBeDefined();
      expect(mockAPI.getDependents).toBeDefined();
      expect(mockAPI.exposeAPI).toBeDefined();
      expect(mockAPI.onDependencyLoaded).toBeDefined();
      expect(mockAPI.onDependencyUnloaded).toBeDefined();
      expect(mockAPI.requestInstall).toBeDefined();
    });

    it('should check dependencies', async () => {
      const mockAPI: PluginDependencyAPI = {
        check: jest.fn().mockResolvedValue({
          satisfied: true,
          resolved: [
            {
              pluginId: 'core-plugin',
              requiredVersion: '^1.0.0',
              resolvedVersion: '1.5.0',
              satisfied: true,
              loaded: true,
              enabled: true,
            },
          ],
          missing: [],
          conflicts: [],
          circular: [],
        }),
        getDeclared: jest.fn(),
        getResolved: jest.fn(),
        has: jest.fn(),
        hasVersion: jest.fn(),
        getAPI: jest.fn(),
        waitFor: jest.fn(),
        getGraph: jest.fn(),
        getLoadOrder: jest.fn(),
        getDependents: jest.fn(),
        exposeAPI: jest.fn(),
        onDependencyLoaded: jest.fn(),
        onDependencyUnloaded: jest.fn(),
        requestInstall: jest.fn(),
      };

      const result = await mockAPI.check();

      expect(result.satisfied).toBe(true);
      expect(result.resolved).toHaveLength(1);
      expect(mockAPI.check).toHaveBeenCalled();
    });

    it('should get declared and resolved dependencies', () => {
      const mockAPI: PluginDependencyAPI = {
        check: jest.fn(),
        getDeclared: jest.fn().mockReturnValue([
          { pluginId: 'dep-1', version: '^1.0.0' },
          { pluginId: 'dep-2', version: '>=2.0.0', optional: true },
        ]),
        getResolved: jest.fn().mockReturnValue([
          {
            pluginId: 'dep-1',
            requiredVersion: '^1.0.0',
            resolvedVersion: '1.2.0',
            satisfied: true,
            loaded: true,
            enabled: true,
          },
        ]),
        has: jest.fn(),
        hasVersion: jest.fn(),
        getAPI: jest.fn(),
        waitFor: jest.fn(),
        getGraph: jest.fn(),
        getLoadOrder: jest.fn(),
        getDependents: jest.fn(),
        exposeAPI: jest.fn(),
        onDependencyLoaded: jest.fn(),
        onDependencyUnloaded: jest.fn(),
        requestInstall: jest.fn(),
      };

      const declared = mockAPI.getDeclared();
      expect(declared).toHaveLength(2);

      const resolved = mockAPI.getResolved();
      expect(resolved).toHaveLength(1);
    });

    it('should check dependency availability', () => {
      const mockAPI: PluginDependencyAPI = {
        check: jest.fn(),
        getDeclared: jest.fn(),
        getResolved: jest.fn(),
        has: jest.fn().mockImplementation((id) => id === 'existing-plugin'),
        hasVersion: jest.fn().mockImplementation((id, version) => 
          id === 'existing-plugin' && version === '^1.0.0'
        ),
        getAPI: jest.fn(),
        waitFor: jest.fn(),
        getGraph: jest.fn(),
        getLoadOrder: jest.fn(),
        getDependents: jest.fn(),
        exposeAPI: jest.fn(),
        onDependencyLoaded: jest.fn(),
        onDependencyUnloaded: jest.fn(),
        requestInstall: jest.fn(),
      };

      expect(mockAPI.has('existing-plugin')).toBe(true);
      expect(mockAPI.has('missing-plugin')).toBe(false);
      expect(mockAPI.hasVersion('existing-plugin', '^1.0.0')).toBe(true);
      expect(mockAPI.hasVersion('existing-plugin', '^2.0.0')).toBe(false);
    });

    it('should get dependency API', () => {
      interface PluginAPI {
        getData(): string;
        process(input: string): number;
      }

      const mockAPI: PluginDependencyAPI = {
        check: jest.fn(),
        getDeclared: jest.fn(),
        getResolved: jest.fn(),
        has: jest.fn(),
        hasVersion: jest.fn(),
        getAPI: jest.fn().mockImplementation(<T>(id: string): T | null => {
          if (id === 'other-plugin') {
            return {
              getData: () => 'test data',
              process: (input: string) => input.length,
            } as T;
          }
          return null;
        }),
        waitFor: jest.fn(),
        getGraph: jest.fn(),
        getLoadOrder: jest.fn(),
        getDependents: jest.fn(),
        exposeAPI: jest.fn(),
        onDependencyLoaded: jest.fn(),
        onDependencyUnloaded: jest.fn(),
        requestInstall: jest.fn(),
      };

      const api = mockAPI.getAPI<PluginAPI>('other-plugin');
      expect(api).not.toBeNull();
      expect(api!.getData()).toBe('test data');
      expect(api!.process('hello')).toBe(5);

      const missing = mockAPI.getAPI('missing-plugin');
      expect(missing).toBeNull();
    });

    it('should wait for dependency to load', async () => {
      const mockAPI: PluginDependencyAPI = {
        check: jest.fn(),
        getDeclared: jest.fn(),
        getResolved: jest.fn(),
        has: jest.fn(),
        hasVersion: jest.fn(),
        getAPI: jest.fn(),
        waitFor: jest.fn().mockImplementation(async (id, timeout) => {
          if (id === 'slow-plugin') {
            return true;
          }
          return false;
        }),
        getGraph: jest.fn(),
        getLoadOrder: jest.fn(),
        getDependents: jest.fn(),
        exposeAPI: jest.fn(),
        onDependencyLoaded: jest.fn(),
        onDependencyUnloaded: jest.fn(),
        requestInstall: jest.fn(),
      };

      const loaded = await mockAPI.waitFor('slow-plugin', 5000);
      expect(loaded).toBe(true);
      expect(mockAPI.waitFor).toHaveBeenCalledWith('slow-plugin', 5000);

      const notLoaded = await mockAPI.waitFor('missing-plugin');
      expect(notLoaded).toBe(false);
    });

    it('should get dependency graph and load order', () => {
      const mockAPI: PluginDependencyAPI = {
        check: jest.fn(),
        getDeclared: jest.fn(),
        getResolved: jest.fn(),
        has: jest.fn(),
        hasVersion: jest.fn(),
        getAPI: jest.fn(),
        waitFor: jest.fn(),
        getGraph: jest.fn().mockReturnValue([
          { pluginId: 'base', version: '1.0.0', dependencies: [], dependents: ['middle'], loadOrder: 0 },
          { pluginId: 'middle', version: '1.0.0', dependencies: ['base'], dependents: ['top'], loadOrder: 1 },
          { pluginId: 'top', version: '1.0.0', dependencies: ['middle'], dependents: [], loadOrder: 2 },
        ]),
        getLoadOrder: jest.fn().mockReturnValue(['base', 'middle', 'top']),
        getDependents: jest.fn(),
        exposeAPI: jest.fn(),
        onDependencyLoaded: jest.fn(),
        onDependencyUnloaded: jest.fn(),
        requestInstall: jest.fn(),
      };

      const graph = mockAPI.getGraph();
      expect(graph).toHaveLength(3);
      expect(graph[0].loadOrder).toBe(0);

      const order = mockAPI.getLoadOrder();
      expect(order).toEqual(['base', 'middle', 'top']);
    });

    it('should get dependents and expose API', () => {
      const mockAPI: PluginDependencyAPI = {
        check: jest.fn(),
        getDeclared: jest.fn(),
        getResolved: jest.fn(),
        has: jest.fn(),
        hasVersion: jest.fn(),
        getAPI: jest.fn(),
        waitFor: jest.fn(),
        getGraph: jest.fn(),
        getLoadOrder: jest.fn(),
        getDependents: jest.fn().mockReturnValue(['plugin-a', 'plugin-b']),
        exposeAPI: jest.fn(),
        onDependencyLoaded: jest.fn(),
        onDependencyUnloaded: jest.fn(),
        requestInstall: jest.fn(),
      };

      const dependents = mockAPI.getDependents();
      expect(dependents).toContain('plugin-a');
      expect(dependents).toContain('plugin-b');

      const myAPI = { doSomething: () => 'result' };
      mockAPI.exposeAPI(myAPI);
      expect(mockAPI.exposeAPI).toHaveBeenCalledWith(myAPI);
    });

    it('should listen for dependency events', () => {
      const handlers: Record<string, () => void> = {};
      const mockAPI: PluginDependencyAPI = {
        check: jest.fn(),
        getDeclared: jest.fn(),
        getResolved: jest.fn(),
        has: jest.fn(),
        hasVersion: jest.fn(),
        getAPI: jest.fn(),
        waitFor: jest.fn(),
        getGraph: jest.fn(),
        getLoadOrder: jest.fn(),
        getDependents: jest.fn(),
        exposeAPI: jest.fn(),
        onDependencyLoaded: jest.fn().mockImplementation((id, handler) => {
          handlers[`loaded:${id}`] = handler;
          return () => delete handlers[`loaded:${id}`];
        }),
        onDependencyUnloaded: jest.fn().mockImplementation((id, handler) => {
          handlers[`unloaded:${id}`] = handler;
          return () => delete handlers[`unloaded:${id}`];
        }),
        requestInstall: jest.fn(),
      };

      const unsubLoaded = mockAPI.onDependencyLoaded('other-plugin', () => {});
      expect(mockAPI.onDependencyLoaded).toHaveBeenCalledWith('other-plugin', expect.any(Function));
      expect(typeof unsubLoaded).toBe('function');

      const unsubUnloaded = mockAPI.onDependencyUnloaded('other-plugin', () => {});
      expect(mockAPI.onDependencyUnloaded).toHaveBeenCalledWith('other-plugin', expect.any(Function));
      expect(typeof unsubUnloaded).toBe('function');
    });

    it('should request installation of missing dependencies', async () => {
      const mockAPI: PluginDependencyAPI = {
        check: jest.fn(),
        getDeclared: jest.fn(),
        getResolved: jest.fn(),
        has: jest.fn(),
        hasVersion: jest.fn(),
        getAPI: jest.fn(),
        waitFor: jest.fn(),
        getGraph: jest.fn(),
        getLoadOrder: jest.fn(),
        getDependents: jest.fn(),
        exposeAPI: jest.fn(),
        onDependencyLoaded: jest.fn(),
        onDependencyUnloaded: jest.fn(),
        requestInstall: jest.fn().mockResolvedValue(true),
      };

      const deps: DependencySpec[] = [
        { pluginId: 'missing-1', version: '^1.0.0' },
        { pluginId: 'missing-2', version: '>=2.0.0' },
      ];

      const installed = await mockAPI.requestInstall(deps);

      expect(installed).toBe(true);
      expect(mockAPI.requestInstall).toHaveBeenCalledWith(deps);
    });
  });
});
