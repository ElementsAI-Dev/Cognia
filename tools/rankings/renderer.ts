/**
 * Rankings Data Renderer
 *
 * Renders rankings data to various formats for display.
 * Supports HTML, Markdown, and terminal output.
 */

import type { RankingsData, ModelRanking, MarketShareEntry, AppRanking, SectionData } from './types.js'

export type RenderFormat = 'html' | 'markdown' | 'terminal' | 'json'

export interface RenderOptions {
  format: RenderFormat
  maxModels?: number
  maxApps?: number
  maxMarketShare?: number
  showChange?: boolean
  theme?: 'light' | 'dark'
}

const DEFAULT_OPTIONS: RenderOptions = {
  format: 'terminal',
  maxModels: 20,
  maxApps: 10,
  maxMarketShare: 10,
  showChange: true,
  theme: 'dark',
}

export class RankingsRenderer {
  private options: RenderOptions

  constructor(options: Partial<RenderOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  render(data: RankingsData): string {
    switch (this.options.format) {
      case 'html':
        return this.renderHtml(data)
      case 'markdown':
        return this.renderMarkdown(data)
      case 'json':
        return JSON.stringify(data, null, 2)
      case 'terminal':
      default:
        return this.renderTerminal(data)
    }
  }

  private renderTerminal(data: RankingsData): string {
    const lines: string[] = []

    lines.push('═'.repeat(70))
    lines.push(`  OpenRouter Rankings (${data.timeRange})`)
    lines.push('═'.repeat(70))
    lines.push('')
    lines.push(`📅 Scraped: ${data.scraped_at}`)
    lines.push(`🔗 Source: ${data.source}`)
    lines.push('')

    // Leaderboard
    lines.push('📊 LLM Leaderboard')
    lines.push('─'.repeat(70))

    const models = data.leaderboard.slice(0, this.options.maxModels)
    for (const model of models) {
      const change = this.formatChange(model)
      lines.push(
        `  ${String(model.rank).padStart(2)}. ${model.modelName.padEnd(35)} ${model.tokens.padStart(15)} ${change}`
      )
    }

    if (data.leaderboard.length > this.options.maxModels!) {
      lines.push(`     ... and ${data.leaderboard.length - this.options.maxModels!} more`)
    }
    lines.push('')

    // Market Share
    if (data.marketShare.length > 0) {
      lines.push('📈 Market Share')
      lines.push('─'.repeat(70))

      const shares = data.marketShare.slice(0, this.options.maxMarketShare)
      for (const entry of shares) {
        lines.push(`  ${String(entry.rank).padStart(2)}. ${entry.author.padEnd(20)} ${entry.percentage.padStart(10)}`)
      }
      lines.push('')
    }

    // Top Apps
    if (data.topApps.length > 0) {
      lines.push('📱 Top Apps')
      lines.push('─'.repeat(70))

      const apps = data.topApps.slice(0, this.options.maxApps)
      for (const app of apps) {
        lines.push(`  ${String(app.rank).padStart(2)}. ${app.name.padEnd(25)} ${app.tokens.padStart(15)}`)
        if (app.description) {
          lines.push(`      ${app.description.slice(0, 60)}${app.description.length > 60 ? '...' : ''}`)
        }
      }
      lines.push('')
    }

    lines.push('─'.repeat(70))
    lines.push(`Total: ${data.leaderboard.length} models, ${data.topApps.length} apps`)
    lines.push('')

    return lines.join('\n')
  }

  private renderMarkdown(data: RankingsData): string {
    const lines: string[] = []

    lines.push(`# OpenRouter Rankings (${this.capitalizeTimeRange(data.timeRange)})`)
    lines.push('')
    lines.push(`> Scraped: ${data.scraped_at}`)
    lines.push(`> Source: ${data.source}`)
    lines.push('')

    // Leaderboard
    lines.push('## 📊 LLM Leaderboard')
    lines.push('')
    lines.push('| Rank | Model | Author | Tokens | Change |')
    lines.push('|------|-------|--------|--------|--------|')

    const models = data.leaderboard.slice(0, this.options.maxModels)
    for (const model of models) {
      const change = this.formatChangeMd(model)
      lines.push(`| ${model.rank} | [${model.modelName}](${model.modelUrl}) | [${model.author}](${model.authorUrl}) | ${model.tokens} | ${change} |`)
    }
    lines.push('')

    // Market Share
    if (data.marketShare.length > 0) {
      lines.push('## 📈 Market Share')
      lines.push('')
      lines.push('| Rank | Author | Share |')
      lines.push('|------|--------|-------|')

      const shares = data.marketShare.slice(0, this.options.maxMarketShare)
      for (const entry of shares) {
        lines.push(`| ${entry.rank} | [${entry.author}](${entry.authorUrl}) | ${entry.percentage} |`)
      }
      lines.push('')
    }

    // Top Apps
    if (data.topApps.length > 0) {
      lines.push('## 📱 Top Apps')
      lines.push('')
      lines.push('| Rank | App | Description | Tokens |')
      lines.push('|------|-----|-------------|--------|')

      const apps = data.topApps.slice(0, this.options.maxApps)
      for (const app of apps) {
        const desc = app.description ? app.description.slice(0, 40) + (app.description.length > 40 ? '...' : '') : '-'
        lines.push(`| ${app.rank} | [${app.name}](${app.url}) | ${desc} | ${app.tokens} |`)
      }
      lines.push('')
    }

    return lines.join('\n')
  }

  private renderHtml(data: RankingsData): string {
    const isDark = this.options.theme === 'dark'
    const bgColor = isDark ? '#1a1a2e' : '#ffffff'
    const textColor = isDark ? '#eaeaea' : '#1a1a2e'
    const cardBg = isDark ? '#16213e' : '#f8f9fa'
    const borderColor = isDark ? '#0f3460' : '#dee2e6'
    const accentColor = '#e94560'

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenRouter Rankings (${this.capitalizeTimeRange(data.timeRange)})</title>
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
    h1 {
      font-size: 2rem;
      margin-bottom: 0.5rem;
      color: ${accentColor};
    }
    .meta {
      font-size: 0.875rem;
      opacity: 0.7;
      margin-bottom: 2rem;
    }
    .section {
      background: ${cardBg};
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      border: 1px solid ${borderColor};
    }
    .section-title {
      font-size: 1.25rem;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid ${borderColor};
    }
    th {
      font-weight: 600;
      font-size: 0.875rem;
      text-transform: uppercase;
      opacity: 0.7;
    }
    tr:hover { background: ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'}; }
    a {
      color: ${accentColor};
      text-decoration: none;
    }
    a:hover { text-decoration: underline; }
    .rank {
      font-weight: 700;
      width: 50px;
    }
    .tokens {
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 0.875rem;
    }
    .change {
      font-size: 0.875rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }
    .change.up {
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
    }
    .change.down {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }
    .app-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      margin-right: 0.5rem;
      vertical-align: middle;
    }
    .footer {
      text-align: center;
      margin-top: 2rem;
      font-size: 0.875rem;
      opacity: 0.5;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏆 OpenRouter Rankings</h1>
    <p class="meta">
      Time Range: ${this.capitalizeTimeRange(data.timeRange)} |
      Scraped: ${new Date(data.scraped_at).toLocaleString()} |
      <a href="${data.source}" target="_blank">View Source</a>
    </p>

    <div class="section">
      <h2 class="section-title">📊 LLM Leaderboard</h2>
      <div class="chart-container" style="position: relative; height: 400px; margin-bottom: 1.5rem;">
        <canvas id="chart-leaderboard"></canvas>
      </div>
      <table>
        <thead>
          <tr>
            <th class="rank">#</th>
            <th>Model</th>
            <th>Author</th>
            <th>Tokens</th>
            ${this.options.showChange ? '<th>Change</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${this.renderLeaderboardRows(data.leaderboard.slice(0, this.options.maxModels))}
        </tbody>
      </table>
    </div>

    ${data.marketShare.length > 0 ? `
    <div class="section">
      <h2 class="section-title">📈 Market Share</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; align-items: start;">
        <div class="chart-container" style="position: relative; height: 300px;">
          <canvas id="chart-market-share"></canvas>
        </div>
        <table>
          <thead>
            <tr>
              <th class="rank">#</th>
              <th>Author</th>
              <th>Share</th>
            </tr>
          </thead>
          <tbody>
            ${this.renderMarketShareRows(data.marketShare.slice(0, this.options.maxMarketShare))}
          </tbody>
        </table>
      </div>
    </div>
    ` : ''}

    ${data.topApps.length > 0 ? `
    <div class="section">
      <h2 class="section-title">📱 Top Apps</h2>
      <div class="chart-container" style="position: relative; height: 350px; margin-bottom: 1.5rem;">
        <canvas id="chart-top-apps"></canvas>
      </div>
      <table>
        <thead>
          <tr>
            <th class="rank">#</th>
            <th>App</th>
            <th>Tokens</th>
          </tr>
        </thead>
        <tbody>
          ${this.renderAppRows(data.topApps.slice(0, this.options.maxApps))}
        </tbody>
      </table>
    </div>
    ` : ''}

    ${this.renderSectionCharts(data.sections || [], isDark)}

    <p class="footer">
      Generated by OpenRouter Rankings Scraper |
      Total: ${data.leaderboard.length} models, ${data.topApps.length} apps, ${(data.sections || []).length} chart sections
    </p>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script>
    ${this.generateLeaderboardChart(data.leaderboard.slice(0, 10), isDark)}
    ${this.generateMarketShareChart(data.marketShare, isDark)}
    ${this.generateTopAppsChart(data.topApps.slice(0, 10), isDark)}
    ${this.generateChartScripts(data.sections || [], isDark)}
  </script>
</body>
</html>`
  }

  private renderSectionCharts(sections: SectionData[], isDark: boolean): string {
    if (sections.length === 0) return ''

    const cardBg = isDark ? '#16213e' : '#f8f9fa'
    const borderColor = isDark ? '#0f3460' : '#dee2e6'

    return sections.map(section => {
      const icon = this.getSectionIcon(section.id)
      return `
    <div class="section" style="background: ${cardBg}; border: 1px solid ${borderColor};">
      <h2 class="section-title">${icon} ${section.title}</h2>
      <div class="chart-container" style="position: relative; height: 300px; width: 100%;">
        <canvas id="chart-${section.id}"></canvas>
      </div>
      ${section.entries && section.entries.length > 0 ? `
      <div class="chart-legend" style="margin-top: 1rem; display: flex; flex-wrap: wrap; gap: 0.5rem; font-size: 0.875rem;">
        ${section.entries.slice(0, 10).map((entry, i) => `
          <span style="display: inline-flex; align-items: center; gap: 0.25rem;">
            <span style="width: 12px; height: 12px; border-radius: 2px; background: ${this.getChartColor(i)};"></span>
            ${this.escapeHtml(entry.name)}: ${entry.percentage !== undefined ? entry.percentage + '%' : entry.value}
          </span>
        `).join('')}
      </div>
      ` : ''}
    </div>`
    }).join('\n')
  }

  private generateChartScripts(sections: SectionData[], isDark: boolean): string {
    const textColor = isDark ? '#eaeaea' : '#1a1a2e'

    return sections.map(section => {
      const chartType = section.type === 'pie' ? 'doughnut' : 'bar'
      const entries = section.entries || []

      if (entries.length === 0) return ''

      const labels = entries.slice(0, 15).map(e => e.name)
      const values = entries.slice(0, 15).map(e => e.valueRaw)
      const colors = entries.slice(0, 15).map((_, i) => this.getChartColor(i))

      if (chartType === 'doughnut') {
        return `
    new Chart(document.getElementById('chart-${section.id}'), {
      type: 'doughnut',
      data: {
        labels: ${JSON.stringify(labels)},
        datasets: [{
          data: ${JSON.stringify(values)},
          backgroundColor: ${JSON.stringify(colors)},
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ctx.label + ': ' + ctx.parsed.toLocaleString() + ' (' + Math.round(ctx.parsed / ${values.reduce((a, b) => a + b, 0)} * 100) + '%)'
            }
          }
        }
      }
    });`
      } else {
        return `
    new Chart(document.getElementById('chart-${section.id}'), {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(labels)},
        datasets: [{
          data: ${JSON.stringify(values)},
          backgroundColor: ${JSON.stringify(colors)},
          borderWidth: 0,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ctx.parsed.x.toLocaleString()
            }
          }
        },
        scales: {
          x: {
            grid: { color: '${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}' },
            ticks: { color: '${textColor}' }
          },
          y: {
            grid: { display: false },
            ticks: { color: '${textColor}' }
          }
        }
      }
    });`
      }
    }).join('\n')
  }

  private generateLeaderboardChart(leaderboard: ModelRanking[], isDark: boolean): string {
    if (leaderboard.length === 0) return ''

    const labels = leaderboard.map(m => m.modelName)
    const values = leaderboard.map(m => m.tokensRaw / 1e9) // Convert to billions
    const colors = leaderboard.map((_, i) => this.getChartColor(i))
    const textColor = isDark ? '#eaeaea' : '#1a1a2e'

    return `
    new Chart(document.getElementById('chart-leaderboard'), {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(labels)},
        datasets: [{
          label: 'Tokens (Billions)',
          data: ${JSON.stringify(values)},
          backgroundColor: ${JSON.stringify(colors)},
          borderWidth: 0,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ctx.parsed.x.toFixed(0) + 'B tokens'
            }
          }
        },
        scales: {
          x: {
            grid: { color: '${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}' },
            ticks: { color: '${textColor}', callback: (v) => v + 'B' }
          },
          y: {
            grid: { display: false },
            ticks: { color: '${textColor}' }
          }
        }
      }
    });`
  }

  private generateMarketShareChart(marketShare: MarketShareEntry[], isDark: boolean): string {
    if (marketShare.length === 0) return ''

    const labels = marketShare.map(e => e.author)
    const values = marketShare.map(e => e.percentageRaw)
    const colors = marketShare.map((_, i) => this.getChartColor(i))
    const textColor = isDark ? '#eaeaea' : '#1a1a2e'

    return `
    new Chart(document.getElementById('chart-market-share'), {
      type: 'doughnut',
      data: {
        labels: ${JSON.stringify(labels)},
        datasets: [{
          data: ${JSON.stringify(values)},
          backgroundColor: ${JSON.stringify(colors)},
          borderWidth: 2,
          borderColor: '${isDark ? '#1a1a2e' : '#ffffff'}'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '${textColor}',
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ctx.label + ': ' + ctx.parsed.toFixed(1) + '%'
            }
          }
        }
      }
    });`
  }

  private generateTopAppsChart(topApps: AppRanking[], isDark: boolean): string {
    if (topApps.length === 0) return ''

    const labels = topApps.map(a => a.name)
    const values = topApps.map(a => a.tokensRaw / 1e9) // Convert to billions
    const colors = topApps.map((_, i) => this.getChartColor(i))
    const textColor = isDark ? '#eaeaea' : '#1a1a2e'

    return `
    new Chart(document.getElementById('chart-top-apps'), {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(labels)},
        datasets: [{
          label: 'Tokens (Billions)',
          data: ${JSON.stringify(values)},
          backgroundColor: ${JSON.stringify(colors)},
          borderWidth: 0,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ctx.parsed.x.toFixed(1) + 'B tokens'
            }
          }
        },
        scales: {
          x: {
            grid: { color: '${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}' },
            ticks: { color: '${textColor}', callback: (v) => v + 'B' }
          },
          y: {
            grid: { display: false },
            ticks: { color: '${textColor}' }
          }
        }
      }
    });`
  }

  private getSectionIcon(sectionId: string): string {
    const icons: Record<string, string> = {
      'market-share': '📈',
      'categories': '📂',
      'natural-languages': '🌍',
      'programming-languages': '💻',
      'context-length': '📏',
      'tools': '🔧',
      'images': '🖼️',
    }
    return icons[sectionId] || '📊'
  }

  private getChartColor(index: number): string {
    const colors = [
      '#e94560', '#0f3460', '#16213e', '#533483', '#e94560',
      '#00adb5', '#393e46', '#f38181', '#aa96da', '#fcbad3',
      '#a8d8ea', '#ff9a3c', '#155263', '#ff6b6b', '#4ecdc4'
    ]
    return colors[index % colors.length]
  }

  private renderLeaderboardRows(models: ModelRanking[]): string {
    return models
      .map(
        (model) => `
        <tr>
          <td class="rank">${model.rank}</td>
          <td><a href="${model.modelUrl}" target="_blank">${this.escapeHtml(model.modelName)}</a></td>
          <td><a href="${model.authorUrl}" target="_blank">${this.escapeHtml(model.author)}</a></td>
          <td class="tokens">${model.tokens}</td>
          ${this.options.showChange ? `<td><span class="change ${model.changeDirection}">${this.formatChangeHtml(model)}</span></td>` : ''}
        </tr>
      `
      )
      .join('')
  }

  private renderMarketShareRows(entries: MarketShareEntry[]): string {
    return entries
      .map(
        (entry) => `
        <tr>
          <td class="rank">${entry.rank}</td>
          <td><a href="${entry.authorUrl}" target="_blank">${this.escapeHtml(entry.author)}</a></td>
          <td>${entry.percentage}</td>
        </tr>
      `
      )
      .join('')
  }

  private renderAppRows(apps: AppRanking[]): string {
    return apps
      .map(
        (app) => `
        <tr>
          <td class="rank">${app.rank}</td>
          <td>
            ${app.iconUrl ? `<img src="${app.iconUrl}" alt="" class="app-icon">` : ''}
            <a href="${app.url}" target="_blank">${this.escapeHtml(app.name)}</a>
            ${app.description ? `<br><small style="opacity:0.7">${this.escapeHtml(app.description.slice(0, 60))}</small>` : ''}
          </td>
          <td class="tokens">${app.tokens}</td>
        </tr>
      `
      )
      .join('')
  }

  private formatChange(model: ModelRanking): string {
    if (!this.options.showChange || !model.changePercent) return ''
    const arrow = model.changeDirection === 'up' ? '↑' : model.changeDirection === 'down' ? '↓' : ''
    return `${arrow}${model.changePercent}%`
  }

  private formatChangeMd(model: ModelRanking): string {
    if (!this.options.showChange || !model.changePercent) return '-'
    const arrow = model.changeDirection === 'up' ? '🔼' : model.changeDirection === 'down' ? '🔽' : ''
    return `${arrow} ${model.changePercent}%`
  }

  private formatChangeHtml(model: ModelRanking): string {
    if (!model.changePercent) return '-'
    const arrow = model.changeDirection === 'up' ? '▲' : model.changeDirection === 'down' ? '▼' : ''
    return `${arrow} ${model.changePercent}%`
  }

  private capitalizeTimeRange(timeRange: string): string {
    const map: Record<string, string> = {
      week: 'This Week',
      month: 'This Month',
      all: 'All Time',
    }
    return map[timeRange] || timeRange
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
}

export function renderRankings(data: RankingsData, options?: Partial<RenderOptions>): string {
  const renderer = new RankingsRenderer(options)
  return renderer.render(data)
}
