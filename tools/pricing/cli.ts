#!/usr/bin/env npx tsx
/**
 * API Pricing CLI Tool
 *
 * Unified command-line interface for scraping API pricing from multiple providers.
 *
 * Usage:
 *   npx tsx tools/pricing/cli.ts scrape <provider>   # Scrape single provider
 *   npx tsx tools/pricing/cli.ts scrape --all        # Scrape all providers
 *   npx tsx tools/pricing/cli.ts scrape --region cn  # Scrape by region
 *   npx tsx tools/pricing/cli.ts list                # List all providers
 *   npx tsx tools/pricing/cli.ts show <provider>     # Show cached pricing
 *   npx tsx tools/pricing/cli.ts export --csv        # Export to CSV
 *
 * Options:
 *   --output <dir>     Output directory (default: tools/pricing/output)
 *   --timeout <ms>     Timeout per scraper (default: 30000)
 *   --no-screenshot    Skip screenshots
 *   --verbose          Verbose logging
 *   --headless         Run browser in headless mode (default: true)
 */

import * as path from 'path'
import {
  getProvider,
  getAllProviders,
  getProvidersByRegion,
  listProviderIds,
  listProviderConfigs,
} from './providers/registry.js'
import type { AllPricing, ScraperOptions, ProviderPricing } from './types.js'
import { saveAllPricing, loadProviderPricing, countModels, exportToCsv, ensureOutputDir } from './utils/output.js'
import { header, divider, success, error, info, setVerbose } from './utils/logger.js'

const DEFAULT_OUTPUT_DIR = path.join(import.meta.dirname || __dirname, 'output')

interface CliOptions {
  command: string
  target?: string
  all?: boolean
  region?: 'US' | 'CN'
  output?: string
  timeout?: number
  screenshot?: boolean
  verbose?: boolean
  headless?: boolean
  csv?: boolean
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const options: CliOptions = {
    command: args[0] || 'help',
    screenshot: true,
    headless: true,
    verbose: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--all') {
      options.all = true
    } else if (arg === '--region' && args[i + 1]) {
      options.region = args[++i].toUpperCase() as 'US' | 'CN'
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
    } else if (!arg.startsWith('-') && i === 1) {
      options.target = arg
    }
  }

  return options
}

function printHelp(): void {
  console.log(`
API Pricing CLI Tool
====================

Commands:
  scrape <provider>     Scrape pricing for a specific provider
  scrape --all          Scrape all providers
  scrape --region <us|cn>  Scrape providers by region
  list                  List all available providers
  show <provider>       Show cached pricing for a provider
  export                Export all cached pricing to JSON/CSV

Options:
  --output <dir>        Output directory (default: tools/pricing/output)
  --timeout <ms>        Timeout per scraper (default: 30000)
  --no-screenshot       Skip taking screenshots
  --no-headless         Run browser with UI (for debugging)
  --verbose, -v         Enable verbose logging
  --csv                 Export to CSV format

Examples:
  npx tsx tools/pricing/cli.ts scrape deepseek
  npx tsx tools/pricing/cli.ts scrape --all
  npx tsx tools/pricing/cli.ts scrape --region cn
  npx tsx tools/pricing/cli.ts list
  npx tsx tools/pricing/cli.ts export --csv

Available Providers:
`)

  const configs = listProviderConfigs()
  const usProviders = configs.filter((c) => c.region === 'US')
  const cnProviders = configs.filter((c) => c.region === 'CN')

  console.log('  US Providers:')
  usProviders.forEach((c) => console.log(`    - ${c.id.padEnd(15)} ${c.name}`))

  console.log('\n  CN Providers:')
  cnProviders.forEach((c) => console.log(`    - ${c.id.padEnd(15)} ${c.name}`))

  console.log('')
}

async function scrapeProvider(providerId: string, scraperOptions: ScraperOptions): Promise<ProviderPricing | null> {
  const entry = getProvider(providerId)
  if (!entry) {
    error(`Unknown provider: ${providerId}`)
    console.log(`Available providers: ${listProviderIds().join(', ')}`)
    return null
  }

  try {
    const scraper = entry.createScraper(scraperOptions)
    await scraper.scrapeAndSave()
    return loadProviderPricing(providerId, scraperOptions.outputDir)
  } catch (e) {
    error(`Failed to scrape ${providerId}: ${e}`)
    return null
  }
}

async function scrapeAll(options: CliOptions): Promise<void> {
  const scraperOptions: ScraperOptions = {
    headless: options.headless,
    timeout: options.timeout || 30000,
    screenshot: options.screenshot,
    outputDir: options.output || DEFAULT_OUTPUT_DIR,
    verbose: options.verbose,
  }

  let entries = getAllProviders()

  if (options.region) {
    entries = getProvidersByRegion(options.region)
    info(`Filtering by region: ${options.region} (${entries.length} providers)`)
  }

  header(`Scraping ${entries.length} Providers`)

  const results = { success: 0, failed: 0 }
  const allData: AllPricing = {
    generated_at: new Date().toISOString(),
    total_models: 0,
    providers: [],
  }

  for (const entry of entries) {
    const data = await scrapeProvider(entry.config.id, scraperOptions)

    if (data && data.categories.length > 0) {
      const modelCount = countModels(data.categories)
      allData.providers.push({
        provider: entry.config.name,
        region: entry.config.region,
        scraped_at: data.scraped_at,
        source: data.source,
        model_count: modelCount,
        categories: data.categories,
      })
      allData.total_models += modelCount
      results.success++
    } else {
      results.failed++
    }
  }

  // Save combined output
  saveAllPricing(allData, scraperOptions.outputDir)

  // Export to CSV if requested
  if (options.csv) {
    exportToCsv(allData, scraperOptions.outputDir)
  }

  divider()
  console.log('Summary')
  divider()
  console.log(`✅ Success: ${results.success}`)
  console.log(`❌ Failed: ${results.failed}`)
  console.log(`📊 Total models: ${allData.total_models}`)
  console.log(`🏢 Providers: ${allData.providers.length}`)
}

