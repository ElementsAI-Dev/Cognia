/**
 * Browser Automation API Types
 *
 * @description Type definitions for browser automation in plugins.
 * Provides a unified interface for web scraping and browser-based data extraction.
 */

/**
 * Browser launch options
 */
export interface BrowserLaunchOptions {
  /** Run browser in headless mode (default: true) */
  headless?: boolean;
  /** Browser type to use */
  browserType?: 'chromium' | 'firefox' | 'webkit';
  /** Viewport width */
  viewportWidth?: number;
  /** Viewport height */
  viewportHeight?: number;
  /** User agent string */
  userAgent?: string;
  /** Extra HTTP headers */
  extraHeaders?: Record<string, string>;
  /** Proxy configuration */
  proxy?: ProxyConfig;
  /** Timeout for browser launch in ms */
  timeout?: number;
  /** Enable JavaScript (default: true) */
  javaScriptEnabled?: boolean;
  /** Device emulation preset */
  device?: 'desktop' | 'mobile' | 'tablet';
  /** Locale for the browser */
  locale?: string;
  /** Timezone for the browser */
  timezone?: string;
}

/**
 * Proxy configuration
 */
export interface ProxyConfig {
  server: string;
  username?: string;
  password?: string;
  bypass?: string[];
}

/**
 * Page navigation options
 */
export interface NavigationOptions {
  /** Wait until network is idle */
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  /** Navigation timeout in ms */
  timeout?: number;
  /** Referer URL */
  referer?: string;
}

/**
 * Element selector options
 */
export interface SelectorOptions {
  /** Timeout for waiting for element */
  timeout?: number;
  /** Wait for element to be visible */
  visible?: boolean;
  /** Wait for element to be hidden */
  hidden?: boolean;
}

/**
 * Screenshot options
 */
export interface ScreenshotOptions {
  /** Screenshot type */
  type?: 'png' | 'jpeg';
  /** JPEG quality (0-100) */
  quality?: number;
  /** Capture full page */
  fullPage?: boolean;
  /** Clip region */
  clip?: { x: number; y: number; width: number; height: number };
  /** Omit background */
  omitBackground?: boolean;
}

/**
 * Screenshot result
 */
export interface ScreenshotResult {
  /** Base64 encoded image data */
  data: string;
  /** Image MIME type */
  mimeType: string;
  /** Image width */
  width: number;
  /** Image height */
  height: number;
}

/**
 * Element information
 */
export interface ElementInfo {
  /** Element tag name */
  tagName: string;
  /** Element text content */
  textContent: string;
  /** Element inner HTML */
  innerHTML: string;
  /** Element attributes */
  attributes: Record<string, string>;
  /** Element bounding box */
  boundingBox?: { x: number; y: number; width: number; height: number };
  /** Whether element is visible */
  isVisible: boolean;
}

/**
 * Table data extracted from page
 */
export interface TableData {
  /** Table headers */
  headers: string[];
  /** Table rows */
  rows: string[][];
  /** Raw HTML of the table */
  html?: string;
}

/**
 * Scrape result
 */
export interface ScrapeResult<T = unknown> {
  /** Whether scraping was successful */
  success: boolean;
  /** Scraped data */
  data?: T;
  /** Error message if failed */
  error?: string;
  /** Page URL */
  url: string;
  /** Page title */
  title?: string;
  /** Screenshot if taken */
  screenshot?: ScreenshotResult;
  /** Scrape duration in ms */
  duration: number;
  /** Timestamp */
  timestamp: string;
}

/**
 * Cookie data
 */
export interface Cookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

/**
 * Browser page interface
 */
