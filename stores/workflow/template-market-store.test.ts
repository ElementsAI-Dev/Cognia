/**
 * Tests for Template Market Store
 */

import { act, renderHook } from '@testing-library/react';
import { useTemplateMarketStore } from './template-market-store';
import type { WorkflowTemplate, TemplateCategory } from '@/types/workflow/template';

const createMockTemplate = (overrides: Partial<WorkflowTemplate> = {}): WorkflowTemplate => {
  const base = {
    id: `template-${Date.now()}`,
    name: 'Test Template',
    description: 'A test workflow template',
    category: 'automation',
    tags: ['test', 'mock'],
    author: 'Test Author',
    version: '1.0.0',
    workflow: {
      id: 'wf-1',
      name: 'Test Workflow',
      nodes: [],
      edges: [],
    } as never,
    metadata: {
      source: 'user' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
      rating: 0,
      ratingCount: 0,
      isOfficial: false,
    },
  };
  return {
    ...base,
    ...overrides,
    metadata: {
      ...base.metadata,
      ...(overrides.metadata || {}),
    },
  };
};

const createMockCategory = (overrides: Partial<TemplateCategory> = {}): TemplateCategory => ({
  id: `category-${Date.now()}`,
  name: 'Test Category',
  description: 'A test category',
  icon: '📁',
  color: '#3B82F6',
  templates: [],
  ...overrides,
});

