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
  SmitheryServer,
  SmitheryResponse,
  GlamaServer,
  GlamaResponse,
} from '@/types/mcp-marketplace';

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

interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: Error, status?: number): boolean {
  const message = error.message.toLowerCase();
  // Retry on network errors
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('aborted') ||
    message.includes('fetch')
  ) {
    return true;
  }
  // Retry on 5xx server errors
  if (status && status >= 500 && status < 600) {
    return true;
  }
  // Retry on rate limiting
  if (status === 429) {
    return true;
  }
  return false;
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

    const items: McpMarketplaceItem[] = data.map((item: Record<string, unknown>) => ({
      mcpId: String(item.mcpId || ''),
      name: String(item.name || ''),
      author: String(item.author || ''),
      description: String(item.description || ''),
      githubUrl: String(item.githubUrl || ''),
      githubStars: Number(item.githubStars) || 0,
      downloadCount: Number(item.downloadCount) || 0,
      tags: Array.isArray(item.tags) ? item.tags : [],
      requiresApiKey: Boolean(item.requiresApiKey),
      iconUrl: item.iconUrl ? String(item.iconUrl) : undefined,
      updatedAt: item.updatedAt ? String(item.updatedAt) : undefined,
      source: 'cline' as const,
    }));

    return { items, source: 'cline' };
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

    const items: McpMarketplaceItem[] = (data.servers || []).map((server: SmitheryServer) => ({
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
      source: 'smithery' as const,
      verified: server.verified,
      remote: server.remote,
      homepage: server.homepage,
    }));

    return {
      items,
      source: 'smithery',
      totalCount: data.pagination?.totalCount,
      page: data.pagination?.currentPage,
      pageSize: data.pagination?.pageSize,
    };
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

    const items: McpMarketplaceItem[] = (data.servers || []).map((server: GlamaServer) => ({
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
      source: 'glama' as const,
      verified: server.official,
      homepage: server.homepage,
    }));

    return {
      items,
      source: 'glama',
      totalCount: data.total,
      page: data.page,
      pageSize: data.pageSize,
    };
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

  // Fetch from all sources in parallel
  const results = await Promise.allSettled([
    fetchClineMarketplace(),
    fetchSmitheryMarketplace(query, page, Math.floor(pageSize / 3), smitheryApiKey),
    fetchGlamaMarketplace(query, page, Math.floor(pageSize / 3)),
  ]);

  const allItems: McpMarketplaceItem[] = [];
  const errors: string[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value.items);
    } else {
      errors.push(result.reason?.message || 'Unknown error');
    }
  }

  // Deduplicate by mcpId (prefer Cline > Smithery > Glama)
  const seen = new Map<string, McpMarketplaceItem>();
  for (const item of allItems) {
    const key = item.mcpId.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, item);
    }
  }

  if (allItems.length === 0 && errors.length > 0) {
    throw new Error(`Failed to fetch from all sources: ${errors.join(', ')}`);
  }

  return {
    items: Array.from(seen.values()),
    source: 'all',
    totalCount: seen.size,
  };
}

/**
 * Download MCP server details from the marketplace
 * @param mcpId - The MCP server ID to download
 * @returns Promise with download response
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
    };
  }

  try {
    const response = await fetchWithTimeout(`${API_URLS.cline}/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT,
      },
      body: JSON.stringify({ mcpId }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          mcpId,
          githubUrl: '',
          name: '',
          author: '',
          description: '',
          readmeContent: '',
          requiresApiKey: false,
          error: 'MCP server not found in marketplace.',
        };
      }
      if (response.status === 500) {
        return {
          mcpId,
          githubUrl: '',
          name: '',
          author: '',
          description: '',
          readmeContent: '',
          requiresApiKey: false,
          error: 'Internal server error. Please try again later.',
        };
      }
      throw new Error(`Failed to download MCP: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data) {
      return {
        mcpId,
        githubUrl: '',
        name: '',
        author: '',
        description: '',
        readmeContent: '',
        requiresApiKey: false,
        error: 'Invalid response from MCP marketplace API',
      };
    }

    if (!data.githubUrl) {
      return {
        mcpId,
        githubUrl: '',
        name: '',
        author: '',
        description: '',
        readmeContent: '',
        requiresApiKey: false,
        error: 'Missing GitHub URL in MCP download response',
      };
    }

    return {
      mcpId: data.mcpId || mcpId,
      githubUrl: data.githubUrl,
      name: data.name || '',
      author: data.author || '',
      description: data.description || '',
      readmeContent: data.readmeContent || '',
      llmsInstallationContent: data.llmsInstallationContent,
      requiresApiKey: data.requiresApiKey || false,
    };
  } catch (error) {
    let errorMessage = 'Failed to download MCP';

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. Please try again.';
      } else {
        errorMessage = error.message;
      }
    }

    return {
      mcpId,
      githubUrl: '',
      name: '',
      author: '',
      description: '',
      readmeContent: '',
      requiresApiKey: false,
      error: errorMessage,
    };
  }
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

/**
 * Installation configuration parsed from MCP server details
 */
