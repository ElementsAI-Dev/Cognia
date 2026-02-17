import { nanoid } from 'nanoid';
import { agentTraceRepository } from '@/lib/db/repositories/agent-trace-repository';
import type {
  AgentTraceRecord,
  AgentTraceEventType,
  AgentTraceSeverity,
  TraceCostEstimate,
  ContributorType,
  TraceFile,
  Contributor,
} from '@/types/agent-trace';
import { estimateTraceCost } from './cost-estimator';
import { useGitStore } from '@/stores/git';
import { useSettingsStore } from '@/stores';
import { vcsService, type VcsType } from '@/lib/native/vcs';
import { getCurrentSpanId, getCurrentTraceId } from '@/lib/ai/observability/tracing';
import { countLines, fnv1a32 } from './utils';
import { createCheckpoint } from './checkpoint-manager';
import { useAgentTraceStore, type AgentTraceEvent as LiveAgentTraceEvent } from '@/stores/agent-trace/agent-trace-store';

/** Current agent trace format version */
export const AGENT_TRACE_VERSION = '0.1.0';

/** Tool name for this application */
export const AGENT_TRACE_TOOL_NAME = 'cognia';

/** Tool version for this application */
export const AGENT_TRACE_TOOL_VERSION = '0.1.0';

/** List of tool names that trigger agent trace recording */
export const TRACED_TOOL_NAMES = [
  'file_write',
  'file_append',
  'artifact_create',
  'artifact_update',
  'code_edit',
  'code_create',
  'shell_execute',
] as const;

export type TracedToolName = (typeof TRACED_TOOL_NAMES)[number];

export interface RecordAgentTraceInput {
  sessionId?: string;
  conversationUrl?: string;
  contributorType: ContributorType;
  modelId?: string;
  filePath: string;
  content: string;
  range?: {
    startLine: number;
    endLine: number;
  };
  metadata?: Record<string, unknown>;
  vcs?: {
    type: 'git' | 'jj' | 'hg' | 'svn';
    revision: string;
  };
  /** Extended VCS context from Git store - branch, remote, etc. */
  vcsContext?: VcsContext;
  eventType?: AgentTraceEventType;
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  turnId?: string;
  stepId?: string;
}

function buildContributor(type: ContributorType, modelId?: string): Contributor {
  return {
    type,
    model_id: modelId,
  };
}

function buildFileEntry(input: RecordAgentTraceInput): TraceFile {
  const lineCount = countLines(input.content);
  const contributor = buildContributor(input.contributorType, input.modelId);
  const startLine = input.range?.startLine ?? 1;
  const endLine = input.range?.endLine ?? lineCount;

  return {
    path: input.filePath,
    conversations: [
      {
        url: input.conversationUrl,
        contributor,
        ranges: [
          {
            start_line: startLine,
            end_line: endLine,
            content_hash: fnv1a32(input.content),
            contributor, // Also include in range for granular attribution
          },
        ],
      },
    ],
  };
}

function resolveTraceContext(input: {
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
}) {
  return {
    traceId: input.traceId ?? getCurrentTraceId(),
    spanId: input.spanId ?? getCurrentSpanId(),
    parentSpanId: input.parentSpanId,
  };
}

function extractLineRangeFromArgs(args: Record<string, unknown>): { startLine: number; endLine: number } | undefined {
  const startLine = Number(
    (args.startLine ?? args.start_line ?? args.lineStart ?? (args.range as { startLine?: unknown; start_line?: unknown })?.startLine
    ?? (args.range as { start_line?: unknown })?.start_line) ??
    (args.range as { start?: unknown })?.start
  );
  const endLine = Number(
    (args.endLine ?? args.end_line ?? args.lineEnd ?? (args.range as { endLine?: unknown; end_line?: unknown })?.endLine
    ?? (args.range as { end_line?: unknown })?.end_line) ??
    (args.range as { end?: unknown })?.end
  );

  if (Number.isFinite(startLine) && Number.isFinite(endLine)) {
    return { startLine: Math.max(1, startLine), endLine: Math.max(startLine, endLine) };
  }
  return undefined;
}

async function enforceMaxRecordsLimit(): Promise<void> {
  try {
    const { agentTraceSettings } = useSettingsStore.getState();
    const { enabled, maxRecords } = agentTraceSettings;
    if (!enabled || maxRecords <= 0) return;

    const currentCount = await agentTraceRepository.count();
    if (currentCount <= maxRecords) return;

    const excessCount = currentCount - maxRecords;
    await agentTraceRepository.deleteOldest(excessCount);
  } catch (error) {
    console.error('[AgentTrace] Failed to enforce max records limit:', error);
  }
}

