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

/**
 * Sample marketplace prompts for initial data
 */
export const SAMPLE_MARKETPLACE_PROMPTS: Omit<
  MarketplacePrompt,
  'id' | 'createdAt' | 'updatedAt'
>[] = [
  {
    name: 'Code Review Expert',
    description:
      'Comprehensive code review with security, performance, and best practices analysis',
    content: `You are an expert code reviewer. Analyze the provided code for:

1. **Security Issues**: SQL injection, XSS, authentication flaws
2. **Performance**: Bottlenecks, memory leaks, inefficient algorithms
3. **Best Practices**: Clean code, SOLID principles, design patterns
4. **Maintainability**: Readability, documentation, test coverage

Code to review:
{{code}}

Language: {{language}}
Context: {{context}}

Provide a structured review with severity levels (Critical/High/Medium/Low) and specific recommendations.`,
    category: 'coding',
    tags: ['code-review', 'security', 'performance', 'best-practices'],
    variables: [
      { name: 'code', description: 'The code to review', required: true, type: 'multiline' },
      {
        name: 'language',
        description: 'Programming language',
        required: true,
        type: 'text',
        defaultValue: 'TypeScript',
      },
      {
        name: 'context',
        description: 'Additional context about the codebase',
        required: false,
        type: 'multiline',
      },
    ],
    targets: ['chat', 'agent'],
    author: {
      id: 'cognia-official',
      name: 'Cognia Team',
      verified: true,
    },
    source: 'marketplace',
    qualityTier: 'official',
    version: '1.0.0',
    versions: [],
    stats: {
      downloads: 1250,
      weeklyDownloads: 180,
      favorites: 420,
      shares: 85,
      views: 5600,
      successRate: 0.94,
    },
    rating: {
      average: 4.7,
      count: 156,
      distribution: { 1: 2, 2: 4, 3: 12, 4: 38, 5: 100 },
    },
    reviewCount: 42,
    icon: '🔍',
    color: '#22c55e',
    isOfficial: true,
    isFeatured: true,
  },
  {
    name: 'Creative Story Writer',
    description: 'Generate engaging stories with vivid characters and compelling narratives',
    content: `You are a creative storyteller. Write a {{genre}} story with the following elements:

**Setting**: {{setting}}
**Main Character**: {{character}}
**Theme**: {{theme}}
**Tone**: {{tone}}
**Length**: {{length}}

Create an engaging narrative with:
- Rich, sensory descriptions
- Authentic dialogue
- Character development
- A satisfying story arc

Begin the story:`,
    category: 'creative',
    tags: ['storytelling', 'creative-writing', 'fiction', 'narrative'],
    variables: [
      {
        name: 'genre',
        description: 'Story genre',
        required: true,
        type: 'select',
        options: ['Fantasy', 'Sci-Fi', 'Mystery', 'Romance', 'Horror', 'Adventure'],
      },
      { name: 'setting', description: 'Where the story takes place', required: true, type: 'text' },
      {
        name: 'character',
        description: 'Main character description',
        required: true,
        type: 'text',
      },
      {
        name: 'theme',
        description: 'Central theme or message',
        required: false,
        type: 'text',
        defaultValue: 'Growth and discovery',
      },
      {
        name: 'tone',
        description: 'Story tone',
        required: false,
        type: 'select',
        options: ['Light', 'Dark', 'Humorous', 'Serious', 'Whimsical'],
        defaultValue: 'Engaging',
      },
      {
        name: 'length',
        description: 'Approximate length',
        required: false,
        type: 'select',
        options: [
          'Flash fiction (500 words)',
          'Short story (1500 words)',
          'Long story (3000+ words)',
        ],
        defaultValue: 'Short story (1500 words)',
      },
    ],
    targets: ['chat'],
    author: {
      id: 'cognia-official',
      name: 'Cognia Team',
      verified: true,
    },
    source: 'marketplace',
    qualityTier: 'official',
    version: '1.0.0',
    versions: [],
    stats: {
      downloads: 890,
      weeklyDownloads: 120,
      favorites: 310,
      shares: 65,
      views: 4200,
      successRate: 0.91,
    },
    rating: {
      average: 4.5,
      count: 98,
      distribution: { 1: 1, 2: 3, 3: 8, 4: 32, 5: 54 },
    },
    reviewCount: 28,
    icon: '📖',
    color: '#a855f7',
    isOfficial: true,
    isFeatured: true,
  },
];
