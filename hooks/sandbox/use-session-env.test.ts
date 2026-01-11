/**
 * Tests for useSessionEnv Hook
 */

import { renderHook, act } from '@testing-library/react';
import { useSessionStore } from '@/stores/chat';
import { useVirtualEnvStore } from '@/stores/system';
import { useSessionEnv, getSessionEnvContext, selectSessionHasEnv } from './use-session-env';
import type { VirtualEnvInfo, ProjectEnvConfig } from '@/types/system/environment';

// Mock environments
const mockEnvs: VirtualEnvInfo[] = [
  {
    id: 'env-1',
    name: 'data-science',
    type: 'uv',
    path: '/envs/data-science',
    pythonVersion: '3.11.0',
    pythonPath: '/envs/data-science/bin/python',
    status: 'active',
    packages: 50,
    size: '200 MB',
    createdAt: '2024-01-01T00:00:00Z',
    lastUsedAt: '2024-06-01T00:00:00Z',
    isDefault: false,
    projectPath: null,
  },
  {
    id: 'env-2',
    name: 'web-dev',
    type: 'venv',
    path: '/envs/web-dev',
    pythonVersion: '3.10.0',
    pythonPath: '/envs/web-dev/bin/python',
    status: 'inactive',
    packages: 30,
    size: '100 MB',
    createdAt: '2024-02-01T00:00:00Z',
    lastUsedAt: null,
    isDefault: false,
    projectPath: null,
  },
];

