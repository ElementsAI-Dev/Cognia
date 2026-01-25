/**
 * MCP Marketplace Types
 * Types for the MCP server marketplace integration
 * Supports multiple sources: Cline, Smithery, Glama
 */

/** Available marketplace sources */
export type McpMarketplaceSource = 'cline' | 'smithery' | 'glama' | 'all';

/** Marketplace source configuration */
export interface McpMarketplaceSourceConfig {
  id: McpMarketplaceSource;
  name: string;
  description: string;
  baseUrl: string;
  requiresApiKey: boolean;
  enabled: boolean;
}

/** All available marketplace sources */
export const MARKETPLACE_SOURCES: McpMarketplaceSourceConfig[] = [
  {
    id: 'cline',
    name: 'Cline',
    description: 'Official Cline MCP marketplace',
    baseUrl: 'https://core-api.staging.int.cline.bot/v1/mcp',
    requiresApiKey: false,
    enabled: true,
  },
  {
    id: 'smithery',
    name: 'Smithery',
    description: 'Smithery MCP registry with remote hosting',
    baseUrl: 'https://registry.smithery.ai',
    requiresApiKey: true,
    enabled: true,
  },
  {
    id: 'glama',
    name: 'Glama',
    description: 'Glama MCP server directory (12,500+ servers)',
    baseUrl: 'https://glama.ai/api/mcp',
    requiresApiKey: false,
    enabled: true,
  },
];

/** Connection configuration for remote MCP servers */
export interface McpConnectionConfig {
  /** Connection type */
  type: 'stdio' | 'sse' | 'streamable-http';
  /** Command for stdio */
  command?: string;
  /** Arguments for stdio */
  args?: string[];
  /** Environment variables */
  env?: Record<string, string>;
  /** URL for SSE/HTTP connections */
  url?: string;
  /** Configuration schema for user inputs */
  configSchema?: Record<string, unknown>;
}

/** MCP Marketplace item from the API */
export interface McpMarketplaceItem {
  /** Unique identifier */
  mcpId: string;
  /** Display name */
  name: string;
  /** Author/creator */
  author: string;
  /** Description */
  description: string;
  /** GitHub repository URL */
  githubUrl: string;
  /** Number of GitHub stars */
  githubStars: number;
  /** Number of downloads/uses */
  downloadCount: number;
  /** Tags/categories */
  tags: string[];
  /** Whether the server requires an API key */
  requiresApiKey: boolean;
  /** Icon URL (optional) */
  iconUrl?: string;
  /** Last updated timestamp */
  updatedAt?: string;
  /** Version */
  version?: string;
  /** License */
  license?: string;
  /** Source marketplace */
  source: McpMarketplaceSource;
  /** Whether server is verified */
  verified?: boolean;
  /** Whether server supports remote hosting */
  remote?: boolean;
  /** Homepage URL */
  homepage?: string;
  /** Connection config for SSE servers */
  connectionConfig?: McpConnectionConfig;
}

/** MCP Download response from the API */
export interface McpDownloadResponse {
  mcpId: string;
  githubUrl: string;
  name: string;
  author: string;
  description: string;
  readmeContent: string;
  llmsInstallationContent?: string;
  requiresApiKey: boolean;
  error?: string;
}

/** MCP Marketplace catalog */
export interface McpMarketplaceCatalog {
  items: McpMarketplaceItem[];
  source?: McpMarketplaceSource;
  totalCount?: number;
  page?: number;
  pageSize?: number;
}

/** Marketplace filter options */
export interface McpMarketplaceFilters {
  search: string;
  tags: string[];
  sortBy: McpMarketplaceSortOption;
  requiresApiKey?: boolean;
  source: McpMarketplaceSource;
  verified?: boolean;
  remote?: boolean;
}

/** Sort options for marketplace */
export type McpMarketplaceSortOption = 'popular' | 'newest' | 'stars' | 'downloads' | 'name';

/** Installation status for marketplace items */
export type McpInstallStatus = 'not_installed' | 'installing' | 'installed' | 'error';

/** Extended marketplace item with installation state */
export interface McpMarketplaceItemWithStatus extends McpMarketplaceItem {
  installStatus: McpInstallStatus;
  installError?: string;
}

/** Helper to get sort label */
export function getSortLabel(sort: McpMarketplaceSortOption): string {
  switch (sort) {
    case 'popular':
      return 'Popular';
    case 'newest':
      return 'Newest';
    case 'stars':
      return 'GitHub Stars';
    case 'downloads':
      return 'Downloads';
    case 'name':
      return 'Name';
    default:
      return 'Popular';
  }
}

/** All available sort options */
export const MARKETPLACE_SORT_OPTIONS: McpMarketplaceSortOption[] = [
  'popular',
  'newest',
  'stars',
  'downloads',
  'name',
];

/** Default filters */
export const DEFAULT_MARKETPLACE_FILTERS: McpMarketplaceFilters = {
  search: '',
  tags: [],
  sortBy: 'popular',
  source: 'all',
};

/** Get source display name */
export function getSourceName(source: McpMarketplaceSource): string {
  if (source === 'all') return 'All Sources';
  const config = MARKETPLACE_SOURCES.find((s) => s.id === source);
  return config?.name || source;
}

/** Smithery API response types */
export interface SmitheryServer {
  qualifiedName: string;
  displayName: string;
  description: string;
  iconUrl?: string;
  verified: boolean;
  useCount: number;
  remote: boolean;
  createdAt: string;
  homepage: string;
}

export interface SmitheryResponse {
  servers: SmitheryServer[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
}

/** Glama API response types */
export interface GlamaServer {
  id: string;
  name: string;
  author: string;
  description: string;
  repository?: string;
  homepage?: string;
  iconUrl?: string;
  stars?: number;
  weeklyDownloads?: number;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  claimed?: boolean;
  official?: boolean;
  language?: string;
  hosting?: string;
}

export interface GlamaResponse {
  servers: GlamaServer[];
  total?: number;
  page?: number;
  pageSize?: number;
}
