import { test, expect } from '@playwright/test';

/**
 * Background Agent E2E Tests
 * Tests background agent functionality for autonomous task execution
 */
test.describe('Background Agent Store', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should initialize background agent state', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface BackgroundAgentQueueState {
        items: string[];
        maxConcurrent: number;
        currentlyRunning: number;
        isPaused: boolean;
      }

      const initialState = {
        agents: {} as Record<string, object>,
        queue: {
          items: [],
          maxConcurrent: 3,
          currentlyRunning: 0,
          isPaused: false,
        } as BackgroundAgentQueueState,
        isPanelOpen: false,
        selectedAgentId: null as string | null,
      };

      return {
        noAgents: Object.keys(initialState.agents).length === 0,
        emptyQueue: initialState.queue.items.length === 0,
        maxConcurrent: initialState.queue.maxConcurrent,
        notPaused: !initialState.queue.isPaused,
        panelClosed: !initialState.isPanelOpen,
        noSelection: initialState.selectedAgentId === null,
      };
    });

    expect(result.noAgents).toBe(true);
    expect(result.emptyQueue).toBe(true);
    expect(result.maxConcurrent).toBe(3);
    expect(result.notPaused).toBe(true);
    expect(result.panelClosed).toBe(true);
    expect(result.noSelection).toBe(true);
  });

  test('should create background agent', async ({ page }) => {
    const result = await page.evaluate(() => {
      type BackgroundAgentStatus = 
        | 'idle' | 'queued' | 'initializing' | 'running' 
        | 'paused' | 'waiting' | 'completed' | 'failed' | 'cancelled' | 'timeout';

      interface BackgroundAgent {
        id: string;
        sessionId: string;
        task: string;
        status: BackgroundAgentStatus;
        progress: number;
        steps: object[];
        logs: object[];
        notifications: object[];
        subAgents: object[];
        createdAt: Date;
        startedAt?: Date;
        completedAt?: Date;
        error?: string;
      }

      const agents: Record<string, BackgroundAgent> = {};

      const createAgent = (input: { sessionId: string; task: string }): BackgroundAgent => {
        const now = new Date();
        const agent: BackgroundAgent = {
          id: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          sessionId: input.sessionId,
          task: input.task,
          status: 'idle',
          progress: 0,
          steps: [],
          logs: [],
          notifications: [],
          subAgents: [],
          createdAt: now,
        };
        agents[agent.id] = agent;
        return agent;
      };

      const agent = createAgent({
        sessionId: 'session-123',
        task: 'Analyze the codebase and generate documentation',
      });

      return {
        hasId: agent.id.startsWith('agent-'),
        sessionId: agent.sessionId,
        task: agent.task,
        status: agent.status,
        progress: agent.progress,
        agentCount: Object.keys(agents).length,
      };
    });

    expect(result.hasId).toBe(true);
    expect(result.sessionId).toBe('session-123');
    expect(result.task).toBe('Analyze the codebase and generate documentation');
    expect(result.status).toBe('idle');
    expect(result.progress).toBe(0);
    expect(result.agentCount).toBe(1);
  });

  test('should manage agent status transitions', async ({ page }) => {
    const result = await page.evaluate(() => {
      type BackgroundAgentStatus = 
        | 'idle' | 'queued' | 'initializing' | 'running' 
        | 'paused' | 'waiting' | 'completed' | 'failed' | 'cancelled';

      interface BackgroundAgent {
        id: string;
        status: BackgroundAgentStatus;
        progress: number;
        startedAt?: Date;
        completedAt?: Date;
        error?: string;
      }

      const agent: BackgroundAgent = {
        id: 'agent-1',
        status: 'idle',
        progress: 0,
      };

      const VALID_TRANSITIONS: Record<BackgroundAgentStatus, BackgroundAgentStatus[]> = {
        idle: ['queued', 'cancelled'],
        queued: ['initializing', 'cancelled'],
        initializing: ['running', 'failed', 'cancelled'],
        running: ['paused', 'waiting', 'completed', 'failed', 'cancelled'],
        paused: ['running', 'cancelled'],
        waiting: ['running', 'failed', 'cancelled'],
        completed: [],
        failed: [],
        cancelled: [],
      };

      const canTransition = (from: BackgroundAgentStatus, to: BackgroundAgentStatus): boolean => {
        return VALID_TRANSITIONS[from]?.includes(to) ?? false;
      };

      const setStatus = (status: BackgroundAgentStatus): boolean => {
        if (!canTransition(agent.status, status)) {
          return false;
        }
        agent.status = status;
        if (status === 'running' && !agent.startedAt) {
          agent.startedAt = new Date();
        }
        if (status === 'completed' || status === 'failed' || status === 'cancelled') {
          agent.completedAt = new Date();
        }
        return true;
      };

      // Test valid transitions
      const t1 = setStatus('queued');
      const t2 = setStatus('initializing');
      const t3 = setStatus('running');
      const t4 = setStatus('completed');

      // Test invalid transition
      const invalidAgent: BackgroundAgent = { id: 'agent-2', status: 'completed', progress: 100 };
      const canRestart = canTransition(invalidAgent.status, 'running');

      return {
        transition1: t1,
        transition2: t2,
        transition3: t3,
        transition4: t4,
        finalStatus: agent.status,
        hasStartedAt: !!agent.startedAt,
        hasCompletedAt: !!agent.completedAt,
        canRestartCompleted: canRestart,
      };
    });

    expect(result.transition1).toBe(true);
    expect(result.transition2).toBe(true);
    expect(result.transition3).toBe(true);
    expect(result.transition4).toBe(true);
    expect(result.finalStatus).toBe('completed');
    expect(result.hasStartedAt).toBe(true);
    expect(result.hasCompletedAt).toBe(true);
    expect(result.canRestartCompleted).toBe(false);
  });

  test('should manage agent queue', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface QueueState {
        items: string[];
        maxConcurrent: number;
        currentlyRunning: number;
        isPaused: boolean;
      }

      const queue: QueueState = {
        items: [],
        maxConcurrent: 3,
        currentlyRunning: 0,
        isPaused: false,
      };

      const queueAgent = (agentId: string) => {
        if (!queue.items.includes(agentId)) {
          queue.items.push(agentId);
        }
      };

      const _dequeueAgent = (agentId: string) => {
        const index = queue.items.indexOf(agentId);
        if (index !== -1) {
          queue.items.splice(index, 1);
        }
      };

      const canStartNext = (): boolean => {
        return !queue.isPaused && 
               queue.currentlyRunning < queue.maxConcurrent && 
               queue.items.length > 0;
      };

      const startNext = (): string | null => {
        if (!canStartNext()) return null;
        const agentId = queue.items.shift();
        if (agentId) {
          queue.currentlyRunning++;
          return agentId;
        }
        return null;
      };

      const completeAgent = () => {
        if (queue.currentlyRunning > 0) {
          queue.currentlyRunning--;
        }
      };

      // Queue agents
      queueAgent('agent-1');
      queueAgent('agent-2');
      queueAgent('agent-3');
      queueAgent('agent-4');

      const queueLengthAfterAdd = queue.items.length;

      // Start agents
      const started1 = startNext();
      const started2 = startNext();
      const runningAfterStart = queue.currentlyRunning;

      // Complete one
      completeAgent();
      const runningAfterComplete = queue.currentlyRunning;

      // Pause queue
      queue.isPaused = true;
      const canStartWhenPaused = canStartNext();

      return {
        queueLengthAfterAdd,
        started1,
        started2,
        runningAfterStart,
        runningAfterComplete,
        canStartWhenPaused,
        remainingInQueue: queue.items.length,
      };
    });

    expect(result.queueLengthAfterAdd).toBe(4);
    expect(result.started1).toBe('agent-1');
    expect(result.started2).toBe('agent-2');
    expect(result.runningAfterStart).toBe(2);
    expect(result.runningAfterComplete).toBe(1);
    expect(result.canStartWhenPaused).toBe(false);
    expect(result.remainingInQueue).toBe(2);
  });

  test('should track agent steps', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface BackgroundAgentStep {
        id: string;
        stepNumber: number;
        action: string;
        status: 'pending' | 'running' | 'completed' | 'failed';
        input?: unknown;
        output?: unknown;
        startedAt?: Date;
        completedAt?: Date;
        duration?: number;
      }

      const steps: BackgroundAgentStep[] = [];
      let stepCounter = 0;
      let idCounter = 0;

      const addStep = (action: string, input?: unknown): BackgroundAgentStep => {
        const step: BackgroundAgentStep = {
          id: `step-${++idCounter}`,
          stepNumber: ++stepCounter,
          action,
          status: 'pending',
          input,
        };
        steps.push(step);
        return step;
      };

      const updateStep = (stepId: string, updates: Partial<BackgroundAgentStep>) => {
        const step = steps.find(s => s.id === stepId);
        if (step) {
          Object.assign(step, updates);
        }
      };

      const getCompletedSteps = () => steps.filter(s => s.status === 'completed');
      const getProgress = () => {
        if (steps.length === 0) return 0;
        return (getCompletedSteps().length / steps.length) * 100;
      };

      // Add and execute steps
      const step1 = addStep('analyze_code', { path: '/src' });
      const step2 = addStep('generate_docs');
      const step3 = addStep('save_output');

      // Complete step 1
      updateStep(step1.id, { 
        status: 'completed', 
        output: { files: 10 },
        completedAt: new Date(),
        duration: 5000,
      });

      // Start step 2
      updateStep(step2.id, { status: 'running', startedAt: new Date() });

      return {
        totalSteps: steps.length,
        completedCount: getCompletedSteps().length,
        progress: getProgress(),
        step1Status: steps.find(s => s.id === step1.id)?.status,
        step2Status: steps.find(s => s.id === step2.id)?.status,
        step3Status: steps.find(s => s.id === step3.id)?.status,
      };
    });

    expect(result.totalSteps).toBe(3);
    expect(result.completedCount).toBe(1);
    expect(result.progress).toBeCloseTo(33.33, 1);
    expect(result.step1Status).toBe('completed');
    expect(result.step2Status).toBe('running');
    expect(result.step3Status).toBe('pending');
  });

  test('should manage agent logs', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface BackgroundAgentLog {
        id: string;
        timestamp: Date;
        level: 'info' | 'warn' | 'error' | 'debug' | 'success';
        source: 'agent' | 'tool' | 'system';
        message: string;
        data?: unknown;
      }

      const logs: BackgroundAgentLog[] = [];

      const addLog = (
        level: BackgroundAgentLog['level'],
        message: string,
        source: BackgroundAgentLog['source'] = 'agent',
        data?: unknown
      ) => {
        logs.push({
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          level,
          source,
          message,
          data,
        });
      };

      const getLogsByLevel = (level: BackgroundAgentLog['level']) => {
        return logs.filter(l => l.level === level);
      };

      const getLogsBySource = (source: BackgroundAgentLog['source']) => {
        return logs.filter(l => l.source === source);
      };

      // Add various logs
      addLog('info', 'Agent started', 'system');
      addLog('info', 'Analyzing codebase', 'agent');
      addLog('debug', 'Found 50 files', 'agent', { count: 50 });
      addLog('success', 'Code analysis complete', 'agent');
      addLog('warn', 'Large file detected', 'agent', { file: 'big.ts', size: 10000 });
      addLog('info', 'Tool execution started', 'tool');
      addLog('error', 'Tool failed', 'tool', { error: 'timeout' });

      return {
        totalLogs: logs.length,
        infoCount: getLogsByLevel('info').length,
        warnCount: getLogsByLevel('warn').length,
        errorCount: getLogsByLevel('error').length,
        successCount: getLogsByLevel('success').length,
        agentLogs: getLogsBySource('agent').length,
        toolLogs: getLogsBySource('tool').length,
        systemLogs: getLogsBySource('system').length,
      };
    });

    expect(result.totalLogs).toBe(7);
    expect(result.infoCount).toBe(3);
    expect(result.warnCount).toBe(1);
    expect(result.errorCount).toBe(1);
    expect(result.successCount).toBe(1);
    expect(result.agentLogs).toBe(4);
    expect(result.toolLogs).toBe(2);
    expect(result.systemLogs).toBe(1);
  });

  test('should handle agent notifications', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface BackgroundAgentNotification {
        id: string;
        timestamp: Date;
        type: 'info' | 'warning' | 'error' | 'success' | 'action_required';
        title: string;
        message: string;
        read: boolean;
        actionUrl?: string;
      }

      const notifications: BackgroundAgentNotification[] = [];

      const addNotification = (
        type: BackgroundAgentNotification['type'],
        title: string,
        message: string
      ) => {
        notifications.push({
          id: `notif-${Date.now()}`,
          timestamp: new Date(),
          type,
          title,
          message,
          read: false,
        });
      };

      const markRead = (notifId: string) => {
        const notif = notifications.find(n => n.id === notifId);
        if (notif) notif.read = true;
      };

      const markAllRead = () => {
        notifications.forEach(n => n.read = true);
      };

      const getUnreadCount = () => notifications.filter(n => !n.read).length;

      // Add notifications
      addNotification('info', 'Task Started', 'Background task has started');
      addNotification('success', 'Step Complete', 'Code analysis finished');
      addNotification('action_required', 'Approval Needed', 'Please review the generated docs');
      addNotification('warning', 'Slow Progress', 'Task is taking longer than expected');

      const unreadBefore = getUnreadCount();

      markRead(notifications[0].id);
      const unreadAfterOne = getUnreadCount();

      markAllRead();
      const unreadAfterAll = getUnreadCount();

      return {
        totalNotifications: notifications.length,
        unreadBefore,
        unreadAfterOne,
        unreadAfterAll,
        hasActionRequired: notifications.some(n => n.type === 'action_required'),
      };
    });

    expect(result.totalNotifications).toBe(4);
    expect(result.unreadBefore).toBe(4);
    expect(result.unreadAfterOne).toBe(3);
    expect(result.unreadAfterAll).toBe(0);
    expect(result.hasActionRequired).toBe(true);
  });
});

