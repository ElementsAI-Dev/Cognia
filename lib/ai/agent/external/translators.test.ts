/**
 * @jest-environment jsdom
 */

/**
 * Tests for Protocol Translators
 */

import {
  textToExternalMessage,
  externalMessageToText,
  extractToolUses,
  extractToolResults,
  acpToolToAgentTool,
  acpToolsToAgentTools,
  toolCallToExternal,
  externalToolUseToToolCall,
  externalResultToSubAgentResult,
  externalTokenUsageToSubAgent,
  subAgentResultToExternal,
  extractResponseFromEvents,
  extractThinkingFromEvents,
  extractToolCallsFromEvents,
  eventsToSteps,
  formatPermissionRequest,
  createTextContent,
  createToolUseContent,
  createToolResultContent,
  hasToolUse,
  hasToolResult,
  getPrimaryText,
} from './translators';
import type {
  ExternalAgentMessage,
  ExternalAgentEvent,
  ExternalAgentResult,
  AcpToolInfo,
  AcpPermissionRequest,
} from '@/types/agent/external-agent';
import type { SubAgentResult } from '@/types/agent/sub-agent';
import type { ToolCall } from '@/lib/ai/agent';

// ============================================================================
// Message Translators Tests
// ============================================================================

describe('Message Translators', () => {
  describe('textToExternalMessage', () => {
    it('should create a user message from text', () => {
      const message = textToExternalMessage('Hello, world!');

      expect(message.role).toBe('user');
      expect(message.content).toHaveLength(1);
      expect(message.content[0]).toEqual({ type: 'text', text: 'Hello, world!' });
      expect(message.id).toMatch(/^msg_/);
      expect(message.timestamp).toBeInstanceOf(Date);
    });

    it('should create an assistant message when specified', () => {
      const message = textToExternalMessage('Response text', 'assistant');

      expect(message.role).toBe('assistant');
      expect(message.content[0]).toEqual({ type: 'text', text: 'Response text' });
    });

    it('should create a system message when specified', () => {
      const message = textToExternalMessage('System prompt', 'system');

      expect(message.role).toBe('system');
      expect(message.content[0]).toEqual({ type: 'text', text: 'System prompt' });
    });
  });

  describe('externalMessageToText', () => {
    it('should extract text from message content', () => {
      const message: ExternalAgentMessage = {
        id: 'msg_1',
        role: 'assistant',
        content: [
          { type: 'text', text: 'First line' },
          { type: 'text', text: 'Second line' },
        ],
        timestamp: new Date(),
      };

      const text = externalMessageToText(message);
      expect(text).toBe('First line\nSecond line');
    });

    it('should return empty string for non-text content', () => {
      const message: ExternalAgentMessage = {
        id: 'msg_1',
        role: 'assistant',
        content: [{ type: 'tool_use', id: 'tool_1', name: 'test', input: {}, status: 'pending' }],
        timestamp: new Date(),
      };

      const text = externalMessageToText(message);
      expect(text).toBe('');
    });

    it('should filter out non-text content', () => {
      const message: ExternalAgentMessage = {
        id: 'msg_1',
        role: 'assistant',
        content: [
          { type: 'text', text: 'Text content' },
          { type: 'tool_use', id: 'tool_1', name: 'test', input: {}, status: 'pending' },
        ],
        timestamp: new Date(),
      };

      const text = externalMessageToText(message);
      expect(text).toBe('Text content');
    });
  });

  describe('extractToolUses', () => {
    it('should extract tool use content', () => {
      const message: ExternalAgentMessage = {
        id: 'msg_1',
        role: 'assistant',
        content: [
          { type: 'text', text: 'Using tool' },
          { type: 'tool_use', id: 'tool_1', name: 'test_tool', input: { arg: 'value' }, status: 'pending' },
          { type: 'tool_use', id: 'tool_2', name: 'other_tool', input: {}, status: 'completed' },
        ],
        timestamp: new Date(),
      };

      const toolUses = extractToolUses(message);
      expect(toolUses).toHaveLength(2);
      expect(toolUses[0].name).toBe('test_tool');
      expect(toolUses[1].name).toBe('other_tool');
    });

    it('should return empty array when no tool uses', () => {
      const message: ExternalAgentMessage = {
        id: 'msg_1',
        role: 'user',
        content: [{ type: 'text', text: 'No tools here' }],
        timestamp: new Date(),
      };

      const toolUses = extractToolUses(message);
      expect(toolUses).toHaveLength(0);
    });
  });

  describe('extractToolResults', () => {
    it('should extract tool result content', () => {
      const message: ExternalAgentMessage = {
        id: 'msg_1',
        role: 'user',
        content: [
          { type: 'tool_result', toolUseId: 'tool_1', content: 'Result 1', isError: false },
          { type: 'tool_result', toolUseId: 'tool_2', content: 'Error', isError: true },
        ],
        timestamp: new Date(),
      };

      const results = extractToolResults(message);
      expect(results).toHaveLength(2);
      expect(results[0].toolUseId).toBe('tool_1');
      expect(results[1].isError).toBe(true);
    });
  });
});

