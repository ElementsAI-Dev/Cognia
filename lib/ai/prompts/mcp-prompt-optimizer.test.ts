/**
 * Tests for MCP Prompt Optimizer
 */

import {
  findAceToolServer,
  hasEnhancePromptTool,
  isAceToolReady,
  optimizePromptViaMcp,
  loadMcpPrivacyConsent,
  saveMcpPrivacyConsent,
  resetMcpPrivacyConsent,
  loadOptimizationHistory,
  saveToOptimizationHistory,
  clearOptimizationHistory,
  buildConversationHistory,
  getPromptStats,
  loadOptimizationModePreference,
  saveOptimizationModePreference,
} from './mcp-prompt-optimizer';
import type { McpServerState, ToolCallResult } from '@/types/mcp';
import { MCP_PRIVACY_CONSENT_KEY, PROMPT_OPTIMIZATION_HISTORY_KEY } from '@/types/content/prompt';

jest.mock('@/lib/logger', () => ({
  loggers: {
    ai: {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    },
  },
}));

function createMockServer(overrides: Partial<McpServerState> = {}): McpServerState {
  return {
    id: 'ace-tool',
    name: 'ace-tool',
    config: {
      name: 'ace-tool',
      command: 'cmd',
      args: ['npx', '-y', 'ace-tool@latest'],
      env: {},
      connectionType: 'stdio',
      enabled: true,
      autoStart: false,
    },
    status: { type: 'connected' },
    tools: [
      {
        name: 'enhance_prompt',
        description: 'Enhance a prompt',
        inputSchema: { type: 'object', properties: { prompt: { type: 'string' } } },
      },
      {
        name: 'search_context',
        description: 'Search context',
        inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
      },
    ],
    resources: [],
    prompts: [],
    reconnectAttempts: 0,
    ...overrides,
  };
}

describe('findAceToolServer', () => {
  it('finds server by id', () => {
    const servers = [createMockServer({ id: 'ace-tool' })];
    expect(findAceToolServer(servers)).toBeDefined();
    expect(findAceToolServer(servers)?.id).toBe('ace-tool');
  });

  it('finds server by name', () => {
    const servers = [createMockServer({ id: 'custom-id', name: 'My ace-tool Server' })];
    expect(findAceToolServer(servers)).toBeDefined();
  });

  it('finds server by command args', () => {
    const server = createMockServer({
      id: 'custom',
      name: 'Custom',
      config: {
        name: 'Custom',
        command: 'npx',
        args: ['-y', 'ace-tool@latest'],
        env: {},
        connectionType: 'stdio',
        enabled: true,
        autoStart: false,
      },
    });
    expect(findAceToolServer([server])).toBeDefined();
  });

  it('returns undefined when not found', () => {
    const server = createMockServer({
      id: 'other-server',
      name: 'Other',
      config: {
        name: 'Other',
        command: 'npx',
        args: ['-y', 'other-tool'],
        env: {},
        connectionType: 'stdio',
        enabled: true,
        autoStart: false,
      },
    });
    expect(findAceToolServer([server])).toBeUndefined();
  });

  it('returns undefined for empty array', () => {
    expect(findAceToolServer([])).toBeUndefined();
  });
});

describe('hasEnhancePromptTool', () => {
  it('returns true when enhance_prompt tool exists', () => {
    const server = createMockServer();
    expect(hasEnhancePromptTool(server)).toBe(true);
  });

  it('returns false when tools are empty', () => {
    const server = createMockServer({ tools: [] });
    expect(hasEnhancePromptTool(server)).toBe(false);
  });

  it('returns false when tools are undefined', () => {
    const server = createMockServer({ tools: undefined });
    expect(hasEnhancePromptTool(server)).toBe(false);
  });

  it('returns false when enhance_prompt is not in tools', () => {
    const server = createMockServer({
      tools: [{ name: 'search_context', inputSchema: {} }],
    });
    expect(hasEnhancePromptTool(server)).toBe(false);
  });
});

