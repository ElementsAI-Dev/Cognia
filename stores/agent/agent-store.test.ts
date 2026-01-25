/**
 * Tests for Agent Store
 */

import { act } from '@testing-library/react';
import {
  useAgentStore,
  selectIsAgentRunning,
  selectCurrentStep,
  selectAgentProgress,
} from './agent-store';
import type { AgentToolStatus } from '@/types/agent/tool';

describe('useAgentStore', () => {
  beforeEach(() => {
    act(() => {
      useAgentStore.getState().reset();
    });
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = useAgentStore.getState();
      expect(state.isAgentRunning).toBe(false);
      expect(state.currentStep).toBe(0);
      expect(state.totalSteps).toBe(5);
      expect(state.toolExecutions).toEqual([]);
      expect(state.currentToolId).toBeNull();
      expect(state.plans).toEqual({});
      expect(state.activePlanId).toBeNull();
    });
  });

  describe('agent lifecycle', () => {
    it('should start agent with default steps', () => {
      act(() => {
        useAgentStore.getState().startAgent();
      });

      const state = useAgentStore.getState();
      expect(state.isAgentRunning).toBe(true);
      expect(state.currentStep).toBe(0);
      expect(state.totalSteps).toBe(5);
    });

    it('should start agent with custom steps', () => {
      act(() => {
        useAgentStore.getState().startAgent(10);
      });

      expect(useAgentStore.getState().totalSteps).toBe(10);
    });

    it('should stop agent', () => {
      act(() => {
        useAgentStore.getState().startAgent();
        useAgentStore.getState().stopAgent();
      });

      expect(useAgentStore.getState().isAgentRunning).toBe(false);
      expect(useAgentStore.getState().currentToolId).toBeNull();
    });

    it('should advance to next step', () => {
      act(() => {
        useAgentStore.getState().startAgent(5);
        useAgentStore.getState().nextStep();
      });

      expect(useAgentStore.getState().currentStep).toBe(1);
    });

    it('should not exceed total steps', () => {
      act(() => {
        useAgentStore.getState().startAgent(2);
        useAgentStore.getState().nextStep();
        useAgentStore.getState().nextStep();
        useAgentStore.getState().nextStep();
      });

      expect(useAgentStore.getState().currentStep).toBe(2);
    });

    it('should set total steps', () => {
      act(() => {
        useAgentStore.getState().setTotalSteps(15);
      });

      expect(useAgentStore.getState().totalSteps).toBe(15);
    });
  });

  describe('tool execution management', () => {
    it('should add tool execution', () => {
      act(() => {
        useAgentStore.getState().addToolExecution({
          id: 'tool-1',
          toolName: 'test-tool',
          status: 'running' as AgentToolStatus,
          state: 'input-available',
          input: { arg: 'value' },
        });
      });

      const state = useAgentStore.getState();
      expect(state.toolExecutions).toHaveLength(1);
      expect(state.toolExecutions[0].id).toBe('tool-1');
      expect(state.toolExecutions[0].startedAt).toBeInstanceOf(Date);
      expect(state.currentToolId).toBe('tool-1');
    });

    it('should update tool execution', () => {
      act(() => {
        useAgentStore.getState().addToolExecution({
          id: 'tool-1',
          toolName: 'test-tool',
          status: 'running' as AgentToolStatus,
          state: 'input-available',
          input: {},
        });
      });

      act(() => {
        useAgentStore
          .getState()
          .updateToolExecution('tool-1', { status: 'completed' as AgentToolStatus });
      });

      expect(useAgentStore.getState().toolExecutions[0].status).toBe('completed');
    });

    it('should complete tool execution', () => {
      act(() => {
        useAgentStore.getState().addToolExecution({
          id: 'tool-1',
          toolName: 'test-tool',
          status: 'running' as AgentToolStatus,
          state: 'input-available',
          input: {},
        });
      });

      act(() => {
        useAgentStore.getState().completeToolExecution('tool-1', { result: 'success' });
      });

      const tool = useAgentStore.getState().toolExecutions[0];
      expect(tool.status).toBe('completed');
      expect(tool.output).toEqual({ result: 'success' });
      expect(tool.completedAt).toBeInstanceOf(Date);
      expect(useAgentStore.getState().currentToolId).toBeNull();
    });

    it('should fail tool execution', () => {
      act(() => {
        useAgentStore.getState().addToolExecution({
          id: 'tool-1',
          toolName: 'test-tool',
          status: 'running' as AgentToolStatus,
          state: 'input-available',
          input: {},
        });
      });

      act(() => {
        useAgentStore.getState().failToolExecution('tool-1', 'Tool failed');
      });

      const tool = useAgentStore.getState().toolExecutions[0];
      expect(tool.status).toBe('error');
      expect(tool.error).toBe('Tool failed');
      expect(useAgentStore.getState().currentToolId).toBeNull();
    });
  });

  describe('plan management', () => {
    it('should create a plan', () => {
      let plan;
      act(() => {
        plan = useAgentStore.getState().createPlan({
          sessionId: 'session-1',
          title: 'Test Plan',
          description: 'A test plan',
          steps: [
            { title: 'Step 1', description: 'First step' },
            { title: 'Step 2', description: 'Second step' },
          ],
        });
      });

      const state = useAgentStore.getState();
      expect(Object.keys(state.plans)).toHaveLength(1);
      expect(state.activePlanId).toBe(plan!.id);
      expect(plan!.status).toBe('draft');
      expect(plan!.steps).toHaveLength(2);
    });

    it('should update a plan', () => {
      let plan;
      act(() => {
        plan = useAgentStore.getState().createPlan({
          sessionId: 'session-1',
          title: 'Original Title',
          steps: [],
        });
      });

      act(() => {
        useAgentStore.getState().updatePlan(plan!.id, { title: 'Updated Title' });
      });

      expect(useAgentStore.getState().plans[plan!.id].title).toBe('Updated Title');
    });

    it('should delete a plan', () => {
      let plan;
      act(() => {
        plan = useAgentStore.getState().createPlan({
          sessionId: 'session-1',
          title: 'To Delete',
          steps: [],
        });
      });

      act(() => {
        useAgentStore.getState().deletePlan(plan!.id);
      });

      expect(useAgentStore.getState().plans[plan!.id]).toBeUndefined();
      expect(useAgentStore.getState().activePlanId).toBeNull();
    });

    it('should get plan by id', () => {
      let plan;
      act(() => {
        plan = useAgentStore.getState().createPlan({
          sessionId: 'session-1',
          title: 'Test',
          steps: [],
        });
      });

      expect(useAgentStore.getState().getPlan(plan!.id)).toBeDefined();
      expect(useAgentStore.getState().getPlan('non-existent')).toBeUndefined();
    });

    it('should get active plan', () => {
      act(() => {
        useAgentStore.getState().createPlan({
          sessionId: 'session-1',
          title: 'Active Plan',
          steps: [],
        });
      });

      expect(useAgentStore.getState().getActivePlan()?.title).toBe('Active Plan');
    });

    it('should get plans for session', () => {
      act(() => {
        useAgentStore.getState().createPlan({ sessionId: 'session-1', title: 'Plan 1', steps: [] });
        useAgentStore.getState().createPlan({ sessionId: 'session-1', title: 'Plan 2', steps: [] });
        useAgentStore.getState().createPlan({ sessionId: 'session-2', title: 'Plan 3', steps: [] });
      });

      const session1Plans = useAgentStore.getState().getPlansForSession('session-1');
      expect(session1Plans).toHaveLength(2);
    });
  });

  describe('plan step management', () => {
    let planId: string;

    beforeEach(() => {
      act(() => {
        const plan = useAgentStore.getState().createPlan({
          sessionId: 'session-1',
          title: 'Test Plan',
          steps: [{ title: 'Initial Step', description: 'desc' }],
        });
        planId = plan.id;
      });
    });

    it('should add plan step', () => {
      act(() => {
        useAgentStore.getState().addPlanStep(planId, { title: 'New Step', description: 'new' });
      });

      expect(useAgentStore.getState().plans[planId].steps).toHaveLength(2);
      expect(useAgentStore.getState().plans[planId].totalSteps).toBe(2);
    });

    it('should update plan step', () => {
      const stepId = useAgentStore.getState().plans[planId].steps[0].id;

      act(() => {
        useAgentStore.getState().updatePlanStep(planId, stepId, { title: 'Updated Step' });
      });

      expect(useAgentStore.getState().plans[planId].steps[0].title).toBe('Updated Step');
    });

    it('should delete plan step', () => {
      const stepId = useAgentStore.getState().plans[planId].steps[0].id;

      act(() => {
        useAgentStore.getState().deletePlanStep(planId, stepId);
      });

      expect(useAgentStore.getState().plans[planId].steps).toHaveLength(0);
    });

    it('should start plan step', () => {
      const stepId = useAgentStore.getState().plans[planId].steps[0].id;

      act(() => {
        useAgentStore.getState().startPlanStep(planId, stepId);
      });

      const step = useAgentStore.getState().plans[planId].steps[0];
      expect(step.status).toBe('in_progress');
      expect(step.startedAt).toBeInstanceOf(Date);
    });

    it('should complete plan step', () => {
      const stepId = useAgentStore.getState().plans[planId].steps[0].id;

      act(() => {
        useAgentStore.getState().startPlanStep(planId, stepId);
        useAgentStore.getState().completePlanStep(planId, stepId, 'Done');
      });

      const step = useAgentStore.getState().plans[planId].steps[0];
      expect(step.status).toBe('completed');
      expect(step.output).toBe('Done');
    });

    it('should fail plan step', () => {
      const stepId = useAgentStore.getState().plans[planId].steps[0].id;

      act(() => {
        useAgentStore.getState().failPlanStep(planId, stepId, 'Step failed');
      });

      const step = useAgentStore.getState().plans[planId].steps[0];
      expect(step.status).toBe('failed');
      expect(step.error).toBe('Step failed');
    });

    it('should skip plan step', () => {
      const stepId = useAgentStore.getState().plans[planId].steps[0].id;

      act(() => {
        useAgentStore.getState().skipPlanStep(planId, stepId);
      });

      expect(useAgentStore.getState().plans[planId].steps[0].status).toBe('skipped');
    });

    it('should reorder plan steps', () => {
      act(() => {
        useAgentStore.getState().addPlanStep(planId, { title: 'Step 2', description: '' });
        useAgentStore.getState().addPlanStep(planId, { title: 'Step 3', description: '' });
      });

      const steps = useAgentStore.getState().plans[planId].steps;
      const ids = [steps[2].id, steps[0].id, steps[1].id];

      act(() => {
        useAgentStore.getState().reorderPlanSteps(planId, ids);
      });

      const reordered = useAgentStore.getState().plans[planId].steps;
      expect(reordered[0].title).toBe('Step 3');
      expect(reordered[1].title).toBe('Initial Step');
      expect(reordered[2].title).toBe('Step 2');
    });
  });

  describe('plan execution', () => {
    let planId: string;

    beforeEach(() => {
      act(() => {
        const plan = useAgentStore.getState().createPlan({
          sessionId: 'session-1',
          title: 'Test Plan',
          steps: [{ title: 'Step 1', description: '' }],
        });
        planId = plan.id;
      });
    });

    it('should approve plan', () => {
      act(() => {
        useAgentStore.getState().approvePlan(planId);
      });

      expect(useAgentStore.getState().plans[planId].status).toBe('approved');
    });

    it('should not approve non-draft plan', () => {
      act(() => {
        useAgentStore.getState().approvePlan(planId);
        useAgentStore.getState().approvePlan(planId);
      });

      expect(useAgentStore.getState().plans[planId].status).toBe('approved');
    });

    it('should start plan execution', () => {
      act(() => {
        useAgentStore.getState().approvePlan(planId);
        useAgentStore.getState().startPlanExecution(planId);
      });

      const state = useAgentStore.getState();
      expect(state.plans[planId].status).toBe('executing');
      expect(state.isAgentRunning).toBe(true);
    });

    it('should complete plan execution', () => {
      act(() => {
        useAgentStore.getState().approvePlan(planId);
        useAgentStore.getState().startPlanExecution(planId);
        useAgentStore.getState().completePlanExecution(planId);
      });

      const state = useAgentStore.getState();
      expect(state.plans[planId].status).toBe('completed');
      expect(state.isAgentRunning).toBe(false);
    });

    it('should cancel plan execution', () => {
      act(() => {
        useAgentStore.getState().approvePlan(planId);
        useAgentStore.getState().startPlanExecution(planId);
        useAgentStore.getState().cancelPlanExecution(planId);
      });

      const state = useAgentStore.getState();
      expect(state.plans[planId].status).toBe('cancelled');
      expect(state.isAgentRunning).toBe(false);
    });
  });

  describe('selectors', () => {
    it('should select isAgentRunning', () => {
      act(() => {
        useAgentStore.getState().startAgent();
      });

      expect(selectIsAgentRunning(useAgentStore.getState())).toBe(true);
    });

    it('should select current step', () => {
      act(() => {
        useAgentStore.getState().startAgent();
        useAgentStore.getState().nextStep();
      });

      expect(selectCurrentStep(useAgentStore.getState())).toBe(1);
    });

    it('should select agent progress', () => {
      act(() => {
        useAgentStore.getState().startAgent(4);
        useAgentStore.getState().nextStep();
        useAgentStore.getState().nextStep();
      });

      expect(selectAgentProgress(useAgentStore.getState())).toBe(50);
    });

    it('should return 0 progress when totalSteps is 0', () => {
      act(() => {
        useAgentStore.getState().setTotalSteps(0);
      });

      expect(selectAgentProgress(useAgentStore.getState())).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      act(() => {
        useAgentStore.getState().startAgent(10);
        useAgentStore.getState().nextStep();
        useAgentStore.getState().createPlan({ sessionId: 's1', title: 't', steps: [] });
      });

      act(() => {
        useAgentStore.getState().reset();
      });

      const state = useAgentStore.getState();
      expect(state.isAgentRunning).toBe(false);
      expect(state.currentStep).toBe(0);
      expect(state.totalSteps).toBe(5);
      expect(state.plans).toEqual({});
    });
  });
});
