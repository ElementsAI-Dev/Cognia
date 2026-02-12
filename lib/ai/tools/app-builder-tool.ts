/**
 * App Builder Tools - Tools for creating and managing A2UI mini-apps
 *
 * Features:
 * - Generate apps from natural language descriptions
 * - Create apps from templates
 * - List and manage user-created apps
 */

import { z } from 'zod';
import {
  generateAppFromDescription,
  detectAppType,
  type GeneratedApp,
} from '@/lib/a2ui/app-generator';
import {
  appTemplates,
  getTemplateById,
  getTemplatesByCategory,
  searchTemplates,
  createAppFromTemplate,
} from '@/lib/a2ui/templates';
import { useA2UIStore } from '@/stores/a2ui';
import type { ToolDefinition } from './registry';

// Input schemas
export const appGenerateInputSchema = z.object({
  description: z
    .string()
    .describe(
      'Natural language description of the app to generate. Examples: "a tip calculator", "一个待办事项应用", "countdown timer"'
    ),
  language: z
    .enum(['zh', 'en'])
    .optional()
    .describe('Language for the app UI. Auto-detected from description if not specified.'),
  style: z
    .enum(['minimal', 'colorful', 'professional'])
    .optional()
    .default('colorful')
    .describe('Visual style for the app'),
});

export const appCreateFromTemplateInputSchema = z.object({
  templateId: z
    .string()
    .describe('ID of the template to create from. Use app_list_templates to see available templates.'),
  name: z.string().optional().describe('Custom name for the app instance'),
});

export const appListInputSchema = z.object({
  category: z
    .enum(['productivity', 'data', 'form', 'utility', 'social'])
    .optional()
    .describe('Filter templates by category'),
  query: z.string().optional().describe('Search query to filter templates'),
});

export const appDeleteInputSchema = z.object({
  appId: z.string().describe('ID of the app to delete'),
  confirm: z.boolean().default(true).describe('Confirm deletion'),
});

// Type exports
export type AppGenerateInput = z.infer<typeof appGenerateInputSchema>;
export type AppCreateFromTemplateInput = z.infer<typeof appCreateFromTemplateInputSchema>;
export type AppListInput = z.infer<typeof appListInputSchema>;
export type AppDeleteInput = z.infer<typeof appDeleteInputSchema>;

export interface AppBuilderToolResult {
  success: boolean;
  message: string;
  appId?: string;
  app?: {
    id: string;
    name: string;
    description: string;
    type: string;
  };
  apps?: Array<{
    id: string;
    name: string;
    description?: string;
    category?: string;
  }>;
  error?: string;
}

/**
 * Execute app generation from description
 */
