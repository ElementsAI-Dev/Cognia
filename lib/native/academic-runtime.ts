/**
 * Academic runtime bridge (Tauri + Web fallback).
 */

import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '@/lib/utils';
import {
  executeAcademicSearch,
  type AcademicSearchInput,
} from '@/lib/ai/tools/academic-search-tool';
import type {
  AcademicProviderConfig,
  AcademicProviderType,
  AggregatedSearchResult,
  AcademicExportResult,
  AcademicStatistics,
  ImportResult,
  LibraryPaper,
  Paper,
  PaperAnnotation,
  PaperCollection,
} from '@/types/academic';
import { DEFAULT_ACADEMIC_PROVIDERS } from '@/types/academic/provider';

export const UNSUPPORTED_IN_WEB = 'UNSUPPORTED_IN_WEB';
const WEB_STORE_KEY = 'cognia.academic.runtime.web.v1';

type JsonRecord = Record<string, unknown>;

interface RuntimeErrorLike extends Error {
  code?: string;
  retriable?: boolean;
}

interface WebProviderState {
  enabled: boolean;
  apiKey?: string | null;
}

interface WebAcademicState {
  papers: Record<string, LibraryPaper>;
  collections: Record<string, PaperCollection>;
  annotations: Record<string, PaperAnnotation[]>;
  providers: Record<AcademicProviderType, WebProviderState>;
  pdfPaths: Record<string, string>;
}

const webMemoryState: WebAcademicState = createDefaultWebState();

function createDefaultWebState(): WebAcademicState {
  const providers = Object.entries(DEFAULT_ACADEMIC_PROVIDERS).reduce(
    (acc, [providerId, config]) => {
      acc[providerId as AcademicProviderType] = {
        enabled: config.enabled,
        apiKey: config.apiKey ?? null,
      };
      return acc;
    },
    {} as Record<AcademicProviderType, WebProviderState>
  );

  return {
    papers: {},
    collections: {},
    annotations: {},
    providers,
    pdfPaths: {},
  };
}

function createRuntimeError(
  message: string,
  options?: { code?: string; retriable?: boolean }
): RuntimeErrorLike {
  const error = new Error(message) as RuntimeErrorLike;
  error.code = options?.code;
  error.retriable = options?.retriable;
  return error;
}

function toCamelCaseKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
}

function normalizeObjectKeys<T>(value: T): T {
  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeObjectKeys(item)) as T;
  }

  if (value && typeof value === 'object') {
    const normalized = Object.entries(value as Record<string, unknown>).reduce(
      (acc, [key, item]) => {
        acc[toCamelCaseKey(key)] = normalizeObjectKeys(item);
        return acc;
      },
      {} as Record<string, unknown>
    );
    return normalized as T;
  }

  return value;
}

function reviveDateFields<T>(value: T): T {
  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => reviveDateFields(item)) as T;
  }

  if (value && typeof value === 'object') {
    const revived = Object.entries(value as Record<string, unknown>).reduce(
      (acc, [key, item]) => {
        if (
          typeof item === 'string' &&
          /(At|Date)$/.test(key) &&
          !Number.isNaN(Date.parse(item))
        ) {
          acc[key] = new Date(item);
          return acc;
        }
        acc[key] = reviveDateFields(item);
        return acc;
      },
      {} as Record<string, unknown>
    );
    return revived as T;
  }

  return value;
}

function normalizePayload<T>(value: T): T {
  return reviveDateFields(normalizeObjectKeys(value));
}

function getField<TValue>(
  source: Record<string, unknown> | undefined,
  keys: string[],
  fallback?: TValue
): TValue | undefined {
  if (!source) {
    return fallback;
  }

  for (const key of keys) {
    if (key in source) {
      return source[key] as TValue;
    }
  }

  return fallback;
}

function parseProviderList(value: unknown): AcademicProviderType[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((provider): provider is AcademicProviderType => typeof provider === 'string')
    .filter((provider): provider is AcademicProviderType =>
      provider in DEFAULT_ACADEMIC_PROVIDERS
    );
}

