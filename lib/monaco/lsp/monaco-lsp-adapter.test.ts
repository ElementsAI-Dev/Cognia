/**
 * @jest-environment jsdom
 */

jest.mock('./lsp-client', () => ({
  hasLspCapability: jest.fn((capability: unknown) => {
    if (typeof capability === 'boolean') {
      return capability;
    }
    return !!capability && typeof capability === 'object';
  }),
  isTauriRuntime: jest.fn(),
  lspCancelRequest: jest.fn(),
  lspChangeDocument: jest.fn(),
  lspCloseDocument: jest.fn(),
  lspCodeActions: jest.fn(),
  lspCompletion: jest.fn(),
  lspDefinition: jest.fn(),
  lspDocumentSymbols: jest.fn(),
  lspExecuteCommand: jest.fn(),
  lspFormatDocument: jest.fn(),
  lspHover: jest.fn(),
  lspListenDiagnostics: jest.fn(),
  lspOpenDocument: jest.fn(),
  lspResolveCodeAction: jest.fn(),
  lspSeverityToMonaco: jest.fn((severity?: number) => (severity === 1 ? 8 : 2)),
  lspShutdownSession: jest.fn(),
  lspStartSession: jest.fn(),
  lspWorkspaceSymbols: jest.fn(),
}));

import type * as Monaco from 'monaco-editor';
import { createMonacoLspAdapter } from './monaco-lsp-adapter';
import {
  isTauriRuntime,
  lspCancelRequest,
  lspChangeDocument,
  lspCloseDocument,
  lspCodeActions,
  lspCompletion,
  lspDefinition,
  lspDocumentSymbols,
  lspExecuteCommand,
  lspFormatDocument,
  lspHover,
  lspListenDiagnostics,
  lspOpenDocument,
  lspResolveCodeAction,
  lspShutdownSession,
  lspStartSession,
  lspWorkspaceSymbols,
} from './lsp-client';
import type { LspPublishDiagnosticsEvent } from '@/types/designer/lsp';