export interface BrowserPage {
  /** Navigate to URL */
  goto: (url: string, options?: NavigationOptions) => Promise<void>;
  /** Get current URL */
  url: () => string;
  /** Get page title */
  title: () => Promise<string>;
  /** Get page content */
  content: () => Promise<string>;
  /** Wait for selector */
  waitForSelector: (selector: string, options?: SelectorOptions) => Promise<void>;
  /** Wait for navigation */
  waitForNavigation: (options?: NavigationOptions) => Promise<void>;
  /** Wait for timeout */
  waitForTimeout: (ms: number) => Promise<void>;
  /** Query selector */
  querySelector: (selector: string) => Promise<ElementInfo | null>;
  /** Query selector all */
  querySelectorAll: (selector: string) => Promise<ElementInfo[]>;
  /** Get text content of element */
  textContent: (selector: string) => Promise<string | null>;
  /** Get attribute of element */
  getAttribute: (selector: string, name: string) => Promise<string | null>;
  /** Click element */
  click: (selector: string, options?: { button?: 'left' | 'right' | 'middle'; clickCount?: number }) => Promise<void>;
  /** Type text */
  type: (selector: string, text: string, options?: { delay?: number }) => Promise<void>;
  /** Fill input */
  fill: (selector: string, value: string) => Promise<void>;
  /** Select option */
  select: (selector: string, values: string | string[]) => Promise<void>;
  /** Check checkbox */
  check: (selector: string) => Promise<void>;
  /** Uncheck checkbox */
  uncheck: (selector: string) => Promise<void>;
  /** Take screenshot */
  screenshot: (options?: ScreenshotOptions) => Promise<ScreenshotResult>;
  /** Evaluate JavaScript */
  evaluate: <T>(fn: string | ((...args: unknown[]) => T), ...args: unknown[]) => Promise<T>;
  /** Extract table data */
  extractTable: (selector: string) => Promise<TableData>;
  /** Extract all tables */
  extractTables: () => Promise<TableData[]>;
  /** Get cookies */
  cookies: () => Promise<Cookie[]>;
  /** Set cookies */
  setCookies: (cookies: Cookie[]) => Promise<void>;
  /** Clear cookies */
  clearCookies: () => Promise<void>;
  /** Scroll to element */
  scrollTo: (selector: string) => Promise<void>;
  /** Scroll by pixels */
  scrollBy: (x: number, y: number) => Promise<void>;
  /** Close page */
  close: () => Promise<void>;
}

/**
 * Browser context interface
 */
export interface BrowserContext {
  /** Create new page */
  newPage: () => Promise<BrowserPage>;
  /** Get all pages */
  pages: () => BrowserPage[];
  /** Close context */
  close: () => Promise<void>;
  /** Set cookies for context */
  setCookies: (cookies: Cookie[]) => Promise<void>;
  /** Clear cookies for context */
  clearCookies: () => Promise<void>;
}

/**
 * Browser instance interface
 */
export interface BrowserInstance {
  /** Create new context */
  newContext: (options?: BrowserLaunchOptions) => Promise<BrowserContext>;
  /** Create new page (shortcut) */
  newPage: (options?: BrowserLaunchOptions) => Promise<BrowserPage>;
  /** Check if browser is connected */
  isConnected: () => boolean;
  /** Close browser */
  close: () => Promise<void>;
}

/**
 * Browser Automation API
 *
 * @remarks
 * Provides methods for browser automation and web scraping.
 * Uses Playwright under the hood for cross-browser support.
 *
 * @example
 * ```typescript
 * // Simple scraping
 * const result = await context.browser.scrape('https://example.com', async (page) => {
 *   const title = await page.title();
 *   const content = await page.textContent('main');
 *   return { title, content };
 * });
 *
 * // Extract tables
 * const tables = await context.browser.scrape('https://example.com/data', async (page) => {
 *   return await page.extractTables();
 * });
 *
 * // Take screenshot
 * const screenshot = await context.browser.screenshot('https://example.com', {
 *   fullPage: true,
 * });
 *
 * // Advanced usage with browser instance
 * const browser = await context.browser.launch({ headless: true });
 * const page = await browser.newPage();
 * await page.goto('https://example.com');
 * // ... do stuff
 * await browser.close();
 * ```
 */
export interface PluginBrowserAPI {
  /**
   * Launch a browser instance
   */
  launch: (options?: BrowserLaunchOptions) => Promise<BrowserInstance>;

  /**
   * Scrape a URL with a callback function
   */
  scrape: <T>(
    url: string,
    callback: (page: BrowserPage) => Promise<T>,
    options?: BrowserLaunchOptions & NavigationOptions
  ) => Promise<ScrapeResult<T>>;

  /**
   * Take a screenshot of a URL
   */
  screenshot: (
    url: string,
    options?: BrowserLaunchOptions & NavigationOptions & ScreenshotOptions
  ) => Promise<ScreenshotResult>;

  /**
   * Extract text content from a URL
   */
  extractText: (
    url: string,
    selector?: string,
    options?: BrowserLaunchOptions & NavigationOptions
  ) => Promise<string>;

  /**
   * Extract table data from a URL
   */
  extractTable: (
    url: string,
    selector: string,
    options?: BrowserLaunchOptions & NavigationOptions
  ) => Promise<TableData>;

  /**
   * Extract all tables from a URL
   */
  extractTables: (
    url: string,
    options?: BrowserLaunchOptions & NavigationOptions
  ) => Promise<TableData[]>;

  /**
   * Check if browser automation is available
   */
  isAvailable: () => Promise<boolean>;

  /**
   * Get supported browser types
   */
  getSupportedBrowsers: () => Promise<Array<'chromium' | 'firefox' | 'webkit'>>;
}