function parseSearchInput(commandArgs: JsonRecord): AcademicSearchInput {
  const normalizedArgs = normalizePayload(commandArgs) as JsonRecord;
  const query = (normalizedArgs.query as string | undefined) ?? '';
  const options = (normalizedArgs.options as JsonRecord | undefined) ?? {};

  const providersFromOptions = parseProviderList(
    getField<unknown>(options, ['providers'], [])
  );
  const providers =
    providersFromOptions.length > 0
      ? providersFromOptions
      : (['arxiv', 'semantic-scholar'] as AcademicProviderType[]);

  return {
    query,
    providers,
    maxResults:
      getField<number>(options, ['limit', 'maxResults']) ??
      (getField<number>(normalizedArgs, ['maxResults']) ?? 10),
    yearFrom: getField<number>(options, ['yearFrom', 'year_from']),
    yearTo: getField<number>(options, ['yearTo', 'year_to']),
    categories: getField<string[]>(options, ['categories']),
    openAccessOnly: getField<boolean>(options, ['openAccessOnly', 'open_access_only']) ?? false,
    sortBy:
      getField<'relevance' | 'date' | 'citations'>(
        options,
        ['sortBy', 'sort_by'],
        'relevance'
      ) ?? 'relevance',
  };
}

function randomId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function loadWebState(): WebAcademicState {
  if (typeof window === 'undefined') {
    return webMemoryState;
  }

  try {
    const raw = window.localStorage.getItem(WEB_STORE_KEY);
    if (!raw) {
      return webMemoryState;
    }

    const parsed = normalizePayload(JSON.parse(raw)) as Partial<WebAcademicState>;
    return {
      papers: parsed.papers ?? {},
      collections: parsed.collections ?? {},
      annotations: parsed.annotations ?? {},
      providers: {
        ...webMemoryState.providers,
        ...(parsed.providers ?? {}),
      },
      pdfPaths: parsed.pdfPaths ?? {},
    };
  } catch {
    return webMemoryState;
  }
}

function saveWebState(state: WebAcademicState): void {
  Object.assign(webMemoryState, state);
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(WEB_STORE_KEY, JSON.stringify(state));
  } catch {
    // Ignore web storage quota/runtime exceptions.
  }
}

function getProviderConfigForWeb(providerId: AcademicProviderType): AcademicProviderConfig {
  const provider = DEFAULT_ACADEMIC_PROVIDERS[providerId];
  const webState = loadWebState();
  const override = webState.providers[providerId];

  return {
    ...provider,
    enabled: override?.enabled ?? provider.enabled,
    apiKey: override?.apiKey ?? provider.apiKey,
  };
}

function createLibraryPaper(paper: Paper, collectionId?: string): LibraryPaper {
  const now = new Date();
  return {
    ...paper,
    libraryId: randomId('library'),
    addedAt: now,
    lastAccessedAt: now,
    collections: collectionId ? [collectionId] : [],
    tags: [],
    readingStatus: 'unread',
    priority: 'medium',
    readingProgress: 0,
  };
}

function toSearchResult(
  provider: AcademicProviderType,
  aggregate: AggregatedSearchResult
): {
  papers: Paper[];
  totalResults: number;
  hasMore: boolean;
  offset: number;
  provider: AcademicProviderType;
  searchTime: number;
  searchTimeMs: number;
} {
  return {
    papers: aggregate.papers,
    totalResults: aggregate.totalResults,
    hasMore: false,
    offset: 0,
    provider,
    searchTime: aggregate.searchTime,
    searchTimeMs: aggregate.searchTime,
  };
}

