/**
 * LMArena Leaderboard Scraper
 *
 * Scrapes model rankings from LMArena (Chatbot Arena) leaderboard.
 *
 * Data Sources:
 * - nakasyou/lmarena-history (JSON, converted from HuggingFace pickle files)
 * - lmarena/arena-catalog (model metadata, pricing)
 * - HuggingFace lmarena-ai/chatbot-arena-leaderboard (original pickle files)
 *
 * @example
 * ```ts
 * import { scrapeLMArena, renderLeaderboard } from './tools/lmarena'
 *
 * const result = await scrapeLMArena({ includeHistory: true })
 * if (result.success) {
 *   console.log(renderLeaderboard(result.data, { format: 'markdown' }))
 * }
 * ```
 */

export * from './types.js'
export { LMArenaScraper, scrapeLMArena } from './scraper.js'
export { LMArenaRenderer, renderLeaderboard } from './renderer.js'
export type { RenderFormat, RenderOptions } from './renderer.js'
