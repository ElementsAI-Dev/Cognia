#!/usr/bin/env npx tsx
/**
 * LMArena Leaderboard CLI Tool
 *
 * @deprecated This CLI tool is deprecated. Please use the AI Tools plugin instead:
 *   - Plugin: plugins/ai-tools
 *   - Tool: lmarena_leaderboard
 *   - The plugin provides agent-callable tools with the same functionality.
 *
 * Command-line interface for scraping LMArena model rankings.
 *
 * Usage:
 *   npx tsx tools/lmarena/cli.ts scrape              # Scrape latest leaderboard
 *   npx tsx tools/lmarena/cli.ts scrape --history    # Include historical data
 *   npx tsx tools/lmarena/cli.ts show                # Show cached leaderboard
 *   npx tsx tools/lmarena/cli.ts show --category coding  # Show specific category
 *   npx tsx tools/lmarena/cli.ts export --csv        # Export to CSV
 *   npx tsx tools/lmarena/cli.ts render --html       # Render as HTML
 *   npx tsx tools/lmarena/cli.ts render --markdown   # Render as Markdown
 *   npx tsx tools/lmarena/cli.ts files               # List HuggingFace pickle files
 *
 * Options:
 *   --output <dir>     Output directory (default: tools/lmarena/output)
 *   --timeout <ms>     Timeout for requests (default: 30000)
 *   --verbose          Verbose logging
 *   --category <cat>   Filter by category (overall, coding, math, etc.)
 *   --max <n>          Max models to display (default: 30)
 */

console.warn('\x1b[33m⚠️  DEPRECATION WARNING: This CLI tool is deprecated.\x1b[0m')
console.warn('\x1b[33m   Please use the AI Tools plugin (plugins/ai-tools) instead.\x1b[0m')
console.warn('\x1b[33m   Tool: lmarena_leaderboard\x1b[0m\n')

import * as path from 'path'
import * as fs from 'fs'
import { LMArenaScraper } from './scraper.js'
import { LMArenaRenderer, type RenderFormat } from './renderer.js'
import type { LMArenaScraperOptions, AllLeaderboardsData, LeaderboardCategory } from './types.js'
import { saveLeaderboardData, loadLeaderboardData, exportAllToCsv, countUniqueModels, ensureOutputDir } from './utils/output.js'
import { header, divider, success, error, info, setVerbose } from './utils/logger.js'

const DEFAULT_OUTPUT_DIR = path.join(import.meta.dirname || __dirname, 'output')

interface CliOptions {
  command: string
  output?: string
  timeout?: number
  verbose?: boolean
  history?: boolean
  csv?: boolean
  format?: RenderFormat
  theme?: 'light' | 'dark'
  category?: LeaderboardCategory
  max?: number
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const options: CliOptions = {
    command: args[0] || 'help',
    verbose: false,
    history: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--output' && args[i + 1]) {
      options.output = args[++i]
    } else if (arg === '--timeout' && args[i + 1]) {
      options.timeout = parseInt(args[++i], 10)
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true
    } else if (arg === '--history') {
      options.history = true
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
    } else if (arg === '--category' && args[i + 1]) {
      options.category = args[++i] as LeaderboardCategory
    } else if (arg === '--max' && args[i + 1]) {
      options.max = parseInt(args[++i], 10)
    }
  }

  return options
}

function printHelp(): void {
  console.log(`
LMArena Leaderboard CLI Tool
============================

Scrapes model rankings from LMArena (Chatbot Arena) leaderboard.

Data Sources:
  - nakasyou/lmarena-history (JSON, primary)
  - lmarena/arena-catalog (model metadata/prices)
  - HuggingFace lmarena-ai/chatbot-arena-leaderboard (pickle files)

Commands:
  scrape              Scrape latest leaderboard data
  show                Show cached leaderboard data
  export              Export cached data to JSON/CSV
  render              Render leaderboard as HTML/Markdown
  files               List available HuggingFace pickle files

Scrape Options:
  --history           Include historical data (larger output)
  --category <cat>    Filter to specific category

General Options:
  --output <dir>      Output directory (default: tools/lmarena/output)
  --timeout <ms>      Timeout for requests (default: 30000)
  --verbose, -v       Enable verbose logging
  --max <n>           Max models to display (default: 30)

Render Options:
  --html              Render as HTML page
  --markdown, --md    Render as Markdown
  --json              Output raw JSON
  --light             Use light theme (for HTML)
  --dark              Use dark theme (for HTML, default)

Categories:
  overall             Overall rankings (default)
  overall_style_control  Style-controlled rankings
  coding              Coding tasks
  math                Math problems
  hard_prompt         Difficult prompts
  creative_writing    Creative writing
  english, chinese, japanese, korean, etc.

Examples:
  npx tsx tools/lmarena/cli.ts scrape
  npx tsx tools/lmarena/cli.ts scrape --history --verbose
  npx tsx tools/lmarena/cli.ts show --category coding
  npx tsx tools/lmarena/cli.ts render --html > leaderboard.html
  npx tsx tools/lmarena/cli.ts render --markdown --max 50 > leaderboard.md
  npx tsx tools/lmarena/cli.ts export --csv

Data Extracted:
  - ELO scores for 100+ models
  - Multiple categories (overall, coding, math, etc.)
  - Model metadata (organization, license, pricing)
  - Historical score trends (optional)
`)
}

