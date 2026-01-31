/**
 * Output utilities for rankings scraper
 */

import * as fs from 'fs'
import * as path from 'path'
import type { RankingsData, AllRankingsData } from '../types.js'

export function ensureOutputDir(outputDir: string): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
}

export function saveRankingsData(data: RankingsData, outputDir: string): void {
  ensureOutputDir(outputDir)

  const filename = `openrouter-rankings-${data.timeRange}.json`
  const filepath = path.join(outputDir, filename)

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2))
  console.log(`📄 Saved: ${filepath}`)
}

export function saveAllRankings(data: AllRankingsData, outputDir: string): void {
  ensureOutputDir(outputDir)

  const filepath = path.join(outputDir, 'openrouter-rankings-all.json')
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2))
  console.log(`📄 Saved: ${filepath}`)
}

export function loadRankingsData(timeRange: string, outputDir: string): RankingsData | null {
  const filename = `openrouter-rankings-${timeRange}.json`
  const filepath = path.join(outputDir, filename)

  if (!fs.existsSync(filepath)) {
    return null
  }

  try {
    const content = fs.readFileSync(filepath, 'utf-8')
    return JSON.parse(content) as RankingsData
  } catch {
    return null
  }
}

export function exportToCsv(data: RankingsData, outputDir: string): void {
  ensureOutputDir(outputDir)

  // Export leaderboard
  const leaderboardCsv = [
    'Rank,Model ID,Model Name,Author,Tokens,Change %,Direction',
    ...data.leaderboard.map(
      (m) =>
        `${m.rank},"${m.modelId}","${m.modelName}","${m.author}","${m.tokens}",${m.changePercent},${m.changeDirection}`
    ),
  ].join('\n')

  const leaderboardPath = path.join(outputDir, `openrouter-leaderboard-${data.timeRange}.csv`)
  fs.writeFileSync(leaderboardPath, leaderboardCsv)
  console.log(`📄 Saved: ${leaderboardPath}`)

  // Export market share
  const marketShareCsv = [
    'Rank,Author,Percentage',
    ...data.marketShare.map((m) => `${m.rank},"${m.author}",${m.percentageRaw}`),
  ].join('\n')

  const marketSharePath = path.join(outputDir, `openrouter-market-share-${data.timeRange}.csv`)
  fs.writeFileSync(marketSharePath, marketShareCsv)
  console.log(`📄 Saved: ${marketSharePath}`)

  // Export top apps
  const appsCsv = [
    'Rank,Name,Description,Tokens',
    ...data.topApps.map((a) => `${a.rank},"${a.name}","${a.description}","${a.tokens}"`),
  ].join('\n')

  const appsPath = path.join(outputDir, `openrouter-top-apps-${data.timeRange}.csv`)
  fs.writeFileSync(appsPath, appsCsv)
  console.log(`📄 Saved: ${appsPath}`)
}

export function countModels(data: RankingsData): number {
  return data.leaderboard.length
}

export function countApps(data: RankingsData): number {
  return data.topApps.length
}
