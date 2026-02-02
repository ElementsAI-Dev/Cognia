/**
 * External Agent Presets
 *
 * Predefined configurations for popular external AI agents.
 * Allows quick setup of Codex, Claude Code, and other ACP-compatible agents.
 */

import type {
  ExternalAgentConfig,
  ExternalAgentProtocol,
  ExternalAgentTransport,
  AcpPermissionMode,
} from '@/types/agent/external-agent';
import { nanoid } from 'nanoid';

// ============================================================================
// Preset Types
// ============================================================================

/**
 * Available external agent presets
 */
export type ExternalAgentPresetId = 'codex' | 'claude-code' | 'gemini-cli' | 'custom';

/**
 * Preset configuration definition
 */
export interface ExternalAgentPresetConfig {
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Protocol type */
  protocol: ExternalAgentProtocol;
  /** Transport type */
  transport: ExternalAgentTransport;
  /** Process configuration for stdio transport */
  process?: {
    command: string;
    args: string[];
    env?: Record<string, string>;
  };
  /** Network configuration for http/websocket transport */
  network?: {
    endpoint: string;
  };
  /** Hint for required environment variables */
  envVarHint?: string;
  /** Default permission mode */
  defaultPermissionMode: AcpPermissionMode;
  /** Tags for categorization */
  tags: string[];
  /** Icon identifier */
  icon?: string;
}

// ============================================================================
// Preset Definitions
// ============================================================================

/**
 * Predefined external agent configurations
 */
export const EXTERNAL_AGENT_PRESETS: Record<ExternalAgentPresetId, ExternalAgentPresetConfig | null> = {
  /**
   * OpenAI Codex via ACP adapter
   * @see https://github.com/zed-industries/codex-acp
   */
  codex: {
    name: 'Codex CLI',
    description: 'OpenAI Codex coding assistant via ACP adapter',
    protocol: 'acp',
    transport: 'stdio',
    process: {
      command: 'npx',
      args: ['-y', '@zed-industries/codex-acp'],
    },
    envVarHint: 'Requires OPENAI_API_KEY or CODEX_API_KEY environment variable',
    defaultPermissionMode: 'default',
    tags: ['coding', 'openai', 'codex'],
    icon: 'openai',
  },

  /**
   * Anthropic Claude Code Agent
   * @see https://github.com/anthropics/claude-code
   */
  'claude-code': {
    name: 'Claude Code',
    description: 'Anthropic Claude Code Agent for coding tasks',
    protocol: 'acp',
    transport: 'stdio',
    process: {
      command: 'npx',
      args: ['-y', '@anthropics/claude-code', '--stdio'],
    },
    envVarHint: 'Requires ANTHROPIC_API_KEY environment variable',
    defaultPermissionMode: 'default',
    tags: ['coding', 'anthropic', 'claude'],
    icon: 'anthropic',
  },

  /**
   * Google Gemini CLI Agent (placeholder)
   */
  'gemini-cli': {
    name: 'Gemini CLI',
    description: 'Google Gemini CLI coding assistant',
    protocol: 'acp',
    transport: 'stdio',
    process: {
      command: 'npx',
      args: ['-y', '@google/gemini-cli', '--stdio'],
    },
    envVarHint: 'Requires GOOGLE_API_KEY environment variable',
    defaultPermissionMode: 'default',
    tags: ['coding', 'google', 'gemini'],
    icon: 'google',
  },

  /**
   * Custom configuration - no preset values
   */
  custom: null,
};

// ============================================================================
// Preset Utilities
// ============================================================================

/**
 * Get all available preset IDs (excluding custom)
 */
export function getAvailablePresets(): ExternalAgentPresetId[] {
  return (Object.keys(EXTERNAL_AGENT_PRESETS) as ExternalAgentPresetId[]).filter(
    (id) => id !== 'custom' && EXTERNAL_AGENT_PRESETS[id] !== null
  );
}

/**
 * Get preset configuration by ID
 */
export function getPresetConfig(presetId: ExternalAgentPresetId): ExternalAgentPresetConfig | null {
  return EXTERNAL_AGENT_PRESETS[presetId];
}

/**
 * Create a full agent configuration from a preset
 * @param presetId Preset identifier
 * @param overrides Optional configuration overrides
 * @returns Full agent configuration or null if preset not found
 */
export function createAgentFromPreset(
  presetId: ExternalAgentPresetId,
  overrides?: Partial<ExternalAgentConfig>
): ExternalAgentConfig | null {
  const preset = EXTERNAL_AGENT_PRESETS[presetId];
  if (!preset) {
    return null;
  }

  const id = overrides?.id || nanoid();
  const now = new Date();

  return {
    id,
    name: overrides?.name || preset.name,
    description: overrides?.description || preset.description,
    protocol: preset.protocol,
    transport: preset.transport,
    enabled: overrides?.enabled ?? true,
    process: preset.process
      ? {
          command: overrides?.process?.command || preset.process.command,
          args: overrides?.process?.args || preset.process.args,
          env: { ...preset.process.env, ...overrides?.process?.env },
          cwd: overrides?.process?.cwd,
        }
      : undefined,
    network: preset.network
      ? {
          endpoint: overrides?.network?.endpoint || preset.network.endpoint,
          ...overrides?.network,
        }
      : overrides?.network,
    defaultPermissionMode: overrides?.defaultPermissionMode || preset.defaultPermissionMode,
    tags: [...preset.tags, ...(overrides?.tags || [])],
    timeout: overrides?.timeout || 30000,
    metadata: {
      preset: presetId,
      ...overrides?.metadata,
    },
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Check if an agent was created from a preset
 */
export function isFromPreset(config: ExternalAgentConfig): ExternalAgentPresetId | null {
  const preset = config.metadata?.preset as ExternalAgentPresetId | undefined;
  if (preset && preset in EXTERNAL_AGENT_PRESETS) {
    return preset;
  }
  return null;
}

/**
 * Get display info for a preset (for UI)
 */
export function getPresetDisplayInfo(presetId: ExternalAgentPresetId): {
  name: string;
  description: string;
  envVarHint?: string;
  tags: string[];
} | null {
  const preset = EXTERNAL_AGENT_PRESETS[presetId];
  if (!preset) return null;

  return {
    name: preset.name,
    description: preset.description,
    envVarHint: preset.envVarHint,
    tags: preset.tags,
  };
}
