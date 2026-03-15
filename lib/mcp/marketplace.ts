/**
 * MCP Marketplace API functions
 * Handles fetching and downloading MCP servers from multiple marketplaces
 * Supports: Cline, Smithery, Glama
 */

import type {
  McpMarketplaceCatalog,
  McpMarketplaceItem,
  McpDownloadResponse,
  McpMarketplaceFilters,
  McpMarketplaceSource,
  McpMarketplaceErrorCategory,
  McpMarketplaceSourceHealth,
  McpRemoteMarketplaceSource,
  McpConnectionConfig,
  SmitheryServer,
  SmitheryResponse,
  GlamaServer,
  GlamaResponse,
} from '@/types/mcp/mcp-marketplace';

/** API Base URLs */
const API_URLS = {
  cline: 'https://core-api.staging.int.cline.bot/v1/mcp',
  smithery: 'https://registry.smithery.ai',
  glama: 'https://glama.ai/api/mcp',
};

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT = 15000;

/** Maximum retry attempts */
const MAX_RETRIES = 3;

/** Base delay for exponential backoff (ms) */
const BASE_RETRY_DELAY = 1000;

/** User agent for API requests */
const USER_AGENT = 'cognia-app';

interface SmitheryDetailResponse {
  qualifiedName: string;
  displayName?: string;
  description?: string;
  homepage?: string;
  readme?: string;
  remote?: boolean;
  connections?: Array<{
    type?: string;
    command?: string;
    args?: string[];
    deploymentUrl?: string;
    url?: string;
    env?: Record<string, string>;
    configSchema?: Record<string, unknown>;
  }>;
  security?: {
    schemes?: Array<{
      type?: string;
      name?: string;
      env?: string;
    }>;
  } | null;
}

type McpConnectionType = 'stdio' | 'sse' | 'streamableHttp';

export interface McpInstallConfig {
  mode: 'automatic' | 'manual';
  derivedFrom: 'connection-config' | 'llms' | 'readme' | 'fallback';
  validationStatus: 'valid' | 'invalid';
  validationError?: string;
  command: string;
  args: string[];
  connectionType: McpConnectionType;
  url?: string;
  fallbackToSse?: boolean;
  envKeys?: string[];
  manualSteps?: string[];
}

interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
}

export function getMcpMarketplaceItemKey(
  source: McpMarketplaceSource,
  mcpId: string
): string {
  return `${source}:${mcpId}`;
}

function encodeQualifiedName(qualifiedName: string): string {
  return qualifiedName.split('/').map(encodeURIComponent).join('/');
}

function categorizeMarketplaceError(
  error: Error,
  status?: number
): McpMarketplaceErrorCategory {
  const message = error.message.toLowerCase();

  if (status === 401 || status === 403 || message.includes('unauthorized') || message.includes('forbidden')) {
    return 'auth';
  }
  if (message.includes('api key required') || message.includes('invalid api key')) {
    return 'auth';
  }
  if (status === 404 || message.includes('not found')) {
    return 'not_found';
  }
  if (status === 429 || message.includes('rate')) {
    return 'rate_limit';
  }
  if (
    error.name === 'AbortError' ||
    message.includes('timeout') ||
    message.includes('timed out')
  ) {
    return 'timeout';
  }
  if (
    message.includes('network') ||
    message.includes('fetch failed') ||
    message.includes('fetch') ||
    message.includes('econn')
  ) {
    return 'network';
  }
  if (status && status >= 500 && status < 600) {
    return 'server';
  }
  return 'unknown';
}

function createSourceHealth(
  source: McpRemoteMarketplaceSource,
  itemCount: number,
  error?: Error
): McpMarketplaceSourceHealth {
  if (!error) {
    return {
      source,
      status: itemCount === 0 ? 'empty' : 'ok',
      itemCount,
      retryable: false,
    };
  }

  const errorCategory = categorizeMarketplaceError(error);
  return {
    source,
    status: 'error',
    itemCount,
    retryable:
      errorCategory === 'network' ||
      errorCategory === 'timeout' ||
      errorCategory === 'rate_limit' ||
      errorCategory === 'server',
    errorCategory,
    errorMessage: error.message,
  };
}

function withItemKey(
  source: McpRemoteMarketplaceSource,
  item: Omit<McpMarketplaceItem, 'source' | 'itemKey'>
): McpMarketplaceItem {
  return {
    ...item,
    source,
    itemKey: getMcpMarketplaceItemKey(source, item.mcpId),
  };
}

