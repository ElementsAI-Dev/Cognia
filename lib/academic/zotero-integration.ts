/**
 * Zotero Integration
 * Provides integration with Zotero reference manager for citation management
 */

import type { Paper, PaperAuthor } from '@/types/academic';
import { proxyFetch } from '@/lib/network/proxy-fetch';
import { loggers } from '@/lib/logger';

const log = loggers.app;

// ============================================================================
// Types
// ============================================================================

export interface ZoteroConfig {
  apiKey: string;
  userId: string;
  libraryType: 'user' | 'group';
  libraryId: string;
  syncEnabled: boolean;
  autoSync: boolean;
  syncInterval: number; // minutes
}

export interface ZoteroCreator {
  creatorType: 'author' | 'editor' | 'translator' | 'contributor';
  firstName?: string;
  lastName?: string;
  name?: string; // For single-field names
}

export interface ZoteroItem {
  key: string;
  version: number;
  itemType: ZoteroItemType;
  title: string;
  creators: ZoteroCreator[];
  abstractNote?: string;
  date?: string;
  DOI?: string;
  ISBN?: string;
  ISSN?: string;
  url?: string;
  accessDate?: string;
  publicationTitle?: string;
  journalAbbreviation?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  place?: string;
  language?: string;
  archive?: string;
  archiveLocation?: string;
  callNumber?: string;
  rights?: string;
  extra?: string;
  tags: ZoteroTag[];
  collections: string[];
  relations: Record<string, string[]>;
  dateAdded: string;
  dateModified: string;
}

export type ZoteroItemType =
  | 'journalArticle'
  | 'book'
  | 'bookSection'
  | 'conferencePaper'
  | 'thesis'
  | 'report'
  | 'webpage'
  | 'patent'
  | 'manuscript'
  | 'presentation'
  | 'preprint'
  | 'document'
  | 'note'
  | 'attachment';

export interface ZoteroTag {
  tag: string;
  type?: number;
}

export interface ZoteroCollection {
  key: string;
  version: number;
  name: string;
  parentCollection: string | false;
}

export interface ZoteroSyncResult {
  success: boolean;
  itemsAdded: number;
  itemsUpdated: number;
  itemsDeleted: number;
  errors: string[];
  lastSyncTime: Date;
}

export interface ZoteroSearchOptions {
  query?: string;
  itemType?: ZoteroItemType | ZoteroItemType[];
  tag?: string | string[];
  collection?: string;
  sort?: 'dateAdded' | 'dateModified' | 'title' | 'creator' | 'date';
  direction?: 'asc' | 'desc';
  limit?: number;
  start?: number;
}

// ============================================================================
// Zotero API Client
// ============================================================================

const ZOTERO_API_BASE = 'https://api.zotero.org';

export class ZoteroClient {
  private config: ZoteroConfig;
  private lastSyncVersion: number = 0;

  constructor(config: ZoteroConfig) {
    this.config = config;
  }

  /**
   * Get the library URL prefix
   */
  private getLibraryPrefix(): string {
    if (this.config.libraryType === 'user') {
      return `/users/${this.config.userId}`;
    }
    return `/groups/${this.config.libraryId}`;
  }

  /**
   * Make an API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T; version: number }> {
    const url = `${ZOTERO_API_BASE}${this.getLibraryPrefix()}${endpoint}`;

    const response = await proxyFetch(url, {
      ...options,
      headers: {
        'Zotero-API-Key': this.config.apiKey,
        'Zotero-API-Version': '3',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Zotero API error: ${response.status} ${response.statusText}`);
    }

    const version = parseInt(response.headers.get('Last-Modified-Version') || '0', 10);
    const data = await response.json();

    return { data, version };
  }

  /**
   * Get all items in the library
   */
  async getItems(options: ZoteroSearchOptions = {}): Promise<ZoteroItem[]> {
    const params = new URLSearchParams();

    if (options.query) params.set('q', options.query);
    if (options.itemType) {
      const types = Array.isArray(options.itemType) ? options.itemType.join(',') : options.itemType;
      params.set('itemType', types);
    }
    if (options.tag) {
      const tags = Array.isArray(options.tag) ? options.tag.join(',') : options.tag;
      params.set('tag', tags);
    }
    if (options.collection) params.set('collection', options.collection);
    if (options.sort) params.set('sort', options.sort);
    if (options.direction) params.set('direction', options.direction);
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.start) params.set('start', options.start.toString());

