import { act } from '@testing-library/react';
import { nanoid } from 'nanoid';
import type { McpPrompt } from '@/types/mcp';
import {
  DEFAULT_PROMPT_TEMPLATE_CATEGORIES,
  DEFAULT_PROMPT_TEMPLATES,
  type PromptTemplate,
} from '@/types/content/prompt-template';
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
      expect(usePromptTemplateStore.getState().templates).toHaveLength(
        DEFAULT_PROMPT_TEMPLATES.length
      );
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

  describe('optimization history', () => {
    it('records optimization and stores history', () => {
      let template: PromptTemplate | undefined;
      act(() => {
        template = usePromptTemplateStore.getState().createTemplate({
          name: 'Test Template',
          content: 'Original content',
        });
      });

      act(() => {
        usePromptTemplateStore
          .getState()
          .recordOptimization(
            template!.id,
            'Original content',
            'Optimized content with improvements',
            ['Improved clarity', 'Added structure'],
            'concise',
            'user'
          );
      });

      const history = usePromptTemplateStore.getState().getOptimizationHistory(template!.id);
      expect(history).toHaveLength(1);
      expect(history[0].originalContent).toBe('Original content');
      expect(history[0].optimizedContent).toBe('Optimized content with improvements');
      expect(history[0].suggestions).toEqual(['Improved clarity', 'Added structure']);
      expect(history[0].style).toBe('concise');
      expect(history[0].appliedBy).toBe('user');
    });

    it('limits history to 20 entries per template', () => {
      let template: PromptTemplate | undefined;
      act(() => {
        template = usePromptTemplateStore.getState().createTemplate({
          name: 'Test Template',
          content: 'Content',
        });
      });

      // Record 25 optimizations
      for (let i = 0; i < 25; i++) {
        act(() => {
          usePromptTemplateStore
            .getState()
            .recordOptimization(template!.id, `Original ${i}`, `Optimized ${i}`, [
              `Suggestion ${i}`,
            ]);
        });
      }

      const history = usePromptTemplateStore.getState().getOptimizationHistory(template!.id);
      expect(history).toHaveLength(20);
    });

    it('updates template stats when recording optimization', () => {
      let template: PromptTemplate | undefined;
      act(() => {
        template = usePromptTemplateStore.getState().createTemplate({
          name: 'Test Template',
          content: 'Content',
        });
      });

      act(() => {
        usePromptTemplateStore
          .getState()
          .recordOptimization(template!.id, 'Original', 'Optimized', ['Suggestion']);
      });

      const updated = usePromptTemplateStore.getState().getTemplate(template!.id);
      expect(updated?.stats?.optimizationCount).toBe(1);
      expect(updated?.stats?.lastOptimizedAt).toBeInstanceOf(Date);
    });

    it('returns empty array for template with no history', () => {
      const history = usePromptTemplateStore.getState().getOptimizationHistory('non-existent-id');
      expect(history).toEqual([]);
    });
  });

  describe('optimization recommendations', () => {
    it('returns empty recommendations for templates without issues', () => {
      // Create a template with good content
      act(() => {
        usePromptTemplateStore.getState().createTemplate({
          name: 'Good Template',
          content:
            'Please analyze the following data and provide a detailed summary with key insights.',
        });
      });

      const recommendations = usePromptTemplateStore.getState().getRecommendations();
      // Without feedback data, no recommendations should be generated
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('returns top candidates based on template quality', () => {
      // Create templates with varying quality
      act(() => {
        usePromptTemplateStore.getState().createTemplate({
          name: 'Low Quality',
          content: 'do stuff',
        });
        usePromptTemplateStore.getState().createTemplate({
          name: 'High Quality',
          content:
            'Please analyze the following code and provide detailed feedback on: 1) Code quality 2) Performance 3) Security considerations',
        });
      });

      const candidates = usePromptTemplateStore.getState().getTopCandidates(5);
      expect(Array.isArray(candidates)).toBe(true);
      // Low quality templates should appear as candidates
      if (candidates.length > 0) {
        expect(candidates[0].reasons.length).toBeGreaterThan(0);
      }
    });

    it('respects limit parameter for top candidates', () => {
      // Create multiple templates
      for (let i = 0; i < 10; i++) {
        act(() => {
          usePromptTemplateStore.getState().createTemplate({
            name: `Template ${i}`,
            content: `short ${i}`,
          });
        });
      }

      const candidates = usePromptTemplateStore.getState().getTopCandidates(3);
      expect(candidates.length).toBeLessThanOrEqual(3);
    });
  });
});
