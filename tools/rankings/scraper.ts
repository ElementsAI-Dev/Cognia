/**
 * OpenRouter Rankings Scraper
 *
 * Scrapes model rankings and usage data from https://openrouter.ai/rankings
 * Uses Playwright for JavaScript-rendered content extraction.
 */

import { chromium, type Browser, type Page } from 'playwright'
import * as path from 'path'
import type {
  RankingsData,
  ModelRanking,
  MarketShareEntry,
  AppRanking,
  ScraperOptions,
  ScraperResult,
  TimeRange,
  SectionData,
} from './types.js'
import { ensureOutputDir, saveRankingsData } from './utils/output.js'
import { verbose, info, error, success } from './utils/logger.js'

const RANKINGS_URL = 'https://openrouter.ai/rankings'
const DEFAULT_TIMEOUT = 30000

export class OpenRouterRankingsScraper {
  private options: Required<ScraperOptions>
  private browser: Browser | null = null
  private page: Page | null = null

  constructor(options: ScraperOptions = {}) {
    this.options = {
      headless: options.headless ?? true,
      timeout: options.timeout ?? DEFAULT_TIMEOUT,
      screenshot: options.screenshot ?? true,
      outputDir: options.outputDir ?? path.join(import.meta.dirname || __dirname, 'output'),
      verbose: options.verbose ?? false,
      timeRange: options.timeRange ?? 'week',
      sections: options.sections ?? ['leaderboard', 'market_share', 'top_apps'],
    }
  }

  async scrape(): Promise<ScraperResult> {
    try {
      await this.initBrowser()

      info(`Navigating to ${RANKINGS_URL}`)
      await this.page!.goto(RANKINGS_URL, {
        waitUntil: 'networkidle',
        timeout: this.options.timeout,
      })

      // Wait for the leaderboard content to load
      await this.page!.waitForSelector('text=LLM Leaderboard', { timeout: this.options.timeout })
      verbose('Page loaded successfully')

      // Select time range if needed
      if (this.options.timeRange !== 'week') {
        await this.selectTimeRange(this.options.timeRange)
      }

      // Take screenshot if enabled
      let screenshotPath: string | undefined
      if (this.options.screenshot) {
        screenshotPath = await this.takeScreenshot()
      }

      // Extract data
      const data = await this.extractRankingsData()

      await this.closeBrowser()

      return {
        success: true,
        data,
        screenshotPath,
      }
    } catch (e) {
      error(`Scraping failed: ${e}`)
      await this.closeBrowser()
      return {
        success: false,
        error: String(e),
      }
    }
  }

  async scrapeAndSave(): Promise<RankingsData | null> {
    const result = await this.scrape()

    if (result.success && result.data) {
      saveRankingsData(result.data, this.options.outputDir)
      return result.data
    }

    return null
  }