// ============================================================================
// Tool Translators Tests
// ============================================================================

describe('Tool Translators', () => {
  describe('acpToolToAgentTool', () => {
    it('should convert AcpToolInfo to AgentTool', async () => {
      const acpTool: AcpToolInfo = {
        id: 'tool_1',
        name: 'test_tool',
        description: 'A test tool',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name parameter' },
            count: { type: 'number' },
          },
          required: ['name'],
        },
        requiresPermission: true,
      };

      const executeCallback = jest.fn().mockResolvedValue('result');
      const agentTool = acpToolToAgentTool(acpTool, executeCallback);

      expect(agentTool.name).toBe('test_tool');
      expect(agentTool.description).toBe('A test tool');
      expect(agentTool.requiresApproval).toBe(true);

      // Test execution
      await agentTool.execute({ name: 'test', count: 5 });
      expect(executeCallback).toHaveBeenCalledWith('tool_1', 'test_tool', { name: 'test', count: 5 });
    });

    it('should handle tool without description', () => {
      const acpTool: AcpToolInfo = {
        id: 'tool_1',
        name: 'unnamed_tool',
        parameters: {},
      };

      const executeCallback = jest.fn();
      const agentTool = acpToolToAgentTool(acpTool, executeCallback);

      expect(agentTool.description).toBe('External tool: unnamed_tool');
    });
  });

  describe('acpToolsToAgentTools', () => {
    it('should convert multiple tools with external_ prefix', () => {
      const tools: AcpToolInfo[] = [
        { id: '1', name: 'tool_a', description: 'Tool A', parameters: {} },
        { id: '2', name: 'tool_b', description: 'Tool B', parameters: {} },
      ];

      const executeCallback = jest.fn();
      const agentTools = acpToolsToAgentTools(tools, executeCallback);

      expect(Object.keys(agentTools)).toEqual(['external_tool_a', 'external_tool_b']);
      expect(agentTools['external_tool_a'].name).toBe('tool_a');
    });
  });

  describe('toolCallToExternal', () => {
    it('should convert ToolCall to external format', () => {
      const toolCall: ToolCall = {
        id: 'call_1',
        name: 'my_tool',
        args: { key: 'value' },
        status: 'completed',
      };

      const external = toolCallToExternal(toolCall);

      expect(external.type).toBe('tool_use');
      expect(external.id).toBe('call_1');
      expect(external.name).toBe('my_tool');
      expect(external.input).toEqual({ key: 'value' });
      expect(external.status).toBe('completed');
    });

    it('should handle error status', () => {
      const toolCall: ToolCall = {
        id: 'call_1',
        name: 'my_tool',
        args: {},
        status: 'error',
      };

      const external = toolCallToExternal(toolCall);
      expect(external.status).toBe('error');
    });

    it('should handle pending status', () => {
      const toolCall: ToolCall = {
        id: 'call_1',
        name: 'my_tool',
        args: {},
        status: 'pending',
      };

      const external = toolCallToExternal(toolCall);
      expect(external.status).toBe('pending');
    });
  });

  describe('externalToolUseToToolCall', () => {
    it('should convert external tool use to ToolCall', () => {
      const toolUse = {
        type: 'tool_use' as const,
        id: 'ext_1',
        name: 'external_tool',
        input: { param: 123 },
        status: 'completed' as const,
      };

      const toolCall = externalToolUseToToolCall(toolUse);

      expect(toolCall.id).toBe('ext_1');
      expect(toolCall.name).toBe('external_tool');
      expect(toolCall.args).toEqual({ param: 123 });
      expect(toolCall.status).toBe('completed');
    });
  });
});

// ============================================================================
// Result Translators Tests
// ============================================================================

