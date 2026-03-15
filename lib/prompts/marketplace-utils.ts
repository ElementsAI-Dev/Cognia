/**
 * Prompt marketplace utility helpers.
 * Includes filtering/sorting, normalization, and import/export schema utilities.
 */

import { z } from 'zod';
import type {
  InstalledMarketplacePrompt,
  MarketplaceCategory,
  MarketplacePrompt,
  MarketplaceSearchFilters,
  PromptCollection,
  PromptQualityTier,
} from '@/types/content/prompt-marketplace';
import { MARKETPLACE_CATEGORIES } from '@/types/content/prompt-marketplace';
import type {
  CreatePromptTemplateInput,
  PromptTemplate,
  PromptTemplateMarketplaceBaseline,
  PromptTemplateMarketplaceLinkage,
  PromptTemplateMarketplaceSyncStatus,
  PromptTemplatePublishReadiness,
  PromptTemplateDraftSession,
  TemplateVariable,
} from '@/types/content/prompt-template';
import { SAMPLE_MARKETPLACE_COLLECTIONS, SAMPLE_MARKETPLACE_PROMPTS } from '@/lib/prompts/marketplace-samples';

export type PromptMarketplaceDataSource = 'remote' | 'fallback';
export type PromptMarketplaceOperationStatus = 'idle' | 'loading' | 'success' | 'error';
export type PromptMarketplaceImportConflictStrategy = 'skip' | 'overwrite' | 'duplicate';
export type PromptMarketplaceImportItemStatus = 'imported' | 'skipped' | 'failed';
export type PromptMarketplaceErrorCategory =
  | 'auth'
  | 'network'
  | 'rate_limit'
  | 'validation'
  | 'not_found'
  | 'conflict'
  | 'unknown';

export const PROMPT_MARKETPLACE_EXCHANGE_VERSION = '1.1';

export interface PromptMarketplaceOperationState {
  status: PromptMarketplaceOperationStatus;
  error?: string;
  category?: PromptMarketplaceErrorCategory;
  retryable?: boolean;
  code?: string;
  updatedAt: Date;
}

export interface PromptMarketplaceCatalogSnapshot {
  prompts: Record<string, MarketplacePrompt>;
  collections: Record<string, PromptCollection>;
  featuredIds: string[];
  trendingIds: string[];
}

export interface PromptMarketplaceImportReport {
  success: boolean;
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
  items: PromptMarketplaceImportItemResult[];
}

export interface PromptMarketplaceImportItemResult {
  sourcePromptId: string;
  targetPromptId?: string;
  promptName: string;
  status: PromptMarketplaceImportItemStatus;
  strategy: PromptMarketplaceImportConflictStrategy;
  message?: string;
}

export interface PromptMarketplaceExchangePrompt {
  id: string;
  name: string;
  description?: string;
  content: string;
  category?: MarketplaceCategory;
  tags?: string[];
  variables?: MarketplacePrompt['variables'];
  targets?: MarketplacePrompt['targets'];
  author?: MarketplacePrompt['author'];
  qualityTier?: PromptQualityTier;
  version?: string;
  icon?: string;
  color?: string;
  stats?: MarketplacePrompt['stats'];
  rating?: MarketplacePrompt['rating'];
}

export interface PromptMarketplaceExchangePayload {
  version: string;
  exportedAt: string;
  prompts: PromptMarketplaceExchangePrompt[];
}

export interface PromptMarketplaceExchangeParseResult {
  ok: boolean;
  payload?: PromptMarketplaceExchangePayload;
  errors: string[];
}

export interface PromptWorkflowState {
  relation: PromptTemplateMarketplaceLinkage | 'local';
  syncStatus: PromptTemplateMarketplaceSyncStatus;
  hasDraftSession: boolean;
  continueEditingTemplateId?: string;
  publishReadiness: PromptTemplatePublishReadiness;
  saveBehavior: 'direct-update' | 'fork-on-save' | 'restricted-update';
}

