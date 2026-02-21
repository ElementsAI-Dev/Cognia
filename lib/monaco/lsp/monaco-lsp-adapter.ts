/**
 * Monaco adapter over Tauri LSP commands.
 */

import type * as Monaco from 'monaco-editor';
import type {
  LspCapabilities,
  LspCodeAction,
  LspCodeActionOrCommand,
  LspCommand,
  LspDocumentHighlight,
  LspDiagnostic,
  LspDocumentSymbol,
  LspInlayHint,
  LspProvider,
  LspRange,
  LspSemanticTokens,
  LspRequestMeta,
  LspSessionStatus,
  LspSignatureHelp,
  LspSymbolInformation,
  LspTextDocumentContentChangeEvent,
  LspTextDocumentSyncOptions,
  LspTextEdit,
  LspWorkspaceEdit,
} from '@/types/designer/lsp';
import {
  hasLspCapability,
  isTauriRuntime,
  lspCancelRequest,
  lspChangeDocument,
  lspCloseDocument,
  lspCodeActions,
  lspCompletion,
  lspDefinition,
  lspDocumentHighlights,
  lspDocumentSymbols,
  lspExecuteCommand,
  lspFormatDocument,
  lspHover,
  lspImplementation,
  lspInlayHints,
  lspListenDiagnostics,
  lspOpenDocument,
  lspReferences,
  lspRename,
  lspResolveCodeAction,
  lspSemanticTokensFull,
  lspSignatureHelp,
  lspSeverityToMonaco,
  lspShutdownSession,
  lspStartSession,
  lspTypeDefinition,
  lspWorkspaceSymbols,
} from './lsp-client';

export interface MonacoLspFeatureSupport {
  completion: boolean;
  hover: boolean;
  definition: boolean;
  references: boolean;
  rename: boolean;
  implementation: boolean;
  typeDefinition: boolean;
  signatureHelp: boolean;
  documentHighlight: boolean;
  documentSymbols: boolean;
  codeActions: boolean;
  formatting: boolean;
  workspaceSymbols: boolean;
  inlayHints: boolean;
  semanticTokens: boolean;
}

export interface MonacoLspStartResult {
  connected: boolean;
  capabilities: LspCapabilities;
  features: MonacoLspFeatureSupport;
}

export interface MonacoLspAdapterOptions {
  monaco: typeof Monaco;
  editor: Monaco.editor.IStandaloneCodeEditor;
  languageId: string;
  rootUri?: string;
  protocolV2Enabled?: boolean;
  extendedFeaturesEnabled?: boolean;
  autoInstall?: boolean;
  preferredProviders?: LspProvider[];
  allowFallback?: boolean;
  onStatusChange?: (status: LspSessionStatus, detail?: string) => void;
}

export interface MonacoLspAdapter {
  start: () => Promise<MonacoLspStartResult>;
  dispose: () => Promise<void>;
  getFeatureSupport: () => MonacoLspFeatureSupport;
  workspaceSymbols: (query: string) => Promise<LspSymbolInformation[]>;
}

type MonacoCodeActionWithRaw = Monaco.languages.CodeAction & { __lspRawAction?: LspCodeAction };

