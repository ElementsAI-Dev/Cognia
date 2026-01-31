/**
 * Arena Leaderboard Sync Types
 * Types for network synchronization of arena leaderboard data
 */

import type { ProviderName } from '../provider/provider';
import type { TaskCategory } from '../provider/auto-router';
import type { ArenaModelRating, ArenaPreference, ArenaHeadToHead } from './index';

// ============================================
// Leaderboard Time Periods
// ============================================

/**
 * Leaderboard time period for filtering rankings
 */
export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all-time';

/**
 * Leaderboard sort field
 */
export type LeaderboardSortField = 'rating' | 'winRate' | 'totalBattles' | 'recentActivity';

/**
 * Leaderboard sort direction
 */
export type LeaderboardSortDirection = 'asc' | 'desc';

// ============================================
// Remote Data Structures
// ============================================

/**
 * Remote model rating from server
 */
export interface RemoteModelRating {
  /** Unique identifier on server */
  id: string;
  /** Model identifier (provider:model) */
  modelId: string;
  /** Provider name */
  provider: ProviderName;
  /** Model name */
  model: string;
  /** ELO-like rating */
  rating: number;
  /** Bradley-Terry score */
  btScore?: number;
  /** 95% CI lower bound */
  ci95Lower?: number;
  /** 95% CI upper bound */
  ci95Upper?: number;
  /** Total battles participated */
  totalBattles: number;
  /** Total wins */
  wins: number;
  /** Total losses */
  losses: number;
  /** Total ties */
  ties: number;
  /** Win rate (0-1) */
  winRate: number;
  /** Rating stability score */
  stabilityScore?: number;
  /** Category-specific ratings */
  categoryRatings?: Partial<Record<TaskCategory, number>>;
  /** Rank position in this period */
  rank: number;
  /** Rank change from previous period (-N, 0, +N) */
  rankChange?: number;
  /** Last updated timestamp */
  updatedAt: string;
  /** Period this rating belongs to */
  period: LeaderboardPeriod;
}

/**
 * Remote preference submission
 */
export interface RemotePreferenceSubmission {
  /** Winning model identifier (provider:model) */
  winner: string;
  /** Losing model identifier (provider:model) */
  loser: string;
  /** Task category */
  taskCategory?: TaskCategory;
  /** Win reason */
  reason?: string;
  /** Anonymous device ID for deduplication */
  deviceId: string;
  /** Timestamp */
  timestamp: string;
  /** Quality indicators for validation */
  quality?: {
    promptLength: number;
    avgResponseLength: number;
    viewingTimeMs: number;
  };
}

/**
 * Remote head-to-head record
 */
export interface RemoteHeadToHead extends ArenaHeadToHead {
  /** Period this record belongs to */
  period: LeaderboardPeriod;
  /** Last updated timestamp */
  updatedAt: string;
}

// ============================================
// API Request/Response Types
// ============================================

/**
 * Leaderboard fetch request parameters
 */
export interface LeaderboardFetchParams {
  /** Time period filter */
  period?: LeaderboardPeriod;
  /** Category filter */
  category?: TaskCategory;
  /** Sort field */
  sortBy?: LeaderboardSortField;
  /** Sort direction */
  sortDirection?: LeaderboardSortDirection;
  /** Pagination: page number (1-indexed) */
  page?: number;
  /** Pagination: items per page */
  pageSize?: number;
  /** Provider filter */
  provider?: ProviderName;
  /** Minimum battles threshold */
  minBattles?: number;
}

/**
 * Leaderboard fetch response
 */
export interface LeaderboardFetchResponse {
  /** Success status */
  success: boolean;
  /** Leaderboard entries */
  data: RemoteModelRating[];
  /** Pagination info */
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasMore: boolean;
  };
  /** Response metadata */
  meta: {
    /** Period of the leaderboard */
    period: LeaderboardPeriod;
    /** Category filter applied */
    category?: TaskCategory;
    /** Last updated timestamp */
    updatedAt: string;
    /** Cache TTL in seconds */
    cacheTTL: number;
  };
  /** Error message if failed */
  error?: string;
}

/**
 * Preference submission request
 */
export interface PreferenceSubmitRequest {
  /** List of preferences to submit */
  preferences: RemotePreferenceSubmission[];
}

/**
 * Preference submission response
 */
export interface PreferenceSubmitResponse {
  /** Success status */
  success: boolean;
  /** Number of preferences accepted */
  accepted: number;
  /** Number of preferences rejected (duplicates, invalid, etc.) */
  rejected: number;
  /** Rejection reasons */
  rejectionReasons?: string[];
  /** Error message if failed */
  error?: string;
}

/**
 * Head-to-head fetch response
 */
export interface HeadToHeadFetchResponse {
  /** Success status */
  success: boolean;
  /** Head-to-head records */
  data: RemoteHeadToHead[];
  /** Response metadata */
  meta: {
    period: LeaderboardPeriod;
    updatedAt: string;
    cacheTTL: number;
  };
  /** Error message if failed */
  error?: string;
}

/**
 * Model statistics request (for specific models)
 */
export interface ModelStatsRequest {
  /** Model identifiers to fetch */
  modelIds: string[];
  /** Time period */
  period?: LeaderboardPeriod;
}

/**
 * Model statistics response
 */
export interface ModelStatsResponse {
  /** Success status */
  success: boolean;
  /** Model statistics */
  data: RemoteModelRating[];
  /** Error message if failed */
  error?: string;
}

// ============================================
// Sync State Types
// ============================================

/**
 * Leaderboard sync status
 */
