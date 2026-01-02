/**
 * SubAgent Store Tests
 */

import { act, renderHook } from '@testing-library/react';
import { useSubAgentStore } from './sub-agent-store';

describe('useSubAgentStore', () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useSubAgentStore.getState().reset();
    });
  });

  describe('createSubAgent', () => {
    it('should create a sub-agent with default config', () => {
      const { result } = renderHook(() => useSubAgentStore());

      let subAgent: ReturnType<typeof result.current.createSubAgent>;
      act(() => {
        subAgent = result.current.createSubAgent({
          parentAgentId: 'parent-1',
          name: 'Test SubAgent',
          task: 'Test task',
        });
      });

      expect(subAgent!).toBeDefined();
      expect(subAgent!.name).toBe('Test SubAgent');
      expect(subAgent!.task).toBe('Test task');
      expect(subAgent!.parentAgentId).toBe('parent-1');
      expect(subAgent!.status).toBe('pending');
      expect(subAgent!.progress).toBe(0);
      expect(result.current.subAgents[subAgent!.id]).toBeDefined();
    });

    it('should create a sub-agent with custom config', () => {
      const { result } = renderHook(() => useSubAgentStore());

      let subAgent: ReturnType<typeof result.current.createSubAgent>;
      act(() => {
        subAgent = result.current.createSubAgent({
          parentAgentId: 'parent-1',
          name: 'Custom SubAgent',
          description: 'A custom sub-agent',
          task: 'Custom task',
          config: {
            priority: 'high',
            maxSteps: 20,
            temperature: 0.5,
          },
          order: 5,
        });
      });

      expect(subAgent!.description).toBe('A custom sub-agent');
      expect(subAgent!.config.priority).toBe('high');
      expect(subAgent!.config.maxSteps).toBe(20);
      expect(subAgent!.config.temperature).toBe(0.5);
      expect(subAgent!.order).toBe(5);
    });
  });

  describe('updateSubAgent', () => {
    it('should update sub-agent properties', () => {
      const { result } = renderHook(() => useSubAgentStore());

      let subAgent: ReturnType<typeof result.current.createSubAgent>;
      act(() => {
        subAgent = result.current.createSubAgent({
          parentAgentId: 'parent-1',
          name: 'Test SubAgent',
          task: 'Test task',
        });
      });

      act(() => {
        result.current.updateSubAgent(subAgent!.id, {
          name: 'Updated Name',
          description: 'Updated description',
        });
      });

      const updated = result.current.subAgents[subAgent!.id];
      expect(updated.name).toBe('Updated Name');
      expect(updated.description).toBe('Updated description');
    });
  });

  describe('deleteSubAgent', () => {
    it('should delete a sub-agent', () => {
      const { result } = renderHook(() => useSubAgentStore());

      let subAgent: ReturnType<typeof result.current.createSubAgent>;
      act(() => {
        subAgent = result.current.createSubAgent({
          parentAgentId: 'parent-1',
          name: 'Test SubAgent',
          task: 'Test task',
        });
      });

      expect(result.current.subAgents[subAgent!.id]).toBeDefined();

      act(() => {
        result.current.deleteSubAgent(subAgent!.id);
      });

      expect(result.current.subAgents[subAgent!.id]).toBeUndefined();
    });
  });

  describe('setSubAgentStatus', () => {
    it('should update sub-agent status', () => {
      const { result } = renderHook(() => useSubAgentStore());

      let subAgent: ReturnType<typeof result.current.createSubAgent>;
      act(() => {
        subAgent = result.current.createSubAgent({
          parentAgentId: 'parent-1',
          name: 'Test SubAgent',
          task: 'Test task',
        });
      });

      act(() => {
        result.current.setSubAgentStatus(subAgent!.id, 'running');
      });

      expect(result.current.subAgents[subAgent!.id].status).toBe('running');
      expect(result.current.subAgents[subAgent!.id].startedAt).toBeDefined();
    });

    it('should set completedAt when status is completed', () => {
      const { result } = renderHook(() => useSubAgentStore());

      let subAgent: ReturnType<typeof result.current.createSubAgent>;
      act(() => {
        subAgent = result.current.createSubAgent({
          parentAgentId: 'parent-1',
          name: 'Test SubAgent',
          task: 'Test task',
        });
      });

      act(() => {
        result.current.setSubAgentStatus(subAgent!.id, 'completed');
      });

      expect(result.current.subAgents[subAgent!.id].status).toBe('completed');
      expect(result.current.subAgents[subAgent!.id].completedAt).toBeDefined();
    });
  });

  describe('setSubAgentProgress', () => {
    it('should update sub-agent progress', () => {
      const { result } = renderHook(() => useSubAgentStore());

      let subAgent: ReturnType<typeof result.current.createSubAgent>;
      act(() => {
        subAgent = result.current.createSubAgent({
          parentAgentId: 'parent-1',
          name: 'Test SubAgent',
          task: 'Test task',
        });
      });

      act(() => {
        result.current.setSubAgentProgress(subAgent!.id, 50);
      });

      expect(result.current.subAgents[subAgent!.id].progress).toBe(50);
    });

    it('should clamp progress between 0 and 100', () => {
      const { result } = renderHook(() => useSubAgentStore());

      let subAgent: ReturnType<typeof result.current.createSubAgent>;
      act(() => {
        subAgent = result.current.createSubAgent({
          parentAgentId: 'parent-1',
          name: 'Test SubAgent',
          task: 'Test task',
        });
      });

      act(() => {
        result.current.setSubAgentProgress(subAgent!.id, 150);
      });
      expect(result.current.subAgents[subAgent!.id].progress).toBe(100);

      act(() => {
        result.current.setSubAgentProgress(subAgent!.id, -10);
      });
      expect(result.current.subAgents[subAgent!.id].progress).toBe(0);
    });
  });

  describe('addSubAgentLog', () => {
    it('should add a log entry', () => {
      const { result } = renderHook(() => useSubAgentStore());

      let subAgent: ReturnType<typeof result.current.createSubAgent>;
      act(() => {
        subAgent = result.current.createSubAgent({
          parentAgentId: 'parent-1',
          name: 'Test SubAgent',
          task: 'Test task',
        });
      });

      act(() => {
        result.current.addSubAgentLog(subAgent!.id, 'info', 'Test log message', { key: 'value' });
      });

      const logs = result.current.subAgents[subAgent!.id].logs;
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('info');
      expect(logs[0].message).toBe('Test log message');
      expect(logs[0].data).toEqual({ key: 'value' });
    });
  });

  describe('getSubAgentsByParent', () => {
    it('should return sub-agents for a specific parent', () => {
      const { result } = renderHook(() => useSubAgentStore());

      act(() => {
        result.current.createSubAgent({
          parentAgentId: 'parent-1',
          name: 'SubAgent 1',
          task: 'Task 1',
        });
        result.current.createSubAgent({
          parentAgentId: 'parent-1',
          name: 'SubAgent 2',
          task: 'Task 2',
        });
        result.current.createSubAgent({
          parentAgentId: 'parent-2',
          name: 'SubAgent 3',
          task: 'Task 3',
        });
      });

      const parent1SubAgents = result.current.getSubAgentsByParent('parent-1');
      expect(parent1SubAgents).toHaveLength(2);

      const parent2SubAgents = result.current.getSubAgentsByParent('parent-2');
      expect(parent2SubAgents).toHaveLength(1);
    });
  });

  describe('getSubAgentsByStatus', () => {
    it('should return sub-agents with a specific status', () => {
      const { result } = renderHook(() => useSubAgentStore());

      let subAgent1: ReturnType<typeof result.current.createSubAgent>;
      let subAgent2: ReturnType<typeof result.current.createSubAgent>;

      act(() => {
        subAgent1 = result.current.createSubAgent({
          parentAgentId: 'parent-1',
          name: 'SubAgent 1',
          task: 'Task 1',
        });
        subAgent2 = result.current.createSubAgent({
          parentAgentId: 'parent-1',
          name: 'SubAgent 2',
          task: 'Task 2',
        });
      });

      act(() => {
        result.current.setSubAgentStatus(subAgent1!.id, 'running');
      });

      const runningAgents = result.current.getSubAgentsByStatus('running');
      expect(runningAgents).toHaveLength(1);
      expect(runningAgents[0].id).toBe(subAgent1!.id);

      const pendingAgents = result.current.getSubAgentsByStatus('pending');
      expect(pendingAgents).toHaveLength(1);
      expect(pendingAgents[0].id).toBe(subAgent2!.id);
    });
  });

  describe('cancelAllSubAgents', () => {
    it('should cancel all running sub-agents for a parent', () => {
      const { result } = renderHook(() => useSubAgentStore());

      let subAgent1: ReturnType<typeof result.current.createSubAgent>;
      let subAgent2: ReturnType<typeof result.current.createSubAgent>;

      act(() => {
        subAgent1 = result.current.createSubAgent({
          parentAgentId: 'parent-1',
          name: 'SubAgent 1',
          task: 'Task 1',
        });
        subAgent2 = result.current.createSubAgent({
          parentAgentId: 'parent-1',
          name: 'SubAgent 2',
          task: 'Task 2',
        });
      });

      act(() => {
        result.current.setSubAgentStatus(subAgent1!.id, 'running');
        result.current.setSubAgentStatus(subAgent2!.id, 'running');
      });

      act(() => {
        result.current.cancelAllSubAgents('parent-1');
      });

      expect(result.current.subAgents[subAgent1!.id].status).toBe('cancelled');
      expect(result.current.subAgents[subAgent2!.id].status).toBe('cancelled');
    });
  });

  describe('clearCompletedSubAgents', () => {
    it('should clear completed sub-agents for a parent', () => {
      const { result } = renderHook(() => useSubAgentStore());

      let subAgent1: ReturnType<typeof result.current.createSubAgent>;
      let subAgent2: ReturnType<typeof result.current.createSubAgent>;

      act(() => {
        subAgent1 = result.current.createSubAgent({
          parentAgentId: 'parent-1',
          name: 'SubAgent 1',
          task: 'Task 1',
        });
        subAgent2 = result.current.createSubAgent({
          parentAgentId: 'parent-1',
          name: 'SubAgent 2',
          task: 'Task 2',
        });
      });

      act(() => {
        result.current.setSubAgentStatus(subAgent1!.id, 'completed');
      });

      act(() => {
        result.current.clearCompletedSubAgents('parent-1');
      });

      expect(result.current.subAgents[subAgent1!.id]).toBeUndefined();
      expect(result.current.subAgents[subAgent2!.id]).toBeDefined();
    });
  });

  describe('reorderSubAgents', () => {
    it('should reorder sub-agents', () => {
      const { result } = renderHook(() => useSubAgentStore());

      let subAgent1: ReturnType<typeof result.current.createSubAgent>;
      let subAgent2: ReturnType<typeof result.current.createSubAgent>;
      let subAgent3: ReturnType<typeof result.current.createSubAgent>;

      act(() => {
        subAgent1 = result.current.createSubAgent({
          parentAgentId: 'parent-1',
          name: 'SubAgent 1',
          task: 'Task 1',
        });
        subAgent2 = result.current.createSubAgent({
          parentAgentId: 'parent-1',
          name: 'SubAgent 2',
          task: 'Task 2',
        });
        subAgent3 = result.current.createSubAgent({
          parentAgentId: 'parent-1',
          name: 'SubAgent 3',
          task: 'Task 3',
        });
      });

      act(() => {
        result.current.reorderSubAgents('parent-1', [subAgent3!.id, subAgent1!.id, subAgent2!.id]);
      });

      expect(result.current.subAgents[subAgent3!.id].order).toBe(0);
      expect(result.current.subAgents[subAgent1!.id].order).toBe(1);
      expect(result.current.subAgents[subAgent2!.id].order).toBe(2);
    });
  });

  describe('reset', () => {
    it('should reset the store to initial state', () => {
      const { result } = renderHook(() => useSubAgentStore());

      act(() => {
        result.current.createSubAgent({
          parentAgentId: 'parent-1',
          name: 'SubAgent 1',
          task: 'Task 1',
        });
        result.current.setActiveParent('parent-1');
      });

      expect(Object.keys(result.current.subAgents).length).toBe(1);
      expect(result.current.activeParentId).toBe('parent-1');

      act(() => {
        result.current.reset();
      });

      expect(Object.keys(result.current.subAgents).length).toBe(0);
      expect(result.current.activeParentId).toBeNull();
    });
  });
});
