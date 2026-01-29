/**
 * Core status checker implementation
 *
 * Performs health checks on AI provider endpoints with:
 * - Parallel async requests
 * - Retry logic with exponential backoff
 * - Response time tracking
 * - Status aggregation
 */

import type {
  ProviderConfig,
  EndpointConfig,
  CheckResult,
  ProviderCheckResult,
  StatusReport,
  CheckerOptions,
  ProviderStatus,
  WatchOptions,
  NotificationPayload,
} from './types.js'
import { getAllProviders, getProvider, getProvidersByRegion, listProviderIds } from './providers/registry.js'
import { debug, info, error, progress, success } from './utils/logger.js'
import { saveStatusReport, saveProviderResult, appendHistory, loadHistory } from './utils/output.js'

const DEFAULT_OPTIONS: Required<CheckerOptions> = {
  timeout: 10000,
  retries: 2,
  retryDelay: 1000,
  parallel: true,
  verbose: false,
  outputDir: '',
}

export class StatusChecker {
  private options: Required<CheckerOptions>

  constructor(options: CheckerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  /**
   * Check a single endpoint
   */
  async checkEndpoint(
    providerId: string,
    endpoint: EndpointConfig,
    apiKey?: string
  ): Promise<CheckResult> {
    const startTime = Date.now()
    const result: CheckResult = {
      provider: providerId,
      endpoint: endpoint.name,
      status: 'unknown',
      responseTime: 0,
      timestamp: new Date().toISOString(),
    }

    const timeout = endpoint.timeout || this.options.timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const headers: Record<string, string> = {
        'User-Agent': 'Cognia-StatusChecker/1.0',
        ...endpoint.headers,
      }

      // Add API key if available
      if (apiKey) {
        if (providerId === 'anthropic') {
          headers['x-api-key'] = apiKey
        } else if (providerId === 'replicate') {
          headers['Authorization'] = `Token ${apiKey}`
        } else {
          headers['Authorization'] = `Bearer ${apiKey}`
        }
      }

      const fetchOptions: RequestInit = {
        method: endpoint.method || 'GET',
        headers,
        signal: controller.signal,
      }

      if (endpoint.body && endpoint.method === 'POST') {
        fetchOptions.body = JSON.stringify(endpoint.body)
      }

      debug(`Checking ${providerId}/${endpoint.name}: ${endpoint.url}`)
      const response = await fetch(endpoint.url, fetchOptions)

      result.responseTime = Date.now() - startTime
      result.statusCode = response.status

      // Determine status based on response
      const expectedCodes = endpoint.expectedStatus || [200]
      if (expectedCodes.includes(response.status)) {
        result.status = 'operational'
      } else if (response.status >= 500) {
        result.status = 'down'
        result.error = `Server error: ${response.status}`
      } else if (response.status === 429) {
        result.status = 'degraded'
        result.error = 'Rate limited'
      } else {
        result.status = 'degraded'
        result.error = `Unexpected status: ${response.status}`
      }

      // Try to extract additional info from status page responses
      if (endpoint.type === 'status_page' && response.ok) {
        try {
          const data = await response.json()
          if (data.status?.indicator) {
            result.details = { indicator: data.status.indicator }
            if (data.status.indicator === 'none') {
              result.status = 'operational'
            } else if (data.status.indicator === 'minor' || data.status.indicator === 'major') {
              result.status = 'degraded'
            } else if (data.status.indicator === 'critical') {
              result.status = 'down'
            }
          }
        } catch {
          // Ignore JSON parse errors
        }
      }
    } catch (err) {
      result.responseTime = Date.now() - startTime

      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          result.status = 'down'
          result.error = `Timeout after ${timeout}ms`
        } else if (err.message.includes('ENOTFOUND') || err.message.includes('ECONNREFUSED')) {
          result.status = 'down'
          result.error = 'Connection failed'
        } else {
          result.status = 'down'
          result.error = err.message
        }
      } else {
        result.status = 'down'
        result.error = 'Unknown error'
      }
    } finally {
      clearTimeout(timeoutId)
    }

    return result
  }

  /**
   * Check a single endpoint with retries
   */
  async checkEndpointWithRetry(
    providerId: string,
    endpoint: EndpointConfig,
    apiKey?: string
  ): Promise<CheckResult> {
    let lastResult: CheckResult | null = null

    for (let attempt = 0; attempt <= this.options.retries; attempt++) {
      if (attempt > 0) {
        const delay = this.options.retryDelay * Math.pow(2, attempt - 1)
        debug(`Retry ${attempt}/${this.options.retries} for ${providerId}/${endpoint.name} after ${delay}ms`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }

      const result = await this.checkEndpoint(providerId, endpoint, apiKey)
      lastResult = result

      if (result.status === 'operational') {
        return result
      }
    }

    return lastResult!
  }

  /**
   * Check all endpoints for a provider
   */
  async checkProvider(config: ProviderConfig): Promise<ProviderCheckResult> {
    progress(`Checking ${config.name}...`)

    // Get API key from environment
    const apiKey = config.apiKeyEnv ? process.env[config.apiKeyEnv] : undefined

    const checks: CheckResult[] = []

    if (this.options.parallel) {
      // Check all endpoints in parallel
      const results = await Promise.all(
        config.endpoints.map((endpoint) =>
          this.checkEndpointWithRetry(config.id, endpoint, apiKey)
        )
      )
      checks.push(...results)
    } else {
      // Check endpoints sequentially
      for (const endpoint of config.endpoints) {
        const result = await this.checkEndpointWithRetry(config.id, endpoint, apiKey)
        checks.push(result)
      }
    }

    // Calculate aggregate metrics
    const successfulChecks = checks.filter((c) => c.status === 'operational')
    const successRate = checks.length > 0 ? successfulChecks.length / checks.length : 0
    const avgResponseTime =
      checks.length > 0
        ? checks.reduce((sum, c) => sum + c.responseTime, 0) / checks.length
        : 0

    // Determine overall status
    let overallStatus: ProviderStatus = 'unknown'
    if (successRate >= 1) {
      overallStatus = 'operational'
    } else if (successRate >= 0.5) {
      overallStatus = 'degraded'
    } else if (successRate > 0) {
      overallStatus = 'degraded'
    } else {
      overallStatus = 'down'
    }

    const result: ProviderCheckResult = {
      provider: config.id,
      name: config.name,
      region: config.region,
      overallStatus,
      checks,
      avgResponseTime: Math.round(avgResponseTime),
      successRate,
      timestamp: new Date().toISOString(),
      statusPageUrl: config.statusPage,
    }

    // Log result
    const statusEmoji = { operational: '🟢', degraded: '🟡', down: '🔴', unknown: '⚪' }[overallStatus]
    if (overallStatus === 'operational') {
      success(`${config.name}: ${statusEmoji} ${overallStatus} (${result.avgResponseTime}ms)`)
    } else {
      error(`${config.name}: ${statusEmoji} ${overallStatus} - ${checks.find((c) => c.error)?.error || 'Unknown'}`)
    }

    return result
  }

  /**
   * Check multiple providers
   */
  async checkProviders(configs: ProviderConfig[]): Promise<ProviderCheckResult[]> {
    const results: ProviderCheckResult[] = []

    if (this.options.parallel) {
      // Check all providers in parallel (with concurrency limit)
      const concurrency = 5
      for (let i = 0; i < configs.length; i += concurrency) {
        const batch = configs.slice(i, i + concurrency)
        const batchResults = await Promise.all(batch.map((c) => this.checkProvider(c)))
        results.push(...batchResults)
      }
    } else {
      for (const config of configs) {
        const result = await this.checkProvider(config)
        results.push(result)
      }
    }

    return results
  }

  /**
   * Check all providers and generate a report
   */
  async checkAll(): Promise<StatusReport> {
    info(`Checking ${listProviderIds().length} providers...`)
    const startTime = Date.now()

    const results = await this.checkProviders(getAllProviders())

    const report: StatusReport = {
      generated_at: new Date().toISOString(),
      total_providers: results.length,
      summary: {
        operational: results.filter((r) => r.overallStatus === 'operational').length,
        degraded: results.filter((r) => r.overallStatus === 'degraded').length,
        down: results.filter((r) => r.overallStatus === 'down').length,
        unknown: results.filter((r) => r.overallStatus === 'unknown').length,
      },
      providers: results,
    }

    const elapsed = Date.now() - startTime
    info(`Completed in ${elapsed}ms`)

    // Save report if output directory is specified
    if (this.options.outputDir) {
      saveStatusReport(report, this.options.outputDir)
      for (const result of results) {
        saveProviderResult(result, this.options.outputDir)
        appendHistory(
          result.provider,
          {
            status: result.overallStatus,
            responseTime: result.avgResponseTime,
            successRate: result.successRate,
          },
          1000,
          this.options.outputDir
        )
      }
    }

    return report
  }

  /**
   * Check providers by region
   */
  async checkByRegion(region: 'US' | 'CN' | 'EU'): Promise<StatusReport> {
    const configs = getProvidersByRegion(region)
    info(`Checking ${configs.length} ${region} providers...`)

    const results = await this.checkProviders(configs)

    return {
      generated_at: new Date().toISOString(),
      total_providers: results.length,
      summary: {
        operational: results.filter((r) => r.overallStatus === 'operational').length,
        degraded: results.filter((r) => r.overallStatus === 'degraded').length,
        down: results.filter((r) => r.overallStatus === 'down').length,
        unknown: results.filter((r) => r.overallStatus === 'unknown').length,
      },
      providers: results,
    }
  }

  /**
   * Check a single provider by ID
   */
  async checkSingle(providerId: string): Promise<ProviderCheckResult | null> {
    const config = getProvider(providerId)
    if (!config) {
      error(`Unknown provider: ${providerId}`)
      return null
    }

    return this.checkProvider(config)
  }
}

