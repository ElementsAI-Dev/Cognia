/**
 * BackgroundAgent Store Tests
 */

import { act, renderHook } from '@testing-library/react';
import { useBackgroundAgentStore } from './background-agent-store';

describe('useBackgroundAgentStore', () => {
  beforeEach(() => {
    act(() => {
      useBackgroundAgentStore.getState().reset();
    });
  });

  describe('createAgent', () => {
    it('should create a background agent with default config', () => {
      const { result } = renderHook(() => useBackgroundAgentStore());

      let agent: ReturnType<typeof result.current.createAgent>;
      act(() => {
        agent = result.current.createAgent({
          sessionId: 'session-1',
          name: 'Test Agent',
          task: 'Test task',
        });
      });

      expect(agent!).toBeDefined();
      expect(agent!.name).toBe('Test Agent');
      expect(agent!.task).toBe('Test task');
      expect(agent!.sessionId).toBe('session-1');
      expect(agent!.status).toBe('idle');
      expect(agent!.progress).toBe(0);
      expect(result.current.agents[agent!.id]).toBeDefined();
    });

    it('should create an agent with custom config', () => {
      const { result } = renderHook(() => useBackgroundAgentStore());

      let agent: ReturnType<typeof result.current.createAgent>;
      act(() => {
        agent = result.current.createAgent({
          sessionId: 'session-1',
          name: 'Custom Agent',
          description: 'A custom agent',
          task: 'Custom task',
          config: {
            maxSteps: 20,
            timeout: 60000,
            notifyOnComplete: true,
          },
          priority: 3,
          tags: ['test', 'custom'],
        });
      });

      expect(agent!.description).toBe('A custom agent');
      expect(agent!.config.maxSteps).toBe(20);
      expect(agent!.config.timeout).toBe(60000);
      expect(agent!.priority).toBe(3);
      expect(agent!.tags).toEqual(['test', 'custom']);
    });
  });

  describe('updateAgent', () => {
    it('should update agent properties', () => {
      const { result } = renderHook(() => useBackgroundAgentStore());

      let agent: ReturnType<typeof result.current.createAgent>;
      act(() => {
        agent = result.current.createAgent({
          sessionId: 'session-1',
          name: 'Test Agent',
          task: 'Test task',
        });
      });

      act(() => {
        result.current.updateAgent(agent!.id, {
          name: 'Updated Name',
          description: 'Updated description',
        });
      });

      const updated = result.current.agents[agent!.id];
      expect(updated.name).toBe('Updated Name');
      expect(updated.description).toBe('Updated description');
    });
  });

  describe('deleteAgent', () => {
    it('should delete an agent', () => {
      const { result } = renderHook(() => useBackgroundAgentStore());

      let agent: ReturnType<typeof result.current.createAgent>;
      act(() => {
        agent = result.current.createAgent({
          sessionId: 'session-1',
          name: 'Test Agent',
          task: 'Test task',
        });
      });

      expect(result.current.agents[agent!.id]).toBeDefined();

      act(() => {
        result.current.deleteAgent(agent!.id);
      });

      expect(result.current.agents[agent!.id]).toBeUndefined();
    });

    it('should clear selected agent if deleted', () => {
      const { result } = renderHook(() => useBackgroundAgentStore());

      let agent: ReturnType<typeof result.current.createAgent>;
      act(() => {
        agent = result.current.createAgent({
          sessionId: 'session-1',
          name: 'Test Agent',
          task: 'Test task',
        });
        result.current.selectAgent(agent!.id);
      });

      expect(result.current.selectedAgentId).toBe(agent!.id);

      act(() => {
        result.current.deleteAgent(agent!.id);
      });

      expect(result.current.selectedAgentId).toBeNull();
    });
  });

  describe('setAgentStatus', () => {
    it('should update agent status', () => {
      const { result } = renderHook(() => useBackgroundAgentStore());

      let agent: ReturnType<typeof result.current.createAgent>;
      act(() => {
        agent = result.current.createAgent({
          sessionId: 'session-1',
          name: 'Test Agent',
          task: 'Test task',
        });
      });

      act(() => {
        result.current.setAgentStatus(agent!.id, 'running');
      });

      expect(result.current.agents[agent!.id].status).toBe('running');
      expect(result.current.agents[agent!.id].startedAt).toBeDefined();
    });

    it('should set completedAt when status is completed', () => {
      const { result } = renderHook(() => useBackgroundAgentStore());

      let agent: ReturnType<typeof result.current.createAgent>;
      act(() => {
        agent = result.current.createAgent({
          sessionId: 'session-1',
          name: 'Test Agent',
          task: 'Test task',
        });
      });

      act(() => {
        result.current.setAgentStatus(agent!.id, 'completed');
      });

      expect(result.current.agents[agent!.id].status).toBe('completed');
      expect(result.current.agents[agent!.id].completedAt).toBeDefined();
    });
  });

  describe('setAgentProgress', () => {
    it('should update agent progress', () => {
      const { result } = renderHook(() => useBackgroundAgentStore());

      let agent: ReturnType<typeof result.current.createAgent>;
      act(() => {
        agent = result.current.createAgent({
          sessionId: 'session-1',
          name: 'Test Agent',
          task: 'Test task',
        });
      });

      act(() => {
        result.current.setAgentProgress(agent!.id, 50);
      });

      expect(result.current.agents[agent!.id].progress).toBe(50);
    });

    it('should clamp progress between 0 and 100', () => {
      const { result } = renderHook(() => useBackgroundAgentStore());

      let agent: ReturnType<typeof result.current.createAgent>;
      act(() => {
        agent = result.current.createAgent({
          sessionId: 'session-1',
          name: 'Test Agent',
          task: 'Test task',
        });
      });

      act(() => {
        result.current.setAgentProgress(agent!.id, 150);
      });
      expect(result.current.agents[agent!.id].progress).toBe(100);

      act(() => {
        result.current.setAgentProgress(agent!.id, -10);
      });
      expect(result.current.agents[agent!.id].progress).toBe(0);
    });
  });

  describe('queueAgent', () => {
    it('should queue an idle agent', () => {
      const { result } = renderHook(() => useBackgroundAgentStore());

      let agent: ReturnType<typeof result.current.createAgent>;
      act(() => {
        agent = result.current.createAgent({
          sessionId: 'session-1',
          name: 'Test Agent',
          task: 'Test task',
        });
      });

      act(() => {
        result.current.queueAgent(agent!.id);
      });

      expect(result.current.agents[agent!.id].status).toBe('queued');
      expect(result.current.agents[agent!.id].queuedAt).toBeDefined();
      expect(result.current.queue.items).toHaveLength(1);
      expect(result.current.queue.items[0].agentId).toBe(agent!.id);
    });

    it('should not queue a non-idle agent', () => {
      const { result } = renderHook(() => useBackgroundAgentStore());

      let agent: ReturnType<typeof result.current.createAgent>;
      act(() => {
        agent = result.current.createAgent({
          sessionId: 'session-1',
          name: 'Test Agent',
          task: 'Test task',
        });
        result.current.setAgentStatus(agent!.id, 'running');
      });

      act(() => {
        result.current.queueAgent(agent!.id);
      });

      expect(result.current.queue.items).toHaveLength(0);
    });
  });

  describe('dequeueAgent', () => {
    it('should remove agent from queue', () => {
      const { result } = renderHook(() => useBackgroundAgentStore());

      let agent: ReturnType<typeof result.current.createAgent>;
      act(() => {
        agent = result.current.createAgent({
          sessionId: 'session-1',
          name: 'Test Agent',
          task: 'Test task',
        });
        result.current.queueAgent(agent!.id);
      });

      expect(result.current.queue.items).toHaveLength(1);

      act(() => {
        result.current.dequeueAgent(agent!.id);
      });

      expect(result.current.queue.items).toHaveLength(0);
    });
  });

  describe('pauseQueue / resumeQueue', () => {
    it('should pause and resume the queue', () => {
      const { result } = renderHook(() => useBackgroundAgentStore());

      expect(result.current.queue.isPaused).toBe(false);

      act(() => {
        result.current.pauseQueue();
      });

      expect(result.current.queue.isPaused).toBe(true);

      act(() => {
        result.current.resumeQueue();
      });

      expect(result.current.queue.isPaused).toBe(false);
    });
  });

  describe('addStep', () => {
    it('should add a step to an agent', () => {
      const { result } = renderHook(() => useBackgroundAgentStore());

      let agent: ReturnType<typeof result.current.createAgent>;
      act(() => {
        agent = result.current.createAgent({
          sessionId: 'session-1',
          name: 'Test Agent',
          task: 'Test task',
        });
      });

      let step: ReturnType<typeof result.current.addStep>;
      act(() => {
        step = result.current.addStep(agent!.id, {
          type: 'thinking',
          status: 'running',
          title: 'Step 1',
          description: 'First step',
        });
      });

      expect(step!).toBeDefined();
      expect(step!.stepNumber).toBe(1);
      expect(result.current.agents[agent!.id].steps).toHaveLength(1);
    });
  });

  describe('addLog', () => {
    it('should add a log entry to an agent', () => {
      const { result } = renderHook(() => useBackgroundAgentStore());

      let agent: ReturnType<typeof result.current.createAgent>;
      act(() => {
        agent = result.current.createAgent({
          sessionId: 'session-1',
          name: 'Test Agent',
          task: 'Test task',
        });
      });

      act(() => {
        result.current.addLog(agent!.id, 'info', 'Test log message', 'system', { key: 'value' });
      });

      const logs = result.current.agents[agent!.id].logs;
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('info');
      expect(logs[0].message).toBe('Test log message');
      expect(logs[0].source).toBe('system');
      expect(logs[0].data).toEqual({ key: 'value' });
    });
  });

  describe('addNotification', () => {
    it('should add a notification to an agent', () => {
      const { result } = renderHook(() => useBackgroundAgentStore());

      let agent: ReturnType<typeof result.current.createAgent>;
      act(() => {
        agent = result.current.createAgent({
          sessionId: 'session-1',
          name: 'Test Agent',
          task: 'Test task',
        });
      });

      act(() => {
        result.current.addNotification(agent!.id, {
          agentId: agent!.id,
          type: 'completed',
          title: 'Agent Completed',
          message: 'The agent has completed successfully.',
        });
      });

      const notifications = result.current.agents[agent!.id].notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('completed');
      expect(notifications[0].read).toBe(false);
    });
  });

  describe('markNotificationRead', () => {
    it('should mark a notification as read', () => {
      const { result } = renderHook(() => useBackgroundAgentStore());

      let agent: ReturnType<typeof result.current.createAgent>;
      act(() => {
        agent = result.current.createAgent({
          sessionId: 'session-1',
          name: 'Test Agent',
          task: 'Test task',
        });
        result.current.addNotification(agent!.id, {
          agentId: agent!.id,
          type: 'completed',
          title: 'Agent Completed',
          message: 'The agent has completed successfully.',
        });
      });

      const notificationId = result.current.agents[agent!.id].notifications[0].id;

      act(() => {
        result.current.markNotificationRead(agent!.id, notificationId);
      });

      expect(result.current.agents[agent!.id].notifications[0].read).toBe(true);
    });
  });

  describe('getAgentsBySession', () => {
    it('should return agents for a specific session', () => {
      const { result } = renderHook(() => useBackgroundAgentStore());

      act(() => {
        result.current.createAgent({
          sessionId: 'session-1',
          name: 'Agent 1',
          task: 'Task 1',
        });
        result.current.createAgent({
          sessionId: 'session-1',
          name: 'Agent 2',
          task: 'Task 2',
        });
        result.current.createAgent({
          sessionId: 'session-2',
          name: 'Agent 3',
          task: 'Task 3',
        });
      });

      const session1Agents = result.current.getAgentsBySession('session-1');
      expect(session1Agents).toHaveLength(2);

      const session2Agents = result.current.getAgentsBySession('session-2');
      expect(session2Agents).toHaveLength(1);
    });
  });

  describe('getRunningAgents', () => {
    it('should return running agents', () => {
      const { result } = renderHook(() => useBackgroundAgentStore());

      let agent1: ReturnType<typeof result.current.createAgent>;
      let _agent2: ReturnType<typeof result.current.createAgent>;

      act(() => {
        agent1 = result.current.createAgent({
          sessionId: 'session-1',
          name: 'Agent 1',
          task: 'Task 1',
        });
        _agent2 = result.current.createAgent({
          sessionId: 'session-1',
          name: 'Agent 2',
          task: 'Task 2',
        });
      });

      act(() => {
        result.current.setAgentStatus(agent1!.id, 'running');
      });

      const runningAgents = result.current.getRunningAgents();
      expect(runningAgents).toHaveLength(1);
      expect(runningAgents[0].id).toBe(agent1!.id);
    });
  });

  describe('getUnreadNotificationCount', () => {
    it('should return count of unread notifications', () => {
      const { result } = renderHook(() => useBackgroundAgentStore());

      let agent: ReturnType<typeof result.current.createAgent>;
      act(() => {
        agent = result.current.createAgent({
          sessionId: 'session-1',
          name: 'Test Agent',
          task: 'Test task',
        });
        result.current.addNotification(agent!.id, {
          agentId: agent!.id,
          type: 'completed',
          title: 'Notification 1',
          message: 'Message 1',
        });
        result.current.addNotification(agent!.id, {
          agentId: agent!.id,
          type: 'failed',
          title: 'Notification 2',
          message: 'Message 2',
        });
      });

      expect(result.current.getUnreadNotificationCount()).toBe(2);

      const notificationId = result.current.agents[agent!.id].notifications[0].id;
      act(() => {
        result.current.markNotificationRead(agent!.id, notificationId);
      });

      expect(result.current.getUnreadNotificationCount()).toBe(1);
    });
  });

  describe('cancelAllAgents', () => {
    it('should cancel all running and queued agents', () => {
      const { result } = renderHook(() => useBackgroundAgentStore());

      let agent1: ReturnType<typeof result.current.createAgent>;
      let agent2: ReturnType<typeof result.current.createAgent>;

      act(() => {
        agent1 = result.current.createAgent({
          sessionId: 'session-1',
          name: 'Agent 1',
          task: 'Task 1',
        });
        agent2 = result.current.createAgent({
          sessionId: 'session-1',
          name: 'Agent 2',
          task: 'Task 2',
        });
      });

      act(() => {
        result.current.setAgentStatus(agent1!.id, 'running');
        result.current.queueAgent(agent2!.id);
      });

      act(() => {
        result.current.cancelAllAgents();
      });

      expect(result.current.agents[agent1!.id].status).toBe('cancelled');
      expect(result.current.agents[agent2!.id].status).toBe('cancelled');
      expect(result.current.queue.items).toHaveLength(0);
    });
  });

  describe('clearCompletedAgents', () => {
    it('should clear completed agents', () => {
      const { result } = renderHook(() => useBackgroundAgentStore());

      let agent1: ReturnType<typeof result.current.createAgent>;
      let agent2: ReturnType<typeof result.current.createAgent>;

      act(() => {
        agent1 = result.current.createAgent({
          sessionId: 'session-1',
          name: 'Agent 1',
          task: 'Task 1',
        });
        agent2 = result.current.createAgent({
          sessionId: 'session-1',
          name: 'Agent 2',
          task: 'Task 2',
        });
      });

      act(() => {
        result.current.setAgentStatus(agent1!.id, 'completed');
      });

      act(() => {
        result.current.clearCompletedAgents();
      });

      expect(result.current.agents[agent1!.id]).toBeUndefined();
      expect(result.current.agents[agent2!.id]).toBeDefined();
    });
  });

  describe('UI state', () => {
    it('should open and close panel', () => {
      const { result } = renderHook(() => useBackgroundAgentStore());

      expect(result.current.isPanelOpen).toBe(false);

      act(() => {
        result.current.openPanel();
      });

      expect(result.current.isPanelOpen).toBe(true);

      act(() => {
        result.current.closePanel();
      });

      expect(result.current.isPanelOpen).toBe(false);
    });

    it('should toggle panel', () => {
      const { result } = renderHook(() => useBackgroundAgentStore());

      expect(result.current.isPanelOpen).toBe(false);

      act(() => {
        result.current.togglePanel();
      });

      expect(result.current.isPanelOpen).toBe(true);

      act(() => {
        result.current.togglePanel();
      });

      expect(result.current.isPanelOpen).toBe(false);
    });

    it('should select and deselect agent', () => {
      const { result } = renderHook(() => useBackgroundAgentStore());

      let agent: ReturnType<typeof result.current.createAgent>;
      act(() => {
        agent = result.current.createAgent({
          sessionId: 'session-1',
          name: 'Test Agent',
          task: 'Test task',
        });
      });

      act(() => {
        result.current.selectAgent(agent!.id);
      });

      expect(result.current.selectedAgentId).toBe(agent!.id);

      act(() => {
        result.current.selectAgent(null);
      });

      expect(result.current.selectedAgentId).toBeNull();
    });
  });

  describe('sync helpers', () => {
    it('upsertAgentSnapshot should clone snapshot to avoid external mutation aliasing', () => {
      const { result } = renderHook(() => useBackgroundAgentStore());

      let source: ReturnType<typeof result.current.createAgent>;
      act(() => {
        source = result.current.createAgent({
          sessionId: 'session-1',
          name: 'Snapshot Source',
          task: 'Task',
        });
      });
      const snapshot = {
        ...source!,
        logs: [...source!.logs],
      };

      act(() => {
        result.current.upsertAgentSnapshot(snapshot);
      });

      snapshot.name = 'Mutated Name';
      snapshot.logs.push({
        id: 'external-log',
        timestamp: new Date(),
        level: 'info',
        message: 'external mutation',
        source: 'system',
      });

      const stored = result.current.agents[source!.id];
      expect(stored.name).toBe('Snapshot Source');
      expect(stored.logs.some((log) => log.id === 'external-log')).toBe(false);
    });

    it('syncQueueState should clone queue items to avoid mutable aliasing', () => {
      const { result } = renderHook(() => useBackgroundAgentStore());

      const queueItems = [
        {
          agentId: 'agent-1',
          priority: 1,
          queuedAt: new Date('2024-01-01T00:00:00.000Z'),
        },
      ];

      act(() => {
        result.current.syncQueueState({ items: queueItems, isPaused: true });
      });

      queueItems[0].priority = 999;
      queueItems.push({
        agentId: 'agent-2',
        priority: 2,
        queuedAt: new Date('2024-01-02T00:00:00.000Z'),
      });

      expect(result.current.queue.isPaused).toBe(true);
      expect(result.current.queue.items).toHaveLength(1);
      expect(result.current.queue.items[0].priority).toBe(1);
    });
  });

  describe('reset', () => {
    it('should reset the store to initial state', () => {
      const { result } = renderHook(() => useBackgroundAgentStore());

      act(() => {
        result.current.createAgent({
          sessionId: 'session-1',
          name: 'Agent 1',
          task: 'Task 1',
        });
        result.current.openPanel();
      });

      expect(Object.keys(result.current.agents).length).toBe(1);
      expect(result.current.isPanelOpen).toBe(true);

      act(() => {
        result.current.reset();
      });

      expect(Object.keys(result.current.agents).length).toBe(0);
      expect(result.current.isPanelOpen).toBe(false);
    });
  });
});