const EMPTY_FEATURE_SUPPORT: MonacoLspFeatureSupport = {
  completion: false,
  hover: false,
  definition: false,
  references: false,
  rename: false,
  implementation: false,
  typeDefinition: false,
  signatureHelp: false,
  documentHighlight: false,
  documentSymbols: false,
  codeActions: false,
  formatting: false,
  workspaceSymbols: false,
  inlayHints: false,
  semanticTokens: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toMonacoRange(
  monaco: typeof Monaco,
  range: LspRange
): Monaco.IRange {
  return new monaco.Range(
    range.start.line + 1,
    range.start.character + 1,
    range.end.line + 1,
    range.end.character + 1
  );
}

function toLspRange(range: Monaco.IRange): LspRange {
  return {
    start: {
      line: Math.max(0, range.startLineNumber - 1),
      character: Math.max(0, range.startColumn - 1),
    },
    end: {
      line: Math.max(0, range.endLineNumber - 1),
      character: Math.max(0, range.endColumn - 1),
    },
  };
}

function toLspContentChanges(
  changes: readonly Monaco.editor.IModelContentChange[]
): LspTextDocumentContentChangeEvent[] {
  return changes.map((change) => ({
    range: {
      start: {
        line: Math.max(0, change.range.startLineNumber - 1),
        character: Math.max(0, change.range.startColumn - 1),
      },
      end: {
        line: Math.max(0, change.range.endLineNumber - 1),
        character: Math.max(0, change.range.endColumn - 1),
      },
    },
    rangeLength: change.rangeLength,
    text: change.text,
  }));
}

function resolveTextDocumentSyncKind(
  capabilities: LspCapabilities,
  protocolV2Enabled: boolean
): 'full' | 'incremental' {
  if (!protocolV2Enabled) {
    return 'full';
  }

  const sync = capabilities.textDocumentSync;
  if (sync === 2) {
    return 'incremental';
  }
  if (sync === 0 || sync === 1) {
    return 'full';
  }
  if (isRecord(sync)) {
    const change = (sync as LspTextDocumentSyncOptions).change;
    if (change === 2) {
      return 'incremental';
    }
  }
  return 'full';
}

function hoverToMarkdown(
  contents?: string | { kind?: string; value?: string } | Array<string | { kind?: string; value?: string }>
): string {
  if (!contents) {
    return '';
  }
  if (typeof contents === 'string') {
    return contents;
  }
  if (Array.isArray(contents)) {
    return contents
      .map((item) => (typeof item === 'string' ? item : item.value || ''))
      .filter(Boolean)
      .join('\n\n');
  }
  return contents.value || '';
}

function mapCompletionKind(
  monaco: typeof Monaco,
  kind?: number
): Monaco.languages.CompletionItemKind {
  switch (kind) {
    case 1:
      return monaco.languages.CompletionItemKind.Text;
    case 2:
      return monaco.languages.CompletionItemKind.Method;
    case 3:
      return monaco.languages.CompletionItemKind.Function;
    case 4:
      return monaco.languages.CompletionItemKind.Constructor;
    case 5:
      return monaco.languages.CompletionItemKind.Field;
    case 6:
      return monaco.languages.CompletionItemKind.Variable;
    case 7:
      return monaco.languages.CompletionItemKind.Class;
    case 8:
      return monaco.languages.CompletionItemKind.Interface;
    case 9:
      return monaco.languages.CompletionItemKind.Module;
    case 10:
      return monaco.languages.CompletionItemKind.Property;
    case 11:
      return monaco.languages.CompletionItemKind.Unit;
    case 12:
      return monaco.languages.CompletionItemKind.Value;
    case 13:
      return monaco.languages.CompletionItemKind.Enum;
    case 14:
      return monaco.languages.CompletionItemKind.Keyword;
    case 15:
      return monaco.languages.CompletionItemKind.Snippet;
    case 16:
      return monaco.languages.CompletionItemKind.Color;
    case 17:
      return monaco.languages.CompletionItemKind.File;
    case 18:
      return monaco.languages.CompletionItemKind.Reference;
    case 19:
      return monaco.languages.CompletionItemKind.Folder;
    case 20:
      return monaco.languages.CompletionItemKind.EnumMember;
    case 21:
      return monaco.languages.CompletionItemKind.Constant;
    case 22:
      return monaco.languages.CompletionItemKind.Struct;
    case 23:
      return monaco.languages.CompletionItemKind.Event;
    case 24:
      return monaco.languages.CompletionItemKind.Operator;
    case 25:
      return monaco.languages.CompletionItemKind.TypeParameter;
    default:
      return monaco.languages.CompletionItemKind.Text;
  }
}

function mapSymbolKind(
  monaco: typeof Monaco,
  kind?: number
): Monaco.languages.SymbolKind {
  if (typeof kind === 'number' && kind > 0) {
    return kind as Monaco.languages.SymbolKind;
  }
  return monaco.languages.SymbolKind.Variable;
}

function markerSeverityToLsp(severity?: number): number | undefined {
  switch (severity) {
    case 8:
      return 1;
    case 4:
      return 2;
    case 2:
      return 3;
    case 1:
      return 4;
    default:
      return undefined;
  }
}

function markerCodeToLsp(code: Monaco.editor.IMarkerData['code']): string | number | undefined {
  if (typeof code === 'string' || typeof code === 'number') {
    return code;
  }
  if (isRecord(code) && (typeof code.value === 'string' || typeof code.value === 'number')) {
    return code.value;
  }
  return undefined;
}

function toMonacoMarkerData(
  diagnostic: LspDiagnostic
): Monaco.editor.IMarkerData {
  return {
    severity: lspSeverityToMonaco(diagnostic.severity),
    message: diagnostic.message,
    source: diagnostic.source,
    code:
      typeof diagnostic.code === 'number'
        ? String(diagnostic.code)
        : diagnostic.code,
    startLineNumber: diagnostic.range.start.line + 1,
    startColumn: diagnostic.range.start.character + 1,
    endLineNumber: diagnostic.range.end.line + 1,
    endColumn: diagnostic.range.end.character + 1,
  };
}

function toMonacoCommand(
  command: LspCommand | undefined,
  executeCommandId: string
): Monaco.languages.Command | undefined {
  if (!command || !command.command) {
    return undefined;
  }
  return {
    id: executeCommandId,
    title: command.title ?? command.command,
    arguments: [
      {
        command: command.command,
        arguments: command.arguments,
      },
    ],
  };
}

function toMonacoWorkspaceEdit(
  monaco: typeof Monaco,
  edit: LspWorkspaceEdit | undefined
): Monaco.languages.WorkspaceEdit | undefined {
  if (!edit?.changes && !edit?.documentChanges) {
    return undefined;
  }

  const edits: Monaco.languages.IWorkspaceTextEdit[] = [];
  if (edit.changes) {
    for (const [uri, textEdits] of Object.entries(edit.changes)) {
      for (const textEdit of textEdits) {
        edits.push({
          resource: monaco.Uri.parse(uri),
          textEdit: {
            range: toMonacoRange(monaco, textEdit.range),
            text: textEdit.newText,
          },
          versionId: undefined,
        });
      }
    }
  }

  if (edit.documentChanges) {
    for (const change of edit.documentChanges) {
      const uri = change.textDocument?.uri;
      if (!uri || !change.edits) {
        continue;
      }

      for (const textEdit of change.edits) {
        edits.push({
          resource: monaco.Uri.parse(uri),
          textEdit: {
            range: toMonacoRange(monaco, textEdit.range),
            text: textEdit.newText,
          },
          versionId: undefined,
        });
      }
    }
  }

  if (edits.length === 0) {
    return undefined;
  }
  return { edits };
}

function toMonacoLocations(
  monaco: typeof Monaco,
  locations: Array<{ uri: string; range: LspRange }>
): Monaco.languages.Location[] {
  return locations.map((location) => ({
    uri: monaco.Uri.parse(location.uri),
    range: toMonacoRange(monaco, location.range),
  }));
}

function toMonacoDocumentHighlights(
  monaco: typeof Monaco,
  highlights: LspDocumentHighlight[]
): Monaco.languages.DocumentHighlight[] {
  return highlights.map((highlight) => ({
    range: toMonacoRange(monaco, highlight.range),
    kind:
      highlight.kind === 2
        ? monaco.languages.DocumentHighlightKind.Write
        : highlight.kind === 3
          ? monaco.languages.DocumentHighlightKind.Text
          : monaco.languages.DocumentHighlightKind.Read,
  }));
}

function toMonacoSignatureHelp(
  signatureHelp: LspSignatureHelp
): Monaco.languages.SignatureHelpResult {
  return {
    value: {
      signatures: signatureHelp.signatures.map((signature) => ({
        label: signature.label,
        documentation:
          typeof signature.documentation === 'string'
            ? signature.documentation
            : signature.documentation?.value,
        parameters:
          signature.parameters?.map((parameter) => ({
            label: parameter.label,
            documentation:
              typeof parameter.documentation === 'string'
                ? parameter.documentation
                : parameter.documentation?.value,
          })) ?? [],
      })),
      activeSignature: signatureHelp.activeSignature ?? 0,
      activeParameter: signatureHelp.activeParameter ?? 0,
    },
    dispose: () => {},
  };
}

function toMonacoInlayHints(
  monaco: typeof Monaco,
  hints: LspInlayHint[]
): Monaco.languages.InlayHintList {
  return {
    hints: hints.map((hint) => ({
      position: {
        lineNumber: hint.position.line + 1,
        column: hint.position.character + 1,
      },
      label:
        typeof hint.label === 'string'
          ? hint.label
          : hint.label.map((part) => ({
              label: part.value,
              tooltip:
                typeof part.tooltip === 'string'
                  ? part.tooltip
                  : part.tooltip?.value,
              command: undefined,
              location: part.location
                ? {
                    uri: monaco.Uri.parse(part.location.uri),
                    range: toMonacoRange(monaco, part.location.range),
                  }
                : undefined,
            })),
      kind:
        hint.kind === 2
          ? monaco.languages.InlayHintKind.Type
          : monaco.languages.InlayHintKind.Parameter,
      paddingLeft: hint.paddingLeft,
      paddingRight: hint.paddingRight,
      tooltip: typeof hint.tooltip === 'string' ? hint.tooltip : hint.tooltip?.value,
      textEdits: hint.textEdits?.map((edit) => ({
        range: {
          startLineNumber: edit.range.start.line + 1,
          startColumn: edit.range.start.character + 1,
          endLineNumber: edit.range.end.line + 1,
          endColumn: edit.range.end.character + 1,
        },
        text: edit.newText,
      })),
    })),
    dispose: () => {},
  };
}

function toMonacoSemanticTokens(tokens: LspSemanticTokens): Monaco.languages.SemanticTokens {
  return {
    resultId: tokens.resultId,
    data: new Uint32Array(tokens.data ?? []),
  };
}

function isLspCommand(value: LspCodeActionOrCommand): value is LspCommand {
  return isRecord(value) && typeof value.command === 'string';
}

function isLspSymbolInformation(
  value: LspDocumentSymbol | LspSymbolInformation
): value is LspSymbolInformation {
  return isRecord(value) && isRecord(value.location);
}

function toMonacoDocumentSymbol(
  monaco: typeof Monaco,
  symbol: LspDocumentSymbol
): Monaco.languages.DocumentSymbol {
  return {
    name: symbol.name,
    detail: symbol.detail ?? '',
    kind: mapSymbolKind(monaco, symbol.kind),
    tags: [],
    range: toMonacoRange(monaco, symbol.range),
    selectionRange: toMonacoRange(monaco, symbol.selectionRange),
    children: symbol.children?.map((child) => toMonacoDocumentSymbol(monaco, child)) ?? [],
  };
}

function toMonacoDocumentSymbolFromInformation(
  monaco: typeof Monaco,
  symbol: LspSymbolInformation
): Monaco.languages.DocumentSymbol {
  return {
    name: symbol.name,
    detail: symbol.containerName ?? '',
    kind: mapSymbolKind(monaco, symbol.kind),
    tags: [],
    range: toMonacoRange(monaco, symbol.location.range),
    selectionRange: toMonacoRange(monaco, symbol.location.range),
    children: [],
  };
}

function toMonacoCodeAction(
  monaco: typeof Monaco,
  action: LspCodeAction,
  executeCommandId: string
): MonacoCodeActionWithRaw {
  const diagnostics = action.diagnostics?.map(toMonacoMarkerData);
  const disabledReason =
    typeof action.disabled === 'string'
      ? action.disabled
      : action.disabled?.reason;

  const monacoAction: MonacoCodeActionWithRaw = {
    title: action.title,
    kind: action.kind,
    diagnostics,
    edit: toMonacoWorkspaceEdit(monaco, action.edit),
    command: toMonacoCommand(action.command, executeCommandId),
    isPreferred: action.isPreferred,
    disabled: disabledReason,
  };
  monacoAction.__lspRawAction = action;
  return monacoAction;
}

function commandToMonacoCodeAction(
  command: LspCommand,
  executeCommandId: string
): Monaco.languages.CodeAction {
  return {
    title: command.title ?? command.command,
    command: {
      id: executeCommandId,
      title: command.title ?? command.command,
      arguments: [
        {
          command: command.command,
          arguments: command.arguments,
        },
      ],
    },
    kind: 'quickfix',
  };
}

function extractCodeActionKinds(
  capability: LspCapabilities['codeActionProvider']
): string[] {
  if (!isRecord(capability)) {
    return [];
  }

  const kinds = capability.codeActionKinds;
  if (!Array.isArray(kinds)) {
    return [];
  }

  return kinds.filter((kind): kind is string => typeof kind === 'string');
}

function resolveFeatureSupport(
  capabilities: LspCapabilities,
  extendedFeaturesEnabled: boolean
): MonacoLspFeatureSupport {
  return {
    completion: !!capabilities.completionProvider,
    hover: hasLspCapability(capabilities.hoverProvider),
    definition: hasLspCapability(capabilities.definitionProvider),
    references: extendedFeaturesEnabled && hasLspCapability(capabilities.referencesProvider),
    rename: extendedFeaturesEnabled && hasLspCapability(capabilities.renameProvider),
    implementation:
      extendedFeaturesEnabled && hasLspCapability(capabilities.implementationProvider),
    typeDefinition:
      extendedFeaturesEnabled && hasLspCapability(capabilities.typeDefinitionProvider),
    signatureHelp:
      extendedFeaturesEnabled && hasLspCapability(capabilities.signatureHelpProvider),
    documentHighlight:
      extendedFeaturesEnabled && hasLspCapability(capabilities.documentHighlightProvider),
    documentSymbols: hasLspCapability(capabilities.documentSymbolProvider),
    codeActions: hasLspCapability(capabilities.codeActionProvider),
    formatting: hasLspCapability(capabilities.documentFormattingProvider),
    workspaceSymbols: hasLspCapability(capabilities.workspaceSymbolProvider),
    inlayHints: extendedFeaturesEnabled && hasLspCapability(capabilities.inlayHintProvider),
    semanticTokens:
      extendedFeaturesEnabled && hasLspCapability(capabilities.semanticTokensProvider),
  };
}

export function createMonacoLspAdapter(options: MonacoLspAdapterOptions): MonacoLspAdapter {
  const {
    monaco,
    editor,
    languageId,
    rootUri = 'file:///workspace',
    protocolV2Enabled = true,
    extendedFeaturesEnabled = true,
    autoInstall = true,
    preferredProviders,
    allowFallback = true,
    onStatusChange,
  } = options;
  const disposables: Monaco.IDisposable[] = [];
  let unlistenDiagnostics: (() => void) | null = null;
  let sessionId: string | null = null;
  let executeCommandId: string | null = null;
  let currentVersion = 1;
  let currentCapabilities: LspCapabilities = {};
  let currentFeatureSupport: MonacoLspFeatureSupport = { ...EMPTY_FEATURE_SUPPORT };
  let syncQueue: Promise<void> = Promise.resolve();
  let nextRequestSequence = 1;
  let isDisposed = false;
  const latestRequestSerial = new Map<string, number>();
  const model = editor.getModel();

  const updateStatus = (status: LspSessionStatus, detail?: string) => {
    onStatusChange?.(status, detail);
  };

  const nextFeatureSerial = (featureKey: string): number => {
    const nextSerial = (latestRequestSerial.get(featureKey) ?? 0) + 1;
    latestRequestSerial.set(featureKey, nextSerial);
    return nextSerial;
  };

  const isStaleFeatureRequest = (featureKey: string, requestSerial: number): boolean =>
    (latestRequestSerial.get(featureKey) ?? 0) !== requestSerial;

  const nextClientRequestId = (featureKey: string): string =>
    `${featureKey}:${Date.now()}:${nextRequestSequence++}`;

  const featureTimeoutMs = (featureKey: string): number =>
    featureKey === 'workspaceSymbols' ? 15_000 : 10_000;

  const runCancelableRequest = async <T>(
    featureKey: string,
    token: Monaco.CancellationToken | undefined,
    fallback: T,
    request: (meta: LspRequestMeta) => Promise<T>
  ): Promise<T> => {
    const activeSessionId = sessionId;
    if (!activeSessionId) {
      return fallback;
    }

    const requestSerial = nextFeatureSerial(featureKey);
    const clientRequestId = nextClientRequestId(featureKey);
    const requestMeta: LspRequestMeta = {
      clientRequestId,
      timeoutMs: featureTimeoutMs(featureKey),
    };

    let cancellationRequested = false;
    const cancelRequest = () => {
      if (cancellationRequested) {
        return;
      }
      cancellationRequested = true;
      void lspCancelRequest(activeSessionId, clientRequestId).catch(() => {
        // Ignore cancellation transport errors.
      });
    };

    let cancelDisposable: Monaco.IDisposable | undefined;
    if (token) {
      if (token.isCancellationRequested) {
        cancelRequest();
        return fallback;
      }
      cancelDisposable = token.onCancellationRequested(cancelRequest);
    }

    try {
      const result = await request(requestMeta);
      if (token?.isCancellationRequested || cancellationRequested) {
        return fallback;
      }
      if (sessionId !== activeSessionId || isStaleFeatureRequest(featureKey, requestSerial)) {
        return fallback;
      }
      return result;
    } catch (error) {
      if (token?.isCancellationRequested || cancellationRequested) {
        return fallback;
      }
      throw error;
    } finally {
      cancelDisposable?.dispose();
    }
  };

  const enqueueDocumentSync = (
    text: string,
    version: number,
    changes: LspTextDocumentContentChangeEvent[]
  ) => {
    const activeSessionId = sessionId;
    if (!activeSessionId || !model || isDisposed) {
      return;
    }

    const syncKind = resolveTextDocumentSyncKind(currentCapabilities, protocolV2Enabled);
    const contentChanges = syncKind === 'incremental' ? changes : undefined;
    syncQueue = syncQueue
      .then(async () => {
        if (!sessionId || sessionId !== activeSessionId || isDisposed) {
          return;
        }
        await lspChangeDocument(
          activeSessionId,
          { uri: model.uri.toString(), version },
          text,
          contentChanges
        );
      })
      .catch(() => {
        updateStatus('fallback', 'LSP document sync failed');
      });
  };

  const start = async (): Promise<MonacoLspStartResult> => {
    if (!model || !isTauriRuntime()) {
      updateStatus('fallback', 'Tauri runtime unavailable');
      currentCapabilities = {};
      currentFeatureSupport = { ...EMPTY_FEATURE_SUPPORT };
      return {
        connected: false,
        capabilities: currentCapabilities,
        features: currentFeatureSupport,
      };
    }

    isDisposed = false;
    updateStatus('starting');
    try {
      const session = await lspStartSession({
        language: languageId,
        rootUri,
        autoInstall,
        preferredProviders,
        allowFallback,
      });
      sessionId = session.sessionId;
      executeCommandId = `cognia.lsp.executeCommand.${sessionId}`;
      currentCapabilities = session.capabilities ?? {};
      currentFeatureSupport = resolveFeatureSupport(currentCapabilities, extendedFeaturesEnabled);

      const executeCommandDisposable = monaco.editor.registerCommand(
        executeCommandId,
        (_accessor, payload?: { command?: string; arguments?: unknown[] }) => {
          if (!sessionId || !payload?.command) {
            return;
          }
          void lspExecuteCommand(sessionId, payload.command, payload.arguments);
        }
      );
      disposables.push(executeCommandDisposable);

      await lspOpenDocument(sessionId, {
        uri: model.uri.toString(),
        languageId,
        version: currentVersion,
        text: model.getValue(),
      });

      const modelChangeDisposable = model.onDidChangeContent((event) => {
        if (!sessionId) {
          return;
        }
        currentVersion += 1;
        enqueueDocumentSync(model.getValue(), currentVersion, toLspContentChanges(event.changes));
      });
      disposables.push(modelChangeDisposable);

      if (currentFeatureSupport.completion) {
        const defaultTriggers = ['.', '"', "'", '/', '<', ':'];
        const triggerCharacters = Array.isArray(currentCapabilities.completionProvider?.triggerCharacters)
          ? currentCapabilities.completionProvider.triggerCharacters.filter(
              (character): character is string => typeof character === 'string'
            )
          : defaultTriggers;

        const completionDisposable = monaco.languages.registerCompletionItemProvider(languageId, {
          triggerCharacters,
          provideCompletionItems: async (completionModel, position, _context, token) => {
            if (!sessionId) {
              return { suggestions: [] };
            }
            const activeSessionId = sessionId;
            const word = completionModel.getWordUntilPosition(position);
            const range: Monaco.IRange = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            };

            const response = await runCancelableRequest(
              'completion',
              token,
              { items: [] },
              (meta) =>
                lspCompletion(
                  activeSessionId,
                  { uri: completionModel.uri.toString() },
                  position.lineNumber - 1,
                  position.column - 1,
                  meta
                )
            );

            return {
              suggestions: response.items.map((item) => ({
                label: item.label,
                kind: mapCompletionKind(monaco, item.kind),
                detail: item.detail,
                documentation:
                  typeof item.documentation === 'string'
                    ? item.documentation
                    : item.documentation?.value,
                insertText: item.insertText || item.label,
                sortText: item.sortText,
                filterText: item.filterText,
                range,
              })),
            };
          },
        });
        disposables.push(completionDisposable);
      }

      if (currentFeatureSupport.hover) {
        const hoverDisposable = monaco.languages.registerHoverProvider(languageId, {
          provideHover: async (hoverModel, position, token) => {
            if (!sessionId) {
              return null;
            }
            const activeSessionId = sessionId;
            const response = await runCancelableRequest(
              'hover',
              token,
              null,
              (meta) =>
                lspHover(
                  activeSessionId,
                  { uri: hoverModel.uri.toString() },
                  position.lineNumber - 1,
                  position.column - 1,
                  meta
                )
            );

            if (!response) {
              return null;
            }
            const markdown = hoverToMarkdown(response.contents);
            if (!markdown.trim()) {
              return null;
            }

            return {
              range: response.range ? toMonacoRange(monaco, response.range) : undefined,
              contents: [{ value: markdown }],
            };
          },
        });
        disposables.push(hoverDisposable);
      }

      if (currentFeatureSupport.definition) {
        const definitionDisposable = monaco.languages.registerDefinitionProvider(languageId, {
          provideDefinition: async (defModel, position, token) => {
            if (!sessionId) {
              return null;
            }
            const activeSessionId = sessionId;
            const locations = await runCancelableRequest(
              'definition',
              token,
              null,
              (meta) =>
                lspDefinition(
                  activeSessionId,
                  { uri: defModel.uri.toString() },
                  position.lineNumber - 1,
                  position.column - 1,
                  meta
                )
            );
            if (!locations || locations.length === 0) {
              return null;
            }

            return locations.map((location) => ({
              uri: monaco.Uri.parse(location.uri),
              range: toMonacoRange(monaco, location.range),
            }));
          },
        });
        disposables.push(definitionDisposable);
      }

      if (currentFeatureSupport.references) {
        const referenceDisposable = monaco.languages.registerReferenceProvider(languageId, {
          provideReferences: async (refModel, position, context, token) => {
            if (!sessionId) {
              return [];
            }
            const activeSessionId = sessionId;
            const references = await runCancelableRequest(
              'references',
              token,
              [],
              (meta) =>
                lspReferences(
                  activeSessionId,
                  { uri: refModel.uri.toString() },
                  position.lineNumber - 1,
                  position.column - 1,
                  context.includeDeclaration,
                  meta
                )
            );
            return toMonacoLocations(monaco, references);
          },
        });
        disposables.push(referenceDisposable);
      }

      if (currentFeatureSupport.implementation) {
        const implementationDisposable = monaco.languages.registerImplementationProvider(languageId, {
          provideImplementation: async (implModel, position, token) => {
            if (!sessionId) {
              return [];
            }
            const activeSessionId = sessionId;
            const implementations = await runCancelableRequest(
              'implementation',
              token,
              [],
              (meta) =>
                lspImplementation(
                  activeSessionId,
                  { uri: implModel.uri.toString() },
                  position.lineNumber - 1,
                  position.column - 1,
                  meta
                )
            );
            return toMonacoLocations(monaco, implementations);
          },
        });
        disposables.push(implementationDisposable);
      }

      if (currentFeatureSupport.typeDefinition) {
        const typeDefinitionDisposable = monaco.languages.registerTypeDefinitionProvider(languageId, {
          provideTypeDefinition: async (typeModel, position, token) => {
            if (!sessionId) {
              return [];
            }
            const activeSessionId = sessionId;
            const definitions = await runCancelableRequest(
              'typeDefinition',
              token,
              [],
              (meta) =>
                lspTypeDefinition(
                  activeSessionId,
                  { uri: typeModel.uri.toString() },
                  position.lineNumber - 1,
                  position.column - 1,
                  meta
                )
            );
            return toMonacoLocations(monaco, definitions);
          },
        });
        disposables.push(typeDefinitionDisposable);
      }

      if (currentFeatureSupport.rename) {
        const renameDisposable = monaco.languages.registerRenameProvider(languageId, {
          provideRenameEdits: async (renameModel, position, newName, token) => {
            if (!sessionId) {
              return undefined;
            }
            const activeSessionId = sessionId;
            const edit = await runCancelableRequest(
              'rename',
              token,
              null,
              (meta) =>
                lspRename(
                  activeSessionId,
                  { uri: renameModel.uri.toString() },
                  position.lineNumber - 1,
                  position.column - 1,
                  { newName },
                  meta
                )
            );
            return toMonacoWorkspaceEdit(monaco, edit ?? undefined);
          },
        });
        disposables.push(renameDisposable);
      }

      if (currentFeatureSupport.signatureHelp) {
        const signatureHelpProvider = currentCapabilities.signatureHelpProvider;
        const signatureHelpDisposable = monaco.languages.registerSignatureHelpProvider(languageId, {
          signatureHelpTriggerCharacters:
            isRecord(signatureHelpProvider) && Array.isArray(signatureHelpProvider.triggerCharacters)
              ? signatureHelpProvider.triggerCharacters.filter(
                  (character): character is string => typeof character === 'string'
                )
              : ['(', ','],
          signatureHelpRetriggerCharacters:
            isRecord(signatureHelpProvider) &&
            Array.isArray(signatureHelpProvider.retriggerCharacters)
              ? signatureHelpProvider.retriggerCharacters.filter(
                  (character): character is string => typeof character === 'string'
                )
              : [')'],
          provideSignatureHelp: async (sigModel, position, token) => {
            if (!sessionId) {
              return null;
            }
            const activeSessionId = sessionId;
            const response = await runCancelableRequest(
              'signatureHelp',
              token,
              null,
              (meta) =>
                lspSignatureHelp(
                  activeSessionId,
                  { uri: sigModel.uri.toString() },
                  position.lineNumber - 1,
                  position.column - 1,
                  meta
                )
            );
            if (!response || !response.signatures || response.signatures.length === 0) {
              return null;
            }
            return toMonacoSignatureHelp(response);
          },
        });
        disposables.push(signatureHelpDisposable);
      }

      if (currentFeatureSupport.documentHighlight) {
        const highlightDisposable = monaco.languages.registerDocumentHighlightProvider(languageId, {
          provideDocumentHighlights: async (highlightModel, position, token) => {
            if (!sessionId) {
              return [];
            }
            const activeSessionId = sessionId;
            const highlights = await runCancelableRequest(
              'documentHighlight',
              token,
              [],
              (meta) =>
                lspDocumentHighlights(
                  activeSessionId,
                  { uri: highlightModel.uri.toString() },
                  position.lineNumber - 1,
                  position.column - 1,
                  meta
                )
            );
            return toMonacoDocumentHighlights(monaco, highlights);
          },
        });
        disposables.push(highlightDisposable);
      }

      if (currentFeatureSupport.documentSymbols) {
        const documentSymbolDisposable = monaco.languages.registerDocumentSymbolProvider(languageId, {
          provideDocumentSymbols: async (symbolModel) => {
            if (!sessionId) {
              return [];
            }
            const symbols = await lspDocumentSymbols(sessionId, {
              uri: symbolModel.uri.toString(),
            });

            if (symbols.length === 0) {
              return [];
            }

            if (isLspSymbolInformation(symbols[0])) {
              return (symbols as LspSymbolInformation[]).map((symbol) =>
                toMonacoDocumentSymbolFromInformation(monaco, symbol)
              );
            }

            return (symbols as LspDocumentSymbol[]).map((symbol) =>
              toMonacoDocumentSymbol(monaco, symbol)
            );
          },
        });
        disposables.push(documentSymbolDisposable);
      }

      if (currentFeatureSupport.codeActions) {
        const metadataKinds = extractCodeActionKinds(currentCapabilities.codeActionProvider);
        const commandRunnerId = executeCommandId ?? 'cognia.lsp.executeCommand';
        const codeActionDisposable = monaco.languages.registerCodeActionProvider(
          languageId,
          {
            provideCodeActions: async (codeActionModel, range, context, token) => {
              if (!sessionId) {
                return { actions: [], dispose: () => {} };
              }
              const activeSessionId = sessionId;

              const diagnostics: LspDiagnostic[] = context.markers.map((marker) => ({
                range: {
                  start: {
                    line: Math.max(0, (marker.startLineNumber ?? 1) - 1),
                    character: Math.max(0, (marker.startColumn ?? 1) - 1),
                  },
                  end: {
                    line: Math.max(0, (marker.endLineNumber ?? marker.startLineNumber ?? 1) - 1),
                    character: Math.max(0, (marker.endColumn ?? marker.startColumn ?? 1) - 1),
                  },
                },
                severity: markerSeverityToLsp(marker.severity),
                code: markerCodeToLsp(marker.code),
                source: marker.source,
                message: marker.message,
              }));

              const items = await runCancelableRequest(
                'codeActions',
                token,
                [],
                (meta) =>
                  lspCodeActions(
                    activeSessionId,
                    { uri: codeActionModel.uri.toString() },
                    toLspRange(range),
                    diagnostics,
                    meta
                  )
              );

              const actions = items.map((item) =>
                isLspCommand(item)
                  ? commandToMonacoCodeAction(item, commandRunnerId)
                  : toMonacoCodeAction(monaco, item as LspCodeAction, commandRunnerId)
              );

              return {
                actions,
                dispose: () => {},
              };
            },
            resolveCodeAction: async (codeAction) => {
              if (!sessionId) {
                return codeAction;
              }
              const rawAction = (codeAction as MonacoCodeActionWithRaw).__lspRawAction;
              if (!rawAction) {
                return codeAction;
              }

              try {
                const resolved = await lspResolveCodeAction(sessionId, rawAction);
                const resolvedAction = toMonacoCodeAction(monaco, resolved, commandRunnerId);
                return {
                  ...codeAction,
                  ...resolvedAction,
                };
              } catch {
                return codeAction;
              }
            },
          },
          metadataKinds.length > 0 ? { providedCodeActionKinds: metadataKinds } : undefined
        );
        disposables.push(codeActionDisposable);
      }

      if (currentFeatureSupport.formatting) {
        const formattingDisposable = monaco.languages.registerDocumentFormattingEditProvider(languageId, {
          provideDocumentFormattingEdits: async (formatModel, formatOptions) => {
            if (!sessionId) {
              return [];
            }

            const edits = await lspFormatDocument(
              sessionId,
              { uri: formatModel.uri.toString() },
              {
                tabSize: formatOptions.tabSize,
                insertSpaces: formatOptions.insertSpaces,
              }
            );

            return edits.map((edit: LspTextEdit) => ({
              range: toMonacoRange(monaco, edit.range),
              text: edit.newText,
            }));
          },
        });
        disposables.push(formattingDisposable);
      }

      if (currentFeatureSupport.inlayHints) {
        const inlayHintsDisposable = monaco.languages.registerInlayHintsProvider(languageId, {
          provideInlayHints: async (inlayModel, range, token) => {
            if (!sessionId) {
              return { hints: [], dispose: () => {} };
            }
            const activeSessionId = sessionId;
            const hints = await runCancelableRequest(
              'inlayHints',
              token,
              [],
              (meta) =>
                lspInlayHints(
                  activeSessionId,
                  { uri: inlayModel.uri.toString() },
                  toLspRange(range),
                  meta
                )
            );
            return toMonacoInlayHints(monaco, hints);
          },
        });
        disposables.push(inlayHintsDisposable);
      }

      if (currentFeatureSupport.semanticTokens) {
        const semanticDisposable = monaco.languages.registerDocumentSemanticTokensProvider(
          languageId,
          {
            getLegend: () => ({
              tokenTypes:
                isRecord(currentCapabilities.semanticTokensProvider) &&
                isRecord(currentCapabilities.semanticTokensProvider.legend) &&
                Array.isArray(currentCapabilities.semanticTokensProvider.legend.tokenTypes)
                  ? currentCapabilities.semanticTokensProvider.legend.tokenTypes.filter(
                      (item): item is string => typeof item === 'string'
                    )
                  : [],
              tokenModifiers:
                isRecord(currentCapabilities.semanticTokensProvider) &&
                isRecord(currentCapabilities.semanticTokensProvider.legend) &&
                Array.isArray(currentCapabilities.semanticTokensProvider.legend.tokenModifiers)
                  ? currentCapabilities.semanticTokensProvider.legend.tokenModifiers.filter(
                      (item): item is string => typeof item === 'string'
                    )
                  : [],
            }),
            provideDocumentSemanticTokens: async (semanticModel, _lastResultId, token) => {
              if (!sessionId) {
                return { data: new Uint32Array() };
              }
              const activeSessionId = sessionId;
              const semanticTokens = await runCancelableRequest(
                'semanticTokens',
                token,
                null,
                (meta) =>
                  lspSemanticTokensFull(activeSessionId, { uri: semanticModel.uri.toString() }, meta)
              );
              if (!semanticTokens) {
                return { data: new Uint32Array() };
              }
              return toMonacoSemanticTokens(semanticTokens);
            },
            releaseDocumentSemanticTokens: () => {},
          }
        );
        disposables.push(semanticDisposable);
      }

      unlistenDiagnostics = await lspListenDiagnostics((event) => {
        if (!sessionId || event.sessionId !== sessionId) {
          return;
        }
        if (event.uri !== model.uri.toString()) {
          return;
        }
        if (typeof event.version === 'number' && event.version < currentVersion) {
          return;
        }

        monaco.editor.setModelMarkers(
          model,
          'lsp',
          event.diagnostics.map(toMonacoMarkerData)
        );
      });

      updateStatus('connected');
      return {
        connected: true,
        capabilities: currentCapabilities,
        features: currentFeatureSupport,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start LSP';
      currentCapabilities = {};
      currentFeatureSupport = { ...EMPTY_FEATURE_SUPPORT };
      updateStatus('fallback', message);
      return {
        connected: false,
        capabilities: currentCapabilities,
        features: currentFeatureSupport,
      };
    }
  };

  const dispose = async () => {
    isDisposed = true;
    for (const disposable of disposables) {
      disposable.dispose();
    }
    disposables.length = 0;

    if (unlistenDiagnostics) {
      unlistenDiagnostics();
      unlistenDiagnostics = null;
    }

    if (model) {
      monaco.editor.setModelMarkers(model, 'lsp', []);
    }

    if (sessionId && model) {
      try {
        await lspCloseDocument(sessionId, { uri: model.uri.toString() });
      } catch {
        // Ignore close errors on teardown.
      }
      try {
        await lspShutdownSession(sessionId);
      } catch {
        // Ignore shutdown errors on teardown.
      }
    }
    sessionId = null;
    executeCommandId = null;
    currentVersion = 1;
    syncQueue = Promise.resolve();
    latestRequestSerial.clear();
    currentCapabilities = {};
    currentFeatureSupport = { ...EMPTY_FEATURE_SUPPORT };
  };

  const workspaceSymbols = async (query: string): Promise<LspSymbolInformation[]> => {
    if (!sessionId || !currentFeatureSupport.workspaceSymbols) {
      return [];
    }
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return [];
    }
    const activeSessionId = sessionId;
    const requestSerial = nextFeatureSerial('workspaceSymbols');
    const meta: LspRequestMeta = {
      clientRequestId: nextClientRequestId('workspaceSymbols'),
      timeoutMs: featureTimeoutMs('workspaceSymbols'),
    };
    const symbols = await lspWorkspaceSymbols(activeSessionId, trimmedQuery, meta);
    if (sessionId !== activeSessionId || isStaleFeatureRequest('workspaceSymbols', requestSerial)) {
      return [];
    }
    return symbols;
  };

  return {
    start,
    dispose,
    getFeatureSupport: () => ({ ...currentFeatureSupport }),
    workspaceSymbols,
  };
}
