/**
 * Tauri-backed LSP client for Monaco.
 * Uses Tauri invoke/event bridge and falls back gracefully on web.
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type {
  LspCapabilities,
  LspCodeAction,
  LspCodeActionOrCommand,
  LspCompletionItem,
  LspDocumentSymbol,
  LspLocation,
  LspPublishDiagnosticsEvent,
  LspRange,
  LspSymbolInformation,
  LspStartSessionRequest,
  LspStartSessionResponse,
  LspTextEdit,
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
    documentSymbolProvider: normalizeCapability(serverCapabilities.documentSymbolProvider),
    codeActionProvider: normalizeCapability(serverCapabilities.codeActionProvider),
    documentFormattingProvider: normalizeCapability(serverCapabilities.documentFormattingProvider),
    workspaceSymbolProvider:
      normalizeCapability(serverCapabilities.workspaceSymbolProvider) ??
      normalizeCapability(workspace?.symbol),
    textDocumentSync: serverCapabilities.textDocumentSync,
  };
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
  };
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
  text: string
): Promise<void> {
  return invoke('lsp_change_document', {
    request: {
      sessionId,
      uri: document.uri,
      version: document.version,
      text,
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
  character: number
): Promise<LspCompletionResponse> {
  const raw = await invoke<RawLspCompletionResult>('lsp_completion', {
    request: {
      sessionId,
      uri: document.uri,
      line,
      character,
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
  character: number
): Promise<LspHoverResponse | null> {
  return invoke<LspHoverResponse | null>('lsp_hover', {
    request: {
      sessionId,
      uri: document.uri,
      line,
      character,
    },
  });
}

export async function lspDefinition(
  sessionId: string,
  document: LspTextDocumentIdentifier,
  line: number,
  character: number
): Promise<LspLocation[] | null> {
  return invoke<LspLocation[] | null>('lsp_definition', {
    request: {
      sessionId,
      uri: document.uri,
      line,
      character,
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
  diagnostics?: LspPublishDiagnosticsEvent['diagnostics']
): Promise<LspCodeActionOrCommand[]> {
  const raw = await invoke<LspCodeActionOrCommand[] | null>('lsp_code_actions', {
    request: {
      sessionId,
      uri: document.uri,
      range,
      diagnostics,
    },
  });

  return raw ?? [];
}

export async function lspWorkspaceSymbols(
  sessionId: string,
  query: string
): Promise<LspSymbolInformation[]> {
  const raw = await invoke<LspSymbolInformation[] | null>('lsp_workspace_symbols', {
    request: {
      sessionId,
      query,
    },
  });

  return raw ?? [];
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
