/**
 * Unit tests for lib/agent/utils.ts
 *
 * Tests extracted constants, formatting utilities, and parsing functions.
 */

import {
  TOOL_STATE_CONFIG,
  STEP_PRIORITY_CONFIG,
  GRAPH_STATUS_ICONS,
  PRIORITY_DOT_COLORS,
  TASK_BOARD_COLUMNS,
  TASK_PRIORITY_COLORS,
  REPLAY_EVENT_ICONS,
  LIVE_TRACE_EVENT_ICONS,
  LIVE_TRACE_EVENT_COLORS,
  formatToolName,
  formatBytes,
  formatTokens,
  formatDuration,
  downloadFile,
  formatAgentAsMarkdown,
  parseReplayEvent,
} from './utils';
import type { BackgroundAgent } from '@/types/agent/background-agent';
import type { DBAgentTrace } from '@/lib/db';

// ============================================================================
// Constants Tests
// ============================================================================

describe('TOOL_STATE_CONFIG', () => {
  it('should have entries for all tool states', () => {
    const expectedStates = [
      'input-streaming',
      'input-available',
      'approval-requested',
      'approval-responded',
      'output-available',
      'output-error',
      'output-denied',
    ];
    expectedStates.forEach((state) => {
      expect(TOOL_STATE_CONFIG[state as keyof typeof TOOL_STATE_CONFIG]).toBeDefined();
    });
  });

  it('each entry should have icon, color, and label', () => {
    Object.values(TOOL_STATE_CONFIG).forEach((config) => {
      expect(config.icon).toBeDefined();
      expect(typeof config.color).toBe('string');
      expect(typeof config.label).toBe('string');
    });
  });
});

describe('STEP_PRIORITY_CONFIG', () => {
  it('should have entries for low, normal, high, critical', () => {
    expect(STEP_PRIORITY_CONFIG.low).toBeDefined();
    expect(STEP_PRIORITY_CONFIG.normal).toBeDefined();
    expect(STEP_PRIORITY_CONFIG.high).toBeDefined();
    expect(STEP_PRIORITY_CONFIG.critical).toBeDefined();
  });

  it('each entry should have a color string', () => {
    Object.values(STEP_PRIORITY_CONFIG).forEach((config) => {
      expect(typeof config.color).toBe('string');
    });
  });
});

describe('GRAPH_STATUS_ICONS', () => {
  it('should have entries for all teammate statuses', () => {
    const expectedStatuses = [
      'idle',
      'planning',
      'awaiting_approval',
      'executing',
      'paused',
      'completed',
      'failed',
      'cancelled',
      'shutdown',
    ];
    expectedStatuses.forEach((status) => {
      expect(GRAPH_STATUS_ICONS[status]).toBeDefined();
    });
  });
});

describe('PRIORITY_DOT_COLORS', () => {
  it('should have entries for all priority levels', () => {
    expect(PRIORITY_DOT_COLORS.critical).toBe('bg-red-500');
    expect(PRIORITY_DOT_COLORS.high).toBe('bg-orange-500');
    expect(PRIORITY_DOT_COLORS.normal).toBe('bg-blue-500');
    expect(PRIORITY_DOT_COLORS.low).toBe('bg-gray-400');
    expect(PRIORITY_DOT_COLORS.background).toBe('bg-gray-300');
  });
});

describe('TASK_BOARD_COLUMNS', () => {
  it('should have 5 columns', () => {
    expect(TASK_BOARD_COLUMNS).toHaveLength(5);
  });

  it('each column should have id, statuses, labelKey, and color', () => {
    TASK_BOARD_COLUMNS.forEach((col) => {
      expect(typeof col.id).toBe('string');
      expect(Array.isArray(col.statuses)).toBe(true);
      expect(col.statuses.length).toBeGreaterThan(0);
      expect(typeof col.labelKey).toBe('string');
      expect(typeof col.color).toBe('string');
    });
  });

  it('should cover all expected task statuses', () => {
    const allStatuses = TASK_BOARD_COLUMNS.flatMap((col) => col.statuses);
    expect(allStatuses).toContain('blocked');
    expect(allStatuses).toContain('pending');
    expect(allStatuses).toContain('claimed');
    expect(allStatuses).toContain('in_progress');
    expect(allStatuses).toContain('review');
    expect(allStatuses).toContain('completed');
    expect(allStatuses).toContain('failed');
    expect(allStatuses).toContain('cancelled');
  });
});

