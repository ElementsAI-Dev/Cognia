/**
 * Prompt Marketplace Types
 * Types for the prompt marketplace feature - browsing, sharing, and installing community prompts
 */

import type {
  PromptTemplateSource,
  PromptTemplateTarget,
  TemplateVariable,
} from './prompt-template';

/**
 * Marketplace prompt categories
 */
export type MarketplaceCategory =
  | 'featured'
  | 'trending'
  | 'new'
  | 'coding'
  | 'writing'
  | 'productivity'
  | 'creative'
  | 'business'
  | 'education'
  | 'research'
  | 'translation'
  | 'analysis'
  | 'chat'
  | 'agent'
  | 'workflow';

/**
 * Prompt quality tier
 */
export type PromptQualityTier = 'community' | 'verified' | 'premium' | 'official';

/**
 * Author information
 */
export interface PromptAuthor {
  id: string;
  name: string;
  avatar?: string;
  verified?: boolean;
  promptCount?: number;
  totalDownloads?: number;
}

/**
 * Prompt rating and feedback
 */
export interface PromptRating {
  average: number;
  count: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

/**
 * Prompt usage statistics
 */
export interface PromptUsageStats {
  downloads: number;
  weeklyDownloads: number;
  favorites: number;
  shares: number;
  views: number;
  successRate?: number;
  averageRating?: number;
}

/**
 * Prompt review
 */
export interface PromptReview {
  id: string;
  authorId: string;
  authorName: string;
  rating: number;
  content: string;
  helpful: number;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Version information for a prompt
 */
export interface PromptVersion {
  version: string;
  content: string;
  variables: TemplateVariable[];
  changelog?: string;
  createdAt: Date;
  downloads?: number;
}

/**
 * Marketplace prompt - extends PromptTemplate with marketplace-specific fields
 */
export interface MarketplacePrompt {
  id: string;
  name: string;
  description: string;
  content: string;
  category: MarketplaceCategory;
  subcategory?: string;
  tags: string[];
  variables: TemplateVariable[];
  targets: PromptTemplateTarget[];

  // Author & Origin
  author: PromptAuthor;
  source: PromptTemplateSource | 'marketplace';
  qualityTier: PromptQualityTier;

  // Versioning
  version: string;
  versions: PromptVersion[];

  // Statistics
  stats: PromptUsageStats;
  rating: PromptRating;

  // Reviews (paginated separately)
  reviewCount: number;

  // Metadata
  icon?: string;
  color?: string;
  previewImage?: string;
  exampleOutput?: string;

  // Compatibility
  compatibleModels?: string[];
  recommendedModels?: string[];
  minTokens?: number;

  // Flags
  isOfficial?: boolean;
  isFeatured?: boolean;
  isNSFW?: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

/**
 * Installed marketplace prompt - local copy with tracking
 */
export interface InstalledMarketplacePrompt {
  id: string;
  marketplaceId: string;
  localTemplateId: string;
  installedVersion: string;
  latestVersion?: string;
  hasUpdate: boolean;
  autoUpdate: boolean;
  installedAt: Date;
  lastSyncedAt?: Date;
  customizations?: {
    name?: string;
    content?: string;
    variables?: TemplateVariable[];
  };
}

/**
 * Search filters for marketplace
 */
export interface MarketplaceSearchFilters {
  query?: string;
  category?: MarketplaceCategory;
  subcategory?: string;
  tags?: string[];
  qualityTier?: PromptQualityTier[];
  targets?: PromptTemplateTarget[];
  minRating?: number;
  sortBy?: 'relevance' | 'downloads' | 'rating' | 'newest' | 'trending';
  authorId?: string;
  compatibleModel?: string;
}

/**
 * Search result from marketplace
 */
export interface MarketplaceSearchResult {
  prompts: MarketplacePrompt[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  filters: MarketplaceSearchFilters;
  facets?: {
    categories: Record<string, number>;
    tags: Record<string, number>;
    qualityTiers: Record<string, number>;
  };
}

/**
 * Prompt collection (curated lists)
 */
export interface PromptCollection {
  id: string;
  name: string;
  description: string;
  author: PromptAuthor;
  promptIds: string[];
  promptCount: number;
  tags?: string[];
  categoryFilter?: string;
  icon?: string;
  color?: string;
  coverImage?: string;
  isOfficial?: boolean;
  isFeatured?: boolean;
  followers: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User's marketplace activity
 */
export interface MarketplaceUserActivity {
  userId: string;
  favorites: string[];
  installed: InstalledMarketplacePrompt[];
  reviewed: string[];
  published: string[];
  collections: string[];
  recentlyViewed: Array<{ promptId: string; viewedAt: Date }>;
}

/**
 * Prompt submission for publishing
 */
export interface PromptSubmission {
  templateId: string;
  name: string;
  description: string;
  content: string;
  category: MarketplaceCategory;
  subcategory?: string;
  tags: string[];
  variables: TemplateVariable[];
  targets: PromptTemplateTarget[];
  icon?: string;
  color?: string;
  exampleOutput?: string;
  compatibleModels?: string[];
  isNSFW?: boolean;
}

/**
 * Default featured categories for marketplace
 */
export const MARKETPLACE_CATEGORIES: Array<{
  id: MarketplaceCategory;
  name: string;
  icon: string;
  description: string;
}> = [
  { id: 'featured', name: 'Featured', icon: '⭐', description: 'Hand-picked by our team' },
  { id: 'trending', name: 'Trending', icon: '🔥', description: 'Popular this week' },
  { id: 'new', name: 'New', icon: '✨', description: 'Recently published' },
  { id: 'coding', name: 'Coding', icon: '💻', description: 'Development & programming' },
  { id: 'writing', name: 'Writing', icon: '✍️', description: 'Content creation & copywriting' },
  { id: 'productivity', name: 'Productivity', icon: '⚡', description: 'Work smarter, not harder' },
  { id: 'creative', name: 'Creative', icon: '🎨', description: 'Art, design & imagination' },
  { id: 'business', name: 'Business', icon: '💼', description: 'Professional & enterprise' },
  { id: 'education', name: 'Education', icon: '🎓', description: 'Learning & teaching' },
  { id: 'research', name: 'Research', icon: '🔬', description: 'Analysis & investigation' },
  { id: 'translation', name: 'Translation', icon: '🌐', description: 'Language & localization' },
  { id: 'analysis', name: 'Analysis', icon: '📊', description: 'Data & insights' },
  { id: 'chat', name: 'Chat', icon: '💬', description: 'Conversational prompts' },
  { id: 'agent', name: 'Agent', icon: '🤖', description: 'Autonomous agent prompts' },
  { id: 'workflow', name: 'Workflow', icon: '🔄', description: 'Multi-step processes' },
];

/**
 * Quality tier display info
 */
export const QUALITY_TIER_INFO: Record<
  PromptQualityTier,
  {
    name: string;
    icon: string;
    color: string;
    description: string;
  }
> = {
  community: {
    name: 'Community',
    icon: '👥',
    color: '#6b7280',
    description: 'Contributed by the community',
  },
  verified: {
    name: 'Verified',
    icon: '✓',
    color: '#3b82f6',
    description: 'Reviewed and tested',
  },
  premium: {
    name: 'Premium',
    icon: '💎',
    color: '#8b5cf6',
    description: 'High-quality curated prompts',
  },
  official: {
    name: 'Official',
    icon: '🏆',
    color: '#f59e0b',
    description: 'Created by Cognia team',
  },
};

