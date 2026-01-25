/**
 * Template Store - manages chat templates
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type {
  ChatTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateCategory,
} from '@/types/content/template';
import { BUILT_IN_TEMPLATES } from '@/types/content/template';

interface TemplateState {
  templates: ChatTemplate[];

  // Actions
  initializeTemplates: () => void;
  createTemplate: (input: CreateTemplateInput) => ChatTemplate;
  updateTemplate: (id: string, updates: UpdateTemplateInput) => void;
  deleteTemplate: (id: string) => void;
  duplicateTemplate: (id: string) => ChatTemplate | null;

  // Selectors
  getTemplate: (id: string) => ChatTemplate | undefined;
  getTemplatesByCategory: (category: TemplateCategory) => ChatTemplate[];
  getBuiltInTemplates: () => ChatTemplate[];
  getCustomTemplates: () => ChatTemplate[];
  searchTemplates: (query: string) => ChatTemplate[];
}

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set, get) => ({
      templates: [],

      initializeTemplates: () => {
        const { templates } = get();

        // Check if built-in templates exist
        const builtInIds = templates.filter((t) => t.isBuiltIn).map((t) => t.name);
        const missingBuiltIns = BUILT_IN_TEMPLATES.filter((t) => !builtInIds.includes(t.name));

        if (missingBuiltIns.length > 0) {
          const newTemplates: ChatTemplate[] = missingBuiltIns.map((t) => ({
            ...t,
            id: nanoid(),
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          set((state) => ({
            templates: [...state.templates, ...newTemplates],
          }));
        }
      },

      createTemplate: (input) => {
        const template: ChatTemplate = {
          id: nanoid(),
          name: input.name,
          description: input.description,
          icon: input.icon || '📝',
          category: input.category,
          systemPrompt: input.systemPrompt,
          initialMessage: input.initialMessage,
          suggestedQuestions: input.suggestedQuestions,
          provider: input.provider,
          model: input.model,
          isBuiltIn: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          templates: [...state.templates, template],
        }));

        return template;
      },

      updateTemplate: (id, updates) =>
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id && !t.isBuiltIn ? { ...t, ...updates, updatedAt: new Date() } : t
          ),
        })),

      deleteTemplate: (id) =>
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id || t.isBuiltIn),
        })),

      duplicateTemplate: (id) => {
        const { templates, createTemplate } = get();
        const original = templates.find((t) => t.id === id);

        if (!original) return null;

        return createTemplate({
          name: `${original.name} (Copy)`,
          description: original.description,
          icon: original.icon,
          category: original.category,
          systemPrompt: original.systemPrompt,
          initialMessage: original.initialMessage,
          suggestedQuestions: original.suggestedQuestions,
          provider: original.provider,
          model: original.model,
        });
      },

      getTemplate: (id) => {
        const { templates } = get();
        return templates.find((t) => t.id === id);
      },

      getTemplatesByCategory: (category) => {
        const { templates } = get();
        return templates.filter((t) => t.category === category);
      },

      getBuiltInTemplates: () => {
        const { templates } = get();
        return templates.filter((t) => t.isBuiltIn);
      },

      getCustomTemplates: () => {
        const { templates } = get();
        return templates.filter((t) => !t.isBuiltIn);
      },

      searchTemplates: (query) => {
        const { templates } = get();
        const lowerQuery = query.toLowerCase();
        return templates.filter(
          (t) =>
            t.name.toLowerCase().includes(lowerQuery) ||
            t.description.toLowerCase().includes(lowerQuery) ||
            t.category.toLowerCase().includes(lowerQuery)
        );
      },
    }),
    {
      name: 'cognia-templates',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        templates: state.templates.map((t) => ({
          ...t,
          createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
          updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt,
        })),
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.templates) {
          state.templates = state.templates.map((t) => ({
            ...t,
            createdAt: new Date(t.createdAt),
            updatedAt: new Date(t.updatedAt),
          }));
        }
        // Initialize built-in templates after rehydration
        state?.initializeTemplates();
      },
    }
  )
);

export default useTemplateStore;