describe('TASK_PRIORITY_COLORS', () => {
  it('should have entries for all priority levels', () => {
    expect(typeof TASK_PRIORITY_COLORS.critical).toBe('string');
    expect(typeof TASK_PRIORITY_COLORS.high).toBe('string');
    expect(typeof TASK_PRIORITY_COLORS.normal).toBe('string');
    expect(typeof TASK_PRIORITY_COLORS.low).toBe('string');
    expect(typeof TASK_PRIORITY_COLORS.background).toBe('string');
  });
});

describe('REPLAY_EVENT_ICONS', () => {
  it('should have entries for common event types', () => {
    expect(REPLAY_EVENT_ICONS.session_start).toBeDefined();
    expect(REPLAY_EVENT_ICONS.session_end).toBeDefined();
    expect(REPLAY_EVENT_ICONS.permission_request).toBeDefined();
    expect(REPLAY_EVENT_ICONS.permission_response).toBeDefined();
    expect(REPLAY_EVENT_ICONS.step_start).toBeDefined();
    expect(REPLAY_EVENT_ICONS.step_finish).toBeDefined();
    expect(REPLAY_EVENT_ICONS.tool_call_request).toBeDefined();
    expect(REPLAY_EVENT_ICONS.tool_call_result).toBeDefined();
    expect(REPLAY_EVENT_ICONS.planning).toBeDefined();
    expect(REPLAY_EVENT_ICONS.response).toBeDefined();
    expect(REPLAY_EVENT_ICONS.error).toBeDefined();
  });
});

describe('LIVE_TRACE_EVENT_ICONS', () => {
  it('should have entries including checkpoint events', () => {
    expect(LIVE_TRACE_EVENT_ICONS.session_start).toBeDefined();
    expect(LIVE_TRACE_EVENT_ICONS.session_end).toBeDefined();
    expect(LIVE_TRACE_EVENT_ICONS.permission_request).toBeDefined();
    expect(LIVE_TRACE_EVENT_ICONS.permission_response).toBeDefined();
    expect(LIVE_TRACE_EVENT_ICONS.checkpoint_create).toBeDefined();
    expect(LIVE_TRACE_EVENT_ICONS.checkpoint_restore).toBeDefined();
    expect(LIVE_TRACE_EVENT_ICONS.step_start).toBeDefined();
  });
});

describe('LIVE_TRACE_EVENT_COLORS', () => {
  it('should return color strings for all event types', () => {
    Object.values(LIVE_TRACE_EVENT_COLORS).forEach((color) => {
      expect(typeof color).toBe('string');
      expect(color).toMatch(/^text-/);
    });
  });

  it('should have entries for checkpoint events', () => {
    expect(LIVE_TRACE_EVENT_COLORS.session_start).toBe('text-blue-500');
    expect(LIVE_TRACE_EVENT_COLORS.session_end).toBe('text-emerald-500');
    expect(LIVE_TRACE_EVENT_COLORS.permission_request).toBe('text-amber-500');
    expect(LIVE_TRACE_EVENT_COLORS.permission_response).toBe('text-green-500');
    expect(LIVE_TRACE_EVENT_COLORS.checkpoint_create).toBe('text-sky-500');
    expect(LIVE_TRACE_EVENT_COLORS.checkpoint_restore).toBe('text-orange-500');
  });
});

// ============================================================================
// Formatting Utilities Tests
// ============================================================================

describe('formatToolName', () => {
  it('should convert snake_case to Title Case', () => {
    expect(formatToolName('web_search')).toBe('Web Search');
  });

  it('should convert kebab-case to Title Case', () => {
    expect(formatToolName('file-read')).toBe('File Read');
  });

  it('should handle single word', () => {
    expect(formatToolName('calculator')).toBe('Calculator');
  });

  it('should handle multiple separators', () => {
    expect(formatToolName('bulk_web_scraper')).toBe('Bulk Web Scraper');
  });

  it('should handle mixed separators', () => {
    expect(formatToolName('web-search_api')).toBe('Web Search Api');
  });

  it('should handle empty string', () => {
    expect(formatToolName('')).toBe('');
  });
});

describe('formatBytes', () => {
  it('should return "0 B" for undefined', () => {
    expect(formatBytes(undefined)).toBe('0 B');
  });

  it('should return "0 B" for 0', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('should format bytes', () => {
    expect(formatBytes(500)).toBe('500 B');
  });

  it('should format kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('should format megabytes', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(1572864)).toBe('1.5 MB');
  });

  it('should format gigabytes', () => {
    expect(formatBytes(1073741824)).toBe('1 GB');
  });
});

