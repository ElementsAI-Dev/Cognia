/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';

// Create mock store inside jest.mock to avoid hoisting issues
jest.mock('@/stores', () => {
  const { create } = jest.requireActual('zustand');
  const store = create(() => ({
    activities: [] as Array<{
      id: string;
      projectId: string;
      type: string;
      description: string;
      timestamp: Date;
      metadata?: Record<string, unknown>;
    }>,
  }));
  return { useProjectActivityStore: store };
});

import { useProjectActivity } from './use-project-activity';

// Helper to get the mock store for test manipulation
function getMockStore() {
   
  return (require('@/stores') as any).useProjectActivityStore;
}

function addActivity(projectId: string, type: string, description: string) {
  const store = getMockStore();
  store.setState({
    activities: [
      ...store.getState().activities,
      {
        id: `activity-${Date.now()}-${Math.random()}`,
        projectId,
        type,
        description,
        timestamp: new Date(),
      },
    ],
  });
}

describe('useProjectActivity', () => {
  beforeEach(() => {
    getMockStore().setState({ activities: [] });
  });

  it('should return empty array when no activities exist', () => {
    const { result } = renderHook(() => useProjectActivity('project-1'));
    expect(result.current).toEqual([]);
  });

  it('should return activities for the specified project', () => {
    act(() => {
      addActivity('project-1', 'project_created', 'Project created');
      addActivity('project-2', 'project_created', 'Another project');
      addActivity('project-1', 'session_added', 'Session added');
    });

    const { result } = renderHook(() => useProjectActivity('project-1'));
    expect(result.current).toHaveLength(2);
    expect(result.current.every((a) => a.projectId === 'project-1')).toBe(true);
  });

  it('should update when activities are added', () => {
    const { result } = renderHook(() => useProjectActivity('project-1'));
    expect(result.current).toHaveLength(0);

    act(() => {
      addActivity('project-1', 'knowledge_added', 'File added');
    });

    expect(result.current).toHaveLength(1);
    expect(result.current[0].type).toBe('knowledge_added');
  });

  it('should not return activities for other projects', () => {
    act(() => {
      addActivity('project-2', 'project_created', 'Other project');
    });

    const { result } = renderHook(() => useProjectActivity('project-1'));
    expect(result.current).toHaveLength(0);
  });
});
