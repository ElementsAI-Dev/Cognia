import type { NodeTemplate } from '@/types/workflow/workflow-editor';

import {
  getWorkflowNodeCatalogCategories,
  getWorkflowNodeCatalogEntriesByTypes,
  getWorkflowNodeCatalogItemByType,
  queryWorkflowNodeCatalog,
} from './node-catalog';

describe('workflow node catalog', () => {
  it('filters categories by search query and tag while preserving category structure', () => {
    const categories = getWorkflowNodeCatalogCategories({
      searchQuery: 'knowledge',
      selectedTags: ['ai'],
    });

    expect(categories).toHaveLength(1);
    expect(categories[0]?.id).toBe('ai-advanced');
    expect(categories[0]?.nodes.map((node) => node.name)).toEqual(['Knowledge Retrieval']);
  });

  it('returns stable recent and favorite entries by type order', () => {
    const entries = getWorkflowNodeCatalogEntriesByTypes(['code', 'ai', 'missing' as never, 'code']);

    expect(entries.map((entry) => entry.type)).toEqual(['code', 'ai']);
    expect(entries[0]?.name).toBe('Code');
    expect(entries[1]?.name).toBe('AI Step');
  });

  it('includes template-backed entries in quick-add queries and prioritizes recent matches', () => {
    const templates: NodeTemplate[] = [
      {
        id: 'template-1',
        name: 'Knowledge Answer',
        description: 'Answer with retrieved knowledge',
        nodeType: 'answer',
        data: {} as NodeTemplate['data'],
        category: 'custom',
        tags: ['ai', 'answer'],
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ];

    const results = queryWorkflowNodeCatalog({
      searchQuery: 'knowledge',
      nodeTemplates: templates,
      recentNodes: ['knowledgeRetrieval'],
      favoriteNodes: ['answer'],
      includeTemplates: true,
      limit: 5,
    });

    expect(results[0]).toMatchObject({
      kind: 'node',
      type: 'knowledgeRetrieval',
    });
    expect(results[1]).toMatchObject({
      kind: 'template',
      templateId: 'template-1',
    });
  });

  it('returns the primary item for a node type', () => {
    expect(getWorkflowNodeCatalogItemByType('transform')).toMatchObject({
      type: 'transform',
      name: 'Transform',
      categoryId: 'ai',
    });
  });
});
