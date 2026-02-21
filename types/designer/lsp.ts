/**
 * LSP types for designer Monaco integration.
 */

export type LspSessionStatus =
  | 'disabled'
  | 'starting'
  | 'installing'
  | 'connected'
  | 'fallback'
  | 'error';

export type LspProvider = 'open_vsx' | 'vs_marketplace';

export type LspCapabilityValue = boolean | Record<string, unknown>;

export type LspTextDocumentSyncKind = 0 | 1 | 2;

export interface LspTextDocumentSyncOptions {
  openClose?: boolean;
  change?: LspTextDocumentSyncKind;
  willSave?: boolean;
  willSaveWaitUntil?: boolean;
  save?: boolean | { includeText?: boolean };
}

export interface LspRequestMeta {
  clientRequestId?: string;
  timeoutMs?: number;
}

export interface LspCapabilities {
  completionProvider?: Record<string, unknown>;
  hoverProvider?: LspCapabilityValue;
  definitionProvider?: LspCapabilityValue;
  referencesProvider?: LspCapabilityValue;
  renameProvider?: LspCapabilityValue;
  implementationProvider?: LspCapabilityValue;
  typeDefinitionProvider?: LspCapabilityValue;
  signatureHelpProvider?: Record<string, unknown> | LspCapabilityValue;
  documentHighlightProvider?: LspCapabilityValue;
  semanticTokensProvider?: Record<string, unknown> | LspCapabilityValue;
  inlayHintProvider?: LspCapabilityValue;
  documentSymbolProvider?: LspCapabilityValue;
  codeActionProvider?: LspCapabilityValue;
  documentFormattingProvider?: LspCapabilityValue;
  workspaceSymbolProvider?: LspCapabilityValue;
  textDocumentSync?: LspTextDocumentSyncKind | LspTextDocumentSyncOptions;
}

export interface LspStartSessionRequest {
  language: string;
  rootUri?: string;
  workspaceFolders?: string[];
  initializationOptions?: Record<string, unknown>;
  autoInstall?: boolean;
  preferredProviders?: LspProvider[];
  allowFallback?: boolean;
}

export interface LspStartSessionResponse {
  sessionId: string;
  capabilities: LspCapabilities;
  resolvedCommand?: string;
  resolvedArgs?: string[];
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

export interface LspTextDocumentContentChangeEvent {
  range?: LspRange;
  rangeLength?: number;
  text: string;
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

export type LspReference = LspLocation;

export interface LspRenameRequest {
  newName: string;
}

export interface LspSignatureInformation {
  label: string;
  documentation?: string | { kind?: string; value?: string };
  parameters?: Array<{
    label: string | [number, number];
    documentation?: string | { kind?: string; value?: string };
  }>;
}

export interface LspSignatureHelp {
  signatures: LspSignatureInformation[];
  activeSignature?: number;
  activeParameter?: number;
}

export interface LspDocumentHighlight {
  range: LspRange;
  kind?: number;
}

export interface LspInlayHintLabelPart {
  value: string;
  tooltip?: string | { kind?: string; value?: string };
  location?: LspLocation;
}

export interface LspInlayHint {
  position: LspPosition;
  label: string | LspInlayHintLabelPart[];
  kind?: number;
  textEdits?: LspTextEdit[];
  tooltip?: string | { kind?: string; value?: string };
  paddingLeft?: boolean;
  paddingRight?: boolean;
}

export interface LspSemanticTokens {
  resultId?: string;
  data: number[];
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

export interface LspRegistrySearchRequest {
  query: string;
  languageId?: string;
  providers?: LspProvider[];
  pageNumber?: number;
  pageSize?: number;
}

export interface LspRegistryEntry {
  extensionId: string;
  provider: LspProvider | string;
  publisher: string;
  name: string;
  displayName: string;
  description?: string;
  version: string;
  targetPlatform?: string;
  verified: boolean;
  downloadUrl?: string;
  sha256Url?: string;
  homepage?: string;
  tags: string[];
  languages: string[];
}

export interface LspRegistryRecommendation {
  languageId: string;
  normalizedLanguageId: string;
  displayName: string;
  extensionId?: string;
  provider: LspProvider;
  command: string;
  args: string[];
  npmPackage?: string;
  notes?: string;
}

export interface LspRegistryRecommendedResponse {
  languageId: string;
  normalizedLanguageId: string;
  entries: LspRegistryEntry[];
  recommendations: LspRegistryRecommendation[];
}

export interface LspInstallRequest {
  extensionId: string;
  languageId?: string;
  version?: string;
  provider?: LspProvider;
  expectedSha256?: string;
}

export interface LspResolvedLaunch {
  languageId: string;
  normalizedLanguageId: string;
  command: string;
  args: string[];
  cwd?: string;
  source: string;
  extensionId?: string;
  trusted: boolean;
  requiresApproval: boolean;
  npmPackage?: string;
}

export interface LspInstallResult {
  extensionId: string;
  languageId?: string;
  provider: string;
  version: string;
  installPath: string;
  launch?: LspResolvedLaunch;
  verified: boolean;
}

export interface LspInstalledServerRecord {
  extensionId: string;
  provider: string;
  version: string;
  installPath: string;
  manifestPath: string;
  targetPlatform?: string;
  installedAt: string;
  sha256?: string;
  languages: string[];
  launch?: LspResolvedLaunch;
}

export interface LspServerStatus {
  languageId: string;
  normalizedLanguageId: string;
  supported: boolean;
  installed: boolean;
  ready: boolean;
  provider?: string;
  extensionId?: string;
  command?: string;
  args: string[];
  needsApproval: boolean;
  reason?: string;
  errorCode?: string;
}

export interface LspInstallProgressEvent {
  taskId: string;
  status:
    | 'pending'
    | 'connecting'
    | 'downloading'
    | 'verifying'
    | 'extracting'
    | 'completed'
    | 'failed'
    | 'cancelled';
  provider: string;
  extensionId: string;
  languageId?: string;
  totalBytes: number;
  downloadedBytes: number;
  percent: number;
  speedBps: number;
  error?: string;
}

export interface LspServerStatusChangedEvent {
  languageId: string;
  status: string;
  sessionId?: string;
  reason?: string;
}