function buildAcademicStatistics(state: WebAcademicState): AcademicStatistics {
  const papers = Object.values(state.papers);
  const collections = Object.values(state.collections);
  const annotations = Object.values(state.annotations).flat();

  const papersByStatus: AcademicStatistics['papersByStatus'] = {
    unread: 0,
    reading: 0,
    completed: 0,
    archived: 0,
  };
  const papersByProvider = Object.keys(DEFAULT_ACADEMIC_PROVIDERS).reduce(
    (acc, providerId) => {
      acc[providerId as AcademicProviderType] = 0;
      return acc;
    },
    {} as AcademicStatistics['papersByProvider']
  );
  const papersByYear: Record<number, number> = {};
  const papersByCategory: Record<string, number> = {};
  const authorCounter: Record<string, number> = {};
  const venueCounter: Record<string, number> = {};
  const keywordCounter: Record<string, number> = {};

  for (const paper of papers) {
    papersByStatus[paper.readingStatus] += 1;
    papersByProvider[paper.providerId] = (papersByProvider[paper.providerId] ?? 0) + 1;
    if (paper.year) {
      papersByYear[paper.year] = (papersByYear[paper.year] ?? 0) + 1;
    }
    for (const category of paper.categories ?? []) {
      papersByCategory[category] = (papersByCategory[category] ?? 0) + 1;
    }
    for (const author of paper.authors) {
      authorCounter[author.name] = (authorCounter[author.name] ?? 0) + 1;
    }
    if (paper.venue) {
      venueCounter[paper.venue] = (venueCounter[paper.venue] ?? 0) + 1;
    }
    for (const keyword of paper.keywords ?? []) {
      keywordCounter[keyword] = (keywordCounter[keyword] ?? 0) + 1;
    }
  }

  return {
    totalPapers: papers.length,
    totalCollections: collections.length,
    totalAnnotations: annotations.length,
    totalNotes: papers.reduce((count, paper) => count + (paper.notes?.length ?? 0), 0),
    papersByStatus,
    papersByProvider,
    papersByYear,
    papersByCategory,
    readingStreak: 0,
    papersReadThisWeek: 0,
    papersReadThisMonth: 0,
    averageReadingTime: undefined,
    topAuthors: Object.entries(authorCounter)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count })),
    topVenues: Object.entries(venueCounter)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count })),
    topKeywords: Object.entries(keywordCounter)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword, count]) => ({ keyword, count })),
    lastUpdated: new Date(),
  };
}

