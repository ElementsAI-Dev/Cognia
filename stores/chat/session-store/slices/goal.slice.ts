import { nanoid } from 'nanoid';
import type { SliceCreator, GoalSliceActions, ChatGoal, GoalStep } from '../types';
import type { ChatGoalStatus } from '@/types';

export const createGoalSlice: SliceCreator<GoalSliceActions> = (set, get) => ({
  setGoal: (sessionId, input) => {
    const now = new Date();
    const steps: GoalStep[] | undefined = input.steps?.map((stepInput, index) => ({
      id: nanoid(),
      content: stepInput.content,
      completed: false,
      order: index,
      createdAt: now,
    }));
    const goal: ChatGoal = {
      id: nanoid(),
      content: input.content,
      status: 'active',
      progress: input.progress ?? 0,
      steps,
      originalContent: input.originalContent,
      isPolished: input.isPolished,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === sessionId ? { ...s, goal, updatedAt: now } : s)),
    }));
    return goal;
  },

  updateGoal: (sessionId, updates) =>
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId || !s.goal) return s;
        const now = new Date();
        return {
          ...s,
          goal: {
            ...s.goal,
            ...updates,
            updatedAt: now,
            completedAt: updates.status === 'completed' ? now : s.goal.completedAt,
          },
          updatedAt: now,
        };
      }),
    })),

  clearGoal: (sessionId) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, goal: undefined, updatedAt: new Date() } : s
      ),
    })),

  completeGoal: (sessionId) =>
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId || !s.goal) return s;
        const now = new Date();
        return {
          ...s,
          goal: {
            ...s.goal,
            status: 'completed' as ChatGoalStatus,
            progress: 100,
            completedAt: now,
            updatedAt: now,
          },
          updatedAt: now,
        };
      }),
    })),

  pauseGoal: (sessionId) =>
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId || !s.goal) return s;
        const now = new Date();
        return {
          ...s,
          goal: {
            ...s.goal,
            status: 'paused' as ChatGoalStatus,
            updatedAt: now,
          },
          updatedAt: now,
        };
      }),
    })),

  resumeGoal: (sessionId) =>
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId || !s.goal) return s;
        const now = new Date();
        return {
          ...s,
          goal: {
            ...s.goal,
            status: 'active' as ChatGoalStatus,
            updatedAt: now,
          },
          updatedAt: now,
        };
      }),
    })),

  getGoal: (sessionId) => get().sessions.find((s) => s.id === sessionId)?.goal,

  addStep: (sessionId, input) => {
    const session = get().sessions.find((s) => s.id === sessionId);
    if (!session?.goal) return undefined;

    const now = new Date();
    const existingSteps = session.goal.steps || [];
    const newStep: GoalStep = {
      id: nanoid(),
      content: input.content,
      completed: false,
      order: existingSteps.length,
      createdAt: now,
    };

    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId || !s.goal) return s;
        const steps = [...(s.goal.steps || []), newStep];
        return {
          ...s,
          goal: {
            ...s.goal,
            steps,
            updatedAt: now,
          },
          updatedAt: now,
        };
      }),
    }));
    return newStep;
  },

  updateStep: (sessionId, stepId, updates) =>
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId || !s.goal?.steps) return s;
        const now = new Date();
        const steps = s.goal.steps.map((step) =>
          step.id === stepId
            ? {
                ...step,
                ...updates,
                completedAt: updates.completed ? now : step.completedAt,
              }
            : step
        );
        const completedCount = steps.filter((step) => step.completed).length;
        const progress = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;
        return {
          ...s,
          goal: {
            ...s.goal,
            steps,
            progress,
            updatedAt: now,
          },
          updatedAt: now,
        };
      }),
    })),

  removeStep: (sessionId, stepId) =>
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId || !s.goal?.steps) return s;
        const now = new Date();
        const steps = s.goal.steps
          .filter((step) => step.id !== stepId)
          .map((step, index) => ({ ...step, order: index }));
        const completedCount = steps.filter((step) => step.completed).length;
        const progress = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;
        return {
          ...s,
          goal: {
            ...s.goal,
            steps,
            progress,
            updatedAt: now,
          },
          updatedAt: now,
        };
      }),
    })),

  toggleStepComplete: (sessionId, stepId) =>
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId || !s.goal?.steps) return s;
        const now = new Date();
        const steps = s.goal.steps.map((step) =>
          step.id === stepId
            ? {
                ...step,
                completed: !step.completed,
                completedAt: !step.completed ? now : undefined,
              }
            : step
        );
        const completedCount = steps.filter((step) => step.completed).length;
        const progress = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;
        const allCompleted = steps.length > 0 && steps.every((step) => step.completed);
        return {
          ...s,
          goal: {
            ...s.goal,
            steps,
            progress,
            status: allCompleted ? 'completed' : s.goal.status,
            completedAt: allCompleted ? now : s.goal.completedAt,
            updatedAt: now,
          },
          updatedAt: now,
        };
      }),
    })),

  reorderSteps: (sessionId, stepIds) =>
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId || !s.goal?.steps) return s;
        const now = new Date();
        const stepMap = new Map(s.goal.steps.map((step) => [step.id, step]));
        const steps = stepIds
          .map((id, index) => {
            const step = stepMap.get(id);
            return step ? { ...step, order: index } : null;
          })
          .filter((step): step is GoalStep => step !== null);
        return {
          ...s,
          goal: {
            ...s.goal,
            steps,
            updatedAt: now,
          },
          updatedAt: now,
        };
      }),
    })),
});