function isAgentTraceRecordingEnabled(): boolean {
  return Boolean(useSettingsStore.getState().agentTraceSettings.enabled);
}

function toNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function safeStringify(value: unknown): string | undefined {
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}

function toTokenUsageSnapshot(value: unknown): LiveAgentTraceEvent['tokenUsage'] {
  if (!value || typeof value !== 'object') return undefined;
  const usage = value as Record<string, unknown>;
  const promptTokens = toNumber(usage.promptTokens ?? usage.prompt_tokens) ?? 0;
  const completionTokens = toNumber(usage.completionTokens ?? usage.completion_tokens) ?? 0;
  const totalTokens = toNumber(usage.totalTokens ?? usage.total_tokens) ?? (promptTokens + completionTokens);
  if (promptTokens === 0 && completionTokens === 0 && totalTokens === 0) return undefined;
  return { promptTokens, completionTokens, totalTokens };
}

function deriveStepNumber(stepId?: string, metadata?: Record<string, unknown>): number | undefined {
  const fromMetadata = toNumber(metadata?.stepNumber);
  if (fromMetadata !== undefined) return fromMetadata;
  if (!stepId) return undefined;
  const matched = stepId.match(/(\d+)/);
  return matched ? toNumber(matched[1]) : undefined;
}

function syncRecordToLiveStore(record: AgentTraceRecord, sessionId?: string): void {
  if (!sessionId || !isAgentTraceRecordingEnabled()) return;

  const metadata =
    record.metadata && typeof record.metadata === 'object'
      ? (record.metadata as Record<string, unknown>)
      : undefined;
  const tokenUsage = toTokenUsageSnapshot(metadata?.tokenUsage ?? metadata?.usage);
  const duration = record.duration ?? toNumber(metadata?.latencyMs);
  const success = typeof metadata?.success === 'boolean' ? metadata.success : undefined;
  const modelId = typeof metadata?.modelId === 'string' ? metadata.modelId : undefined;
  const error = typeof metadata?.error === 'string' ? metadata.error : undefined;
  const toolName = typeof metadata?.toolName === 'string' ? metadata.toolName : undefined;
  const toolArgs =
    typeof metadata?.toolArgs === 'string'
      ? metadata.toolArgs
      : metadata?.toolArgs !== undefined
        ? safeStringify(metadata.toolArgs)
        : undefined;
  const responsePreview =
    typeof metadata?.responsePreview === 'string' ? metadata.responsePreview : undefined;

  const event: LiveAgentTraceEvent = {
    id: record.id,
    sessionId,
    eventType: record.eventType ?? 'response',
    timestamp: new Date(record.timestamp).getTime(),
    stepNumber: deriveStepNumber(record.stepId, metadata),
    toolName,
    toolArgs,
    success,
    error,
    duration,
    tokenUsage,
    costEstimate: record.costEstimate,
    responsePreview,
    modelId,
  };

  const store = useAgentTraceStore.getState();
  if (!store.getActiveSession(sessionId)) {
    store.startSession(sessionId, modelId);
  }
  store.addEvent(event);

  if (event.eventType === 'response' || event.eventType === 'error' || event.eventType === 'session_end') {
    const sessionEndReason = typeof metadata?.reason === 'string' ? metadata.reason : undefined;
    const shouldError =
      event.eventType === 'error' ||
      success === false ||
      sessionEndReason === 'error';
    store.endSession(sessionId, shouldError ? 'error' : 'completed');
  }
}