export type LeaderboardSyncStatus =
  | 'idle'
  | 'fetching'
  | 'submitting'
  | 'success'
  | 'error'
  | 'offline';

/**
 * Leaderboard sync error
 */
export interface LeaderboardSyncError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Retry-after in seconds (for rate limiting) */
  retryAfter?: number;
  /** Timestamp */
  timestamp: string;
}

/**
 * Pending submission (queued for retry)
 */
export interface PendingSubmission {
  /** Unique ID for this submission */
  id: string;
  /** Preferences to submit */
  preferences: RemotePreferenceSubmission[];
  /** Number of retry attempts */
  retryCount: number;
  /** Maximum retries before dropping */
  maxRetries: number;
  /** Created timestamp */
  createdAt: string;
  /** Last attempt timestamp */
  lastAttemptAt?: string;
  /** Last error */
  lastError?: string;
}

/**
 * Leaderboard cache entry
 */
export interface LeaderboardCacheEntry {
  /** Cache key */
  key: string;
  /** Cached data */
  data: RemoteModelRating[];
  /** Pagination info */
  pagination: LeaderboardFetchResponse['pagination'];
  /** Cache metadata */
  meta: LeaderboardFetchResponse['meta'];
  /** Cached timestamp */
  cachedAt: string;
  /** Expiration timestamp */
  expiresAt: string;
}

/**
 * Leaderboard sync state
 */
export interface LeaderboardSyncState {
  /** Current sync status */
  status: LeaderboardSyncStatus;
  /** Last successful fetch timestamp */
  lastFetchAt: string | null;
  /** Last successful submission timestamp */
  lastSubmitAt: string | null;
  /** Current error */
  error: LeaderboardSyncError | null;
  /** Pending submissions queue */
  pendingSubmissions: PendingSubmission[];
  /** Leaderboard cache */
  cache: Map<string, LeaderboardCacheEntry>;
  /** Is currently online */
  isOnline: boolean;
  /** Auto-refresh interval (ms, 0 = disabled) */
  autoRefreshInterval: number;
  /** Last auto-refresh timestamp */
  lastAutoRefreshAt: string | null;
}

// ============================================
// Configuration Types
// ============================================

/**
 * Leaderboard sync settings
 */
export interface LeaderboardSyncSettings {
  /** Enable leaderboard sync */
  enabled: boolean;
  /** API base URL */
  apiBaseUrl: string;
  /** API key (optional) */
  apiKey?: string;
  /** Auto-submit preferences to server */
  autoSubmitPreferences: boolean;
  /** Auto-refresh leaderboard data */
  autoRefresh: boolean;
  /** Auto-refresh interval in minutes */
  autoRefreshIntervalMinutes: number;
  /** Cache duration in minutes */
  cacheDurationMinutes: number;
  /** Retry failed submissions */
  retryFailedSubmissions: boolean;
  /** Maximum retry attempts */
  maxRetryAttempts: number;
  /** Request timeout in milliseconds */
  requestTimeoutMs: number;
  /** Minimum battles to display in leaderboard */
  minBattlesThreshold: number;
  /** Anonymous mode (don't send device ID) */
  anonymousMode: boolean;
}

/**
 * Default leaderboard sync settings
 */
export const DEFAULT_LEADERBOARD_SYNC_SETTINGS: LeaderboardSyncSettings = {
  enabled: false,
  apiBaseUrl: '',
  apiKey: undefined,
  autoSubmitPreferences: true,
  autoRefresh: true,
  autoRefreshIntervalMinutes: 5,
  cacheDurationMinutes: 5,
  retryFailedSubmissions: true,
  maxRetryAttempts: 3,
  requestTimeoutMs: 30000,
  minBattlesThreshold: 5,
  anonymousMode: false,
};

// ============================================
// Utility Types
// ============================================

/**
 * Generate cache key for leaderboard request
 */
export function generateLeaderboardCacheKey(params: LeaderboardFetchParams): string {
  const parts = [
    params.period || 'all-time',
    params.category || 'all',
    params.sortBy || 'rating',
    params.sortDirection || 'desc',
    params.page || 1,
    params.pageSize || 50,
    params.provider || 'all',
    params.minBattles || 0,
  ];
  return parts.join(':');
}

/**
 * Check if cache entry is valid
 */
export function isCacheValid(entry: LeaderboardCacheEntry | undefined): boolean {
  if (!entry) return false;
  return new Date(entry.expiresAt) > new Date();
}

/**
 * Convert local ArenaModelRating to RemotePreferenceSubmission format
 */
export function localToRemotePreference(
  preference: ArenaPreference,
  deviceId: string,
  quality?: RemotePreferenceSubmission['quality']
): RemotePreferenceSubmission {
  return {
    winner: preference.winner,
    loser: preference.loser,
    taskCategory: preference.taskCategory,
    reason: preference.reason,
    deviceId,
    timestamp: new Date(preference.timestamp).toISOString(),
    quality,
  };
}

/**
 * Convert RemoteModelRating to local ArenaModelRating format
 */
export function remoteToLocalRating(remote: RemoteModelRating): ArenaModelRating {
  return {
    modelId: remote.modelId,
    provider: remote.provider,
    model: remote.model,
    rating: remote.rating,
    btScore: remote.btScore,
    ci95Lower: remote.ci95Lower,
    ci95Upper: remote.ci95Upper,
    categoryRatings: remote.categoryRatings || {},
    totalBattles: remote.totalBattles,
    wins: remote.wins,
    losses: remote.losses,
    ties: remote.ties,
    winRate: remote.winRate,
    stabilityScore: remote.stabilityScore,
    updatedAt: new Date(remote.updatedAt),
  };
}
