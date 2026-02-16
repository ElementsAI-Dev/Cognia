import type { StoreApi } from 'zustand';
import type { ClipboardContextStore, ClipboardTemplate } from '../types';

type ClipboardStoreSet = StoreApi<ClipboardContextStore>['setState'];
type ClipboardStoreGet = StoreApi<ClipboardContextStore>['getState'];

type TemplatesSlice = Pick<
  ClipboardContextStore,
  'addTemplate' | 'removeTemplate' | 'updateTemplate' | 'applyTemplate' | 'searchTemplates'
>;

export const createTemplatesSlice = (
  set: ClipboardStoreSet,
  get: ClipboardStoreGet
): TemplatesSlice => ({
  addTemplate: (template) => {
    const newTemplate: ClipboardTemplate = {
      ...template,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      usageCount: 0,
    };
    set((state) => ({
      templates: [...state.templates, newTemplate],
    }));
  },

  removeTemplate: (id) => {
    set((state) => ({
      templates: state.templates.filter((t) => t.id !== id),
    }));
  },

  updateTemplate: (id, updates) => {
    set((state) => ({
      templates: state.templates.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  },

  applyTemplate: async (id, variables) => {
    const template = get().templates.find((t) => t.id === id);
    if (!template) return null;

    let content = template.content;

    // Replace variables
    if (variables) {
      for (const [key, value] of Object.entries(variables)) {
        content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      }
    }

    // Update usage count
    get().updateTemplate(id, { usageCount: template.usageCount + 1 });

    // Write to clipboard
    await get().writeText(content);

    return content;
  },

  searchTemplates: (query) => {
    const lowerQuery = query.toLowerCase();
    return get().templates.filter(
      (t) =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description?.toLowerCase().includes(lowerQuery) ||
        t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  },
});

