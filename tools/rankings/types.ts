/**
 * Type definitions for OpenRouter rankings scraper
 */

export type TimeRange = 'week' | 'month' | 'all'

export type RankingSection =
  | 'leaderboard'
  | 'market_share'
  | 'categories'
  | 'languages'
  | 'programming'
  | 'context_length'
  | 'tool_calls'
  | 'images'
  | 'top_apps'

export interface ModelRanking {
  rank: number
  modelId: string
  modelName: string
  author: string
  tokens: string
  tokensRaw: number
  change: string
  changePercent: number
  changeDirection: 'up' | 'down' | 'unchanged'
  modelUrl: string
  authorUrl: string
}

export interface MarketShareEntry {
  rank: number
  author: string
  percentage: string
  percentageRaw: number
  authorUrl: string
}

export interface CategoryEntry {
  name: string
  value: string
  valueRaw: number
  percentage?: number
}

export interface AppRanking {
  rank: number
  name: string
  description: string
  tokens: string
  tokensRaw: number
  url: string
  iconUrl?: string
}

export interface ChartDataPoint {
  date: string
  value: number
  label: string
}

export interface TimelineChartData {
  title: string
  subtitle?: string
  xAxisLabels: string[]
  yAxisLabels: string[]
  series: Array<{
    name: string
    color?: string
    data: number[]
  }>
}

export interface PieChartData {
  title: string
  subtitle?: string
  data: Array<{
    name: string
    value: number
    percentage: number
    color?: string
  }>
}

export interface BarChartData {
  title: string
  subtitle?: string
  data: Array<{
    label: string
    value: number
    percentage?: number
  }>
}

export interface SectionData {
  id: string
  title: string
  subtitle?: string
  type: 'leaderboard' | 'pie' | 'bar' | 'timeline' | 'list'
  entries?: CategoryEntry[]
  chart?: TimelineChartData | PieChartData | BarChartData
}

export interface RankingsData {
  scraped_at: string
  source: string
  timeRange: TimeRange
  leaderboard: ModelRanking[]
  marketShare: MarketShareEntry[]
  topApps: AppRanking[]
  sections: SectionData[]
  topModelsChart?: TimelineChartData
}

export interface ScraperOptions {
  headless?: boolean
  timeout?: number
  screenshot?: boolean
  outputDir?: string
  verbose?: boolean
  timeRange?: TimeRange
  sections?: RankingSection[]
}

export interface ScraperResult {
  success: boolean
  data?: RankingsData
  error?: string
  screenshotPath?: string
}

export interface AllRankingsData {
  generated_at: string
  total_models: number
  total_apps: number
  rankings: RankingsData
}
