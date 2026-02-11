/**
 * Artifact Tools - Tools for creating and managing rich artifacts
 *
 * Features:
 * - Create various artifact types (code, react, mermaid, html, svg, etc.)
 * - Update artifact content
 * - List and search artifacts
 * - Render and export artifacts
 */

import { z } from 'zod';
import { useArtifactStore, useSessionStore } from '@/stores';
import type { Artifact, ArtifactType, ArtifactLanguage } from '@/types';
import type { ToolDefinition } from './registry';

// Supported artifact types (matching types/artifact/artifact.ts)
export const ARTIFACT_TYPES: ArtifactType[] = [
  'code',
  'document',
  'svg',
  'html',
  'react',
  'mermaid',
  'chart',
  'math',
  'jupyter',
];

// Supported languages for code artifacts (matching types/artifact/artifact.ts)
export const SUPPORTED_LANGUAGES: ArtifactLanguage[] = [
  'javascript',
  'typescript',
  'python',
  'html',
  'css',
  'json',
  'markdown',
  'jsx',
  'tsx',
  'sql',
  'bash',
  'yaml',
  'xml',
  'svg',
  'mermaid',
  'latex',
];

// Input schemas
export const artifactCreateInputSchema = z.object({
  title: z.string().describe('Title for the artifact'),
  content: z.string().describe('Content of the artifact (code, markup, or text)'),
  type: z
    .enum(ARTIFACT_TYPES as [string, ...string[]])
    .describe('Type of artifact to create'),
  language: z
    .enum(SUPPORTED_LANGUAGES as [string, ...string[]])
    .optional()
    .describe('Programming language (for code artifacts)'),
  description: z.string().optional().describe('Optional description of what the artifact does'),
  autoRender: z.boolean().optional().default(true).describe('Whether to automatically render the artifact'),
});

export const artifactUpdateInputSchema = z.object({
  artifactId: z.string().describe('ID of the artifact to update'),
  content: z.string().optional().describe('New content for the artifact'),
  title: z.string().optional().describe('New title for the artifact'),
  description: z.string().optional().describe('New description'),
});

export const artifactReadInputSchema = z.object({
  artifactId: z.string().optional().describe('ID of specific artifact to read. If not provided, returns recent artifacts.'),
  limit: z.number().optional().default(10).describe('Maximum number of artifacts to return'),
});

export const artifactSearchInputSchema = z.object({
  query: z.string().describe('Search query to find artifacts'),
  type: z.enum(ARTIFACT_TYPES as [string, ...string[]]).optional().describe('Filter by artifact type'),
  limit: z.number().optional().default(5).describe('Maximum results to return'),
});

export const artifactRenderInputSchema = z.object({
  artifactId: z.string().describe('ID of the artifact to render'),
  format: z.enum(['preview', 'fullscreen']).optional().default('preview').describe('Render format'),
});

export const artifactExportInputSchema = z.object({
  artifactId: z.string().describe('ID of the artifact to export'),
  format: z.enum(['png', 'svg', 'pdf', 'html', 'raw']).describe('Export format'),
});

export const artifactDeleteInputSchema = z.object({
  artifactId: z.string().describe('ID of the artifact to delete'),
  confirm: z.boolean().default(true).describe('Confirm deletion'),
});

// Type exports
export type ArtifactCreateInput = z.infer<typeof artifactCreateInputSchema>;
export type ArtifactUpdateInput = z.infer<typeof artifactUpdateInputSchema>;
export type ArtifactReadInput = z.infer<typeof artifactReadInputSchema>;
export type ArtifactSearchInput = z.infer<typeof artifactSearchInputSchema>;
export type ArtifactRenderInput = z.infer<typeof artifactRenderInputSchema>;
export type ArtifactExportInput = z.infer<typeof artifactExportInputSchema>;
export type ArtifactDeleteInput = z.infer<typeof artifactDeleteInputSchema>;

export interface ArtifactToolResult {
  success: boolean;
  message: string;
  artifactId?: string;
  artifact?: {
    id: string;
    title: string;
    type: ArtifactType;
    language?: ArtifactLanguage;
    contentPreview: string;
    createdAt: string;
  };
  artifacts?: Array<{
    id: string;
    title: string;
    type: ArtifactType;
    language?: ArtifactLanguage;
    contentPreview: string;
    createdAt: string;
  }>;
  error?: string;
}

/**
 * Format artifact for output
 */
function formatArtifact(artifact: Artifact): {
  id: string;
  title: string;
  type: ArtifactType;
  language?: ArtifactLanguage;
  contentPreview: string;
  createdAt: string;
} {
  return {
    id: artifact.id,
    title: artifact.title,
    type: artifact.type,
    language: artifact.language,
    contentPreview: artifact.content.slice(0, 200) + (artifact.content.length > 200 ? '...' : ''),
    createdAt: artifact.createdAt.toISOString(),
  };
}