export async function recordAgentTrace(input: RecordAgentTraceInput): Promise<string> {
  const id = nanoid();
  if (!isAgentTraceRecordingEnabled()) {
    return id;
  }

  // Use vcs directly if provided, otherwise extract from vcsContext
  const vcsInfo = input.vcs ?? input.vcsContext?.vcs;

  // Build extended metadata including VCS context
  const extendedMetadata: Record<string, unknown> = {
    sessionId: input.sessionId,
    ...input.metadata,
  };

  // Add VCS context info to metadata if available (branch, remote, etc.)
  if (input.vcsContext) {
    if (input.vcsContext.branch) extendedMetadata.gitBranch = input.vcsContext.branch;
    if (input.vcsContext.remoteUrl) extendedMetadata.gitRemoteUrl = input.vcsContext.remoteUrl;
    if (input.vcsContext.repoPath) extendedMetadata.gitRepoPath = input.vcsContext.repoPath;
  }

  const traceContext = resolveTraceContext(input);

  const record: AgentTraceRecord = {
    version: AGENT_TRACE_VERSION,
    id,
    timestamp: new Date().toISOString(),
    vcs: vcsInfo,
    tool: {
      name: AGENT_TRACE_TOOL_NAME,
      version: AGENT_TRACE_TOOL_VERSION,
    },
    files: [buildFileEntry(input)],
    eventType: input.eventType,
    traceId: traceContext.traceId,
    spanId: traceContext.spanId,
    parentSpanId: traceContext.parentSpanId,
    turnId: input.turnId,
    stepId: input.stepId,
    metadata: extendedMetadata,
  };

  await agentTraceRepository.create({
    record,
    sessionId: input.sessionId,
    vcsType: vcsInfo?.type,
    vcsRevision: vcsInfo?.revision,
  });
  syncRecordToLiveStore(record, input.sessionId);

  await enforceMaxRecordsLimit();

  return id;
}

