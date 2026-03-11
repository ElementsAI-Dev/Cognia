import { act } from '@testing-library/react';
import { nanoid } from 'nanoid';
import type { McpPrompt } from '@/types/mcp';
import {
  DEFAULT_PROMPT_TEMPLATE_CATEGORIES,
  DEFAULT_PROMPT_TEMPLATES,
  type PromptTemplate,
} from '@/types/content/prompt-template';
import { usePromptTemplateStore } from './prompt-template-store';

jest.mock('zustand', () => jest.requireActual('zustand'));
jest.mock('zustand/middleware', () => jest.requireActual('zustand/middleware'));

describe('usePromptTemplateStore', () => {
  beforeEach(() => {
    usePromptTemplateStore.setState({
      templates: [],
      categories: DEFAULT_PROMPT_TEMPLATE_CATEGORIES,
      selectedTemplateId: null,
      isInitialized: false,
      operationStates: {},
      feedback: {},
      abTests: {},
      optimizationHistory: {},
    });
    localStorage.clear();
  });

  const createTemplate = (overrides: Partial<PromptTemplate> = {}): PromptTemplate => {
    let created: PromptTemplate | undefined;
    act(() => {
      const result = usePromptTemplateStore.getState().createTemplate({
        name: overrides.name ?? 'Template',
        content: overrides.content ?? 'Hello {{name}}',
        category: overrides.category,
        tags: overrides.tags,
        variables: overrides.variables,
        targets: overrides.targets,
        source: overrides.source,
        meta: overrides.meta,
        description: overrides.description,
      });
      expect(result.ok).toBe(true);
      created = result.data;
    });
    expect(created).toBeDefined();
    return created!;
  };

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

  describe('lifecycle operations', () => {
    it('creates a user template with defaults, variables, and operation status', () => {
      const created = createTemplate({
        name: 'New Template',
        content: 'Hello {{name}}',
        tags: ['greeting'],
      });

      const state = usePromptTemplateStore.getState();
      expect(state.templates).toHaveLength(1);
      expect(created.source).toBe('user');
      expect(created.targets).toEqual(['chat']);
      expect(created.variables[0].name).toBe('name');
      expect(state.selectedTemplateId).toBe(created.id);
      expect(state.operationStates.create?.status).toBe('success');
    });

    it('updates template fields and returns structured result', () => {
      const template = createTemplate({
        name: 'Original',
        content: 'Hi {{who}}',
      });

      const result = usePromptTemplateStore.getState().updateTemplate(template.id, {
        name: 'Updated',
        content: 'Hello {{person}}',
        tags: ['updated'],
      });

      expect(result.ok).toBe(true);
      expect(result.data?.action).toBe('updated');

      const updated = usePromptTemplateStore.getState().getTemplate(template.id)!;
      expect(updated.name).toBe('Updated');
      expect(updated.tags).toEqual(['updated']);
      expect(updated.variables[0].name).toBe('person');
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(updated.createdAt.getTime());
    });

    it('forks built-in template updates instead of mutating in place', () => {
      const template = createTemplate({
        name: 'Builtin',
        content: 'Builtin content',
        source: 'builtin',
      });

      const result = usePromptTemplateStore.getState().updateTemplate(template.id, {
        content: 'Changed',
      });

      expect(result.ok).toBe(true);
      expect(result.data?.action).toBe('forked');
      expect(result.code).toBe('SOURCE_GUARDED');

      const state = usePromptTemplateStore.getState();
      expect(state.templates).toHaveLength(2);
      const original = state.templates.find((item) => item.id === template.id)!;
      expect(original.content).toBe('Builtin content');
      expect(state.templates.some((item) => item.name.includes('(Custom)'))).toBe(true);
    });

    it('forks mcp template updates instead of mutating in place', () => {
      const template = createTemplate({
        name: 'MCP Template',
        content: 'MCP content',
        source: 'mcp',
        meta: {
          mcp: {
            serverId: 'server-a',
            promptName: 'analyze',
          },
        },
      });

      const result = usePromptTemplateStore.getState().updateTemplate(template.id, {
        content: 'Changed MCP content',
      });

      expect(result.ok).toBe(true);
      expect(result.data?.action).toBe('forked');
      const original = usePromptTemplateStore.getState().getTemplate(template.id)!;
      expect(original.content).toBe('MCP content');
    });

    it('keeps marketplace linkage metadata on restricted updates', () => {
      const template = createTemplate({
        name: 'Marketplace Linked',
        content: 'content',
        meta: {
          marketplace: {
            marketplaceId: 'market-xyz',
            installedVersion: '1.0.0',
          },
        },
      });

      const result = usePromptTemplateStore.getState().updateTemplate(template.id, {
        content: 'updated content',
        meta: {
          icon: 'new',
        },
      });

      expect(result.ok).toBe(true);
      const updated = usePromptTemplateStore.getState().getTemplate(template.id)!;
      expect(updated.content).toBe('updated content');
      expect(updated.meta?.marketplace?.marketplaceId).toBe('market-xyz');
    });

    it('removes template and clears selection when deleted', () => {
      const template = createTemplate({
        name: 'Delete me',
        content: 'Test',
      });

      act(() => {
        usePromptTemplateStore.getState().selectTemplate(template.id);
      });

      const result = usePromptTemplateStore.getState().deleteTemplate(template.id);
      expect(result.ok).toBe(true);

      const state = usePromptTemplateStore.getState();
      expect(state.templates).toHaveLength(0);
      expect(state.selectedTemplateId).toBeNull();
    });

    it('creates a duplicate with reset usage fields', () => {
      const original = createTemplate({
        name: 'Original',
        content: 'Test',
      });

      let duplicate: PromptTemplate | undefined;
      act(() => {
        const result = usePromptTemplateStore.getState().duplicateTemplate(original.id);
        expect(result.ok).toBe(true);
        duplicate = result.data;
      });

      expect(duplicate).toBeDefined();
      expect(duplicate!.name).toBe('Original (Copy)');
      expect(duplicate!.usageCount).toBe(0);
      expect(duplicate!.lastUsedAt).toBeUndefined();
      expect(usePromptTemplateStore.getState().templates).toHaveLength(2);
      expect(usePromptTemplateStore.getState().selectedTemplateId).toBe(duplicate!.id);
    });

    it('returns error when duplicating a missing template', () => {
      const result = usePromptTemplateStore.getState().duplicateTemplate('missing');
      expect(result.ok).toBe(false);
      expect(result.code).toBe('TEMPLATE_NOT_FOUND');
    });
  });

  describe('selection and usage', () => {
    it('selects template and records usage', () => {
      const template = createTemplate({
        name: 'Track',
        content: 'Test',
      });

      act(() => {
        usePromptTemplateStore.getState().selectTemplate(template.id);
        usePromptTemplateStore.getState().recordUsage(template.id);
      });

      const state = usePromptTemplateStore.getState();
      expect(state.selectedTemplateId).toBe(template.id);
      expect(state.templates[0].usageCount).toBe(1);
      expect(state.templates[0].lastUsedAt).toBeInstanceOf(Date);
    });
  });

  describe('query helpers', () => {
    beforeEach(() => {
      createTemplate({
        name: 'Bug Review',
        description: 'Find bugs',
        category: 'code-review',
        content: 'Review {{code}}',
        tags: ['review', 'bugs'],
      });
      createTemplate({
        name: 'Write Docs',
        description: 'Docs',
        category: 'documentation',
        content: 'Docs {{topic}}',
        tags: ['docs'],
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
    it('returns failed report for invalid payload', () => {
      const report = usePromptTemplateStore.getState().importTemplates('not-json');
      expect(report.success).toBe(false);
      expect(report.failed).toBe(1);
      expect(report.items[0].code).toBe('INVALID_PAYLOAD');
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

      const report = usePromptTemplateStore.getState().importTemplates(raw as PromptTemplate[]);
      expect(report.success).toBe(true);
      expect(report.imported).toBe(1);
      const tpl = usePromptTemplateStore.getState().templates[0];
      expect(tpl.createdAt).toBeInstanceOf(Date);
      expect(tpl.updatedAt).toBeInstanceOf(Date);
    });

    it.each([
      { strategy: 'skip' as const, expectedStatus: 'skipped', expectedCode: 'CONFLICT_SKIPPED' },
      {
        strategy: 'overwrite' as const,
        expectedStatus: 'overwritten',
        expectedCode: 'CONFLICT_OVERWRITTEN',
      },
      {
        strategy: 'duplicate' as const,
        expectedStatus: 'duplicated',
        expectedCode: 'CONFLICT_DUPLICATED',
      },
    ])('applies conflict strategy $strategy deterministically', ({ strategy, expectedStatus, expectedCode }) => {
      createTemplate({
        name: 'Conflict',
        content: 'Original',
        meta: {
          marketplace: {
            marketplaceId: 'market-1',
            installedVersion: '1.0.0',
          },
        },
      });

      const report = usePromptTemplateStore.getState().importTemplates(
        [
          {
            name: 'Conflict Imported',
            content: 'Changed',
            meta: {
              marketplace: {
                marketplaceId: 'market-1',
              },
            },
          } as PromptTemplate,
        ],
        { strategy }
      );

      const item = report.items[0];
      expect(item.status).toBe(expectedStatus);
      expect(item.code).toBe(expectedCode);
    });

    it('exports templates as JSON with ISO dates', () => {
      const template = createTemplate({
        name: 'Exportable',
        content: 'Test',
      });

      const result = usePromptTemplateStore.getState().exportTemplates([template.id]);
      expect(result.ok).toBe(true);
      const parsed = JSON.parse(result.data!.json);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].createdAt).toMatch(/T/);
      expect(parsed[0].id).toBe(template.id);
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

  describe('version behavior', () => {
    it('saves snapshot before restore', () => {
      const template = createTemplate({
        name: 'Restore',
        content: 'v1 content',
      });

      const v1 = usePromptTemplateStore.getState().saveVersion(template.id, 'v1 snapshot');
      expect(v1).not.toBeNull();

      const updateResult = usePromptTemplateStore.getState().updateTemplate(template.id, {
        content: 'v2 content',
      });
      expect(updateResult.ok).toBe(true);

      const restoreResult = usePromptTemplateStore.getState().restoreVersion(template.id, v1!.id);
      expect(restoreResult.ok).toBe(true);
      expect(restoreResult.data?.template.content).toBe('v1 content');
      expect(restoreResult.data?.template.versionHistory?.length).toBeGreaterThanOrEqual(2);
    });

    it('saves snapshot before overwrite import', () => {
      const template = createTemplate({
        name: 'Import overwrite target',
        content: 'old content',
        meta: {
          marketplace: {
            marketplaceId: 'overwrite-target',
          },
        },
      });

      const report = usePromptTemplateStore.getState().importTemplates(
        [
          {
            name: 'Import overwrite target',
            content: 'new content',
            meta: {
              marketplace: {
                marketplaceId: 'overwrite-target',
              },
            },
          } as PromptTemplate,
        ],
        { strategy: 'overwrite' }
      );

      expect(report.overwritten).toBe(1);
      const updated = usePromptTemplateStore.getState().getTemplate(template.id)!;
      expect(updated.content).toBe('new content');
      expect(updated.versionHistory?.length).toBeGreaterThanOrEqual(1);
      expect(updated.versionHistory?.[0].changelog).toContain('overwrite import');
    });
  });

  describe('optimization history', () => {
    it('records optimization and stores history', () => {
      const template = createTemplate({
        name: 'Test Template',
        content: 'Original content',
      });

      act(() => {
        usePromptTemplateStore
          .getState()
          .recordOptimization(
            template.id,
            'Original content',
            'Optimized content with improvements',
            ['Improved clarity', 'Added structure'],
            'concise',
            'user'
          );
      });

      const history = usePromptTemplateStore.getState().getOptimizationHistory(template.id);
      expect(history).toHaveLength(1);
      expect(history[0].originalContent).toBe('Original content');
      expect(history[0].optimizedContent).toBe('Optimized content with improvements');
      expect(history[0].suggestions).toEqual(['Improved clarity', 'Added structure']);
      expect(history[0].style).toBe('concise');
      expect(history[0].appliedBy).toBe('user');
    });

    it('limits history to 20 entries per template', () => {
      const template = createTemplate({
        name: 'Test Template',
        content: 'Content',
      });

      for (let i = 0; i < 25; i++) {
        act(() => {
          usePromptTemplateStore
            .getState()
            .recordOptimization(template.id, `Original ${i}`, `Optimized ${i}`, [`Suggestion ${i}`]);
        });
      }

      const history = usePromptTemplateStore.getState().getOptimizationHistory(template.id);
      expect(history).toHaveLength(20);
    });

    it('updates template stats when recording optimization', () => {
      const template = createTemplate({
        name: 'Test Template',
        content: 'Content',
      });

      act(() => {
        usePromptTemplateStore
          .getState()
          .recordOptimization(template.id, 'Original', 'Optimized', ['Suggestion']);
      });

      const updated = usePromptTemplateStore.getState().getTemplate(template.id);
      expect(updated?.stats?.optimizationCount).toBe(1);
      expect(updated?.stats?.lastOptimizedAt).toBeInstanceOf(Date);
    });
  });
});
