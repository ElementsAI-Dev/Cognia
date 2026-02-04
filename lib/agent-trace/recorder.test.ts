/**
 * Tests for agent trace recorder functions
 */

import 'fake-indexeddb/auto';
import { db } from '@/lib/db';
import {
  recordAgentTrace,
  recordAgentTraceFromToolCall,
  isTracedTool,
  AGENT_TRACE_VERSION,
  AGENT_TRACE_TOOL_NAME,
  TRACED_TOOL_NAMES,
} from './recorder';

// Mock the git store
jest.mock('@/stores/git', () => ({
  useGitStore: {
    getState: () => ({
      currentRepoInfo: null,
    }),
  },
}));

// Mock the settings store with default settings
const mockAgentTraceSettings = {
  enabled: true,
  maxRecords: 1000,
  autoCleanupDays: 30,
  traceShellCommands: true,
  traceCodeEdits: true,
  traceFailedCalls: false,
};

jest.mock('@/stores', () => ({
  useSettingsStore: {
    getState: () => ({
      agentTraceSettings: mockAgentTraceSettings,
    }),
  },
}));

describe('agent-trace/recorder', () => {
  beforeEach(async () => {
    await db.agentTraces.clear();
  });

  describe('constants', () => {
    it('exports AGENT_TRACE_VERSION', () => {
      expect(AGENT_TRACE_VERSION).toBe('0.1.0');
    });

    it('exports AGENT_TRACE_TOOL_NAME', () => {
      expect(AGENT_TRACE_TOOL_NAME).toBe('cognia');
    });

    it('exports TRACED_TOOL_NAMES array', () => {
      expect(TRACED_TOOL_NAMES).toContain('file_write');
      expect(TRACED_TOOL_NAMES).toContain('file_append');
      expect(TRACED_TOOL_NAMES).toContain('artifact_create');
      expect(TRACED_TOOL_NAMES).toContain('artifact_update');
      expect(TRACED_TOOL_NAMES).toContain('code_edit');
      expect(TRACED_TOOL_NAMES).toContain('code_create');
      expect(TRACED_TOOL_NAMES).toContain('shell_execute');
    });
  });

  describe('isTracedTool', () => {
    it('returns true for traced tools', () => {
      expect(isTracedTool('file_write')).toBe(true);
      expect(isTracedTool('file_append')).toBe(true);
      expect(isTracedTool('artifact_create')).toBe(true);
      expect(isTracedTool('artifact_update')).toBe(true);
      expect(isTracedTool('code_edit')).toBe(true);
      expect(isTracedTool('code_create')).toBe(true);
      expect(isTracedTool('shell_execute')).toBe(true);
    });

    it('returns false for non-traced tools', () => {
      expect(isTracedTool('web_search')).toBe(false);
      expect(isTracedTool('read_file')).toBe(false);
      expect(isTracedTool('unknown_tool')).toBe(false);
    });
  });

  describe('recordAgentTrace', () => {
    it('creates a trace record with required fields', async () => {
      const id = await recordAgentTrace({
        sessionId: 'session-123',
        contributorType: 'ai',
        modelId: 'openai/gpt-4o',
        filePath: '/src/test.ts',
        content: 'console.log("hello");',
      });

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');

      const record = await db.agentTraces.get(id);
      expect(record).toBeDefined();
      expect(record?.sessionId).toBe('session-123');
    });

    it('includes version and tool info', async () => {
      const id = await recordAgentTrace({
        contributorType: 'ai',
        filePath: '/test.ts',
        content: 'test',
      });

      const dbRecord = await db.agentTraces.get(id);
      expect(dbRecord).toBeDefined();

      const record = JSON.parse(dbRecord!.record);
      expect(record.version).toBe(AGENT_TRACE_VERSION);
      expect(record.tool.name).toBe(AGENT_TRACE_TOOL_NAME);
    });

    it('includes file information with correct structure', async () => {
      const id = await recordAgentTrace({
        contributorType: 'ai',
        modelId: 'anthropic/claude-sonnet-4-20250514',
        filePath: '/src/app.tsx',
        content: 'line1\nline2\nline3',
        conversationUrl: 'cognia://session/123',
      });

      const dbRecord = await db.agentTraces.get(id);
      const record = JSON.parse(dbRecord!.record);

      expect(record.files).toHaveLength(1);
      expect(record.files[0].path).toBe('/src/app.tsx');
      expect(record.files[0].conversations).toHaveLength(1);

      const conversation = record.files[0].conversations[0];
      expect(conversation.url).toBe('cognia://session/123');
      expect(conversation.contributor.type).toBe('ai');
      expect(conversation.contributor.model_id).toBe('anthropic/claude-sonnet-4-20250514');
      expect(conversation.ranges).toHaveLength(1);
      expect(conversation.ranges[0].start_line).toBe(1);
      expect(conversation.ranges[0].end_line).toBe(3);
      expect(conversation.ranges[0].content_hash).toMatch(/^fnv1a32:/);
    });

    it('includes VCS information when provided', async () => {
      const id = await recordAgentTrace({
        contributorType: 'ai',
        filePath: '/test.ts',
        content: 'test',
        vcs: {
          type: 'git',
          revision: 'abc123def456',
        },
      });

      const dbRecord = await db.agentTraces.get(id);
      expect(dbRecord?.vcsType).toBe('git');
      expect(dbRecord?.vcsRevision).toBe('abc123def456');

      const record = JSON.parse(dbRecord!.record);
      expect(record.vcs).toEqual({ type: 'git', revision: 'abc123def456' });
    });

    it('includes metadata', async () => {
      const id = await recordAgentTrace({
        contributorType: 'ai',
        filePath: '/test.ts',
        content: 'test',
        sessionId: 'session-1',
        metadata: {
          toolName: 'file_write',
          agentName: 'coder',
        },
      });

      const dbRecord = await db.agentTraces.get(id);
      const record = JSON.parse(dbRecord!.record);

      expect(record.metadata.sessionId).toBe('session-1');
      expect(record.metadata.toolName).toBe('file_write');
      expect(record.metadata.agentName).toBe('coder');
    });
  });

  describe('recordAgentTraceFromToolCall', () => {
    it('records file_write tool call', async () => {
      const initialCount = await db.agentTraces.count();

      await recordAgentTraceFromToolCall({
        sessionId: 'session-1',
        agentName: 'assistant',
        provider: 'openai',
        model: 'gpt-4o',
        toolCallId: 'tool-123',
        toolName: 'file_write',
        toolArgs: {
          path: '/src/new-file.ts',
          content: 'export const hello = "world";',
        },
        toolResult: { success: true },
      });

      const finalCount = await db.agentTraces.count();
      expect(finalCount).toBe(initialCount + 1);

      const traces = await db.agentTraces.toArray();
      const record = JSON.parse(traces[traces.length - 1].record);
      expect(record.eventType).toBe('tool_call_result');
      expect(record.metadata.toolCallId).toBe('tool-123');
    });

    it('records artifact_create tool call', async () => {
      await recordAgentTraceFromToolCall({
        sessionId: 'session-1',
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        toolName: 'artifact_create',
        toolArgs: {
          content: '<div>Hello</div>',
        },
        toolResult: { success: true, artifactId: 'artifact-123' },
      });

      const traces = await db.agentTraces.toArray();
      expect(traces.length).toBeGreaterThan(0);

      const lastTrace = traces[traces.length - 1];
      const record = JSON.parse(lastTrace.record);
      expect(record.files[0].path).toBe('artifact:artifact-123');
    });

    it('does not record failed tool calls', async () => {
      const initialCount = await db.agentTraces.count();

      await recordAgentTraceFromToolCall({
        sessionId: 'session-1',
        toolName: 'file_write',
        toolArgs: {
          path: '/test.ts',
          content: 'test',
        },
        toolResult: { success: false, error: 'Permission denied' },
      });

      const finalCount = await db.agentTraces.count();
      expect(finalCount).toBe(initialCount);
    });

    it('does not record non-traced tools', async () => {
      const initialCount = await db.agentTraces.count();

      await recordAgentTraceFromToolCall({
        sessionId: 'session-1',
        toolName: 'web_search',
        toolArgs: { query: 'test' },
        toolResult: { success: true, results: [] },
      });

      const finalCount = await db.agentTraces.count();
      expect(finalCount).toBe(initialCount);
    });

    it('handles missing path gracefully', async () => {
      const initialCount = await db.agentTraces.count();

      await recordAgentTraceFromToolCall({
        sessionId: 'session-1',
        toolName: 'file_write',
        toolArgs: { content: 'test' }, // missing path
        toolResult: { success: true },
      });

      const finalCount = await db.agentTraces.count();
      expect(finalCount).toBe(initialCount);
    });

    it('handles missing content gracefully', async () => {
      const initialCount = await db.agentTraces.count();

      await recordAgentTraceFromToolCall({
        sessionId: 'session-1',
        toolName: 'file_write',
        toolArgs: { path: '/test.ts' }, // missing content
        toolResult: { success: true },
      });

      const finalCount = await db.agentTraces.count();
      expect(finalCount).toBe(initialCount);
    });

    it('includes token usage in metadata when provided', async () => {
      await recordAgentTraceFromToolCall({
        sessionId: 'session-1',
        provider: 'openai',
        model: 'gpt-4o',
        toolName: 'file_write',
        toolArgs: {
          path: '/src/test.ts',
          content: 'const x = 1;',
        },
        toolResult: { success: true },
        tokenUsage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
        },
      });

      const traces = await db.agentTraces.toArray();
      expect(traces.length).toBeGreaterThan(0);

      const lastTrace = traces[traces.length - 1];
      const record = JSON.parse(lastTrace.record);
      expect(record.metadata.tokenUsage).toEqual({
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      });
    });

    it('includes latency in metadata when provided', async () => {
      await recordAgentTraceFromToolCall({
        sessionId: 'session-1',
        provider: 'openai',
        model: 'gpt-4o',
        toolName: 'file_write',
        toolArgs: {
          path: '/src/test.ts',
          content: 'const x = 1;',
        },
        toolResult: { success: true },
        latencyMs: 1500,
      });

      const traces = await db.agentTraces.toArray();
      expect(traces.length).toBeGreaterThan(0);

      const lastTrace = traces[traces.length - 1];
      const record = JSON.parse(lastTrace.record);
      expect(record.metadata.latencyMs).toBe(1500);
    });

    it('includes success status in metadata', async () => {
      await recordAgentTraceFromToolCall({
        sessionId: 'session-1',
        provider: 'openai',
        model: 'gpt-4o',
        toolName: 'file_write',
        toolArgs: {
          path: '/src/test.ts',
          content: 'const x = 1;',
        },
        toolResult: { success: true },
      });

      const traces = await db.agentTraces.toArray();
      expect(traces.length).toBeGreaterThan(0);

      const lastTrace = traces[traces.length - 1];
      const record = JSON.parse(lastTrace.record);
      expect(record.metadata.success).toBe(true);
    });

    describe('traceFailedCalls setting', () => {
      it('does not record failed calls when traceFailedCalls is false (default)', async () => {
        const initialCount = await db.agentTraces.count();

        await recordAgentTraceFromToolCall({
          sessionId: 'session-1',
          toolName: 'file_write',
          toolArgs: {
            path: '/test.ts',
            content: 'test',
          },
          toolResult: { success: false, error: 'Permission denied' },
        });

        const finalCount = await db.agentTraces.count();
        expect(finalCount).toBe(initialCount);
      });

      it('records failed calls when traceFailedCalls is true', async () => {
        // Enable traceFailedCalls
        mockAgentTraceSettings.traceFailedCalls = true;

        const initialCount = await db.agentTraces.count();

        await recordAgentTraceFromToolCall({
          sessionId: 'session-1',
          provider: 'openai',
          model: 'gpt-4o',
          toolName: 'file_write',
          toolArgs: {
            path: '/test.ts',
            content: 'test',
          },
          toolResult: { success: false, error: 'Permission denied' },
        });

        const finalCount = await db.agentTraces.count();
        expect(finalCount).toBe(initialCount + 1);

        const traces = await db.agentTraces.toArray();
        const lastTrace = traces[traces.length - 1];
        const record = JSON.parse(lastTrace.record);
        expect(record.metadata.success).toBe(false);
        expect(record.metadata.error).toBe('Permission denied');

        // Reset for other tests
        mockAgentTraceSettings.traceFailedCalls = false;
      });
    });
  });
});
