/**
 * Logger utility for pricing scrapers
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

let verboseMode = false

export function setVerbose(verbose: boolean): void {
  verboseMode = verbose
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
  console.log(`${icon} ${message}`, ...args)
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
  console.log(`✅ ${message}`, ...args)
}

export function progress(message: string, ...args: unknown[]): void {
  console.log(`🔄 ${message}`, ...args)
}

export function table(message: string, ...args: unknown[]): void {
  console.log(`📊 ${message}`, ...args)
}

export function divider(char = '=', length = 60): void {
  console.log(char.repeat(length))
}

export function header(title: string): void {
  divider()
  console.log(title)
  divider()
}
