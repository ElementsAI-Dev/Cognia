/**
 * Workflow Template Marketplace Store
 * 
 * Zustand store for managing workflow templates, categories, and marketplace features
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  WorkflowTemplate,
  TemplateCategory,
  TemplateFilters,
  TemplateUsageStats,
} from '@/types/workflow/template';

interface TemplateMarketState {
  // Templates
  templates: Record<string, WorkflowTemplate>;
  userTemplates: Record<string, WorkflowTemplate>;
  builtInTemplates: Record<string, WorkflowTemplate>;

  // Categories
  categories: TemplateCategory[];

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
}

export const useTemplateMarketStore = create<TemplateMarketState>()(
  persist(
    (set, get) => ({
      // Initial state
      templates: {},
      userTemplates: {},
      builtInTemplates: {},
      categories: [],
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
          const { [id]: removedTemplate, ...remainingTemplates } = state.templates;
          const { [id]: removedUserTemplate, ...remainingUserTemplates } = state.userTemplates;

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
          templates = templates.filter((t) =>
            state.filters.source!.includes(t.metadata.source)
          );
        }

        if (state.filters.minRating) {
          templates = templates.filter(
            (t) => t.metadata.rating >= state.filters.minRating!
          );
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
              comparison =
                a.metadata.createdAt.getTime() - b.metadata.createdAt.getTime();
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
            (template.metadata.rating * template.metadata.ratingCount + rating) /
            newRatingCount;

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
          let template: WorkflowTemplate;

          if (format === 'json') {
            template = JSON.parse(data);
          } else {
            // YAML parsing would need a library like js-yaml
            throw new Error('YAML format not yet supported');
          }

          // Validate template structure
          if (!template.id || !template.name || !template.workflow) {
            throw new Error('Invalid template structure');
          }

          // Check if template already exists
          if (get().templates[template.id]) {
            throw new Error('Template already exists');
          }

          get().addTemplate(template);
          return template;
        } catch (error) {
          console.error('Failed to import template:', error);
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
          console.error('Failed to export template:', error);
          return null;
        }
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
    }
  )
);
