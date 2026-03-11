import { nanoid } from 'nanoid';
import { isTauri } from '@/lib/utils';
import type {
  CreateExternalAgentInput,
  ExternalAgentBranchReasonCode,
  ExternalAgentConfig,
  ExternalAgentProtocol,
  ExternalAgentTransport,
} from '@/types/agent/external-agent';

export const SUPPORTED_EXTERNAL_AGENT_PROTOCOL = 'acp' as const;

const DEFAULT_TIMEOUT = 300000;
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  maxRetryDelay: 30000,
  retryOnErrors: [] as string[],
};

export interface ExternalAgentExecutionBlockAssessment {
  code: ExternalAgentBranchReasonCode;
  reason: string;
}

export function isSupportedExternalAgentProtocol(
  protocol: ExternalAgentProtocol
): protocol is typeof SUPPORTED_EXTERNAL_AGENT_PROTOCOL {
  return protocol === SUPPORTED_EXTERNAL_AGENT_PROTOCOL;
}

export function getUnsupportedProtocolReason(protocol: ExternalAgentProtocol): string {
  if (isSupportedExternalAgentProtocol(protocol)) {
    return '';
  }
  return `Protocol "${protocol}" is not executable yet. Please migrate this configuration to ACP.`;
}

export function isTransportSupportedOnCurrentPlatform(
  transport: ExternalAgentTransport,
  runtimeIsTauri = isTauri()
): boolean {
  if (transport !== 'stdio') {
    return true;
  }
  return runtimeIsTauri;
}

export function getExternalAgentExecutionBlockReason(
  config: ExternalAgentConfig,
  runtimeIsTauri = isTauri()
): string | null {
  const assessment = getExternalAgentExecutionBlock(config, runtimeIsTauri);
  return assessment?.reason ?? null;
}

export function getExternalAgentExecutionBlock(
  config: ExternalAgentConfig,
  runtimeIsTauri = isTauri()
): ExternalAgentExecutionBlockAssessment | null {
  if (!config.enabled) {
    return {
      code: 'agent_disabled',
      reason: 'Agent is disabled.',
    };
  }
  if (!isSupportedExternalAgentProtocol(config.protocol)) {
    return {
      code: 'protocol_unsupported',
      reason: getUnsupportedProtocolReason(config.protocol),
    };
  }
  if (!isTransportSupportedOnCurrentPlatform(config.transport, runtimeIsTauri)) {
    return {
      code: 'transport_blocked',
      reason: 'The stdio transport requires the desktop (Tauri) runtime.',
    };
  }
  return null;
}

export function isExternalAgentExecutable(
  config: ExternalAgentConfig,
  runtimeIsTauri = isTauri()
): boolean {
  return getExternalAgentExecutionBlockReason(config, runtimeIsTauri) === null;
}

export function normalizeExternalAgentConfigInput(
  input: CreateExternalAgentInput,
  options?: {
    id?: string;
    now?: Date;
    enabled?: boolean;
    defaultPermissionMode?: ExternalAgentConfig['defaultPermissionMode'];
  }
): ExternalAgentConfig {
  const now = options?.now ?? new Date();
  const protocol = input.protocol;
  const metadata: Record<string, unknown> = {
    ...(input.metadata ?? {}),
  };

  if (!isSupportedExternalAgentProtocol(protocol)) {
    metadata.unsupported = true;
    metadata.unsupportedProtocol = protocol;
    metadata.unsupportedReason = getUnsupportedProtocolReason(protocol);
  } else {
    delete metadata.unsupported;
    delete metadata.unsupportedProtocol;
    delete metadata.unsupportedReason;
  }

  return {
    id: options?.id ?? nanoid(),
    name: input.name.trim(),
    description: input.description,
    protocol,
    transport: input.transport,
    enabled: options?.enabled ?? true,
    process: input.process,
    network: input.network,
    defaultPermissionMode: input.defaultPermissionMode ?? options?.defaultPermissionMode ?? 'default',
    autoApprovePatterns: input.autoApprovePatterns,
    requireApprovalFor: input.requireApprovalFor,
    timeout: input.timeout ?? DEFAULT_TIMEOUT,
    retryConfig: {
      maxRetries: input.retryConfig?.maxRetries ?? DEFAULT_RETRY_CONFIG.maxRetries,
      retryDelay: input.retryConfig?.retryDelay ?? DEFAULT_RETRY_CONFIG.retryDelay,
      exponentialBackoff:
        input.retryConfig?.exponentialBackoff ?? DEFAULT_RETRY_CONFIG.exponentialBackoff,
      maxRetryDelay: input.retryConfig?.maxRetryDelay ?? DEFAULT_RETRY_CONFIG.maxRetryDelay,
      retryOnErrors: input.retryConfig?.retryOnErrors ?? DEFAULT_RETRY_CONFIG.retryOnErrors,
    },
    tags: input.tags,
    metadata,
    createdAt: now,
    updatedAt: now,
  };
}
