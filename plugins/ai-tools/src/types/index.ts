/**
 * AI Tools Plugin Types
 *
 * @description Shared type definitions for AI tools plugin
 */

// Re-export config types
export * from './config';

// =============================================================================
// PRICING TYPES
// =============================================================================

export interface ModelPricing {
  model: string;
  description?: string;
  input?: string;
  inputCached?: string;
  output?: string;
  unit: string;
  contextLength?: string;
  free?: boolean;
}

export interface PricingCategory {
  category: string;
  description?: string;
  models: ModelPricing[];
}

export interface ProviderPricing {
  scraped_at: string;
  source: string;
  categories: PricingCategory[];
}

export interface PricingProviderConfig {
  id: string;
  name: string;
  region: 'US' | 'CN';
  urls: string[];
  currency: '$' | '¥';
  unit: string;
  type: 'scraper' | 'api';
  locale?: string;
}

export interface AllPricing {
  generated_at: string;
  total_models: number;
  providers: Array<{
    provider: string;
    region: 'US' | 'CN';
    scraped_at: string;
    source: string;
    model_count: number;
    categories: PricingCategory[];
  }>;
}

// =============================================================================
// STATUS TYPES
// =============================================================================

export type ProviderStatus = 'operational' | 'degraded' | 'down' | 'unknown';

export type CheckType = 'health' | 'api' | 'models' | 'status_page';

export interface StatusProviderConfig {
  id: string;
  name: string;
  region: 'US' | 'CN' | 'EU';
  endpoints: EndpointConfig[];
  statusPage?: string;
  apiKeyEnv?: string;
  rateLimit?: RateLimitConfig;
}

export interface EndpointConfig {
  name: string;
  url: string;
  type: CheckType;
  method?: 'GET' | 'POST' | 'HEAD';
  headers?: Record<string, string>;
  body?: unknown;
  expectedStatus?: number[];
  timeout?: number;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute?: number;
}

export interface CheckResult {
  provider: string;
  endpoint: string;
  status: ProviderStatus;
  responseTime: number;
  statusCode?: number;
  error?: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface ProviderCheckResult {
  provider: string;
  name: string;
  region: 'US' | 'CN' | 'EU';
  overallStatus: ProviderStatus;
  checks: CheckResult[];
  avgResponseTime: number;
  successRate: number;
  timestamp: string;
  statusPageUrl?: string;
}

export interface StatusReport {
  generated_at: string;
  total_providers: number;
  summary: {
    operational: number;
    degraded: number;
    down: number;
    unknown: number;
  };
  providers: ProviderCheckResult[];
}

// =============================================================================
// RANKINGS TYPES
// =============================================================================

export type TimeRange = 'week' | 'month' | 'all';

export interface ModelRanking {
  rank: number;
  modelId: string;
  modelName: string;
  author: string;
  tokens: string;
  tokensRaw: number;
  change: string;
  changePercent: number;
  changeDirection: 'up' | 'down' | 'unchanged';
  modelUrl: string;
  authorUrl: string;
}

export interface MarketShareEntry {
  rank: number;
  author: string;
  percentage: string;
  percentageRaw: number;
  authorUrl: string;
}

export interface AppRanking {
  rank: number;
  name: string;
  description: string;
  tokens: string;
  tokensRaw: number;
  url: string;
  iconUrl?: string;
}

export interface RankingsData {
  scraped_at: string;
  source: string;
  timeRange: TimeRange;
  leaderboard: ModelRanking[];
  marketShare: MarketShareEntry[];
  topApps: AppRanking[];
}

// =============================================================================
// LMARENA TYPES
// =============================================================================

export type LeaderboardCategory =
  | 'overall'
  | 'overall_style_control'
  | 'coding'
  | 'hard_prompt'
  | 'math'
  | 'creative_writing'
  | 'if_eval'
  | 'long_user'
  | 'english'
  | 'chinese'
  | 'japanese'
  | 'korean'
  | 'spanish'
  | 'french'
  | 'german'
  | 'portuguese'
  | 'russian';

export type ArenaType = 'text' | 'vision';

export interface LeaderboardEntry {
  rank: number;
  modelId: string;
  modelName: string;
  score: number;
  confidenceInterval?: {
    lower: number;
    upper: number;
  };
  votes?: number;
  organization?: string;
  license?: string;
  inputPrice?: number;
  outputPrice?: number;
}

export interface LeaderboardData {
  scrapedAt: string;
  source: string;
  category: LeaderboardCategory;
  arenaType: ArenaType;
  entries: LeaderboardEntry[];
  totalModels: number;
  lastUpdated?: string;
}

export interface ModelMetadata {
  name: string;
  modelApiKey: string;
  inputTokenPrice: string;
  outputTokenPrice: string;
  organization: string;
  license: string;
  priceSource?: string;
  modelSource?: string;
}

export interface AllLeaderboardsData {
  scrapedAt: string;
  sources: string[];
  text: {
    [category: string]: LeaderboardData;
  };
  vision?: {
    [category: string]: LeaderboardData;
  };
  metadata?: ModelMetadata[];
}

// =============================================================================
// TOOL PARAMETER TYPES
// =============================================================================

export interface PricingToolParams {
  provider?: string;
  region?: 'US' | 'CN';
  all?: boolean;
  export?: 'json' | 'csv';
}

export interface StatusToolParams {
  provider?: string;
  region?: 'US' | 'CN' | 'EU';
  timeout?: number;
}

export interface RankingsToolParams {
  timeRange?: TimeRange;
  export?: 'json' | 'csv' | 'html' | 'markdown';
}

export interface LMArenaToolParams {
  category?: LeaderboardCategory;
  includeHistory?: boolean;
  max?: number;
}

// =============================================================================
// TOOL RESULT TYPES
// =============================================================================

export interface PricingToolResult {
  success: boolean;
  data?: AllPricing;
  provider?: ProviderPricing;
  error?: string;
  timestamp: string;
}

export interface StatusToolResult {
  success: boolean;
  data?: StatusReport;
  provider?: ProviderCheckResult;
  error?: string;
  timestamp: string;
}

export interface RankingsToolResult {
  success: boolean;
  data?: RankingsData;
  error?: string;
  timestamp: string;
}

export interface LMArenaToolResult {
  success: boolean;
  data?: AllLeaderboardsData;
  category?: LeaderboardData;
  error?: string;
  timestamp: string;
}
