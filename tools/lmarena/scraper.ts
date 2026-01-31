/**
 * LMArena Leaderboard Scraper
 *
 * Scrapes model rankings from multiple sources:
 * 1. nakasyou/lmarena-history (JSON, primary)
 * 2. HuggingFace lmarena-ai/chatbot-arena-leaderboard (pickle files)
 * 3. lmarena/arena-catalog (model metadata)
 */

import type {
  LMArenaScraperOptions,
  LMArenaScraperResult,
  AllLeaderboardsData,
  LeaderboardData,
  LeaderboardEntry,
  HistoricalData,
  ModelMetadata,
  HuggingFaceFileEntry,
  LeaderboardCategory,
  ArenaType,
} from './types.js'
import { debug, info, warn, error as logError } from './utils/logger.js'

const LMARENA_HISTORY_JSON_URL = 'https://raw.githubusercontent.com/nakasyou/lmarena-history/main/output/scores.json'
const LMARENA_HISTORY_JSDELIVR_URL = 'https://cdn.jsdelivr.net/gh/nakasyou/lmarena-history@main/output/scores.json'
const ARENA_CATALOG_PRICES_URL = 'https://raw.githubusercontent.com/lmarena/arena-catalog/main/data/scatterplot-data.json'
const HUGGINGFACE_API_URL = 'https://huggingface.co/api/spaces/lmarena-ai/chatbot-arena-leaderboard/tree/main'

const DEFAULT_OPTIONS: Required<LMArenaScraperOptions> = {
  headless: true,
  timeout: 30000,
  screenshot: false,
  outputDir: './output',
  verbose: false,
  categories: ['overall', 'overall_style_control', 'coding', 'math', 'hard_prompt'],
  arenaTypes: ['text'],
  includeHistory: false,
  includeMetadata: true,
  useCachedJson: true,
}

/**
 * LMArena Leaderboard Scraper
 */
export class LMArenaScraper {
  private options: Required<LMArenaScraperOptions>