const mockProjectConfig: ProjectEnvConfig = {
  id: 'project-1',
  projectPath: '/projects/my-project',
  projectName: 'My Project',
  pythonVersion: '3.11',
  nodeVersion: null,
  virtualEnvId: 'env-2',
  virtualEnvPath: '/envs/web-dev',
  autoActivate: true,
  envVars: {},
  scripts: {},
  dependencies: { python: [], node: [], system: [] },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('useSessionEnv', () => {
  beforeEach(() => {
    // Reset stores
    useSessionStore.setState({
      sessions: [],
      activeSessionId: null,
      modeHistory: [],
    });
    useVirtualEnvStore.setState({
      environments: mockEnvs,
      activeEnvId: null,
      projectConfigs: [],
      selectedEnvIds: [],
      filterOptions: {},
      healthChecks: {},
      packageCache: {},
    });
  });

  describe('environment resolution', () => {
    it('should return no environment when none is set', () => {
      // Create a session without environment
      let sessionId: string;
      act(() => {
        const session = useSessionStore.getState().createSession({ title: 'Test' });
        sessionId = session.id;
      });

      const { result } = renderHook(() => useSessionEnv(sessionId!));

      expect(result.current.envId).toBeNull();
      expect(result.current.envPath).toBeNull();
      expect(result.current.environment).toBeNull();
      expect(result.current.source).toBe('none');
      expect(result.current.hasEnvironment).toBe(false);
    });

    it('should resolve session-specific environment', () => {
      let sessionId: string;
      act(() => {
        const session = useSessionStore.getState().createSession({ title: 'Test' });
        sessionId = session.id;
        useSessionStore.getState().setSessionEnvironment(sessionId, 'env-1', '/envs/data-science');
      });

      const { result } = renderHook(() => useSessionEnv(sessionId!));

      expect(result.current.envId).toBe('env-1');
      expect(result.current.envPath).toBe('/envs/data-science');
      expect(result.current.environment?.name).toBe('data-science');
      expect(result.current.source).toBe('session');
      expect(result.current.hasEnvironment).toBe(true);
    });

    it('should resolve project-linked environment', () => {
      // Set up project config
      act(() => {
        useVirtualEnvStore.getState().addProjectConfig(mockProjectConfig);
      });

      let sessionId: string;
      act(() => {
        const session = useSessionStore.getState().createSession({
          title: 'Test',
          projectId: 'project-1',
        });
        sessionId = session.id;
      });

      const { result } = renderHook(() => useSessionEnv(sessionId!));

      expect(result.current.envId).toBe('env-2');
      expect(result.current.source).toBe('project');
    });

    it('should resolve global active environment as fallback', () => {
      act(() => {
        useVirtualEnvStore.getState().setActiveEnv('env-1');
      });

      let sessionId: string;
      act(() => {
        const session = useSessionStore.getState().createSession({ title: 'Test' });
        sessionId = session.id;
      });

      const { result } = renderHook(() => useSessionEnv(sessionId!));

      expect(result.current.envId).toBe('env-1');
      expect(result.current.source).toBe('global');
    });

    it('should prioritize session environment over project', () => {
      act(() => {
        useVirtualEnvStore.getState().addProjectConfig(mockProjectConfig);
      });

      let sessionId: string;
      act(() => {
        const session = useSessionStore.getState().createSession({
          title: 'Test',
          projectId: 'project-1',
        });
        sessionId = session.id;
        // Set session-specific environment
        useSessionStore.getState().setSessionEnvironment(sessionId, 'env-1', '/envs/data-science');
      });

      const { result } = renderHook(() => useSessionEnv(sessionId!));

      expect(result.current.envId).toBe('env-1');
      expect(result.current.source).toBe('session');
    });

    it('should prioritize project environment over global', () => {
      act(() => {
        useVirtualEnvStore.getState().addProjectConfig(mockProjectConfig);
        useVirtualEnvStore.getState().setActiveEnv('env-1');
      });

      let sessionId: string;
      act(() => {
        const session = useSessionStore.getState().createSession({
          title: 'Test',
          projectId: 'project-1',
        });
        sessionId = session.id;
      });

      const { result } = renderHook(() => useSessionEnv(sessionId!));

      expect(result.current.envId).toBe('env-2');
      expect(result.current.source).toBe('project');
    });
  });

  describe('setEnvironment', () => {
    it('should set session environment', () => {
      let sessionId: string;
      act(() => {
        const session = useSessionStore.getState().createSession({ title: 'Test' });
        sessionId = session.id;
      });

      const { result } = renderHook(() => useSessionEnv(sessionId!));

      act(() => {
        result.current.setEnvironment('env-2', '/envs/web-dev');
      });

      expect(result.current.envId).toBe('env-2');
      expect(result.current.environment?.name).toBe('web-dev');
      expect(result.current.source).toBe('session');
    });

    it('should auto-resolve path when only envId provided', () => {
      let sessionId: string;
      act(() => {
        const session = useSessionStore.getState().createSession({ title: 'Test' });
        sessionId = session.id;
      });

      const { result } = renderHook(() => useSessionEnv(sessionId!));

      act(() => {
        result.current.setEnvironment('env-1');
      });

      const session = useSessionStore.getState().getSession(sessionId!);
      expect(session?.virtualEnvPath).toBe('/envs/data-science');
    });
  });

  describe('clearEnvironment', () => {
    it('should clear session environment', () => {
      let sessionId: string;
      act(() => {
        const session = useSessionStore.getState().createSession({ title: 'Test' });
        sessionId = session.id;
        useSessionStore.getState().setSessionEnvironment(sessionId, 'env-1', '/envs/data-science');
      });

      const { result } = renderHook(() => useSessionEnv(sessionId!));

      expect(result.current.source).toBe('session');

      act(() => {
        result.current.clearEnvironment();
      });

      // Should fall back to none (no global or project)
      expect(result.current.source).toBe('none');
      expect(result.current.envId).toBeNull();
    });

    it('should fall back to global after clearing session env', () => {
      act(() => {
        useVirtualEnvStore.getState().setActiveEnv('env-2');
      });

      let sessionId: string;
      act(() => {
        const session = useSessionStore.getState().createSession({ title: 'Test' });
        sessionId = session.id;
        useSessionStore.getState().setSessionEnvironment(sessionId, 'env-1', '/envs/data-science');
      });

      const { result } = renderHook(() => useSessionEnv(sessionId!));

      act(() => {
        result.current.clearEnvironment();
      });

      expect(result.current.source).toBe('global');
      expect(result.current.envId).toBe('env-2');
    });
  });

  describe('availableEnvironments', () => {
    it('should return all available environments', () => {
      let sessionId: string;
      act(() => {
        const session = useSessionStore.getState().createSession({ title: 'Test' });
        sessionId = session.id;
      });

      const { result } = renderHook(() => useSessionEnv(sessionId!));

      expect(result.current.availableEnvironments).toHaveLength(2);
      expect(result.current.availableEnvironments[0].id).toBe('env-1');
      expect(result.current.availableEnvironments[1].id).toBe('env-2');
    });
  });

  describe('uses active session when no sessionId provided', () => {
    it('should use active session', () => {
      act(() => {
        const session = useSessionStore.getState().createSession({ title: 'Test' });
        useSessionStore.getState().setSessionEnvironment(session.id, 'env-1', '/envs/data-science');
      });

      // No sessionId provided - should use active session
      const { result } = renderHook(() => useSessionEnv());

      expect(result.current.envId).toBe('env-1');
      expect(result.current.source).toBe('session');
    });
  });
});

describe('getSessionEnvContext', () => {
  it('should resolve environment context correctly', () => {
    const sessions = [
      {
        id: 'session-1',
        title: 'Test',
        virtualEnvId: 'env-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        provider: 'openai' as const,
        model: 'gpt-4',
        mode: 'chat' as const,
      },
    ];

    const result = getSessionEnvContext(
      'session-1',
      sessions,
      mockEnvs,
      [],
      null
    );

    expect(result.envId).toBe('env-1');
    expect(result.envPath).toBe('/envs/data-science');
    expect(result.source).toBe('session');
  });

  it('should return none when session not found', () => {
    const result = getSessionEnvContext(
      'non-existent',
      [],
      mockEnvs,
      [],
      null
    );

    expect(result.envId).toBeNull();
    expect(result.source).toBe('none');
  });
});

describe('selectSessionHasEnv', () => {
  beforeEach(() => {
    useSessionStore.setState({
      sessions: [],
      activeSessionId: null,
      modeHistory: [],
    });
    useVirtualEnvStore.setState({
      environments: mockEnvs,
      activeEnvId: null,
      projectConfigs: [],
      selectedEnvIds: [],
      filterOptions: {},
      healthChecks: {},
      packageCache: {},
    });
  });

  it('should return false for null sessionId', () => {
    expect(selectSessionHasEnv(null)).toBe(false);
  });

  it('should return true when session has environment', () => {
    let sessionId: string;
    act(() => {
      const session = useSessionStore.getState().createSession({ title: 'Test' });
      sessionId = session.id;
      useSessionStore.getState().setSessionEnvironment(sessionId, 'env-1', '/path');
    });

    expect(selectSessionHasEnv(sessionId!)).toBe(true);
  });

  it('should return true when global environment is active', () => {
    let sessionId: string;
    act(() => {
      const session = useSessionStore.getState().createSession({ title: 'Test' });
      sessionId = session.id;
      useVirtualEnvStore.getState().setActiveEnv('env-1');
    });

    expect(selectSessionHasEnv(sessionId!)).toBe(true);
  });

  it('should return false when no environment available', () => {
    let sessionId: string;
    act(() => {
      const session = useSessionStore.getState().createSession({ title: 'Test' });
      sessionId = session.id;
    });

    expect(selectSessionHasEnv(sessionId!)).toBe(false);
  });
});