describe('Result Translators', () => {
  describe('externalResultToSubAgentResult', () => {
    it('should convert ExternalAgentResult to SubAgentResult', () => {
      const externalResult: ExternalAgentResult = {
        success: true,
        sessionId: 'session_1',
        finalResponse: 'Final response text',
        messages: [],
        steps: [
          {
            id: 'step_1',
            stepNumber: 1,
            type: 'message',
            status: 'completed',
            content: [{ type: 'text', text: 'Step 1 response' }],
            startedAt: new Date(),
            duration: 100,
          },
        ],
        toolCalls: [
          { id: 'tc_1', name: 'tool_1', input: {}, result: 'tool result', status: 'completed' },
        ],
        duration: 500,
        tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      };

      const result = externalResultToSubAgentResult(externalResult, 'sub_agent_1');

      expect(result.success).toBe(true);
      expect(result.finalResponse).toBe('Final response text');
      expect(result.totalSteps).toBe(1);
      expect(result.duration).toBe(500);
      expect(result.tokenUsage?.totalTokens).toBe(150);
      expect(result.toolResults).toHaveLength(1);
    });

    it('should handle result without token usage', () => {
      const externalResult: ExternalAgentResult = {
        success: false,
        sessionId: 'session_1',
        finalResponse: '',
        messages: [],
        steps: [],
        toolCalls: [],
        duration: 0,
        error: 'Failed',
      };

      const result = externalResultToSubAgentResult(externalResult, 'sub_agent_1');

      expect(result.success).toBe(false);
      expect(result.tokenUsage).toBeUndefined();
      expect(result.error).toBe('Failed');
    });
  });

  describe('externalTokenUsageToSubAgent', () => {
    it('should convert token usage format', () => {
      const usage = { promptTokens: 200, completionTokens: 100, totalTokens: 300 };
      const result = externalTokenUsageToSubAgent(usage);

      expect(result).toEqual({
        promptTokens: 200,
        completionTokens: 100,
        totalTokens: 300,
      });
    });
  });

  describe('subAgentResultToExternal', () => {
    it('should convert SubAgentResult to ExternalAgentResult', () => {
      const subAgentResult: SubAgentResult = {
        success: true,
        finalResponse: 'Done',
        steps: [],
        totalSteps: 0,
        duration: 200,
        toolResults: [{ toolCallId: 'tc_1', toolName: 'tool_1', result: 'ok' }],
        tokenUsage: { promptTokens: 50, completionTokens: 25, totalTokens: 75 },
      };

      const result = subAgentResultToExternal(subAgentResult, 'session_x');

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe('session_x');
      expect(result.finalResponse).toBe('Done');
      expect(result.toolCalls).toHaveLength(1);
      expect(result.tokenUsage?.totalTokens).toBe(75);
    });

    it('should handle missing optional fields', () => {
      const subAgentResult: SubAgentResult = {
        success: false,
        finalResponse: '',
        steps: [],
        totalSteps: 0,
        duration: 0,
      };

      const result = subAgentResultToExternal(subAgentResult, 'session_x');

      expect(result.finalResponse).toBe('');
      expect(result.duration).toBe(0);
      expect(result.toolCalls).toEqual([]);
    });
  });
});

// ============================================================================
// Event Translators Tests
// ============================================================================

