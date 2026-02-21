/**
 * Tauri-backed LSP client for Monaco.
 * Uses Tauri invoke/event bridge and falls back gracefully on web.
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type {
  LspCapabilities,
  LspCodeAction,
  LspInstallProgressEvent,
  LspInstallRequest,
  LspInstallResult,
  LspInstalledServerRecord,
  LspProvider,
  LspCodeActionOrCommand,
  LspCompletionItem,
  LspDocumentHighlight,
  LspDocumentSymbol,
  LspInlayHint,
  LspLocation,
  LspPublishDiagnosticsEvent,
  LspReference,
  LspRegistryEntry,
  LspRegistryRecommendedResponse,
  LspRegistrySearchRequest,
  LspRenameRequest,
  LspRequestMeta,
  LspRange,
  LspResolvedLaunch,
  LspSemanticTokens,
  LspServerStatus,
  LspServerStatusChangedEvent,
  LspSignatureHelp,
  LspSymbolInformation,
  LspTextDocumentContentChangeEvent,
  LspTextDocumentSyncKind,
  LspTextDocumentSyncOptions,
  LspStartSessionRequest,
  LspStartSessionResponse,
  LspTextEdit,
  LspWorkspaceEdit,
} from '@/types/designer/lsp';

export interface LspTextDocumentIdentifier {
  uri: string;
}

export interface LspVersionedTextDocumentIdentifier extends LspTextDocumentIdentifier {
  version: number;
}

export interface LspTextDocumentItem extends LspVersionedTextDocumentIdentifier {
  languageId: string;
  text: string;
}

export interface LspCompletionResponse {
  isIncomplete?: boolean;
  items: LspCompletionItem[];
}

export interface LspHoverResponse {
  contents?: string | { kind?: string; value?: string } | Array<string | { kind?: string; value?: string }>;
  range?: LspRange;
}

type RawLspCompletionResult = LspCompletionItem[] | { isIncomplete?: boolean; items?: LspCompletionItem[] } | null;
type RawLspStartSessionResponse = {
  sessionId: string;
  capabilities?: unknown;
  resolvedCommand?: string;
  resolvedArgs?: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeCapability(
  value: unknown
): boolean | Record<string, unknown> | undefined {
  if (typeof value === 'boolean') {
    return value;
  }
  if (isRecord(value)) {
    return value;
  }
  return undefined;
}

function normalizeCapabilities(rawCapabilities: unknown): LspCapabilities {
  if (!isRecord(rawCapabilities)) {
    return {};
  }

  const serverCapabilities = isRecord(rawCapabilities.capabilities)
    ? rawCapabilities.capabilities
    : rawCapabilities;
  const workspace = isRecord(serverCapabilities.workspace)
    ? serverCapabilities.workspace
    : undefined;

  return {
    completionProvider: isRecord(serverCapabilities.completionProvider)
      ? serverCapabilities.completionProvider
      : undefined,
    hoverProvider: normalizeCapability(serverCapabilities.hoverProvider),
    definitionProvider: normalizeCapability(serverCapabilities.definitionProvider),
    referencesProvider: normalizeCapability(serverCapabilities.referencesProvider),
    renameProvider: normalizeCapability(serverCapabilities.renameProvider),
    implementationProvider: normalizeCapability(serverCapabilities.implementationProvider),
    typeDefinitionProvider: normalizeCapability(serverCapabilities.typeDefinitionProvider),
    signatureHelpProvider:
      normalizeCapability(serverCapabilities.signatureHelpProvider) ??
      (isRecord(serverCapabilities.signatureHelpProvider)
        ? serverCapabilities.signatureHelpProvider
        : undefined),
    documentHighlightProvider: normalizeCapability(serverCapabilities.documentHighlightProvider),
    semanticTokensProvider:
      normalizeCapability(serverCapabilities.semanticTokensProvider) ??
      (isRecord(serverCapabilities.semanticTokensProvider)
        ? serverCapabilities.semanticTokensProvider
        : undefined),
    inlayHintProvider: normalizeCapability(serverCapabilities.inlayHintProvider),
    documentSymbolProvider: normalizeCapability(serverCapabilities.documentSymbolProvider),
    codeActionProvider: normalizeCapability(serverCapabilities.codeActionProvider),
    documentFormattingProvider: normalizeCapability(serverCapabilities.documentFormattingProvider),
    workspaceSymbolProvider:
      normalizeCapability(serverCapabilities.workspaceSymbolProvider) ??
      normalizeCapability(workspace?.symbol),
    textDocumentSync: normalizeTextDocumentSync(serverCapabilities.textDocumentSync),
  };
}

function normalizeTextDocumentSync(
  value: unknown
): LspTextDocumentSyncKind | LspTextDocumentSyncOptions | undefined {
  if (value === 0 || value === 1 || value === 2) {
    return value;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const changeValue = value.change;
  const syncOptions: LspTextDocumentSyncOptions = {
    openClose: typeof value.openClose === 'boolean' ? value.openClose : undefined,
    willSave: typeof value.willSave === 'boolean' ? value.willSave : undefined,
    willSaveWaitUntil: typeof value.willSaveWaitUntil === 'boolean' ? value.willSaveWaitUntil : undefined,
    save:
      typeof value.save === 'boolean'
        ? value.save
        : isRecord(value.save) && typeof value.save.includeText === 'boolean'
          ? { includeText: value.save.includeText }
          : undefined,
  };

  if (changeValue === 0 || changeValue === 1 || changeValue === 2) {
    syncOptions.change = changeValue;
  }

  return syncOptions;
}

export function hasLspCapability(capability: unknown): boolean {
  if (typeof capability === 'boolean') {
    return capability;
  }
  return isRecord(capability);
}

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function lspStartSession(request: LspStartSessionRequest): Promise<LspStartSessionResponse> {
  const raw = await invoke<RawLspStartSessionResponse>('lsp_start_session', { request });
  return {
    sessionId: raw.sessionId,
    capabilities: normalizeCapabilities(raw.capabilities),
    resolvedCommand: raw.resolvedCommand,
    resolvedArgs: raw.resolvedArgs,
  };
}

export async function lspRegistrySearch(
  request: LspRegistrySearchRequest
): Promise<LspRegistryEntry[]> {
  return invoke<LspRegistryEntry[]>('lsp_registry_search', { request });
}

export async function lspRegistryGetRecommended(
  languageId: string,
  providers?: LspProvider[]
): Promise<LspRegistryRecommendedResponse> {
  return invoke<LspRegistryRecommendedResponse>('lsp_registry_get_recommended', {
    languageId,
    providers,
  });
}

export async function lspInstallServer(request: LspInstallRequest): Promise<LspInstallResult> {
  return invoke<LspInstallResult>('lsp_install_server', { request });
}

export async function lspUninstallServer(extensionId: string): Promise<boolean> {
  return invoke<boolean>('lsp_uninstall_server', {
    request: { extensionId },
  });
}

export async function lspListInstalledServers(): Promise<LspInstalledServerRecord[]> {
  return invoke<LspInstalledServerRecord[]>('lsp_list_installed_servers');
}

export async function lspGetServerStatus(languageId: string): Promise<LspServerStatus> {
  return invoke<LspServerStatus>('lsp_get_server_status', {
    request: { languageId },
  });
}

export async function lspResolveLaunch(languageId: string): Promise<LspResolvedLaunch> {
  return invoke<LspResolvedLaunch>('lsp_resolve_launch', {
    request: { languageId },
  });
}

export async function lspOpenDocument(sessionId: string, document: LspTextDocumentItem): Promise<void> {
  return invoke('lsp_open_document', {
    request: {
      sessionId,
      uri: document.uri,
      languageId: document.languageId,
      version: document.version,
      text: document.text,
    },
  });
}

export async function lspChangeDocument(
  sessionId: string,
  document: LspVersionedTextDocumentIdentifier,
  text: string,
  changes?: LspTextDocumentContentChangeEvent[],
  meta?: LspRequestMeta
): Promise<void> {
  return invoke('lsp_change_document', {
    request: {
      sessionId,
      uri: document.uri,
      version: document.version,
      text,
      changes,
      clientRequestId: meta?.clientRequestId,
      timeoutMs: meta?.timeoutMs,
    },
  });
}

export async function lspCloseDocument(sessionId: string, document: LspTextDocumentIdentifier): Promise<void> {
  return invoke('lsp_close_document', {
    request: {
      sessionId,
      uri: document.uri,
    },
  });
}

export async function lspCompletion(
  sessionId: string,
  document: LspTextDocumentIdentifier,
  line: number,
  character: number,
  meta?: LspRequestMeta
): Promise<LspCompletionResponse> {
  const raw = await invoke<RawLspCompletionResult>('lsp_completion', {
    request: {
      sessionId,
      uri: document.uri,
      line,
      character,
      clientRequestId: meta?.clientRequestId,
      timeoutMs: meta?.timeoutMs,
    },
  });

  if (!raw) {
    return { items: [] };
  }
  if (Array.isArray(raw)) {
    return { items: raw };
  }

  return {
    isIncomplete: raw.isIncomplete,
    items: raw.items ?? [],
  };
}

export async function lspHover(
  sessionId: string,
  document: LspTextDocumentIdentifier,
  line: number,
  character: number,
  meta?: LspRequestMeta
): Promise<LspHoverResponse | null> {
  return invoke<LspHoverResponse | null>('lsp_hover', {
    request: {
      sessionId,
      uri: document.uri,
      line,
      character,
      clientRequestId: meta?.clientRequestId,
      timeoutMs: meta?.timeoutMs,
    },
  });
}

export async function lspDefinition(
  sessionId: string,
  document: LspTextDocumentIdentifier,
  line: number,
  character: number,
  meta?: LspRequestMeta
): Promise<LspLocation[] | null> {
  return invoke<LspLocation[] | null>('lsp_definition', {
    request: {
      sessionId,
      uri: document.uri,
      line,
      character,
      clientRequestId: meta?.clientRequestId,
      timeoutMs: meta?.timeoutMs,
    },
  });
}

export async function lspReferences(
  sessionId: string,
  document: LspTextDocumentIdentifier,
  line: number,
  character: number,
  includeDeclaration = true,
  meta?: LspRequestMeta
): Promise<LspReference[]> {
  const raw = await invoke<LspReference[] | null>('lsp_references', {
    request: {
      sessionId,
      uri: document.uri,
      line,
      character,
      includeDeclaration,
      clientRequestId: meta?.clientRequestId,
      timeoutMs: meta?.timeoutMs,
    },
  });

  return raw ?? [];
}

export async function lspRename(
  sessionId: string,
  document: LspTextDocumentIdentifier,
  line: number,
  character: number,
  rename: LspRenameRequest,
  meta?: LspRequestMeta
): Promise<LspWorkspaceEdit | null> {
  return invoke<LspWorkspaceEdit | null>('lsp_rename', {
    request: {
      sessionId,
      uri: document.uri,
      line,
      character,
      newName: rename.newName,
      clientRequestId: meta?.clientRequestId,
      timeoutMs: meta?.timeoutMs,
    },
  });
}

export async function lspImplementation(
  sessionId: string,
  document: LspTextDocumentIdentifier,
  line: number,
  character: number,
  meta?: LspRequestMeta
): Promise<LspLocation[]> {
  const raw = await invoke<LspLocation[] | null>('lsp_implementation', {
    request: {
      sessionId,
      uri: document.uri,
      line,
      character,
      clientRequestId: meta?.clientRequestId,
      timeoutMs: meta?.timeoutMs,
    },
  });

  return raw ?? [];
}

export async function lspTypeDefinition(
  sessionId: string,
  document: LspTextDocumentIdentifier,
  line: number,
  character: number,
  meta?: LspRequestMeta
): Promise<LspLocation[]> {
  const raw = await invoke<LspLocation[] | null>('lsp_type_definition', {
    request: {
      sessionId,
      uri: document.uri,
      line,
      character,
      clientRequestId: meta?.clientRequestId,
      timeoutMs: meta?.timeoutMs,
    },
  });

  return raw ?? [];
}

export async function lspSignatureHelp(
  sessionId: string,
  document: LspTextDocumentIdentifier,
  line: number,
  character: number,
  meta?: LspRequestMeta
): Promise<LspSignatureHelp | null> {
  return invoke<LspSignatureHelp | null>('lsp_signature_help', {
    request: {
      sessionId,
      uri: document.uri,
      line,
      character,
      clientRequestId: meta?.clientRequestId,
      timeoutMs: meta?.timeoutMs,
    },
  });
}

export async function lspDocumentHighlights(
  sessionId: string,
  document: LspTextDocumentIdentifier,
  line: number,
  character: number,
  meta?: LspRequestMeta
): Promise<LspDocumentHighlight[]> {
  const raw = await invoke<LspDocumentHighlight[] | null>('lsp_document_highlights', {
    request: {
      sessionId,
      uri: document.uri,
      line,
      character,
      clientRequestId: meta?.clientRequestId,
      timeoutMs: meta?.timeoutMs,
    },
  });

  return raw ?? [];
}

export async function lspInlayHints(
  sessionId: string,
  document: LspTextDocumentIdentifier,
  range: LspRange,
  meta?: LspRequestMeta
): Promise<LspInlayHint[]> {
  const raw = await invoke<LspInlayHint[] | null>('lsp_inlay_hints', {
    request: {
      sessionId,
      uri: document.uri,
      range,
      clientRequestId: meta?.clientRequestId,
      timeoutMs: meta?.timeoutMs,
    },
  });

  return raw ?? [];
}

export async function lspSemanticTokensFull(
  sessionId: string,
  document: LspTextDocumentIdentifier,
  meta?: LspRequestMeta
): Promise<LspSemanticTokens | null> {
  return invoke<LspSemanticTokens | null>('lsp_semantic_tokens_full', {
    request: {
      sessionId,
      uri: document.uri,
      clientRequestId: meta?.clientRequestId,
      timeoutMs: meta?.timeoutMs,
    },
  });
}

export async function lspDocumentSymbols(
  sessionId: string,
  document: LspTextDocumentIdentifier
): Promise<Array<LspDocumentSymbol | LspSymbolInformation>> {
  const raw = await invoke<Array<LspDocumentSymbol | LspSymbolInformation> | null>('lsp_document_symbols', {
    request: {
      sessionId,
      uri: document.uri,
    },
  });

  return raw ?? [];
}

export async function lspFormatDocument(
  sessionId: string,
  document: LspTextDocumentIdentifier,
  options?: { tabSize?: number; insertSpaces?: boolean }
): Promise<LspTextEdit[]> {
  const raw = await invoke<LspTextEdit[] | null>('lsp_format_document', {
    request: {
      sessionId,
      uri: document.uri,
      tabSize: options?.tabSize,
      insertSpaces: options?.insertSpaces,
    },
  });

  return raw ?? [];
}

export async function lspCodeActions(
  sessionId: string,
  document: LspTextDocumentIdentifier,
  range: LspRange,
  diagnostics?: LspPublishDiagnosticsEvent['diagnostics'],
  meta?: LspRequestMeta
): Promise<LspCodeActionOrCommand[]> {
  const raw = await invoke<LspCodeActionOrCommand[] | null>('lsp_code_actions', {
    request: {
      sessionId,
      uri: document.uri,
      range,
      diagnostics,
      clientRequestId: meta?.clientRequestId,
      timeoutMs: meta?.timeoutMs,
    },
  });

  return raw ?? [];
}

export async function lspWorkspaceSymbols(
  sessionId: string,
  query: string,
  meta?: LspRequestMeta
): Promise<LspSymbolInformation[]> {
  const raw = await invoke<LspSymbolInformation[] | null>('lsp_workspace_symbols', {
    request: {
      sessionId,
      query,
      clientRequestId: meta?.clientRequestId,
      timeoutMs: meta?.timeoutMs,
    },
  });

  return raw ?? [];
}

export async function lspCancelRequest(sessionId: string, clientRequestId: string): Promise<void> {
  return invoke('lsp_cancel_request', {
    request: {
      sessionId,
      clientRequestId,
    },
  });
}

export async function lspExecuteCommand(
  sessionId: string,
  command: string,
  argumentsList?: unknown[]
): Promise<unknown> {
  return invoke<unknown>('lsp_execute_command', {
    request: {
      sessionId,
      command,
      arguments: argumentsList,
    },
  });
}

export async function lspResolveCodeAction(
  sessionId: string,
  action: LspCodeAction
): Promise<LspCodeAction> {
  return invoke<LspCodeAction>('lsp_resolve_code_action', {
    request: {
      sessionId,
      action,
    },
  });
}

export async function lspShutdownSession(sessionId: string): Promise<void> {
  return invoke('lsp_shutdown_session', {
    request: {
      sessionId,
    },
  });
}

export async function lspListenDiagnostics(
  callback: (event: LspPublishDiagnosticsEvent) => void
): Promise<UnlistenFn> {
  return listen<LspPublishDiagnosticsEvent>('lsp://diagnostics', (event) => {
    if (event.payload) {
      callback(event.payload);
    }
  });
}

export async function lspListenInstallProgress(
  callback: (event: LspInstallProgressEvent) => void
): Promise<UnlistenFn> {
  return listen<LspInstallProgressEvent>('lsp-install-progress', (event) => {
    if (event.payload) {
      callback(event.payload);
    }
  });
}

export async function lspListenServerStatusChanged(
  callback: (event: LspServerStatusChangedEvent) => void
): Promise<UnlistenFn> {
  return listen<LspServerStatusChangedEvent>('lsp-server-status-changed', (event) => {
    if (event.payload) {
      callback(event.payload);
    }
  });
}

export function lspSeverityToMonaco(severity?: number): number {
  // LSP severity: 1 Error, 2 Warning, 3 Information, 4 Hint
  // Monaco severity: 8 Error, 4 Warning, 2 Info, 1 Hint
  switch (severity) {
    case 1:
      return 8;
    case 2:
      return 4;
    case 3:
      return 2;
    case 4:
      return 1;
    default:
      return 2;
  }
}
