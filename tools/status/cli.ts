#!/usr/bin/env npx tsx
/**
 * Provider Status CLI Tool
 *
 * Monitor AI model provider health and availability.
 *
 * Usage:
 *   npx tsx tools/status/cli.ts check                    # Check all providers
 *   npx tsx tools/status/cli.ts check <provider>         # Check single provider
 *   npx tsx tools/status/cli.ts check --region us        # Check US providers
 *   npx tsx tools/status/cli.ts watch                    # Continuous monitoring
 *   npx tsx tools/status/cli.ts list                     # List all providers
 *   npx tsx tools/status/cli.ts report                   # Show last report
 *   npx tsx tools/status/cli.ts history <provider>       # Show provider history
 *
 * Options:
 *   --output <dir>      Output directory (default: tools/status/output)
 *   --timeout <ms>      Request timeout (default: 10000)
 *   --retries <n>       Number of retries (default: 2)
 *   --interval <ms>     Watch interval (default: 60000)
 *   --parallel          Run checks in parallel (default: true)
 *   --no-parallel       Run checks sequentially
 *   --verbose, -v       Verbose logging
 *   --json              Output as JSON
 *   --csv               Export to CSV
 *   --webhook <url>     Webhook URL for notifications
 */

import * as path from 'path'
import { StatusChecker, StatusWatcher } from './checker.js'
import {
  getAllProviders,
  listProviderIds,
  getProvider,
  getRegionCounts,
} from './providers/registry.js'
import type { StatusReport, CheckerOptions, WatchOptions } from './types.js'
import {
  loadStatusReport,
  loadHistory,
  exportToCsv,
  formatReportAsTable,
  ensureOutputDir,
} from './utils/output.js'
import {
  header,
  divider,
  success,
  error,
  info,
  setVerbose,
  formatStatus,
  formatResponseTime,
  formatPercentage,
} from './utils/logger.js'

const DEFAULT_OUTPUT_DIR = path.join(import.meta.dirname || __dirname, 'output')

interface CliOptions {
  command: string
  target?: string
  region?: 'US' | 'CN' | 'EU'
  output: string
  timeout: number
  retries: number
  interval: number
  parallel: boolean
  verbose: boolean
  json: boolean
  csv: boolean
  webhook?: string
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const options: CliOptions = {
    command: args[0] || 'help',
    output: DEFAULT_OUTPUT_DIR,
    timeout: 10000,
    retries: 2,
    interval: 60000,
    parallel: true,
    verbose: false,
    json: false,
    csv: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--region' && args[i + 1]) {
      options.region = args[++i].toUpperCase() as 'US' | 'CN' | 'EU'
    } else if (arg === '--output' && args[i + 1]) {
      options.output = args[++i]
    } else if (arg === '--timeout' && args[i + 1]) {
      options.timeout = parseInt(args[++i], 10)
    } else if (arg === '--retries' && args[i + 1]) {
      options.retries = parseInt(args[++i], 10)
    } else if (arg === '--interval' && args[i + 1]) {
      options.interval = parseInt(args[++i], 10)
    } else if (arg === '--parallel') {
      options.parallel = true
    } else if (arg === '--no-parallel') {
      options.parallel = false
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true
    } else if (arg === '--json') {
      options.json = true
    } else if (arg === '--csv') {
      options.csv = true
    } else if (arg === '--webhook' && args[i + 1]) {
      options.webhook = args[++i]
    } else if (!arg.startsWith('-') && i === 1) {
      options.target = arg
    }
  }

  return options
}

