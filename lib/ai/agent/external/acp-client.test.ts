/**
 * @jest-environment jsdom
 */

import { AcpClientAdapter } from './acp-client';
import type { ExternalAgentSession } from '@/types/agent/external-agent';
import { isTauri } from '@/lib/utils';
import {
  acpTerminalCreate,
  acpTerminalOutput,
  acpTerminalWaitForExit,
} from '@/lib/native/external-agent';

jest.mock('@/lib/utils', () => ({
  isTauri: jest.fn().mockReturnValue(false),
}));

jest.mock('@/lib/native/external-agent', () => ({
  acpTerminalCreate: jest.fn(),
  acpTerminalKill: jest.fn(),
  acpTerminalOutput: jest.fn(),
  acpTerminalRelease: jest.fn(),
  acpTerminalWaitForExit: jest.fn(),
}));

const mockReadTextFile = jest.fn();
const mockWriteTextFile = jest.fn();
jest.mock('@tauri-apps/plugin-fs', () => ({
  readTextFile: (...args: unknown[]) => mockReadTextFile(...args),
  writeTextFile: (...args: unknown[]) => mockWriteTextFile(...args),
}));

const mockIsTauri = isTauri as jest.MockedFunction<typeof isTauri>;
const mockAcpTerminalCreate = acpTerminalCreate as jest.MockedFunction<typeof acpTerminalCreate>;
const mockAcpTerminalOutput = acpTerminalOutput as jest.MockedFunction<typeof acpTerminalOutput>;
const mockAcpTerminalWaitForExit = acpTerminalWaitForExit as jest.MockedFunction<typeof acpTerminalWaitForExit>;

function buildSession(overrides?: Partial<ExternalAgentSession>): ExternalAgentSession {
  return {
    id: 'session-1',
    agentId: 'agent-1',
    status: 'active',
    permissionMode: 'default',
    capabilities: {},
    tools: [],
    messages: [],
    createdAt: new Date(),
    lastActivityAt: new Date(),
    ...overrides,
  };
}