export async function executeAppGenerate(
  input: AppGenerateInput
): Promise<AppBuilderToolResult> {
  try {
    const result: GeneratedApp = generateAppFromDescription({
      description: input.description,
      language: input.language,
      style: input.style,
    });

    // Process the generated messages into the A2UI store
    const store = useA2UIStore.getState();
    for (const msg of result.messages) {
      store.processMessage(msg);
    }

    const detectedType = detectAppType(input.description) || 'custom';

    return {
      success: true,
      message: `Created "${result.name}" app. It is now displayed in the chat.`,
      appId: result.id,
      app: {
        id: result.id,
        name: result.name,
        description: result.description,
        type: detectedType,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to generate app: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute app creation from template
 */
export async function executeAppCreateFromTemplate(
  input: AppCreateFromTemplateInput
): Promise<AppBuilderToolResult> {
  try {
    const template = getTemplateById(input.templateId);
    if (!template) {
      const available = appTemplates.map((t) => t.id).join(', ');
      return {
        success: false,
        message: `Template "${input.templateId}" not found. Available: ${available}`,
      };
    }

    const { surfaceId, messages } = createAppFromTemplate(template);

    const store = useA2UIStore.getState();
    for (const msg of messages) {
      store.processMessage(msg);
    }

    return {
      success: true,
      message: `Created "${input.name || template.name}" from template "${template.name}".`,
      appId: surfaceId,
      app: {
        id: surfaceId,
        name: input.name || template.name,
        description: template.description,
        type: template.category,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to create app: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute list templates / apps
 */
export async function executeAppList(
  input: AppListInput
): Promise<AppBuilderToolResult> {
  try {
    let templates;
    if (input.query) {
      templates = searchTemplates(input.query);
    } else if (input.category) {
      templates = getTemplatesByCategory(input.category);
    } else {
      templates = appTemplates;
    }

    return {
      success: true,
      message: `Found ${templates.length} template(s).`,
      apps: templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
      })),
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to list templates: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute app deletion
 */
export async function executeAppDelete(
  input: AppDeleteInput
): Promise<AppBuilderToolResult> {
  try {
    if (!input.confirm) {
      return { success: false, message: 'Deletion cancelled: confirmation required.' };
    }

    const store = useA2UIStore.getState();
    const surface = store.surfaces[input.appId];
    if (!surface) {
      return { success: false, message: `App "${input.appId}" not found.` };
    }

    const title = surface.title || input.appId;
    store.deleteSurface(input.appId);

    return { success: true, message: `Deleted app "${title}".` };
  } catch (error) {
    return {
      success: false,
      message: `Failed to delete app: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Tool definitions for registry
export const appGenerateTool: ToolDefinition = {
  name: 'app_generate',
  category: 'app',
  description: `Generate an interactive mini-app from a natural language description. The app is rendered directly in the chat.

Supported app types:
- **Calculator**: Basic, tip, BMI, age, loan calculators
- **Timer**: Countdown, stopwatch
- **Todo list**: Task management with completion tracking
- **Notes**: Quick note-taking
- **Forms**: Survey, contact, feedback forms
- **Tracker**: Expense, health, habit tracking
- **Dashboard**: Data visualization with charts
- **Unit converter**: Length, weight, temperature conversions
- **Custom**: Any other app type

Supports both Chinese and English descriptions. Style: minimal, colorful, professional.`,
  parameters: appGenerateInputSchema,
  create: () => async (args: unknown) =>
    executeAppGenerate(args as AppGenerateInput),
  requiresApproval: false,
};

export const appCreateFromTemplateTool: ToolDefinition = {
  name: 'app_create_from_template',
  category: 'app',
  description:
    'Create an app from a predefined template. Use app_list_templates to see available templates first.',
  parameters: appCreateFromTemplateInputSchema,
  create: () => async (args: unknown) =>
    executeAppCreateFromTemplate(args as AppCreateFromTemplateInput),
  requiresApproval: false,
};

export const appListTemplatesTool: ToolDefinition = {
  name: 'app_list_templates',
  category: 'app',
  description:
    'List available app templates. Optionally filter by category or search query.',
  parameters: appListInputSchema,
  create: () => async (args: unknown) =>
    executeAppList(args as AppListInput),
  requiresApproval: false,
};

export const appDeleteTool: ToolDefinition = {
  name: 'app_delete',
  category: 'app',
  description: 'Delete a user-created app. Requires confirmation.',
  parameters: appDeleteInputSchema,
  create: () => async (args: unknown) =>
    executeAppDelete(args as AppDeleteInput),
  requiresApproval: true,
};

// All app builder tools for registration
export const appBuilderTools: ToolDefinition[] = [
  appGenerateTool,
  appCreateFromTemplateTool,
  appListTemplatesTool,
  appDeleteTool,
];

/**
 * Register all app builder tools to the registry
 */
export function registerAppBuilderTools(
  registry: { register: (tool: ToolDefinition) => void }
): void {
  for (const tool of appBuilderTools) {
    registry.register(tool);
  }
}

/**
 * Get app builder tools prompt for system message
 */
export function getAppBuilderToolsPrompt(): string {
  return `## App Builder Tools

You have access to mini-app creation tools:

- **app_generate**: Generate an interactive app from a description (e.g., "make me a tip calculator")
- **app_create_from_template**: Create an app from a predefined template
- **app_list_templates**: List available app templates
- **app_delete**: Remove a created app

Use these when the user wants to:
- Create a mini-app, tool, or interactive widget
- Build a calculator, timer, todo list, form, etc.
- Generate an interactive component in the chat`;
}
