/**
 * Capabilities - Unified capability detection for agents
 *
 * Provides:
 * - Detection of available local capabilities (Tauri, Python, etc.)
 * - Capability summary for agent context
 * - Capability-aware tool wrapping
 */

import { isEnvironmentAvailable } from '@/lib/native/environment';
import { isTauri } from '@/lib/native/utils';

export interface AgentCapabilities {
  /** Platform: web browser or Tauri desktop app */
  platform: 'web' | 'tauri';
  /** Whether running in desktop (Tauri) environment */
  isDesktop: boolean;
  /** Individual feature availability */
  features: {
    /** File system access */
    fileSystem: boolean;
    /** Process management */
    processManagement: boolean;
    /** Python virtual environment management */
    pythonEnvironment: boolean;
    /** Jupyter kernel for code execution */
    jupyterKernel: boolean;
    /** Browser automation via Playwright */
    browserAutomation: boolean;
    /** Web search capability */
    webSearch: boolean;
    /** RAG/vector search */
    ragSearch: boolean;
    /** MCP server connections */
    mcpServers: boolean;
    /** Artifact creation */
    artifacts: boolean;
    /** Memory persistence */
    memory: boolean;
    /** Canvas document editing */
    canvas: boolean;
  };
  /** List of connected MCP servers */
  mcpServerNames: string[];
  /** Available Python versions (if any) */
  pythonVersions: string[];
}

/**
 * Detect if running in Tauri desktop environment
 */
export function isTauriEnvironment(): boolean {
  return isTauri();
}

/**
 * Detect all available agent capabilities
 */
export function detectCapabilities(options?: {
  mcpServers?: Array<{ name: string; status: { type: string } }>;
  hasApiKeys?: {
    tavily?: boolean;
    openai?: boolean;
  };
  vectorDbEnabled?: boolean;
}): AgentCapabilities {
  const isDesktop = isTauriEnvironment();
  const envAvailable = isEnvironmentAvailable();

  return {
    platform: isDesktop ? 'tauri' : 'web',
    isDesktop,
    features: {
      fileSystem: isDesktop,
      processManagement: isDesktop,
      pythonEnvironment: envAvailable,
      jupyterKernel: envAvailable,
      browserAutomation: isDesktop,
      webSearch: options?.hasApiKeys?.tavily ?? false,
      ragSearch: options?.vectorDbEnabled ?? false,
      mcpServers: (options?.mcpServers?.filter(s => s.status.type === 'connected').length ?? 0) > 0,
      artifacts: true, // Always available
      memory: true, // Always available
      canvas: true, // Always available
    },
    mcpServerNames: options?.mcpServers
      ?.filter(s => s.status.type === 'connected')
      .map(s => s.name) ?? [],
    pythonVersions: [], // Would be populated async
  };
}

/**
 * Get a human-readable summary of capabilities
 */
export function getCapabilitySummary(caps: AgentCapabilities): string {
  const available: string[] = [];
  const unavailable: string[] = [];

  const featureLabels: Record<keyof AgentCapabilities['features'], string> = {
    fileSystem: 'File system access',
    processManagement: 'Process management',
    pythonEnvironment: 'Python environments',
    jupyterKernel: 'Jupyter code execution',
    browserAutomation: 'Browser automation',
    webSearch: 'Web search',
    ragSearch: 'Knowledge base search',
    mcpServers: 'MCP tools',
    artifacts: 'Artifact creation',
    memory: 'Persistent memory',
    canvas: 'Canvas editing',
  };

  for (const [key, label] of Object.entries(featureLabels)) {
    if (caps.features[key as keyof AgentCapabilities['features']]) {
      available.push(label);
    } else {
      unavailable.push(label);
    }
  }

  let summary = `## Platform: ${caps.platform === 'tauri' ? 'Desktop App' : 'Web Browser'}\n\n`;

  if (available.length > 0) {
    summary += `**Available capabilities:**\n${available.map(a => `- ✓ ${a}`).join('\n')}\n\n`;
  }

  if (unavailable.length > 0) {
    summary += `**Not available:**\n${unavailable.map(u => `- ✗ ${u}`).join('\n')}\n\n`;
  }

  if (caps.mcpServerNames.length > 0) {
    summary += `**Connected MCP servers:** ${caps.mcpServerNames.join(', ')}\n`;
  }

  return summary;
}

/**
 * Get a system prompt snippet describing capabilities
 */
export function getCapabilitySystemPrompt(caps: AgentCapabilities): string {
  const available: string[] = [];

  if (caps.features.fileSystem) {
    available.push('Read, write, and manage files on the user\'s system');
  }
  if (caps.features.processManagement) {
    available.push('List and manage running processes');
  }
  if (caps.features.pythonEnvironment) {
    available.push('Create and manage Python virtual environments');
  }
  if (caps.features.jupyterKernel) {
    available.push('Execute Python code with Jupyter kernels');
  }
  if (caps.features.browserAutomation) {
    available.push('Automate browser actions with Playwright');
  }
  if (caps.features.webSearch) {
    available.push('Search the web for current information');
  }
  if (caps.features.ragSearch) {
    available.push('Search the user\'s knowledge base and documents');
  }
  if (caps.features.mcpServers && caps.mcpServerNames.length > 0) {
    available.push(`Use tools from MCP servers: ${caps.mcpServerNames.join(', ')}`);
  }
  if (caps.features.artifacts) {
    available.push('Create rich artifacts (code, diagrams, React components)');
  }
  if (caps.features.memory) {
    available.push('Store and recall information across conversations');
  }
  if (caps.features.canvas) {
    available.push('Create and edit Canvas documents');
  }

  if (available.length === 0) {
    return '';
  }

  return `## Your Capabilities

You have access to the following capabilities:
${available.map(a => `- ${a}`).join('\n')}

Use these capabilities when appropriate to help the user. If a capability is needed but not available, explain what would be required to enable it.`;
}

/**
 * Check if a specific capability is available
 */
export function hasCapability(
  caps: AgentCapabilities,
  feature: keyof AgentCapabilities['features']
): boolean {
  return caps.features[feature];
}

/**
 * Create a capability-aware tool wrapper
 * Returns a tool that checks capability before execution
 */
export function createCapabilityAwareTool<T>(
  tool: {
    name: string;
    description: string;
    parameters: T;
    execute: (args: unknown) => Promise<unknown>;
    requiresApproval?: boolean;
  },
  requiredCapability: keyof AgentCapabilities['features'],
  caps: AgentCapabilities
): typeof tool {
  if (hasCapability(caps, requiredCapability)) {
    return tool;
  }

  // Return a modified tool that explains the capability is unavailable
  return {
    ...tool,
    execute: async () => ({
      success: false,
      error: `This feature requires ${requiredCapability} capability which is not available in the current environment (${caps.platform}).`,
      suggestion: caps.platform === 'web'
        ? 'This feature is only available in the desktop app.'
        : 'Please check your system configuration.',
    }),
  };
}

export default detectCapabilities;
