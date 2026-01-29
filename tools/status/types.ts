/**
 * Type definitions for provider status detection
 */

export type ProviderStatus = 'operational' | 'degraded' | 'down' | 'unknown'

export type CheckType = 'health' | 'api' | 'models' | 'status_page'

export interface ProviderConfig {
  id: string
  name: string
  region: 'US' | 'CN' | 'EU'
  endpoints: EndpointConfig[]
  statusPage?: string
  apiKeyEnv?: string
  rateLimit?: RateLimitConfig
}

export interface EndpointConfig {
  name: string
  url: string
  type: CheckType
  method?: 'GET' | 'POST' | 'HEAD'
  headers?: Record<string, string>
  body?: unknown
  expectedStatus?: number[]
  timeout?: number
}

export interface RateLimitConfig {
  requestsPerMinute: number
  tokensPerMinute?: number
}

export interface CheckResult {
  provider: string
  endpoint: string
  status: ProviderStatus
  responseTime: number
  statusCode?: number
  error?: string
  timestamp: string
  details?: Record<string, unknown>
}

export interface ProviderCheckResult {
  provider: string
  name: string
  region: 'US' | 'CN' | 'EU'
  overallStatus: ProviderStatus
  checks: CheckResult[]
  avgResponseTime: number
  successRate: number
  timestamp: string
  statusPageUrl?: string
}

export interface StatusReport {
  generated_at: string
  total_providers: number
  summary: {
    operational: number
    degraded: number
    down: number
    unknown: number
  }
  providers: ProviderCheckResult[]
}

export interface CheckerOptions {
  timeout?: number
  retries?: number
  retryDelay?: number
  parallel?: boolean
  verbose?: boolean
  outputDir?: string
}

export interface WatchOptions extends CheckerOptions {
  interval?: number
  maxHistory?: number
  notifyOnChange?: boolean
  webhookUrl?: string
}

export interface HistoryEntry {
  timestamp: string
  status: ProviderStatus
  responseTime: number
  successRate: number
}

export interface ProviderHistory {
  provider: string
  entries: HistoryEntry[]
  lastChange?: {
    from: ProviderStatus
    to: ProviderStatus
    timestamp: string
  }
}

export interface NotificationPayload {
  type: 'status_change' | 'down_alert' | 'recovery'
  provider: string
  previousStatus: ProviderStatus
  currentStatus: ProviderStatus
  timestamp: string
  details?: string
}
