#!/usr/bin/env npx tsx
/**
 * OpenRouter Rankings CLI Tool
 *
 * @deprecated This CLI tool is deprecated. Please use the AI Tools plugin instead:
 *   - Plugin: plugins/ai-tools
 *   - Tool: openrouter_rankings
 *   - The plugin provides agent-callable tools with the same functionality.
 *
 * Command-line interface for scraping OpenRouter model rankings.
 *
 * Usage:
 *   npx tsx tools/rankings/cli.ts scrape              # Scrape rankings (default: this week)
 *   npx tsx tools/rankings/cli.ts scrape --month      # Scrape monthly rankings
 *   npx tsx tools/rankings/cli.ts scrape --all-time   # Scrape all-time rankings
 *   npx tsx tools/rankings/cli.ts show                # Show cached rankings
 *   npx tsx tools/rankings/cli.ts export --csv        # Export to CSV
 *
 * Options:
 *   --output <dir>     Output directory (default: tools/rankings/output)
 *   --timeout <ms>     Timeout for scraping (default: 30000)
 *   --no-screenshot    Skip screenshots
 *   --verbose          Verbose logging
 *   --no-headless      Run browser with UI (for debugging)
 */

console.warn('\x1b[33m⚠️  DEPRECATION WARNING: This CLI tool is deprecated.\x1b[0m')
console.warn('\x1b[33m   Please use the AI Tools plugin (plugins/ai-tools) instead.\x1b[0m')
console.warn('\x1b[33m   Tool: openrouter_rankings\x1b[0m\n')

import * as path from 'path'
import * as fs from 'fs'
import { OpenRouterRankingsScraper } from './scraper.js'
import { RankingsRenderer, type RenderFormat } from './renderer.js'
import type { RankingsData, ScraperOptions, TimeRange, AllRankingsData } from './types.js'
import {
  saveRankingsData,
  loadRankingsData,
  saveAllRankings,
  exportToCsv,
  ensureOutputDir,
  countModels,
  countApps,
} from './utils/output.js'
import { header, divider, success, error, info, setVerbose } from './utils/logger.js'

const DEFAULT_OUTPUT_DIR = path.join(import.meta.dirname || __dirname, 'output')

interface CliOptions {
  command: string
  timeRange: TimeRange
  output?: string
  timeout?: number
  screenshot?: boolean
  verbose?: boolean
  headless?: boolean
  csv?: boolean
  format?: RenderFormat
  theme?: 'light' | 'dark'
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const options: CliOptions = {
    command: args[0] || 'help',
    timeRange: 'week',
    screenshot: true,
    headless: true,
    verbose: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--week') {
      options.timeRange = 'week'
    } else if (arg === '--month') {
      options.timeRange = 'month'
    } else if (arg === '--all-time') {
      options.timeRange = 'all'
    } else if (arg === '--output' && args[i + 1]) {
      options.output = args[++i]
    } else if (arg === '--timeout' && args[i + 1]) {
      options.timeout = parseInt(args[++i], 10)
    } else if (arg === '--no-screenshot') {
      options.screenshot = false
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true
    } else if (arg === '--no-headless') {
      options.headless = false
    } else if (arg === '--csv') {
      options.csv = true
    } else if (arg === '--html') {
      options.format = 'html'
    } else if (arg === '--markdown' || arg === '--md') {
      options.format = 'markdown'
    } else if (arg === '--json') {
      options.format = 'json'
    } else if (arg === '--light') {
      options.theme = 'light'
    } else if (arg === '--dark') {
      options.theme = 'dark'
    }
  }

  return options
}

function printHelp(): void {
  console.log(`
OpenRouter Rankings CLI Tool
============================

Scrapes model rankings and usage data from https://openrouter.ai/rankings

Commands:
  scrape              Scrape rankings from OpenRouter
  show                Show cached rankings data
  export              Export cached data to JSON/CSV

Time Range Options (for scrape):
  --week              This week's rankings (default)
  --month             This month's rankings
  --all-time          All-time rankings

General Options:
  --output <dir>      Output directory (default: tools/rankings/output)
  --timeout <ms>      Timeout for scraping (default: 30000)
  --no-screenshot     Skip taking screenshots
  --no-headless       Run browser with UI (for debugging)
  --verbose, -v       Enable verbose logging
  --csv               Export to CSV format (for export command)

Render Options:
  --html              Render as HTML page
  --markdown, --md    Render as Markdown
  --json              Output raw JSON
  --light             Use light theme (for HTML)
  --dark              Use dark theme (for HTML, default)

Examples:
  npx tsx tools/rankings/cli.ts scrape
  npx tsx tools/rankings/cli.ts scrape --month
  npx tsx tools/rankings/cli.ts scrape --all-time --verbose
  npx tsx tools/rankings/cli.ts show
  npx tsx tools/rankings/cli.ts render --html > rankings.html
  npx tsx tools/rankings/cli.ts render --markdown > rankings.md
  npx tsx tools/rankings/cli.ts export --csv

Data Extracted:
  - LLM Leaderboard (top models by token usage)
  - Market Share by author/provider
  - Top Apps using OpenRouter
`)
}