describe('monaco-lsp-adapter', () => {
  const mockIsTauriRuntime = isTauriRuntime as jest.MockedFunction<typeof isTauriRuntime>;
  const mockLspCancelRequest = lspCancelRequest as jest.MockedFunction<typeof lspCancelRequest>;
  const mockLspStartSession = lspStartSession as jest.MockedFunction<typeof lspStartSession>;
  const mockLspOpenDocument = lspOpenDocument as jest.MockedFunction<typeof lspOpenDocument>;
  const mockLspChangeDocument = lspChangeDocument as jest.MockedFunction<typeof lspChangeDocument>;
  const mockLspCompletion = lspCompletion as jest.MockedFunction<typeof lspCompletion>;
  const mockLspHover = lspHover as jest.MockedFunction<typeof lspHover>;
  const mockLspDefinition = lspDefinition as jest.MockedFunction<typeof lspDefinition>;
  const mockLspDocumentSymbols = lspDocumentSymbols as jest.MockedFunction<typeof lspDocumentSymbols>;
  const mockLspExecuteCommand = lspExecuteCommand as jest.MockedFunction<typeof lspExecuteCommand>;
  const mockLspCodeActions = lspCodeActions as jest.MockedFunction<typeof lspCodeActions>;
  const mockLspFormatDocument = lspFormatDocument as jest.MockedFunction<typeof lspFormatDocument>;
  const mockLspResolveCodeAction = lspResolveCodeAction as jest.MockedFunction<typeof lspResolveCodeAction>;
  const mockLspListenDiagnostics = lspListenDiagnostics as jest.MockedFunction<typeof lspListenDiagnostics>;
  const mockLspCloseDocument = lspCloseDocument as jest.MockedFunction<typeof lspCloseDocument>;
  const mockLspShutdownSession = lspShutdownSession as jest.MockedFunction<typeof lspShutdownSession>;
  const mockLspWorkspaceSymbols = lspWorkspaceSymbols as jest.MockedFunction<typeof lspWorkspaceSymbols>;

  let diagnosticsCallback: ((event: LspPublishDiagnosticsEvent) => void) | null = null;
  const unlistenDiagnostics = jest.fn();
  const modelChangeDisposable = { dispose: jest.fn() };
  let modelChangeHandler:
    | ((event: { changes: Array<{ range: Monaco.IRange; rangeLength: number; text: string }> }) => void)
    | null = null;

  const mockModel = {
    uri: { toString: () => 'file:///workspace/index.tsx' },
    getValue: jest.fn(() => 'const value = 1;'),
    getWordUntilPosition: jest.fn(() => ({ startColumn: 1, endColumn: 1 })),
    onDidChangeContent: jest.fn(
      (
        handler: (event: {
          changes: Array<{ range: Monaco.IRange; rangeLength: number; text: string }>;
        }) => void
      ) => {
      modelChangeHandler = handler;
      return modelChangeDisposable;
      }
    ),
  };

  const mockEditor = {
    getModel: jest.fn(() => mockModel),
  };

  const completionDisposable = { dispose: jest.fn() };
  const hoverDisposable = { dispose: jest.fn() };
  const definitionDisposable = { dispose: jest.fn() };
  const symbolDisposable = { dispose: jest.fn() };
  const codeActionDisposable = { dispose: jest.fn() };
  const formatDisposable = { dispose: jest.fn() };

  const mockMonaco = {
    languages: {
      registerCompletionItemProvider: jest.fn(() => completionDisposable),
      registerHoverProvider: jest.fn(() => hoverDisposable),
      registerDefinitionProvider: jest.fn(() => definitionDisposable),
      registerDocumentSymbolProvider: jest.fn(() => symbolDisposable),
      registerCodeActionProvider: jest.fn(() => codeActionDisposable),
      registerDocumentFormattingEditProvider: jest.fn(() => formatDisposable),
      CompletionItemKind: {
        Text: 1,
        Method: 2,
        Function: 3,
        Constructor: 4,
        Field: 5,
        Variable: 6,
        Class: 7,
        Interface: 8,
        Module: 9,
        Property: 10,
        Unit: 11,
        Value: 12,
        Enum: 13,
        Keyword: 14,
        Snippet: 15,
        Color: 16,
        File: 17,
        Reference: 18,
        Folder: 19,
        EnumMember: 20,
        Constant: 21,
        Struct: 22,
        Event: 23,
        Operator: 24,
        TypeParameter: 25,
      },
      SymbolKind: {
        Variable: 13,
      },
    },
    editor: {
      registerCommand: jest.fn(() => ({ dispose: jest.fn() })),
      setModelMarkers: jest.fn(),
    },
    Uri: {
      parse: jest.fn((value: string) => ({ toString: () => value })),
    },
    Range: class {
      constructor(
        public startLineNumber: number,
        public startColumn: number,
        public endLineNumber: number,
        public endColumn: number
      ) {}
    },
  } as unknown as typeof Monaco;

  beforeEach(() => {
    jest.clearAllMocks();
    diagnosticsCallback = null;
    modelChangeHandler = null;

    mockIsTauriRuntime.mockReturnValue(true);
    mockLspStartSession.mockResolvedValue({
      sessionId: 'session-1',
      capabilities: {
        completionProvider: { triggerCharacters: ['.'] },
        hoverProvider: true,
        definitionProvider: true,
        documentSymbolProvider: true,
        codeActionProvider: { codeActionKinds: ['quickfix'] },
        documentFormattingProvider: true,
        workspaceSymbolProvider: true,
        textDocumentSync: 2,
      },
    });
    mockLspOpenDocument.mockResolvedValue(undefined);
    mockLspCancelRequest.mockResolvedValue(undefined);
    mockLspChangeDocument.mockResolvedValue(undefined);
    mockLspCompletion.mockResolvedValue({ items: [{ label: 'foo', kind: 3 }] });
    mockLspHover.mockResolvedValue({ contents: 'hover info' });
    mockLspDefinition.mockResolvedValue([
      {
        uri: 'file:///workspace/index.tsx',
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 3 },
        },
      },
    ]);
    mockLspDocumentSymbols.mockResolvedValue([]);
    mockLspExecuteCommand.mockResolvedValue(undefined);
    mockLspCodeActions.mockResolvedValue([]);
    mockLspFormatDocument.mockResolvedValue([]);
    mockLspResolveCodeAction.mockImplementation(async (_sessionId, action) => action);
    mockLspListenDiagnostics.mockImplementation(async (callback) => {
      diagnosticsCallback = callback;
      return unlistenDiagnostics;
    });
    mockLspCloseDocument.mockResolvedValue(undefined);
    mockLspShutdownSession.mockResolvedValue(undefined);
    mockLspWorkspaceSymbols.mockResolvedValue([]);
  });

  it('falls back when tauri runtime is unavailable', async () => {
    mockIsTauriRuntime.mockReturnValue(false);
    const onStatusChange = jest.fn();

    const adapter = createMonacoLspAdapter({
      monaco: mockMonaco,
      editor: mockEditor as unknown as Monaco.editor.IStandaloneCodeEditor,
      languageId: 'typescript',
      onStatusChange,
    });

    const result = await adapter.start();

    expect(result.connected).toBe(false);
    expect(onStatusChange).toHaveBeenCalledWith('fallback', 'Tauri runtime unavailable');
    expect(mockLspStartSession).not.toHaveBeenCalled();
  });

  it('connects, registers capability-backed providers, syncs diagnostics, and disposes cleanly', async () => {
    const onStatusChange = jest.fn();
    const adapter = createMonacoLspAdapter({
      monaco: mockMonaco,
      editor: mockEditor as unknown as Monaco.editor.IStandaloneCodeEditor,
      languageId: 'typescript',
      onStatusChange,
    });

    const result = await adapter.start();

    expect(result.connected).toBe(true);
    expect(result.features).toEqual({
      completion: true,
      hover: true,
      definition: true,
      documentSymbols: true,
      codeActions: true,
      formatting: true,
      workspaceSymbols: true,
    });
    expect(mockLspStartSession).toHaveBeenCalledWith({
      language: 'typescript',
      rootUri: 'file:///workspace',
    });
    expect(mockLspOpenDocument).toHaveBeenCalledWith('session-1', {
      uri: 'file:///workspace/index.tsx',
      languageId: 'typescript',
      version: 1,
      text: 'const value = 1;',
    });
    expect(mockMonaco.languages.registerCompletionItemProvider).toHaveBeenCalled();
    expect(mockMonaco.languages.registerHoverProvider).toHaveBeenCalled();
    expect(mockMonaco.languages.registerDefinitionProvider).toHaveBeenCalled();
    expect(mockMonaco.languages.registerDocumentSymbolProvider).toHaveBeenCalled();
    expect(mockMonaco.languages.registerCodeActionProvider).toHaveBeenCalled();
    expect(mockMonaco.languages.registerDocumentFormattingEditProvider).toHaveBeenCalled();
    expect(onStatusChange).toHaveBeenLastCalledWith('connected', undefined);

    expect(modelChangeHandler).toBeTruthy();
    await modelChangeHandler?.({
      changes: [
        {
          range: {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 2,
          },
          rangeLength: 1,
          text: 'b',
        },
      ],
    });
    expect(mockLspChangeDocument).toHaveBeenCalledWith(
      'session-1',
      { uri: 'file:///workspace/index.tsx', version: 2 },
      'const value = 1;',
      [
        {
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 1 },
          },
          rangeLength: 1,
          text: 'b',
        },
      ]
    );

    diagnosticsCallback?.({
      sessionId: 'session-1',
      uri: 'file:///workspace/index.tsx',
      diagnostics: [
        {
          message: 'bad type',
          severity: 1,
          code: 1234,
          source: 'tsserver',
          range: {
            start: { line: 0, character: 1 },
            end: { line: 0, character: 5 },
          },
        },
      ],
    });

    expect(mockMonaco.editor.setModelMarkers).toHaveBeenCalledWith(
      mockModel,
      'lsp',
      expect.arrayContaining([
        expect.objectContaining({
          code: '1234',
          message: 'bad type',
          severity: 8,
        }),
      ])
    );

    await adapter.dispose();

    expect(modelChangeDisposable.dispose).toHaveBeenCalled();
    expect(completionDisposable.dispose).toHaveBeenCalled();
    expect(hoverDisposable.dispose).toHaveBeenCalled();
    expect(definitionDisposable.dispose).toHaveBeenCalled();
    expect(symbolDisposable.dispose).toHaveBeenCalled();
    expect(codeActionDisposable.dispose).toHaveBeenCalled();
    expect(formatDisposable.dispose).toHaveBeenCalled();
    expect(unlistenDiagnostics).toHaveBeenCalled();
    expect(mockLspCloseDocument).toHaveBeenCalledWith('session-1', {
      uri: 'file:///workspace/index.tsx',
    });
    expect(mockLspShutdownSession).toHaveBeenCalledWith('session-1');
  });

  it('only registers providers for advertised capabilities', async () => {
    mockLspStartSession.mockResolvedValueOnce({
      sessionId: 'session-1',
      capabilities: {
        completionProvider: { triggerCharacters: ['.'] },
        hoverProvider: false,
        definitionProvider: false,
        documentSymbolProvider: false,
        codeActionProvider: false,
        documentFormattingProvider: false,
      },
    });

    const adapter = createMonacoLspAdapter({
      monaco: mockMonaco,
      editor: mockEditor as unknown as Monaco.editor.IStandaloneCodeEditor,
      languageId: 'typescript',
    });

    const result = await adapter.start();

    expect(result.features).toEqual({
      completion: true,
      hover: false,
      definition: false,
      documentSymbols: false,
      codeActions: false,
      formatting: false,
      workspaceSymbols: false,
    });
    expect(mockMonaco.languages.registerCompletionItemProvider).toHaveBeenCalledTimes(1);
    expect(mockMonaco.languages.registerHoverProvider).not.toHaveBeenCalled();
    expect(mockMonaco.languages.registerDefinitionProvider).not.toHaveBeenCalled();
    expect(mockMonaco.languages.registerDocumentSymbolProvider).not.toHaveBeenCalled();
    expect(mockMonaco.languages.registerCodeActionProvider).not.toHaveBeenCalled();
    expect(mockMonaco.languages.registerDocumentFormattingEditProvider).not.toHaveBeenCalled();
  });

  it('queries workspace symbols only when capability is available', async () => {
    const adapter = createMonacoLspAdapter({
      monaco: mockMonaco,
      editor: mockEditor as unknown as Monaco.editor.IStandaloneCodeEditor,
      languageId: 'typescript',
    });

    await adapter.start();
    mockLspWorkspaceSymbols.mockResolvedValueOnce([
      {
        name: 'MyComponent',
        kind: 5,
        location: {
          uri: 'file:///workspace/index.tsx',
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 11 },
          },
        },
      },
    ]);

    await expect(adapter.workspaceSymbols('MyComp')).resolves.toHaveLength(1);
    expect(mockLspWorkspaceSymbols).toHaveBeenCalledWith(
      'session-1',
      'MyComp',
      expect.objectContaining({
        clientRequestId: expect.stringMatching(/^workspaceSymbols:/),
        timeoutMs: 15000,
      })
    );

    mockLspStartSession.mockResolvedValueOnce({
      sessionId: 'session-2',
      capabilities: {
        workspaceSymbolProvider: false,
      },
    });
    const noWorkspaceAdapter = createMonacoLspAdapter({
      monaco: mockMonaco,
      editor: mockEditor as unknown as Monaco.editor.IStandaloneCodeEditor,
      languageId: 'typescript',
    });
    await noWorkspaceAdapter.start();
    await expect(noWorkspaceAdapter.workspaceSymbols('x')).resolves.toEqual([]);
  });

  it('falls back to full document sync when protocol v2 is disabled', async () => {
    const adapter = createMonacoLspAdapter({
      monaco: mockMonaco,
      editor: mockEditor as unknown as Monaco.editor.IStandaloneCodeEditor,
      languageId: 'typescript',
      protocolV2Enabled: false,
    });

    await adapter.start();
    await modelChangeHandler?.({
      changes: [
        {
          range: {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 2,
          },
          rangeLength: 1,
          text: 'x',
        },
      ],
    });

    expect(mockLspChangeDocument).toHaveBeenCalledWith(
      'session-1',
      { uri: 'file:///workspace/index.tsx', version: 2 },
      'const value = 1;',
      undefined
    );
  });

  it('cancels completion request when monaco token is canceled', async () => {
    let resolveCompletion: ((value: { items: Array<{ label: string; kind: number }> }) => void) | undefined;
    const deferred = new Promise<{ items: Array<{ label: string; kind: number }> }>((resolve) => {
      resolveCompletion = resolve;
    });
    mockLspCompletion.mockReturnValueOnce(deferred);

    const adapter = createMonacoLspAdapter({
      monaco: mockMonaco,
      editor: mockEditor as unknown as Monaco.editor.IStandaloneCodeEditor,
      languageId: 'typescript',
    });
    await adapter.start();

    const completionProvider = (mockMonaco.languages.registerCompletionItemProvider as jest.Mock).mock.calls[0][1];
    const listeners: Array<() => void> = [];
    const token = {
      isCancellationRequested: false,
      onCancellationRequested: (callback: () => void) => {
        listeners.push(callback);
        return { dispose: jest.fn() };
      },
    };

    const providePromise = completionProvider.provideCompletionItems(
      mockModel,
      { lineNumber: 1, column: 1 },
      undefined,
      token
    );

    listeners.forEach((listener) => listener());
    resolveCompletion?.({
      items: [{ label: 'foo', kind: 3 }],
    });
    await providePromise;

    expect(mockLspCancelRequest).toHaveBeenCalledWith(
      'session-1',
      expect.stringMatching(/^completion:/)
    );
  });

  it('queues didChange notifications in order', async () => {
    let resolveFirst: (() => void) | undefined;
    mockLspChangeDocument.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveFirst = resolve;
        })
    );
    mockLspChangeDocument.mockResolvedValueOnce(undefined);

    const adapter = createMonacoLspAdapter({
      monaco: mockMonaco,
      editor: mockEditor as unknown as Monaco.editor.IStandaloneCodeEditor,
      languageId: 'typescript',
    });
    await adapter.start();

    modelChangeHandler?.({
      changes: [
        {
          range: {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 2,
          },
          rangeLength: 1,
          text: 'x',
        },
      ],
    });
    await Promise.resolve();
    await Promise.resolve();
    modelChangeHandler?.({
      changes: [
        {
          range: {
            startLineNumber: 1,
            startColumn: 2,
            endLineNumber: 1,
            endColumn: 3,
          },
          rangeLength: 1,
          text: 'y',
        },
      ],
    });

    expect(mockLspChangeDocument).toHaveBeenCalledTimes(1);
    resolveFirst?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockLspChangeDocument).toHaveBeenCalledTimes(2);
    await adapter.dispose();
  });

  it('ignores stale diagnostics by version', async () => {
    const adapter = createMonacoLspAdapter({
      monaco: mockMonaco,
      editor: mockEditor as unknown as Monaco.editor.IStandaloneCodeEditor,
      languageId: 'typescript',
    });
    await adapter.start();

    await modelChangeHandler?.({
      changes: [
        {
          range: {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 2,
          },
          rangeLength: 1,
          text: 'x',
        },
      ],
    });
    (mockMonaco.editor.setModelMarkers as jest.Mock).mockClear();

    diagnosticsCallback?.({
      sessionId: 'session-1',
      uri: 'file:///workspace/index.tsx',
      version: 1,
      diagnostics: [
        {
          message: 'stale',
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 1 },
          },
        },
      ],
    });

    expect(mockMonaco.editor.setModelMarkers).not.toHaveBeenCalled();
    await adapter.dispose();
  });
});
