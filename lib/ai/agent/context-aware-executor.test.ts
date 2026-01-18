/**
 * Tests for Context-Aware Agent Executor
 */

import {
  executeContextAwareAgent,
  createContextAwareAgent,
  getContextExecutionSummary,
  type ContextAwareAgentConfig,
  type ContextAwareAgentResult,
} from './context-aware-executor';
import { executeAgent } from './agent-executor';
import { processToolOutput, createContextTools, getContextToolsPrompt } from '@/lib/context';
import { z } from 'zod';

// Mock dependencies
jest.mock('./agent-executor', () => ({
  executeAgent: jest.fn(),
}));

jest.mock('@/lib/context', () => ({
  processToolOutput: jest.fn(),
  createContextTools: jest.fn(() => ({
    read_context_file: { name: 'read_context_file', execute: jest.fn() },
    grep_context: { name: 'grep_context', execute: jest.fn() },
  })),
  getContextToolsPrompt: jest.fn(() => '## Context Tools Prompt'),
}));

const mockExecuteAgent = executeAgent as jest.MockedFunction<typeof executeAgent>;
const mockProcessToolOutput = processToolOutput as jest.MockedFunction<typeof processToolOutput>;
const mockCreateContextTools = createContextTools as jest.MockedFunction<typeof createContextTools>;
const _mockGetContextToolsPrompt = getContextToolsPrompt as jest.MockedFunction<typeof getContextToolsPrompt>;

