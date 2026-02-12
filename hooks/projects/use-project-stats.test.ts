/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';

jest.mock('@/stores', () => {
  const { create } = jest.requireActual('zustand');
  return {
    useProjectStore: create(() => ({ projects: [] })),
    useSessionStore: create(() => ({ sessions: [] })),
  };
});

import { useProjectStats } from './use-project-stats';

// Helper to get mock stores for test manipulation
function getStores() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const stores = require('@/stores') as any;
  return {
    projectStore: stores.useProjectStore,
    sessionStore: stores.useSessionStore,
  };
}

describe('useProjectStats', () => {
  beforeEach(() => {
    const { projectStore, sessionStore } = getStores();
    projectStore.setState({ projects: [] });
    sessionStore.setState({ sessions: [] });
  });

  it('should return zero stats when no projects or sessions', () => {
    const { result } = renderHook(() => useProjectStats());
    expect(result.current).toEqual({
      totalProjects: 0,
      totalSessions: 0,
      recentProjects: 0,
    });
  });

  it('should count total projects', () => {
    getStores().projectStore.setState({
      projects: [
        { id: 'p1', name: 'P1', updatedAt: new Date('2020-01-01') },
        { id: 'p2', name: 'P2', updatedAt: new Date('2020-01-01') },
      ],
    });

    const { result } = renderHook(() => useProjectStats());
    expect(result.current.totalProjects).toBe(2);
  });

  it('should count sessions with projectId', () => {
    getStores().sessionStore.setState({
      sessions: [
        { id: 's1', projectId: 'p1' },
        { id: 's2', projectId: 'p2' },
        { id: 's3', projectId: undefined },
        { id: 's4', projectId: null },
      ],
    });

    const { result } = renderHook(() => useProjectStats());
    expect(result.current.totalSessions).toBe(2);
  });

  it('should count recent projects (updated within last 24h)', () => {
    const now = new Date();
    const recent = new Date(now.getTime() - 1000 * 60 * 30); // 30 min ago
    const old = new Date(now.getTime() - 1000 * 60 * 60 * 48); // 48h ago

    getStores().projectStore.setState({
      projects: [
        { id: 'p1', name: 'Recent', updatedAt: recent },
        { id: 'p2', name: 'Old', updatedAt: old },
        { id: 'p3', name: 'Also Recent', updatedAt: now },
      ],
    });

    const { result } = renderHook(() => useProjectStats());
    expect(result.current.recentProjects).toBe(2);
    expect(result.current.totalProjects).toBe(3);
  });

  it('should update when projects are added', () => {
    const { result } = renderHook(() => useProjectStats());
    expect(result.current.totalProjects).toBe(0);

    act(() => {
      getStores().projectStore.setState({
        projects: [
          { id: 'p1', name: 'P1', updatedAt: new Date() },
        ],
      });
    });

    expect(result.current.totalProjects).toBe(1);
  });
});