export interface McpInstallConfig {
  command: string;
  args: string[];
  connectionType: 'stdio' | 'sse';
  url?: string;
  envKeys?: string[];
}

/**
 * Parse installation configuration from MCP server item and download details
 * Attempts to extract command, args, and required env vars from readme or llms content
 */
export function parseInstallationConfig(
  item: McpMarketplaceItem,
  downloadDetails: McpDownloadResponse
): McpInstallConfig {
  const config: McpInstallConfig = {
    command: 'npx',
    args: ['-y', item.mcpId],
    connectionType: 'stdio',
  };

  // Check for SSE/remote connection config from item
  if (item.remote && item.connectionConfig) {
    if (item.connectionConfig.type === 'sse' || item.connectionConfig.type === 'streamable-http') {
      config.connectionType = 'sse';
      config.url = item.connectionConfig.url;
      config.command = '';
      config.args = [];
    } else if (item.connectionConfig.command) {
      config.command = item.connectionConfig.command;
      config.args = item.connectionConfig.args || [];
    }
    if (item.connectionConfig.env) {
      config.envKeys = Object.keys(item.connectionConfig.env);
    }
  }

  // Try to parse from llmsInstallationContent (most accurate)
  if (downloadDetails.llmsInstallationContent) {
    const llmsConfig = parseLlmsInstallation(downloadDetails.llmsInstallationContent);
    if (llmsConfig) {
      Object.assign(config, llmsConfig);
    }
  }

  // Try to extract env keys from readme if not already found
  if (!config.envKeys || config.envKeys.length === 0) {
    config.envKeys = extractEnvKeysFromText(downloadDetails.readmeContent || '');
  }

  // Special handling for official MCP servers
  if (downloadDetails.githubUrl?.includes('modelcontextprotocol/servers')) {
    const serverName = item.mcpId.replace(/^@modelcontextprotocol\/server-/, '');
    config.command = 'npx';
    config.args = ['-y', `@modelcontextprotocol/server-${serverName}`];
  }

  // Handle npm package names
  if (item.mcpId.startsWith('@') || item.mcpId.includes('/')) {
    config.args = ['-y', item.mcpId];
  }

  return config;
}

/**
 * Parse llms installation content for config
 */
function parseLlmsInstallation(content: string): Partial<McpInstallConfig> | null {
  try {
    // Look for JSON config blocks
    const jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.command) {
        return {
          command: parsed.command,
          args: parsed.args || [],
          connectionType: parsed.transportType === 'sse' ? 'sse' : 'stdio',
          url: parsed.url,
          envKeys: parsed.env ? Object.keys(parsed.env) : undefined,
        };
      }
    }

    // Look for command patterns
    const cmdMatch = content.match(/command["\s:]+["']?(\w+)["']?/i);
    const argsMatch = content.match(/args["\s:]+\[([^\]]+)\]/i);
    
    if (cmdMatch) {
      const args = argsMatch 
        ? argsMatch[1].split(',').map(s => s.trim().replace(/["']/g, ''))
        : [];
      return {
        command: cmdMatch[1],
        args,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract environment variable keys from text (readme, etc.)
 */
function extractEnvKeysFromText(text: string): string[] {
  const envKeys = new Set<string>();
  
  // Common patterns for env vars
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

  return Array.from(envKeys).slice(0, 10); // Limit to 10 keys
}