async function scrapeRankings(options: CliOptions): Promise<void> {
  const scraperOptions: ScraperOptions = {
    headless: options.headless,
    timeout: options.timeout || 30000,
    screenshot: options.screenshot,
    outputDir: options.output || DEFAULT_OUTPUT_DIR,
    verbose: options.verbose,
    timeRange: options.timeRange,
  }

  header(`Scraping OpenRouter Rankings (${options.timeRange})`)
  info(`Time range: ${options.timeRange}`)

  const scraper = new OpenRouterRankingsScraper(scraperOptions)
  const result = await scraper.scrape()

  if (result.success && result.data) {
    saveRankingsData(result.data, scraperOptions.outputDir!)

    if (options.csv) {
      exportToCsv(result.data, scraperOptions.outputDir!)
    }

    divider()
    console.log('Summary')
    divider()
    console.log(`✅ Success`)
    console.log(`📊 Models: ${countModels(result.data)}`)
    console.log(`📱 Apps: ${countApps(result.data)}`)
    console.log(`🏢 Market Share Entries: ${result.data.marketShare.length}`)

    if (result.screenshotPath) {
      console.log(`📸 Screenshot: ${result.screenshotPath}`)
    }
  } else {
    error(`Scraping failed: ${result.error}`)
    process.exit(1)
  }
}

function showRankings(options: CliOptions): void {
  const outputDir = options.output || DEFAULT_OUTPUT_DIR
  const data = loadRankingsData(options.timeRange, outputDir)

  if (!data) {
    error(`No cached data found for time range: ${options.timeRange}`)
    info(`Run: npx tsx tools/rankings/cli.ts scrape --${options.timeRange === 'all' ? 'all-time' : options.timeRange}`)
    return
  }

  header(`OpenRouter Rankings (${data.timeRange})`)

  console.log(`📅 Scraped: ${data.scraped_at}`)
  console.log(`🔗 Source: ${data.source}`)
  console.log('')

  // Show leaderboard
  console.log('📊 LLM Leaderboard')
  divider()

  for (const model of data.leaderboard.slice(0, 20)) {
    const change = model.changeDirection === 'up' ? `↑${model.changePercent}%` : model.changeDirection === 'down' ? `↓${model.changePercent}%` : ''
    console.log(`  ${String(model.rank).padStart(2)}. ${model.modelName.padEnd(35)} ${model.tokens.padStart(15)} ${change}`)
  }

  if (data.leaderboard.length > 20) {
    console.log(`     ... and ${data.leaderboard.length - 20} more`)
  }

  console.log('')

  // Show market share
  if (data.marketShare.length > 0) {
    console.log('📈 Market Share')
    divider()

    for (const entry of data.marketShare.slice(0, 10)) {
      console.log(`  ${String(entry.rank).padStart(2)}. ${entry.author.padEnd(20)} ${entry.percentage}`)
    }

    console.log('')
  }

  // Show top apps
  if (data.topApps.length > 0) {
    console.log('📱 Top Apps')
    divider()

    for (const app of data.topApps.slice(0, 10)) {
      console.log(`  ${String(app.rank).padStart(2)}. ${app.name.padEnd(25)} ${app.tokens.padStart(15)}`)
      if (app.description) {
        console.log(`      ${app.description.slice(0, 50)}${app.description.length > 50 ? '...' : ''}`)
      }
    }

    console.log('')
  }

  console.log(`Total: ${countModels(data)} models, ${countApps(data)} apps`)
}

function exportData(options: CliOptions): void {
  const outputDir = options.output || DEFAULT_OUTPUT_DIR
  ensureOutputDir(outputDir)

  // Load cached data for all time ranges
  const timeRanges: TimeRange[] = ['week', 'month', 'all']
  let latestData: RankingsData | null = null

  for (const timeRange of timeRanges) {
    const data = loadRankingsData(timeRange, outputDir)
    if (data) {
      if (!latestData || new Date(data.scraped_at) > new Date(latestData.scraped_at)) {
        latestData = data
      }

      if (options.csv) {
        exportToCsv(data, outputDir)
      }
    }
  }

  if (!latestData) {
    error('No cached data found. Run scrape first.')
    info('Example: npx tsx tools/rankings/cli.ts scrape')
    return
  }

  // Save combined data
  const allData: AllRankingsData = {
    generated_at: new Date().toISOString(),
    total_models: countModels(latestData),
    total_apps: countApps(latestData),
    rankings: latestData,
  }

  saveAllRankings(allData, outputDir)

  success(`Exported ${allData.total_models} models and ${allData.total_apps} apps`)
}

async function main(): Promise<void> {
  const options = parseArgs()

  if (options.verbose) {
    setVerbose(true)
  }

  switch (options.command) {
    case 'scrape':
      await scrapeRankings(options)
      break

    case 'show':
      showRankings(options)
      break

    case 'export':
      exportData(options)
      break

    case 'render':
      renderData(options)
      break

    case 'help':
    default:
      printHelp()
      break
  }
}

function renderData(options: CliOptions): void {
  const outputDir = options.output || DEFAULT_OUTPUT_DIR
  const data = loadRankingsData(options.timeRange, outputDir)

  if (!data) {
    error(`No cached data found for time range: ${options.timeRange}`)
    info(`Run: npx tsx tools/rankings/cli.ts scrape --${options.timeRange === 'all' ? 'all-time' : options.timeRange}`)
    process.exit(1)
  }

  const format = options.format || 'terminal'
  const renderer = new RankingsRenderer({
    format,
    theme: options.theme || 'dark',
    maxModels: 50,
    maxApps: 20,
    maxMarketShare: 15,
    showChange: true,
  })

  const output = renderer.render(data)

  if (format === 'html') {
    const htmlPath = path.join(outputDir, `openrouter-rankings-${data.timeRange}.html`)
    fs.writeFileSync(htmlPath, output)
    success(`Rendered HTML: ${htmlPath}`)
  } else if (format === 'markdown') {
    const mdPath = path.join(outputDir, `openrouter-rankings-${data.timeRange}.md`)
    fs.writeFileSync(mdPath, output)
    success(`Rendered Markdown: ${mdPath}`)
  } else {
    console.log(output)
  }
}

main().catch(console.error)