describe('isAceToolReady', () => {
  it('returns true when connected and has tool', () => {
    const server = createMockServer();
    expect(isAceToolReady(server)).toBe(true);
  });

  it('returns false when disconnected', () => {
    const server = createMockServer({ status: { type: 'disconnected' } });
    expect(isAceToolReady(server)).toBe(false);
  });

  it('returns false when connecting', () => {
    const server = createMockServer({ status: { type: 'connecting' } });
    expect(isAceToolReady(server)).toBe(false);
  });

  it('returns false when error', () => {
    const server = createMockServer({ status: { type: 'error', message: 'fail' } });
    expect(isAceToolReady(server)).toBe(false);
  });
});

describe('optimizePromptViaMcp', () => {
  const mockCallTool = jest.fn<Promise<ToolCallResult>, [string, string, Record<string, unknown>]>();

  beforeEach(() => {
    mockCallTool.mockReset();
  });

  it('returns error when no ace-tool server found', async () => {
    const result = await optimizePromptViaMcp(
      { prompt: 'test prompt' },
      mockCallTool,
      []
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('returns error when server is disconnected', async () => {
    const server = createMockServer({ status: { type: 'disconnected' } });
    const result = await optimizePromptViaMcp(
      { prompt: 'test prompt' },
      mockCallTool,
      [server]
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('disconnected');
  });

  it('returns error when enhance_prompt tool missing', async () => {
    const server = createMockServer({ tools: [{ name: 'other_tool', inputSchema: {} }] });
    const result = await optimizePromptViaMcp(
      { prompt: 'test prompt' },
      mockCallTool,
      [server]
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('successfully optimizes with plain text response', async () => {
    mockCallTool.mockResolvedValue({
      content: [{ type: 'text', text: 'Enhanced: test prompt with improvements' }],
      isError: false,
    });

    const server = createMockServer();
    const result = await optimizePromptViaMcp(
      { prompt: 'test prompt' },
      mockCallTool,
      [server]
    );

    expect(result.success).toBe(true);
    expect(result.optimizedPrompt).toBeDefined();
    expect(result.optimizedPrompt?.optimized).toBe('Enhanced: test prompt with improvements');
    expect(result.optimizedPrompt?.original).toBe('test prompt');
    expect(result.optimizedPrompt?.mode).toBe('mcp');
    expect(mockCallTool).toHaveBeenCalledWith('ace-tool', 'enhance_prompt', {
      prompt: 'test prompt',
      conversation_history: '',
    });
  });

  it('successfully optimizes with JSON response', async () => {
    mockCallTool.mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify({
          enhanced_prompt: 'Better prompt',
          improvements: ['Added clarity', 'Better structure'],
        }),
      }],
      isError: false,
    });

    const server = createMockServer();
    const result = await optimizePromptViaMcp(
      { prompt: 'test' },
      mockCallTool,
      [server]
    );

    expect(result.success).toBe(true);
    expect(result.optimizedPrompt?.optimized).toBe('Better prompt');
    expect(result.optimizedPrompt?.improvements).toEqual(['Added clarity', 'Better structure']);
  });

  it('handles MCP tool error response', async () => {
    mockCallTool.mockResolvedValue({
      content: [{ type: 'text', text: 'Tool execution failed' }],
      isError: true,
    });

    const server = createMockServer();
    const result = await optimizePromptViaMcp(
      { prompt: 'test' },
      mockCallTool,
      [server]
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Tool execution failed');
  });

  it('handles callTool throwing an error', async () => {
    mockCallTool.mockRejectedValue(new Error('Network error'));

    const server = createMockServer();
    const result = await optimizePromptViaMcp(
      { prompt: 'test' },
      mockCallTool,
      [server]
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Network error');
  });

  it('passes projectRootPath when provided', async () => {
    mockCallTool.mockResolvedValue({
      content: [{ type: 'text', text: 'optimized' }],
      isError: false,
    });

    const server = createMockServer();
    await optimizePromptViaMcp(
      { prompt: 'test', projectRootPath: '/home/user/project' },
      mockCallTool,
      [server]
    );

    expect(mockCallTool).toHaveBeenCalledWith('ace-tool', 'enhance_prompt', {
      prompt: 'test',
      conversation_history: '',
      project_root_path: '/home/user/project',
    });
  });
});

describe('MCP Privacy Consent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default when no consent stored', () => {
    const consent = loadMcpPrivacyConsent();
    expect(consent.accepted).toBe(false);
  });

  it('saves and loads consent', () => {
    saveMcpPrivacyConsent({
      accepted: true,
      acceptedAt: 1234567890,
      dontAskAgain: true,
    });

    const consent = loadMcpPrivacyConsent();
    expect(consent.accepted).toBe(true);
    expect(consent.acceptedAt).toBe(1234567890);
    expect(consent.dontAskAgain).toBe(true);
  });

  it('handles corrupted localStorage data', () => {
    localStorage.setItem(MCP_PRIVACY_CONSENT_KEY, 'not-json');
    const consent = loadMcpPrivacyConsent();
    expect(consent.accepted).toBe(false);
  });

  it('uses the correct localStorage key', () => {
    saveMcpPrivacyConsent({ accepted: true });
    expect(localStorage.getItem(MCP_PRIVACY_CONSENT_KEY)).toBeTruthy();
  });

  it('resets consent', () => {
    saveMcpPrivacyConsent({ accepted: true, dontAskAgain: true });
    expect(loadMcpPrivacyConsent().accepted).toBe(true);
    resetMcpPrivacyConsent();
    expect(loadMcpPrivacyConsent().accepted).toBe(false);
  });
});

describe('Optimization History', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty array when no history', () => {
    expect(loadOptimizationHistory()).toEqual([]);
  });

  it('saves and loads history entries', () => {
    const entry = saveToOptimizationHistory({
      original: 'hello',
      optimized: 'Hello, how can I help?',
      mode: 'local',
      style: 'detailed',
      improvements: ['Added detail'],
    });

    expect(entry.id).toBeDefined();
    expect(entry.timestamp).toBeDefined();

    const history = loadOptimizationHistory();
    expect(history).toHaveLength(1);
    expect(history[0].original).toBe('hello');
    expect(history[0].optimized).toBe('Hello, how can I help?');
    expect(history[0].mode).toBe('local');
  });

  it('prepends new entries (newest first)', () => {
    saveToOptimizationHistory({
      original: 'first',
      optimized: 'First optimized',
      mode: 'local',
      improvements: [],
    });
    saveToOptimizationHistory({
      original: 'second',
      optimized: 'Second optimized',
      mode: 'mcp',
      improvements: [],
    });

    const history = loadOptimizationHistory();
    expect(history).toHaveLength(2);
    expect(history[0].original).toBe('second');
    expect(history[1].original).toBe('first');
  });

  it('limits history to 20 entries', () => {
    for (let i = 0; i < 25; i++) {
      saveToOptimizationHistory({
        original: `prompt-${i}`,
        optimized: `optimized-${i}`,
        mode: 'local',
        improvements: [],
      });
    }

    const history = loadOptimizationHistory();
    expect(history).toHaveLength(20);
    expect(history[0].original).toBe('prompt-24');
  });

  it('clears history', () => {
    saveToOptimizationHistory({
      original: 'test',
      optimized: 'test optimized',
      mode: 'local',
      improvements: [],
    });
    expect(loadOptimizationHistory()).toHaveLength(1);

    clearOptimizationHistory();
    expect(loadOptimizationHistory()).toEqual([]);
  });

  it('handles corrupted history data', () => {
    localStorage.setItem(PROMPT_OPTIMIZATION_HISTORY_KEY, 'not-json');
    expect(loadOptimizationHistory()).toEqual([]);
  });

  it('stores MCP mode entries with serverName', () => {
    saveToOptimizationHistory({
      original: 'test',
      optimized: 'enhanced',
      mode: 'mcp',
      serverName: 'ace-tool',
      improvements: ['Via MCP'],
    });

    const history = loadOptimizationHistory();
    expect(history[0].mode).toBe('mcp');
    expect(history[0].serverName).toBe('ace-tool');
  });
});

