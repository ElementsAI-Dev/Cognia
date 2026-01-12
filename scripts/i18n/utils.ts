/**
 * i18n Script Utilities
 *
 * Shared utility functions for all i18n scripts.
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  I18nConfig,
  Translations,
  TranslationObject,
  ParsedArgs,
} from './types';

// ANSI colors for terminal output
export const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
} as const;

export const log = {
  info: (msg: string): void => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string): void => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg: string): void => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg: string): void => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  title: (msg: string): void => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
  dim: (msg: string): void => console.log(`${colors.dim}${msg}${colors.reset}`),
};

/**
 * Load configuration from i18n-config.json
 */
export function loadConfig(): I18nConfig {
  const configPath = path.join(__dirname, '..', 'i18n-config.json');
  const content = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(content) as I18nConfig;
}

/**
 * Load JSON file safely
 */
export function loadJSON<T>(filePath: string): T | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Load translations from file
 */
export function loadTranslations(filePath: string): Translations {
  try {
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    return JSON.parse(content) as Translations;
  } catch (error) {
    console.warn(`Could not load translations from ${filePath}:`, (error as Error).message);
    return {};
  }
}

/**
 * Flatten nested translation keys to a Map
 */
export function flattenKeys(
  obj: TranslationObject,
  prefix = ''
): Map<string, string> {
  const keys = new Map<string, string>();

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      flattenKeys(value as TranslationObject, fullKey).forEach((v, k) =>
        keys.set(k, v)
      );
    } else if (typeof value === 'string') {
      keys.set(fullKey, value);
    }
  }

  return keys;
}

/**
 * Parse command line arguments
 */
export function parseArgs(args: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    command: null,
    options: {},
    positional: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        parsed.options[key] = nextArg;
        i++;
      } else {
        parsed.options[key] = true;
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      parsed.options[key] = true;
    } else if (!parsed.command) {
      parsed.command = arg;
    } else {
      parsed.positional.push(arg);
    }
  }

  return parsed;
}

/**
 * Find all component files in a directory
 */
export function findComponentFiles(
  dir: string,
  config: I18nConfig,
  extensions: string[] = ['.tsx', '.ts']
): string[] {
  const files: string[] = [];

  const traverseDir = (currentDir: string): void => {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        // Check exclusion patterns
        let isExcluded = false;
        for (const pattern of config.excludePatterns) {
          const regex = new RegExp(pattern);
          if (regex.test(fullPath)) {
            isExcluded = true;
            break;
          }
        }

        if (isExcluded) continue;

        if (entry.isDirectory()) {
          traverseDir(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch {
      // Skip directories we can't read
    }
  };

  traverseDir(dir);
  return files;
}

/**
 * Get namespace from file path based on config mapping
 */
export function getNamespace(filePath: string, config: I18nConfig): string {
  const relativePath = path.relative(process.cwd(), filePath);

  for (const [dirPattern, namespace] of Object.entries(config.namespaceMapping)) {
    if (relativePath.startsWith(dirPattern)) {
      return namespace;
    }
  }

  // Default: use first directory name after components/
  const match = relativePath.match(/components\/([^/]+)/);
  return match ? match[1] : 'common';
}

/**
 * Generate translation key from string
 */
export function generateKey(str: string, maxLength: number = 50): string {
  let key = str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .trim();

  if (key.length > maxLength) {
    key = key.substring(0, maxLength);
  }

  return key;
}

/**
 * Check if string contains Chinese characters
 */
export function containsChinese(str: string): boolean {
  return /[\u4e00-\u9fff]/.test(str);
}

/**
 * Check if string is user-facing text
 */
export function isUserFacingText(str: string): boolean {
  // Must contain at least one letter
  if (!/[a-zA-Z\u4e00-\u9fff]/.test(str)) return false;

  // Skip if mostly numbers/symbols
  const letterCount = (str.match(/[a-zA-Z\u4e00-\u9fff]/g) || []).length;
  if (letterCount < str.length * 0.3) return false;

  return true;
}

/**
 * Sort object keys alphabetically (recursive)
 */
export function sortKeys<T extends Record<string, unknown>>(obj: T): T {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return obj;
  }

  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(obj).sort();

  for (const key of keys) {
    sorted[key] = sortKeys(obj[key] as Record<string, unknown>);
  }

  return sorted as T;
}

/**
 * Create backup of a file
 */
export function createBackup(filePath: string, backupDir: string): string {
  fs.mkdirSync(backupDir, { recursive: true });

  const fileName = path.basename(filePath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `${fileName}.${timestamp}.backup`);

  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

/**
 * Get current timestamp for file naming
 */
export function generateTimestamp(): string {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19);
}

/**
 * Progress bar generator for terminal output
 */
export function progressBar(
  current: number,
  total: number,
  width: number = 30
): string {
  const percentage = total > 0 ? current / total : 0;
  const filled = Math.round(width * percentage);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const color =
    percentage >= 0.9
      ? colors.green
      : percentage >= 0.5
        ? colors.yellow
        : colors.red;
  return `${color}${bar}${colors.reset} ${(percentage * 100).toFixed(1)}%`;
}

/**
 * Ensure directory exists
 */
export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * Write JSON file with formatting
 */
export function writeJSON(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

/**
 * Get time string for logging
 */
export function getTimeString(): string {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}