describe('formatTokens', () => {
  it('should return raw count for < 1000', () => {
    expect(formatTokens(0)).toBe('0');
    expect(formatTokens(42)).toBe('42');
    expect(formatTokens(999)).toBe('999');
  });

  it('should format thousands with k suffix', () => {
    expect(formatTokens(1000)).toBe('1.0K');
    expect(formatTokens(1500)).toBe('1.5K');
    expect(formatTokens(10000)).toBe('10.0K');
    expect(formatTokens(999999)).toBe('1000.0K');
  });

  it('should format millions with M suffix', () => {
    expect(formatTokens(1_000_000)).toBe('1.0M');
    expect(formatTokens(2_500_000)).toBe('2.5M');
  });
});

describe('formatDuration', () => {
  it('should format milliseconds', () => {
    expect(formatDuration(0)).toBe('0ms');
    expect(formatDuration(500)).toBe('500ms');
    expect(formatDuration(999)).toBe('999ms');
  });

  it('should format seconds', () => {
    expect(formatDuration(1000)).toBe('1.0s');
    expect(formatDuration(1500)).toBe('1.5s');
    expect(formatDuration(59999)).toBe('60.0s');
  });

  it('should format minutes', () => {
    expect(formatDuration(60000)).toBe('1.0m');
    expect(formatDuration(90000)).toBe('1.5m');
    expect(formatDuration(300000)).toBe('5.0m');
  });
});

// ============================================================================
// File Export Utilities Tests
// ============================================================================

describe('downloadFile', () => {
  const originalCreateObjectURL = globalThis.URL.createObjectURL;
  const originalRevokeObjectURL = globalThis.URL.revokeObjectURL;

  beforeEach(() => {
    globalThis.URL.createObjectURL = jest.fn().mockReturnValue('blob:test');
    globalThis.URL.revokeObjectURL = jest.fn();
    jest.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    jest.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
  });

  afterEach(() => {
    globalThis.URL.createObjectURL = originalCreateObjectURL;
    globalThis.URL.revokeObjectURL = originalRevokeObjectURL;
    jest.restoreAllMocks();
  });

  it('should create a blob and trigger download', () => {
    const clickSpy = jest.fn();
    jest.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: clickSpy,
    } as unknown as HTMLAnchorElement);

    downloadFile('test.txt', 'hello world');

    expect(globalThis.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(clickSpy).toHaveBeenCalled();
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });

  it('should use provided mime type', () => {
    const clickSpy = jest.fn();
    jest.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: clickSpy,
    } as unknown as HTMLAnchorElement);

    downloadFile('data.json', '{}', 'application/json');

    const blobArg = (globalThis.URL.createObjectURL as jest.Mock).mock.calls[0][0] as Blob;
    expect(blobArg.type).toBe('application/json');
  });
});

describe('formatAgentAsMarkdown', () => {
  const createMockAgent = (overrides?: Partial<BackgroundAgent>): BackgroundAgent => ({
    id: 'agent-1',
    sessionId: 'session-1',
    name: 'Test Agent',
    task: 'Do something',
    status: 'completed',
    progress: 100,
    config: {} as BackgroundAgent['config'],
    executionState: {} as BackgroundAgent['executionState'],
    subAgents: [
      {
        id: 'sa-1',
        name: 'Sub Agent 1',
        status: 'completed',
        task: 'Sub task',
      } as BackgroundAgent['subAgents'][0],
    ],
    steps: [],
    logs: [
      {
        id: 'log-1',
        timestamp: new Date('2025-01-01T00:00:00Z'),
        level: 'info',
        message: 'Started execution',
        source: 'agent',
      },
    ],
    notifications: [],
    createdAt: new Date('2025-01-01T00:00:00Z'),
    startedAt: new Date('2025-01-01T00:00:00Z'),
    completedAt: new Date('2025-01-01T00:01:00Z'),
    retryCount: 0,
    priority: 1,
    ...overrides,
  });

  it('should include agent name as heading', () => {
    const md = formatAgentAsMarkdown(createMockAgent());
    expect(md).toContain('# Test Agent');
  });

  it('should include status, task, progress', () => {
    const md = formatAgentAsMarkdown(createMockAgent());
    expect(md).toContain('**Status:** completed');
    expect(md).toContain('**Task:** Do something');
    expect(md).toContain('**Progress:** 100%');
  });

  it('should include timestamps', () => {
    const md = formatAgentAsMarkdown(createMockAgent());
    expect(md).toContain('**Started:**');
    expect(md).toContain('**Completed:**');
  });

  it('should include sub-agents section', () => {
    const md = formatAgentAsMarkdown(createMockAgent());
    expect(md).toContain('## Sub-Agents');
    expect(md).toContain('**Sub Agent 1** (completed): Sub task');
  });

  it('should include logs section', () => {
    const md = formatAgentAsMarkdown(createMockAgent());
    expect(md).toContain('## Logs');
    expect(md).toContain('[INFO]');
    expect(md).toContain('Started execution');
  });

  it('should handle agent without timestamps', () => {
    const md = formatAgentAsMarkdown(
      createMockAgent({ startedAt: undefined, completedAt: undefined })
    );
    expect(md).not.toContain('**Started:**');
    expect(md).not.toContain('**Completed:**');
  });
});