describe('Event Translators', () => {
  describe('extractResponseFromEvents', () => {
    it('should extract text from message_delta events', () => {
      const events: ExternalAgentEvent[] = [
        { type: 'message_start', timestamp: new Date() },
        { type: 'message_delta', delta: { type: 'text', text: 'Hello ' }, timestamp: new Date() },
        { type: 'message_delta', delta: { type: 'text', text: 'world!' }, timestamp: new Date() },
        { type: 'message_end', timestamp: new Date() },
      ];

      const response = extractResponseFromEvents(events);
      expect(response).toBe('Hello world!');
    });

    it('should ignore non-text deltas', () => {
      const events: ExternalAgentEvent[] = [
        { type: 'message_delta', delta: { type: 'thinking', text: 'Thinking...' }, timestamp: new Date() },
        { type: 'message_delta', delta: { type: 'text', text: 'Response' }, timestamp: new Date() },
      ];

      const response = extractResponseFromEvents(events);
      expect(response).toBe('Response');
    });

    it('should return empty string for no text events', () => {
      const events: ExternalAgentEvent[] = [
        { type: 'message_start', timestamp: new Date() },
        { type: 'message_end', timestamp: new Date() },
      ];

      const response = extractResponseFromEvents(events);
      expect(response).toBe('');
    });
  });

  describe('extractThinkingFromEvents', () => {
    it('should extract thinking from thinking events', () => {
      const events: ExternalAgentEvent[] = [
        { type: 'thinking', thinking: 'Let me think...', timestamp: new Date() },
        { type: 'thinking', thinking: ' More thoughts.', timestamp: new Date() },
      ];

      const thinking = extractThinkingFromEvents(events);
      expect(thinking).toBe('Let me think... More thoughts.');
    });

    it('should extract thinking from message_delta events', () => {
      const events: ExternalAgentEvent[] = [
        { type: 'message_delta', delta: { type: 'thinking', text: 'Analyzing...' }, timestamp: new Date() },
      ];

      const thinking = extractThinkingFromEvents(events);
      expect(thinking).toBe('Analyzing...');
    });
  });

  describe('extractToolCallsFromEvents', () => {
    it('should extract complete tool calls from events', () => {
      const events: ExternalAgentEvent[] = [
        { type: 'tool_use_start', toolUseId: 'tc_1', toolName: 'search', timestamp: new Date() },
        { type: 'tool_use_end', toolUseId: 'tc_1', input: { query: 'test' }, timestamp: new Date() },
        { type: 'tool_result', toolUseId: 'tc_1', result: 'Found 5 results', isError: false, timestamp: new Date() },
      ];

      const toolCalls = extractToolCallsFromEvents(events);

      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0].id).toBe('tc_1');
      expect(toolCalls[0].name).toBe('search');
      expect(toolCalls[0].input).toEqual({ query: 'test' });
      expect(toolCalls[0].result).toBe('Found 5 results');
      expect(toolCalls[0].isError).toBe(false);
    });

    it('should handle tool error', () => {
      const events: ExternalAgentEvent[] = [
        { type: 'tool_use_start', toolUseId: 'tc_1', toolName: 'failing_tool', timestamp: new Date() },
        { type: 'tool_use_end', toolUseId: 'tc_1', input: {}, timestamp: new Date() },
        { type: 'tool_result', toolUseId: 'tc_1', result: 'Error message', isError: true, timestamp: new Date() },
      ];

      const toolCalls = extractToolCallsFromEvents(events);

      expect(toolCalls[0].isError).toBe(true);
      expect(toolCalls[0].result).toBe('Error message');
    });
  });

  describe('eventsToSteps', () => {
    it('should convert message events to steps', () => {
      const now = new Date();
      const later = new Date(now.getTime() + 1000);

      const events: ExternalAgentEvent[] = [
        { type: 'message_start', timestamp: now },
        { type: 'message_delta', delta: { type: 'text', text: 'Hello' }, timestamp: now },
        { type: 'message_end', timestamp: later },
      ];

      const steps = eventsToSteps(events);

      expect(steps).toHaveLength(1);
      expect(steps[0].type).toBe('message');
      expect(steps[0].status).toBe('completed');
      expect(steps[0].stepNumber).toBe(1);
    });

    it('should convert tool events to steps', () => {
      const now = new Date();

      const events: ExternalAgentEvent[] = [
        { type: 'tool_use_start', toolUseId: 'tc_1', toolName: 'test_tool', timestamp: now },
        { type: 'tool_use_end', toolUseId: 'tc_1', input: { key: 'val' }, timestamp: now },
        { type: 'tool_result', toolUseId: 'tc_1', result: 'ok', isError: false, timestamp: now },
      ];

      const steps = eventsToSteps(events);

      expect(steps).toHaveLength(1);
      expect(steps[0].type).toBe('tool_call');
      expect(steps[0].toolCall?.name).toBe('test_tool');
      expect(steps[0].toolResult?.result).toBe('ok');
    });

    it('should handle thinking events', () => {
      const now = new Date();

      const events: ExternalAgentEvent[] = [
        { type: 'thinking', thinking: 'Deep thoughts', timestamp: now },
      ];

      const steps = eventsToSteps(events);

      expect(steps).toHaveLength(1);
      expect(steps[0].type).toBe('thinking');
      expect(steps[0].status).toBe('completed');
    });

    it('should handle error events', () => {
      const now = new Date();

      const events: ExternalAgentEvent[] = [
        { type: 'message_start', timestamp: now },
        { type: 'error', error: 'Something went wrong', timestamp: now },
      ];

      const steps = eventsToSteps(events);

      expect(steps[0].status).toBe('failed');
      expect(steps[0].error).toBe('Something went wrong');
    });
  });
});

// ============================================================================
// Permission Translators Tests
// ============================================================================

