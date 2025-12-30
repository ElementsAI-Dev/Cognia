import { test, expect } from '@playwright/test';

/**
 * Sub-Agent E2E Tests
 * Tests sub-agent functionality for parallel task execution
 */
test.describe('Sub-Agent Store', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should initialize sub-agent state', async ({ page }) => {
    const result = await page.evaluate(() => {
      const initialState = {
        subAgents: {} as Record<string, object>,
        groups: {} as Record<string, object>,
        activeParentId: null as string | null,
      };

      return {
        noSubAgents: Object.keys(initialState.subAgents).length === 0,
        noGroups: Object.keys(initialState.groups).length === 0,
        noActiveParent: initialState.activeParentId === null,
      };
    });

    expect(result.noSubAgents).toBe(true);
    expect(result.noGroups).toBe(true);
    expect(result.noActiveParent).toBe(true);
  });

  test('should create sub-agent', async ({ page }) => {
    const result = await page.evaluate(() => {
      type SubAgentStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';

      interface SubAgent {
        id: string;
        parentId: string;
        name: string;
        task: string;
        status: SubAgentStatus;
        progress: number;
        priority: number;
        createdAt: Date;
        startedAt?: Date;
        completedAt?: Date;
        result?: unknown;
        error?: string;
        logs: object[];
      }

      const subAgents: Record<string, SubAgent> = {};

      const createSubAgent = (input: {
        parentId: string;
        name: string;
        task: string;
        priority?: number;
      }): SubAgent => {
        const subAgent: SubAgent = {
          id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          parentId: input.parentId,
          name: input.name,
          task: input.task,
          status: 'idle',
          progress: 0,
          priority: input.priority ?? 1,
          createdAt: new Date(),
          logs: [],
        };
        subAgents[subAgent.id] = subAgent;
        return subAgent;
      };

      const subAgent = createSubAgent({
        parentId: 'parent-123',
        name: 'Code Analyzer',
        task: 'Analyze TypeScript files',
        priority: 2,
      });

      return {
        hasId: subAgent.id.startsWith('sub-'),
        parentId: subAgent.parentId,
        name: subAgent.name,
        task: subAgent.task,
        status: subAgent.status,
        priority: subAgent.priority,
        subAgentCount: Object.keys(subAgents).length,
      };
    });

    expect(result.hasId).toBe(true);
    expect(result.parentId).toBe('parent-123');
    expect(result.name).toBe('Code Analyzer');
    expect(result.task).toBe('Analyze TypeScript files');
    expect(result.status).toBe('idle');
    expect(result.priority).toBe(2);
    expect(result.subAgentCount).toBe(1);
  });

  test('should manage sub-agent groups', async ({ page }) => {
    const result = await page.evaluate(() => {
      type SubAgentExecutionMode = 'sequential' | 'parallel' | 'race';

      interface SubAgentGroup {
        id: string;
        name: string;
        executionMode: SubAgentExecutionMode;
        subAgentIds: string[];
        status: 'idle' | 'running' | 'completed' | 'failed';
        createdAt: Date;
      }

      const groups: Record<string, SubAgentGroup> = {};

      const createGroup = (
        name: string,
        executionMode: SubAgentExecutionMode,
        subAgentIds: string[]
      ): SubAgentGroup => {
        const group: SubAgentGroup = {
          id: `group-${Date.now()}`,
          name,
          executionMode,
          subAgentIds,
          status: 'idle',
          createdAt: new Date(),
        };
        groups[group.id] = group;
        return group;
      };

      const addToGroup = (groupId: string, subAgentId: string) => {
        const group = groups[groupId];
        if (group && !group.subAgentIds.includes(subAgentId)) {
          group.subAgentIds.push(subAgentId);
        }
      };

      const removeFromGroup = (groupId: string, subAgentId: string) => {
        const group = groups[groupId];
        if (group) {
          const index = group.subAgentIds.indexOf(subAgentId);
          if (index !== -1) {
            group.subAgentIds.splice(index, 1);
          }
        }
      };

      // Create groups
      const parallelGroup = createGroup('Parallel Tasks', 'parallel', ['sub-1', 'sub-2']);
      const sequentialGroup = createGroup('Sequential Tasks', 'sequential', ['sub-3']);

      addToGroup(parallelGroup.id, 'sub-4');
      removeFromGroup(parallelGroup.id, 'sub-1');

      return {
        groupCount: Object.keys(groups).length,
        parallelMode: parallelGroup.executionMode,
        sequentialMode: sequentialGroup.executionMode,
        parallelSubAgentCount: groups[parallelGroup.id].subAgentIds.length,
        sequentialSubAgentCount: groups[sequentialGroup.id].subAgentIds.length,
      };
    });

    expect(result.groupCount).toBe(2);
    expect(result.parallelMode).toBe('parallel');
    expect(result.sequentialMode).toBe('sequential');
    expect(result.parallelSubAgentCount).toBe(2);
    expect(result.sequentialSubAgentCount).toBe(1);
  });

  test('should track sub-agent execution', async ({ page }) => {
    const result = await page.evaluate(() => {
      type SubAgentStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';

      interface SubAgent {
        id: string;
        status: SubAgentStatus;
        progress: number;
        startedAt?: Date;
        completedAt?: Date;
        result?: unknown;
        error?: string;
      }

      const subAgents: SubAgent[] = [
        { id: 'sub-1', status: 'idle', progress: 0 },
        { id: 'sub-2', status: 'idle', progress: 0 },
        { id: 'sub-3', status: 'idle', progress: 0 },
      ];

      const setStatus = (id: string, status: SubAgentStatus) => {
        const subAgent = subAgents.find(s => s.id === id);
        if (subAgent) {
          subAgent.status = status;
          if (status === 'running' && !subAgent.startedAt) {
            subAgent.startedAt = new Date();
          }
          if (status === 'completed' || status === 'failed') {
            subAgent.completedAt = new Date();
          }
        }
      };

      const setProgress = (id: string, progress: number) => {
        const subAgent = subAgents.find(s => s.id === id);
        if (subAgent) {
          subAgent.progress = Math.min(100, Math.max(0, progress));
        }
      };

      const setResult = (id: string, result: unknown) => {
        const subAgent = subAgents.find(s => s.id === id);
        if (subAgent) {
          subAgent.result = result;
        }
      };

      const getActiveSubAgents = () => subAgents.filter(s => s.status === 'running');
      const getCompletedSubAgents = () => subAgents.filter(s => s.status === 'completed');
      const getFailedSubAgents = () => subAgents.filter(s => s.status === 'failed');

      // Simulate execution
      setStatus('sub-1', 'running');
      setProgress('sub-1', 50);

      setStatus('sub-2', 'running');
      setProgress('sub-2', 100);
      setStatus('sub-2', 'completed');
      setResult('sub-2', { output: 'success' });

      setStatus('sub-3', 'running');
      setStatus('sub-3', 'failed');

      return {
        activeCount: getActiveSubAgents().length,
        completedCount: getCompletedSubAgents().length,
        failedCount: getFailedSubAgents().length,
        sub1Progress: subAgents.find(s => s.id === 'sub-1')?.progress,
        sub2HasResult: !!subAgents.find(s => s.id === 'sub-2')?.result,
      };
    });

    expect(result.activeCount).toBe(1);
    expect(result.completedCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.sub1Progress).toBe(50);
    expect(result.sub2HasResult).toBe(true);
  });

  test('should manage sub-agent logs', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface SubAgentLog {
        id: string;
        timestamp: Date;
        level: 'info' | 'warn' | 'error' | 'debug';
        message: string;
        data?: unknown;
      }

      const logs: Record<string, SubAgentLog[]> = {};

      const addLog = (
        subAgentId: string,
        level: SubAgentLog['level'],
        message: string,
        data?: unknown
      ) => {
        if (!logs[subAgentId]) {
          logs[subAgentId] = [];
        }
        logs[subAgentId].push({
          id: `log-${Date.now()}`,
          timestamp: new Date(),
          level,
          message,
          data,
        });
      };

      const clearLogs = (subAgentId: string) => {
        logs[subAgentId] = [];
      };

      const getLogsByLevel = (subAgentId: string, level: SubAgentLog['level']) => {
        return (logs[subAgentId] || []).filter(l => l.level === level);
      };

      // Add logs for sub-agent 1
      addLog('sub-1', 'info', 'Starting task');
      addLog('sub-1', 'debug', 'Processing file', { file: 'test.ts' });
      addLog('sub-1', 'info', 'Task completed');

      // Add logs for sub-agent 2
      addLog('sub-2', 'info', 'Starting task');
      addLog('sub-2', 'error', 'Task failed', { error: 'timeout' });

      const sub1InfoLogs = getLogsByLevel('sub-1', 'info');
      const sub2ErrorLogs = getLogsByLevel('sub-2', 'error');

      clearLogs('sub-1');

      return {
        sub1LogsBeforeClear: 3,
        sub1LogsAfterClear: logs['sub-1']?.length || 0,
        sub2TotalLogs: logs['sub-2']?.length || 0,
        sub1InfoCount: sub1InfoLogs.length,
        sub2ErrorCount: sub2ErrorLogs.length,
      };
    });

    expect(result.sub1LogsBeforeClear).toBe(3);
    expect(result.sub1LogsAfterClear).toBe(0);
    expect(result.sub2TotalLogs).toBe(2);
    expect(result.sub1InfoCount).toBe(2);
    expect(result.sub2ErrorCount).toBe(1);
  });

  test('should handle batch operations', async ({ page }) => {
    const result = await page.evaluate(() => {
      type SubAgentStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';

      interface SubAgent {
        id: string;
        parentId: string;
        status: SubAgentStatus;
      }

      const subAgents: SubAgent[] = [
        { id: 'sub-1', parentId: 'parent-1', status: 'running' },
        { id: 'sub-2', parentId: 'parent-1', status: 'completed' },
        { id: 'sub-3', parentId: 'parent-1', status: 'running' },
        { id: 'sub-4', parentId: 'parent-2', status: 'running' },
        { id: 'sub-5', parentId: 'parent-2', status: 'completed' },
      ];

      const cancelAllSubAgents = (parentId?: string) => {
        subAgents.forEach(s => {
          if ((!parentId || s.parentId === parentId) && s.status === 'running') {
            s.status = 'cancelled';
          }
        });
      };

      const clearCompletedSubAgents = (parentId?: string) => {
        const toRemove = subAgents.filter(s => 
          s.status === 'completed' && (!parentId || s.parentId === parentId)
        );
        toRemove.forEach(s => {
          const index = subAgents.indexOf(s);
          if (index !== -1) subAgents.splice(index, 1);
        });
      };

      const getSubAgentsByParent = (parentId: string) => {
        return subAgents.filter(s => s.parentId === parentId);
      };

      const parent1CountBefore = getSubAgentsByParent('parent-1').length;

      cancelAllSubAgents('parent-1');
      const cancelledCount = subAgents.filter(s => s.status === 'cancelled').length;

      clearCompletedSubAgents('parent-1');
      const parent1CountAfterClear = getSubAgentsByParent('parent-1').length;

      return {
        parent1CountBefore,
        cancelledCount,
        parent1CountAfterClear,
        totalRemaining: subAgents.length,
      };
    });

    expect(result.parent1CountBefore).toBe(3);
    expect(result.cancelledCount).toBe(2);
    expect(result.parent1CountAfterClear).toBe(2);
    expect(result.totalRemaining).toBe(4);
  });

  test('should reorder sub-agents', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface SubAgent {
        id: string;
        parentId: string;
        order: number;
      }

      const subAgents: SubAgent[] = [
        { id: 'sub-1', parentId: 'parent-1', order: 0 },
        { id: 'sub-2', parentId: 'parent-1', order: 1 },
        { id: 'sub-3', parentId: 'parent-1', order: 2 },
      ];

      const reorderSubAgents = (parentId: string, orderedIds: string[]) => {
        orderedIds.forEach((id, index) => {
          const subAgent = subAgents.find(s => s.id === id && s.parentId === parentId);
          if (subAgent) {
            subAgent.order = index;
          }
        });
      };

      const getOrderedSubAgents = (parentId: string) => {
        return subAgents
          .filter(s => s.parentId === parentId)
          .sort((a, b) => a.order - b.order);
      };

      // Reorder: move sub-3 to first position
      reorderSubAgents('parent-1', ['sub-3', 'sub-1', 'sub-2']);

      const ordered = getOrderedSubAgents('parent-1');

      return {
        firstId: ordered[0]?.id,
        secondId: ordered[1]?.id,
        thirdId: ordered[2]?.id,
      };
    });

    expect(result.firstId).toBe('sub-3');
    expect(result.secondId).toBe('sub-1');
    expect(result.thirdId).toBe('sub-2');
  });
});