// ============================================================================
// parseReplayEvent Tests
// ============================================================================

describe('parseReplayEvent', () => {
  const createMockTrace = (record: Record<string, unknown>): DBAgentTrace => ({
    id: 'trace-1',
    sessionId: 'session-1',
    timestamp: new Date('2025-01-01T00:00:00Z'),
    record: JSON.stringify(record),
    createdAt: new Date('2025-01-01T00:00:00Z'),
  });

  it('should parse a valid trace record', () => {
    const trace = createMockTrace({
      id: 'event-1',
      timestamp: '2025-01-01T00:00:00Z',
      eventType: 'step_start',
      stepId: 'step-1',
      duration: 500,
      files: [{ path: '/test.ts' }],
      metadata: {
        toolName: 'web_search',
        success: true,
      },
    });

    const result = parseReplayEvent(trace);

    expect(result).not.toBeNull();
    expect(result!.id).toBe('event-1');
    expect(result!.eventType).toBe('step_start');
    expect(result!.stepId).toBe('step-1');
    expect(result!.duration).toBe(500);
    expect(result!.toolName).toBe('web_search');
    expect(result!.success).toBe(true);
    expect(result!.files).toEqual(['/test.ts']);
  });

  it('should handle missing eventType by defaulting to response', () => {
    const trace = createMockTrace({
      id: 'event-2',
      timestamp: '2025-01-01T00:00:00Z',
      files: [],
    });

    const result = parseReplayEvent(trace);
    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('response');
  });

  it('should extract token usage from metadata', () => {
    const trace = createMockTrace({
      id: 'event-3',
      timestamp: '2025-01-01T00:00:00Z',
      files: [],
      metadata: {
        tokenUsage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
        },
      },
    });

    const result = parseReplayEvent(trace);
    expect(result).not.toBeNull();
    expect(result!.tokenUsage).toEqual({
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    });
  });

  it('should extract cost from costEstimate', () => {
    const trace = createMockTrace({
      id: 'event-4',
      timestamp: '2025-01-01T00:00:00Z',
      files: [],
      costEstimate: { totalCost: 0.005 },
    });

    const result = parseReplayEvent(trace);
    expect(result).not.toBeNull();
    expect(result!.cost).toBe(0.005);
  });

  it('should return null for invalid JSON', () => {
    const trace: DBAgentTrace = {
      id: 'trace-bad',
      sessionId: 'session-1',
      timestamp: new Date(),
      record: 'not valid json',
      createdAt: new Date(),
    };

    const result = parseReplayEvent(trace);
    expect(result).toBeNull();
  });

  it('should filter out empty file paths', () => {
    const trace = createMockTrace({
      id: 'event-5',
      timestamp: '2025-01-01T00:00:00Z',
      files: [{ path: '/valid.ts' }, { path: '' }, { path: '/also-valid.ts' }],
    });

    const result = parseReplayEvent(trace);
    expect(result).not.toBeNull();
    expect(result!.files).toEqual(['/valid.ts', '/also-valid.ts']);
  });

  it('should extract error and responsePreview from metadata', () => {
    const trace = createMockTrace({
      id: 'event-6',
      timestamp: '2025-01-01T00:00:00Z',
      files: [],
      metadata: {
        error: 'Something went wrong',
        responsePreview: 'Here is a preview...',
      },
    });

    const result = parseReplayEvent(trace);
    expect(result).not.toBeNull();
    expect(result!.error).toBe('Something went wrong');
    expect(result!.responsePreview).toBe('Here is a preview...');
  });

  it('should use latencyMs as fallback for duration', () => {
    const trace = createMockTrace({
      id: 'event-7',
      timestamp: '2025-01-01T00:00:00Z',
      files: [],
      metadata: {
        latencyMs: 250,
      },
    });

    const result = parseReplayEvent(trace);
    expect(result).not.toBeNull();
    expect(result!.duration).toBe(250);
  });
});