describe('Permission Translators', () => {
  describe('formatPermissionRequest', () => {
    it('should format permission request for display', () => {
      const request: AcpPermissionRequest = {
        id: 'perm_1',
        toolInfo: {
          id: 'tool_1',
          name: 'file_write',
          description: 'Writes to files',
          parameters: {},
        },
        reason: 'Need to save results',
        riskLevel: 'medium',
      };

      const formatted = formatPermissionRequest(request);

      expect(formatted.title).toBe('Permission Required: file_write');
      expect(formatted.description).toBe('Need to save results');
      expect(formatted.riskLevel).toBe('Medium Risk');
      expect(formatted.toolName).toBe('file_write');
      expect(formatted.toolDescription).toBe('Writes to files');
    });

    it('should handle all risk levels', () => {
      const baseRequest: AcpPermissionRequest = {
        id: 'perm_1',
        toolInfo: { id: '1', name: 'test', parameters: {} },
      };

      const lowRisk = formatPermissionRequest({ ...baseRequest, riskLevel: 'low' });
      expect(lowRisk.riskLevel).toBe('Low Risk');

      const highRisk = formatPermissionRequest({ ...baseRequest, riskLevel: 'high' });
      expect(highRisk.riskLevel).toBe('High Risk');

      const criticalRisk = formatPermissionRequest({ ...baseRequest, riskLevel: 'critical' });
      expect(criticalRisk.riskLevel).toBe('Critical Risk');
    });

    it('should use default description when reason not provided', () => {
      const request: AcpPermissionRequest = {
        id: 'perm_1',
        toolInfo: { id: '1', name: 'my_tool', parameters: {} },
      };

      const formatted = formatPermissionRequest(request);
      expect(formatted.description).toBe('The agent wants to use the "my_tool" tool.');
    });
  });
});

// ============================================================================
// Content Helpers Tests
// ============================================================================

describe('Content Helpers', () => {
  describe('createTextContent', () => {
    it('should create text content block', () => {
      const content = createTextContent('Hello world');
      expect(content).toEqual({ type: 'text', text: 'Hello world' });
    });
  });

  describe('createToolUseContent', () => {
    it('should create tool use content block', () => {
      const content = createToolUseContent('id_1', 'my_tool', { arg: 'value' });

      expect(content.type).toBe('tool_use');
      expect(content.id).toBe('id_1');
      expect(content.name).toBe('my_tool');
      expect(content.input).toEqual({ arg: 'value' });
      expect(content.status).toBe('pending');
    });
  });

  describe('createToolResultContent', () => {
    it('should create tool result content block', () => {
      const content = createToolResultContent('tool_1', 'Success result');

      expect(content.type).toBe('tool_result');
      expect(content.toolUseId).toBe('tool_1');
      expect(content.content).toBe('Success result');
      expect(content.isError).toBe(false);
    });

    it('should create error result', () => {
      const content = createToolResultContent('tool_1', 'Error occurred', true);
      expect(content.isError).toBe(true);
    });

    it('should accept object content', () => {
      const content = createToolResultContent('tool_1', { data: 123 });
      expect(content.content).toEqual({ data: 123 });
    });
  });

  describe('hasToolUse', () => {
    it('should return true when tool use present', () => {
      const content = [
        { type: 'text' as const, text: 'text' },
        { type: 'tool_use' as const, id: '1', name: 'tool', input: {}, status: 'pending' as const },
      ];
      expect(hasToolUse(content)).toBe(true);
    });

    it('should return false when no tool use', () => {
      const content = [{ type: 'text' as const, text: 'text' }];
      expect(hasToolUse(content)).toBe(false);
    });
  });

  describe('hasToolResult', () => {
    it('should return true when tool result present', () => {
      const content = [
        { type: 'tool_result' as const, toolUseId: '1', content: 'result', isError: false },
      ];
      expect(hasToolResult(content)).toBe(true);
    });

    it('should return false when no tool result', () => {
      const content = [{ type: 'text' as const, text: 'text' }];
      expect(hasToolResult(content)).toBe(false);
    });
  });

  describe('getPrimaryText', () => {
    it('should return first text content', () => {
      const content = [
        { type: 'thinking' as const, thinking: 'thinking...' },
        { type: 'text' as const, text: 'Primary text' },
        { type: 'text' as const, text: 'Secondary' },
      ];
      expect(getPrimaryText(content)).toBe('Primary text');
    });

    it('should return empty string when no text', () => {
      const content = [{ type: 'thinking' as const, thinking: 'thinking...' }];
      expect(getPrimaryText(content)).toBe('');
    });
  });
});
