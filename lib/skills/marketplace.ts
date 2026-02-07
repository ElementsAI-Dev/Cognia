/**
 * SkillsMP Marketplace API
 * Handles fetching skills from skillsmp.com
 */

import type {
  SkillsMarketplaceItem,
  SkillsMarketplaceResponse,
  SkillsMarketplaceFilters,
  SkillsMarketplaceDetail,
  SkillsMarketplaceSortOption,
} from '@/types/skill/skill-marketplace';
import { loggers } from '@/lib/logger';

const log = loggers.app;

/** API Base URL */
const API_BASE_URL = 'https://skillsmp.com/api/v1';

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
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('aborted') ||
    message.includes('fetch')
  ) {
    return true;
  }
  if (status && status >= 500 && status < 600) {
    return true;
  }
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
  return Math.min(exponentialDelay + jitter, 10000);
}

/**
 * Fetch with timeout and retry support
 */
async function fetchWithTimeout(url: string, options: FetchOptions = {}): Promise<Response> {
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

/**
 * Search skills using keywords
 */
export async function searchSkillsMarketplace(
  query: string,
  options?: {
    page?: number;
    limit?: number;
    sortBy?: SkillsMarketplaceSortOption;
    apiKey?: string;
  }
): Promise<SkillsMarketplaceResponse> {
  const { page = 1, limit = 20, sortBy = 'stars', apiKey } = options || {};

  if (!query.trim()) {
    return {
      success: false,
      data: [],
      error: { code: 'MISSING_QUERY', message: 'Search query is required' },
    };
  }

  if (!apiKey) {
    return {
      success: false,
      data: [],
      error: { code: 'MISSING_API_KEY', message: 'API key is required' },
    };
  }

  try {
    const params = new URLSearchParams();
    params.set('q', query);
    params.set('page', String(page));
    params.set('limit', String(limit));
    params.set('sortBy', sortBy);

    const response = await fetchWithTimeout(`${API_BASE_URL}/skills/search?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT,
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          data: [],
          error: { code: 'INVALID_API_KEY', message: 'Invalid or expired API key' },
        };
      }
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Transform response to our format
    const items: SkillsMarketplaceItem[] = (data.data || data.skills || data || []).map(
      (item: Record<string, unknown>) => transformSkillItem(item)
    );

    return {
      success: true,
      data: items,
      pagination: data.pagination || {
        page,
        limit,
        total: items.length,
        totalPages: 1,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        data: [],
        error: { code: 'TIMEOUT', message: 'Request timed out' },
      };
    }
    return {
      success: false,
      data: [],
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * AI semantic search for skills
 */
export async function aiSearchSkillsMarketplace(
  query: string,
  apiKey?: string
): Promise<SkillsMarketplaceResponse> {
  if (!query.trim()) {
    return {
      success: false,
      data: [],
      error: { code: 'MISSING_QUERY', message: 'Search query is required' },
    };
  }

  if (!apiKey) {
    return {
      success: false,
      data: [],
      error: { code: 'MISSING_API_KEY', message: 'API key is required' },
    };
  }

  try {
    const params = new URLSearchParams();
    params.set('q', query);

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/skills/ai-search?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': USER_AGENT,
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          data: [],
          error: { code: 'INVALID_API_KEY', message: 'Invalid or expired API key' },
        };
      }
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();

    const items: SkillsMarketplaceItem[] = (data.data || data.skills || data || []).map(
      (item: Record<string, unknown>) => transformSkillItem(item)
    );

    return {
      success: true,
      data: items,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        data: [],
        error: { code: 'TIMEOUT', message: 'Request timed out' },
      };
    }
    return {
      success: false,
      data: [],
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Fetch skill detail from marketplace
 */
export async function fetchSkillDetail(
  skillId: string,
  _apiKey?: string
): Promise<SkillsMarketplaceDetail | null> {
  if (!skillId) {
    return null;
  }

  try {
    // Parse skill ID to get repo info (format: owner/repo/directory)
    const parts = skillId.split('/');
    if (parts.length < 2) {
      return null;
    }

    const owner = parts[0];
    const repo = parts[1];
    const directory = parts.slice(2).join('/') || '';

    // Fetch SKILL.md content from GitHub
    const skillmdUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${directory ? directory + '/' : ''}SKILL.md`;
    const readmeUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${directory ? directory + '/' : ''}README.md`;

    const [skillmdResponse, readmeResponse] = await Promise.allSettled([
      fetchWithTimeout(skillmdUrl, { retries: 1, timeout: 10000, headers: { 'User-Agent': USER_AGENT } }),
      fetchWithTimeout(readmeUrl, { retries: 1, timeout: 10000, headers: { 'User-Agent': USER_AGENT } }),
    ]);

    const skillmdContent =
      skillmdResponse.status === 'fulfilled' && skillmdResponse.value.ok
        ? await skillmdResponse.value.text()
        : undefined;

    const readmeContent =
      readmeResponse.status === 'fulfilled' && readmeResponse.value.ok
        ? await readmeResponse.value.text()
        : undefined;

    return {
      skill: {
        id: skillId,
        name: directory.split('/').pop() || repo,
        description: '',
        author: owner,
        repository: `${owner}/${repo}`,
        directory,
        stars: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        skillmdUrl,
        readmeUrl,
      },
      skillmdContent,
      readmeContent,
    };
  } catch (error) {
    log.error('Failed to fetch skill detail', error as Error);
    return null;
  }
}

/**
 * Download skill content for installation
 * Fetches SKILL.md and discovers resources via GitHub API
 */
export async function downloadSkillContent(
  skillId: string,
  apiKey?: string
): Promise<{ skillmd: string; resources: Array<{ name: string; path: string; content: string }> } | null> {
  try {
    const parts = skillId.split('/');
    if (parts.length < 2) {
      return null;
    }

    const owner = parts[0];
    const repo = parts[1];
    const directory = parts.slice(2).join('/') || '';
    const basePath = directory ? `${directory}/` : '';

    // Fetch SKILL.md with retry support
    const skillmdUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${basePath}SKILL.md`;
    const skillmdResponse = await fetchWithTimeout(skillmdUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        ...(apiKey ? { Authorization: `token ${apiKey}` } : {}),
      },
    });

    if (!skillmdResponse.ok) {
      throw new Error(`Failed to fetch SKILL.md: ${skillmdResponse.statusText}`);
    }

    const skillmd = await skillmdResponse.text();

    // Fetch resources via GitHub API tree endpoint
    const resources: Array<{ name: string; path: string; content: string }> = [];
    const resourceDirs = ['scripts', 'references', 'assets'];

    try {
      const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`;
      const treeResponse = await fetchWithTimeout(treeUrl, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': USER_AGENT,
          ...(apiKey ? { Authorization: `token ${apiKey}` } : {}),
        },
        retries: 1,
      });

      if (treeResponse.ok) {
        const treeData = await treeResponse.json();
        const tree = (treeData.tree || []) as Array<{ path: string; type: string; size?: number }>;

        // Find resource files within the skill directory
        const resourceFiles = tree.filter((item) => {
          if (item.type !== 'blob') return false;
          const itemPath = item.path;
          // Must be within the skill directory
          if (directory && !itemPath.startsWith(basePath)) return false;
          // Must not be SKILL.md itself
          const relativePath = directory ? itemPath.slice(basePath.length) : itemPath;
          if (relativePath === 'SKILL.md' || relativePath === 'README.md') return false;
          // Must be in a recognized resource directory or root of skill
          const firstSegment = relativePath.split('/')[0];
          return resourceDirs.includes(firstSegment) || !relativePath.includes('/');
        });

        // Fetch each resource file (limit to reasonable size)
        const MAX_RESOURCE_SIZE = 100_000; // 100KB per resource
        const MAX_RESOURCES = 20;

        const filesToFetch = resourceFiles
          .filter((f) => !f.size || f.size <= MAX_RESOURCE_SIZE)
          .slice(0, MAX_RESOURCES);

        const fetchPromises = filesToFetch.map(async (file) => {
          const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${file.path}`;
          try {
            const resp = await fetchWithTimeout(rawUrl, {
              headers: { 'User-Agent': USER_AGENT },
              retries: 1,
              timeout: 10000,
            });
            if (resp.ok) {
              const content = await resp.text();
              const relativePath = directory ? file.path.slice(basePath.length) : file.path;
              return {
                name: relativePath.split('/').pop() || relativePath,
                path: relativePath,
                content,
              };
            }
          } catch {
            // Skip individual resource failures silently
          }
          return null;
        });

        const results = await Promise.allSettled(fetchPromises);
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value) {
            resources.push(result.value);
          }
        }
      }
    } catch (resourceError) {
      // Resource fetching is best-effort; log but don't fail
      log.warn('Failed to fetch skill resources, continuing with SKILL.md only', { error: String(resourceError) });
    }

    return {
      skillmd,
      resources,
    };
  } catch (error) {
    log.error('Failed to download skill content', error as Error);
    return null;
  }
}

