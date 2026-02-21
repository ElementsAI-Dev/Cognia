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
  lspGetServerStatus,
  lspInstallServer,
  lspListenInstallProgress,
  lspCancelRequest,
  lspChangeDocument,
  lspExecuteCommand,
  lspRegistrySearch,
  lspResolveLaunch,
  lspCodeActions,
  lspCompletion,
  lspDocumentHighlights,
  lspDocumentSymbols,
  lspFormatDocument,
  lspImplementation,
  lspInlayHints,
  lspListenDiagnostics,
  lspListenServerStatusChanged,
  lspRename,
  lspReferences,
  lspSemanticTokensFull,
  lspSignatureHelp,
  lspTypeDefinition,
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
        referencesProvider: undefined,
        renameProvider: undefined,
        implementationProvider: undefined,
        typeDefinitionProvider: undefined,
        signatureHelpProvider: undefined,
        documentHighlightProvider: undefined,
        semanticTokensProvider: undefined,
        inlayHintProvider: undefined,
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

  it('forwards extended LSP methods and normalizes nullable arrays', async () => {
    mockInvoke.mockResolvedValueOnce(null);
    await expect(
      lspReferences('session-1', { uri: 'file:///a.ts' }, 1, 2, true, {
        clientRequestId: 'refs:1',
        timeoutMs: 1200,
      })
    ).resolves.toEqual([]);
    expect(mockInvoke).toHaveBeenLastCalledWith('lsp_references', {
      request: expect.objectContaining({
        sessionId: 'session-1',
        uri: 'file:///a.ts',
        includeDeclaration: true,
        clientRequestId: 'refs:1',
        timeoutMs: 1200,
      }),
    });

    mockInvoke.mockResolvedValueOnce({ changes: {} });
    await expect(
      lspRename('session-1', { uri: 'file:///a.ts' }, 2, 3, { newName: 'nextValue' }, {
        clientRequestId: 'rename:1',
      })
    ).resolves.toEqual({ changes: {} });
    expect(mockInvoke).toHaveBeenLastCalledWith('lsp_rename', {
      request: expect.objectContaining({
        sessionId: 'session-1',
        newName: 'nextValue',
        clientRequestId: 'rename:1',
      }),
    });

    mockInvoke.mockResolvedValueOnce(null);
    await expect(
      lspImplementation('session-1', { uri: 'file:///a.ts' }, 4, 1)
    ).resolves.toEqual([]);

    mockInvoke.mockResolvedValueOnce(null);
    await expect(
      lspTypeDefinition('session-1', { uri: 'file:///a.ts' }, 4, 1)
    ).resolves.toEqual([]);

    mockInvoke.mockResolvedValueOnce({
      signatures: [{ label: 'fn(a: string)' }],
      activeSignature: 0,
      activeParameter: 0,
    });
    await expect(
      lspSignatureHelp('session-1', { uri: 'file:///a.ts' }, 4, 1)
    ).resolves.toEqual(
      expect.objectContaining({
        signatures: [{ label: 'fn(a: string)' }],
      })
    );

    mockInvoke.mockResolvedValueOnce(null);
    await expect(
      lspDocumentHighlights('session-1', { uri: 'file:///a.ts' }, 1, 1)
    ).resolves.toEqual([]);

    mockInvoke.mockResolvedValueOnce(null);
    await expect(
      lspInlayHints(
        'session-1',
        { uri: 'file:///a.ts' },
        {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 10 },
        }
      )
    ).resolves.toEqual([]);

    mockInvoke.mockResolvedValueOnce({ data: [0, 0, 5, 0, 0] });
    await expect(
      lspSemanticTokensFull('session-1', { uri: 'file:///a.ts' })
    ).resolves.toEqual({ data: [0, 0, 5, 0, 0] });
    expect(mockInvoke).toHaveBeenLastCalledWith('lsp_semantic_tokens_full', {
      request: expect.objectContaining({
        sessionId: 'session-1',
        uri: 'file:///a.ts',
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

  it('forwards registry, install and resolve launch commands', async () => {
    mockInvoke.mockResolvedValueOnce([{ extensionId: 'dbaeumer.vscode-eslint' }]);
    await expect(
      lspRegistrySearch({ query: 'eslint', languageId: 'javascript' })
    ).resolves.toEqual([{ extensionId: 'dbaeumer.vscode-eslint' }]);
    expect(mockInvoke).toHaveBeenLastCalledWith('lsp_registry_search', {
      request: { query: 'eslint', languageId: 'javascript' },
    });

    mockInvoke.mockResolvedValueOnce({
      extensionId: 'dbaeumer.vscode-eslint',
      provider: 'open_vsx',
    });
    await expect(
      lspInstallServer({ extensionId: 'dbaeumer.vscode-eslint', languageId: 'javascript' })
    ).resolves.toEqual({
      extensionId: 'dbaeumer.vscode-eslint',
      provider: 'open_vsx',
    });

    mockInvoke.mockResolvedValueOnce({
      languageId: 'javascript',
      ready: true,
      args: ['--yes'],
      needsApproval: false,
      installed: false,
      supported: true,
      normalizedLanguageId: 'javascript',
    });
    await expect(lspGetServerStatus('javascript')).resolves.toEqual(
      expect.objectContaining({
        ready: true,
      })
    );

    mockInvoke.mockResolvedValueOnce({
      languageId: 'javascript',
      normalizedLanguageId: 'javascript',
      command: 'npx',
      args: ['--yes', 'typescript-language-server', '--stdio'],
      source: 'npx_runtime',
      trusted: true,
      requiresApproval: false,
    });
    await expect(lspResolveLaunch('javascript')).resolves.toEqual(
      expect.objectContaining({
        command: 'npx',
      })
    );
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

  it('forwards install and status events', async () => {
    const unlisten = jest.fn();
    const installCallback = jest.fn();
    const statusCallback = jest.fn();

    mockListen.mockImplementationOnce(async (_event, handler) => {
      handler({
        event: 'lsp-install-progress',
        id: 2,
        payload: {
          taskId: 'task-1',
          status: 'downloading',
          extensionId: 'demo.ext',
          provider: 'open_vsx',
          totalBytes: 100,
          downloadedBytes: 50,
          percent: 50,
          speedBps: 1000,
        },
      });
      return unlisten;
    });
    mockListen.mockImplementationOnce(async (_event, handler) => {
      handler({
        event: 'lsp-server-status-changed',
        id: 3,
        payload: {
          languageId: 'typescript',
          status: 'starting',
        },
      });
      return unlisten;
    });

    await expect(lspListenInstallProgress(installCallback)).resolves.toBe(unlisten);
    await expect(lspListenServerStatusChanged(statusCallback)).resolves.toBe(unlisten);
    expect(installCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 'task-1',
        status: 'downloading',
      })
    );
    expect(statusCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        languageId: 'typescript',
        status: 'starting',
      })
    );
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
