/**
 * Logger utilities for LMArena scraper
 */

let verboseMode = false

export function setVerbose(verbose: boolean): void {
  verboseMode = verbose
}

export function isVerbose(): boolean {
  return verboseMode
}

export function header(message: string): void {
  console.log('')
  console.log('═'.repeat(60))
  console.log(`  ${message}`)
  console.log('═'.repeat(60))
}

export function divider(): void {
  console.log('─'.repeat(40))
}

export function success(message: string): void {
  console.log(`✅ ${message}`)
}

export function error(message: string): void {
  console.error(`❌ ${message}`)
}

export function warn(message: string): void {
  console.warn(`⚠️  ${message}`)
}

export function info(message: string): void {
  console.log(`ℹ️  ${message}`)
}

export function debug(message: string): void {
  if (verboseMode) {
    console.log(`🔍 ${message}`)
  }
}

export function progress(current: number, total: number, label: string): void {
  const percent = Math.round((current / total) * 100)
  const bar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5))
  process.stdout.write(`\r[${bar}] ${percent}% ${label}`)
  if (current === total) {
    console.log('')
  }
}
