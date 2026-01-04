/**
 * Tests for usePlanExecutor hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { usePlanExecutor } from './use-plan-executor';

// Mock stores
const mockGetPlan = jest.fn();
const mockStartPlanStep = jest.fn();
const mockCompletePlanStep = jest.fn();
const mockFailPlanStep = jest.fn();
const mockCompletePlanExecution = jest.fn();
const mockCancelPlanExecution = jest.fn();
const mockGetActiveSession = jest.fn();

jest.mock('@/stores', () => ({
  useAgentStore: jest.fn((selector?) => {
    const state = {
      getPlan: mockGetPlan,
      startPlanStep: mockStartPlanStep,
      completePlanStep: mockCompletePlanStep,
      failPlanStep: mockFailPlanStep,
      completePlanExecution: mockCompletePlanExecution,
      cancelPlanExecution: mockCancelPlanExecution,
    };
    return selector ? selector(state) : state;
  }),
  useSettingsStore: jest.fn((selector?) => {
    const state = {
      providerSettings: {
        openai: {
          apiKey: 'test-api-key',
          baseURL: undefined,
        },
        ollama: {
          apiKey: '',
          baseURL: 'http://localhost:11434',
        },
      },
    };
    return selector ? selector(state) : state;
  }),
  useSessionStore: jest.fn((selector?) => {
    const state = {
      getActiveSession: mockGetActiveSession,
    };
    return selector ? selector(state) : state;
  }),
}));

// Mock AI SDK
const mockGenerateText = jest.fn();
jest.mock('ai', () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
}));

// Mock provider model
jest.mock('@/lib/ai/core/client', () => ({
  getProviderModel: jest.fn(() => ({ modelId: 'gpt-4o-mini' })),
}));

// Sample plan data
const createMockPlan = (overrides = {}) => ({
  id: 'plan-1',
  title: 'Test Plan',
  description: 'A test plan',
  status: 'active',
  steps: [
    { id: 'step-1', title: 'Step 1', description: 'First step', status: 'pending', output: null },
    { id: 'step-2', title: 'Step 2', description: 'Second step', status: 'pending', output: null },
  ],
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('usePlanExecutor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActiveSession.mockReturnValue({
      provider: 'openai',
      model: 'gpt-4o-mini',
    });
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => usePlanExecutor());

      expect(result.current.isExecuting).toBe(false);
      expect(result.current.currentStepId).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.executePlan).toBeDefined();
      expect(result.current.executeStep).toBeDefined();
      expect(result.current.stopExecution).toBeDefined();
    });
  });

  describe('executeStep', () => {
    it('should execute a single step successfully', async () => {
      const mockPlan = createMockPlan();
      mockGetPlan.mockReturnValue(mockPlan);
      mockGenerateText.mockResolvedValue({ text: 'Step result' });

      const { result } = renderHook(() => usePlanExecutor());

      let stepResult: string;
      await act(async () => {
        stepResult = await result.current.executeStep('plan-1', 'step-1');
      });

      expect(stepResult!).toBe('Step result');
      expect(mockGenerateText).toHaveBeenCalled();
    });

    it('should throw error when plan not found', async () => {
      mockGetPlan.mockReturnValue(undefined);

      const { result } = renderHook(() => usePlanExecutor());

      await expect(
        act(async () => {
          await result.current.executeStep('invalid-plan', 'step-1');
        })
      ).rejects.toThrow('Plan not found');
    });

    it('should throw error when step not found', async () => {
      const mockPlan = createMockPlan();
      mockGetPlan.mockReturnValue(mockPlan);

      const { result } = renderHook(() => usePlanExecutor());

      await expect(
        act(async () => {
          await result.current.executeStep('plan-1', 'invalid-step');
        })
      ).rejects.toThrow('Step not found');
    });

    it('should throw error when API key not configured', async () => {
      const mockPlan = createMockPlan();
      mockGetPlan.mockReturnValue(mockPlan);
      mockGetActiveSession.mockReturnValue({
        provider: 'anthropic',
        model: 'claude-3',
      });

      const { result } = renderHook(() => usePlanExecutor());

      await expect(
        act(async () => {
          await result.current.executeStep('plan-1', 'step-1');
        })
      ).rejects.toThrow('API key not configured for anthropic');
    });

    it('should not require API key for ollama provider', async () => {
      const mockPlan = createMockPlan();
      mockGetPlan.mockReturnValue(mockPlan);
      mockGetActiveSession.mockReturnValue({
        provider: 'ollama',
        model: 'llama2',
      });
      mockGenerateText.mockResolvedValue({ text: 'Ollama result' });

      const { result } = renderHook(() => usePlanExecutor());

      let stepResult: string;
      await act(async () => {
        stepResult = await result.current.executeStep('plan-1', 'step-1');
      });

      expect(stepResult!).toBe('Ollama result');
    });

    it('should include previous steps context in prompt', async () => {
      const mockPlan = createMockPlan({
        steps: [
          { id: 'step-1', title: 'Step 1', status: 'completed', output: 'Previous result' },
          { id: 'step-2', title: 'Step 2', status: 'pending', output: null },
        ],
      });
      mockGetPlan.mockReturnValue(mockPlan);
      mockGenerateText.mockResolvedValue({ text: 'New result' });

      const { result } = renderHook(() => usePlanExecutor());

      await act(async () => {
        await result.current.executeStep('plan-1', 'step-2');
      });

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('Previous result'),
        })
      );
    });

    it('should use default provider when session has no provider', async () => {
      const mockPlan = createMockPlan();
      mockGetPlan.mockReturnValue(mockPlan);
      mockGetActiveSession.mockReturnValue(null);
      mockGenerateText.mockResolvedValue({ text: 'Default provider result' });

      const { result } = renderHook(() => usePlanExecutor());

      await act(async () => {
        await result.current.executeStep('plan-1', 'step-1');
      });

      expect(mockGenerateText).toHaveBeenCalled();
    });
  });

  describe('executePlan', () => {
    it('should execute all pending steps in plan', async () => {
      const mockPlan = createMockPlan();
      mockGetPlan.mockReturnValue(mockPlan);
      mockGenerateText.mockResolvedValue({ text: 'Step completed' });

      const onStepStart = jest.fn();
      const onStepComplete = jest.fn();
      const onPlanComplete = jest.fn();

      const { result } = renderHook(() => usePlanExecutor());

      await act(async () => {
        await result.current.executePlan('plan-1', {
          onStepStart,
          onStepComplete,
          onPlanComplete,
        });
      });

      expect(onStepStart).toHaveBeenCalledTimes(2);
      expect(onStepComplete).toHaveBeenCalledTimes(2);
      expect(onPlanComplete).toHaveBeenCalledTimes(1);
      expect(mockStartPlanStep).toHaveBeenCalledTimes(2);
      expect(mockCompletePlanStep).toHaveBeenCalledTimes(2);
      expect(mockCompletePlanExecution).toHaveBeenCalledWith('plan-1');
    });

    it('should set error when plan not found', async () => {
      mockGetPlan.mockReturnValue(undefined);

      const { result } = renderHook(() => usePlanExecutor());

      await act(async () => {
        await result.current.executePlan('invalid-plan');
      });

      expect(result.current.error).toBe('Plan not found');
    });

    it('should set isExecuting during execution', async () => {
      const mockPlan = createMockPlan();
      mockGetPlan.mockReturnValue(mockPlan);

      let resolveGenerate: (value: unknown) => void;
      const generatePromise = new Promise((resolve) => {
        resolveGenerate = resolve;
      });
      mockGenerateText.mockReturnValueOnce(generatePromise);

      const { result } = renderHook(() => usePlanExecutor());

      act(() => {
        result.current.executePlan('plan-1');
      });

      await waitFor(() => {
        expect(result.current.isExecuting).toBe(true);
      });

      await act(async () => {
        resolveGenerate!({ text: 'Done' });
        mockGenerateText.mockResolvedValue({ text: 'Done' });
      });

      await waitFor(() => {
        expect(result.current.isExecuting).toBe(false);
      });
    });

    it('should update currentStepId during execution', async () => {
      const mockPlan = createMockPlan();
      mockGetPlan.mockReturnValue(mockPlan);
      mockGenerateText.mockResolvedValue({ text: 'Step completed' });

      const stepIds: (string | null)[] = [];
      const onStepStart = jest.fn();

      const { result } = renderHook(() => usePlanExecutor());

      await act(async () => {
        await result.current.executePlan('plan-1', {
          onStepStart: (step) => {
            stepIds.push(step.id);
            onStepStart(step);
          },
        });
      });

      expect(stepIds).toContain('step-1');
      expect(stepIds).toContain('step-2');
      expect(result.current.currentStepId).toBeNull();
    });

    it('should handle step execution error', async () => {
      const mockPlan = createMockPlan();
      mockGetPlan.mockReturnValue(mockPlan);
      mockGenerateText.mockRejectedValueOnce(new Error('Step failed'));

      const onStepError = jest.fn();
      const onPlanError = jest.fn();

      const { result } = renderHook(() => usePlanExecutor());

      await act(async () => {
        await result.current.executePlan('plan-1', {
          onStepError,
          onPlanError,
        });
      });

      expect(onStepError).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'step-1' }),
        'Step failed'
      );
      expect(onPlanError).toHaveBeenCalled();
      expect(mockFailPlanStep).toHaveBeenCalledWith('plan-1', 'step-1', 'Step failed');
      expect(mockCancelPlanExecution).toHaveBeenCalledWith('plan-1');
      expect(result.current.error).toBe('Step failed');
    });

    it('should handle non-Error step execution error', async () => {
      const mockPlan = createMockPlan();
      mockGetPlan.mockReturnValue(mockPlan);
      mockGenerateText.mockRejectedValueOnce('String error');

      const onStepError = jest.fn();

      const { result } = renderHook(() => usePlanExecutor());

      await act(async () => {
        await result.current.executePlan('plan-1', { onStepError });
      });

      expect(onStepError).toHaveBeenCalledWith(
        expect.anything(),
        'Step execution failed'
      );
    });

    it('should skip completed steps', async () => {
      const mockPlan = createMockPlan({
        steps: [
          { id: 'step-1', title: 'Step 1', status: 'completed', output: 'Already done' },
          { id: 'step-2', title: 'Step 2', status: 'pending', output: null },
        ],
      });
      mockGetPlan.mockReturnValue(mockPlan);
      mockGenerateText.mockResolvedValue({ text: 'Step completed' });

      const onStepStart = jest.fn();

      const { result } = renderHook(() => usePlanExecutor());

      await act(async () => {
        await result.current.executePlan('plan-1', { onStepStart });
      });

      expect(onStepStart).toHaveBeenCalledTimes(1);
      expect(onStepStart).toHaveBeenCalledWith(expect.objectContaining({ id: 'step-2' }));
    });
  });

  describe('stopExecution', () => {
    it('should stop execution', async () => {
      const mockPlan = createMockPlan();
      mockGetPlan.mockReturnValue(mockPlan);

      let resolveGenerate: (value: unknown) => void;
      const generatePromise = new Promise((resolve) => {
        resolveGenerate = resolve;
      });
      mockGenerateText.mockReturnValue(generatePromise);

      const { result } = renderHook(() => usePlanExecutor());

      act(() => {
        result.current.executePlan('plan-1');
      });

      await waitFor(() => {
        expect(result.current.isExecuting).toBe(true);
      });

      act(() => {
        result.current.stopExecution();
      });

      expect(result.current.isExecuting).toBe(false);
      expect(result.current.currentStepId).toBeNull();

      // Cleanup
      await act(async () => {
        resolveGenerate!({ text: 'Done' });
      });
    });

    it('should cancel plan execution when stopped mid-execution', async () => {
      const mockPlan = createMockPlan();
      mockGetPlan.mockReturnValue(mockPlan);

      let stepCount = 0;
      mockGenerateText.mockImplementation(async () => {
        stepCount++;
        if (stepCount === 1) {
          return { text: 'First step done' };
        }
        // Second step should not execute due to stop
        return { text: 'Second step done' };
      });

      const { result } = renderHook(() => usePlanExecutor());

      const onStepComplete = jest.fn().mockImplementation(() => {
        if (onStepComplete.mock.calls.length === 1) {
          result.current.stopExecution();
        }
      });

      await act(async () => {
        await result.current.executePlan('plan-1', { onStepComplete });
      });

      expect(mockCancelPlanExecution).toHaveBeenCalledWith('plan-1');
    });
  });

  describe('edge cases', () => {
    it('should handle plan with no pending steps', async () => {
      const mockPlan = createMockPlan({
        steps: [
          { id: 'step-1', title: 'Step 1', status: 'completed', output: 'Done' },
          { id: 'step-2', title: 'Step 2', status: 'completed', output: 'Done' },
        ],
      });
      mockGetPlan.mockReturnValue(mockPlan);

      const onPlanComplete = jest.fn();

      const { result } = renderHook(() => usePlanExecutor());

      await act(async () => {
        await result.current.executePlan('plan-1', { onPlanComplete });
      });

      expect(mockGenerateText).not.toHaveBeenCalled();
      expect(onPlanComplete).toHaveBeenCalled();
    });

    it('should handle empty steps array', async () => {
      const mockPlan = createMockPlan({ steps: [] });
      mockGetPlan.mockReturnValue(mockPlan);

      const onPlanComplete = jest.fn();

      const { result } = renderHook(() => usePlanExecutor());

      await act(async () => {
        await result.current.executePlan('plan-1', { onPlanComplete });
      });

      expect(mockGenerateText).not.toHaveBeenCalled();
      expect(onPlanComplete).toHaveBeenCalled();
    });

    it('should handle plan without description', async () => {
      const mockPlan = createMockPlan({ description: undefined });
      mockGetPlan.mockReturnValue(mockPlan);
      mockGenerateText.mockResolvedValue({ text: 'Step done' });

      const { result } = renderHook(() => usePlanExecutor());

      await act(async () => {
        await result.current.executeStep('plan-1', 'step-1');
      });

      expect(mockGenerateText).toHaveBeenCalled();
    });

    it('should handle step without description', async () => {
      const mockPlan = createMockPlan({
        steps: [
          { id: 'step-1', title: 'Step 1', status: 'pending', output: null },
        ],
      });
      mockGetPlan.mockReturnValue(mockPlan);
      mockGenerateText.mockResolvedValue({ text: 'Step done' });

      const { result } = renderHook(() => usePlanExecutor());

      await act(async () => {
        await result.current.executeStep('plan-1', 'step-1');
      });

      expect(mockGenerateText).toHaveBeenCalled();
    });
  });
});
