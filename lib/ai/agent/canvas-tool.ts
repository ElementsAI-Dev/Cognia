/**
 * Canvas Tool - Agent tool for interacting with Canvas documents
 */

import { z } from 'zod';
import type { AgentTool } from './agent-executor';
import { useArtifactStore } from '@/stores';
import type { ArtifactLanguage } from '@/types';

const SUPPORTED_LANGUAGES: ArtifactLanguage[] = [
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
];

const canvasCreateInputSchema = z.object({
  title: z.string().describe('Title of the new canvas document'),
  content: z.string().describe('Initial content for the document'),
  language: z
    .enum(SUPPORTED_LANGUAGES as [string, ...string[]])
    .describe('Programming language or format'),
  type: z.enum(['code', 'text']).optional().default('code').describe('Document type'),
});

const canvasUpdateInputSchema = z.object({
  documentId: z.string().describe('ID of the canvas document to update'),
  content: z.string().optional().describe('New content for the document'),
  title: z.string().optional().describe('New title for the document'),
});

const canvasReadInputSchema = z.object({
  documentId: z.string().optional().describe('ID of specific document to read. If not provided, returns all documents.'),
});

export type CanvasCreateInput = z.infer<typeof canvasCreateInputSchema>;
export type CanvasUpdateInput = z.infer<typeof canvasUpdateInputSchema>;
export type CanvasReadInput = z.infer<typeof canvasReadInputSchema>;

interface CanvasToolResult {
  success: boolean;
  message: string;
  documentId?: string;
  content?: string;
  documents?: Array<{
    id: string;
    title: string;
    language: string;
    type: string;
    contentPreview: string;
  }>;
}

/**
 * Create a new Canvas document
 */
export function createCanvasCreateTool(): AgentTool {
  return {
    name: 'canvas_create',
    description: `Create a new Canvas document for editing code or text. 
Use this when you want to provide editable code/content that the user can modify.
The document will be opened in the Canvas panel with Monaco Editor.
Supported languages: ${SUPPORTED_LANGUAGES.join(', ')}`,
    parameters: canvasCreateInputSchema,
    execute: async (args): Promise<CanvasToolResult> => {
      try {
        const input = args as CanvasCreateInput;
        const store = useArtifactStore.getState();

        const documentId = store.createCanvasDocument({
          title: input.title,
          content: input.content,
          language: input.language as ArtifactLanguage,
          type: input.type || 'code',
        });

        // Open the canvas panel with this document
        store.setActiveCanvas(documentId);
        store.openPanel('canvas');

        return {
          success: true,
          message: `Created canvas document "${input.title}" and opened it for editing.`,
          documentId,
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to create canvas document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    },
    requiresApproval: false,
  };
}

/**
 * Update an existing Canvas document
 */
export function createCanvasUpdateTool(): AgentTool {
  return {
    name: 'canvas_update',
    description: `Update an existing Canvas document's content or title.
Use this to modify code or content in a document the user is working on.`,
    parameters: canvasUpdateInputSchema,
    execute: async (args): Promise<CanvasToolResult> => {
      try {
        const input = args as CanvasUpdateInput;
        const store = useArtifactStore.getState();
        const document = store.canvasDocuments[input.documentId];

        if (!document) {
          return {
            success: false,
            message: `Document with ID "${input.documentId}" not found.`,
          };
        }

        const updates: Partial<{ content: string; title: string }> = {};
        if (input.content !== undefined) updates.content = input.content;
        if (input.title !== undefined) updates.title = input.title;

        store.updateCanvasDocument(input.documentId, updates);

        // Save a version after AI update
        store.saveCanvasVersion(input.documentId, 'AI update', true);

        return {
          success: true,
          message: `Updated canvas document "${document.title}".`,
          documentId: input.documentId,
          content: input.content,
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to update canvas document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    },
    requiresApproval: false,
  };
}

/**
 * Read Canvas document(s)
 */
export function createCanvasReadTool(): AgentTool {
  return {
    name: 'canvas_read',
    description: `Read the content of Canvas documents.
If documentId is provided, returns that specific document's content.
Otherwise, returns a list of all available documents with content previews.`,
    parameters: canvasReadInputSchema,
    execute: async (args): Promise<CanvasToolResult> => {
      try {
        const input = args as CanvasReadInput;
        const store = useArtifactStore.getState();

        if (input.documentId) {
          const document = store.canvasDocuments[input.documentId];
          if (!document) {
            return {
              success: false,
              message: `Document with ID "${input.documentId}" not found.`,
            };
          }

          return {
            success: true,
            message: `Retrieved document "${document.title}".`,
            documentId: document.id,
            content: document.content,
          };
        }

        // Return all documents
        const documents = Object.values(store.canvasDocuments).map((doc) => ({
          id: doc.id,
          title: doc.title,
          language: doc.language,
          type: doc.type,
          contentPreview: doc.content.substring(0, 200) + (doc.content.length > 200 ? '...' : ''),
        }));

        return {
          success: true,
          message: `Found ${documents.length} canvas document(s).`,
          documents,
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to read canvas documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    },
    requiresApproval: false,
  };
}

/**
 * Open a Canvas document in the panel
 */
export function createCanvasOpenTool(): AgentTool {
  return {
    name: 'canvas_open',
    description: `Open a specific Canvas document in the editing panel.
Use this to switch the user's view to a particular document.`,
    parameters: z.object({
      documentId: z.string().describe('ID of the canvas document to open'),
    }),
    execute: async (args): Promise<CanvasToolResult> => {
      try {
        const { documentId } = args as { documentId: string };
        const store = useArtifactStore.getState();
        const document = store.canvasDocuments[documentId];

        if (!document) {
          return {
            success: false,
            message: `Document with ID "${documentId}" not found.`,
          };
        }

        store.setActiveCanvas(documentId);
        store.openPanel('canvas');

        return {
          success: true,
          message: `Opened canvas document "${document.title}".`,
          documentId,
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to open canvas document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    },
    requiresApproval: false,
  };
}

/**
 * Get all Canvas tools for agent use
 */
export function createCanvasTools(): AgentTool[] {
  return [
    createCanvasCreateTool(),
    createCanvasUpdateTool(),
    createCanvasReadTool(),
    createCanvasOpenTool(),
  ];
}

/**
 * Get Canvas tools as a record for easy integration
 */
export function getCanvasToolsRecord(): Record<string, AgentTool> {
  const tools = createCanvasTools();
  return tools.reduce(
    (acc, tool) => {
      acc[tool.name] = tool;
      return acc;
    },
    {} as Record<string, AgentTool>
  );
}