  constructor(options: LMArenaScraperOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  /**
   * Main scrape method
   */
  async scrape(): Promise<LMArenaScraperResult> {
    try {
      info('Starting LMArena leaderboard scrape...')

      // 1. Fetch historical JSON data (primary source)
      const historicalData = await this.fetchHistoricalJson()

      if (!historicalData) {
        return {
          success: false,
          error: 'Failed to fetch historical data from any source',
        }
      }

      // 2. Get latest date from historical data
      const dates = Object.keys(historicalData).sort()
      const latestDate = dates[dates.length - 1]
      const latestScores = historicalData[latestDate]

      debug(`Latest data from: ${latestDate}`)

      // 3. Fetch model metadata (prices, licenses)
      let metadata: ModelMetadata[] = []
      if (this.options.includeMetadata) {
        metadata = await this.fetchModelMetadata()
      }

      // 4. Process into leaderboard format
      const result = this.processScores(latestScores, latestDate, metadata)

      // 5. Add historical data if requested
      if (this.options.includeHistory) {
        result.historical = historicalData
      }

      return {
        success: true,
        data: result,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logError(`Scrape failed: ${message}`)
      return {
        success: false,
        error: message,
      }
    }
  }

  /**
   * Fetch historical JSON from nakasyou/lmarena-history
   */
  private async fetchHistoricalJson(): Promise<HistoricalData | null> {
    const urls = [LMARENA_HISTORY_JSDELIVR_URL, LMARENA_HISTORY_JSON_URL]

    for (const url of urls) {
      try {
        debug(`Fetching from: ${url}`)

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Cognia-LMArena-Scraper/1.0',
          },
          signal: AbortSignal.timeout(this.options.timeout),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = (await response.json()) as HistoricalData
        info(`Fetched historical data with ${Object.keys(data).length} dates`)
        return data
      } catch (err) {
        warn(`Failed to fetch from ${url}: ${err instanceof Error ? err.message : err}`)
      }
    }

    return null
  }

  /**
   * Fetch model metadata from arena-catalog
   */
  private async fetchModelMetadata(): Promise<ModelMetadata[]> {
    try {
      debug(`Fetching metadata from: ${ARENA_CATALOG_PRICES_URL}`)

      const response = await fetch(ARENA_CATALOG_PRICES_URL, {
        headers: {
          'User-Agent': 'Cognia-LMArena-Scraper/1.0',
        },
        signal: AbortSignal.timeout(this.options.timeout),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = (await response.json()) as Array<{
        name: string
        model_api_key: string
        input_token_price: string
        output_token_price: string
        organization: string
        license: string
        price_source?: string
        model_source?: string
      }>

      const metadata: ModelMetadata[] = data.map((item) => ({
        name: item.name,
        modelApiKey: item.model_api_key,
        inputTokenPrice: item.input_token_price,
        outputTokenPrice: item.output_token_price,
        organization: item.organization,
        license: item.license,
        priceSource: item.price_source,
        modelSource: item.model_source,
      }))

      info(`Fetched metadata for ${metadata.length} models`)
      return metadata
    } catch (err) {
      warn(`Failed to fetch model metadata: ${err instanceof Error ? err.message : err}`)
      return []
    }
  }

  /**
   * List available pickle files from HuggingFace
   */
  async listHuggingFaceFiles(): Promise<HuggingFaceFileEntry[]> {
    try {
      debug(`Fetching file list from: ${HUGGINGFACE_API_URL}`)

      const response = await fetch(HUGGINGFACE_API_URL, {
        headers: {
          'User-Agent': 'Cognia-LMArena-Scraper/1.0',
        },
        signal: AbortSignal.timeout(this.options.timeout),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const files = (await response.json()) as HuggingFaceFileEntry[]
      const pickleFiles = files.filter((f) => f.path.endsWith('.pkl'))

      info(`Found ${pickleFiles.length} pickle files on HuggingFace`)
      return pickleFiles
    } catch (err) {
      warn(`Failed to list HuggingFace files: ${err instanceof Error ? err.message : err}`)
      return []
    }
  }

  /**
   * Process raw scores into leaderboard format
   */
  private processScores(
    scores: { text: Record<string, Record<string, number>>; vision?: Record<string, Record<string, number>> },
    date: string,
    metadata: ModelMetadata[]
  ): AllLeaderboardsData {
    const metadataMap = new Map<string, ModelMetadata>()
    for (const m of metadata) {
      metadataMap.set(m.modelApiKey, m)
      // Also try model name as key
      metadataMap.set(m.name.toLowerCase(), m)
    }

    const processCategory = (categoryScores: Record<string, number>, category: string, arenaType: ArenaType): LeaderboardData => {
      const entries: LeaderboardEntry[] = []

      // Sort by score descending
      const sortedModels = Object.entries(categoryScores).sort(([, a], [, b]) => b - a)

      for (let i = 0; i < sortedModels.length; i++) {
        const [modelId, score] = sortedModels[i]
        const meta = metadataMap.get(modelId) || metadataMap.get(modelId.toLowerCase())

        entries.push({
          rank: i + 1,
          modelId,
          modelName: meta?.name || this.formatModelName(modelId),
          score: Math.round(score * 10) / 10,
          organization: meta?.organization,
          license: meta?.license,
          inputPrice: meta ? parseFloat(meta.inputTokenPrice) : undefined,
          outputPrice: meta ? parseFloat(meta.outputTokenPrice) : undefined,
        })
      }

      return {
        scrapedAt: new Date().toISOString(),
        source: 'nakasyou/lmarena-history',
        category: category as LeaderboardCategory,
        arenaType,
        entries,
        totalModels: entries.length,
        lastUpdated: this.formatDate(date),
      }
    }

    const result: AllLeaderboardsData = {
      scrapedAt: new Date().toISOString(),
      sources: ['nakasyou/lmarena-history', 'lmarena/arena-catalog'],
      text: {},
      metadata,
    }

    // Process text categories
    for (const [category, categoryScores] of Object.entries(scores.text)) {
      if (this.options.categories.length === 0 || this.options.categories.includes(category as LeaderboardCategory)) {
        result.text[category] = processCategory(categoryScores, category, 'text')
      }
    }

    // Process vision categories
    if (scores.vision && this.options.arenaTypes.includes('vision')) {
      result.vision = {}
      for (const [category, categoryScores] of Object.entries(scores.vision)) {
        if (this.options.categories.length === 0 || this.options.categories.includes(category as LeaderboardCategory)) {
          result.vision[category] = processCategory(categoryScores, category, 'vision')
        }
      }
    }

    return result
  }

  /**
   * Format model ID into readable name
   */
  private formatModelName(modelId: string): string {
    return modelId
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  /**
   * Format date from YYYYMMDD to readable format
   */
  private formatDate(dateStr: string): string {
    if (dateStr.length === 8) {
      const year = dateStr.slice(0, 4)
      const month = dateStr.slice(4, 6)
      const day = dateStr.slice(6, 8)
      return `${year}-${month}-${day}`
    }
    return dateStr
  }
}

/**
 * Quick scrape function
 */
export async function scrapeLMArena(options?: LMArenaScraperOptions): Promise<LMArenaScraperResult> {
  const scraper = new LMArenaScraper(options)
  return scraper.scrape()
}