async function scrapeSingle(providerId: string, options: CliOptions): Promise<void> {
  const scraperOptions: ScraperOptions = {
    headless: options.headless,
    timeout: options.timeout || 30000,
    screenshot: options.screenshot,
    outputDir: options.output || DEFAULT_OUTPUT_DIR,
    verbose: options.verbose,
  }

  header(`Scraping ${providerId}`)
  const data = await scrapeProvider(providerId, scraperOptions)

  if (data) {
    const modelCount = countModels(data.categories)
    divider()
    success(`Scraped ${modelCount} models in ${data.categories.length} categories`)
  }
}

function listProviders(): void {
  header('Available Providers')

  const configs = listProviderConfigs()
  const usProviders = configs.filter((c) => c.region === 'US')
  const cnProviders = configs.filter((c) => c.region === 'CN')

  console.log('\n🇺🇸 US Providers:')
  console.log('─'.repeat(50))
  for (const c of usProviders) {
    const typeIcon = c.type === 'api' ? '🔌' : '🌐'
    console.log(`  ${typeIcon} ${c.id.padEnd(15)} ${c.name}`)
  }

  console.log('\n🇨🇳 CN Providers:')
  console.log('─'.repeat(50))
  for (const c of cnProviders) {
    const typeIcon = c.type === 'api' ? '🔌' : '🌐'
    console.log(`  ${typeIcon} ${c.id.padEnd(15)} ${c.name}`)
  }

  console.log(`\nTotal: ${configs.length} providers (${usProviders.length} US, ${cnProviders.length} CN)`)
}

function showProvider(providerId: string, outputDir: string): void {
  const data = loadProviderPricing(providerId, outputDir)

  if (!data) {
    error(`No cached data for provider: ${providerId}`)
    info(`Run: npx tsx tools/pricing/cli.ts scrape ${providerId}`)
    return
  }

  const entry = getProvider(providerId)
  header(`${entry?.config.name || providerId} Pricing`)

  console.log(`📅 Scraped: ${data.scraped_at}`)
  console.log(`🔗 Source: ${data.source}`)
  console.log('')

  for (const category of data.categories) {
    console.log(`📂 ${category.category}`)
    console.log('─'.repeat(60))

    for (const model of category.models) {
      const free = model.free ? ' (FREE)' : ''
      const ctx = model.contextLength ? ` [${model.contextLength}]` : ''
      console.log(`  ${model.model.padEnd(40)} ${model.input}/${model.output} ${model.unit}${free}${ctx}`)
    }
    console.log('')
  }

  const modelCount = countModels(data.categories)
  console.log(`Total: ${modelCount} models in ${data.categories.length} categories`)
}

function exportData(options: CliOptions): void {
  const outputDir = options.output || DEFAULT_OUTPUT_DIR
  ensureOutputDir(outputDir)

  // Load all cached data
  const allData: AllPricing = {
    generated_at: new Date().toISOString(),
    total_models: 0,
    providers: [],
  }

  for (const id of listProviderIds()) {
    const data = loadProviderPricing(id, outputDir)
    if (data && data.categories.length > 0) {
      const entry = getProvider(id)
      const modelCount = countModels(data.categories)
      allData.providers.push({
        provider: entry?.config.name || id,
        region: entry?.config.region || 'US',
        scraped_at: data.scraped_at,
        source: data.source,
        model_count: modelCount,
        categories: data.categories,
      })
      allData.total_models += modelCount
    }
  }

  if (allData.providers.length === 0) {
    error('No cached data found. Run scrape first.')
    return
  }

  // Save combined JSON
  saveAllPricing(allData, outputDir)

  // Export CSV if requested
  if (options.csv) {
    exportToCsv(allData, outputDir)
  }

  success(`Exported ${allData.total_models} models from ${allData.providers.length} providers`)
}

async function main(): Promise<void> {
  const options = parseArgs()

  if (options.verbose) {
    setVerbose(true)
  }

  switch (options.command) {
    case 'scrape':
      if (options.all || options.region) {
        await scrapeAll(options)
      } else if (options.target) {
        await scrapeSingle(options.target, options)
      } else {
        error('Please specify a provider or use --all')
        printHelp()
      }
      break

    case 'list':
      listProviders()
      break

    case 'show':
      if (options.target) {
        showProvider(options.target, options.output || DEFAULT_OUTPUT_DIR)
      } else {
        error('Please specify a provider')
        console.log(`Available: ${listProviderIds().join(', ')}`)
      }
      break

    case 'export':
      exportData(options)
      break

    case 'help':
    default:
      printHelp()
      break
  }
}

main().catch(console.error)