    const { data, version } = await this.request<ZoteroItem[]>(`/items?${params}`);
    this.lastSyncVersion = version;

    return data;
  }

  /**
   * Get a single item by key
   */
  async getItem(key: string): Promise<ZoteroItem> {
    const { data } = await this.request<ZoteroItem>(`/items/${key}`);
    return data;
  }

  /**
   * Create new items
   */
  async createItems(items: Partial<ZoteroItem>[]): Promise<{ success: string[]; failed: string[] }> {
    const { data } = await this.request<{
      success: Record<string, string>;
      failed: Record<string, { code: number; message: string }>;
    }>('/items', {
      method: 'POST',
      body: JSON.stringify(items),
    });

    return {
      success: Object.values(data.success),
      failed: Object.keys(data.failed),
    };
  }

  /**
   * Update existing items
   */
  async updateItems(items: ZoteroItem[]): Promise<{ success: string[]; failed: string[] }> {
    const { data } = await this.request<{
      success: Record<string, string>;
      failed: Record<string, { code: number; message: string }>;
    }>('/items', {
      method: 'POST',
      body: JSON.stringify(items),
    });

    return {
      success: Object.values(data.success),
      failed: Object.keys(data.failed),
    };
  }

  /**
   * Delete items
   */
  async deleteItems(keys: string[]): Promise<void> {
    await this.request(`/items?itemKey=${keys.join(',')}`, {
      method: 'DELETE',
      headers: {
        'If-Unmodified-Since-Version': this.lastSyncVersion.toString(),
      },
    });
  }

  /**
   * Get all collections
   */
  async getCollections(): Promise<ZoteroCollection[]> {
    const { data } = await this.request<ZoteroCollection[]>('/collections');
    return data;
  }

  /**
   * Get items in a collection
   */
  async getCollectionItems(collectionKey: string): Promise<ZoteroItem[]> {
    const { data } = await this.request<ZoteroItem[]>(`/collections/${collectionKey}/items`);
    return data;
  }

  /**
   * Search items
   */
  async searchItems(query: string, options: Omit<ZoteroSearchOptions, 'query'> = {}): Promise<ZoteroItem[]> {
    return this.getItems({ ...options, query });
  }

  /**
   * Get items modified since a specific version
   */
  async getModifiedItems(sinceVersion: number): Promise<ZoteroItem[]> {
    const { data } = await this.request<ZoteroItem[]>(`/items?since=${sinceVersion}`);
    return data;
  }

  /**
   * Get deleted items since a specific version
   */
  async getDeletedItems(sinceVersion: number): Promise<string[]> {
    const { data } = await this.request<{ items: string[] }>(`/deleted?since=${sinceVersion}`);
    return data.items;
  }

  /**
   * Get the current library version
   */
  async getLibraryVersion(): Promise<number> {
    const response = await proxyFetch(
      `${ZOTERO_API_BASE}${this.getLibraryPrefix()}/items?limit=1`,
      {
        method: 'HEAD',
        headers: {
          'Zotero-API-Key': this.config.apiKey,
          'Zotero-API-Version': '3',
        },
      }
    );

    return parseInt(response.headers.get('Last-Modified-Version') || '0', 10);
  }

  /**
   * Validate API key
   */
  async validateApiKey(): Promise<boolean> {
    try {
      await this.request('/items?limit=1');
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Convert Zotero item to Paper format
 */
export function zoteroItemToPaper(item: ZoteroItem): Paper {
  const authors: PaperAuthor[] = item.creators
    .filter((c) => c.creatorType === 'author')
    .map((c) => ({
      name: c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
    }));

  const year = item.date ? extractYear(item.date) : undefined;

  return {
    id: `zotero-${item.key}`,
    providerId: 'arxiv', // Default, would be determined by actual source
    externalId: item.key,
    title: item.title,
    abstract: item.abstractNote,
    authors,
    year,
    publicationDate: item.date,
    venue: item.publicationTitle,
    journal: item.publicationTitle,
    volume: item.volume,
    issue: item.issue,
    pages: item.pages,
    categories: item.tags.map((t) => t.tag),
    urls: item.url ? [{ url: item.url, type: 'html' as const, source: 'zotero' }] : [],
    metadata: {
      doi: item.DOI,
    },
    createdAt: new Date(item.dateAdded),
    updatedAt: new Date(item.dateModified),
    fetchedAt: new Date(),
  };
}

/**
 * Convert Paper to Zotero item format
 */
export function paperToZoteroItem(paper: Paper): Partial<ZoteroItem> {
  const creators: ZoteroCreator[] = paper.authors.map((a) => {
    const nameParts = a.name.split(' ');
    if (nameParts.length >= 2) {
      return {
        creatorType: 'author' as const,
        firstName: nameParts.slice(0, -1).join(' '),
        lastName: nameParts[nameParts.length - 1],
      };
    }
    return {
      creatorType: 'author' as const,
      name: a.name,
    };
  });

  return {
    itemType: 'journalArticle',
    title: paper.title,
    creators,
    abstractNote: paper.abstract,
    date: paper.year?.toString(),
    DOI: paper.metadata?.doi,
    publicationTitle: paper.venue || paper.journal,
    volume: paper.volume,
    issue: paper.issue,
    pages: paper.pages,
    url: paper.urls?.[0]?.url,
    tags: (paper.categories || []).map((c) => ({ tag: c })),
  };
}

/**
 * Extract year from date string
 */
function extractYear(dateStr: string): number | undefined {
  const match = dateStr.match(/\d{4}/);
  return match ? parseInt(match[0], 10) : undefined;
}

// ============================================================================
// Citation Key Generation
// ============================================================================

/**
 * Generate a citation key from a Zotero item
 */
export function generateCitationKey(item: ZoteroItem): string {
  const firstAuthor = item.creators.find((c) => c.creatorType === 'author');
  let authorPart = 'unknown';

  if (firstAuthor) {
    if (firstAuthor.lastName) {
      authorPart = firstAuthor.lastName.toLowerCase().replace(/\s+/g, '');
    } else if (firstAuthor.name) {
      const nameParts = firstAuthor.name.split(' ');
      authorPart = nameParts[nameParts.length - 1].toLowerCase().replace(/\s+/g, '');
    }
  }

  const year = item.date ? extractYear(item.date)?.toString() || '' : '';

  // Get first significant word from title
  const titleWords = item.title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => !['a', 'an', 'the', 'of', 'for', 'and', 'or', 'in', 'on', 'to'].includes(w));

  const titlePart = titleWords[0] || 'untitled';

  return `${authorPart}${year}${titlePart}`;
}

/**
 * Generate BibTeX from Zotero item
 */
export function zoteroItemToBibTeX(item: ZoteroItem): string {
  const key = generateCitationKey(item);
  const type = mapItemTypeToBibTeX(item.itemType);

  const fields: string[] = [];

  if (item.title) fields.push(`  title = {${escapeBibTeX(item.title)}}`);

  if (item.creators.length > 0) {
    const authors = item.creators
      .filter((c) => c.creatorType === 'author')
      .map((c) => {
        if (c.name) return c.name;
        return `${c.lastName || ''}, ${c.firstName || ''}`.trim();
      })
      .join(' and ');
    fields.push(`  author = {${escapeBibTeX(authors)}}`);
  }

  if (item.date) {
    const year = extractYear(item.date);
    if (year) fields.push(`  year = {${year}}`);
  }

  if (item.publicationTitle) fields.push(`  journal = {${escapeBibTeX(item.publicationTitle)}}`);
  if (item.volume) fields.push(`  volume = {${item.volume}}`);
  if (item.issue) fields.push(`  number = {${item.issue}}`);
  if (item.pages) fields.push(`  pages = {${item.pages}}`);
  if (item.publisher) fields.push(`  publisher = {${escapeBibTeX(item.publisher)}}`);
  if (item.DOI) fields.push(`  doi = {${item.DOI}}`);
  if (item.url) fields.push(`  url = {${item.url}}`);
  if (item.abstractNote) fields.push(`  abstract = {${escapeBibTeX(item.abstractNote)}}`);

  return `@${type}{${key},\n${fields.join(',\n')}\n}`;
}

/**
 * Map Zotero item type to BibTeX entry type
 */
function mapItemTypeToBibTeX(itemType: ZoteroItemType): string {
  const mapping: Record<ZoteroItemType, string> = {
    journalArticle: 'article',
    book: 'book',
    bookSection: 'incollection',
    conferencePaper: 'inproceedings',
    thesis: 'phdthesis',
    report: 'techreport',
    webpage: 'misc',
    patent: 'misc',
    manuscript: 'unpublished',
    presentation: 'misc',
    preprint: 'misc',
    document: 'misc',
    note: 'misc',
    attachment: 'misc',
  };

  return mapping[itemType] || 'misc';
}

/**
 * Escape special characters for BibTeX
 */
function escapeBibTeX(text: string): string {
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/[&%$#_{}]/g, (match) => `\\${match}`)
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

// ============================================================================
// Sync Service
// ============================================================================

export class ZoteroSyncService {
  private client: ZoteroClient;
  private lastSyncVersion: number = 0;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor(config: ZoteroConfig) {
    this.client = new ZoteroClient(config);
  }

  /**
   * Perform a full sync
   */
  async fullSync(): Promise<ZoteroSyncResult> {
    const result: ZoteroSyncResult = {
      success: false,
      itemsAdded: 0,
      itemsUpdated: 0,
      itemsDeleted: 0,
      errors: [],
      lastSyncTime: new Date(),
    };

    try {
      const items = await this.client.getItems();
      result.itemsAdded = items.length;
      result.success = true;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * Perform an incremental sync
   */
  async incrementalSync(): Promise<ZoteroSyncResult> {
    const result: ZoteroSyncResult = {
      success: false,
      itemsAdded: 0,
      itemsUpdated: 0,
      itemsDeleted: 0,
      errors: [],
      lastSyncTime: new Date(),
    };

    try {
      const currentVersion = await this.client.getLibraryVersion();

      if (currentVersion === this.lastSyncVersion) {
        result.success = true;
        return result;
      }

      // Get modified items
      const modifiedItems = await this.client.getModifiedItems(this.lastSyncVersion);
      result.itemsUpdated = modifiedItems.length;

      // Get deleted items
      const deletedKeys = await this.client.getDeletedItems(this.lastSyncVersion);
      result.itemsDeleted = deletedKeys.length;

      this.lastSyncVersion = currentVersion;
      result.success = true;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * Start automatic sync
   */
  startAutoSync(intervalMinutes: number = 5): void {
    this.stopAutoSync();

    this.syncInterval = setInterval(
      () => {
        this.incrementalSync().catch((err) => log.error('Incremental sync failed', err as Error));
      },
      intervalMinutes * 60 * 1000
    );
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Get the Zotero client
   */
  getClient(): ZoteroClient {
    return this.client;
  }
}

// ============================================================================
// Export
// ============================================================================

const zoteroIntegrationApi = {
  ZoteroClient,
  ZoteroSyncService,
  zoteroItemToPaper,
  paperToZoteroItem,
  generateCitationKey,
  zoteroItemToBibTeX,
};

export default zoteroIntegrationApi;
