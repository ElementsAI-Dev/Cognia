/**
 * Logger utilities for rankings scraper
 */

let verboseMode = false

export function setVerbose(verbose: boolean): void {
  verboseMode = verbose
}

export function isVerbose(): boolean {
  return verboseMode
}

export function header(text: string): void {
  console.log('')
  console.log('═'.repeat(60))
  console.log(`  ${text}`)
  console.log('═'.repeat(60))
}

export function divider(): void {
  console.log('─'.repeat(60))
}

export function success(text: string): void {
  console.log(`✅ ${text}`)
}

export function error(text: string): void {
  console.error(`❌ ${text}`)
}

export function warning(text: string): void {
  console.warn(`⚠️  ${text}`)
}

export function info(text: string): void {
  console.log(`ℹ️  ${text}`)
}

export function verbose(text: string): void {
  if (verboseMode) {
    console.log(`   ${text}`)
  }
}

export function progress(current: number, total: number, label: string): void {
  const percent = Math.round((current / total) * 100)
  console.log(`   [${current}/${total}] ${percent}% - ${label}`)
}
