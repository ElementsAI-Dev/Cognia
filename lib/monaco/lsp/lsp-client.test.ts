/**
 * @jest-environment jsdom
 */

jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

jest.mock('@tauri-apps/api/event', () => ({
  listen: jest.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  hasLspCapability,
  isTauriRuntime,
  lspCancelRequest,
  lspChangeDocument,
  lspExecuteCommand,
  lspCodeActions,
  lspCompletion,
  lspDocumentSymbols,
  lspFormatDocument,
  lspListenDiagnostics,
  lspWorkspaceSymbols,
  lspResolveCodeAction,
  lspStartSession,
  lspSeverityToMonaco,
} from './lsp-client';

describe('lsp-client', () => {
  const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;
  const mockListen = listen as jest.MockedFunction<typeof listen>;

  beforeEach(() => {
    jest.clearAllMocks();
    delete (window as typeof window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  });

  it('detects tauri runtime from window internals', () => {
    expect(isTauriRuntime()).toBe(false);
    (window as typeof window & { __TAURI_INTERNALS__?: Record<string, unknown> }).__TAURI_INTERNALS__ = {};
    expect(isTauriRuntime()).toBe(true);
  });

  it('normalizes completion result arrays and objects', async () => {
    mockInvoke.mockResolvedValueOnce([{ label: 'arr-item' }]);
    await expect(
      lspCompletion('session-1', { uri: 'file:///a.ts' }, 1, 1)
    ).resolves.toEqual({
      items: [{ label: 'arr-item' }],
    });

    mockInvoke.mockResolvedValueOnce({
      isIncomplete: true,
      items: [{ label: 'obj-item' }],
    });
    await expect(
      lspCompletion('session-1', { uri: 'file:///a.ts' }, 1, 1)
    ).resolves.toEqual({
      isIncomplete: true,
      items: [{ label: 'obj-item' }],
    });

    mockInvoke.mockResolvedValueOnce(null);
    await expect(
      lspCompletion('session-1', { uri: 'file:///a.ts' }, 1, 1)
    ).resolves.toEqual({
      items: [],
    });
  });

  it('normalizes initialize response capabilities to server capabilities', async () => {
    mockInvoke.mockResolvedValueOnce({
      sessionId: 'session-1',
      capabilities: {
        capabilities: {
          completionProvider: { triggerCharacters: ['.'] },
          hoverProvider: true,
          codeActionProvider: { codeActionKinds: ['quickfix'] },
          documentFormattingProvider: true,
        },
      },
    });

    await expect(
      lspStartSession({ language: 'typescript', rootUri: 'file:///workspace' })
    ).resolves.toEqual({
      sessionId: 'session-1',
      capabilities: {
        completionProvider: { triggerCharacters: ['.'] },
        hoverProvider: true,
        definitionProvider: undefined,
        documentSymbolProvider: undefined,
        codeActionProvider: { codeActionKinds: ['quickfix'] },
        documentFormattingProvider: true,
        workspaceSymbolProvider: undefined,
        textDocumentSync: undefined,
      },
    });
  });

  it('normalizes textDocumentSync as number and object', async () => {
    mockInvoke.mockResolvedValueOnce({
      sessionId: 'session-num',
      capabilities: {
        capabilities: {
          textDocumentSync: 2,
        },
      },
    });
    await expect(lspStartSession({ language: 'typescript' })).resolves.toEqual(
      expect.objectContaining({
        sessionId: 'session-num',
        capabilities: expect.objectContaining({
          textDocumentSync: 2,
        }),
      })
    );

    mockInvoke.mockResolvedValueOnce({
      sessionId: 'session-obj',
      capabilities: {
        capabilities: {
          textDocumentSync: {
            openClose: true,
            change: 2,
            save: { includeText: true },
          },
        },
      },
    });
    await expect(lspStartSession({ language: 'typescript' })).resolves.toEqual(
      expect.objectContaining({
        sessionId: 'session-obj',
        capabilities: expect.objectContaining({
          textDocumentSync: {
            openClose: true,
            change: 2,
            save: { includeText: true },
            willSave: undefined,
            willSaveWaitUntil: undefined,
          },
        }),
      })
    );
  });

  it('normalizes nullable array responses for document symbols, formatting and code actions', async () => {
    mockInvoke.mockResolvedValueOnce(null);
    await expect(
      lspDocumentSymbols('session-1', { uri: 'file:///a.ts' })
    ).resolves.toEqual([]);

    mockInvoke.mockResolvedValueOnce(null);
    await expect(
      lspFormatDocument('session-1', { uri: 'file:///a.ts' }, { tabSize: 2, insertSpaces: true })
    ).resolves.toEqual([]);

    mockInvoke.mockResolvedValueOnce(null);
    await expect(
      lspCodeActions(
        'session-1',
        { uri: 'file:///a.ts' },
        {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 1 },
        },
        []
      )
    ).resolves.toEqual([]);
  });

  it('forwards execute command and resolve code action requests', async () => {
    mockInvoke.mockResolvedValueOnce({ ok: true });
    await expect(
      lspExecuteCommand('session-1', 'tsserver.organizeImports', [{ uri: 'file:///a.ts' }])
    ).resolves.toEqual({ ok: true });

    mockInvoke.mockResolvedValueOnce({ title: 'Fix', edit: { changes: {} } });
    await expect(
      lspResolveCodeAction('session-1', { title: 'Fix' })
    ).resolves.toEqual({ title: 'Fix', edit: { changes: {} } });
  });

  it('forwards request meta and change payloads', async () => {
    mockInvoke.mockResolvedValueOnce({ items: [] });
    await lspCompletion('session-1', { uri: 'file:///a.ts' }, 1, 2, {
      clientRequestId: 'completion:1',
      timeoutMs: 4321,
    });
    expect(mockInvoke).toHaveBeenLastCalledWith('lsp_completion', {
      request: expect.objectContaining({
        sessionId: 'session-1',
        clientRequestId: 'completion:1',
        timeoutMs: 4321,
      }),
    });

    mockInvoke.mockResolvedValueOnce(undefined);
    await lspChangeDocument(
      'session-1',
      { uri: 'file:///a.ts', version: 3 },
      'const a = 1;',
      [
        {
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 1 },
          },
          rangeLength: 1,
          text: 'b',
        },
      ],
      { clientRequestId: 'sync:3', timeoutMs: 2500 }
    );
    expect(mockInvoke).toHaveBeenLastCalledWith('lsp_change_document', {
      request: expect.objectContaining({
        sessionId: 'session-1',
        uri: 'file:///a.ts',
        version: 3,
        clientRequestId: 'sync:3',
        timeoutMs: 2500,
        changes: expect.any(Array),
      }),
    });

    mockInvoke.mockResolvedValueOnce([]);
    await lspWorkspaceSymbols('session-1', 'Query', {
      clientRequestId: 'workspace:1',
      timeoutMs: 6000,
    });
    expect(mockInvoke).toHaveBeenLastCalledWith('lsp_workspace_symbols', {
      request: expect.objectContaining({
        sessionId: 'session-1',
        query: 'Query',
        clientRequestId: 'workspace:1',
        timeoutMs: 6000,
      }),
    });
  });

  it('forwards explicit cancel command', async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    await expect(lspCancelRequest('session-1', 'completion:5')).resolves.toBeUndefined();
    expect(mockInvoke).toHaveBeenCalledWith('lsp_cancel_request', {
      request: {
        sessionId: 'session-1',
        clientRequestId: 'completion:5',
      },
    });
  });

  it('forwards diagnostics events to callback', async () => {
    const unlisten = jest.fn();
    const callback = jest.fn();

    mockListen.mockImplementationOnce(async (_event, handler) => {
      handler({
        event: 'lsp://diagnostics',
        id: 1,
        payload: {
          sessionId: 's-1',
          uri: 'file:///a.ts',
          diagnostics: [],
        },
      });
      return unlisten;
    });

    await expect(lspListenDiagnostics(callback)).resolves.toBe(unlisten);
    expect(callback).toHaveBeenCalledWith({
      sessionId: 's-1',
      uri: 'file:///a.ts',
      diagnostics: [],
    });
  });

  it('maps LSP severity to Monaco severity', () => {
    expect(lspSeverityToMonaco(1)).toBe(8);
    expect(lspSeverityToMonaco(2)).toBe(4);
    expect(lspSeverityToMonaco(3)).toBe(2);
    expect(lspSeverityToMonaco(4)).toBe(1);
    expect(lspSeverityToMonaco(undefined)).toBe(2);
  });

  it('reports whether an LSP capability is enabled', () => {
    expect(hasLspCapability(true)).toBe(true);
    expect(hasLspCapability(false)).toBe(false);
    expect(hasLspCapability({ dynamicRegistration: false })).toBe(true);
    expect(hasLspCapability(undefined)).toBe(false);
  });
});