function printHelp(): void {
  console.log(`
Provider Status CLI Tool
========================

Monitor AI model provider health and availability.

Commands:
  check                     Check all providers
  check <provider>          Check a specific provider
  check --region <us|cn|eu> Check providers by region
  watch                     Start continuous monitoring
  list                      List all available providers
  report                    Show the last status report
  history <provider>        Show status history for a provider

Options:
  --output <dir>            Output directory (default: tools/status/output)
  --timeout <ms>            Request timeout (default: 10000)
  --retries <n>             Number of retries (default: 2)
  --interval <ms>           Watch interval for monitoring (default: 60000)
  --parallel                Run checks in parallel (default)
  --no-parallel             Run checks sequentially
  --verbose, -v             Enable verbose logging
  --json                    Output results as JSON
  --csv                     Export results to CSV
  --webhook <url>           Webhook URL for status change notifications

Examples:
  npx tsx tools/status/cli.ts check
  npx tsx tools/status/cli.ts check openai
  npx tsx tools/status/cli.ts check --region cn
  npx tsx tools/status/cli.ts watch --interval 30000
  npx tsx tools/status/cli.ts list
  npx tsx tools/status/cli.ts report --json

Environment Variables:
  Set API keys to enable authenticated checks (optional):
  - OPENAI_API_KEY
  - ANTHROPIC_API_KEY
  - GOOGLE_API_KEY
  - COHERE_API_KEY
  - MISTRAL_API_KEY
  - GROQ_API_KEY
  - TOGETHER_API_KEY
  - DEEPSEEK_API_KEY
  - ... and more (see providers/configs.ts)
`)
}

function printProviderList(): void {
  header('Available Providers')

  const counts = getRegionCounts()
  const allProviders = getAllProviders()

  const regions = ['US', 'EU', 'CN'] as const
  const regionEmojis = { US: '🇺🇸', EU: '🇪🇺', CN: '🇨🇳' }

  for (const region of regions) {
    const providers = allProviders.filter((p) => p.region === region)
    if (providers.length === 0) continue

    console.log(`\n${regionEmojis[region]} ${region} Providers (${counts[region]}):`)
    console.log('─'.repeat(50))

    for (const p of providers) {
      const keyStatus = p.apiKeyEnv && process.env[p.apiKeyEnv] ? '🔑' : '  '
      const statusPage = p.statusPage ? '📊' : '  '
      console.log(`  ${keyStatus} ${statusPage} ${p.id.padEnd(15)} ${p.name}`)
    }
  }

  console.log(`\nTotal: ${allProviders.length} providers`)
  console.log('Legend: 🔑 = API key configured, 📊 = Has status page')
}

function printReport(report: StatusReport, asJson: boolean): void {
  if (asJson) {
    console.log(JSON.stringify(report, null, 2))
    return
  }

  header('Provider Status Report')
  console.log(`Generated: ${report.generated_at}`)
  console.log(`Providers: ${report.total_providers}`)
  console.log('')

  // Summary
  console.log('Summary:')
  console.log(`  🟢 Operational: ${report.summary.operational}`)
  console.log(`  🟡 Degraded:    ${report.summary.degraded}`)
  console.log(`  🔴 Down:        ${report.summary.down}`)
  console.log(`  ⚪ Unknown:     ${report.summary.unknown}`)
  console.log('')

  // Table
  console.log(formatReportAsTable(report))
}