  private async initBrowser(): Promise<void> {
    verbose('Launching browser...')
    this.browser = await chromium.launch({
      headless: this.options.headless,
    })
    this.page = await this.browser.newPage()
    await this.page.setViewportSize({ width: 1920, height: 1080 })
  }

  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.page = null
    }
  }

  private async selectTimeRange(timeRange: TimeRange): Promise<void> {
    verbose(`Selecting time range: ${timeRange}`)

    const timeRangeMap: Record<TimeRange, string> = {
      week: 'This Week',
      month: 'This Month',
      all: 'All Time',
    }

    try {
      // Find and click the time range dropdown
      const dropdown = await this.page!.$('button:has-text("This Week"), button:has-text("This Month"), button:has-text("All Time")')
      if (dropdown) {
        await dropdown.click()
        await this.page!.waitForTimeout(500)

        // Select the desired option
        await this.page!.click(`text=${timeRangeMap[timeRange]}`)
        await this.page!.waitForTimeout(1000)
        verbose(`Time range set to: ${timeRange}`)
      }
    } catch (e) {
      verbose(`Could not change time range: ${e}`)
    }
  }

  private async clickShowMore(): Promise<void> {
    verbose('Looking for Show more buttons...')

    try {
      // Click all "Show more" buttons to reveal full data
      let clicked = 0
      for (let i = 0; i < 5; i++) {
        const showMoreBtn = this.page!.locator('button', { hasText: 'Show more' }).first()
        if (await showMoreBtn.count() > 0) {
          await showMoreBtn.click()
          await this.page!.waitForTimeout(800)
          clicked++
        } else {
          break
        }
      }
      if (clicked > 0) {
        verbose(`Clicked Show more ${clicked} time(s)`)
      }
    } catch (e) {
      verbose(`Could not click Show more: ${e}`)
    }
  }

  private async takeScreenshot(): Promise<string> {
    ensureOutputDir(this.options.outputDir)
    const filename = `openrouter-rankings-${Date.now()}.png`
    const filepath = path.join(this.options.outputDir, filename)

    await this.page!.screenshot({ path: filepath, fullPage: true })
    verbose(`Screenshot saved: ${filepath}`)
    return filepath
  }

  private async extractRankingsData(): Promise<RankingsData> {
    info('Extracting rankings data...')

    // Click "Show more" to reveal all models
    await this.clickShowMore()

    const leaderboard = await this.extractLeaderboard()
    const topApps = await this.extractTopApps()

    // Get page text for additional parsing
    const pageText = await this.page!.evaluate(() => document.body.innerText)

    // Try to get market share from page (has actual percentages), fallback to calculated
    let marketShare = this.parseMarketShareFromText(pageText)
    if (marketShare.length === 0) {
      marketShare = this.calculateMarketShare(leaderboard)
    }

    // Extract section data from page text
    const sections = await this.extractAllSections()

    const data: RankingsData = {
      scraped_at: new Date().toISOString(),
      source: RANKINGS_URL,
      timeRange: this.options.timeRange,
      leaderboard,
      marketShare,
      topApps,
      sections,
    }

    success(`Extracted ${leaderboard.length} models, ${marketShare.length} authors, ${topApps.length} apps, ${sections.length} sections`)
    return data
  }

  private calculateMarketShare(leaderboard: ModelRanking[]): MarketShareEntry[] {
    verbose('Calculating market share from leaderboard...')

    // Aggregate tokens by author
    const authorTokens: Record<string, number> = {}

    for (const model of leaderboard) {
      if (!authorTokens[model.author]) {
        authorTokens[model.author] = 0
      }
      authorTokens[model.author] += model.tokensRaw
    }

    // Calculate total
    const total = Object.values(authorTokens).reduce((sum, t) => sum + t, 0)

    if (total === 0) {
      return []
    }

    // Convert to market share entries
    const entries: MarketShareEntry[] = Object.entries(authorTokens)
      .map(([author, tokens]) => ({
        rank: 0,
        author,
        percentage: ((tokens / total) * 100).toFixed(1) + '%',
        percentageRaw: (tokens / total) * 100,
        authorUrl: `https://openrouter.ai/${author}`,
      }))
      .sort((a, b) => b.percentageRaw - a.percentageRaw)
      .slice(0, 15)

    // Assign ranks
    entries.forEach((e, i) => {
      e.rank = i + 1
    })

    verbose(`Calculated ${entries.length} market share entries`)
    return entries
  }

  private async extractAllSections(): Promise<SectionData[]> {
    verbose('Extracting all sections...')

    // Scroll through the page to load all lazy-loaded content
    for (let i = 0; i < 5; i++) {
      await this.page!.evaluate(() => window.scrollBy(0, window.innerHeight))
      await this.page!.waitForTimeout(300)
    }
    await this.page!.evaluate(() => window.scrollTo(0, 0))
    await this.page!.waitForTimeout(500)

    // Get full page text for parsing
    const pageText = await this.page!.evaluate(() => document.body.innerText)

    const sections: SectionData[] = []

    // Extract Images section data
    const imagesData = this.parseImagesSection(pageText)
    if (imagesData) sections.push(imagesData)

    verbose(`Found ${sections.length} chart sections`)
    return sections
  }

  private parseImagesSection(pageText: string): SectionData | null {
    verbose('Parsing Images section from page text...')

    const entries: Array<{ name: string; value: string; valueRaw: number; percentage: number }> = []

    // Find the Images section in the text
    const imagesStart = pageText.indexOf('Images')
    const imagesEnd = pageText.indexOf('Top Apps')

    if (imagesStart === -1) return null

    const imagesText = pageText.substring(imagesStart, imagesEnd > imagesStart ? imagesEnd : undefined)
    const lines = imagesText.split('\n')

    for (const line of lines) {
      // Match pattern: "1." or just model info with percentage
      // Example: "Gemini 2.5 Flash Lite" followed by "159M" and "55.5%"
      const trimmed = line.trim()

      // Skip short lines
      if (trimmed.length < 3) continue

      // Check if this line has a percentage
      if (trimmed.match(/^\d+(?:\.\d+)?%$/)) {
        // This is just a percentage, look at previous entries
        continue
      }

      // Look for model entries - pattern varies
      // Try to match "ModelName by author XXM XX.X%"
      const match = trimmed.match(/^(.+?)\s+by\s+\w+\s+(\d+(?:\.\d+)?[KMBT]?)\s+(\d+(?:\.\d+)?)\s*%$/)
      if (match) {
        const name = match[1].replace(/^\d+\.\s*/, '').trim()
        const valueStr = match[2]
        const percentage = parseFloat(match[3])

        const multipliers: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 }
        const suffix = valueStr.slice(-1).toUpperCase()
        const valueRaw = multipliers[suffix]
          ? parseFloat(valueStr.slice(0, -1)) * multipliers[suffix]
          : parseFloat(valueStr)

        if (name && !entries.some((e) => e.name === name)) {
          entries.push({ name, value: valueStr, valueRaw, percentage })
        }
      }
    }

    if (entries.length === 0) return null

    return {
      id: 'images',
      title: 'Images',
      subtitle: 'Total images processed on OpenRouter',
      type: 'pie',
      entries,
      chart: {
        title: 'Images',
        data: entries.map((e) => ({
          name: e.name,
          value: e.valueRaw,
          percentage: e.percentage,
        })),
      },
    }
  }

  private parseMarketShareFromText(pageText: string): MarketShareEntry[] {
    verbose('Parsing market share from page text...')

    const entries: MarketShareEntry[] = []

    // Find the Market Share section
    const marketStart = pageText.indexOf('Market Share')
    const marketEnd = pageText.indexOf('Categories')

    if (marketStart === -1) return []

    const marketText = pageText.substring(marketStart, marketEnd > marketStart ? marketEnd : marketStart + 3000)

    // Page text has data on separate lines like:
    // 1.
    // google
    // 1.6T
    // 23.9%
    // So we need to look for patterns across multiple lines

    // Use regex to find all author entries with percentages
    // Pattern: author name followed by value and percentage
    const pattern = /(\d+)\.\n(\w[\w\-]*)\n[\d\.]+[KMBT]?\n(\d+(?:\.\d+)?)\s*%/g
    let match

    while ((match = pattern.exec(marketText)) !== null) {
      const author = match[2].toLowerCase()
      const percentageRaw = parseFloat(match[3])

      if (!entries.some((e) => e.author === author)) {
        entries.push({
          rank: parseInt(match[1]),
          author,
          percentage: percentageRaw.toFixed(1) + '%',
          percentageRaw,
          authorUrl: `https://openrouter.ai/${author}`,
        })
      }
    }

    return entries.sort((a, b) => a.rank - b.rank)
  }

  private async extractLeaderboard(): Promise<ModelRanking[]> {
    verbose('Extracting leaderboard...')

    const rankings: ModelRanking[] = await this.page!.evaluate(() => {
      const results: ModelRanking[] = []

      // Find by structure - items containing rank numbers and model links
      const allItems = document.querySelectorAll('div')

      for (const item of allItems) {
        // Look for items that contain a rank number pattern like "1.", "2.", etc.
        const text = item.textContent || ''
        const rankMatch = text.match(/^(\d{1,3})\.\s/)

        if (rankMatch && item.querySelector('a[href*="/"]')) {
          const rank = parseInt(rankMatch[1], 10)

          // Get model link
          const modelLink = item.querySelector('a[href^="/"][href*="/"]') as HTMLAnchorElement
          if (!modelLink) continue

          const href = modelLink.getAttribute('href') || ''
          // Skip if it's not a model link
          if (href.startsWith('/docs') || href.startsWith('/chat') || href.startsWith('/rankings')) continue

          const modelName = modelLink.textContent?.trim() || ''
          const modelId = href.replace(/^\//, '')

          // Get author
          let author = ''
          let authorUrl = ''

          const allLinks = item.querySelectorAll('a')
          for (const link of allLinks) {
            const linkHref = link.getAttribute('href') || ''
            // Author links are shorter (just /author-name)
            if (linkHref.match(/^\/[a-z0-9-]+$/i) && !linkHref.includes('/')) {
              author = link.textContent?.trim() || ''
              authorUrl = `https://openrouter.ai${linkHref}`
              break
            }
          }

          // Extract from modelId if author not found
          if (!author && modelId.includes('/')) {
            author = modelId.split('/')[0]
            authorUrl = `https://openrouter.ai/${author}`
          }

          // Get tokens
          let tokens = ''
          let tokensRaw = 0
          const tokensMatch = text.match(/(\d+(?:\.\d+)?[KMBT]?)\s*tokens/i)
          if (tokensMatch) {
            tokens = tokensMatch[1] + ' tokens'
            const numStr = tokensMatch[1]
            const multipliers: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 }
            const suffix = numStr.slice(-1).toUpperCase()
            if (multipliers[suffix]) {
              tokensRaw = parseFloat(numStr.slice(0, -1)) * multipliers[suffix]
            } else {
              tokensRaw = parseFloat(numStr)
            }
          }

          // Get change percentage
          let change = ''
          let changePercent = 0
          let changeDirection: 'up' | 'down' | 'unchanged' = 'unchanged'

          const changeMatch = text.match(/([▲▼↑↓]?\s*\d+(?:\.\d+)?%)/i)
          if (changeMatch) {
            change = changeMatch[1]
            changePercent = parseFloat(change.replace(/[▲▼↑↓%\s]/g, ''))
            if (change.includes('▲') || change.includes('↑') || !change.includes('▼')) {
              changeDirection = 'up'
            } else {
              changeDirection = 'down'
            }
          }

          // Avoid duplicates
          if (!results.find((r) => r.rank === rank && r.modelId === modelId)) {
            results.push({
              rank,
              modelId,
              modelName,
              author,
              tokens,
              tokensRaw,
              change,
              changePercent,
              changeDirection,
              modelUrl: `https://openrouter.ai/${modelId}`,
              authorUrl,
            })
          }
        }
      }

      return results.sort((a, b) => a.rank - b.rank).slice(0, 50)
    })

    // If DOM extraction failed, try alternative method
    if (rankings.length === 0) {
      return this.extractLeaderboardAlt()
    }

    return rankings
  }

  private async extractLeaderboardAlt(): Promise<ModelRanking[]> {
    verbose('Using alternative leaderboard extraction...')

    const rankings: ModelRanking[] = await this.page!.evaluate(() => {
      const results: ModelRanking[] = []

      // Find all links that look like model links
      const modelLinks = document.querySelectorAll('a[href^="/"][href*="/"]')

      let currentRank = 0
      for (const link of modelLinks) {
        const href = link.getAttribute('href') || ''

        // Skip non-model links
        if (
          href.startsWith('/docs') ||
          href.startsWith('/chat') ||
          href.startsWith('/rankings') ||
          href.startsWith('/enterprise') ||
          href.startsWith('/pricing') ||
          href.startsWith('/models') ||
          href.includes('_rsc')
        ) {
          continue
        }

        // Check if it's a model link (author/model format)
        const parts = href.replace(/^\//, '').split('/')
        if (parts.length !== 2) continue

        const [author, modelSlug] = parts
        const modelName = link.textContent?.trim() || modelSlug

        // Get parent container to find tokens and change
        const container = link.closest('div')
        if (!container) continue

        const containerText = container.textContent || ''

        // Extract tokens
        let tokens = ''
        let tokensRaw = 0
        const tokensMatch = containerText.match(/(\d+(?:\.\d+)?[KMBT]?)\s*tokens/i)
        if (tokensMatch) {
          tokens = tokensMatch[1] + ' tokens'
          const numStr = tokensMatch[1]
          const multipliers: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 }
          const suffix = numStr.slice(-1).toUpperCase()
          if (multipliers[suffix]) {
            tokensRaw = parseFloat(numStr.slice(0, -1)) * multipliers[suffix]
          } else {
            tokensRaw = parseFloat(numStr)
          }
        }

        // Skip if no tokens found (probably not a rankings entry)
        if (!tokens) continue

        currentRank++

        // Extract change
        let change = ''
        let changePercent = 0
        let changeDirection: 'up' | 'down' | 'unchanged' = 'unchanged'

        const changeMatch = containerText.match(/(\d+(?:\.\d+)?%)/i)
        if (changeMatch) {
          change = changeMatch[1]
          changePercent = parseFloat(change.replace('%', ''))
          changeDirection = 'up'
        }

        const modelId = `${author}/${modelSlug}`

        if (!results.find((r) => r.modelId === modelId)) {
          results.push({
            rank: currentRank,
            modelId,
            modelName,
            author,
            tokens,
            tokensRaw,
            change,
            changePercent,
            changeDirection,
            modelUrl: `https://openrouter.ai/${modelId}`,
            authorUrl: `https://openrouter.ai/${author}`,
          })
        }
      }

      return results.slice(0, 50)
    })

    return rankings
  }

  private async extractTopApps(): Promise<AppRanking[]> {
    verbose('Extracting top apps...')

    // Use Playwright locators for more reliable extraction
    const appLinks = this.page!.locator('a[href*="/apps?url="]')
    const count = await appLinks.count()
    verbose(`Found ${count} app links`)

    const results: AppRanking[] = []
    const seen = new Set<string>()

    for (let i = 0; i < Math.min(count, 25); i++) {
      try {
        const link = appLinks.nth(i)
        const name = (await link.textContent())?.trim() || ''
        if (!name || seen.has(name)) continue
        seen.add(name)

        const href = (await link.getAttribute('href')) || ''

        // Get parent container text for tokens
        const parent = link.locator('xpath=ancestor::div[1]/parent::div')
        const parentText = (await parent.textContent()) || ''

        const tokensMatch = parentText.match(/(\d+(?:\.\d+)?[KMBT]?)\s*tokens/i)
        if (!tokensMatch) continue

        const numStr = tokensMatch[1]
        const multipliers: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 }
        const suffix = numStr.slice(-1).toUpperCase()
        const tokensRaw = multipliers[suffix]
          ? parseFloat(numStr.slice(0, -1)) * multipliers[suffix]
          : parseFloat(numStr)

        // Extract description - look for text that's not the name or tokens
        let description = ''
        const descMatch = parentText.match(/([A-Z][a-z][\w\s,.-]+?)(?:\d+(?:\.\d+)?[KMBT]?\s*tokens|$)/i)
        if (descMatch && descMatch[1] && !descMatch[1].includes(name)) {
          description = descMatch[1].trim()
        }

        results.push({
          rank: results.length + 1,
          name,
          description,
          tokens: numStr + ' tokens',
          tokensRaw,
          url: `https://openrouter.ai${href}`,
          iconUrl: undefined,
        })
      } catch {
        // Skip this app if extraction fails
      }
    }

    verbose(`Extracted ${results.length} apps`)
    return results
  }
}
