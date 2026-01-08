import { act } from '@testing-library/react';
import { nanoid } from 'nanoid';
import type { McpPrompt } from '@/types/mcp';
import {
  DEFAULT_PROMPT_TEMPLATE_CATEGORIES,
  DEFAULT_PROMPT_TEMPLATES,
  type PromptTemplate,
} from '@/types/prompt-template';
import { usePromptTemplateStore } from './prompt-template-store';

describe('usePromptTemplateStore', () => {
  beforeEach(() => {
    usePromptTemplateStore.setState({
      templates: [],
      categories: DEFAULT_PROMPT_TEMPLATE_CATEGORIES,
      selectedTemplateId: null,
      isInitialized: false,
    });
    localStorage.clear();
  });

  describe('initializeDefaults', () => {
    it('hydrates built-in templates once', () => {
      act(() => {
        usePromptTemplateStore.getState().initializeDefaults();
      });

      const state = usePromptTemplateStore.getState();
      expect(state.templates).toHaveLength(DEFAULT_PROMPT_TEMPLATES.length);
      expect(state.selectedTemplateId).not.toBeNull();
      expect(state.isInitialized).toBe(true);

      act(() => {
        usePromptTemplateStore.getState().initializeDefaults();
      });
      expect(usePromptTemplateStore.getState().templates).toHaveLength(DEFAULT_PROMPT_TEMPLATES.length);
    });
  });

  describe('createTemplate', () => {
    it('creates a user template with defaults and detected variables', () => {
      let created: PromptTemplate | undefined;
      act(() => {
        created = usePromptTemplateStore.getState().createTemplate({
          name: 'New Template',
          content: 'Hello {{name}}',
          tags: ['greeting'],
        });
      });

      expect(created).toBeDefined();
      const state = usePromptTemplateStore.getState();
      expect(state.templates).toHaveLength(1);
      expect(created?.source).toBe('user');
      expect(created?.targets).toEqual(['chat']);
      expect(created?.variables[0].name).toBe('name');
    });
  });

  describe('updateTemplate', () => {
    it('updates template fields and variables', () => {
      let template: PromptTemplate | undefined;
      act(() => {
        template = usePromptTemplateStore.getState().createTemplate({
          name: 'Original',
          content: 'Hi {{who}}',
        });
      });

      act(() => {
        usePromptTemplateStore.getState().updateTemplate(template!.id, {
          name: 'Updated',
          content: 'Hello {{person}}',
          tags: ['updated'],
        });
      });

      const updated = usePromptTemplateStore.getState().getTemplate(template!.id)!;
      expect(updated.name).toBe('Updated');
      expect(updated.tags).toEqual(['updated']);
      expect(updated.variables[0].name).toBe('person');
      // updatedAt should be >= createdAt (may be equal if update is immediate)
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(updated.createdAt.getTime());
    });
  });

  describe('deleteTemplate', () => {
    it('removes template and clears selection when deleted', () => {
      act(() => {
        const tpl = usePromptTemplateStore.getState().createTemplate({
          name: 'Delete me',
          content: 'Test',
        });
        usePromptTemplateStore.getState().selectTemplate(tpl.id);
      });

      const { templates } = usePromptTemplateStore.getState();
      expect(templates).toHaveLength(1);

      act(() => {
        usePromptTemplateStore.getState().deleteTemplate(templates[0].id);
      });

      const state = usePromptTemplateStore.getState();
      expect(state.templates).toHaveLength(0);
      expect(state.selectedTemplateId).toBeNull();
    });
  });

  describe('duplicateTemplate', () => {
    it('creates a copy with reset usage fields', () => {
      let originalId = '';
      act(() => {
        const original = usePromptTemplateStore.getState().createTemplate({
          name: 'Original',
          content: 'Test',
        });
        originalId = original.id;
      });

      let duplicate: PromptTemplate | null = null;
      act(() => {
        duplicate = usePromptTemplateStore.getState().duplicateTemplate(originalId);
      });

      expect(duplicate).not.toBeNull();
      expect(duplicate!.name).toBe('Original (Copy)');
      expect(duplicate!.usageCount).toBe(0);
      expect(duplicate!.lastUsedAt).toBeUndefined();
      expect(usePromptTemplateStore.getState().templates).toHaveLength(2);
    });

    it('returns null for missing template', () => {
      const result = usePromptTemplateStore.getState().duplicateTemplate('missing');
      expect(result).toBeNull();
    });
  });

  describe('selection and usage', () => {
    it('selects template and records usage', () => {
      let template: PromptTemplate | undefined;
      act(() => {
        template = usePromptTemplateStore.getState().createTemplate({
          name: 'Track',
          content: 'Test',
        });
        usePromptTemplateStore.getState().selectTemplate(template!.id);
        usePromptTemplateStore.getState().recordUsage(template!.id);
      });

      const state = usePromptTemplateStore.getState();
      expect(state.selectedTemplateId).toBe(template!.id);
      expect(state.templates[0].usageCount).toBe(1);
      expect(state.templates[0].lastUsedAt).toBeInstanceOf(Date);
    });
  });

  describe('query helpers', () => {
    beforeEach(() => {
      act(() => {
        usePromptTemplateStore.getState().createTemplate({
          name: 'Bug Review',
          description: 'Find bugs',
          category: 'code-review',
          content: 'Review {{code}}',
          tags: ['review', 'bugs'],
        });
        usePromptTemplateStore.getState().createTemplate({
          name: 'Write Docs',
          description: 'Docs',
          category: 'documentation',
          content: 'Docs {{topic}}',
          tags: ['docs'],
        });
      });
    });

    it('searches by name, description, category, and tags', () => {
      const results = usePromptTemplateStore.getState().searchTemplates('bugs');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Bug Review');
    });

    it('filters by category', () => {
      const list = usePromptTemplateStore.getState().getTemplatesByCategory('documentation');
      expect(list).toHaveLength(1);
      expect(list[0].category).toBe('documentation');
    });

    it('filters by tags (case-insensitive)', () => {
      const list = usePromptTemplateStore.getState().getTemplatesByTags(['DOCS']);
      expect(list).toHaveLength(1);
      expect(list[0].name).toBe('Write Docs');
    });
  });

  describe('import/export', () => {
    it('ignores invalid payloads', () => {
      const added = usePromptTemplateStore.getState().importTemplates('not-json');
      expect(added).toBe(0);
    });

    it('imports templates from array and normalizes dates', () => {
      const now = new Date();
      const raw: Partial<PromptTemplate>[] = [
        {
          id: nanoid(),
          name: 'Imported',
          content: 'Hello',
          createdAt: now,
          updatedAt: now,
          variables: [],
        },
      ];

      const added = usePromptTemplateStore.getState().importTemplates(raw as PromptTemplate[]);
      expect(added).toBe(1);
      const tpl = usePromptTemplateStore.getState().templates[0];
      expect(tpl.createdAt).toBeInstanceOf(Date);
      expect(tpl.updatedAt).toBeInstanceOf(Date);
    });

    it('exports templates as JSON with ISO dates', () => {
      let template: PromptTemplate | undefined;
      act(() => {
        template = usePromptTemplateStore.getState().createTemplate({
          name: 'Exportable',
          content: 'Test',
        });
      });

      const json = usePromptTemplateStore.getState().exportTemplates([template!.id]);
      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].createdAt).toMatch(/T/);
      expect(parsed[0].id).toBe(template!.id);
    });
  });

  describe('syncFromMcpPrompts', () => {
    it('creates templates and deduplicates by server and prompt name', () => {
      const prompt: McpPrompt = {
        name: 'diagnose',
        description: 'Run diagnostics',
        arguments: [{ name: 'target', description: 'Target host', required: true }],
      };

      act(() => {
        usePromptTemplateStore.getState().syncFromMcpPrompts('server-1', [prompt]);
      });

      expect(usePromptTemplateStore.getState().templates).toHaveLength(1);

      act(() => {
        usePromptTemplateStore.getState().syncFromMcpPrompts('server-1', [prompt]);
      });

      expect(usePromptTemplateStore.getState().templates).toHaveLength(1);
    });
  });
});
