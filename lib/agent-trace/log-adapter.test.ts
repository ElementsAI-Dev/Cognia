/**
 * Tests for agent trace → StructuredLogEntry adapter
 */

import {
  agentTraceEventToLogEntry,
  dbAgentTraceToLogEntry,
  isAgentTraceLogEntry,
  getAgentTraceLogData,
  AGENT_TRACE_MODULE,
} from './log-adapter';
import type { AgentTraceEvent } from '@/stores/agent-trace/agent-trace-store';
import type { DBAgentTrace } from '@/lib/db';

function makeEvent(overrides: Partial<AgentTraceEvent> = {}): AgentTraceEvent {
  return {
    id: 'evt-1',
    sessionId: 'session-abc',
    eventType: 'tool_call_result',
    timestamp: 1700000000000,
    ...overrides,
  };
}

function makeDbRow(record: Record<string, unknown>, overrides: Partial<DBAgentTrace> = {}): DBAgentTrace {
  return {
    id: 'db-1',
    timestamp: new Date('2024-01-01T00:00:00Z'),
    record: JSON.stringify(record),
    createdAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('agentTraceEventToLogEntry', () => {
  it('maps all fields correctly', () => {
    const event = makeEvent({
      toolName: 'file_write',
      toolArgs: '{"path": "/tmp/test.txt"}',
      success: true,
      duration: 1500,
      stepNumber: 3,
      tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      costEstimate: { inputCost: 0.001, outputCost: 0.002, totalCost: 0.003, currency: 'USD' },
      responsePreview: 'File written successfully',
      modelId: 'gpt-4',
    });

    const entry = agentTraceEventToLogEntry(event);

    expect(entry.id).toBe('at-evt-1');
    expect(entry.module).toBe(AGENT_TRACE_MODULE);
    expect(entry.sessionId).toBe('session-abc');
    expect(entry.level).toBe('info');
    expect(entry.message).toContain('tool call result');
    expect(entry.message).toContain('file_write');
    expect(entry.timestamp).toBe(new Date(1700000000000).toISOString());
    expect(entry.stepId).toBe('step-3');
    expect(entry.eventId).toBe('tool_call_result');
    expect(entry.tags).toContain('tool_call_result');
    expect(entry.tags).toContain('file_write');
    expect(entry.data).toBeDefined();
  });

  it('maps error event to level error', () => {
    const event = makeEvent({ eventType: 'error', error: 'Something broke' });
    const entry = agentTraceEventToLogEntry(event);
    expect(entry.level).toBe('error');
  });

  it('maps success=false to level error', () => {
    const event = makeEvent({ success: false });
    const entry = agentTraceEventToLogEntry(event);
    expect(entry.level).toBe('error');
  });

  it('maps normal event to level info', () => {
    const event = makeEvent({ eventType: 'response' });
    const entry = agentTraceEventToLogEntry(event);
    expect(entry.level).toBe('info');
  });

  it('maps permission_request to level warn', () => {
    const event = makeEvent({ eventType: 'permission_request' });
    const entry = agentTraceEventToLogEntry(event);
    expect(entry.level).toBe('warn');
  });

  it('prefixes id with at-', () => {
    const event = makeEvent({ id: 'my-unique-id' });
    const entry = agentTraceEventToLogEntry(event);
    expect(entry.id).toBe('at-my-unique-id');
  });

  it('handles missing optional fields gracefully', () => {
    const event = makeEvent();
    const entry = agentTraceEventToLogEntry(event);

    expect(entry.data).toBeDefined();
    expect(entry.stepId).toBeUndefined();
    expect(entry.traceId).toBeUndefined();
  });
});

describe('dbAgentTraceToLogEntry', () => {
  it('parses valid JSON record', () => {
    const row = makeDbRow(
      {
        version: '0.1.0',
        id: 'rec-1',
        timestamp: '2024-01-01T00:00:00Z',
        files: [{ path: '/tmp/test.txt', conversations: [] }],
        eventType: 'tool_call_result',
        metadata: {
          toolName: 'file_write',
          success: true,
          latencyMs: 500,
        },
      },
      { sessionId: 'session-xyz' }
    );

    const entry = dbAgentTraceToLogEntry(row);

    expect(entry).not.toBeNull();
    expect(entry!.id).toBe('at-rec-1');
    expect(entry!.module).toBe(AGENT_TRACE_MODULE);
    expect(entry!.sessionId).toBe('session-xyz');
    expect(entry!.level).toBe('info');
    expect(entry!.message).toContain('file_write');
    expect(entry!.data).toBeDefined();
  });

  it('returns null for invalid JSON', () => {
    const row: DBAgentTrace = {
      id: 'bad-1',
      timestamp: new Date(),
      record: '{invalid json',
      createdAt: new Date(),
    };

    expect(dbAgentTraceToLogEntry(row)).toBeNull();
  });

  it('extracts token usage from metadata', () => {
    const row = makeDbRow({
      version: '0.1.0',
      id: 'rec-2',
      timestamp: '2024-01-01T00:00:00Z',
      files: [],
      metadata: {
        tokenUsage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
      },
    });

    const entry = dbAgentTraceToLogEntry(row);
    expect(entry).not.toBeNull();
    const data = entry!.data as Record<string, unknown>;
    const tokenUsage = data.tokenUsage as { promptTokens: number; completionTokens: number; totalTokens: number };
    expect(tokenUsage.promptTokens).toBe(200);
    expect(tokenUsage.completionTokens).toBe(100);
    expect(tokenUsage.totalTokens).toBe(300);
  });

  it('maps error event type to level error', () => {
    const row = makeDbRow({
      version: '0.1.0',
      id: 'rec-3',
      timestamp: '2024-01-01T00:00:00Z',
      files: [],
      eventType: 'error',
      metadata: { error: 'Something went wrong' },
    });

    const entry = dbAgentTraceToLogEntry(row);
    expect(entry).not.toBeNull();
    expect(entry!.level).toBe('error');
  });

  it('includes tags from record', () => {
    const row = makeDbRow({
      version: '0.1.0',
      id: 'rec-4',
      timestamp: '2024-01-01T00:00:00Z',
      files: [],
      eventType: 'response',
      tags: ['custom-tag'],
    });

    const entry = dbAgentTraceToLogEntry(row);
    expect(entry).not.toBeNull();
    expect(entry!.tags).toContain('response');
    expect(entry!.tags).toContain('custom-tag');
  });

  it('falls back to row.id when record.id is missing', () => {
    const row = makeDbRow(
      {
        version: '0.1.0',
        timestamp: '2024-01-01T00:00:00Z',
        files: [],
      },
      { id: 'row-fallback-id' }
    );

    const entry = dbAgentTraceToLogEntry(row);
    expect(entry).not.toBeNull();
    expect(entry!.id).toBe('at-row-fallback-id');
  });

  it('falls back to row.timestamp when record.timestamp is missing', () => {
    const rowTimestamp = new Date('2024-06-15T12:00:00Z');
    const row = makeDbRow(
      {
        version: '0.1.0',
        id: 'rec-ts',
        files: [],
      },
      { timestamp: rowTimestamp }
    );

    const entry = dbAgentTraceToLogEntry(row);
    expect(entry).not.toBeNull();
    expect(entry!.timestamp).toBe(rowTimestamp.toISOString());
  });

  it('defaults eventType to response when missing', () => {
    const row = makeDbRow({
      version: '0.1.0',
      id: 'rec-no-event',
      timestamp: '2024-01-01T00:00:00Z',
      files: [],
    });

    const entry = dbAgentTraceToLogEntry(row);
    expect(entry).not.toBeNull();
    expect(entry!.eventId).toBe('response');
    expect(entry!.message).toContain('response');
  });

  it('extracts snake_case token usage keys', () => {
    const row = makeDbRow({
      version: '0.1.0',
      id: 'rec-snake',
      timestamp: '2024-01-01T00:00:00Z',
      files: [],
      metadata: {
        usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 },
      },
    });

    const entry = dbAgentTraceToLogEntry(row);
    expect(entry).not.toBeNull();
    const data = entry!.data as Record<string, unknown>;
    const tokenUsage = data.tokenUsage as { promptTokens: number; completionTokens: number; totalTokens: number };
    expect(tokenUsage.promptTokens).toBe(50);
    expect(tokenUsage.completionTokens).toBe(25);
    expect(tokenUsage.totalTokens).toBe(75);
  });

  it('extracts costEstimate from record', () => {
    const row = makeDbRow({
      version: '0.1.0',
      id: 'rec-cost',
      timestamp: '2024-01-01T00:00:00Z',
      files: [],
      costEstimate: { inputCost: 0.01, outputCost: 0.02, totalCost: 0.03, currency: 'USD' },
    });

    const entry = dbAgentTraceToLogEntry(row);
    expect(entry).not.toBeNull();
    const data = entry!.data as Record<string, unknown>;
    const cost = data.costEstimate as { totalCost: number };
    expect(cost.totalCost).toBe(0.03);
  });

  it('extracts file paths from record.files', () => {
    const row = makeDbRow({
      version: '0.1.0',
      id: 'rec-files',
      timestamp: '2024-01-01T00:00:00Z',
      files: [
        { path: '/src/a.ts', conversations: [] },
        { path: '/src/b.ts', conversations: [] },
      ],
    });

    const entry = dbAgentTraceToLogEntry(row);
    expect(entry).not.toBeNull();
    const data = entry!.data as Record<string, unknown>;
    expect(data.files).toEqual(['/src/a.ts', '/src/b.ts']);
  });

  it('handles record with missing metadata gracefully', () => {
    const row = makeDbRow({
      version: '0.1.0',
      id: 'rec-no-meta',
      timestamp: '2024-01-01T00:00:00Z',
      files: [],
    });

    const entry = dbAgentTraceToLogEntry(row);
    expect(entry).not.toBeNull();
    const data = entry!.data as Record<string, unknown>;
    expect(data.toolName).toBeUndefined();
    expect(data.tokenUsage).toBeUndefined();
    expect(data.success).toBeUndefined();
  });

  it('serializes non-string toolArgs to JSON', () => {
    const row = makeDbRow({
      version: '0.1.0',
      id: 'rec-obj-args',
      timestamp: '2024-01-01T00:00:00Z',
      files: [],
      metadata: {
        toolArgs: { path: '/tmp/test.txt', content: 'hello' },
      },
    });

    const entry = dbAgentTraceToLogEntry(row);
    expect(entry).not.toBeNull();
    const data = entry!.data as Record<string, unknown>;
    expect(data.toolArgs).toBe(JSON.stringify({ path: '/tmp/test.txt', content: 'hello' }));
  });
});

describe('isAgentTraceLogEntry', () => {
  it('returns true for agent-trace module', () => {
    const event = makeEvent();
    const entry = agentTraceEventToLogEntry(event);
    expect(isAgentTraceLogEntry(entry)).toBe(true);
  });

  it('returns false for other modules', () => {
    expect(isAgentTraceLogEntry({
      id: '1',
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'test',
      module: 'app',
    })).toBe(false);
  });
});

describe('getAgentTraceLogData', () => {
  it('extracts data from agent-trace entry', () => {
    const event = makeEvent({ toolName: 'file_write' });
    const entry = agentTraceEventToLogEntry(event);
    const data = getAgentTraceLogData(entry);

    expect(data).not.toBeNull();
    expect(data!.eventType).toBe('tool_call_result');
    expect(data!.toolName).toBe('file_write');
  });

  it('returns null for non-agent-trace entry', () => {
    expect(getAgentTraceLogData({
      id: '1',
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'test',
      module: 'app',
    })).toBeNull();
  });
});