/** Token usage information from AI SDK */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface RecordFromToolCallInput {
  sessionId?: string;
  agentName?: string;
  provider?: string;
  model?: string;
  toolCallId?: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  toolResult: unknown;
  /** Token usage for this tool call step */
  tokenUsage?: TokenUsage;
  /** Latency in milliseconds */
  latencyMs?: number;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function getModelId(provider?: string, model?: string): string | undefined {
  if (!provider || !model) return undefined;
  return `${provider}/${model}`;
}

interface VcsContext {
  vcs: { type: VcsType; revision: string };
  branch?: string;
  remoteUrl?: string;
  repoPath?: string;
}

/**
 * Get VCS info from the existing Git store - reuses the centralized Git state
 * instead of duplicating Git command invocations.
 * Falls back to multi-VCS detection for non-Git repositories.
 */
function getVcsFromGitStore(): VcsContext | undefined {
  const state = useGitStore.getState();
  const repoInfo = state.currentRepoInfo;
  const hash = repoInfo?.lastCommit?.hash;
  if (!hash) return undefined;

  return {
    vcs: { type: 'git', revision: hash },
    branch: repoInfo.branch || undefined,
    remoteUrl: repoInfo.remoteUrl || undefined,
    repoPath: state.currentRepoPath || undefined,
  };
}

/**
 * Get VCS info using multi-VCS detection (supports git, jj, hg, svn).
 * Uses async detection when Git store doesn't have info.
 */
async function getVcsInfoAsync(filePath: string): Promise<VcsContext | undefined> {
  // First try Git store (synchronous, fast)
  const gitContext = getVcsFromGitStore();
  if (gitContext) return gitContext;

  // Fall back to multi-VCS detection
  if (!vcsService.isAvailable()) return undefined;

  // Extract directory from file path
  const dirPath = filePath.includes('/') || filePath.includes('\\')
    ? filePath.substring(0, Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\')))
    : '.';

  try {
    const result = await vcsService.getInfo(dirPath);
    if (result.success && result.data) {
      return {
        vcs: { type: result.data.vcsType, revision: result.data.revision },
        branch: result.data.branch || undefined,
        remoteUrl: result.data.remoteUrl || undefined,
        repoPath: result.data.repoRoot,
      };
    }
  } catch {
    // VCS detection failed, continue without VCS info
  }

  return undefined;
}

function isSuccessResult(result: unknown): boolean {
  if (!result || typeof result !== 'object') return false;
  return Boolean((result as { success?: unknown }).success);
}

function extractErrorMessage(result: unknown): string | undefined {
  if (!result || typeof result !== 'object') return 'Unknown error';
  const obj = result as Record<string, unknown>;
  if (typeof obj.error === 'string') return obj.error;
  if (typeof obj.message === 'string') return obj.message;
  if (obj.error && typeof obj.error === 'object') {
    const err = obj.error as Record<string, unknown>;
    if (typeof err.message === 'string') return err.message;
  }
  return 'Operation failed';
}

/**
 * Check if a tool name should be traced
 */
export function isTracedTool(toolName: string): boolean {
  return TRACED_TOOL_NAMES.includes(toolName as TracedToolName);
}

export interface RecordAgentTraceEventInput {
  sessionId?: string;
  contributorType: ContributorType;
  modelId?: string;
  eventType: AgentTraceEventType;
  metadata?: Record<string, unknown>;
  vcsContext?: VcsContext;
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  turnId?: string;
  stepId?: string;
  /** Duration of this event in milliseconds */
  duration?: number;
  /** Pre-computed cost estimate, or auto-computed from modelId + tokenUsage in metadata */
  costEstimate?: TraceCostEstimate;
  /** Severity level */
  severity?: AgentTraceSeverity;
  /** Tags for categorization */
  tags?: string[];
}

export async function recordAgentTraceEvent(input: RecordAgentTraceEventInput): Promise<string> {
  const id = nanoid();
  if (!isAgentTraceRecordingEnabled()) {
    return id;
  }
  const vcsInfo = input.vcsContext?.vcs;
  const traceContext = resolveTraceContext(input);

  // Auto-compute cost if not provided but tokenUsage exists in metadata
  let costEstimate = input.costEstimate;
  if (!costEstimate && input.modelId && input.metadata) {
    const tu = input.metadata.tokenUsage as { promptTokens?: number; completionTokens?: number } | undefined;
    const usage = input.metadata.usage as { promptTokens?: number; completionTokens?: number } | undefined;
    const tokens = tu || usage;
    if (tokens && (tokens.promptTokens || tokens.completionTokens)) {
      costEstimate = estimateTraceCost(input.modelId, {
        promptTokens: tokens.promptTokens ?? 0,
        completionTokens: tokens.completionTokens ?? 0,
      });
    }
  }

  const record: AgentTraceRecord = {
    version: AGENT_TRACE_VERSION,
    id,
    timestamp: new Date().toISOString(),
    vcs: vcsInfo,
    tool: {
      name: AGENT_TRACE_TOOL_NAME,
      version: AGENT_TRACE_TOOL_VERSION,
    },
    files: [],
    eventType: input.eventType,
    traceId: traceContext.traceId,
    spanId: traceContext.spanId,
    parentSpanId: traceContext.parentSpanId,
    turnId: input.turnId,
    stepId: input.stepId,
    duration: input.duration,
    costEstimate,
    severity: input.severity,
    tags: input.tags,
    metadata: {
      sessionId: input.sessionId,
      ...input.metadata,
    },
  };

  await agentTraceRepository.create({
    record,
    sessionId: input.sessionId,
    vcsType: vcsInfo?.type,
    vcsRevision: vcsInfo?.revision,
  });
  syncRecordToLiveStore(record, input.sessionId);

  await enforceMaxRecordsLimit();

  return id;
}

export async function recordAgentTraceFromToolCall(input: RecordFromToolCallInput): Promise<void> {
  const { toolName, toolArgs, toolResult, tokenUsage, latencyMs } = input;

  // Get agent trace settings from store
  const { enabled, traceShellCommands, traceCodeEdits, traceFailedCalls } = useSettingsStore.getState().agentTraceSettings;
  if (!enabled) return;

  // Check if this is a successful result
  const isSuccess = isSuccessResult(toolResult);

  // Build common metadata including token usage and success status
  const buildMetadata = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({
    toolCallId: input.toolCallId,
    toolName,
    agentName: input.agentName,
    success: isSuccess,
    ...(!isSuccess && { error: extractErrorMessage(toolResult) }),
    ...(tokenUsage && { tokenUsage }),
    ...(latencyMs !== undefined && { latencyMs }),
    ...extra,
  });

  // File write operations
  if (toolName === 'file_write' || toolName === 'file_append') {
    const path = asString(toolArgs.path);
    const content = asString(toolArgs.content);
    if (!path || content === null) return;
    // Skip failed calls if traceFailedCalls is disabled
    if (!isSuccess && !traceFailedCalls) return;

    // Use multi-VCS detection (supports git, jj, hg, svn)
    const vcsContext = await getVcsInfoAsync(path);

    const range = extractLineRangeFromArgs(toolArgs);
    const traceId = await recordAgentTrace({
      sessionId: input.sessionId,
      conversationUrl: input.sessionId ? `cognia://agent-session/${input.sessionId}` : undefined,
      contributorType: 'ai',
      modelId: getModelId(input.provider, input.model),
      filePath: path,
      content,
      range,
      vcsContext,
      eventType: 'tool_call_result',
      metadata: buildMetadata(),
    });

    // Create checkpoint for rollback support
    if (input.sessionId && isSuccess) {
      void createCheckpoint(
        input.sessionId,
        traceId,
        path,
        '', // Original content not available here; will be populated by file tools
        content,
        getModelId(input.provider, input.model)
      ).catch(() => { /* checkpoint creation is best-effort */ });
    }
    return;
  }

  if (toolName === 'artifact_create') {
    const content = asString(toolArgs.content);
    if (content === null) return;
    // Skip failed calls if traceFailedCalls is disabled
    if (!isSuccess && !traceFailedCalls) return;

    const resultObj = toolResult as { artifactId?: unknown } | null;
    const artifactId = resultObj && typeof resultObj === 'object' ? asString(resultObj.artifactId) : null;
    // For failed calls, use a placeholder artifact ID
    const effectiveArtifactId = artifactId || `failed-${Date.now()}`;

    // Artifacts use Git store directly (no file path for VCS detection)
    const vcsContext = getVcsFromGitStore();

    await recordAgentTrace({
      sessionId: input.sessionId,
      conversationUrl: input.sessionId ? `cognia://agent-session/${input.sessionId}` : undefined,
      contributorType: 'ai',
      modelId: getModelId(input.provider, input.model),
      filePath: `artifact:${effectiveArtifactId}`,
      content,
      vcsContext,
      eventType: 'tool_call_result',
      metadata: buildMetadata(),
    });
    return;
  }

  if (toolName === 'artifact_update') {
    const artifactId = asString(toolArgs.artifactId);
    const content = asString(toolArgs.content);
    if (!artifactId || content === null) return;
    // Skip failed calls if traceFailedCalls is disabled
    if (!isSuccess && !traceFailedCalls) return;

    // Artifacts use Git store directly (no file path for VCS detection)
    const vcsContext = getVcsFromGitStore();

    await recordAgentTrace({
      sessionId: input.sessionId,
      conversationUrl: input.sessionId ? `cognia://agent-session/${input.sessionId}` : undefined,
      contributorType: 'ai',
      modelId: getModelId(input.provider, input.model),
      filePath: `artifact:${artifactId}`,
      content,
      vcsContext,
      eventType: 'tool_call_result',
      metadata: buildMetadata(),
    });
    return;
  }

  // Code edit operations - check traceCodeEdits setting
  if (toolName === 'code_edit' || toolName === 'code_create') {
    // Skip if code edit tracing is disabled
    if (!traceCodeEdits) return;

    const path = asString(toolArgs.path) || asString(toolArgs.filePath);
    const content = asString(toolArgs.content) || asString(toolArgs.code);
    if (!path || content === null) return;
    // Skip failed calls if traceFailedCalls is disabled
    if (!isSuccess && !traceFailedCalls) return;

    // Use multi-VCS detection (supports git, jj, hg, svn)
    const vcsContext = await getVcsInfoAsync(path);

    const range = extractLineRangeFromArgs(toolArgs);
    const traceId = await recordAgentTrace({
      sessionId: input.sessionId,
      conversationUrl: input.sessionId ? `cognia://agent-session/${input.sessionId}` : undefined,
      contributorType: 'ai',
      modelId: getModelId(input.provider, input.model),
      filePath: path,
      content,
      range,
      vcsContext,
      eventType: 'tool_call_result',
      metadata: buildMetadata(),
    });

    // Create checkpoint for rollback support
    if (input.sessionId && isSuccess) {
      const originalContent = asString(toolArgs.originalContent) || '';
      void createCheckpoint(
        input.sessionId,
        traceId,
        path,
        originalContent,
        content,
        getModelId(input.provider, input.model)
      ).catch(() => { /* checkpoint creation is best-effort */ });
    }
    return;
  }

  // Shell execute - check traceShellCommands setting
  if (toolName === 'shell_execute') {
    // Skip if shell command tracing is disabled
    if (!traceShellCommands) return;

    const command = asString(toolArgs.command) || asString(toolArgs.script);
    if (!command) return;
    // Skip failed calls if traceFailedCalls is disabled
    if (!isSuccess && !traceFailedCalls) return;

    // Shell commands use Git store directly (working directory context)
    const vcsContext = getVcsFromGitStore();

    await recordAgentTrace({
      sessionId: input.sessionId,
      conversationUrl: input.sessionId ? `cognia://agent-session/${input.sessionId}` : undefined,
      contributorType: 'ai',
      modelId: getModelId(input.provider, input.model),
      filePath: `shell:${Date.now()}`,
      content: command,
      vcsContext,
      eventType: 'tool_call_result',
      metadata: buildMetadata({ type: 'shell_command' }),
    });
  }
}