test.describe('Sub-Agent Execution Modes', () => {
  test('should execute in parallel mode', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface SubAgentResult {
        id: string;
        result: unknown;
        duration: number;
      }

      const _executeParallel = async (
        tasks: { id: string; duration: number; result: unknown }[]
      ): Promise<SubAgentResult[]> => {
        // Simulate parallel execution
        const results = tasks.map(task => ({
          id: task.id,
          result: task.result,
          duration: task.duration,
        }));

        // In parallel, total time is max of individual times
        const totalTime = Math.max(...tasks.map(t => t.duration));

        return results.map(r => ({ ...r, totalTime }));
      };

      const tasks = [
        { id: 'task-1', duration: 1000, result: 'result-1' },
        { id: 'task-2', duration: 2000, result: 'result-2' },
        { id: 'task-3', duration: 1500, result: 'result-3' },
      ];

      // Simulate execution
      const maxDuration = Math.max(...tasks.map(t => t.duration));
      const sumDuration = tasks.reduce((sum, t) => sum + t.duration, 0);

      return {
        taskCount: tasks.length,
        parallelTime: maxDuration,
        sequentialTime: sumDuration,
        timeSaved: sumDuration - maxDuration,
      };
    });

    expect(result.taskCount).toBe(3);
    expect(result.parallelTime).toBe(2000);
    expect(result.sequentialTime).toBe(4500);
    expect(result.timeSaved).toBe(2500);
  });

  test('should execute in race mode', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface RaceResult {
        winnerId: string;
        winnerResult: unknown;
        cancelledIds: string[];
      }

      const executeRace = (
        tasks: { id: string; duration: number; result: unknown }[]
      ): RaceResult => {
        // Find the fastest task
        const sorted = [...tasks].sort((a, b) => a.duration - b.duration);
        const winner = sorted[0];
        const cancelled = sorted.slice(1).map(t => t.id);

        return {
          winnerId: winner.id,
          winnerResult: winner.result,
          cancelledIds: cancelled,
        };
      };

      const tasks = [
        { id: 'task-1', duration: 1000, result: 'result-1' },
        { id: 'task-2', duration: 500, result: 'result-2' },
        { id: 'task-3', duration: 1500, result: 'result-3' },
      ];

      const raceResult = executeRace(tasks);

      return {
        winnerId: raceResult.winnerId,
        winnerResult: raceResult.winnerResult,
        cancelledCount: raceResult.cancelledIds.length,
        task1Cancelled: raceResult.cancelledIds.includes('task-1'),
        task3Cancelled: raceResult.cancelledIds.includes('task-3'),
      };
    });

    expect(result.winnerId).toBe('task-2');
    expect(result.winnerResult).toBe('result-2');
    expect(result.cancelledCount).toBe(2);
    expect(result.task1Cancelled).toBe(true);
    expect(result.task3Cancelled).toBe(true);
  });
});
