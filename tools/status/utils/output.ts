/**
 * Output utilities for status checker
 */

import * as fs from 'fs'
import * as path from 'path'
import type { StatusReport, ProviderCheckResult, ProviderHistory } from '../types.js'

const DEFAULT_OUTPUT_DIR = path.join(import.meta.dirname || __dirname, '../output')

export function ensureOutputDir(outputDir: string = DEFAULT_OUTPUT_DIR): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
}

export function saveStatusReport(report: StatusReport, outputDir: string = DEFAULT_OUTPUT_DIR): string {
  ensureOutputDir(outputDir)
  const filePath = path.join(outputDir, 'status-report.json')
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2))
  return filePath
}

export function loadStatusReport(outputDir: string = DEFAULT_OUTPUT_DIR): StatusReport | null {
  const filePath = path.join(outputDir, 'status-report.json')
  if (!fs.existsSync(filePath)) return null
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return null
  }
}

export function saveProviderResult(
  result: ProviderCheckResult,
  outputDir: string = DEFAULT_OUTPUT_DIR
): string {
  ensureOutputDir(outputDir)
  const filePath = path.join(outputDir, `${result.provider}-status.json`)
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2))
  return filePath
}

export function loadProviderResult(
  providerId: string,
  outputDir: string = DEFAULT_OUTPUT_DIR
): ProviderCheckResult | null {
  const filePath = path.join(outputDir, `${providerId}-status.json`)
  if (!fs.existsSync(filePath)) return null
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return null
  }
}

export function saveHistory(history: ProviderHistory[], outputDir: string = DEFAULT_OUTPUT_DIR): string {
  ensureOutputDir(outputDir)
  const filePath = path.join(outputDir, 'status-history.json')
  fs.writeFileSync(filePath, JSON.stringify(history, null, 2))
  return filePath
}

export function loadHistory(outputDir: string = DEFAULT_OUTPUT_DIR): ProviderHistory[] {
  const filePath = path.join(outputDir, 'status-history.json')
  if (!fs.existsSync(filePath)) return []
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return []
  }
}

export function appendHistory(
  providerId: string,
  entry: { status: string; responseTime: number; successRate: number },
  maxEntries: number = 1000,
  outputDir: string = DEFAULT_OUTPUT_DIR
): void {
  const history = loadHistory(outputDir)
  let providerHistory = history.find((h) => h.provider === providerId)

  if (!providerHistory) {
    providerHistory = { provider: providerId, entries: [] }
    history.push(providerHistory)
  }

  const newEntry = {
    timestamp: new Date().toISOString(),
    status: entry.status as 'operational' | 'degraded' | 'down' | 'unknown',
    responseTime: entry.responseTime,
    successRate: entry.successRate,
  }

  // Check for status change
  const lastEntry = providerHistory.entries[providerHistory.entries.length - 1]
  if (lastEntry && lastEntry.status !== newEntry.status) {
    providerHistory.lastChange = {
      from: lastEntry.status,
      to: newEntry.status,
      timestamp: newEntry.timestamp,
    }
  }

  providerHistory.entries.push(newEntry)

  // Trim history
  if (providerHistory.entries.length > maxEntries) {
    providerHistory.entries = providerHistory.entries.slice(-maxEntries)
  }

  saveHistory(history, outputDir)
}

export function exportToCsv(report: StatusReport, outputDir: string = DEFAULT_OUTPUT_DIR): string {
  ensureOutputDir(outputDir)

  const headers = [
    'Provider',
    'Name',
    'Region',
    'Status',
    'Avg Response Time (ms)',
    'Success Rate (%)',
    'Timestamp',
  ]

  const rows = report.providers.map((p) => [
    p.provider,
    p.name,
    p.region,
    p.overallStatus,
    p.avgResponseTime.toFixed(0),
    (p.successRate * 100).toFixed(1),
    p.timestamp,
  ])

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')

  const filePath = path.join(outputDir, 'status-report.csv')
  fs.writeFileSync(filePath, csv)
  return filePath
}

export function formatReportAsTable(report: StatusReport): string {
  const lines: string[] = []
  const colWidths = { name: 20, status: 12, time: 10, rate: 10 }

  lines.push('┌' + '─'.repeat(colWidths.name + 2) + '┬' + '─'.repeat(colWidths.status + 2) + '┬' + '─'.repeat(colWidths.time + 2) + '┬' + '─'.repeat(colWidths.rate + 2) + '┐')
  lines.push(
    '│ ' +
      'Provider'.padEnd(colWidths.name) +
      ' │ ' +
      'Status'.padEnd(colWidths.status) +
      ' │ ' +
      'Resp Time'.padEnd(colWidths.time) +
      ' │ ' +
      'Success'.padEnd(colWidths.rate) +
      ' │'
  )
  lines.push('├' + '─'.repeat(colWidths.name + 2) + '┼' + '─'.repeat(colWidths.status + 2) + '┼' + '─'.repeat(colWidths.time + 2) + '┼' + '─'.repeat(colWidths.rate + 2) + '┤')

  for (const p of report.providers) {
    const statusEmoji = { operational: '🟢', degraded: '🟡', down: '🔴', unknown: '⚪' }[p.overallStatus]
    lines.push(
      '│ ' +
        p.name.slice(0, colWidths.name).padEnd(colWidths.name) +
        ' │ ' +
        `${statusEmoji} ${p.overallStatus}`.padEnd(colWidths.status + 2) +
        ' │ ' +
        `${p.avgResponseTime.toFixed(0)}ms`.padEnd(colWidths.time) +
        ' │ ' +
        `${(p.successRate * 100).toFixed(1)}%`.padEnd(colWidths.rate) +
        ' │'
    )
  }

  lines.push('└' + '─'.repeat(colWidths.name + 2) + '┴' + '─'.repeat(colWidths.status + 2) + '┴' + '─'.repeat(colWidths.time + 2) + '┴' + '─'.repeat(colWidths.rate + 2) + '┘')

  return lines.join('\n')
}