/**
 * Transform API response item to our format
 */
function transformSkillItem(item: Record<string, unknown>): SkillsMarketplaceItem {
  // Handle different possible API response formats
  const id = String(item.id || item.skillId || item.name || '');
  const name = String(item.name || item.displayName || id.split('/').pop() || '');
  const repository = String(item.repository || item.repo || item.githubUrl || '');

  return {
    id,
    name,
    description: String(item.description || ''),
    author: String(item.author || item.owner || repository.split('/')[0] || 'Unknown'),
    repository,
    directory: String(item.directory || item.path || ''),
    stars: Number(item.stars || item.githubStars || 0),
    downloads: item.downloads ? Number(item.downloads) : undefined,
    tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
    category: item.category ? String(item.category) : undefined,
    createdAt: String(item.createdAt || new Date().toISOString()),
    updatedAt: String(item.updatedAt || new Date().toISOString()),
    readmeUrl: item.readmeUrl ? String(item.readmeUrl) : undefined,
    skillmdUrl: item.skillmdUrl ? String(item.skillmdUrl) : undefined,
    iconUrl: item.iconUrl ? String(item.iconUrl) : undefined,
    license: item.license ? String(item.license) : undefined,
    version: item.version ? String(item.version) : undefined,
  };
}

/**
 * Filter skills locally (for cached results)
 */
