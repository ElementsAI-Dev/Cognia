/**
 * Workflow Template Marketplace Store
 *
 * Zustand store for managing workflow templates, categories, and marketplace features
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { z } from 'zod';
import type {
  WorkflowTemplate,
  TemplateCategory,
  TemplateFilters,
  TemplateMetadata,
} from '@/types/workflow/template';
import type { WorkflowEditorTemplate } from '@/types/workflow/workflow-editor';
import { loggers } from '@/lib/logger';

/**
 * Zod schema for validating imported workflow templates
 */
const TemplateMetadataSchema = z.object({
  createdAt: z.union([z.string(), z.date()]).transform((val) => (typeof val === 'string' ? new Date(val) : val)),
  updatedAt: z.union([z.string(), z.date()]).transform((val) => (typeof val === 'string' ? new Date(val) : val)),
  usageCount: z.number().int().min(0).default(0),
  rating: z.number().min(0).max(5).default(0),
  ratingCount: z.number().int().min(0).default(0),
  isOfficial: z.boolean().default(false),
  source: z.enum(['built-in', 'user', 'community', 'github']).default('user'),
  lastSyncAt: z.union([z.string(), z.date()]).transform((val) => (typeof val === 'string' ? new Date(val) : val)).optional(),
});

const WorkflowTemplateSchema = z.object({
  id: z.string().min(1, 'Template ID is required'),
  name: z.string().min(1, 'Template name is required'),
  description: z.string().default(''),
  category: z.string().default('general'),
  tags: z.array(z.string()).default([]),
  author: z.string().default('Unknown'),
  version: z.string().default('1.0.0'),
  workflow: z.record(z.unknown()),
  metadata: TemplateMetadataSchema.optional().default({
    createdAt: new Date(),
    updatedAt: new Date(),
    usageCount: 0,
    rating: 0,
    ratingCount: 0,
    isOfficial: false,
    source: 'user',
  }),
});

/**
 * Rehydrate Date fields from persisted string values
 */
function rehydrateMetadataDates(metadata: TemplateMetadata): TemplateMetadata {
  return {
    ...metadata,
    createdAt:
      typeof metadata.createdAt === 'string'
        ? new Date(metadata.createdAt)
        : metadata.createdAt,
    updatedAt:
      typeof metadata.updatedAt === 'string'
        ? new Date(metadata.updatedAt)
        : metadata.updatedAt,
    lastSyncAt:
      metadata.lastSyncAt != null
        ? typeof metadata.lastSyncAt === 'string'
          ? new Date(metadata.lastSyncAt)
          : metadata.lastSyncAt
        : undefined,
  };
}

/**
 * Rehydrate all templates in a record, converting Date strings back to Date objects
 */
function rehydrateTemplates(
  templates: Record<string, WorkflowTemplate>
): Record<string, WorkflowTemplate> {
  const result: Record<string, WorkflowTemplate> = {};
  for (const [id, template] of Object.entries(templates)) {
    result[id] = {
      ...template,
      metadata: rehydrateMetadataDates(template.metadata),
    };
  }
  return result;
}

/**
 * Convert WorkflowEditorTemplate to WorkflowTemplate for marketplace
 */
function convertEditorTemplateToMarketTemplate(
  editorTemplate: WorkflowEditorTemplate
): WorkflowTemplate {
  return {
    id: `builtin-${editorTemplate.id}`,
    name: editorTemplate.name,
    description: editorTemplate.description,
    category: editorTemplate.category,
    tags: editorTemplate.tags,
    author: 'Cognia',
    version: '1.0.0',
    workflow: editorTemplate.workflow,
    metadata: {
      createdAt: editorTemplate.createdAt,
      updatedAt: editorTemplate.updatedAt,
      usageCount: 0,
      rating: 4.5,
      ratingCount: 0,
      isOfficial: true,
      source: 'built-in',
    },
  };
}

const log = loggers.store;

interface TemplateMarketState {
  // Templates
  templates: Record<string, WorkflowTemplate>;
  userTemplates: Record<string, WorkflowTemplate>;
  builtInTemplates: Record<string, WorkflowTemplate>;

  // Categories
  categories: TemplateCategory[];

  // Loading states
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  // UI State
  selectedTemplateId: string | null;
  filters: TemplateFilters;
  searchQuery: string;

  // Actions
  setTemplates: (templates: WorkflowTemplate[]) => void;
  addTemplate: (template: WorkflowTemplate) => void;
  updateTemplate: (id: string, updates: Partial<WorkflowTemplate>) => void;
  deleteTemplate: (id: string) => void;
  getTemplate: (id: string) => WorkflowTemplate | undefined;

  setCategories: (categories: TemplateCategory[]) => void;
  getCategory: (id: string) => TemplateCategory | undefined;

  setSelectedTemplate: (id: string | null) => void;
  setFilters: (filters: Partial<TemplateFilters>) => void;
  setSearchQuery: (query: string) => void;

  // Filtered templates
  getFilteredTemplates: () => WorkflowTemplate[];
  searchTemplates: (query: string) => WorkflowTemplate[];

