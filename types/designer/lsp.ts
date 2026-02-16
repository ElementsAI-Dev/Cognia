/**
 * LSP types for designer Monaco integration.
 */

export type LspSessionStatus = 'disabled' | 'starting' | 'connected' | 'fallback' | 'error';

export type LspCapabilityValue = boolean | Record<string, unknown>;

export interface LspCapabilities {
  completionProvider?: Record<string, unknown>;
  hoverProvider?: LspCapabilityValue;
  definitionProvider?: LspCapabilityValue;
  documentSymbolProvider?: LspCapabilityValue;
  codeActionProvider?: LspCapabilityValue;
  documentFormattingProvider?: LspCapabilityValue;
  workspaceSymbolProvider?: LspCapabilityValue;
  textDocumentSync?: unknown;
}

export interface LspStartSessionRequest {
  language: string;
  rootUri?: string;
  workspaceFolders?: string[];
  initializationOptions?: Record<string, unknown>;
}

export interface LspStartSessionResponse {
  sessionId: string;
  capabilities: LspCapabilities;
}

export interface LspPosition {
  line: number;
  character: number;
}

export interface LspRange {
  start: LspPosition;
  end: LspPosition;
}

export interface LspDiagnostic {
  range: LspRange;
  severity?: number;
  code?: string | number;
  source?: string;
  message: string;
}

export interface LspCommand {
  title?: string;
  command: string;
  arguments?: unknown[];
}

export interface LspTextEdit {
  range: LspRange;
  newText: string;
}

export interface LspWorkspaceEdit {
  changes?: Record<string, LspTextEdit[]>;
  documentChanges?: Array<{
    textDocument?: { uri: string };
    edits?: LspTextEdit[];
  }>;
}

export interface LspCompletionItem {
  label: string;
  kind?: number;
  detail?: string;
  documentation?: string | { kind?: string; value?: string };
  insertText?: string;
  sortText?: string;
  filterText?: string;
}

export interface LspLocation {
  uri: string;
  range: LspRange;
}

export interface LspDocumentSymbol {
  name: string;
  detail?: string;
  kind: number;
  tags?: number[];
  deprecated?: boolean;
  range: LspRange;
  selectionRange: LspRange;
  children?: LspDocumentSymbol[];
}

export interface LspSymbolInformation {
  name: string;
  kind: number;
  tags?: number[];
  deprecated?: boolean;
  location: LspLocation;
  containerName?: string;
}

export interface LspCodeAction {
  title: string;
  kind?: string;
  diagnostics?: LspDiagnostic[];
  edit?: LspWorkspaceEdit;
  command?: LspCommand;
  isPreferred?: boolean;
  disabled?: string | { reason?: string };
  data?: unknown;
}

export type LspCodeActionOrCommand = LspCodeAction | LspCommand;

export interface LspPublishDiagnosticsEvent {
  sessionId: string;
  uri: string;
  diagnostics: LspDiagnostic[];
  version?: number;
}
