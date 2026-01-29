/**
 * Browser utilities for web scraping
 */

import { chromium, type Browser, type Page, type BrowserContext } from 'playwright'
import type { TableRow, ScraperOptions } from '../types.js'
import { debug, info } from './logger.js'

let browser: Browser | null = null
let context: BrowserContext | null = null

export async function launchBrowser(options: ScraperOptions = {}): Promise<Browser> {
  if (browser) return browser

  debug('Launching browser...')
  browser = await chromium.launch({
    headless: options.headless !== false,
  })

  return browser
}

export async function createPage(locale = 'en-US'): Promise<Page> {
  if (!browser) {
    await launchBrowser()
  }

  context = await browser!.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale,
  })

  return context.newPage()
}

export async function closeBrowser(): Promise<void> {
  if (context) {
    await context.close()
    context = null
  }
  if (browser) {
    await browser.close()
    browser = null
  }
}

export async function navigateAndWait(
  page: Page,
  url: string,
  options: { timeout?: number; waitTime?: number } = {}
): Promise<boolean> {
  const { timeout = 30000, waitTime = 3000 } = options

  try {
    info(`Navigating to: ${url}`)
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout,
    })

    await page.waitForLoadState('networkidle', { timeout })
    await page.waitForTimeout(waitTime)

    // Scroll to load dynamic content
    await page.keyboard.press('End')
    await page.waitForTimeout(1000)
    await page.keyboard.press('Home')
    await page.waitForTimeout(500)

    return true
  } catch (e) {
    debug(`Navigation failed: ${e}`)
    return false
  }
}

export async function extractTables(page: Page): Promise<TableRow[]> {
  const tableData = await page.evaluate(() => {
    const tables = document.querySelectorAll('table')
    const allRows: Array<{ cells: string[] }> = []

    tables.forEach((table) => {
      table.querySelectorAll('tr').forEach((tr) => {
        const cells: string[] = []
        tr.querySelectorAll('th, td').forEach((cell) => {
          cells.push(cell.textContent?.trim() || '')
        })
        if (cells.length > 0) {
          allRows.push({ cells })
        }
      })
    })

    return allRows
  })

  return tableData
}

export async function extractListItems(page: Page, filter?: (text: string) => boolean): Promise<string[]> {
  const items = await page.evaluate(() => {
    const elements: string[] = []
    document.querySelectorAll('li, div, p, span').forEach((el) => {
      const text = el.textContent?.trim() || ''
      if (text.length > 10 && text.length < 500) {
        elements.push(text)
      }
    })
    return elements
  })

  return filter ? items.filter(filter) : items
}

export async function extractRawText(page: Page): Promise<string> {
  return page.evaluate(() => document.body.innerText)
}

export async function takeScreenshot(page: Page, path: string): Promise<void> {
  await page.screenshot({ path, fullPage: true })
  info(`Screenshot saved: ${path}`)
}