export interface PromptUpdateResolution {
  type: 'none' | 'apply-update' | 'conflict';
  allowedActions: Array<'apply-update' | 'overwrite-local' | 'keep-local-draft' | 'fork-and-reinstall'>;
}

const VALID_CATEGORY_IDS = new Set(MARKETPLACE_CATEGORIES.map((category) => category.id));
const SPECIAL_CATEGORY_IDS = new Set<MarketplaceCategory>(['featured', 'trending', 'new']);

const exchangePromptSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  content: z.string().min(1),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  variables: z.array(z.unknown()).optional(),
  targets: z.array(z.string()).optional(),
  author: z
    .object({
      id: z.string(),
      name: z.string(),
      avatar: z.string().optional(),
      verified: z.boolean().optional(),
      promptCount: z.number().optional(),
      totalDownloads: z.number().optional(),
    })
    .optional(),
  qualityTier: z.string().optional(),
  version: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  stats: z
    .object({
      downloads: z.number().optional(),
      weeklyDownloads: z.number().optional(),
      favorites: z.number().optional(),
      shares: z.number().optional(),
      views: z.number().optional(),
      successRate: z.number().optional(),
      averageRating: z.number().optional(),
    })
    .optional(),
  rating: z
    .object({
      average: z.number().optional(),
      count: z.number().optional(),
      distribution: z
        .object({
          1: z.number().optional(),
          2: z.number().optional(),
          3: z.number().optional(),
          4: z.number().optional(),
          5: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
});

const exchangePayloadSchema = z.object({
  version: z.string().min(1),
  exportedAt: z.string().optional(),
  prompts: z.array(exchangePromptSchema),
});

function asDate(value: Date | string | number | undefined, fallback: Date): Date {
  if (!value) {
    return fallback;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? fallback : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function asCategory(value: string | undefined): MarketplaceCategory {
  if (value && VALID_CATEGORY_IDS.has(value as MarketplaceCategory)) {
    return value as MarketplaceCategory;
  }
  return 'chat';
}

function asQualityTier(value: string | undefined): PromptQualityTier {
  if (value === 'community' || value === 'verified' || value === 'premium' || value === 'official') {
    return value;
  }
  return 'community';
}

function makeStableSampleId(name: string, index: number): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `sample-${index + 1}-${slug}`;
}

function normalizeTemplateVariables(variables: TemplateVariable[] | undefined): TemplateVariable[] {
  return (variables ?? []).map((variable) => ({
    ...variable,
    options: variable.options ? [...variable.options] : undefined,
  }));
}

function normalizeTargets(targets: PromptTemplate['targets'] | undefined): PromptTemplate['targets'] {
  return (targets && targets.length > 0 ? [...targets] : ['chat']) as PromptTemplate['targets'];
}

function buildTemplateBaseline(
  input: Pick<PromptTemplate, 'name' | 'description' | 'content' | 'category' | 'tags' | 'variables' | 'targets'>,
  version: string
): PromptTemplateMarketplaceBaseline {
  return {
    version,
    name: input.name,
    description: input.description,
    content: input.content,
    category: input.category,
    tags: normalizeTags(input.tags),
    variables: normalizeTemplateVariables(input.variables),
    targets: normalizeTargets(input.targets) ?? ['chat'],
    capturedAt: new Date().toISOString(),
  };
}

function buildComparableTemplateSnapshot(
  input: Pick<PromptTemplate, 'name' | 'description' | 'content' | 'category' | 'tags' | 'variables' | 'targets'>
): string {
  return JSON.stringify({
    name: input.name.trim(),
    description: input.description?.trim() || '',
    content: input.content,
    category: input.category || '',
    tags: normalizeTags(input.tags),
    variables: normalizeTemplateVariables(input.variables),
    targets: normalizeTargets(input.targets) ?? ['chat'],
  });
}

function buildBaselineComparableSnapshot(baseline: PromptTemplateMarketplaceBaseline): string {
  return JSON.stringify({
    name: baseline.name.trim(),
    description: baseline.description?.trim() || '',
    content: baseline.content,
    category: baseline.category || '',
    tags: normalizeTags(baseline.tags),
    variables: normalizeTemplateVariables(baseline.variables),
    targets: normalizeTargets(baseline.targets) ?? ['chat'],
  });
}

function deriveTemplateSaveBehavior(template: PromptTemplate): PromptWorkflowState['saveBehavior'] {
  if (template.meta?.marketplace?.marketplaceId) {
    return 'restricted-update';
  }
  if (template.source === 'builtin' || template.source === 'mcp') {
    return 'fork-on-save';
  }
  return 'direct-update';
}

export function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags || tags.length === 0) {
    return [];
  }

  const unique = new Set<string>();
  for (const rawTag of tags) {
    const normalized = rawTag.trim().toLowerCase();
    if (normalized) {
      unique.add(normalized);
    }
  }

  return Array.from(unique);
}

export function buildTemplateInputFromMarketplacePrompt(
  prompt: MarketplacePrompt
): CreatePromptTemplateInput {
  return {
    name: prompt.name,
    description: prompt.description,
    content: prompt.content,
    category: prompt.category,
    tags: normalizeTags([...(prompt.tags || []), 'marketplace']),
    variables: normalizeTemplateVariables(prompt.variables),
    targets: normalizeTargets(prompt.targets),
    source: 'imported',
    meta: {
      icon: prompt.icon,
      color: prompt.color,
      marketplace: {
        marketplaceId: prompt.id,
        sourcePromptId: prompt.id,
        linkageType: 'installed',
        installedVersion: prompt.version,
        latestVersion: prompt.version,
        syncStatus: 'clean',
        baseline: buildTemplateBaseline(
          {
            name: prompt.name,
            description: prompt.description,
            content: prompt.content,
            category: prompt.category,
            tags: normalizeTags([...(prompt.tags || []), 'marketplace']),
            variables: prompt.variables,
            targets: prompt.targets,
          },
          prompt.version
        ),
        lastSyncedAt: new Date().toISOString(),
      },
    },
  };
}

export function normalizeMarketplacePrompt(
  prompt: Partial<MarketplacePrompt> & Pick<MarketplacePrompt, 'id'>
): MarketplacePrompt {
  const now = new Date();
  const distribution = prompt.rating?.distribution ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const safeDistribution = {
    1: distribution[1] ?? 0,
    2: distribution[2] ?? 0,
    3: distribution[3] ?? 0,
    4: distribution[4] ?? 0,
    5: distribution[5] ?? 0,
  };

  return {
    id: prompt.id,
    name: prompt.name?.trim() || 'Untitled Prompt',
    description: prompt.description?.trim() || '',
    content: prompt.content || '',
    category: asCategory(prompt.category),
    subcategory: prompt.subcategory,
    tags: normalizeTags(prompt.tags),
    variables: prompt.variables ?? [],
    targets: prompt.targets ?? ['chat'],
    author: prompt.author ?? { id: 'unknown', name: 'Unknown Author' },
    source: prompt.source ?? 'marketplace',
    qualityTier: asQualityTier(prompt.qualityTier),
    version: prompt.version || '1.0.0',
    versions: prompt.versions ?? [],
    stats: {
      downloads: prompt.stats?.downloads ?? 0,
      weeklyDownloads: prompt.stats?.weeklyDownloads ?? 0,
      favorites: prompt.stats?.favorites ?? 0,
      shares: prompt.stats?.shares ?? 0,
      views: prompt.stats?.views ?? 0,
      successRate: prompt.stats?.successRate,
      averageRating: prompt.stats?.averageRating,
    },
    rating: {
      average: prompt.rating?.average ?? 0,
      count: prompt.rating?.count ?? 0,
      distribution: safeDistribution,
    },
    reviewCount: prompt.reviewCount ?? 0,
    icon: prompt.icon,
    color: prompt.color,
    previewImage: prompt.previewImage,
    exampleOutput: prompt.exampleOutput,
    compatibleModels: prompt.compatibleModels,
    recommendedModels: prompt.recommendedModels,
    minTokens: prompt.minTokens,
    isOfficial: prompt.isOfficial,
    isFeatured: prompt.isFeatured,
    isNSFW: prompt.isNSFW,
    createdAt: asDate(prompt.createdAt, now),
    updatedAt: asDate(prompt.updatedAt, now),
    publishedAt: prompt.publishedAt ? asDate(prompt.publishedAt, now) : undefined,
  };
}

export function derivePromptPublishReadiness(input: {
  template: PromptTemplate;
  workflow?: Pick<PromptWorkflowState, 'syncStatus'>;
}): PromptTemplatePublishReadiness {
  const { template, workflow } = input;
  const reasons: PromptTemplatePublishReadiness['reasons'] = [];

  if (!template.name.trim()) {
    reasons.push('missing-name');
  }
  if (!template.description?.trim()) {
    reasons.push('missing-description');
  }
  if (!template.content.trim()) {
    reasons.push('missing-content');
  }
  if (!template.category?.trim()) {
    reasons.push('missing-category');
  } else if (!isPublishableMarketplaceCategory(template.category as MarketplaceCategory)) {
    reasons.push('invalid-category');
  }

  if (template.source === 'builtin' || template.source === 'mcp') {
    reasons.push('restricted-source');
  }

  if (workflow?.syncStatus === 'conflict') {
    reasons.push('unresolved-conflict');
  }

  if (reasons.length > 0) {
    return {
      isReady: false,
      mode: 'blocked',
      reasons,
    };
  }

  const linkage = template.meta?.marketplace;
  return {
    isReady: true,
    mode:
      linkage?.linkageType === 'published' && linkage.marketplaceId
        ? 'update'
        : 'create',
    reasons: [],
  };
}

export function derivePromptWorkflowState(input: {
  template: PromptTemplate;
  installation?: InstalledMarketplacePrompt;
  draftSession?: PromptTemplateDraftSession | null;
}): PromptWorkflowState {
  const { template, installation, draftSession } = input;
  const marketplaceMeta = template.meta?.marketplace;
  const relation: PromptWorkflowState['relation'] = marketplaceMeta?.linkageType || 'local';
  const baseline = marketplaceMeta?.baseline;
  const installedVersion = installation?.installedVersion || marketplaceMeta?.installedVersion;
  const latestVersion = installation?.latestVersion || marketplaceMeta?.latestVersion || installedVersion;
  const hasUpstreamUpdate = Boolean(latestVersion && installedVersion && latestVersion !== installedVersion);
  const hasBaselineDivergence = baseline
    ? buildComparableTemplateSnapshot(template) !== buildBaselineComparableSnapshot(baseline)
    : false;

  let syncStatus: PromptTemplateMarketplaceSyncStatus = 'local';
  if (relation !== 'local') {
    if (hasUpstreamUpdate && hasBaselineDivergence) {
      syncStatus = 'conflict';
    } else if (hasUpstreamUpdate) {
      syncStatus = 'update-available';
    } else if (hasBaselineDivergence) {
      syncStatus = 'dirty';
    } else if (relation === 'published') {
      syncStatus = 'published';
    } else {
      syncStatus = 'clean';
    }
  }

  const publishReadiness = derivePromptPublishReadiness({
    template,
    workflow: { syncStatus },
  });

  return {
    relation,
    syncStatus,
    hasDraftSession: Boolean(draftSession?.dirty),
    continueEditingTemplateId: template.id,
    publishReadiness,
    saveBehavior: deriveTemplateSaveBehavior(template),
  };
}

export function resolveMarketplaceUpdateAction(input: {
  template: PromptTemplate;
  installation: InstalledMarketplacePrompt;
}): PromptUpdateResolution {
  const workflow = derivePromptWorkflowState({
    template: input.template,
    installation: input.installation,
  });

  if (workflow.syncStatus === 'conflict') {
    return {
      type: 'conflict',
      allowedActions: ['overwrite-local', 'keep-local-draft', 'fork-and-reinstall'],
    };
  }

  if (workflow.syncStatus === 'update-available') {
    return {
      type: 'apply-update',
      allowedActions: ['apply-update'],
    };
  }

  return {
    type: 'none',
    allowedActions: [],
  };
}

export function applyMarketplaceFilters(
  prompts: MarketplacePrompt[],
  filters: MarketplaceSearchFilters
): MarketplacePrompt[] {
  let filtered = prompts;

  if (filters.category) {
    if (filters.category === 'featured') {
      filtered = filtered.filter((prompt) => prompt.isFeatured);
    } else if (!SPECIAL_CATEGORY_IDS.has(filters.category)) {
      filtered = filtered.filter((prompt) => prompt.category === filters.category);
    }
  }

  if (filters.query?.trim()) {
    const query = filters.query.trim().toLowerCase();
    filtered = filtered.filter((prompt) => {
      return (
        prompt.name.toLowerCase().includes(query) ||
        prompt.description.toLowerCase().includes(query) ||
        prompt.content.toLowerCase().includes(query) ||
        prompt.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        prompt.author.name.toLowerCase().includes(query)
      );
    });
  }

  if (filters.tags?.length) {
    filtered = filtered.filter((prompt) =>
      filters.tags?.some((tag) => prompt.tags.includes(tag))
    );
  }

  if (filters.qualityTier?.length) {
    filtered = filtered.filter((prompt) => filters.qualityTier?.includes(prompt.qualityTier));
  }

  if (filters.targets?.length) {
    filtered = filtered.filter((prompt) =>
      filters.targets?.some((target) => prompt.targets.includes(target))
    );
  }

  if (filters.minRating) {
    filtered = filtered.filter((prompt) => prompt.rating.average >= filters.minRating!);
  }

  if (filters.authorId) {
    filtered = filtered.filter((prompt) => prompt.author.id === filters.authorId);
  }

  if (filters.compatibleModel) {
    filtered = filtered.filter((prompt) =>
      prompt.compatibleModels?.includes(filters.compatibleModel!) ||
      prompt.recommendedModels?.includes(filters.compatibleModel!)
    );
  }

  return filtered;
}

export function sortMarketplacePrompts(
  prompts: MarketplacePrompt[],
  sortBy: MarketplaceSearchFilters['sortBy'],
  hasQuery: boolean
): MarketplacePrompt[] {
  const sorted = [...prompts];

  switch (sortBy) {
    case 'downloads':
      sorted.sort((a, b) => b.stats.downloads - a.stats.downloads);
      break;
    case 'rating':
      sorted.sort((a, b) => b.rating.average - a.rating.average);
      break;
    case 'newest':
      sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      break;
    case 'trending':
      sorted.sort((a, b) => b.stats.weeklyDownloads - a.stats.weeklyDownloads);
      break;
    case 'relevance':
    default:
      if (!hasQuery) {
        sorted.sort((a, b) => b.stats.downloads - a.stats.downloads);
      }
      break;
  }

  return sorted;
}

export function buildMarketplaceFacets(prompts: MarketplacePrompt[]): {
  categories: Record<string, number>;
  tags: Record<string, number>;
  qualityTiers: Record<string, number>;
} {
  const facets = {
    categories: {} as Record<string, number>,
    tags: {} as Record<string, number>,
    qualityTiers: {} as Record<string, number>,
  };

  for (const prompt of prompts) {
    facets.categories[prompt.category] = (facets.categories[prompt.category] || 0) + 1;
    facets.qualityTiers[prompt.qualityTier] = (facets.qualityTiers[prompt.qualityTier] || 0) + 1;
    for (const tag of prompt.tags) {
      facets.tags[tag] = (facets.tags[tag] || 0) + 1;
    }
  }

  return facets;
}

export function buildFallbackMarketplaceCatalogSnapshot(): PromptMarketplaceCatalogSnapshot {
  const now = new Date();
  const prompts: Record<string, MarketplacePrompt> = {};
  const featuredIds: string[] = [];

  SAMPLE_MARKETPLACE_PROMPTS.forEach((samplePrompt, index) => {
    const id = makeStableSampleId(samplePrompt.name, index);
    const normalized = normalizeMarketplacePrompt({
      ...samplePrompt,
      id,
      createdAt: now,
      updatedAt: now,
    });

    prompts[id] = normalized;
    if (normalized.isFeatured) {
      featuredIds.push(id);
    }
  });

  const trendingIds = Object.values(prompts)
    .sort((a, b) => b.stats.weeklyDownloads - a.stats.weeklyDownloads)
    .slice(0, 6)
    .map((prompt) => prompt.id);

  const collections: Record<string, PromptCollection> = {};

  SAMPLE_MARKETPLACE_COLLECTIONS.forEach((sampleCollection, index) => {
    const id = makeStableSampleId(sampleCollection.name, index);
    const promptIds = Object.values(prompts)
      .filter((prompt) => {
        if (sampleCollection.categoryFilter) {
          return prompt.category === sampleCollection.categoryFilter;
        }
        return sampleCollection.tags?.some((tag) => prompt.tags.includes(tag));
      })
      .map((prompt) => prompt.id);

    collections[id] = {
      ...sampleCollection,
      id,
      promptIds,
      promptCount: promptIds.length,
      createdAt: now,
      updatedAt: now,
    };
  });

  return {
    prompts,
    collections,
    featuredIds,
    trendingIds,
  };
}

export function buildPromptMarketplaceExchangePayload(
  prompts: MarketplacePrompt[]
): PromptMarketplaceExchangePayload {
  return {
    version: PROMPT_MARKETPLACE_EXCHANGE_VERSION,
    exportedAt: new Date().toISOString(),
    prompts: prompts.map((prompt) => ({
      id: prompt.id,
      name: prompt.name,
      description: prompt.description,
      content: prompt.content,
      category: prompt.category,
      tags: prompt.tags,
      variables: prompt.variables,
      targets: prompt.targets,
      author: prompt.author,
      qualityTier: prompt.qualityTier,
      version: prompt.version,
      icon: prompt.icon,
      color: prompt.color,
      stats: prompt.stats,
      rating: prompt.rating,
    })),
  };
}

export function parsePromptMarketplaceExchangePayload(
  payload: string | unknown
): PromptMarketplaceExchangeParseResult {
  let parsedInput: unknown = payload;

  if (typeof payload === 'string') {
    try {
      parsedInput = JSON.parse(payload);
    } catch {
      return {
        ok: false,
        errors: ['Failed to parse JSON payload'],
      };
    }
  }

  const parsed = exchangePayloadSchema.safeParse(parsedInput);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => issue.message),
    };
  }

  if (
    parsed.data.version !== PROMPT_MARKETPLACE_EXCHANGE_VERSION &&
    parsed.data.version !== '1.0'
  ) {
    return {
      ok: false,
      errors: [`Unsupported export version: ${parsed.data.version}`],
    };
  }

  const exportDate = parsed.data.exportedAt ? new Date(parsed.data.exportedAt) : new Date();
  const safeExportDate = Number.isNaN(exportDate.getTime()) ? new Date() : exportDate;

  const normalizedPayload: PromptMarketplaceExchangePayload = {
    version: parsed.data.version,
    exportedAt: safeExportDate.toISOString(),
    prompts: parsed.data.prompts.map((prompt) => ({
      id: prompt.id,
      name: prompt.name,
      description: prompt.description,
      content: prompt.content,
      category: asCategory(prompt.category),
      tags: normalizeTags(prompt.tags),
      variables: (prompt.variables as MarketplacePrompt['variables']) ?? [],
      targets: (prompt.targets as MarketplacePrompt['targets']) ?? ['chat'],
      author: prompt.author,
      qualityTier: asQualityTier(prompt.qualityTier),
      version: prompt.version || '1.0.0',
      icon: prompt.icon,
      color: prompt.color,
      stats: prompt.stats as MarketplacePrompt['stats'] | undefined,
      rating: prompt.rating as MarketplacePrompt['rating'] | undefined,
    })),
  };

  return {
    ok: true,
    payload: normalizedPayload,
    errors: [],
  };
}

export function isPublishableMarketplaceCategory(category: MarketplaceCategory): boolean {
  return !SPECIAL_CATEGORY_IDS.has(category);
}