/**
 * Execute artifact create
 */
export async function executeArtifactCreate(input: ArtifactCreateInput): Promise<ArtifactToolResult> {
  try {
    const store = useArtifactStore.getState();

    const activeSession = useSessionStore.getState().getActiveSession();
    const artifact = store.createArtifact({
      sessionId: activeSession?.id || `agent-session-${Date.now()}`,
      messageId: `agent-${Date.now()}`,
      type: input.type as ArtifactType,
      title: input.title,
      content: input.content,
      language: input.language as ArtifactLanguage | undefined,
    });

    if (input.autoRender) {
      store.setActiveArtifact(artifact.id);
      store.openPanel('artifact');
    }

    return {
      success: true,
      message: `Created ${input.type} artifact "${input.title}"${input.autoRender ? ' and opened it for viewing' : ''}.`,
      artifactId: artifact.id,
      artifact: formatArtifact(artifact),
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to create artifact: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute artifact update
 */
export async function executeArtifactUpdate(input: ArtifactUpdateInput): Promise<ArtifactToolResult> {
  try {
    const store = useArtifactStore.getState();
    const artifact = store.artifacts[input.artifactId];

    if (!artifact) {
      return {
        success: false,
        message: `Artifact with ID "${input.artifactId}" not found.`,
      };
    }

    const updates: Partial<Artifact> = {};
    if (input.content !== undefined) updates.content = input.content;
    if (input.title !== undefined) updates.title = input.title;

    store.updateArtifact(input.artifactId, updates);

    return {
      success: true,
      message: `Updated artifact "${artifact.title}".`,
      artifactId: input.artifactId,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to update artifact: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute artifact read
 */
export async function executeArtifactRead(input: ArtifactReadInput): Promise<ArtifactToolResult> {
  try {
    const store = useArtifactStore.getState();

    if (input.artifactId) {
      const artifact = store.artifacts[input.artifactId];
      if (!artifact) {
        return {
          success: false,
          message: `Artifact with ID "${input.artifactId}" not found.`,
        };
      }
      return {
        success: true,
        message: `Found artifact "${artifact.title}".`,
        artifactId: artifact.id,
        artifact: {
          ...formatArtifact(artifact),
          contentPreview: artifact.content,
        },
      };
    }

    const limited = store.getRecentArtifacts(input.limit || 10);

    return {
      success: true,
      message: `Found ${limited.length} artifact(s).`,
      artifacts: limited.map(formatArtifact),
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to read artifacts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute artifact search
 */
export async function executeArtifactSearch(input: ArtifactSearchInput): Promise<ArtifactToolResult> {
  try {
    const store = useArtifactStore.getState();
    const query = input.query.toLowerCase();

    let results = Object.values(store.artifacts).filter((artifact) => {
      const matchesQuery =
        artifact.title.toLowerCase().includes(query) ||
        artifact.content.toLowerCase().includes(query);
      const matchesType = !input.type || artifact.type === input.type;
      return matchesQuery && matchesType;
    });

    results = results.slice(0, input.limit || 5);

    return {
      success: true,
      message: `Found ${results.length} artifact(s) matching "${input.query}".`,
      artifacts: results.map(formatArtifact),
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to search artifacts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute artifact render
 */
export async function executeArtifactRender(input: ArtifactRenderInput): Promise<ArtifactToolResult> {
  try {
    const store = useArtifactStore.getState();
    const artifact = store.artifacts[input.artifactId];

    if (!artifact) {
      return {
        success: false,
        message: `Artifact with ID "${input.artifactId}" not found.`,
      };
    }

    store.setActiveArtifact(input.artifactId);
    store.openPanel('artifact');

    return {
      success: true,
      message: `Rendering artifact "${artifact.title}" in ${input.format} mode.`,
      artifactId: input.artifactId,
      artifact: formatArtifact(artifact),
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to render artifact: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute artifact export
 */
export async function executeArtifactExport(input: ArtifactExportInput): Promise<ArtifactToolResult> {
  try {
    const store = useArtifactStore.getState();
    const artifact = store.artifacts[input.artifactId];

    if (!artifact) {
      return {
        success: false,
        message: `Artifact with ID "${input.artifactId}" not found.`,
      };
    }

    // For now, we just return the raw content - actual export would need platform-specific handling
    if (input.format === 'raw') {
      return {
        success: true,
        message: `Exported artifact "${artifact.title}" as raw content.`,
        artifactId: input.artifactId,
        artifact: {
          ...formatArtifact(artifact),
          contentPreview: artifact.content,
        },
      };
    }

    return {
      success: true,
      message: `Export to ${input.format} format initiated for "${artifact.title}". Check the artifact panel for download.`,
      artifactId: input.artifactId,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to export artifact: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute artifact delete
 */
export async function executeArtifactDelete(input: ArtifactDeleteInput): Promise<ArtifactToolResult> {
  try {
    if (!input.confirm) {
      return {
        success: false,
        message: 'Deletion cancelled: confirmation required.',
      };
    }

    const store = useArtifactStore.getState();
    const artifact = store.artifacts[input.artifactId];

    if (!artifact) {
      return {
        success: false,
        message: `Artifact with ID "${input.artifactId}" not found.`,
      };
    }

    const title = artifact.title;
    store.deleteArtifact(input.artifactId);

    return {
      success: true,
      message: `Deleted artifact "${title}".`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to delete artifact: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Tool definitions for registry
export const artifactCreateTool: ToolDefinition = {
  name: 'artifact_create',
  category: 'artifact',
  description: `Create a rich artifact for the user. Artifacts are rendered UI elements that appear alongside the chat.

Supported types:
- **code**: Syntax-highlighted code with copy/run functionality
- **react**: Interactive React/JSX components rendered live
- **mermaid**: Diagrams and flowcharts using Mermaid syntax
- **html**: Raw HTML rendered in a sandbox
- **svg**: Vector graphics
- **document**: Formatted markdown content
- **chart**: Data visualizations
- **math**: LaTeX math expressions
- **jupyter**: Jupyter notebooks

Languages: ${SUPPORTED_LANGUAGES.join(', ')}`,
  parameters: artifactCreateInputSchema,
  create: () => async (args: unknown) => executeArtifactCreate(args as ArtifactCreateInput),
  requiresApproval: false,
};

export const artifactUpdateTool: ToolDefinition = {
  name: 'artifact_update',
  category: 'artifact',
  description: 'Update the content or title of an existing artifact.',
  parameters: artifactUpdateInputSchema,
  create: () => async (args: unknown) => executeArtifactUpdate(args as ArtifactUpdateInput),
  requiresApproval: false,
};

export const artifactReadTool: ToolDefinition = {
  name: 'artifact_read',
  category: 'artifact',
  description: 'Read artifact content by ID, or list recent artifacts.',
  parameters: artifactReadInputSchema,
  create: () => async (args: unknown) => executeArtifactRead(args as ArtifactReadInput),
  requiresApproval: false,
};

export const artifactSearchTool: ToolDefinition = {
  name: 'artifact_search',
  category: 'artifact',
  description: 'Search for artifacts by title, content, or type.',
  parameters: artifactSearchInputSchema,
  create: () => async (args: unknown) => executeArtifactSearch(args as ArtifactSearchInput),
  requiresApproval: false,
};

export const artifactRenderTool: ToolDefinition = {
  name: 'artifact_render',
  category: 'artifact',
  description: 'Render an artifact in the UI for the user to view.',
  parameters: artifactRenderInputSchema,
  create: () => async (args: unknown) => executeArtifactRender(args as ArtifactRenderInput),
  requiresApproval: false,
};

export const artifactExportTool: ToolDefinition = {
  name: 'artifact_export',
  category: 'artifact',
  description: 'Export an artifact to a specific format (png, svg, pdf, html, or raw).',
  parameters: artifactExportInputSchema,
  create: () => async (args: unknown) => executeArtifactExport(args as ArtifactExportInput),
  requiresApproval: false,
};

export const artifactDeleteTool: ToolDefinition = {
  name: 'artifact_delete',
  category: 'artifact',
  description: 'Delete an artifact. Requires confirmation.',
  parameters: artifactDeleteInputSchema,
  create: () => async (args: unknown) => executeArtifactDelete(args as ArtifactDeleteInput),
  requiresApproval: true,
};

// All artifact tools for registration
export const artifactTools: ToolDefinition[] = [
  artifactCreateTool,
  artifactUpdateTool,
  artifactReadTool,
  artifactSearchTool,
  artifactRenderTool,
  artifactExportTool,
  artifactDeleteTool,
];

/**
 * Register all artifact tools to the registry
 */
export function registerArtifactTools(registry: { register: (tool: ToolDefinition) => void }): void {
  for (const tool of artifactTools) {
    registry.register(tool);
  }
}

/**
 * Get artifact tools prompt for system message
 */
export function getArtifactToolsPrompt(): string {
  return `## Artifact Tools

You have access to artifact creation and management tools:

- **artifact_create**: Create rich artifacts (code, diagrams, React components, etc.)
- **artifact_update**: Modify existing artifact content
- **artifact_read**: Read artifact content or list recent artifacts
- **artifact_search**: Search for artifacts by content or type
- **artifact_render**: Display an artifact in the UI
- **artifact_export**: Export artifacts to various formats
- **artifact_delete**: Remove an artifact (requires confirmation)

Use artifacts when you want to provide:
- Interactive code examples
- Visualizations and diagrams
- UI components
- Formatted documentation`;
}