/**
 * Status watcher for continuous monitoring
 */
export class StatusWatcher {
  private checker: StatusChecker
  private options: Required<WatchOptions>
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false
  private lastReport: StatusReport | null = null

  constructor(options: WatchOptions = {}) {
    this.options = {
      timeout: options.timeout || 10000,
      retries: options.retries || 2,
      retryDelay: options.retryDelay || 1000,
      parallel: options.parallel ?? true,
      verbose: options.verbose || false,
      outputDir: options.outputDir || '',
      interval: options.interval || 60000,
      maxHistory: options.maxHistory || 1000,
      notifyOnChange: options.notifyOnChange || false,
      webhookUrl: options.webhookUrl || '',
    }

    this.checker = new StatusChecker(this.options)
  }

  /**
   * Start watching
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      info('Watcher is already running')
      return
    }

    this.isRunning = true
    info(`Starting status watcher (interval: ${this.options.interval}ms)`)

    // Run initial check
    await this.runCheck()

    // Schedule periodic checks
    this.intervalId = setInterval(() => {
      this.runCheck().catch((err) => {
        error(`Watch check failed: ${err}`)
      })
    }, this.options.interval)
  }

  /**
   * Stop watching
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
    info('Status watcher stopped')
  }

  /**
   * Run a single check cycle
   */
  private async runCheck(): Promise<void> {
    const report = await this.checker.checkAll()

    // Check for status changes
    if (this.lastReport && this.options.notifyOnChange) {
      for (const current of report.providers) {
        const previous = this.lastReport.providers.find((p) => p.provider === current.provider)
        if (previous && previous.overallStatus !== current.overallStatus) {
          await this.notify({
            type: current.overallStatus === 'operational' ? 'recovery' : 'status_change',
            provider: current.name,
            previousStatus: previous.overallStatus,
            currentStatus: current.overallStatus,
            timestamp: current.timestamp,
          })
        }
      }
    }

    this.lastReport = report
  }

  /**
   * Send notification
   */
  private async notify(payload: NotificationPayload): Promise<void> {
    const emoji = { operational: '🟢', degraded: '🟡', down: '🔴', unknown: '⚪' }

    info(
      `Status change: ${payload.provider} ${emoji[payload.previousStatus]} → ${emoji[payload.currentStatus]}`
    )

    if (this.options.webhookUrl) {
      try {
        await fetch(this.options.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } catch (err) {
        error(`Failed to send webhook: ${err}`)
      }
    }
  }

  /**
   * Get last report
   */
  getLastReport(): StatusReport | null {
    return this.lastReport
  }

  /**
   * Get history for a provider
   */
  getHistory(providerId: string): unknown[] {
    const history = loadHistory(this.options.outputDir)
    return history.find((h) => h.provider === providerId)?.entries || []
  }
}
