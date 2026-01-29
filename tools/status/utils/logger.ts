/**
 * Logger utility for status checker
 */

import type { ProviderStatus } from '../types.js'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

let verboseMode = false

export function setVerbose(verbose: boolean): void {
  verboseMode = verbose
}

export function isVerbose(): boolean {
  return verboseMode
}

export function log(level: LogLevel, message: string, ...args: unknown[]): void {
  const icons: Record<LogLevel, string> = {
    debug: '🔍',
    info: '📋',
    warn: '⚠️',
    error: '❌',
  }

  if (level === 'debug' && !verboseMode) return

  const icon = icons[level]
  const timestamp = new Date().toISOString().slice(11, 19)
  console.log(`[${timestamp}] ${icon} ${message}`, ...args)
}

export function debug(message: string, ...args: unknown[]): void {
  log('debug', message, ...args)
}

export function info(message: string, ...args: unknown[]): void {
  log('info', message, ...args)
}

export function warn(message: string, ...args: unknown[]): void {
  log('warn', message, ...args)
}

export function error(message: string, ...args: unknown[]): void {
  log('error', message, ...args)
}

export function success(message: string, ...args: unknown[]): void {
  const timestamp = new Date().toISOString().slice(11, 19)
  console.log(`[${timestamp}] ✅ ${message}`, ...args)
}

export function progress(message: string, ...args: unknown[]): void {
  const timestamp = new Date().toISOString().slice(11, 19)
  console.log(`[${timestamp}] 🔄 ${message}`, ...args)
}

export function divider(char = '═', length = 60): void {
  console.log(char.repeat(length))
}

export function header(title: string): void {
  console.log('')
  divider()
  console.log(`  ${title}`)
  divider()
}

export function statusIcon(status: ProviderStatus): string {
  const icons: Record<ProviderStatus, string> = {
    operational: '🟢',
    degraded: '🟡',
    down: '🔴',
    unknown: '⚪',
  }
  return icons[status]
}

export function statusColor(status: ProviderStatus): string {
  const colors: Record<ProviderStatus, string> = {
    operational: '\x1b[32m',
    degraded: '\x1b[33m',
    down: '\x1b[31m',
    unknown: '\x1b[90m',
  }
  return colors[status]
}

export function resetColor(): string {
  return '\x1b[0m'
}

export function formatStatus(status: ProviderStatus): string {
  return `${statusIcon(status)} ${statusColor(status)}${status.toUpperCase()}${resetColor()}`
}

export function formatResponseTime(ms: number): string {
  if (ms < 100) return `\x1b[32m${ms}ms\x1b[0m`
  if (ms < 500) return `\x1b[33m${ms}ms\x1b[0m`
  return `\x1b[31m${ms}ms\x1b[0m`
}

export function formatPercentage(value: number): string {
  const pct = (value * 100).toFixed(1)
  if (value >= 0.99) return `\x1b[32m${pct}%\x1b[0m`
  if (value >= 0.9) return `\x1b[33m${pct}%\x1b[0m`
  return `\x1b[31m${pct}%\x1b[0m`
}