describe('buildConversationHistory', () => {
  it('returns empty string for empty messages', () => {
    expect(buildConversationHistory([])).toBe('');
  });

  it('returns empty string for undefined/null', () => {
    expect(buildConversationHistory(undefined as never)).toBe('');
  });

  it('formats messages as [role]: content', () => {
    const messages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
    ];
    const result = buildConversationHistory(messages);
    expect(result).toContain('[user]: Hello');
    expect(result).toContain('[assistant]: Hi there!');
  });

  it('limits to last N messages', () => {
    const messages = Array.from({ length: 20 }, (_, i) => ({
      role: 'user',
      content: `Message ${i}`,
    }));
    const result = buildConversationHistory(messages, 5);
    expect(result).not.toContain('Message 14');
    expect(result).toContain('Message 15');
    expect(result).toContain('Message 19');
  });

  it('truncates long message content to 500 chars', () => {
    const longContent = 'x'.repeat(1000);
    const messages = [{ role: 'user', content: longContent }];
    const result = buildConversationHistory(messages);
    expect(result.length).toBeLessThan(600);
  });
});

describe('getPromptStats', () => {
  it('returns zeros for empty string', () => {
    const stats = getPromptStats('');
    expect(stats.charCount).toBe(0);
    expect(stats.wordCount).toBe(0);
    expect(stats.lineCount).toBe(0);
    expect(stats.sentenceCount).toBe(0);
  });

  it('counts characters correctly', () => {
    expect(getPromptStats('hello').charCount).toBe(5);
    expect(getPromptStats('hello world').charCount).toBe(11);
  });

  it('counts words correctly', () => {
    expect(getPromptStats('hello').wordCount).toBe(1);
    expect(getPromptStats('hello world').wordCount).toBe(2);
    expect(getPromptStats('  multiple   spaces  ').wordCount).toBe(2);
  });

  it('counts lines correctly', () => {
    expect(getPromptStats('one line').lineCount).toBe(1);
    expect(getPromptStats('line1\nline2').lineCount).toBe(2);
    expect(getPromptStats('a\nb\nc').lineCount).toBe(3);
  });

  it('counts sentences correctly', () => {
    expect(getPromptStats('Hello.').sentenceCount).toBe(1);
    expect(getPromptStats('Hello. World!').sentenceCount).toBe(2);
    expect(getPromptStats('你好。世界！').sentenceCount).toBe(2);
  });
});