function printProviderResult(result: { provider: string; name: string; overallStatus: string; checks: Array<{ endpoint: string; status: string; responseTime: number; error?: string }>; avgResponseTime: number; successRate: number; statusPageUrl?: string }, asJson: boolean): void {
  if (asJson) {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  header(`${result.name} Status`)

  console.log(`Provider: ${result.provider}`)
  console.log(`Status:   ${formatStatus(result.overallStatus as 'operational' | 'degraded' | 'down' | 'unknown')}`)
  console.log(`Response: ${formatResponseTime(result.avgResponseTime)}`)
  console.log(`Success:  ${formatPercentage(result.successRate)}`)

  if (result.statusPageUrl) {
    console.log(`Status Page: ${result.statusPageUrl}`)
  }

  console.log('')
  console.log('Endpoint Checks:')
  divider('─', 60)

  for (const check of result.checks) {
    const statusEmoji = { operational: '🟢', degraded: '🟡', down: '🔴', unknown: '⚪' }[check.status] || '⚪'
    console.log(`  ${statusEmoji} ${check.endpoint.padEnd(20)} ${check.responseTime}ms`)
    if (check.error) {
      console.log(`     └─ ${check.error}`)
    }
  }
}

function printHistory(providerId: string, outputDir: string, asJson: boolean): void {
  const history = loadHistory(outputDir)
  const providerHistory = history.find((h) => h.provider === providerId)

  if (!providerHistory || providerHistory.entries.length === 0) {
    error(`No history found for provider: ${providerId}`)
    return
  }

  if (asJson) {
    console.log(JSON.stringify(providerHistory, null, 2))
    return
  }

  const config = getProvider(providerId)
  header(`${config?.name || providerId} History`)

  if (providerHistory.lastChange) {
    console.log(`Last Status Change: ${providerHistory.lastChange.from} → ${providerHistory.lastChange.to}`)
    console.log(`  at ${providerHistory.lastChange.timestamp}`)
    console.log('')
  }

  console.log(`Recent entries (${providerHistory.entries.length} total):`)
  divider('─', 60)

  // Show last 20 entries
  const recentEntries = providerHistory.entries.slice(-20).reverse()
  for (const entry of recentEntries) {
    const statusEmoji = { operational: '🟢', degraded: '🟡', down: '🔴', unknown: '⚪' }[entry.status] || '⚪'
    const time = entry.timestamp.slice(0, 19).replace('T', ' ')
    console.log(`  ${time}  ${statusEmoji} ${entry.status.padEnd(12)} ${entry.responseTime}ms`)
  }
}

async function runCheck(options: CliOptions): Promise<void> {
  ensureOutputDir(options.output)

  const checkerOptions: CheckerOptions = {
    timeout: options.timeout,
    retries: options.retries,
    parallel: options.parallel,
    verbose: options.verbose,
    outputDir: options.output,
  }

  const checker = new StatusChecker(checkerOptions)

  if (options.target) {
    // Single provider check
    const result = await checker.checkSingle(options.target)
    if (result) {
      printProviderResult(result, options.json)
    }
  } else if (options.region) {
    // Region check
    const report = await checker.checkByRegion(options.region)
    printReport(report, options.json)

    if (options.csv) {
      const csvPath = exportToCsv(report, options.output)
      success(`Exported to ${csvPath}`)
    }
  } else {
    // All providers check
    const report = await checker.checkAll()
    printReport(report, options.json)

    if (options.csv) {
      const csvPath = exportToCsv(report, options.output)
      success(`Exported to ${csvPath}`)
    }
  }
}

async function runWatch(options: CliOptions): Promise<void> {
  ensureOutputDir(options.output)

  const watchOptions: WatchOptions = {
    timeout: options.timeout,
    retries: options.retries,
    parallel: options.parallel,
    verbose: options.verbose,
    outputDir: options.output,
    interval: options.interval,
    notifyOnChange: true,
    webhookUrl: options.webhook,
  }

  const watcher = new StatusWatcher(watchOptions)

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    info('\nReceived SIGINT, stopping watcher...')
    watcher.stop()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    info('\nReceived SIGTERM, stopping watcher...')
    watcher.stop()
    process.exit(0)
  })

  header('Status Watcher')
  console.log(`Interval: ${options.interval}ms`)
  console.log(`Output: ${options.output}`)
  if (options.webhook) {
    console.log(`Webhook: ${options.webhook}`)
  }
  console.log('\nPress Ctrl+C to stop\n')

  await watcher.start()

  // Keep the process alive
  await new Promise(() => {})
}

function showReport(options: CliOptions): void {
  const report = loadStatusReport(options.output)

  if (!report) {
    error('No status report found. Run a check first:')
    console.log('  npx tsx tools/status/cli.ts check')
    return
  }

  printReport(report, options.json)
}

async function main(): Promise<void> {
  const options = parseArgs()

  if (options.verbose) {
    setVerbose(true)
  }

  switch (options.command) {
    case 'check':
      await runCheck(options)
      break

    case 'watch':
      await runWatch(options)
      break

    case 'list':
      printProviderList()
      break

    case 'report':
      showReport(options)
      break

    case 'history':
      if (options.target) {
        printHistory(options.target, options.output, options.json)
      } else {
        error('Please specify a provider')
        console.log(`Available: ${listProviderIds().join(', ')}`)
      }
      break

    case 'help':
    default:
      printHelp()
      break
  }
}

main().catch(console.error)