describe('AcpClientAdapter protocol behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(false);
    jest.useRealTimers();
  });

  it('supports fs/read_text_file with line/limit slicing', async () => {
    mockIsTauri.mockReturnValue(true);
    mockReadTextFile.mockResolvedValue('line1\nline2\nline3\nline4\n');
    const client = new AcpClientAdapter();

    const result = await (client as unknown as { handleReadTextFile: (p: { path: string; line?: number; limit?: number }) => Promise<{ content: string }> }).handleReadTextFile({
      path: '/tmp/test.txt',
      line: 2,
      limit: 2,
    });

    expect(result.content).toBe('line2\nline3');
    expect(mockReadTextFile).toHaveBeenCalledWith('/tmp/test.txt');
  });

  it('passes terminal/create env and outputByteLimit to native wrapper', async () => {
    mockIsTauri.mockReturnValue(true);
    mockAcpTerminalCreate.mockResolvedValue('term_1');
    const client = new AcpClientAdapter();

    const result = await (client as unknown as { handleTerminalCreate: (p: { sessionId: string; command: string; args?: string[]; cwd?: string; env?: Record<string, string>; outputByteLimit?: number }) => Promise<{ terminalId: string }> }).handleTerminalCreate({
      sessionId: 'session-1',
      command: 'bash',
      args: ['-lc', 'echo hello'],
      cwd: '/tmp',
      env: { FOO: 'bar' },
      outputByteLimit: 1024,
    });

    expect(result).toEqual({ terminalId: 'term_1' });
    expect(mockAcpTerminalCreate).toHaveBeenCalledWith(
      'session-1',
      'bash',
      ['-lc', 'echo hello'],
      '/tmp',
      { FOO: 'bar' },
      1024
    );
  });

  it('returns terminal/output with truncated and exitStatus', async () => {
    mockIsTauri.mockReturnValue(true);
    mockAcpTerminalOutput.mockResolvedValue({
      output: '...tail',
      truncated: true,
      exitStatus: { exitCode: 0, signal: null },
      exitCode: 0,
    });
    const client = new AcpClientAdapter();

    const result = await (client as unknown as { handleTerminalOutput: (p: { terminalId: string; outputByteLimit?: number }) => Promise<unknown> }).handleTerminalOutput({
      terminalId: 'term_1',
      outputByteLimit: 64,
    });

    expect(result).toEqual({
      output: '...tail',
      truncated: true,
      exitStatus: { exitCode: 0, signal: null },
      exitCode: 0,
    });
    expect(mockAcpTerminalOutput).toHaveBeenCalledWith('term_1', 64);
  });

  it('returns terminal/wait_for_exit with exitStatus', async () => {
    mockIsTauri.mockReturnValue(true);
    mockAcpTerminalWaitForExit.mockResolvedValue({
      exitStatus: { exitCode: 0, signal: null },
      exitCode: 0,
    });
    const client = new AcpClientAdapter();

    const result = await (client as unknown as { handleTerminalWaitForExit: (p: { terminalId: string; timeout?: number }) => Promise<unknown> }).handleTerminalWaitForExit({
      terminalId: 'term_1',
      timeout: 30,
    });

    expect(result).toEqual({
      exitCode: 0,
      exitStatus: { exitCode: 0, signal: null },
    });
  });

  it('preserves ACP permission options and resolves with selected optionId', async () => {
    const client = new AcpClientAdapter();
    (client as unknown as { _sessions: Map<string, ExternalAgentSession> })._sessions.set(
      'session-1',
      buildSession({ permissionMode: 'default' })
    );
    const emitSpy = jest.spyOn(
      client as unknown as { emitEvent: (event: unknown) => void },
      'emitEvent'
    );

    const permissionPromise = (client as unknown as { handlePermissionRequest: (params: Record<string, unknown>) => Promise<{ outcome: { outcome: string; optionId?: string } }> }).handlePermissionRequest({
      requestId: 'req-1',
      sessionId: 'session-1',
      toolCallId: 'tool-1',
      title: 'write_file',
      kind: 'file_write',
      options: [
        { optionId: 'allow_once', name: 'Allow once', kind: 'allow_once', isDefault: true },
        { optionId: 'reject_once', name: 'Reject once', kind: 'reject_once' },
      ],
      rawInput: { path: '/tmp/a.ts' },
      locations: [{ path: '/tmp/a.ts', line: 10 }],
      _meta: { source: 'test' },
    });

    expect(emitSpy).toHaveBeenCalled();
    const emittedEvent = emitSpy.mock.calls[0][0] as { request: { options?: Array<{ optionId: string }>; rawInput?: Record<string, unknown> } };
    expect(emittedEvent.request.options?.[0].optionId).toBe('allow_once');
    expect(emittedEvent.request.rawInput).toEqual({ path: '/tmp/a.ts' });

    await client.respondToPermission('session-1', {
      requestId: 'req-1',
      granted: true,
      optionId: 'allow_once',
    });

    const permissionResponseEvent = emitSpy.mock.calls
      .map((call) => call[0] as { type?: string; response?: { requestId?: string; granted?: boolean; optionId?: string } })
      .find((event) => event.type === 'permission_response');
    expect(permissionResponseEvent).toBeDefined();
    expect(permissionResponseEvent?.response).toEqual({
      requestId: 'req-1',
      granted: true,
      optionId: 'allow_once',
    });

    await expect(permissionPromise).resolves.toEqual({
      outcome: { outcome: 'selected', optionId: 'allow_once' },
    });
  });

  it('maps terminal tool_call_update into tool_result with raw context fields', () => {
    const client = new AcpClientAdapter();
    const event = (
      client as unknown as {
        notificationToEvent: (n: { jsonrpc: '2.0'; method: string; params: Record<string, unknown> }) => unknown;
      }
    ).notificationToEvent({
      jsonrpc: '2.0',
      method: 'session/update',
      params: {
        sessionId: 'session-1',
        update: {
          sessionUpdate: 'tool_call_update',
          toolCallId: 'tool-1',
          title: 'write_file',
          kind: 'file_write',
          status: 'completed',
          rawInput: { path: '/tmp/a.ts', content: 'hello' },
          rawOutput: { success: true },
          locations: [{ path: '/tmp/a.ts', line: 2 }],
          content: [{ type: 'content', content: { type: 'text', text: 'ok' } }],
        },
      },
    }) as {
      type: string;
      toolUseId?: string;
      toolName?: string;
      kind?: string;
      status?: string;
      rawInput?: Record<string, unknown>;
      rawOutput?: Record<string, unknown>;
      locations?: Array<{ path: string; line?: number }>;
    } | null;

    expect(event).toBeTruthy();
    expect(event).toMatchObject({
      type: 'tool_result',
      toolUseId: 'tool-1',
      toolName: 'write_file',
      kind: 'file_write',
      status: 'completed',
      rawInput: { path: '/tmp/a.ts', content: 'hello' },
      rawOutput: { success: true },
      locations: [{ path: '/tmp/a.ts', line: 2 }],
    });
  });

  it('emits done event with stopReason from session/prompt result', async () => {
    const client = new AcpClientAdapter();
    const emitSpy = jest.spyOn(
      client as unknown as { emitEvent: (event: unknown) => void },
      'emitEvent'
    );
    jest
      .spyOn(client as unknown as { sendRequest: (method: string, params?: Record<string, unknown>) => Promise<unknown> }, 'sendRequest')
      .mockResolvedValue({ stopReason: 'cancelled' });

    (
      client as unknown as {
        sendPromptRequest: (sessionId: string, params: Record<string, unknown>) => void;
      }
    ).sendPromptRequest('session-1', {
      sessionId: 'session-1',
      prompt: [{ type: 'text', text: 'hello' }],
    });

    await Promise.resolve();
    await Promise.resolve();

    const doneEvent = emitSpy.mock.calls
      .map((call) => call[0] as { type?: string; stopReason?: string; success?: boolean })
      .find((event) => event.type === 'done');
    expect(doneEvent).toBeDefined();
    expect(doneEvent?.stopReason).toBe('cancelled');
    expect(doneEvent?.success).toBe(false);
  });

  it('auto-approves bypassPermissions by selecting an allow option from ACP options', async () => {
    const client = new AcpClientAdapter();
    (client as unknown as { _sessions: Map<string, ExternalAgentSession> })._sessions.set(
      'session-1',
      buildSession({ permissionMode: 'bypassPermissions' })
    );

    const result = await (client as unknown as { handlePermissionRequest: (params: Record<string, unknown>) => Promise<{ outcome: { outcome: string; optionId?: string } }> }).handlePermissionRequest({
      requestId: 'req-1',
      sessionId: 'session-1',
      toolCallId: 'tool-1',
      title: 'write_file',
      kind: 'file_write',
      options: [
        { optionId: 'allow_once', name: 'Allow once', kind: 'allow_once' },
        { optionId: 'reject_once', name: 'Reject once', kind: 'reject_once' },
      ],
    });

    expect(result).toEqual({ outcome: { outcome: 'selected', optionId: 'allow_once' } });
  });

  it('cancels bypassPermissions when ACP options have no allow candidate', async () => {
    const client = new AcpClientAdapter();
    (client as unknown as { _sessions: Map<string, ExternalAgentSession> })._sessions.set(
      'session-1',
      buildSession({ permissionMode: 'bypassPermissions' })
    );

    const result = await (client as unknown as { handlePermissionRequest: (params: Record<string, unknown>) => Promise<{ outcome: { outcome: string; optionId?: string } }> }).handlePermissionRequest({
      requestId: 'req-1',
      sessionId: 'session-1',
      toolCallId: 'tool-1',
      title: 'write_file',
      kind: 'file_write',
      options: [{ optionId: 'reject_once', name: 'Reject once', kind: 'reject_once' }],
    });

    expect(result).toEqual({ outcome: { outcome: 'cancelled' } });
  });

  it('synchronizes tools from session/started notification', () => {
    const client = new AcpClientAdapter();
    const tool = { id: 'tool-1', name: 'search' };

    const event = (client as unknown as { notificationToEvent: (n: { jsonrpc: '2.0'; method: string; params: Record<string, unknown> }) => unknown }).notificationToEvent({
      jsonrpc: '2.0',
      method: 'session/started',
      params: {
        sessionId: 'session-1',
        tools: [tool],
      },
    });

    expect(event).toBeTruthy();
    expect(client.tools).toEqual([tool]);
  });

  it('caches unsupported session/list after -32601 probing', async () => {
    const client = new AcpClientAdapter();
    const sendRequestSpy = jest
      .spyOn(client as unknown as { sendRequest: (method: string, params?: Record<string, unknown>) => Promise<unknown> }, 'sendRequest')
      .mockRejectedValue(new Error('-32601: Method not found'));

    await expect(client.listSessions()).rejects.toThrow('session listing');
    await expect(client.listSessions()).rejects.toThrow('session listing');

    expect(sendRequestSpy).toHaveBeenCalledTimes(1);
  });

  it('falls back to session/load when session/resume is unsupported but loadSession is available', async () => {
    const client = new AcpClientAdapter();
    (client as unknown as { _agentCapabilities: Record<string, unknown> })._agentCapabilities = {
      loadSession: true,
    };
    (client as unknown as { _config: { id: string; process?: { cwd?: string } } })._config = {
      id: 'agent-1',
      process: { cwd: '/tmp' },
    };

    const sendRequestSpy = jest
      .spyOn(client as unknown as { sendRequest: (method: string, params?: Record<string, unknown>) => Promise<unknown> }, 'sendRequest')
      .mockImplementation(async (method: string) => {
        if (method === 'session/resume') {
          throw new Error('-32601: Method not found');
        }
        return {};
      });

    const session = await client.resumeSession('session-1');

    expect(session.id).toBe('session-1');
    expect(sendRequestSpy).toHaveBeenCalledWith(
      'session/load',
      expect.objectContaining({ sessionId: 'session-1' })
    );
  });

  it('routes registered underscore extension methods', async () => {
    const client = new AcpClientAdapter();
    const sendMessageSpy = jest
      .spyOn(client as unknown as { sendMessage: (message: string) => Promise<void> }, 'sendMessage')
      .mockResolvedValue(undefined);
    const handler = jest.fn().mockResolvedValue({ ok: true });

    client.registerExtensionHandler('_custom/echo', handler);
    await (client as unknown as {
      handleAgentRequest: (request: {
        jsonrpc: '2.0';
        id: number;
        method: string;
        params?: Record<string, unknown>;
      }) => Promise<void>;
    }).handleAgentRequest({
      jsonrpc: '2.0',
      id: 1,
      method: '_custom/echo',
      params: { foo: 'bar' },
    });

    expect(handler).toHaveBeenCalledWith({ foo: 'bar' });
    expect(sendMessageSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(sendMessageSpy.mock.calls[0][0])).toEqual({
      jsonrpc: '2.0',
      id: 1,
      result: { ok: true },
    });
  });

  it('returns method-not-found for unregistered underscore extension methods', async () => {
    const client = new AcpClientAdapter();
    const sendMessageSpy = jest
      .spyOn(client as unknown as { sendMessage: (message: string) => Promise<void> }, 'sendMessage')
      .mockResolvedValue(undefined);

    await (client as unknown as {
      handleAgentRequest: (request: {
        jsonrpc: '2.0';
        id: number;
        method: string;
        params?: Record<string, unknown>;
      }) => Promise<void>;
    }).handleAgentRequest({
      jsonrpc: '2.0',
      id: 2,
      method: '_custom/unknown',
      params: {},
    });

    expect(sendMessageSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(sendMessageSpy.mock.calls[0][0])).toEqual({
      jsonrpc: '2.0',
      id: 2,
      error: { code: -32601, message: 'Method not found: _custom/unknown' },
    });
  });

  it('returns method-not-found for unknown ACP client methods', async () => {
    const client = new AcpClientAdapter();
    const sendMessageSpy = jest
      .spyOn(client as unknown as { sendMessage: (message: string) => Promise<void> }, 'sendMessage')
      .mockResolvedValue(undefined);

    await (client as unknown as {
      handleAgentRequest: (request: {
        jsonrpc: '2.0';
        id: number;
        method: string;
        params?: Record<string, unknown>;
      }) => Promise<void>;
    }).handleAgentRequest({
      jsonrpc: '2.0',
      id: 3,
      method: 'unknown/method',
      params: {},
    });

    expect(sendMessageSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(sendMessageSpy.mock.calls[0][0])).toEqual({
      jsonrpc: '2.0',
      id: 3,
      error: { code: -32601, message: 'Method not found: unknown/method' },
    });
  });

  it('does not auto-approve acceptEdits for non-write kinds', async () => {
    const client = new AcpClientAdapter();
    (client as unknown as { _sessions: Map<string, ExternalAgentSession> })._sessions.set(
      'session-1',
      buildSession({ permissionMode: 'acceptEdits' })
    );
    const emitSpy = jest.spyOn(
      client as unknown as { emitEvent: (event: unknown) => void },
      'emitEvent'
    );

    const permissionPromise = (client as unknown as {
      handlePermissionRequest: (params: Record<string, unknown>) => Promise<{ outcome: { outcome: string; optionId?: string } }>;
    }).handlePermissionRequest({
      requestId: 'req-manual',
      sessionId: 'session-1',
      toolCallId: 'tool-1',
      kind: 'execute',
      options: [
        { optionId: 'allow_once', name: 'Allow once', kind: 'allow_once' },
        { optionId: 'reject_once', name: 'Reject once', kind: 'reject_once' },
      ],
    });

    expect(emitSpy).toHaveBeenCalledTimes(1);

    await client.respondToPermission('session-1', {
      requestId: 'req-manual',
      granted: true,
      optionId: 'allow_once',
    });

    await expect(permissionPromise).resolves.toEqual({
      outcome: { outcome: 'selected', optionId: 'allow_once' },
    });
  });

  it('uses sessionId:toolCallId fallback request id when requestId is missing', async () => {
    const client = new AcpClientAdapter();
    (client as unknown as { _sessions: Map<string, ExternalAgentSession> })._sessions.set(
      'session-1',
      buildSession({ permissionMode: 'default' })
    );

    const permissionPromise = (client as unknown as {
      handlePermissionRequest: (params: Record<string, unknown>) => Promise<{ outcome: { outcome: string; optionId?: string } }>;
    }).handlePermissionRequest({
      sessionId: 'session-1',
      toolCallId: 'tool-2',
      kind: 'file_write',
      options: [{ optionId: 'allow_once', name: 'Allow once', kind: 'allow_once' }],
    });

    await client.respondToPermission('session-1', {
      requestId: 'session-1:tool-2',
      granted: true,
      optionId: 'allow_once',
    });

    await expect(permissionPromise).resolves.toEqual({
      outcome: { outcome: 'selected', optionId: 'allow_once' },
    });
  });

  it('updates existing session tools on session/started notification', () => {
    const client = new AcpClientAdapter();
    const session = buildSession({ id: 'session-1', tools: [] });
    (client as unknown as { _sessions: Map<string, ExternalAgentSession> })._sessions.set(
      'session-1',
      session
    );

    (client as unknown as {
      notificationToEvent: (n: {
        jsonrpc: '2.0';
        method: string;
        params: Record<string, unknown>;
      }) => unknown;
    }).notificationToEvent({
      jsonrpc: '2.0',
      method: 'session/started',
      params: {
        sessionId: 'session-1',
        tools: [{ id: 'tool-2', name: 'terminal' }],
      },
    });

    expect(client.getSession('session-1')?.tools).toEqual([{ id: 'tool-2', name: 'terminal' }]);
  });

  it('returns cancelled when permission request session does not exist', async () => {
    const client = new AcpClientAdapter();
    const result = await (client as unknown as {
      handlePermissionRequest: (params: Record<string, unknown>) => Promise<{ outcome: { outcome: string; optionId?: string } }>;
    }).handlePermissionRequest({
      requestId: 'req-missing-session',
      sessionId: 'missing-session',
      toolCallId: 'tool-1',
      kind: 'file_write',
      options: [{ optionId: 'allow_once', name: 'Allow once', kind: 'allow_once' }],
    });

    expect(result).toEqual({ outcome: { outcome: 'cancelled' } });
  });

  it('auto-approves acceptEdits for write kinds when allow option exists', async () => {
    const client = new AcpClientAdapter();
    (client as unknown as { _sessions: Map<string, ExternalAgentSession> })._sessions.set(
      'session-1',
      buildSession({ permissionMode: 'acceptEdits' })
    );

    const result = await (client as unknown as {
      handlePermissionRequest: (params: Record<string, unknown>) => Promise<{ outcome: { outcome: string; optionId?: string } }>;
    }).handlePermissionRequest({
      requestId: 'req-write-accept',
      sessionId: 'session-1',
      toolCallId: 'tool-1',
      kind: 'file_write',
      options: [{ optionId: 'allow_once', name: 'Allow once', kind: 'allow_once' }],
    });

    expect(result).toEqual({
      outcome: { outcome: 'selected', optionId: 'allow_once' },
    });
  });

  it('times out pending permission request and resolves cancelled', async () => {
    jest.useFakeTimers();
    const client = new AcpClientAdapter();
    (client as unknown as { _sessions: Map<string, ExternalAgentSession> })._sessions.set(
      'session-1',
      buildSession({ permissionMode: 'default' })
    );

    const permissionPromise = (client as unknown as {
      handlePermissionRequest: (params: Record<string, unknown>) => Promise<{ outcome: { outcome: string; optionId?: string } }>;
    }).handlePermissionRequest({
      requestId: 'req-timeout',
      sessionId: 'session-1',
      toolCallId: 'tool-1',
      kind: 'execute',
      options: [{ optionId: 'allow_once', name: 'Allow once', kind: 'allow_once' }],
    });

    jest.advanceTimersByTime(300000);
    await expect(permissionPromise).resolves.toEqual({ outcome: { outcome: 'cancelled' } });
  });

  it('rejects registering extension handlers without underscore prefix', () => {
    const client = new AcpClientAdapter();

    expect(() =>
      client.registerExtensionHandler('custom/nope', async () => ({ ok: true }))
    ).toThrow('ACP extension methods must start with "_"');
  });

  it('returns internal error when extension handler throws', async () => {
    const client = new AcpClientAdapter();
    const sendMessageSpy = jest
      .spyOn(client as unknown as { sendMessage: (message: string) => Promise<void> }, 'sendMessage')
      .mockResolvedValue(undefined);
    client.registerExtensionHandler('_custom/fail', () => {
      throw new Error('boom');
    });

    await (client as unknown as {
      handleAgentRequest: (request: {
        jsonrpc: '2.0';
        id: number;
        method: string;
        params?: Record<string, unknown>;
      }) => Promise<void>;
    }).handleAgentRequest({
      jsonrpc: '2.0',
      id: 9,
      method: '_custom/fail',
      params: {},
    });

    expect(sendMessageSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(sendMessageSpy.mock.calls[0][0])).toEqual({
      jsonrpc: '2.0',
      id: 9,
      error: { code: -32603, message: 'boom' },
    });
  });

  it('unregisters extension handler and then returns method-not-found', async () => {
    const client = new AcpClientAdapter();
    const sendMessageSpy = jest
      .spyOn(client as unknown as { sendMessage: (message: string) => Promise<void> }, 'sendMessage')
      .mockResolvedValue(undefined);
    client.registerExtensionHandler('_custom/temp', async () => ({ ok: true }));
    client.unregisterExtensionHandler('_custom/temp');

    await (client as unknown as {
      handleAgentRequest: (request: {
        jsonrpc: '2.0';
        id: number;
        method: string;
        params?: Record<string, unknown>;
      }) => Promise<void>;
    }).handleAgentRequest({
      jsonrpc: '2.0',
      id: 10,
      method: '_custom/temp',
      params: {},
    });

    expect(JSON.parse(sendMessageSpy.mock.calls[0][0])).toEqual({
      jsonrpc: '2.0',
      id: 10,
      error: { code: -32601, message: 'Method not found: _custom/temp' },
    });
  });

  it('returns empty list when session/list response omits sessions field', async () => {
    const client = new AcpClientAdapter();
    jest
      .spyOn(client as unknown as { sendRequest: (method: string, params?: Record<string, unknown>) => Promise<unknown> }, 'sendRequest')
      .mockResolvedValue({});

    const sessions = await client.listSessions();
    expect(sessions).toEqual([]);
  });

  it('caches unsupported session/fork after method-not-found', async () => {
    const client = new AcpClientAdapter();
    (client as unknown as { _config: { id: string } })._config = { id: 'agent-1' };
    const sendRequestSpy = jest
      .spyOn(client as unknown as { sendRequest: (method: string, params?: Record<string, unknown>) => Promise<unknown> }, 'sendRequest')
      .mockRejectedValue(new Error('-32601: Method not found'));

    await expect(client.forkSession('session-1')).rejects.toThrow('session forking');
    await expect(client.forkSession('session-1')).rejects.toThrow('session forking');

    expect(sendRequestSpy).toHaveBeenCalledTimes(1);
  });
});
