/**
 * Tests for MCP format utilities
 */

import {
  formatDuration,
  formatDurationFromDates,
  formatTimestamp,
  formatRelativeTimestamp,
  formatLastUsed,
  formatToolName,
  formatLatency,
  formatExecutionTime,
  flattenPromptMessages,
  getToolDisplayName,
  getServerNameFromToolName,
  getSuccessRate,
  getElapsedTime,
} from './format-utils';

import type { PromptMessage, ToolUsageRecord } from '@/types/mcp';

describe('formatDuration', () => {
  it('formats milliseconds', () => {
    expect(formatDuration(500)).toBe('500ms');
    expect(formatDuration(0)).toBe('0ms');
    expect(formatDuration(999)).toBe('999ms');
  });

  it('formats seconds', () => {
    expect(formatDuration(1000)).toBe('1.0s');
    expect(formatDuration(1500)).toBe('1.5s');
    expect(formatDuration(59999)).toBe('60.0s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(60000)).toBe('1m 0s');
    expect(formatDuration(65000)).toBe('1m 5s');
    expect(formatDuration(125000)).toBe('2m 5s');
  });
});

describe('formatDurationFromDates', () => {
  it('formats duration between two dates', () => {
    const start = new Date('2024-01-01T00:00:00.000Z');
    const end = new Date('2024-01-01T00:00:00.500Z');
    expect(formatDurationFromDates(start, end)).toBe('500ms');
  });

  it('formats seconds with higher precision', () => {
    const start = new Date('2024-01-01T00:00:00.000Z');
    const end = new Date('2024-01-01T00:00:01.234Z');
    expect(formatDurationFromDates(start, end)).toBe('1.23s');
  });

  it('formats minutes', () => {
    const start = new Date('2024-01-01T00:00:00.000Z');
    const end = new Date('2024-01-01T00:01:30.000Z');
    expect(formatDurationFromDates(start, end)).toBe('1m 30.0s');
  });
});

describe('formatTimestamp', () => {
  it('returns a time string', () => {
    const date = new Date('2024-01-01T10:30:45.123Z');
    const result = formatTimestamp(date);
    expect(result).toContain(':');
    expect(typeof result).toBe('string');
  });
});

describe('formatRelativeTimestamp', () => {
  it('formats recent timestamps', () => {
    expect(formatRelativeTimestamp(Date.now() - 30000)).toBe('<1m ago');
  });

  it('formats minutes', () => {
    expect(formatRelativeTimestamp(Date.now() - 300000)).toBe('5m ago');
  });

  it('formats hours', () => {
    expect(formatRelativeTimestamp(Date.now() - 7200000)).toBe('2h ago');
  });
});

describe('formatLastUsed', () => {
  it('formats recent', () => {
    expect(formatLastUsed(Date.now() - 30000)).toBe('<1m');
  });

  it('formats minutes', () => {
    expect(formatLastUsed(Date.now() - 300000)).toBe('5m');
  });

  it('formats hours', () => {
    expect(formatLastUsed(Date.now() - 7200000)).toBe('2h');
  });

  it('formats days', () => {
    expect(formatLastUsed(Date.now() - 172800000)).toBe('2d');
  });
});

describe('formatToolName', () => {
  it('converts snake_case to Title Case', () => {
    expect(formatToolName('list_tools')).toBe('List Tools');
  });

  it('converts kebab-case to Title Case', () => {
    expect(formatToolName('read-file')).toBe('Read File');
  });

  it('handles single word', () => {
    expect(formatToolName('search')).toBe('Search');
  });
});

describe('formatLatency', () => {
  it('returns dash for undefined', () => {
    expect(formatLatency(undefined)).toBe('-');
  });

  it('formats sub-millisecond', () => {
    expect(formatLatency(0.5)).toBe('<1ms');
  });

  it('formats normal latency', () => {
    expect(formatLatency(150)).toBe('150ms');
  });
});

describe('formatExecutionTime', () => {
  it('formats milliseconds', () => {
    expect(formatExecutionTime(500)).toBe('500ms');
  });

  it('formats seconds', () => {
    expect(formatExecutionTime(1500)).toBe('1.5s');
  });
});

describe('flattenPromptMessages', () => {
  it('flattens string messages', () => {
    const messages: PromptMessage[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'World' },
    ];
    expect(flattenPromptMessages(messages)).toBe('Hello\nWorld');
  });

  it('flattens content items', () => {
    const messages: PromptMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'First' },
          { type: 'text', text: 'Second' },
        ],
      },
    ];
    expect(flattenPromptMessages(messages)).toBe('First\nSecond');
  });
});

describe('getToolDisplayName', () => {
  it('extracts tool name from full name', () => {
    expect(getToolDisplayName('mcp_server1_read_file')).toBe('read_file');
  });

  it('returns original if no prefix', () => {
    expect(getToolDisplayName('search')).toBe('search');
  });
});

describe('getServerNameFromToolName', () => {
  it('extracts server name', () => {
    expect(getServerNameFromToolName('mcp_server1_tool')).toBe('server1');
  });

  it('returns empty for simple names', () => {
    expect(getServerNameFromToolName('tool')).toBe('');
  });
});

describe('getSuccessRate', () => {
  it('returns 0 for no usage', () => {
    const record: ToolUsageRecord = {
      toolName: 'test',
      usageCount: 0,
      successCount: 0,
      failureCount: 0,
      lastUsedAt: Date.now(),
      avgExecutionTime: 0,
    };
    expect(getSuccessRate(record)).toBe(0);
  });

  it('calculates percentage correctly', () => {
    const record: ToolUsageRecord = {
      toolName: 'test',
      usageCount: 10,
      successCount: 8,
      failureCount: 2,
      lastUsedAt: Date.now(),
      avgExecutionTime: 100,
    };
    expect(getSuccessRate(record)).toBe(80);
  });
});

describe('getElapsedTime', () => {
  it('formats elapsed time from start', () => {
    const start = new Date(Date.now() - 2500);
    expect(getElapsedTime(start)).toBe('2.5s');
  });

  it('formats elapsed time with end', () => {
    const start = new Date('2024-01-01T00:00:00.000Z');
    const end = new Date('2024-01-01T00:00:00.500Z');
    expect(getElapsedTime(start, end)).toBe('500ms');
  });
});
