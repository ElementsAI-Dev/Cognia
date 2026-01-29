/**
 * SkillsMP Marketplace Types
 * Types for the Skills marketplace integration (skillsmp.com)
 */

/** SkillsMP marketplace item from the API */
export interface SkillsMarketplaceItem {
  /** Unique identifier (typically owner/repo/directory) */
  id: string;
  /** Skill name */
  name: string;
  /** Description of the skill */
  description: string;
  /** Author/owner */
  author: string;
  /** Repository in format owner/repo */
  repository: string;
  /** Directory path within the repository */
  directory: string;
  /** GitHub stars count */
  stars: number;
  /** Download/usage count */
  downloads?: number;
  /** Tags/categories */
  tags?: string[];
  /** Category */
  category?: string;
  /** Created timestamp */
  createdAt: string;
  /** Last updated timestamp */
  updatedAt: string;
  /** README URL */
  readmeUrl?: string;
  /** SKILL.md URL */
  skillmdUrl?: string;
  /** Icon URL */
  iconUrl?: string;
  /** License */
  license?: string;
  /** Version */
  version?: string;
}

/** SkillsMP API response wrapper */
export interface SkillsMarketplaceResponse {
  success: boolean;
  data: SkillsMarketplaceItem[];
  pagination?: SkillsMarketplacePagination;
  error?: SkillsMarketplaceError;
}

/** Pagination info */
export interface SkillsMarketplacePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** API error */
export interface SkillsMarketplaceError {
  code: 'MISSING_API_KEY' | 'INVALID_API_KEY' | 'MISSING_QUERY' | 'INTERNAL_ERROR' | string;
  message: string;
}

/** Sort options for marketplace */
export type SkillsMarketplaceSortOption = 'stars' | 'recent';

/** Marketplace filter options */
export interface SkillsMarketplaceFilters {
  /** Search query */
  query: string;
  /** Sort by */
  sortBy: SkillsMarketplaceSortOption;
  /** Current page */
  page: number;
  /** Items per page */
  limit: number;
  /** Use AI semantic search instead of keyword search */
  useAiSearch: boolean;
  /** Filter by category */
  category?: string;
  /** Filter by tags */
  tags?: string[];
}

/** Default marketplace filters */
export const DEFAULT_SKILLS_MARKETPLACE_FILTERS: SkillsMarketplaceFilters = {
  query: '',
  sortBy: 'stars',
  page: 1,
  limit: 20,
  useAiSearch: false,
};

/** All available sort options */
export const SKILLS_MARKETPLACE_SORT_OPTIONS: SkillsMarketplaceSortOption[] = ['stars', 'recent'];

/** Installation status for marketplace items */
export type SkillInstallStatus = 'not_installed' | 'installing' | 'installed' | 'error';

/** Extended marketplace item with installation state */
export interface SkillsMarketplaceItemWithStatus extends SkillsMarketplaceItem {
  installStatus: SkillInstallStatus;
  installError?: string;
}

/** Skill detail response from marketplace */
export interface SkillsMarketplaceDetail {
  /** Basic skill info */
  skill: SkillsMarketplaceItem;
  /** Raw SKILL.md content */
  skillmdContent?: string;
  /** README content */
  readmeContent?: string;
  /** Resource files */
  resources?: Array<{
    name: string;
    path: string;
    type: string;
    size?: number;
  }>;
}

/** Helper to get sort label for skills marketplace */
export function getSkillsSortLabel(sort: SkillsMarketplaceSortOption): string {
  switch (sort) {
    case 'stars':
      return 'Most Stars';
    case 'recent':
      return 'Recently Updated';
    default:
      return 'Most Stars';
  }
}

/** Format star count for display (skills) */
export function formatSkillsStarCount(stars: number): string {
  if (stars >= 1000000) {
    return `${(stars / 1000000).toFixed(1)}M`;
  }
  if (stars >= 1000) {
    return `${(stars / 1000).toFixed(1)}K`;
  }
  return stars.toString();
}

/** Format download count for display (skills) */
export function formatSkillsDownloadCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

/** Format relative time for display (skills) */
export function formatSkillsRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    // Check for invalid date
    if (isNaN(date.getTime())) {
      return dateString;
    }
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
