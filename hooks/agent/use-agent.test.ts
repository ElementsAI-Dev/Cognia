/**
 * Tests for useAgent hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAgent, useConfiguredAgent } from './use-agent';
import { z } from 'zod';
import { useSkillStore } from '@/stores';
import {
  buildMultiSkillSystemPrompt,
  createSkillTools,
  getAutoLoadSkillsForTools,
} from '@/lib/skills/executor';

// Mock stores
jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn((selector) => {
    const state = {
      defaultProvider: 'openai',
      providerSettings: {
        openai: {
          apiKey: 'test-api-key',
          defaultModel: 'gpt-4o',
        },
      },
    };
    return selector(state);
  }),
  useSkillStore: jest.fn((selector) => {
    const state = {
      activeSkillIds: [],
      skills: {},
    };
    return selector(state);
  }),
  useMcpStore: jest.fn((selector) => {
    const state = {
      servers: [],
      callTool: jest.fn(),
    };
    return selector(state);
  }),
  useVectorStore: jest.fn((selector) => {
    const state = {
      settings: {
        embeddingProvider: 'openai',
        defaultCollectionName: '',
      },
      collections: [],
      getCollectionNames: jest.fn(() => []),
    };
    return selector(state);
  }),
}));

jest.mock('@/stores/agent', () => ({
  useBackgroundAgentStore: jest.fn((selector) => {
    const state = {
      createAgent: jest.fn(() => ({
        id: 'bg-agent-1',
        name: 'Test Agent',
        status: 'pending',
      })),
      openPanel: jest.fn(),
    };
    return selector(state);
  }),
}));

// Mock agent functions
const mockExecuteAgent = jest.fn();
const mockExecuteAgentLoop = jest.fn();
const mockCreateAgent = jest.fn();
const mockCreateAgentLoopCancellationToken = jest.fn();
const mockUseSkillStore = useSkillStore as jest.MockedFunction<typeof useSkillStore>;
const mockBuildMultiSkillSystemPrompt =
  buildMultiSkillSystemPrompt as jest.MockedFunction<typeof buildMultiSkillSystemPrompt>;
const mockCreateSkillTools = createSkillTools as jest.MockedFunction<typeof createSkillTools>;
const mockGetAutoLoadSkillsForTools =
  getAutoLoadSkillsForTools as jest.MockedFunction<typeof getAutoLoadSkillsForTools>;

jest.mock('@/lib/ai/agent', () => ({
  executeAgent: (...args: unknown[]) => mockExecuteAgent(...args),
  executeContextAwareAgent: (...args: unknown[]) => mockExecuteAgent(...args),
  executeAgentLoop: (...args: unknown[]) => mockExecuteAgentLoop(...args),
  createAgent: (...args: unknown[]) => mockCreateAgent(...args),
  createAgentLoopCancellationToken: (...args: unknown[]) =>
    mockCreateAgentLoopCancellationToken(...args),
  createMcpToolsFromStore: jest.fn(() => ({})),
  createRAGSearchTool: jest.fn(() => ({})),
  createListRAGCollectionsTool: jest.fn(() => ({})),
  buildRAGConfigFromSettings: jest.fn(() => undefined),
  getMcpToolsWithSelection: jest.fn(() => ({ tools: {}, selection: { wasLimited: false } })),
}));

jest.mock('@/lib/skills/executor', () => ({
  buildMultiSkillSystemPrompt: jest.fn(() => ''),
  createSkillTools: jest.fn(() => ({})),
  getAutoLoadSkillsForTools: jest.fn(() => []),
}));

describe('useAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateAgentLoopCancellationToken.mockImplementation(() => ({
      cancel: jest.fn(),
      isCancelled: false,
      onCancel: jest.fn(() => () => {}),
    }));

    mockUseSkillStore.mockImplementation((selector) => {
      const state = {
        activeSkillIds: [],
        skills: {},
      };
      return selector(state as never);
    });

    mockBuildMultiSkillSystemPrompt.mockReturnValue('');
    mockCreateSkillTools.mockReturnValue({});
    mockGetAutoLoadSkillsForTools.mockReturnValue([]);
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useAgent());

      expect(result.current.isRunning).toBe(false);
      expect(result.current.currentStep).toBe(0);
      expect(result.current.error).toBeNull();
      expect(result.current.result).toBeNull();
      expect(result.current.toolCalls).toEqual([]);
    });

    it('should accept custom options', () => {
      const onStepStart = jest.fn();
      const { result } = renderHook(() =>
        useAgent({
          systemPrompt: 'Custom prompt',
          maxSteps: 5,
          temperature: 0.5,
          onStepStart,
        })
      );

      expect(result.current.isRunning).toBe(false);
    });
  });

  describe('run', () => {
    it('should execute agent and return result', async () => {
      const mockResult = {
        success: true,
        finalResponse: 'Hello!',
        steps: [],
        totalSteps: 1,
        duration: 100,
      };
      mockExecuteAgent.mockResolvedValueOnce(mockResult);

      const { result } = renderHook(() => useAgent());

      let runResult;
      await act(async () => {
        runResult = await result.current.run('Hello');
      });

      expect(runResult).toEqual(mockResult);
      expect(result.current.result).toEqual(mockResult);
      expect(result.current.isRunning).toBe(false);
    });

    it('should set isRunning during execution', async () => {
      let resolveAgent: (value: unknown) => void;
      const agentPromise = new Promise((resolve) => {
        resolveAgent = resolve;
      });
      mockExecuteAgent.mockReturnValueOnce(agentPromise);

      const { result } = renderHook(() => useAgent());

      act(() => {
        result.current.run('Hello');
      });

      await waitFor(() => {
        expect(result.current.isRunning).toBe(true);
      });

      await act(async () => {
        resolveAgent!({
          success: true,
          finalResponse: 'Done',
          steps: [],
          totalSteps: 1,
          duration: 100,
        });
        await agentPromise;
      });

      expect(result.current.isRunning).toBe(false);
    });

    it('should handle errors', async () => {
      mockExecuteAgent.mockRejectedValueOnce(new Error('Agent failed'));

      const { result } = renderHook(() => useAgent());

      await act(async () => {
        await result.current.run('Hello');
      });

      expect(result.current.error).toBe('Agent failed');
      expect(result.current.isRunning).toBe(false);
    });

    it('should set error when result is not successful', async () => {
      const mockResult = {
        success: false,
        finalResponse: '',
        steps: [],
        totalSteps: 1,
        duration: 100,
        error: 'Execution failed',
      };
      mockExecuteAgent.mockResolvedValueOnce(mockResult);

      const { result } = renderHook(() => useAgent());

      await act(async () => {
        await result.current.run('Hello');
      });

      expect(result.current.error).toBe('Execution failed');
    });
  });

  describe('runWithPlanning', () => {
    it('should execute agent loop and return result', async () => {
      const mockLoopResult = {
        success: true,
        tasks: [],
        totalSteps: 3,
        duration: 500,
        finalSummary: 'Task completed',
      };
      mockExecuteAgentLoop.mockResolvedValueOnce(mockLoopResult);

      const { result } = renderHook(() => useAgent({ enablePlanning: true }));

      let loopResult;
      await act(async () => {
        loopResult = await result.current.runWithPlanning('Complete task');
      });

      expect(loopResult).toEqual(mockLoopResult);
      expect(result.current.result).toEqual(mockLoopResult);
    });

    it('should handle loop errors', async () => {
      mockExecuteAgentLoop.mockRejectedValueOnce(new Error('Loop failed'));

      const { result } = renderHook(() => useAgent());

      await act(async () => {
        await result.current.runWithPlanning('Complete task');
      });

      expect(result.current.error).toBe('Loop failed');
    });

    it('should pass merged tools to planning execution', async () => {
      mockUseSkillStore.mockImplementation((selector) => {
        const state = {
          activeSkillIds: ['skill-1'],
          skills: {
            'skill-1': { id: 'skill-1', name: 'Skill One' },
          },
        };
        return selector(state as never);
      });

      mockCreateSkillTools.mockReturnValue({
        skill_tool: {
          name: 'skill_tool',
          description: 'Skill-backed tool',
          parameters: z.object({}),
          execute: jest.fn(),
        },
      });

      mockExecuteAgentLoop.mockResolvedValueOnce({
        success: true,
        tasks: [],
        totalSteps: 1,
        duration: 50,
      });

      const { result } = renderHook(() =>
        useAgent({
          enablePlanning: true,
          tools: {
            registered_tool: {
              name: 'registered_tool',
              description: 'Registered tool',
              parameters: z.object({}),
              execute: jest.fn(),
            },
          },
        })
      );

      await act(async () => {
        await result.current.runWithPlanning('Complete task');
      });

      expect(mockExecuteAgentLoop).toHaveBeenCalledWith(
        'Complete task',
        expect.objectContaining({
          tools: expect.objectContaining({
            skill_tool: expect.any(Object),
            registered_tool: expect.any(Object),
          }),
        })
      );
    });
  });

  describe('runInBackground', () => {
    it('should create background agent', () => {
      const { result } = renderHook(() => useAgent());

      let agent;
      act(() => {
        agent = result.current.runInBackground('Test Agent', 'Do something');
      });

      expect(agent).toBeDefined();
      expect((agent as unknown as { id: string }).id).toBe('bg-agent-1');
    });
  });

  describe('stop', () => {
    it('should stop execution', async () => {
      let resolveAgent: (value: unknown) => void;
      const agentPromise = new Promise((resolve) => {
        resolveAgent = resolve;
      });
      mockExecuteAgent.mockReturnValueOnce(agentPromise);

      const { result } = renderHook(() => useAgent());

      act(() => {
        result.current.run('Hello');
      });

      await waitFor(() => {
        expect(result.current.isRunning).toBe(true);
      });

      act(() => {
        result.current.stop();
      });

      expect(result.current.isRunning).toBe(false);
      const runConfig = mockExecuteAgent.mock.calls[0]?.[1] as { abortSignal?: AbortSignal };
      expect(runConfig?.abortSignal?.aborted).toBe(true);
      expect(mockCreateAgentLoopCancellationToken).toHaveBeenCalledTimes(1);

      // Cleanup
      await act(async () => {
        resolveAgent!({ success: true, finalResponse: '', steps: [], totalSteps: 0, duration: 0 });
      });
    });
  });

  describe('tool management', () => {
    it('should register a tool', () => {
      const { result } = renderHook(() => useAgent());

      act(() => {
        result.current.registerTool('test_tool', {
          name: 'test_tool',
          description: 'A test tool',
          parameters: z.object({}),
          execute: async () => 'result',
        });
      });

      expect(result.current.getRegisteredTools()).toContain('test_tool');
    });

    it('should unregister a tool', () => {
      const { result } = renderHook(() =>
        useAgent({
          tools: {
            existing_tool: {
              name: 'existing_tool',
              description: 'Existing tool',
              parameters: z.object({}),
              execute: async () => 'result',
            },
          },
        })
      );

      expect(result.current.getRegisteredTools()).toContain('existing_tool');

      act(() => {
        result.current.unregisterTool('existing_tool');
      });

      expect(result.current.getRegisteredTools()).not.toContain('existing_tool');
    });
  });

  describe('reset', () => {
    it('should reset all state', async () => {
      const mockResult = {
        success: true,
        finalResponse: 'Hello!',
        steps: [],
        totalSteps: 1,
        duration: 100,
      };
      mockExecuteAgent.mockResolvedValueOnce(mockResult);

      const { result } = renderHook(() => useAgent());

      await act(async () => {
        await result.current.run('Hello');
      });

      expect(result.current.result).not.toBeNull();

      act(() => {
        result.current.reset();
      });

      expect(result.current.isRunning).toBe(false);
      expect(result.current.currentStep).toBe(0);
      expect(result.current.error).toBeNull();
      expect(result.current.result).toBeNull();
      expect(result.current.toolCalls).toEqual([]);
    });
  });

  describe('getLastResponse', () => {
    it('should return finalResponse from AgentResult', async () => {
      const mockResult = {
        success: true,
        finalResponse: 'Hello World!',
        steps: [],
        totalSteps: 1,
        duration: 100,
      };
      mockExecuteAgent.mockResolvedValueOnce(mockResult);

      const { result } = renderHook(() => useAgent());

      await act(async () => {
        await result.current.run('Hello');
      });

      expect(result.current.getLastResponse()).toBe('Hello World!');
    });

    it('should return empty string when no result', () => {
      const { result } = renderHook(() => useAgent());

      expect(result.current.getLastResponse()).toBe('');
    });

    it('should return finalSummary from AgentLoopResult', async () => {
      const mockLoopResult = {
        success: true,
        tasks: [],
        totalSteps: 3,
        duration: 500,
        finalSummary: 'Task summary here',
      };
      mockExecuteAgentLoop.mockResolvedValueOnce(mockLoopResult);

      const { result } = renderHook(() => useAgent());

      await act(async () => {
        await result.current.runWithPlanning('Complete task');
      });

      expect(result.current.getLastResponse()).toBe('Task summary here');
    });

    it('should return empty string when finalSummary is undefined', async () => {
      const mockLoopResult = {
        success: true,
        tasks: [],
        totalSteps: 3,
        duration: 500,
      };
      mockExecuteAgentLoop.mockResolvedValueOnce(mockLoopResult);

      const { result } = renderHook(() => useAgent());

      await act(async () => {
        await result.current.runWithPlanning('Complete task');
      });

      expect(result.current.getLastResponse()).toBe('');
    });
  });

  describe('error handling edge cases', () => {
    it('should handle non-Error exception in run', async () => {
      mockExecuteAgent.mockRejectedValueOnce('String error');

      const { result } = renderHook(() => useAgent());

      await act(async () => {
        await result.current.run('Hello');
      });

      expect(result.current.error).toBe('Agent execution failed');
    });

    it('should handle non-Error exception in runWithPlanning', async () => {
      mockExecuteAgentLoop.mockRejectedValueOnce('String error');

      const { result } = renderHook(() => useAgent());

      await act(async () => {
        await result.current.runWithPlanning('Complete task');
      });

      expect(result.current.error).toBe('Agent loop failed');
    });

    it('should set error when runWithPlanning result is not successful', async () => {
      const mockLoopResult = {
        success: false,
        tasks: [],
        totalSteps: 1,
        duration: 100,
        error: 'Loop execution failed',
      };
      mockExecuteAgentLoop.mockResolvedValueOnce(mockLoopResult);

      const { result } = renderHook(() => useAgent());

      await act(async () => {
        await result.current.runWithPlanning('Complete task');
      });

      expect(result.current.error).toBe('Loop execution failed');
    });

    it('should use default error message when result has no error', async () => {
      const mockResult = {
        success: false,
        finalResponse: '',
        steps: [],
        totalSteps: 1,
        duration: 100,
      };
      mockExecuteAgent.mockResolvedValueOnce(mockResult);

      const { result } = renderHook(() => useAgent());

      await act(async () => {
        await result.current.run('Hello');
      });

      expect(result.current.error).toBe('Agent execution failed');
    });
  });

  describe('multiple tool registrations', () => {
    it('should register multiple tools', () => {
      const { result } = renderHook(() => useAgent());

      act(() => {
        result.current.registerTool('tool1', {
          name: 'tool1',
          description: 'Tool 1',
          parameters: z.object({}),
          execute: async () => 'result1',
        });
        result.current.registerTool('tool2', {
          name: 'tool2',
          description: 'Tool 2',
          parameters: z.object({}),
          execute: async () => 'result2',
        });
      });

      expect(result.current.getRegisteredTools()).toContain('tool1');
      expect(result.current.getRegisteredTools()).toContain('tool2');
      expect(result.current.getRegisteredTools()).toHaveLength(2);
    });

    it('should overwrite existing tool with same name', () => {
      const { result } = renderHook(() => useAgent());

      act(() => {
        result.current.registerTool('tool1', {
          name: 'tool1',
          description: 'Original',
          parameters: z.object({}),
          execute: async () => 'original',
        });
        result.current.registerTool('tool1', {
          name: 'tool1',
          description: 'Updated',
          parameters: z.object({}),
          execute: async () => 'updated',
        });
      });

      expect(result.current.getRegisteredTools()).toHaveLength(1);
    });
  });
});

describe('useConfiguredAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateAgent.mockReturnValue({
      run: jest.fn().mockResolvedValue({ success: true }),
      addTool: jest.fn(),
      removeTool: jest.fn(),
    });
  });

  it('should create a configured agent', () => {
    const tools = {
      test_tool: {
        name: 'test_tool',
        description: 'Test',
        parameters: z.object({}),
        execute: async () => 'result',
      },
    };

    const { result } = renderHook(() => useConfiguredAgent(tools));

    expect(result.current.run).toBeDefined();
    expect(result.current.addTool).toBeDefined();
    expect(result.current.removeTool).toBeDefined();
  });

  it('should run with configured settings', async () => {
    const mockRun = jest.fn().mockResolvedValue({ success: true });
    mockCreateAgent.mockReturnValue({
      run: mockRun,
      addTool: jest.fn(),
      removeTool: jest.fn(),
    });

    const { result } = renderHook(() => useConfiguredAgent({}));

    await act(async () => {
      await result.current.run('Hello');
    });

    expect(mockRun).toHaveBeenCalledWith(
      'Hello',
      expect.objectContaining({
        provider: 'openai',
        model: 'gpt-4o',
      })
    );
  });
});
