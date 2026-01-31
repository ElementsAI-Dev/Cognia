/**
 * Renderer for LMArena leaderboard data
 */

import type { AllLeaderboardsData, LeaderboardData } from './types.js'

export type RenderFormat = 'terminal' | 'markdown' | 'html' | 'json'

export interface RenderOptions {
  format: RenderFormat
  maxModels?: number
  showPrices?: boolean
  showOrganization?: boolean
  theme?: 'light' | 'dark'
}

const DEFAULT_OPTIONS: RenderOptions = {
  format: 'terminal',
  maxModels: 30,
  showPrices: true,
  showOrganization: true,
  theme: 'dark',
}

/**
 * Render leaderboard data to various formats
 */
export class LMArenaRenderer {
  private options: RenderOptions

  constructor(options: Partial<RenderOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  render(data: AllLeaderboardsData): string {
    switch (this.options.format) {
      case 'markdown':
        return this.renderMarkdown(data)
      case 'html':
        return this.renderHtml(data)
      case 'json':
        return JSON.stringify(data, null, 2)
      default:
        return this.renderTerminal(data)
    }
  }

  private renderTerminal(data: AllLeaderboardsData): string {
    const lines: string[] = []

    lines.push('')
    lines.push('═'.repeat(80))
    lines.push('  LMArena Leaderboard')
    lines.push('═'.repeat(80))
    lines.push(`  Scraped: ${data.scrapedAt}`)
    lines.push(`  Sources: ${data.sources.join(', ')}`)
    lines.push('')

    for (const [category, leaderboard] of Object.entries(data.text)) {
      lines.push(this.renderCategoryTerminal(leaderboard, category))
    }

    return lines.join('\n')
  }

  private renderCategoryTerminal(leaderboard: LeaderboardData, category: string): string {
    const lines: string[] = []
    const maxModels = this.options.maxModels || 30

    lines.push('─'.repeat(80))
    lines.push(`  📊 ${category.toUpperCase()} (${leaderboard.totalModels} models)`)
    lines.push(`     Last updated: ${leaderboard.lastUpdated}`)
    lines.push('─'.repeat(80))
    lines.push('')

    const entries = leaderboard.entries.slice(0, maxModels)

    for (const entry of entries) {
      const rank = String(entry.rank).padStart(3)
      const score = entry.score.toFixed(1).padStart(7)
      const name = entry.modelName.slice(0, 40).padEnd(40)
      const org = entry.organization ? ` [${entry.organization}]` : ''

      lines.push(`  ${rank}. ${score}  ${name}${org}`)
    }

    if (leaderboard.entries.length > maxModels) {
      lines.push(`       ... and ${leaderboard.entries.length - maxModels} more models`)
    }

    lines.push('')
    return lines.join('\n')
  }

  private renderMarkdown(data: AllLeaderboardsData): string {
    const lines: string[] = []

    lines.push('# LMArena Leaderboard')
    lines.push('')
    lines.push(`> Scraped: ${data.scrapedAt}`)
    lines.push(`> Sources: ${data.sources.join(', ')}`)
    lines.push('')

    for (const [category, leaderboard] of Object.entries(data.text)) {
      lines.push(this.renderCategoryMarkdown(leaderboard, category))
    }

    return lines.join('\n')
  }

  private renderCategoryMarkdown(leaderboard: LeaderboardData, category: string): string {
    const lines: string[] = []
    const maxModels = this.options.maxModels || 30

    lines.push(`## ${this.formatCategoryName(category)}`)
    lines.push('')
    lines.push(`**${leaderboard.totalModels} models** | Last updated: ${leaderboard.lastUpdated}`)
    lines.push('')

    // Table header
    const headers = ['Rank', 'Model', 'Score']
    if (this.options.showOrganization) headers.push('Organization')
    if (this.options.showPrices) headers.push('Price ($/M tokens)')

    lines.push('| ' + headers.join(' | ') + ' |')
    lines.push('| ' + headers.map(() => '---').join(' | ') + ' |')

    const entries = leaderboard.entries.slice(0, maxModels)

    for (const entry of entries) {
      const row = [String(entry.rank), entry.modelName, entry.score.toFixed(1)]

      if (this.options.showOrganization) {
        row.push(entry.organization || '-')
      }

      if (this.options.showPrices) {
        if (entry.inputPrice !== undefined && entry.outputPrice !== undefined) {
          row.push(`$${entry.inputPrice}/$${entry.outputPrice}`)
        } else {
          row.push('-')
        }
      }

      lines.push('| ' + row.join(' | ') + ' |')
    }

    lines.push('')
    return lines.join('\n')
  }

  private renderHtml(data: AllLeaderboardsData): string {
    const isDark = this.options.theme === 'dark'
    const bgColor = isDark ? '#1a1a2e' : '#ffffff'
    const textColor = isDark ? '#eaeaea' : '#333333'
    const headerBg = isDark ? '#16213e' : '#f5f5f5'
    const borderColor = isDark ? '#0f3460' : '#dddddd'
    const accentColor = isDark ? '#e94560' : '#007bff'

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LMArena Leaderboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: ${bgColor};
      color: ${textColor};
      padding: 2rem;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: ${accentColor}; margin-bottom: 0.5rem; }
    .meta { color: #888; margin-bottom: 2rem; font-size: 0.9rem; }
    .category { margin-bottom: 3rem; }
    .category h2 { color: ${accentColor}; margin-bottom: 1rem; border-bottom: 2px solid ${borderColor}; padding-bottom: 0.5rem; }
    .category-meta { color: #888; margin-bottom: 1rem; font-size: 0.85rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th { background: ${headerBg}; text-align: left; padding: 0.75rem; border-bottom: 2px solid ${borderColor}; }
    td { padding: 0.75rem; border-bottom: 1px solid ${borderColor}; }
    tr:hover { background: ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'}; }
    .rank { font-weight: bold; color: ${accentColor}; width: 60px; }
    .score { font-family: monospace; font-weight: bold; }
    .org { color: #888; font-size: 0.85rem; }
    .price { font-family: monospace; color: #888; font-size: 0.85rem; }
    .top-3 { background: ${isDark ? 'rgba(233,69,96,0.1)' : 'rgba(0,123,255,0.05)'}; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏆 LMArena Leaderboard</h1>
    <p class="meta">Scraped: ${data.scrapedAt} | Sources: ${data.sources.join(', ')}</p>
`

    for (const [category, leaderboard] of Object.entries(data.text)) {
      html += this.renderCategoryHtml(leaderboard, category)
    }

    html += `
  </div>
</body>
</html>`

    return html
  }

  private renderCategoryHtml(leaderboard: LeaderboardData, category: string): string {
    const maxModels = this.options.maxModels || 30
    const entries = leaderboard.entries.slice(0, maxModels)

    let html = `
    <div class="category">
      <h2>${this.formatCategoryName(category)}</h2>
      <p class="category-meta">${leaderboard.totalModels} models | Last updated: ${leaderboard.lastUpdated}</p>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Model</th>
            <th>Score</th>
            ${this.options.showOrganization ? '<th>Organization</th>' : ''}
            ${this.options.showPrices ? '<th>Price ($/M)</th>' : ''}
          </tr>
        </thead>
        <tbody>
`

    for (const entry of entries) {
      const rowClass = entry.rank <= 3 ? 'top-3' : ''
      const priceStr =
        entry.inputPrice !== undefined && entry.outputPrice !== undefined ? `$${entry.inputPrice}/$${entry.outputPrice}` : '-'

      html += `
          <tr class="${rowClass}">
            <td class="rank">#${entry.rank}</td>
            <td>${entry.modelName}</td>
            <td class="score">${entry.score.toFixed(1)}</td>
            ${this.options.showOrganization ? `<td class="org">${entry.organization || '-'}</td>` : ''}
            ${this.options.showPrices ? `<td class="price">${priceStr}</td>` : ''}
          </tr>`
    }

    html += `
        </tbody>
      </table>
    </div>`

    return html
  }

  private formatCategoryName(category: string): string {
    return category
      .replace(/_/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
}

/**
 * Quick render function
 */
export function renderLeaderboard(data: AllLeaderboardsData, options?: Partial<RenderOptions>): string {
  const renderer = new LMArenaRenderer(options)
  return renderer.render(data)
}