function formatExportData(
  papers: LibraryPaper[],
  format: string
): { data: string; filename: string } {
  if (format === 'json') {
    return {
      data: JSON.stringify(papers, null, 2),
      filename: `academic-export-${Date.now()}.json`,
    };
  }

  if (format === 'csv') {
    const header = 'Title,Authors,Year,Venue,DOI,Status';
    const rows = papers.map((paper) => {
      const authors = paper.authors.map((author) => author.name).join('; ');
      return [
        `"${paper.title.replace(/"/g, '""')}"`,
        `"${authors.replace(/"/g, '""')}"`,
        paper.year ?? '',
        `"${(paper.venue ?? '').replace(/"/g, '""')}"`,
        paper.metadata?.doi ?? '',
        paper.readingStatus,
      ].join(',');
    });
    return {
      data: [header, ...rows].join('\n'),
      filename: `academic-export-${Date.now()}.csv`,
    };
  }

  if (format === 'markdown') {
    const sections = papers.map((paper) => {
      const authors = paper.authors.map((author) => author.name).join(', ');
      return [
        `## ${paper.title}`,
        `- Authors: ${authors || 'Unknown'}`,
        paper.year ? `- Year: ${paper.year}` : null,
        paper.venue ? `- Venue: ${paper.venue}` : null,
        paper.metadata?.doi ? `- DOI: ${paper.metadata.doi}` : null,
        paper.abstract ? `\n${paper.abstract}` : null,
      ]
        .filter(Boolean)
        .join('\n');
    });
    return {
      data: ['# Academic Export', ...sections].join('\n\n'),
      filename: `academic-export-${Date.now()}.md`,
    };
  }

  const bibtex = papers
    .map((paper) => {
      const id = paper.externalId || paper.id;
      const authors = paper.authors.map((author) => author.name).join(' and ');
      return [
        `@article{${id},`,
        `  title = {${paper.title}},`,
        authors ? `  author = {${authors}},` : null,
        paper.year ? `  year = {${paper.year}},` : null,
        paper.venue ? `  journal = {${paper.venue}},` : null,
        paper.metadata?.doi ? `  doi = {${paper.metadata.doi}},` : null,
        '}',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');

  return {
    data: bibtex,
    filename: `academic-export-${Date.now()}.bib`,
  };
}

function requireWebSupported(command: string): never {
  throw createRuntimeError(
    `${command} is not available in Web runtime`,
    { code: UNSUPPORTED_IN_WEB }
  );
}

async function executeWebCommand<T>(command: string, rawArgs: JsonRecord): Promise<T> {
  const args = normalizePayload(rawArgs) as JsonRecord;
  const state = loadWebState();

  switch (command) {
    case 'academic_search': {
      const searchInput = parseSearchInput(args);
      const result = await executeAcademicSearch(searchInput);
      return {
        papers: result.papers,
        totalResults: result.totalResults,
        providerResults: result.providerResults,
        degradedProviders: result.degradedProviders ?? {},
        searchTime: result.searchTime,
        searchTimeMs: result.searchTime,
      } as T;
    }

    case 'academic_search_provider': {
      const providerId =
        (getField<string>(args, ['providerId', 'provider_id']) as AcademicProviderType) ??
        'arxiv';
      const query = getField<string>(args, ['query'], '') ?? '';
      const options = (args.options as JsonRecord | undefined) ?? {};
      const aggregate = await executeAcademicSearch({
        ...parseSearchInput({ query, options }),
        providers: [providerId],
      });
      return toSearchResult(providerId, aggregate) as T;
    }

    case 'academic_add_to_library': {
      const paper = (args.paper as Paper | undefined);
      if (!paper) {
        throw createRuntimeError('Missing paper payload');
      }
      const collectionId = getField<string>(args, ['collectionId', 'collection_id']);
      const libraryPaper = createLibraryPaper(paper, collectionId);
      state.papers[libraryPaper.id] = libraryPaper;
      if (collectionId && state.collections[collectionId]) {
        const collection = state.collections[collectionId];
        if (!collection.paperIds.includes(libraryPaper.id)) {
          collection.paperIds = [...collection.paperIds, libraryPaper.id];
          collection.updatedAt = new Date();
        }
      }
      saveWebState(state);
      return libraryPaper as T;
    }

    case 'academic_remove_from_library': {
      const paperId = getField<string>(args, ['paperId', 'paper_id']);
      if (!paperId) {
        throw createRuntimeError('Missing paperId');
      }
      delete state.papers[paperId];
      delete state.annotations[paperId];
      delete state.pdfPaths[paperId];
      for (const collection of Object.values(state.collections)) {
        collection.paperIds = collection.paperIds.filter((id) => id !== paperId);
      }
      saveWebState(state);
      return undefined as T;
    }

    case 'academic_get_library_papers': {
      const filter = (getField<JsonRecord>(args, ['filter']) ?? null) as JsonRecord | null;
      let papers = Object.values(state.papers);
      if (filter) {
        const query = getField<string>(filter, ['query']);
        if (query) {
          const lowered = query.toLowerCase();
          papers = papers.filter(
            (paper) =>
              paper.title.toLowerCase().includes(lowered) ||
              paper.authors.some((author) => author.name.toLowerCase().includes(lowered))
          );
        }
        const readingStatus = getField<string>(filter, ['readingStatus', 'reading_status']);
        if (readingStatus) {
          papers = papers.filter((paper) => paper.readingStatus === readingStatus);
        }
      }
      return papers as T;
    }

    case 'academic_update_paper': {
      const paperId = getField<string>(args, ['paperId', 'paper_id']);
      const updates = (getField<JsonRecord>(args, ['updates']) ?? {}) as Partial<LibraryPaper>;
      if (!paperId) {
        throw createRuntimeError('Missing paperId');
      }
      const existing = state.papers[paperId];
      if (!existing) {
        throw createRuntimeError(`Paper '${paperId}' not found`);
      }
      const updated: LibraryPaper = {
        ...existing,
        ...updates,
        updatedAt: new Date(),
      };
      state.papers[paperId] = updated;
      saveWebState(state);
      return updated as T;
    }

    case 'academic_get_paper_by_id': {
      const paperId = getField<string>(args, ['paperId', 'paper_id']);
      return (paperId ? (state.papers[paperId] ?? null) : null) as T;
    }

    case 'academic_create_collection': {
      const name = getField<string>(args, ['name']);
      if (!name) {
        throw createRuntimeError('Collection name is required');
      }
      const collection: PaperCollection = {
        id: randomId('collection'),
        name,
        description: getField<string>(args, ['description']),
        color: getField<string>(args, ['color']),
        icon: undefined,
        parentId: getField<string>(args, ['parentId', 'parent_id']),
        paperIds: [],
        isSmartCollection: false,
        smartFilter: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      state.collections[collection.id] = collection;
      saveWebState(state);
      return collection as T;
    }

    case 'academic_update_collection': {
      const collectionId = getField<string>(args, ['collectionId', 'collection_id']);
      const updates = (getField<JsonRecord>(args, ['updates']) ?? {}) as Partial<PaperCollection>;
      if (!collectionId || !state.collections[collectionId]) {
        throw createRuntimeError(`Collection '${collectionId}' not found`);
      }
      const updated = {
        ...state.collections[collectionId],
        ...updates,
        updatedAt: new Date(),
      };
      state.collections[collectionId] = updated;
      saveWebState(state);
      return updated as T;
    }

    case 'academic_delete_collection': {
      const collectionId = getField<string>(args, ['collectionId', 'collection_id']);
      if (!collectionId) {
        throw createRuntimeError('Missing collectionId');
      }
      delete state.collections[collectionId];
      for (const paper of Object.values(state.papers)) {
        paper.collections = (paper.collections ?? []).filter((id) => id !== collectionId);
      }
      saveWebState(state);
      return undefined as T;
    }

    case 'academic_get_collections':
      return Object.values(state.collections) as T;

    case 'academic_add_paper_to_collection': {
      const paperId = getField<string>(args, ['paperId', 'paper_id']);
      const collectionId = getField<string>(args, ['collectionId', 'collection_id']);
      if (!paperId || !collectionId) {
        throw createRuntimeError('paperId and collectionId are required');
      }
      const collection = state.collections[collectionId];
      const paper = state.papers[paperId];
      if (!collection || !paper) {
        throw createRuntimeError('Collection or paper not found');
      }
      if (!collection.paperIds.includes(paperId)) {
        collection.paperIds = [...collection.paperIds, paperId];
        collection.updatedAt = new Date();
      }
      const paperCollections = paper.collections ?? [];
      if (!paperCollections.includes(collectionId)) {
        paper.collections = [...paperCollections, collectionId];
      }
      saveWebState(state);
      return undefined as T;
    }

    case 'academic_remove_paper_from_collection': {
      const paperId = getField<string>(args, ['paperId', 'paper_id']);
      const collectionId = getField<string>(args, ['collectionId', 'collection_id']);
      if (!paperId || !collectionId) {
        throw createRuntimeError('paperId and collectionId are required');
      }
      const collection = state.collections[collectionId];
      const paper = state.papers[paperId];
      if (!collection || !paper) {
        throw createRuntimeError('Collection or paper not found');
      }
      collection.paperIds = collection.paperIds.filter((id) => id !== paperId);
      collection.updatedAt = new Date();
      paper.collections = (paper.collections ?? []).filter((id) => id !== collectionId);
      saveWebState(state);
      return undefined as T;
    }

    case 'academic_add_annotation': {
      const paperId = getField<string>(args, ['paperId', 'paper_id']);
      const annotation = (getField<JsonRecord>(args, ['annotation']) ?? {}) as JsonRecord;
      if (!paperId) {
        throw createRuntimeError('Missing paperId');
      }
      const now = new Date();
      const created: PaperAnnotation = {
        id: randomId('annotation'),
        paperId,
        type:
          (getField<PaperAnnotation['type']>(annotation, ['type']) as PaperAnnotation['type']) ??
          'note',
        content: getField<string>(annotation, ['content'], '') ?? '',
        pageNumber: getField<number>(annotation, ['pageNumber', 'page_number']),
        position: getField<PaperAnnotation['position']>(annotation, ['position']),
        color: getField<string>(annotation, ['color']),
        createdAt: now,
        updatedAt: now,
      };
      state.annotations[paperId] = [...(state.annotations[paperId] ?? []), created];
      saveWebState(state);
      return created as T;
    }

    case 'academic_update_annotation': {
      const annotationId = getField<string>(args, ['annotationId', 'annotation_id']);
      const updates = (getField<JsonRecord>(args, ['updates']) ?? {}) as Partial<PaperAnnotation>;
      if (!annotationId) {
        throw createRuntimeError('Missing annotationId');
      }
      for (const paperId of Object.keys(state.annotations)) {
        const index = state.annotations[paperId].findIndex((item) => item.id === annotationId);
        if (index >= 0) {
          const updated: PaperAnnotation = {
            ...state.annotations[paperId][index],
            ...updates,
            updatedAt: new Date(),
          };
          state.annotations[paperId][index] = updated;
          saveWebState(state);
          return updated as T;
        }
      }
      throw createRuntimeError(`Annotation '${annotationId}' not found`);
    }

    case 'academic_delete_annotation': {
      const annotationId = getField<string>(args, ['annotationId', 'annotation_id']);
      if (!annotationId) {
        throw createRuntimeError('Missing annotationId');
      }
      for (const paperId of Object.keys(state.annotations)) {
        state.annotations[paperId] = state.annotations[paperId].filter(
          (annotation) => annotation.id !== annotationId
        );
      }
      saveWebState(state);
      return undefined as T;
    }

    case 'academic_get_annotations': {
      const paperId = getField<string>(args, ['paperId', 'paper_id']);
      return (paperId ? state.annotations[paperId] ?? [] : []) as T;
    }

    case 'academic_get_citations':
    case 'academic_get_references': {
      const providerId =
        (getField<string>(args, ['providerId', 'provider_id']) as AcademicProviderType) ??
        'semantic-scholar';
      const paperId = getField<string>(args, ['paperId', 'paper_id']);
      const paper = paperId ? state.papers[paperId] : undefined;
      if (!paper) {
        return [] as T;
      }
      const aggregate = await executeAcademicSearch({
        query: paper.title,
        providers: [providerId],
        maxResults: Math.min(getField<number>(args, ['limit'], 10) ?? 10, 20),
        sortBy: 'relevance',
        openAccessOnly: false,
      });
      return aggregate.papers as T;
    }

    case 'academic_download_pdf': {
      const paperId = getField<string>(args, ['paperId', 'paper_id']);
      const pdfUrl = getField<string>(args, ['pdfUrl', 'pdf_url']);
      if (!paperId || !pdfUrl) {
        throw createRuntimeError('paperId and pdfUrl are required');
      }
      state.pdfPaths[paperId] = pdfUrl;
      const paper = state.papers[paperId];
      if (paper) {
        paper.localPdfPath = pdfUrl;
        paper.hasCachedPdf = true;
      }
      saveWebState(state);
      return pdfUrl as T;
    }

    case 'academic_get_pdf_path': {
      const paperId = getField<string>(args, ['paperId', 'paper_id']);
      return (paperId ? state.pdfPaths[paperId] ?? null : null) as T;
    }

    case 'academic_delete_pdf': {
      const paperId = getField<string>(args, ['paperId', 'paper_id']);
      if (!paperId) {
        throw createRuntimeError('Missing paperId');
      }
      delete state.pdfPaths[paperId];
      const paper = state.papers[paperId];
      if (paper) {
        paper.localPdfPath = undefined;
        paper.hasCachedPdf = false;
      }
      saveWebState(state);
      return undefined as T;
    }

    case 'academic_get_providers': {
      const providers = (
        Object.keys(DEFAULT_ACADEMIC_PROVIDERS) as AcademicProviderType[]
      ).map((providerId) => getProviderConfigForWeb(providerId));
      return providers as T;
    }

    case 'academic_set_provider_api_key': {
      const providerId =
        (getField<string>(args, ['providerId', 'provider_id']) as AcademicProviderType) ??
        undefined;
      if (!providerId || !(providerId in DEFAULT_ACADEMIC_PROVIDERS)) {
        throw createRuntimeError(`Unknown provider '${providerId}'`);
      }
      state.providers[providerId] = {
        ...state.providers[providerId],
        apiKey: getField<string | null>(args, ['apiKey', 'api_key']) ?? null,
      };
      saveWebState(state);
      return undefined as T;
    }

    case 'academic_set_provider_enabled': {
      const providerId =
        (getField<string>(args, ['providerId', 'provider_id']) as AcademicProviderType) ??
        undefined;
      if (!providerId || !(providerId in DEFAULT_ACADEMIC_PROVIDERS)) {
        throw createRuntimeError(`Unknown provider '${providerId}'`);
      }
      state.providers[providerId] = {
        ...state.providers[providerId],
        enabled: Boolean(getField<boolean>(args, ['enabled'])),
      };
      saveWebState(state);
      return undefined as T;
    }

    case 'academic_test_provider': {
      const providerId =
        (getField<string>(args, ['providerId', 'provider_id']) as AcademicProviderType) ??
        undefined;
      if (!providerId || !(providerId in DEFAULT_ACADEMIC_PROVIDERS)) {
        return false as T;
      }
      const providerConfig = getProviderConfigForWeb(providerId);
      if (!providerConfig.enabled) {
        return false as T;
      }
      if (providerConfig.providerId === 'core' || providerConfig.providerId === 'openalex') {
        return Boolean(providerConfig.apiKey) as T;
      }
      if (providerConfig.providerId === 'unpaywall') {
        return Boolean(providerConfig.apiKey) as T;
      }
      return true as T;
    }

    case 'academic_import_papers': {
      const data = getField<string>(args, ['data'], '') ?? '';
      const format = (getField<string>(args, ['format'], 'json') ?? 'json').toLowerCase();
      const options = (getField<JsonRecord>(args, ['options']) ?? {}) as JsonRecord;

      if (format !== 'json') {
        return {
          imported: 0,
          skipped: 0,
          failed: 1,
          errors: [`Format '${format}' is not supported in Web runtime`],
          papers: [],
        } as T;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(data);
      } catch {
        return {
          imported: 0,
          skipped: 0,
          failed: 1,
          errors: ['Invalid JSON payload'],
          papers: [],
        } as T;
      }

      const incomingPapers = Array.isArray(parsed)
        ? (parsed as Paper[])
        : Array.isArray((parsed as { papers?: Paper[] })?.papers)
          ? ((parsed as { papers: Paper[] }).papers ?? [])
          : [];

      const mergeStrategy = getField<string>(options, ['mergeStrategy', 'merge_strategy'], 'skip');
      const imported: LibraryPaper[] = [];
      let skipped = 0;

      for (const paper of incomingPapers) {
        const existing = state.papers[paper.id];
        if (existing && mergeStrategy === 'skip') {
          skipped += 1;
          continue;
        }
        const libraryPaper = existing
          ? { ...existing, ...paper, updatedAt: new Date() }
          : createLibraryPaper(paper, getField<string>(options, ['targetCollection', 'target_collection']));
        state.papers[libraryPaper.id] = libraryPaper;
        imported.push(libraryPaper);
      }

      saveWebState(state);
      const result: ImportResult = {
        imported: imported.length,
        skipped,
        failed: 0,
        errors: [],
        papers: imported,
      };
      return result as T;
    }

    case 'academic_export_papers': {
      const paperIds = getField<string[]>(args, ['paperIds', 'paper_ids']);
      const collectionId = getField<string>(args, ['collectionId', 'collection_id']);
      const format = (getField<string>(args, ['format'], 'bibtex') ?? 'bibtex').toLowerCase();

      const sourcePapers = Object.values(state.papers);
      const selected = sourcePapers.filter((paper) => {
        if (paperIds && paperIds.length > 0) {
          return paperIds.includes(paper.id);
        }
        if (collectionId) {
          return (paper.collections ?? []).includes(collectionId);
        }
        return true;
      });
      const { data, filename } = formatExportData(selected, format);
      const result: AcademicExportResult = {
        success: true,
        data,
        filename,
        paperCount: selected.length,
      };
      return result as T;
    }

    case 'academic_get_statistics':
      return buildAcademicStatistics(state) as T;

    case 'academic_extract_pdf_content':
    case 'academic_generate_knowledge_map':
    case 'academic_generate_knowledge_map_from_content':
    case 'academic_generate_mind_map':
    case 'academic_generate_mind_map_from_content':
      return requireWebSupported(command);

    default:
      return requireWebSupported(command);
  }
}

function normalizeRuntimeError(error: unknown): RuntimeErrorLike {
  if (error instanceof Error) {
    return error as RuntimeErrorLike;
  }
  return createRuntimeError(typeof error === 'string' ? error : 'Unknown academic runtime error');
}

export async function academicRuntimeInvoke<T>(
  command: string,
  args: JsonRecord = {}
): Promise<T> {
  const allowInvokeInTests =
    typeof process !== 'undefined' &&
    process.env.NODE_ENV === 'test';
  const hasArgs = Object.keys(args).length > 0;

  if (isTauri() || allowInvokeInTests) {
    try {
      const response = hasArgs
        ? await invoke<T>(command, args)
        : await invoke<T>(command);
      return normalizePayload(response);
    } catch (error) {
      if (isTauri() || allowInvokeInTests) {
        throw normalizeRuntimeError(error);
      }
    }
  }

  try {
    return await executeWebCommand<T>(command, args);
  } catch (error) {
    throw normalizeRuntimeError(error);
  }
}

export const academicRuntime = {
  invoke: academicRuntimeInvoke,
};

export default academicRuntime;