async function scrapeLeaderboard(options: CliOptions): Promise<void> {
  const scraperOptions: LMArenaScraperOptions = {
    timeout: options.timeout || 30000,
    outputDir: options.output || DEFAULT_OUTPUT_DIR,
    verbose: options.verbose,
    includeHistory: options.history,
    includeMetadata: true,
    categories: options.category ? [options.category] : [],
  }

  header('Scraping LMArena Leaderboard')
  if (options.history) {
    info('Including historical data (this may take longer)')
  }

  const scraper = new LMArenaScraper(scraperOptions)
  const result = await scraper.scrape()

  if (result.success && result.data) {
    saveLeaderboardData(result.data, scraperOptions.outputDir!)

    if (options.csv) {
      exportAllToCsv(result.data, scraperOptions.outputDir!)
    }

    divider()
    console.log('Summary')
    divider()
    success('Scrape completed successfully')
    console.log(`📊 Unique Models: ${countUniqueModels(result.data)}`)
    console.log(`📁 Categories: ${Object.keys(result.data.text).length}`)
    if (result.data.metadata) {
      console.log(`💰 Models with pricing: ${result.data.metadata.length}`)
    }
    if (result.data.historical) {
      console.log(`📅 Historical dates: ${Object.keys(result.data.historical).length}`)
    }
  } else {
    error(`Scraping failed: ${result.error}`)
    process.exit(1)
  }
}

function showLeaderboard(options: CliOptions): void {
  const outputDir = options.output || DEFAULT_OUTPUT_DIR
  const data = loadLeaderboardData(outputDir)

  if (!data) {
    error('No cached data found')
    info('Run: npx tsx tools/lmarena/cli.ts scrape')
    return
  }

  const renderer = new LMArenaRenderer({
    format: 'terminal',
    maxModels: options.max || 30,
    showOrganization: true,
    showPrices: true,
  })

  // Filter to specific category if requested
  if (options.category) {
    const categoryData = data.text[options.category]
    if (!categoryData) {
      error(`Category not found: ${options.category}`)
      info(`Available categories: ${Object.keys(data.text).join(', ')}`)
      return
    }

    const filteredData: AllLeaderboardsData = {
      ...data,
      text: { [options.category]: categoryData },
    }
    console.log(renderer.render(filteredData))
  } else {
    console.log(renderer.render(data))
  }
}

function renderData(options: CliOptions): void {
  const outputDir = options.output || DEFAULT_OUTPUT_DIR
  const data = loadLeaderboardData(outputDir)

  if (!data) {
    error('No cached data found')
    info('Run: npx tsx tools/lmarena/cli.ts scrape')
    process.exit(1)
  }

  const format = options.format || 'terminal'
  const renderer = new LMArenaRenderer({
    format,
    theme: options.theme || 'dark',
    maxModels: options.max || 50,
    showOrganization: true,
    showPrices: true,
  })

  // Filter to specific category if requested
  let renderData = data
  if (options.category) {
    const categoryData = data.text[options.category]
    if (!categoryData) {
      error(`Category not found: ${options.category}`)
      process.exit(1)
    }
    renderData = { ...data, text: { [options.category]: categoryData } }
  }

  const output = renderer.render(renderData)

  if (format === 'html') {
    const htmlPath = path.join(outputDir, 'lmarena-leaderboard.html')
    fs.writeFileSync(htmlPath, output)
    success(`Rendered HTML: ${htmlPath}`)
  } else if (format === 'markdown') {
    const mdPath = path.join(outputDir, 'lmarena-leaderboard.md')
    fs.writeFileSync(mdPath, output)
    success(`Rendered Markdown: ${mdPath}`)
  } else {
    console.log(output)
  }
}

function exportData(options: CliOptions): void {
  const outputDir = options.output || DEFAULT_OUTPUT_DIR
  ensureOutputDir(outputDir)

  const data = loadLeaderboardData(outputDir)

  if (!data) {
    error('No cached data found. Run scrape first.')
    info('Example: npx tsx tools/lmarena/cli.ts scrape')
    return
  }

  if (options.csv) {
    exportAllToCsv(data, outputDir)
  }

  // Save combined JSON
  const jsonPath = path.join(outputDir, 'lmarena-all-data.json')
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2))

  success(`Exported ${countUniqueModels(data)} models`)
  console.log(`📁 JSON: ${jsonPath}`)
}

async function listFiles(options: CliOptions): Promise<void> {
  header('HuggingFace Pickle Files')

  const scraper = new LMArenaScraper({
    timeout: options.timeout || 30000,
    verbose: options.verbose,
  })

  const files = await scraper.listHuggingFaceFiles()

  if (files.length === 0) {
    error('No pickle files found or failed to fetch')
    return
  }

  divider()
  console.log(`Found ${files.length} pickle files:`)
  divider()

  for (const file of files.slice(-20)) {
    // Show last 20
    const date = file.path.match(/elo_results_(\d+)\.pkl/)?.[1] || 'unknown'
    const size = (file.size / 1024).toFixed(1)
    console.log(`  ${date}  ${size.padStart(8)} KB  ${file.path}`)
  }

  if (files.length > 20) {
    console.log(`  ... and ${files.length - 20} earlier files`)
  }
}

async function main(): Promise<void> {
  const options = parseArgs()

  if (options.verbose) {
    setVerbose(true)
  }

  switch (options.command) {
    case 'scrape':
      await scrapeLeaderboard(options)
      break

    case 'show':
      showLeaderboard(options)
      break

    case 'export':
      exportData(options)
      break

    case 'render':
      renderData(options)
      break

    case 'files':
      await listFiles(options)
      break

    case 'help':
    default:
      printHelp()
      break
  }
}

main().catch(console.error)