  // Template operations
  incrementUsage: (id: string) => void;
  rateTemplate: (id: string, rating: number) => void;
  cloneTemplate: (id: string, newName: string) => WorkflowTemplate | null;

  // Import/Export
  importTemplate: (data: string, format: 'json' | 'yaml') => WorkflowTemplate | null;
  exportTemplate: (id: string, format: 'json' | 'yaml', includeMetadata?: boolean) => string | null;

  // Initialization
  loadBuiltInTemplates: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useTemplateMarketStore = create<TemplateMarketState>()(
  persist(
    (set, get) => ({
      // Initial state
      templates: {},
      userTemplates: {},
      builtInTemplates: {},
      categories: [],
      isInitialized: false,
      isLoading: false,
      error: null,
      selectedTemplateId: null,
      filters: {},
      searchQuery: '',

      // Template management
      setTemplates: (templates) => {
        const templateMap: Record<string, WorkflowTemplate> = {};
        const userTemplateMap: Record<string, WorkflowTemplate> = {};
        const builtInTemplateMap: Record<string, WorkflowTemplate> = {};

        templates.forEach((template) => {
          templateMap[template.id] = template;
          if (template.metadata.source === 'user') {
            userTemplateMap[template.id] = template;
          } else {
            builtInTemplateMap[template.id] = template;
          }
        });

        set({
          templates: templateMap,
          userTemplates: userTemplateMap,
          builtInTemplates: builtInTemplateMap,
        });
      },

      addTemplate: (template) => {
        set((state) => ({
          templates: { ...state.templates, [template.id]: template },
          userTemplates: {
            ...state.userTemplates,
            [template.id]: template,
          },
        }));
      },

      updateTemplate: (id, updates) => {
        set((state) => {
          const template = state.templates[id];
          if (!template) return state;

          const updatedTemplate = {
            ...template,
            ...updates,
            metadata: {
              ...template.metadata,
              ...updates.metadata,
              updatedAt: new Date(),
            },
          };

          return {
            templates: {
              ...state.templates,
              [id]: updatedTemplate,
            },
            userTemplates: {
              ...state.userTemplates,
              [id]: updatedTemplate,
            },
          };
        });
      },

      deleteTemplate: (id) => {
        set((state) => {
          const { [id]: _removedTemplate, ...remainingTemplates } = state.templates;
          const { [id]: _removedUserTemplate, ...remainingUserTemplates } = state.userTemplates;

          return {
            templates: remainingTemplates,
            userTemplates: remainingUserTemplates,
          };
        });
      },

      getTemplate: (id) => {
        return get().templates[id];
      },

      // Category management
      setCategories: (categories) => {
        set({ categories });
      },

      getCategory: (id) => {
        return get().categories.find((cat) => cat.id === id);
      },

      // UI state
      setSelectedTemplate: (id) => {
        set({ selectedTemplateId: id });
      },

      setFilters: (filters) => {
        set((state) => ({
          filters: { ...state.filters, ...filters },
        }));
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },

      // Filtered templates
      getFilteredTemplates: () => {
        const state = get();
        let templates = Object.values(state.templates);

        // Apply filters
        if (state.filters.category) {
          templates = templates.filter((t) => t.category === state.filters.category);
        }

        if (state.filters.tags && state.filters.tags.length > 0) {
          templates = templates.filter((t) =>
            state.filters.tags!.some((tag) => t.tags.includes(tag))
          );
        }

        if (state.filters.author) {
          templates = templates.filter((t) => t.author === state.filters.author);
        }

        if (state.filters.source && state.filters.source.length > 0) {
          templates = templates.filter((t) => state.filters.source!.includes(t.metadata.source));
        }

        if (state.filters.minRating) {
          templates = templates.filter((t) => t.metadata.rating >= state.filters.minRating!);
        }

        // Apply search query
        if (state.searchQuery) {
          const query = state.searchQuery.toLowerCase();
          templates = templates.filter(
            (t) =>
              t.name.toLowerCase().includes(query) ||
              t.description.toLowerCase().includes(query) ||
              t.tags.some((tag) => tag.toLowerCase().includes(query))
          );
        }

        // Apply sorting
        const sortBy = state.filters.sortBy || 'name';
        const sortOrder = state.filters.sortOrder || 'asc';

        templates.sort((a, b) => {
          let comparison = 0;

          switch (sortBy) {
            case 'name':
              comparison = a.name.localeCompare(b.name);
              break;
            case 'rating':
              comparison = a.metadata.rating - b.metadata.rating;
              break;
            case 'usage':
              comparison = a.metadata.usageCount - b.metadata.usageCount;
              break;
            case 'date':
              comparison = a.metadata.createdAt.getTime() - b.metadata.createdAt.getTime();
              break;
            case 'author':
              comparison = a.author.localeCompare(b.author);
              break;
          }

          return sortOrder === 'asc' ? comparison : -comparison;
        });

        return templates;
      },

      searchTemplates: (query) => {
        set({ searchQuery: query });
        return get().getFilteredTemplates();
      },

      // Template operations
      incrementUsage: (id) => {
        set((state) => {
          const template = state.templates[id];
          if (!template) return state;

          return {
            templates: {
              ...state.templates,
              [id]: {
                ...template,
                metadata: {
                  ...template.metadata,
                  usageCount: template.metadata.usageCount + 1,
                },
              },
            },
          };
        });
      },

      rateTemplate: (id, rating) => {
        set((state) => {
          const template = state.templates[id];
          if (!template) return state;

          const newRatingCount = template.metadata.ratingCount + 1;
          const newRating =
            (template.metadata.rating * template.metadata.ratingCount + rating) / newRatingCount;

          return {
            templates: {
              ...state.templates,
              [id]: {
                ...template,
                metadata: {
                  ...template.metadata,
                  rating: newRating,
                  ratingCount: newRatingCount,
                },
              },
            },
          };
        });
      },

      cloneTemplate: (id, newName) => {
        const template = get().templates[id];
        if (!template) return null;

        const clonedTemplate: WorkflowTemplate = {
          ...template,
          id: `${id}-clone-${Date.now()}`,
          name: newName,
          metadata: {
            ...template.metadata,
            source: 'user',
            createdAt: new Date(),
            updatedAt: new Date(),
            usageCount: 0,
            rating: 0,
            ratingCount: 0,
            isOfficial: false,
          },
        };

        get().addTemplate(clonedTemplate);
        return clonedTemplate;
      },

      // Import/Export
      importTemplate: (data, format) => {
        try {
          let rawData: unknown;

          if (format === 'json') {
            rawData = JSON.parse(data);
          } else {
            // YAML parsing would need a library like js-yaml
            throw new Error('YAML format not yet supported');
          }

          // Validate template structure with Zod schema
          const parseResult = WorkflowTemplateSchema.safeParse(rawData);
          if (!parseResult.success) {
            const errors = parseResult.error.errors.map((e) => e.message).join(', ');
            throw new Error(`Invalid template structure: ${errors}`);
          }

          const template = parseResult.data as unknown as WorkflowTemplate;

          // Check if template already exists
          if (get().templates[template.id]) {
            throw new Error('Template already exists');
          }

          get().addTemplate(template);
          return template;
        } catch (error) {
          log.error('Failed to import template', error as Error);
          return null;
        }
      },

      exportTemplate: (id, format, includeMetadata = true) => {
        const template = get().templates[id];
        if (!template) return null;

        try {
          const data = includeMetadata ? template : { ...template, metadata: undefined };

          if (format === 'json') {
            return JSON.stringify(data, null, 2);
          } else {
            throw new Error('YAML format not yet supported');
          }
        } catch (error) {
          log.error('Failed to export template', error as Error);
          return null;
        }
      },

      // Initialization
      loadBuiltInTemplates: async () => {
        set({ isLoading: true, error: null });

        try {
          // Dynamic import to avoid circular dependencies
          const { default: workflowEditorTemplates } = await import(
            '@/lib/workflow-editor/templates'
          );

          const builtInTemplates: Record<string, WorkflowTemplate> = {};
          const categories: TemplateCategory[] = [];
          const categoryMap = new Map<string, TemplateCategory>();

          workflowEditorTemplates.forEach((editorTemplate) => {
            const template = convertEditorTemplateToMarketTemplate(editorTemplate);
            builtInTemplates[template.id] = template;

            // Build categories
            if (!categoryMap.has(editorTemplate.category)) {
              categoryMap.set(editorTemplate.category, {
                id: editorTemplate.category,
                name: editorTemplate.category.charAt(0).toUpperCase() + editorTemplate.category.slice(1),
                icon: editorTemplate.icon,
                description: `${editorTemplate.category} workflows`,
                templates: [],
              });
            }
            categoryMap.get(editorTemplate.category)!.templates.push(template.id);
          });

          categoryMap.forEach((category) => categories.push(category));

          const state = get();
          set({
            builtInTemplates,
            categories,
            templates: { ...builtInTemplates, ...state.userTemplates },
            isLoading: false,
            isInitialized: true,
          });

          log.info(`Loaded ${Object.keys(builtInTemplates).length} built-in templates`);
        } catch (error) {
          log.error('Failed to load built-in templates', error as Error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load templates',
          });
        }
      },

      initialize: async () => {
        const state = get();
        if (state.isInitialized || state.isLoading) return;

        await get().loadBuiltInTemplates();
      },
    }),
    {
      name: 'template-market-store',
      partialize: (state) => ({
        userTemplates: state.userTemplates,
        selectedTemplateId: state.selectedTemplateId,
        filters: state.filters,
        searchQuery: state.searchQuery,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<TemplateMarketState> | undefined;
        if (!persisted) return currentState;

        // Rehydrate Date fields from persisted string values
        const userTemplates = persisted.userTemplates
          ? rehydrateTemplates(persisted.userTemplates)
          : currentState.userTemplates;

        return {
          ...currentState,
          ...persisted,
          userTemplates,
          // Also update templates map with rehydrated user templates
          templates: { ...currentState.templates, ...userTemplates },
        };
      },
    }
  )
);