// ─── Mode Persistence ───────────────────────────────────────────────

describe('loadOptimizationModePreference', () => {
  it('returns "local" by default', () => {
    expect(loadOptimizationModePreference()).toBe('local');
  });

  it('returns saved mode preference', () => {
    localStorage.setItem('cognia-prompt-optimization-mode', 'mcp');
    expect(loadOptimizationModePreference()).toBe('mcp');
  });

  it('returns "local" for invalid stored value', () => {
    localStorage.setItem('cognia-prompt-optimization-mode', 'invalid');
    expect(loadOptimizationModePreference()).toBe('local');
  });

  it('returns "local" when localStorage throws', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage error');
    });
    expect(loadOptimizationModePreference()).toBe('local');
    jest.restoreAllMocks();
  });
});

describe('saveOptimizationModePreference', () => {
  it('saves mode to localStorage', () => {
    saveOptimizationModePreference('mcp');
    expect(localStorage.getItem('cognia-prompt-optimization-mode')).toBe('mcp');
  });

  it('overwrites previous value', () => {
    saveOptimizationModePreference('mcp');
    saveOptimizationModePreference('local');
    expect(localStorage.getItem('cognia-prompt-optimization-mode')).toBe('local');
  });

  it('handles localStorage errors gracefully', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage full');
    });
    expect(() => saveOptimizationModePreference('mcp')).not.toThrow();
    jest.restoreAllMocks();
  });
});
