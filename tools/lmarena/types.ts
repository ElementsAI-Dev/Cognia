/**
 * Type definitions for LMArena leaderboard scraper
 */

/**
 * Leaderboard categories available on LMArena
 */
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
  | 'russian'

/**
 * Arena type (text or vision)
 */
export type ArenaType = 'text' | 'vision'

/**
 * Model score entry from ELO ratings
 */
export interface ModelScore {
  modelId: string
  modelName: string
  score: number
  rank: number
  organization?: string
  license?: string
}

/**
 * Category scores for a specific date
 */
export interface CategoryScores {
  [modelId: string]: number
}

/**
 * Scores organized by category
 */
export interface ArenaScores {
  [category: string]: CategoryScores
}

/**
 * Daily snapshot of all scores
 */
export interface DailySnapshot {
  date: string
  text: ArenaScores
  vision?: ArenaScores
}

/**
 * Historical data structure (from nakasyou/lmarena-history)
 */
export interface HistoricalData {
  [date: string]: {
    text: ArenaScores
    vision?: ArenaScores
  }
}

/**
 * Model metadata from arena-catalog
 */
export interface ModelMetadata {
  name: string
  modelApiKey: string
  inputTokenPrice: string
  outputTokenPrice: string
  organization: string
  license: string
  priceSource?: string
  modelSource?: string
}

/**
 * Processed leaderboard entry
 */
export interface LeaderboardEntry {
  rank: number
  modelId: string
  modelName: string
  score: number
  confidenceInterval?: {
    lower: number
    upper: number
  }
  votes?: number
  organization?: string
  license?: string
  inputPrice?: number
  outputPrice?: number
}

/**
 * Complete leaderboard data
 */
export interface LeaderboardData {
  scrapedAt: string
  source: string
  category: LeaderboardCategory
  arenaType: ArenaType
  entries: LeaderboardEntry[]
  totalModels: number
  lastUpdated?: string
}

/**
 * All leaderboards combined
 */
export interface AllLeaderboardsData {
  scrapedAt: string
  sources: string[]
  text: {
    [category: string]: LeaderboardData
  }
  vision?: {
    [category: string]: LeaderboardData
  }
  historical?: HistoricalData
  metadata?: ModelMetadata[]
}

/**
 * Scraper options
 */
export interface LMArenaScraperOptions {
  /** Use headless browser */
  headless?: boolean
  /** Request timeout in ms */
  timeout?: number
  /** Take screenshots */
  screenshot?: boolean
  /** Output directory */
  outputDir?: string
  /** Verbose logging */
  verbose?: boolean
  /** Categories to scrape */
  categories?: LeaderboardCategory[]
  /** Arena types to scrape */
  arenaTypes?: ArenaType[]
  /** Include historical data */
  includeHistory?: boolean
  /** Include model metadata */
  includeMetadata?: boolean
  /** Use cached JSON from nakasyou/lmarena-history */
  useCachedJson?: boolean
}

/**
 * Scraper result
 */
export interface LMArenaScraperResult {
  success: boolean
  data?: AllLeaderboardsData
  error?: string
  screenshotPath?: string
}

/**
 * HuggingFace file entry from API
 */
export interface HuggingFaceFileEntry {
  type: 'file' | 'directory'
  oid: string
  size: number
  path: string
  lfs?: {
    oid: string
    size: number
    pointerSize: number
  }
}

/**
 * Arena Hard Auto leaderboard entry
 */
export interface ArenaHardEntry {
  model: string
  score: number
  ratingQ025: number
  ratingQ975: number
  ci: string
  avgTokens: number
  date: string
}