function buildCatalog(
  source: McpMarketplaceSource,
  items: McpMarketplaceItem[],
  sourceHealth?: Partial<Record<McpRemoteMarketplaceSource, McpMarketplaceSourceHealth>>,
  pagination?: Pick<McpMarketplaceCatalog, 'page' | 'pageSize' | 'totalCount'>
): McpMarketplaceCatalog {
  return {
    items,
    source,
    totalCount: pagination?.totalCount ?? items.length,
    page: pagination?.page,
    pageSize: pagination?.pageSize,
    sourceHealth,
  };
}

function baseDetail(item: McpMarketplaceItem): McpDownloadResponse {
  return {
    itemKey: item.itemKey || getMcpMarketplaceItemKey(item.source, item.mcpId),
    source: item.source as McpRemoteMarketplaceSource,
    mcpId: item.mcpId,
    githubUrl: item.githubUrl || '',
    name: item.name || '',
    author: item.author || '',
    description: item.description || '',
    readmeContent: '',
    requiresApiKey: Boolean(item.requiresApiKey),
    homepage: item.homepage,
    connectionConfig: item.connectionConfig,
  };
}

function dedupeStrings(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function extractEnvKeysFromSecurity(security?: SmitheryDetailResponse['security']): string[] {
  if (!security?.schemes) return [];
  return security.schemes
    .map((scheme) => scheme.name || scheme.env || '')
    .filter((value): value is string => value.length > 0);
}

function extractEnvKeysFromConfigSchema(schema?: Record<string, unknown>): string[] {
  if (!schema || typeof schema !== 'object') return [];
  const properties =
    typeof schema.properties === 'object'
      ? (schema.properties as Record<string, unknown>)
      : undefined;
  if (!properties) return [];
  return Object.keys(properties).filter((key) => /[A-Z]/.test(key) || key.includes('_'));
}

function normalizeSmitheryConnection(
  connection?: NonNullable<SmitheryDetailResponse['connections']>[number]
): McpConnectionConfig | undefined {
  if (!connection) return undefined;

  if (connection.type === 'http') {
    return {
      type: 'http',
      url: connection.deploymentUrl || connection.url,
      configSchema: connection.configSchema,
      env: connection.env,
    };
  }

  if (connection.type === 'sse') {
    return {
      type: 'sse',
      url: connection.deploymentUrl || connection.url,
      configSchema: connection.configSchema,
      env: connection.env,
    };
  }

  if (connection.type === 'streamable-http') {
    return {
      type: 'streamable-http',
      url: connection.deploymentUrl || connection.url,
      configSchema: connection.configSchema,
      env: connection.env,
    };
  }

  if (connection.command) {
    return {
      type: 'stdio',
      command: connection.command,
      args: connection.args || [],
      configSchema: connection.configSchema,
      env: connection.env,
    };
  }

  return undefined;
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: Error, status?: number): boolean {
  const category = categorizeMarketplaceError(error, status);
  return category === 'network' || category === 'timeout' || category === 'rate_limit' || category === 'server';
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateRetryDelay(attempt: number): number {
  const exponentialDelay = BASE_RETRY_DELAY * Math.pow(2, attempt);
  const jitter = Math.random() * 1000;
  return Math.min(exponentialDelay + jitter, 10000); // Cap at 10 seconds
}

/**
 * Fetch with timeout and retry support
 */
async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeout = REQUEST_TIMEOUT, retries = MAX_RETRIES, ...fetchOptions } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Check for retryable HTTP errors
      if (!response.ok && isRetryableError(new Error(response.statusText), response.status)) {
        if (attempt < retries) {
          const delay = calculateRetryDelay(attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      if (attempt < retries && isRetryableError(lastError)) {
        const delay = calculateRetryDelay(attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

// =============================================================================
// CLINE MARKETPLACE API
// =============================================================================

/**
 * Fetch from Cline marketplace
 */
export async function fetchClineMarketplace(): Promise<McpMarketplaceCatalog> {
  try {
    const response = await fetchWithTimeout(`${API_URLS.cline}/marketplace`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new Error(`Cline API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || !Array.isArray(data)) {
      throw new Error('Invalid response from Cline marketplace API');
    }

    const items: McpMarketplaceItem[] = data.map((item: Record<string, unknown>) =>
      withItemKey('cline', {
        mcpId: String(item.mcpId || ''),
        name: String(item.name || ''),
        author: String(item.author || ''),
        description: String(item.description || ''),
        githubUrl: String(item.githubUrl || ''),
        githubStars: Number(item.githubStars) || 0,
        downloadCount: Number(item.downloadCount) || 0,
        tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
        requiresApiKey: Boolean(item.requiresApiKey),
        iconUrl: item.iconUrl ? String(item.iconUrl) : undefined,
        updatedAt: item.updatedAt ? String(item.updatedAt) : undefined,
      })
    );

    return buildCatalog('cline', items, {
      cline: createSourceHealth('cline', items.length),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Cline request timed out');
    }
    throw error;
  }
}

// =============================================================================
// SMITHERY MARKETPLACE API
// =============================================================================

/**
 * Fetch from Smithery marketplace
 * Note: Smithery API requires an API key for full access
 */
export async function fetchSmitheryMarketplace(
  query?: string,
  page = 1,
  pageSize = 50,
  apiKey?: string
): Promise<McpMarketplaceCatalog> {
  try {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetchWithTimeout(
      `${API_URLS.smithery}/servers?${params.toString()}`,
      { method: 'GET', headers }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Smithery API key required or invalid');
      }
      throw new Error(`Smithery API error: ${response.statusText}`);
    }

    const data: SmitheryResponse = await response.json();

    const items: McpMarketplaceItem[] = (data.servers || []).map((server: SmitheryServer) =>
      withItemKey('smithery', {
        mcpId: server.qualifiedName,
        name: server.displayName,
        author: server.qualifiedName.split('/')[0] || 'Unknown',
        description: server.description || '',
        githubUrl: server.homepage || '',
        githubStars: 0,
        downloadCount: server.useCount || 0,
        tags: [],
        requiresApiKey: false,
        iconUrl: server.iconUrl,
        updatedAt: server.createdAt,
        verified: server.verified,
        remote: server.remote,
        homepage: server.homepage,
      })
    );

    return buildCatalog(
      'smithery',
      items,
      {
        smithery: createSourceHealth('smithery', items.length),
      },
      {
        totalCount: data.pagination?.totalCount,
        page: data.pagination?.currentPage,
        pageSize: data.pagination?.pageSize,
      }
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Smithery request timed out');
    }
    throw error;
  }
}

// =============================================================================
// GLAMA MARKETPLACE API
// =============================================================================

/**
 * Fetch from Glama marketplace
 */
export async function fetchGlamaMarketplace(
  query?: string,
  page = 1,
  pageSize = 50
): Promise<McpMarketplaceCatalog> {
  try {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    params.set('page', String(page));
    params.set('limit', String(pageSize));

    const response = await fetchWithTimeout(
      `${API_URLS.glama}/servers?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': USER_AGENT,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Glama API error: ${response.statusText}`);
    }

    const data: GlamaResponse = await response.json();

    const items: McpMarketplaceItem[] = (data.servers || []).map((server: GlamaServer) =>
      withItemKey('glama', {
        mcpId: server.id || server.name,
        name: server.name,
        author: server.author || 'Unknown',
        description: server.description || '',
        githubUrl: server.repository || server.homepage || '',
        githubStars: server.stars || 0,
        downloadCount: server.weeklyDownloads || 0,
        tags: server.tags || [],
        requiresApiKey: false,
        iconUrl: server.iconUrl,
        updatedAt: server.updatedAt,
        verified: server.official,
        homepage: server.homepage,
      })
    );

    return buildCatalog(
      'glama',
      items,
      {
        glama: createSourceHealth('glama', items.length),
      },
      {
        totalCount: data.total,
        page: data.page,
        pageSize: data.pageSize,
      }
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Glama request timed out');
    }
    throw error;
  }
}

// =============================================================================
// UNIFIED MARKETPLACE API
// =============================================================================

/**
 * Fetch marketplace catalog from specified source(s)
 */
export async function fetchMcpMarketplace(
  source: McpMarketplaceSource = 'all',
  options?: {
    query?: string;
    page?: number;
    pageSize?: number;
    smitheryApiKey?: string;
  }
): Promise<McpMarketplaceCatalog> {
  const { query, page = 1, pageSize = 100, smitheryApiKey } = options || {};

  if (source === 'cline') {
    return fetchClineMarketplace();
  }

  if (source === 'smithery') {
    return fetchSmitheryMarketplace(query, page, pageSize, smitheryApiKey);
  }

  if (source === 'glama') {
    return fetchGlamaMarketplace(query, page, pageSize);
  }

  const results = await Promise.allSettled([
    fetchClineMarketplace(),
    fetchSmitheryMarketplace(query, page, Math.max(1, Math.floor(pageSize / 3)), smitheryApiKey),
    fetchGlamaMarketplace(query, page, Math.max(1, Math.floor(pageSize / 3))),
  ]);

  const sourceHealth: Partial<Record<McpRemoteMarketplaceSource, McpMarketplaceSourceHealth>> = {};
  const allItems: McpMarketplaceItem[] = [];
  const errors: string[] = [];
  const sources: McpRemoteMarketplaceSource[] = ['cline', 'smithery', 'glama'];

  results.forEach((result, index) => {
    const source = sources[index];
    if (result.status === 'fulfilled') {
      allItems.push(...result.value.items);
      sourceHealth[source] = createSourceHealth(source, result.value.items.length);
      return;
    }

    const error = result.reason instanceof Error ? result.reason : new Error(String(result.reason));
    sourceHealth[source] = createSourceHealth(source, 0, error);
    errors.push(error.message);
  });

  if (allItems.length === 0 && errors.length > 0) {
    throw new Error(`Failed to fetch from all sources: ${errors.join(', ')}`);
  }

  const seen = new Map<string, McpMarketplaceItem>();
  for (const item of allItems) {
    const key = item.mcpId.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, item);
    }
  }

  return buildCatalog('all', Array.from(seen.values()), sourceHealth, {
    totalCount: seen.size,
  });
}

/**
 * Fetch source-aware MCP marketplace detail data.
 */
function manualDetail(item: McpMarketplaceItem, reason?: string): McpDownloadResponse {
  const detail = baseDetail(item);
  return {
    ...detail,
    connectionConfig: {
      type: 'manual',
    },
    manualSteps: dedupeStrings([
      reason,
      detail.homepage ? `Visit ${detail.homepage} for setup instructions.` : undefined,
      detail.githubUrl ? `Review ${detail.githubUrl} for installation details.` : undefined,
    ]),
  };
}

async function fetchClineMarketplaceDetail(
  item: McpMarketplaceItem
): Promise<McpDownloadResponse> {
  const detail = baseDetail(item);

  try {
    const response = await fetchWithTimeout(`${API_URLS.cline}/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT,
      },
      body: JSON.stringify({ mcpId: item.mcpId }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          ...detail,
          error: 'MCP server not found in marketplace.',
          errorCategory: 'not_found',
        };
      }
      if (response.status === 500) {
        return {
          ...detail,
          error: 'Internal server error. Please try again later.',
          errorCategory: 'server',
        };
      }
      throw new Error(`Failed to download MCP: ${response.statusText}`);
    }

    const payload = await response.json();
    const raw =
      payload && typeof payload === 'object' && 'data' in payload && payload.data
        ? (payload.data as Record<string, unknown>)
        : (payload as Record<string, unknown>);

    if (!raw || typeof raw !== 'object') {
      return {
        ...detail,
        error: 'Invalid response from MCP marketplace API',
        errorCategory: 'server',
      };
    }

    if (!raw.githubUrl) {
      return {
        ...detail,
        error: 'Missing GitHub URL in MCP download response',
        errorCategory: 'server',
      };
    }

    return {
      ...detail,
      mcpId: String(raw.mcpId || item.mcpId),
      githubUrl: String(raw.githubUrl),
      name: String(raw.name || item.name || ''),
      author: String(raw.author || item.author || ''),
      description: String(raw.description || item.description || ''),
      readmeContent: String(raw.readmeContent || ''),
      llmsInstallationContent: raw.llmsInstallationContent
        ? String(raw.llmsInstallationContent)
        : undefined,
      requiresApiKey: Boolean(raw.requiresApiKey ?? item.requiresApiKey),
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return {
      ...detail,
      error:
        err.name === 'AbortError'
          ? 'Request timed out. Please try again.'
          : err.message || 'Failed to download MCP',
      errorCategory: categorizeMarketplaceError(err),
    };
  }
}

async function fetchSmitheryMarketplaceDetail(
  item: McpMarketplaceItem,
  apiKey?: string
): Promise<McpDownloadResponse> {
  const detail = baseDetail(item);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': USER_AGENT,
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetchWithTimeout(
    `${API_URLS.smithery}/servers/${encodeQualifiedName(item.mcpId)}`,
    {
      method: 'GET',
      headers,
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      return {
        ...detail,
        error: 'Smithery API key required or invalid',
        errorCategory: 'auth',
      };
    }

    return {
      ...detail,
      error: `Smithery detail unavailable: ${response.statusText}`,
      errorCategory: categorizeMarketplaceError(new Error(response.statusText), response.status),
    };
  }

  const payload: SmitheryDetailResponse = await response.json();
  const connectionConfig = normalizeSmitheryConnection(payload.connections?.[0]);
  const envKeys = dedupeStrings([
    ...extractEnvKeysFromSecurity(payload.security),
    ...extractEnvKeysFromConfigSchema(connectionConfig?.configSchema),
  ]);

  return {
    ...detail,
    githubUrl: payload.homepage || detail.githubUrl,
    homepage: payload.homepage || detail.homepage,
    name: payload.displayName || detail.name,
    description: payload.description || detail.description,
    readmeContent: payload.readme || payload.description || '',
    connectionConfig,
    envKeys,
    requiresApiKey: detail.requiresApiKey || envKeys.length > 0,
  };
}

async function fetchGlamaMarketplaceDetail(
  item: McpMarketplaceItem
): Promise<McpDownloadResponse> {
  return manualDetail(
    item,
    'Detailed installation metadata is unavailable for this Glama listing.'
  );
}

export async function fetchMcpMarketplaceDetail(
  item: McpMarketplaceItem,
  options?: { smitheryApiKey?: string }
): Promise<McpDownloadResponse> {
  switch (item.source) {
    case 'cline':
      return fetchClineMarketplaceDetail(item);
    case 'smithery':
      return fetchSmitheryMarketplaceDetail(item, options?.smitheryApiKey);
    case 'glama':
      return fetchGlamaMarketplaceDetail(item);
    default:
      return manualDetail(item, 'Marketplace detail is unavailable for this source.');
  }
}

/**
 * Legacy helper kept for compatibility with older call sites.
 */
export async function downloadMcpServer(mcpId: string): Promise<McpDownloadResponse> {
  if (!mcpId) {
    return {
      mcpId: '',
      githubUrl: '',
      name: '',
      author: '',
      description: '',
      readmeContent: '',
      requiresApiKey: false,
      error: 'MCP ID is required',
      errorCategory: 'unknown',
    };
  }

  return fetchClineMarketplaceDetail(
    withItemKey('cline', {
      mcpId,
      name: '',
      author: '',
      description: '',
      githubUrl: '',
      githubStars: 0,
      downloadCount: 0,
      tags: [],
      requiresApiKey: false,
    })
  );
}

/**
 * Filter and sort marketplace items
 * @param items - List of marketplace items
 * @param filters - Filter options
 * @returns Filtered and sorted items
 */
export function filterMarketplaceItems(
  items: McpMarketplaceItem[],
  filters: McpMarketplaceFilters
): McpMarketplaceItem[] {
  let filtered = [...items];

  // Filter by source
  if (filters.source && filters.source !== 'all') {
    filtered = filtered.filter((item) => item.source === filters.source);
  }

  // Filter by search query
  if (filters.search) {
    const query = filters.search.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.author.toLowerCase().includes(query) ||
        item.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  }

  // Filter by tags
  if (filters.tags.length > 0) {
    filtered = filtered.filter((item) =>
      filters.tags.some((tag) => item.tags.includes(tag))
    );
  }

  // Filter by API key requirement
  if (filters.requiresApiKey !== undefined) {
    filtered = filtered.filter(
      (item) => item.requiresApiKey === filters.requiresApiKey
    );
  }

  // Filter by verified status
  if (filters.verified !== undefined) {
    filtered = filtered.filter((item) => item.verified === filters.verified);
  }

  // Filter by remote hosting support
  if (filters.remote !== undefined) {
    filtered = filtered.filter((item) => item.remote === filters.remote);
  }

  // Sort
  switch (filters.sortBy) {
    case 'popular':
      filtered.sort((a, b) => b.downloadCount - a.downloadCount);
      break;
    case 'newest':
      filtered.sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      });
      break;
    case 'stars':
      filtered.sort((a, b) => b.githubStars - a.githubStars);
      break;
    case 'downloads':
      filtered.sort((a, b) => b.downloadCount - a.downloadCount);
      break;
    case 'name':
      filtered.sort((a, b) => a.name.localeCompare(b.name));
      break;
  }

  return filtered;
}

/**
 * Get all unique tags from marketplace items
 * @param items - List of marketplace items
 * @returns Sorted list of unique tags
 */
export function getUniqueTags(items: McpMarketplaceItem[]): string[] {
  const tagSet = new Set<string>();
  for (const item of items) {
    for (const tag of item.tags) {
      tagSet.add(tag);
    }
  }
  return Array.from(tagSet).sort();
}

/**
 * Format download count for display
 * @param count - Download count
 * @returns Formatted string
 */
export function formatDownloadCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

/**
 * Format GitHub stars for display
 * @param stars - Star count
 * @returns Formatted string
 */
export function formatStarCount(stars: number): string {
  if (stars >= 1000000) {
    return `${(stars / 1000000).toFixed(1)}M`;
  }
  if (stars >= 1000) {
    return `${(stars / 1000).toFixed(1)}K`;
  }
  return stars.toString();
}

/**
 * Format relative time for display
 * @param dateString - ISO date string
 * @returns Formatted relative time string
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  } catch {
    return dateString;
  }
}

function isLikelyPackageName(mcpId: string): boolean {
  return mcpId.startsWith('@') || !mcpId.includes('/');
}

function createInvalidInstallConfig(
  detail: McpDownloadResponse,
  reason: string
): McpInstallConfig {
  return {
    mode: 'manual',
    derivedFrom: 'fallback',
    validationStatus: 'invalid',
    validationError: reason,
    command: '',
    args: [],
    connectionType: 'stdio',
    envKeys: detail.envKeys || [],
    manualSteps: detail.manualSteps || dedupeStrings([
      detail.homepage ? `Visit ${detail.homepage} for installation instructions.` : undefined,
      detail.githubUrl ? `Review ${detail.githubUrl} for setup details.` : undefined,
    ]),
  };
}

function normalizeConnectionConfig(
  config: McpConnectionConfig,
  detail: McpDownloadResponse
): McpInstallConfig | null {
  const envKeys = dedupeStrings([
    ...(detail.envKeys || []),
    ...(config.env ? Object.keys(config.env) : []),
    ...extractEnvKeysFromConfigSchema(config.configSchema),
  ]);

  switch (config.type) {
    case 'http':
      if (!config.url) {
        return createInvalidInstallConfig(detail, 'Unable to derive install plan from marketplace metadata.');
      }
      return {
        mode: 'automatic',
        derivedFrom: 'connection-config',
        validationStatus: 'valid',
        command: '',
        args: [],
        connectionType: 'streamableHttp',
        url: config.url,
        fallbackToSse: true,
        envKeys,
      };
    case 'streamable-http':
      if (!config.url) {
        return createInvalidInstallConfig(detail, 'Unable to derive install plan from marketplace metadata.');
      }
      return {
        mode: 'automatic',
        derivedFrom: 'connection-config',
        validationStatus: 'valid',
        command: '',
        args: [],
        connectionType: 'streamableHttp',
        url: config.url,
        fallbackToSse: false,
        envKeys,
      };
    case 'sse':
      if (!config.url) {
        return createInvalidInstallConfig(detail, 'Unable to derive install plan from marketplace metadata.');
      }
      return {
        mode: 'automatic',
        derivedFrom: 'connection-config',
        validationStatus: 'valid',
        command: '',
        args: [],
        connectionType: 'sse',
        url: config.url,
        envKeys,
      };
    case 'stdio':
      if (!config.command) {
        return createInvalidInstallConfig(detail, 'Unable to derive install plan from marketplace metadata.');
      }
      return {
        mode: 'automatic',
        derivedFrom: 'connection-config',
        validationStatus: 'valid',
        command: config.command,
        args: config.args || [],
        connectionType: 'stdio',
        envKeys,
      };
    default:
      return null;
  }
}

export function parseInstallationConfig(
  item: McpMarketplaceItem,
  downloadDetails: McpDownloadResponse
): McpInstallConfig {
  const detail = {
    ...downloadDetails,
    source: downloadDetails.source || (item.source as McpRemoteMarketplaceSource),
    itemKey:
      downloadDetails.itemKey || item.itemKey || getMcpMarketplaceItemKey(item.source, item.mcpId),
  };

  const sourceConnectionConfig = detail.connectionConfig || item.connectionConfig;
  if (sourceConnectionConfig) {
    const normalized = normalizeConnectionConfig(sourceConnectionConfig, detail);
    if (normalized) {
      return normalized;
    }
  }

  if (detail.llmsInstallationContent) {
    const llmsConfig = parseLlmsInstallation(detail.llmsInstallationContent, detail);
    if (llmsConfig) {
      return llmsConfig;
    }
  }

  const envKeys = dedupeStrings([
    ...(detail.envKeys || []),
    ...extractEnvKeysFromText(detail.readmeContent || ''),
  ]);

  if (detail.githubUrl?.includes('modelcontextprotocol/servers')) {
    const serverName = item.mcpId.replace(/^@modelcontextprotocol\/server-/, '');
    return {
      mode: 'automatic',
      derivedFrom: 'fallback',
      validationStatus: 'valid',
      command: 'npx',
      args: ['-y', `@modelcontextprotocol/server-${serverName}`],
      connectionType: 'stdio',
      envKeys,
    };
  }

  if (detail.source === 'cline' && isLikelyPackageName(item.mcpId) && !item.remote) {
    return {
      mode: 'automatic',
      derivedFrom: 'fallback',
      validationStatus: 'valid',
      command: 'npx',
      args: ['-y', item.mcpId],
      connectionType: 'stdio',
      envKeys,
    };
  }

  return createInvalidInstallConfig(detail, 'Unable to derive install plan from marketplace metadata.');
}

function parseLlmsInstallation(
  content: string,
  detail: McpDownloadResponse
): McpInstallConfig | null {
  try {
    const jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]) as {
        command?: string;
        args?: string[];
        transportType?: string;
        url?: string;
        env?: Record<string, string>;
      };

      const envKeys = dedupeStrings([
        ...(detail.envKeys || []),
        ...(parsed.env ? Object.keys(parsed.env) : []),
      ]);

      if (parsed.transportType === 'sse' && parsed.url) {
        return {
          mode: 'automatic',
          derivedFrom: 'llms',
          validationStatus: 'valid',
          command: '',
          args: [],
          connectionType: 'sse',
          url: parsed.url,
          envKeys,
        };
      }

      if (
        (parsed.transportType === 'streamableHttp' ||
          parsed.transportType === 'streamable-http' ||
          parsed.transportType === 'http') &&
        parsed.url
      ) {
        return {
          mode: 'automatic',
          derivedFrom: 'llms',
          validationStatus: 'valid',
          command: '',
          args: [],
          connectionType: 'streamableHttp',
          url: parsed.url,
          fallbackToSse: parsed.transportType === 'http',
          envKeys,
        };
      }

      if (parsed.command) {
        return {
          mode: 'automatic',
          derivedFrom: 'llms',
          validationStatus: 'valid',
          command: parsed.command,
          args: parsed.args || [],
          connectionType: 'stdio',
          envKeys,
        };
      }
    }

    const cmdMatch = content.match(/command["\s:]+["']?(\w+)["']?/i);
    const argsMatch = content.match(/args["\s:]+\[([^\]]+)\]/i);

    if (cmdMatch) {
      const args = argsMatch
        ? argsMatch[1].split(',').map((segment) => segment.trim().replace(/["']/g, ''))
        : [];
      return {
        mode: 'automatic',
        derivedFrom: 'readme',
        validationStatus: 'valid',
        command: cmdMatch[1],
        args,
        connectionType: 'stdio',
        envKeys: detail.envKeys || [],
      };
    }

    return null;
  } catch {
    return null;
  }
}

function extractEnvKeysFromText(text: string): string[] {
  const envKeys = new Set<string>();
  const patterns = [
    /([A-Z][A-Z0-9_]{2,}_(?:KEY|TOKEN|SECRET|API_KEY|PASSWORD|CREDENTIAL))/g,
    /\$\{?([A-Z][A-Z0-9_]+)\}?/g,
    /process\.env\.([A-Z][A-Z0-9_]+)/g,
    /env\s*:\s*\{[^}]*["']([A-Z][A-Z0-9_]+)["']/g,
    /([A-Z][A-Z0-9_]*_API_KEY)/g,
  ];

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const key = match[1];
      if (key && key.length > 3 && !key.startsWith('NPM') && !key.startsWith('NODE')) {
        envKeys.add(key);
      }
    }
  }

  return Array.from(envKeys).slice(0, 10);
}
