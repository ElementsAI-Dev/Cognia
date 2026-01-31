/**
 * Output utilities for LMArena scraper
 */

import * as fs from 'fs'
import * as path from 'path'
import type { AllLeaderboardsData, LeaderboardData, LeaderboardCategory, ArenaType } from '../types.js'

/**
 * Ensure output directory exists
 */
export function ensureOutputDir(outputDir: string): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
}

/**
 * Save leaderboard data to JSON file
 */
export function saveLeaderboardData(data: AllLeaderboardsData, outputDir: string): void {
  ensureOutputDir(outputDir)

  const filename = `lmarena-leaderboard-${new Date().toISOString().split('T')[0]}.json`
  const filepath = path.join(outputDir, filename)

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2))
  console.log(`📁 Saved: ${filepath}`)

  // Also save as latest
  const latestPath = path.join(outputDir, 'lmarena-leaderboard-latest.json')
  fs.writeFileSync(latestPath, JSON.stringify(data, null, 2))
}

/**
 * Load cached leaderboard data
 */
export function loadLeaderboardData(outputDir: string): AllLeaderboardsData | null {
  const latestPath = path.join(outputDir, 'lmarena-leaderboard-latest.json')

  if (!fs.existsSync(latestPath)) {
    return null
  }

  try {
    const content = fs.readFileSync(latestPath, 'utf-8')
    return JSON.parse(content) as AllLeaderboardsData
  } catch {
    return null
  }
}

/**
 * Export leaderboard to CSV
 */
export function exportToCsv(
  data: LeaderboardData,
  outputDir: string,
  category: LeaderboardCategory,
  arenaType: ArenaType
): void {
  ensureOutputDir(outputDir)

  const filename = `lmarena-${arenaType}-${category}-${new Date().toISOString().split('T')[0]}.csv`
  const filepath = path.join(outputDir, filename)

  const headers = ['rank', 'model_id', 'model_name', 'score', 'organization', 'license', 'input_price', 'output_price']
  const rows = data.entries.map((entry) => [
    entry.rank,
    entry.modelId,
    entry.modelName,
    entry.score,
    entry.organization || '',
    entry.license || '',
    entry.inputPrice || '',
    entry.outputPrice || '',
  ])

  const csv = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n')

  fs.writeFileSync(filepath, csv)
  console.log(`📁 Exported CSV: ${filepath}`)
}

/**
 * Export all leaderboards to CSV
 */
export function exportAllToCsv(data: AllLeaderboardsData, outputDir: string): void {
  ensureOutputDir(outputDir)

  // Export text leaderboards
  for (const [category, leaderboard] of Object.entries(data.text)) {
    exportToCsv(leaderboard, outputDir, category as LeaderboardCategory, 'text')
  }

  // Export vision leaderboards
  if (data.vision) {
    for (const [category, leaderboard] of Object.entries(data.vision)) {
      exportToCsv(leaderboard, outputDir, category as LeaderboardCategory, 'vision')
    }
  }
}

/**
 * Count total unique models
 */
export function countUniqueModels(data: AllLeaderboardsData): number {
  const modelIds = new Set<string>()

  for (const leaderboard of Object.values(data.text)) {
    for (const entry of leaderboard.entries) {
      modelIds.add(entry.modelId)
    }
  }

  if (data.vision) {
    for (const leaderboard of Object.values(data.vision)) {
      for (const entry of leaderboard.entries) {
        modelIds.add(entry.modelId)
      }
    }
  }

  return modelIds.size
}

/**
 * Get latest scores for comparison
 */
export function getLatestScores(data: AllLeaderboardsData, category: LeaderboardCategory = 'overall'): Map<string, number> {
  const scores = new Map<string, number>()

  const leaderboard = data.text[category]
  if (leaderboard) {
    for (const entry of leaderboard.entries) {
      scores.set(entry.modelId, entry.score)
    }
  }

  return scores
}