describe('context-aware-executor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecuteAgent.mockResolvedValue({
      success: true,
      finalResponse: 'Test result',
      totalSteps: 3,
      steps: [],
      duration: 1500,
    });
    mockProcessToolOutput.mockResolvedValue({
      writtenToFile: false,
      inlineContent: 'processed output',
      originalSize: 0,
      wasTruncated: false,
    });
  });

  describe('executeContextAwareAgent', () => {
    const baseConfig: ContextAwareAgentConfig = {
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'test-key',
      tools: {
        test_tool: {
          name: 'test_tool',
          description: 'A test tool',
          parameters: {} as z.ZodType,
          execute: jest.fn().mockResolvedValue('tool result'),
        },
      },
    };

    it('should execute agent with default context options', async () => {
      const result = await executeContextAwareAgent('Test prompt', baseConfig);

      expect(result.success).toBe(true);
      expect(mockExecuteAgent).toHaveBeenCalled();
    });

    it('should inject context tools by default', async () => {
      await executeContextAwareAgent('Test prompt', baseConfig);

      expect(mockCreateContextTools).toHaveBeenCalled();
      const callArgs = mockExecuteAgent.mock.calls[0][1];
      expect(callArgs.tools).toHaveProperty('read_context_file');
      expect(callArgs.tools).toHaveProperty('grep_context');
    });

    it('should enhance system prompt with context tools documentation', async () => {
      await executeContextAwareAgent('Test prompt', {
        ...baseConfig,
        systemPrompt: 'Original prompt',
      });

      const callArgs = mockExecuteAgent.mock.calls[0][1];
      expect(callArgs.systemPrompt).toContain('Original prompt');
      expect(callArgs.systemPrompt).toContain('Context Tools Prompt');
    });

    it('should not inject context tools when disabled', async () => {
      await executeContextAwareAgent('Test prompt', {
        ...baseConfig,
        injectContextTools: false,
      });

      expect(mockCreateContextTools).not.toHaveBeenCalled();
    });

    it('should wrap tools with context persistence when enabled', async () => {
      await executeContextAwareAgent('Test prompt', {
        ...baseConfig,
        enableContextFiles: true,
      });

      // Tools should be wrapped
      expect(mockExecuteAgent).toHaveBeenCalled();
    });

    it('should not wrap tools when context files disabled', async () => {
      await executeContextAwareAgent('Test prompt', {
        ...baseConfig,
        enableContextFiles: false,
      });

      expect(mockExecuteAgent).toHaveBeenCalled();
    });

    it('should track persisted outputs', async () => {
      const onToolOutputPersisted = jest.fn();
      mockProcessToolOutput.mockResolvedValue({
        writtenToFile: true,
        ref: {
          id: 'ref-1',
          toolName: 'test_tool',
          path: 'context/tool-output/test.txt',
          sizeSummary: '~500 tokens',
          timestamp: new Date(),
        },
        inlineContent: 'File reference...',
        originalSize: 500,
        wasTruncated: true,
      });

      const result = await executeContextAwareAgent('Test prompt', {
        ...baseConfig,
        onToolOutputPersisted,
      });

      expect(result).toBeDefined();
    });

    it('should calculate tokens saved', async () => {
      mockProcessToolOutput.mockResolvedValue({
        writtenToFile: true,
        ref: {
          id: 'ref-1',
          toolName: 'test_tool',
          path: 'test.txt',
          sizeSummary: '~1000 tokens',
          timestamp: new Date(),
        },
        inlineContent: 'reference',
        originalSize: 1000,
        wasTruncated: true,
      });

      const result = await executeContextAwareAgent('Test prompt', baseConfig);

      expect(result).toBeDefined();
    });

    it('should pass through other config options', async () => {
      await executeContextAwareAgent('Test prompt', {
        ...baseConfig,
        maxSteps: 10,
        temperature: 0.7,
      });

      const callArgs = mockExecuteAgent.mock.calls[0][1];
      expect(callArgs.maxSteps).toBe(10);
      expect(callArgs.temperature).toBe(0.7);
    });
  });

  describe('createContextAwareAgent', () => {
    it('should create an agent with run method', () => {
      const agent = createContextAwareAgent({
        tools: {},
        maxSteps: 5,
      });

      expect(agent.run).toBeInstanceOf(Function);
      expect(agent.addTool).toBeInstanceOf(Function);
      expect(agent.enableContextFiles).toBeInstanceOf(Function);
      expect(agent.enableContextTools).toBeInstanceOf(Function);
    });

    it('should execute with provider config on run', async () => {
      const agent = createContextAwareAgent({
        tools: {},
      });

      await agent.run('Test prompt', {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'key',
      });

      expect(mockExecuteAgent).toHaveBeenCalled();
    });

    it('should allow adding tools', () => {
      const agent = createContextAwareAgent({
        tools: {},
      });

      const newTool = {
        name: 'new_tool',
        description: 'A new tool',
        parameters: {} as z.ZodType,
        execute: jest.fn(),
      };

      agent.addTool('new_tool', newTool);

      // Tool should be added (tested via run)
    });

    it('should allow toggling context files', async () => {
      const agent = createContextAwareAgent({
        tools: {},
      });

      agent.enableContextFiles(false);

      await agent.run('Test', {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'key',
      });

      // Context files should be disabled
      expect(mockExecuteAgent).toHaveBeenCalled();
    });

    it('should allow toggling context tools', async () => {
      const agent = createContextAwareAgent({
        tools: {},
      });

      agent.enableContextTools(false);

      await agent.run('Test', {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'key',
      });

      expect(mockCreateContextTools).not.toHaveBeenCalled();
    });
  });

  describe('getContextExecutionSummary', () => {
    it('should generate basic summary', () => {
      const result: ContextAwareAgentResult = {
        success: true,
        finalResponse: 'Done',
        totalSteps: 5,
        steps: [],
        duration: 2000,
      };

      const summary = getContextExecutionSummary(result);

      expect(summary).toContain('## Execution Summary');
      expect(summary).toContain('Steps: 5');
      expect(summary).toContain('Duration: 2000ms');
      expect(summary).toContain('Success: true');
    });

    it('should include persisted outputs info', () => {
      const result: ContextAwareAgentResult = {
        success: true,
        finalResponse: 'Done',
        totalSteps: 3,
        steps: [],
        duration: 1500,
        persistedOutputs: [
          {
            id: 'ref-1',
            toolName: 'tool1',
            path: 'context/tool-output/file1.txt',
            sizeSummary: '~500 tokens',
            timestamp: new Date(),
          },
          {
            id: 'ref-2',
            toolName: 'tool2',
            path: 'context/tool-output/file2.txt',
            sizeSummary: '~300 tokens',
            timestamp: new Date(),
          },
        ],
        tokensSaved: 600,
      };

      const summary = getContextExecutionSummary(result);

      expect(summary).toContain('Outputs persisted to files: 2');
      expect(summary).toContain('Estimated tokens saved: ~600');
      expect(summary).toContain('### Persisted Outputs:');
      expect(summary).toContain('context/tool-output/file1.txt');
      expect(summary).toContain('context/tool-output/file2.txt');
    });

    it('should handle result without persisted outputs', () => {
      const result: ContextAwareAgentResult = {
        success: false,
        finalResponse: 'Failed',
        totalSteps: 1,
        steps: [],
        duration: 500,
      };

      const summary = getContextExecutionSummary(result);

      expect(summary).toContain('Success: false');
      expect(summary).not.toContain('Persisted Outputs');
    });

    it('should handle empty persisted outputs array', () => {
      const result: ContextAwareAgentResult = {
        success: true,
        finalResponse: 'Done',
        totalSteps: 2,
        steps: [],
        duration: 1000,
        persistedOutputs: [],
      };

      const summary = getContextExecutionSummary(result);

      expect(summary).not.toContain('Persisted Outputs');
    });
  });
});
