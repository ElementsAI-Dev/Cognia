import { nanoid } from 'nanoid';
import { agentTraceRepository } from '@/lib/db/repositories/agent-trace-repository';
import type { AgentTraceRecord, ContributorType, TraceFile, Contributor } from '@/types/agent-trace';
import { useGitStore } from '@/stores/git';
import { useSettingsStore } from '@/stores';
import { vcsService, type VcsType } from '@/lib/native/vcs';
import { countLines, fnv1a32 } from './utils';

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
  metadata?: Record<string, unknown>;
  vcs?: {
    type: 'git' | 'jj' | 'hg' | 'svn';
    revision: string;
  };
  /** Extended VCS context from Git store - branch, remote, etc. */
  vcsContext?: VcsContext;
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

  return {
    path: input.filePath,
    conversations: [
      {
        url: input.conversationUrl,
        contributor,
        ranges: [
          {
            start_line: 1,
            end_line: lineCount,
            content_hash: fnv1a32(input.content),
            contributor, // Also include in range for granular attribution
          },
        ],
      },
    ],
  };
}

export async function recordAgentTrace(input: RecordAgentTraceInput): Promise<string> {
  const id = nanoid();

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
    metadata: extendedMetadata,
  };

  await agentTraceRepository.create({
    record,
    sessionId: input.sessionId,
    vcsType: vcsInfo?.type,
    vcsRevision: vcsInfo?.revision,
  });

  return id;
}

export interface RecordFromToolCallInput {
  sessionId?: string;
  agentName?: string;
  provider?: string;
  model?: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  toolResult: unknown;
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

/**
 * Check if a tool name should be traced
 */
export function isTracedTool(toolName: string): boolean {
  return TRACED_TOOL_NAMES.includes(toolName as TracedToolName);
}

export async function recordAgentTraceFromToolCall(input: RecordFromToolCallInput): Promise<void> {
  const { toolName, toolArgs, toolResult } = input;

  // Get agent trace settings from store
  const { traceShellCommands, traceCodeEdits } = useSettingsStore.getState().agentTraceSettings;

  // File write operations
  if (toolName === 'file_write' || toolName === 'file_append') {
    const path = asString(toolArgs.path);
    const content = asString(toolArgs.content);
    if (!path || content === null) return;
    if (!isSuccessResult(toolResult)) return;

    // Use multi-VCS detection (supports git, jj, hg, svn)
    const vcsContext = await getVcsInfoAsync(path);

    await recordAgentTrace({
      sessionId: input.sessionId,
      conversationUrl: input.sessionId ? `cognia://agent-session/${input.sessionId}` : undefined,
      contributorType: 'ai',
      modelId: getModelId(input.provider, input.model),
      filePath: path,
      content,
      vcsContext,
      metadata: {
        toolName,
        agentName: input.agentName,
      },
    });
    return;
  }

  if (toolName === 'artifact_create') {
    const content = asString(toolArgs.content);
    if (content === null) return;
    if (!isSuccessResult(toolResult)) return;

    const resultObj = toolResult as { artifactId?: unknown } | null;
    const artifactId = resultObj && typeof resultObj === 'object' ? asString(resultObj.artifactId) : null;
    if (!artifactId) return;

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
      metadata: {
        toolName,
        agentName: input.agentName,
      },
    });
    return;
  }

  if (toolName === 'artifact_update') {
    const artifactId = asString(toolArgs.artifactId);
    const content = asString(toolArgs.content);
    if (!artifactId || content === null) return;
    if (!isSuccessResult(toolResult)) return;

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
      metadata: {
        toolName,
        agentName: input.agentName,
      },
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
    if (!isSuccessResult(toolResult)) return;

    // Use multi-VCS detection (supports git, jj, hg, svn)
    const vcsContext = await getVcsInfoAsync(path);

    await recordAgentTrace({
      sessionId: input.sessionId,
      conversationUrl: input.sessionId ? `cognia://agent-session/${input.sessionId}` : undefined,
      contributorType: 'ai',
      modelId: getModelId(input.provider, input.model),
      filePath: path,
      content,
      vcsContext,
      metadata: {
        toolName,
        agentName: input.agentName,
      },
    });
    return;
  }

  // Shell execute - check traceShellCommands setting
  if (toolName === 'shell_execute') {
    // Skip if shell command tracing is disabled
    if (!traceShellCommands) return;

    const command = asString(toolArgs.command) || asString(toolArgs.script);
    if (!command) return;
    if (!isSuccessResult(toolResult)) return;

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
      metadata: {
        toolName,
        agentName: input.agentName,
        type: 'shell_command',
      },
    });
  }
}