export function filterSkillsLocally(
  items: SkillsMarketplaceItem[],
  filters: Partial<SkillsMarketplaceFilters>
): SkillsMarketplaceItem[] {
  let filtered = [...items];

  // Filter by query
  if (filters.query) {
    const query = filters.query.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.author.toLowerCase().includes(query) ||
        (item.tags && item.tags.some((tag) => tag.toLowerCase().includes(query)))
    );
  }

  // Filter by category
  if (filters.category) {
    filtered = filtered.filter((item) => item.category === filters.category);
  }

  // Filter by tags
  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter(
      (item) => item.tags && filters.tags!.some((tag) => item.tags!.includes(tag))
    );
  }

  // Sort
  if (filters.sortBy === 'stars') {
    filtered.sort((a, b) => b.stars - a.stars);
  } else if (filters.sortBy === 'recent') {
    filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  return filtered;
}

/**
 * Get unique tags from skills
 */
export function getUniqueSkillTags(items: SkillsMarketplaceItem[]): string[] {
  const tagSet = new Set<string>();
  for (const item of items) {
    if (item.tags) {
      for (const tag of item.tags) {
        tagSet.add(tag);
      }
    }
  }
  return Array.from(tagSet).sort();
}

/**
 * Get unique categories from skills
 */
export function getUniqueSkillCategories(items: SkillsMarketplaceItem[]): string[] {
  const categorySet = new Set<string>();
  for (const item of items) {
    if (item.category) {
      categorySet.add(item.category);
    }
  }
  return Array.from(categorySet).sort();
}