test.describe('Background Agent Performance', () => {
  test('should calculate performance stats', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface PerformanceStats {
        totalTasks: number;
        completedTasks: number;
        failedTasks: number;
        averageDuration: number;
        successRate: number;
        activeSubAgents: number;
      }

      interface AgentRecord {
        status: 'completed' | 'failed' | 'running';
        duration: number;
        subAgentCount: number;
      }

      const calculateStats = (agents: AgentRecord[]): PerformanceStats => {
        const completed = agents.filter(a => a.status === 'completed');
        const failed = agents.filter(a => a.status === 'failed');
        const running = agents.filter(a => a.status === 'running');

        const totalDuration = completed.reduce((sum, a) => sum + a.duration, 0);
        const avgDuration = completed.length > 0 ? totalDuration / completed.length : 0;

        const successRate = agents.length > 0 
          ? (completed.length / (completed.length + failed.length)) * 100 
          : 0;

        const activeSubAgents = running.reduce((sum, a) => sum + a.subAgentCount, 0);

        return {
          totalTasks: agents.length,
          completedTasks: completed.length,
          failedTasks: failed.length,
          averageDuration: avgDuration,
          successRate,
          activeSubAgents,
        };
      };

      const agents: AgentRecord[] = [
        { status: 'completed', duration: 30000, subAgentCount: 0 },
        { status: 'completed', duration: 45000, subAgentCount: 0 },
        { status: 'failed', duration: 10000, subAgentCount: 0 },
        { status: 'completed', duration: 60000, subAgentCount: 0 },
        { status: 'running', duration: 0, subAgentCount: 2 },
        { status: 'running', duration: 0, subAgentCount: 1 },
      ];

      return calculateStats(agents);
    });

    expect(result.totalTasks).toBe(6);
    expect(result.completedTasks).toBe(3);
    expect(result.failedTasks).toBe(1);
    expect(result.averageDuration).toBe(45000);
    expect(result.successRate).toBe(75);
    expect(result.activeSubAgents).toBe(3);
  });

  test('should format duration strings', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const formatDuration = (ms: number): string => {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        const mins = Math.floor(ms / 60000);
        const secs = Math.floor((ms % 60000) / 1000);
        return `${mins}m ${secs}s`;
      };

      return {
        ms: formatDuration(500),
        seconds: formatDuration(5500),
        minutes: formatDuration(125000),
        longDuration: formatDuration(3665000),
      };
    });

    expect(result.ms).toBe('500ms');
    expect(result.seconds).toBe('5.5s');
    expect(result.minutes).toBe('2m 5s');
    expect(result.longDuration).toBe('61m 5s');
  });
});