describe('useTemplateMarketStore', () => {
  beforeEach(() => {
    // Reset store state directly to ensure clean state
    act(() => {
      useTemplateMarketStore.setState({
        templates: {},
        userTemplates: {},
        builtInTemplates: {},
        categories: [],
        selectedTemplateId: null,
        filters: {},
        searchQuery: '',
      });
    });
  });

  describe('Initial State', () => {
    it('should have empty templates initially', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      expect(Object.keys(result.current.templates)).toHaveLength(0);
    });

    it('should have empty categories initially', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      expect(result.current.categories).toHaveLength(0);
    });

    it('should have no selected template initially', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      expect(result.current.selectedTemplateId).toBeNull();
    });

    it('should have empty filters initially', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      expect(result.current.filters).toEqual({});
    });

    it('should have empty search query initially', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      expect(result.current.searchQuery).toBe('');
    });
  });

  describe('Template Management', () => {
    it('should set templates', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      const template1 = createMockTemplate({ id: 't1', metadata: { source: 'user', createdAt: new Date(), updatedAt: new Date(), usageCount: 0, rating: 0, ratingCount: 0, isOfficial: false } });
      const template2 = createMockTemplate({ id: 't2', metadata: { source: 'built-in', createdAt: new Date(), updatedAt: new Date(), usageCount: 0, rating: 0, ratingCount: 0, isOfficial: true } });

      act(() => {
        result.current.setTemplates([template1, template2]);
      });

      expect(Object.keys(result.current.templates)).toHaveLength(2);
      expect(Object.keys(result.current.userTemplates)).toHaveLength(1);
      expect(Object.keys(result.current.builtInTemplates)).toHaveLength(1);
    });

    it('should add a template', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      const template = createMockTemplate({ id: 'add-test' });

      act(() => {
        result.current.addTemplate(template);
      });

      expect(result.current.templates['add-test']).toBeDefined();
      expect(result.current.userTemplates['add-test']).toBeDefined();
    });

    it('should update a template', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      const originalDate = new Date('2024-01-01');
      const template = createMockTemplate({
        id: 'update-test',
        name: 'Original',
        metadata: {
          source: 'user',
          createdAt: originalDate,
          updatedAt: originalDate,
          usageCount: 0,
          rating: 0,
          ratingCount: 0,
          isOfficial: false,
        },
      });

      act(() => {
        result.current.addTemplate(template);
      });

      act(() => {
        result.current.updateTemplate('update-test', { name: 'Updated' });
      });

      expect(result.current.templates['update-test'].name).toBe('Updated');
      expect(result.current.templates['update-test'].metadata.updatedAt.getTime()).toBeGreaterThan(
        originalDate.getTime()
      );
    });

    it('should not update non-existent template', () => {
      const { result } = renderHook(() => useTemplateMarketStore());

      act(() => {
        result.current.updateTemplate('non-existent', { name: 'Updated' });
      });

      expect(result.current.templates['non-existent']).toBeUndefined();
    });

    it('should delete a template', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      const template = createMockTemplate({ id: 'delete-test' });

      act(() => {
        result.current.addTemplate(template);
      });

      act(() => {
        result.current.deleteTemplate('delete-test');
      });

      expect(result.current.templates['delete-test']).toBeUndefined();
      expect(result.current.userTemplates['delete-test']).toBeUndefined();
    });

    it('should get a template by id', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      const template = createMockTemplate({ id: 'get-test' });

      act(() => {
        result.current.addTemplate(template);
      });

      expect(result.current.getTemplate('get-test')).toEqual(template);
      expect(result.current.getTemplate('non-existent')).toBeUndefined();
    });
  });

  describe('Category Management', () => {
    it('should set categories', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      const categories = [
        createMockCategory({ id: 'cat1', name: 'Category 1' }),
        createMockCategory({ id: 'cat2', name: 'Category 2' }),
      ];

      act(() => {
        result.current.setCategories(categories);
      });

      expect(result.current.categories).toHaveLength(2);
    });

    it('should get a category by id', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      const category = createMockCategory({ id: 'get-cat' });

      act(() => {
        result.current.setCategories([category]);
      });

      expect(result.current.getCategory('get-cat')).toEqual(category);
      expect(result.current.getCategory('non-existent')).toBeUndefined();
    });
  });

  describe('UI State', () => {
    it('should set selected template', () => {
      const { result } = renderHook(() => useTemplateMarketStore());

      act(() => {
        result.current.setSelectedTemplate('template-1');
      });

      expect(result.current.selectedTemplateId).toBe('template-1');
    });

    it('should clear selected template', () => {
      const { result } = renderHook(() => useTemplateMarketStore());

      act(() => {
        result.current.setSelectedTemplate('template-1');
        result.current.setSelectedTemplate(null);
      });

      expect(result.current.selectedTemplateId).toBeNull();
    });

    it('should set filters', () => {
      const { result } = renderHook(() => useTemplateMarketStore());

      act(() => {
        result.current.setFilters({ category: 'automation', tags: ['test'] });
      });

      expect(result.current.filters.category).toBe('automation');
      expect(result.current.filters.tags).toContain('test');
    });

    it('should merge filters', () => {
      const { result } = renderHook(() => useTemplateMarketStore());

      act(() => {
        result.current.setFilters({ category: 'automation' });
      });

      act(() => {
        result.current.setFilters({ tags: ['test'] });
      });

      expect(result.current.filters.category).toBe('automation');
      expect(result.current.filters.tags).toContain('test');
    });

    it('should set search query', () => {
      const { result } = renderHook(() => useTemplateMarketStore());

      act(() => {
        result.current.setSearchQuery('test query');
      });

      expect(result.current.searchQuery).toBe('test query');
    });
  });

  describe('Filtered Templates', () => {
    it('should filter by category', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      const template1 = createMockTemplate({ id: 't1', category: 'automation' });
      const template2 = createMockTemplate({ id: 't2', category: 'data' });

      act(() => {
        result.current.setTemplates([template1, template2]);
        result.current.setFilters({ category: 'automation' });
      });

      const filtered = result.current.getFilteredTemplates();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('t1');
    });

    it('should filter by tags', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      const template1 = createMockTemplate({ id: 't1', tags: ['ai', 'automation'] });
      const template2 = createMockTemplate({ id: 't2', tags: ['data'] });

      act(() => {
        result.current.setTemplates([template1, template2]);
        result.current.setFilters({ tags: ['ai'] });
      });

      const filtered = result.current.getFilteredTemplates();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('t1');
    });

    it('should filter by author', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      const template1 = createMockTemplate({ id: 't1', author: 'Alice' });
      const template2 = createMockTemplate({ id: 't2', author: 'Bob' });

      act(() => {
        useTemplateMarketStore.setState({
          templates: { [template1.id]: template1, [template2.id]: template2 },
          filters: { author: 'Alice' },
        });
      });

      const filtered = result.current.getFilteredTemplates();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].author).toBe('Alice');
    });

    it('should filter by source', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      const template1 = createMockTemplate({
        id: 't1',
        metadata: { source: 'user', createdAt: new Date(), updatedAt: new Date(), usageCount: 0, rating: 0, ratingCount: 0, isOfficial: false },
      });
      const template2 = createMockTemplate({
        id: 't2',
        metadata: { source: 'built-in', createdAt: new Date(), updatedAt: new Date(), usageCount: 0, rating: 0, ratingCount: 0, isOfficial: true },
      });

      act(() => {
        useTemplateMarketStore.setState({
          templates: { [template1.id]: template1, [template2.id]: template2 },
          filters: { source: ['user'] },
        });
      });

      const filtered = result.current.getFilteredTemplates();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].metadata.source).toBe('user');
    });

    it('should filter by minimum rating', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      const template1 = createMockTemplate({
        id: 't1',
        metadata: { source: 'user', createdAt: new Date(), updatedAt: new Date(), usageCount: 0, rating: 3.0, ratingCount: 10, isOfficial: false },
      });
      const template2 = createMockTemplate({
        id: 't2',
        metadata: { source: 'user', createdAt: new Date(), updatedAt: new Date(), usageCount: 0, rating: 4.5, ratingCount: 10, isOfficial: false },
      });

      act(() => {
        useTemplateMarketStore.setState({
          templates: { [template1.id]: template1, [template2.id]: template2 },
          filters: { minRating: 4.0 },
        });
      });

      const filtered = result.current.getFilteredTemplates();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('t2');
    });

    it('should filter by search query', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      const template1 = createMockTemplate({ id: 't1', name: 'Data Processing' });
      const template2 = createMockTemplate({ id: 't2', name: 'Email Automation' });

      act(() => {
        useTemplateMarketStore.setState({
          templates: { [template1.id]: template1, [template2.id]: template2 },
          searchQuery: 'data',
        });
      });

      const filtered = result.current.getFilteredTemplates();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Data Processing');
    });

    it('should search templates and update query', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      const template1 = createMockTemplate({ id: 't1', name: 'Unique Alpha', tags: ['unique'] });
      const template2 = createMockTemplate({ id: 't2', name: 'Other Beta', tags: ['different'] });

      act(() => {
        useTemplateMarketStore.setState({
          templates: { [template1.id]: template1, [template2.id]: template2 },
        });
      });

      let searchResults: WorkflowTemplate[] = [];
      act(() => {
        searchResults = result.current.searchTemplates('unique');
      });

      expect(result.current.searchQuery).toBe('unique');
      expect(searchResults).toHaveLength(1);
    });
  });

  describe('Sorting', () => {
    it('should sort by name ascending', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      const template1 = createMockTemplate({ id: 't1', name: 'Zebra' });
      const template2 = createMockTemplate({ id: 't2', name: 'Alpha' });

      act(() => {
        useTemplateMarketStore.setState({
          templates: { [template1.id]: template1, [template2.id]: template2 },
          filters: { sortBy: 'name', sortOrder: 'asc' },
        });
      });

      const filtered = result.current.getFilteredTemplates();
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered[0].name).toBe('Alpha');
    });

    it('should sort by name descending', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      const template1 = createMockTemplate({ id: 't1', name: 'Alpha' });
      const template2 = createMockTemplate({ id: 't2', name: 'Zebra' });

      act(() => {
        useTemplateMarketStore.setState({
          templates: { [template1.id]: template1, [template2.id]: template2 },
          filters: { sortBy: 'name', sortOrder: 'desc' },
        });
      });

      const filtered = result.current.getFilteredTemplates();
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered[0].name).toBe('Zebra');
    });

    it('should sort by rating', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      const template1 = createMockTemplate({
        id: 't1',
        metadata: { source: 'user', createdAt: new Date(), updatedAt: new Date(), usageCount: 0, rating: 3.0, ratingCount: 10, isOfficial: false },
      });
      const template2 = createMockTemplate({
        id: 't2',
        metadata: { source: 'user', createdAt: new Date(), updatedAt: new Date(), usageCount: 0, rating: 5.0, ratingCount: 10, isOfficial: false },
      });

      act(() => {
        useTemplateMarketStore.setState({
          templates: { [template1.id]: template1, [template2.id]: template2 },
          filters: { sortBy: 'rating', sortOrder: 'desc' },
        });
      });

      const filtered = result.current.getFilteredTemplates();
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered[0].metadata.rating).toBe(5.0);
    });

    it('should sort by usage', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      const template1 = createMockTemplate({
        id: 't1',
        metadata: { source: 'user', createdAt: new Date(), updatedAt: new Date(), usageCount: 10, rating: 0, ratingCount: 0, isOfficial: false },
      });
      const template2 = createMockTemplate({
        id: 't2',
        metadata: { source: 'user', createdAt: new Date(), updatedAt: new Date(), usageCount: 100, rating: 0, ratingCount: 0, isOfficial: false },
      });

      act(() => {
        useTemplateMarketStore.setState({
          templates: { [template1.id]: template1, [template2.id]: template2 },
          filters: { sortBy: 'usage', sortOrder: 'desc' },
        });
      });

      const filtered = result.current.getFilteredTemplates();
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered[0].metadata.usageCount).toBe(100);
    });
  });

  describe('Template Operations', () => {
    it('should increment usage count', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      const template = createMockTemplate({
        id: 'usage-test',
        metadata: { ...createMockTemplate().metadata, usageCount: 5 },
      });

      act(() => {
        result.current.addTemplate(template);
      });

      act(() => {
        result.current.incrementUsage('usage-test');
      });

      expect(result.current.templates['usage-test'].metadata.usageCount).toBe(6);
    });

    it('should not increment usage for non-existent template', () => {
      const { result } = renderHook(() => useTemplateMarketStore());

      act(() => {
        result.current.incrementUsage('non-existent');
      });

      expect(result.current.templates['non-existent']).toBeUndefined();
    });

    it('should rate a template', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      const template = createMockTemplate({
        id: 'rate-test',
        metadata: { ...createMockTemplate().metadata, rating: 4.0, ratingCount: 10 },
      });

      act(() => {
        result.current.addTemplate(template);
      });

      act(() => {
        result.current.rateTemplate('rate-test', 5);
      });

      expect(result.current.templates['rate-test'].metadata.ratingCount).toBe(11);
      // New rating should be (4.0 * 10 + 5) / 11 ≈ 4.09
      expect(result.current.templates['rate-test'].metadata.rating).toBeGreaterThan(4.0);
    });

    it('should clone a template', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      const template = createMockTemplate({ id: 'clone-source', name: 'Original' });

      act(() => {
        result.current.addTemplate(template);
      });

      let cloned: WorkflowTemplate | null = null;
      act(() => {
        cloned = result.current.cloneTemplate('clone-source', 'Cloned Template');
      });

      expect(cloned).not.toBeNull();
      expect(cloned!.name).toBe('Cloned Template');
      expect(cloned!.id).not.toBe('clone-source');
      expect(cloned!.metadata.source).toBe('user');
      expect(cloned!.metadata.usageCount).toBe(0);
      expect(cloned!.metadata.rating).toBe(0);
    });

    it('should return null when cloning non-existent template', () => {
      const { result } = renderHook(() => useTemplateMarketStore());

      let cloned: WorkflowTemplate | null = null;
      act(() => {
        cloned = result.current.cloneTemplate('non-existent', 'Clone');
      });

      expect(cloned).toBeNull();
    });
  });

  describe('Import/Export', () => {
    it('should export a template as JSON', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      const template = createMockTemplate({ id: 'export-test', name: 'Export Me' });

      act(() => {
        result.current.addTemplate(template);
      });

      const exported = result.current.exportTemplate('export-test', 'json');
      expect(exported).not.toBeNull();

      const parsed = JSON.parse(exported!);
      expect(parsed.name).toBe('Export Me');
    });

    it('should export template without metadata', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      const template = createMockTemplate({ id: 'export-no-meta' });

      act(() => {
        result.current.addTemplate(template);
      });

      const exported = result.current.exportTemplate('export-no-meta', 'json', false);
      expect(exported).not.toBeNull();

      const parsed = JSON.parse(exported!);
      expect(parsed.metadata).toBeUndefined();
    });

    it('should return null when exporting non-existent template', () => {
      const { result } = renderHook(() => useTemplateMarketStore());

      const exported = result.current.exportTemplate('non-existent', 'json');
      expect(exported).toBeNull();
    });

    it('should return null for unsupported YAML format', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      const template = createMockTemplate({ id: 'yaml-test' });

      act(() => {
        result.current.addTemplate(template);
      });

      const exported = result.current.exportTemplate('yaml-test', 'yaml');
      expect(exported).toBeNull();
    });

    it('should import a valid JSON template', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      const templateData = {
        id: 'import-test',
        name: 'Imported Template',
        workflow: { nodes: [], edges: [] },
      };

      let imported: WorkflowTemplate | null = null;
      act(() => {
        imported = result.current.importTemplate(JSON.stringify(templateData), 'json');
      });

      expect(imported).not.toBeNull();
      expect(result.current.templates['import-test']).toBeDefined();
    });

    it('should return null for invalid JSON', () => {
      const { result } = renderHook(() => useTemplateMarketStore());

      let imported: WorkflowTemplate | null = null;
      act(() => {
        imported = result.current.importTemplate('invalid json', 'json');
      });

      expect(imported).toBeNull();
    });

    it('should return null for invalid template structure', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      const invalidTemplate = { name: 'Missing id and workflow' };

      let imported: WorkflowTemplate | null = null;
      act(() => {
        imported = result.current.importTemplate(JSON.stringify(invalidTemplate), 'json');
      });

      expect(imported).toBeNull();
    });

    it('should return null when importing duplicate template', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      const template = createMockTemplate({ id: 'dup-test' });
      const templateData = {
        id: 'dup-test',
        name: 'Duplicate',
        workflow: { nodes: [], edges: [] },
      };

      act(() => {
        result.current.addTemplate(template);
      });

      let imported: WorkflowTemplate | null = null;
      act(() => {
        imported = result.current.importTemplate(JSON.stringify(templateData), 'json');
      });

      expect(imported).toBeNull();
    });

    it('should return null for YAML import (not supported)', () => {
      const { result } = renderHook(() => useTemplateMarketStore());
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      let imported: WorkflowTemplate | null = null;
      act(() => {
        imported = result.current.importTemplate('name: Test', 'yaml');
      });

      expect(imported).toBeNull();
      consoleSpy.mockRestore();
    });
  });
});
