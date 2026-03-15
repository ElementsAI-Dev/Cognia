import {
  NODE_CATEGORIES,
  NODE_TYPE_ICONS,
  NODE_TYPE_COLORS,
  type NodeCategory,
  type NodePaletteItem,
  type NodeTemplate,
  type WorkflowNodeData,
  type WorkflowNodeType,
} from '@/types/workflow/workflow-editor';

import { NODE_TYPE_TAGS } from './constants';

export interface WorkflowNodeCatalogEntry extends NodePaletteItem {
  kind: 'node';
  id: string;
  categoryId: string;
  categoryName: string;
  tags: string[];
}

export interface WorkflowNodeTemplateCatalogEntry {
  kind: 'template';
  id: string;
  templateId: string;
  nodeType: WorkflowNodeType;
  name: string;
  description: string;
  icon: string;
  color: string;
  tags: string[];
  categoryId: string;
  categoryName: string;
  defaultData: Partial<WorkflowNodeData>;
}

export type WorkflowNodeCatalogQueryResult =
  | WorkflowNodeCatalogEntry
  | WorkflowNodeTemplateCatalogEntry;

export interface WorkflowNodeCatalogFilterOptions {
  searchQuery?: string;
  selectedTags?: string[];
}

export interface WorkflowNodeCatalogQueryOptions extends WorkflowNodeCatalogFilterOptions {
  nodeTemplates?: NodeTemplate[];
  recentNodes?: WorkflowNodeType[];
  favoriteNodes?: WorkflowNodeType[];
  includeTemplates?: boolean;
  limit?: number;
}

function normalizeText(text: string | undefined): string {
  return (text || '').trim().toLowerCase();
}

function matchesSearch(
  value: Pick<WorkflowNodeCatalogEntry, 'name' | 'description' | 'type' | 'categoryName' | 'tags'>
    | Pick<
        WorkflowNodeTemplateCatalogEntry,
        'name' | 'description' | 'nodeType' | 'categoryName' | 'tags'
      >,
  searchQuery: string
): boolean {
  if (!searchQuery) {
    return true;
  }

  const normalizedQuery = normalizeText(searchQuery);
  const haystack = [
    value.name,
    value.description,
    'type' in value ? value.type : value.nodeType,
    value.categoryName,
    ...value.tags,
  ]
    .map((segment) => normalizeText(String(segment)))
    .join(' ');

  return haystack.includes(normalizedQuery);
}

function matchesTags(tags: string[], selectedTags: string[]): boolean {
  if (selectedTags.length === 0) {
    return true;
  }

  return selectedTags.some((tag) => tags.includes(tag));
}

function buildTemplateCatalogEntries(nodeTemplates: NodeTemplate[]): WorkflowNodeTemplateCatalogEntry[] {
  return nodeTemplates.map((template) => ({
    kind: 'template',
    id: `template:${template.id}`,
    templateId: template.id,
    nodeType: template.nodeType,
    name: template.name,
    description: template.description || `Template for ${template.nodeType}`,
    icon: template.icon || NODE_TYPE_ICONS[template.nodeType],
    color: NODE_TYPE_COLORS[template.nodeType],
    tags: template.tags || NODE_TYPE_TAGS[template.nodeType] || [],
    categoryId: template.category || 'templates',
    categoryName: template.category || 'Templates',
    defaultData: template.data,
  }));
}

export function getWorkflowNodeCatalogEntries(
  categories: NodeCategory[] = NODE_CATEGORIES
): WorkflowNodeCatalogEntry[] {
  return categories.flatMap((category) =>
    category.nodes.map((node) => ({
      ...node,
      kind: 'node' as const,
      id: `${category.id}:${node.type}:${node.name}`,
      categoryId: category.id,
      categoryName: category.name,
      tags: [...(NODE_TYPE_TAGS[node.type] || [])],
    }))
  );
}

export function getWorkflowNodeCatalogCategories(
  options: WorkflowNodeCatalogFilterOptions = {}
): Array<Omit<NodeCategory, 'nodes'> & { nodes: WorkflowNodeCatalogEntry[] }> {
  const { searchQuery = '', selectedTags = [] } = options;

  return NODE_CATEGORIES.map((category) => ({
    ...category,
    nodes: category.nodes
      .map((node) => ({
        ...node,
        kind: 'node' as const,
        id: `${category.id}:${node.type}:${node.name}`,
        categoryId: category.id,
        categoryName: category.name,
        tags: [...(NODE_TYPE_TAGS[node.type] || [])],
      }))
      .filter((node) => matchesSearch(node, searchQuery) && matchesTags(node.tags, selectedTags)),
  })).filter((category) => category.nodes.length > 0);
}

export function getWorkflowNodeCatalogItemByType(
  type: WorkflowNodeType
): WorkflowNodeCatalogEntry | undefined {
  return getWorkflowNodeCatalogEntries().find((entry) => entry.type === type);
}

export function getWorkflowNodeCatalogEntriesByTypes(
  types: WorkflowNodeType[]
): WorkflowNodeCatalogEntry[] {
  const seen = new Set<WorkflowNodeType>();

  return types
    .filter((type) => {
      if (seen.has(type)) {
        return false;
      }
      seen.add(type);
      return true;
    })
    .map((type) => getWorkflowNodeCatalogItemByType(type))
    .filter((entry): entry is WorkflowNodeCatalogEntry => Boolean(entry));
}

export function queryWorkflowNodeCatalog(
  options: WorkflowNodeCatalogQueryOptions = {}
): WorkflowNodeCatalogQueryResult[] {
  const {
    searchQuery = '',
    selectedTags = [],
    nodeTemplates = [],
    recentNodes = [],
    favoriteNodes = [],
    includeTemplates = false,
    limit,
  } = options;

  const recentIndex = new Map(recentNodes.map((type, index) => [type, index]));
  const favoriteSet = new Set(favoriteNodes);

  const nodeEntries = getWorkflowNodeCatalogEntries()
    .filter((entry) => matchesSearch(entry, searchQuery) && matchesTags(entry.tags, selectedTags))
    .sort((left, right) => {
      const leftRecent = recentIndex.get(left.type);
      const rightRecent = recentIndex.get(right.type);

      if (leftRecent !== undefined || rightRecent !== undefined) {
        if (leftRecent === undefined) return 1;
        if (rightRecent === undefined) return -1;
        if (leftRecent !== rightRecent) return leftRecent - rightRecent;
      }

      const leftFavorite = favoriteSet.has(left.type);
      const rightFavorite = favoriteSet.has(right.type);
      if (leftFavorite !== rightFavorite) {
        return leftFavorite ? -1 : 1;
      }

      return left.name.localeCompare(right.name);
    });

  const templateEntries = includeTemplates
    ? buildTemplateCatalogEntries(nodeTemplates).filter(
        (entry) => matchesSearch(entry, searchQuery) && matchesTags(entry.tags, selectedTags)
      )
    : [];

  const results = [...nodeEntries, ...templateEntries];

  if (typeof limit === 'number') {
    return results.slice(0, limit);
  }

  return results;
}