test.describe('Background Agent Panel UI', () => {
  test('should configure status display', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      type BackgroundAgentStatus = 
        | 'idle' | 'queued' | 'initializing' | 'running' 
        | 'paused' | 'waiting' | 'completed' | 'failed' | 'cancelled' | 'timeout';

      const statusConfig: Record<BackgroundAgentStatus, {
        color: string;
        label: string;
        showSpinner: boolean;
      }> = {
        idle: { color: 'text-muted-foreground', label: 'Idle', showSpinner: false },
        queued: { color: 'text-blue-500', label: 'Queued', showSpinner: false },
        initializing: { color: 'text-blue-500', label: 'Initializing', showSpinner: true },
        running: { color: 'text-primary', label: 'Running', showSpinner: true },
        paused: { color: 'text-yellow-500', label: 'Paused', showSpinner: false },
        waiting: { color: 'text-orange-500', label: 'Waiting', showSpinner: false },
        completed: { color: 'text-green-500', label: 'Completed', showSpinner: false },
        failed: { color: 'text-destructive', label: 'Failed', showSpinner: false },
        cancelled: { color: 'text-orange-500', label: 'Cancelled', showSpinner: false },
        timeout: { color: 'text-red-500', label: 'Timeout', showSpinner: false },
      };

      return {
        runningShowsSpinner: statusConfig.running.showSpinner,
        completedLabel: statusConfig.completed.label,
        failedColor: statusConfig.failed.color,
        allStatuses: Object.keys(statusConfig).length,
      };
    });

    expect(result.runningShowsSpinner).toBe(true);
    expect(result.completedLabel).toBe('Completed');
    expect(result.failedColor).toBe('text-destructive');
    expect(result.allStatuses).toBe(10);
  });
});
