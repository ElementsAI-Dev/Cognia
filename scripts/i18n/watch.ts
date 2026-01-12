#!/usr/bin/env ts-node
/**
 * i18n Watch Script
 *
 * Watches for changes in source and translation files, auto-validates on change.
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadConfig, log, colors, getTimeString } from './utils';

interface CliOptions {
  verbose: boolean;
  help: boolean;
}

function parseCliOptions(args: string[]): CliOptions {
  return {
    verbose: args.includes('--verbose'),
    help: args.includes('--help') || args.includes('-h'),
  };
}

function showHelp(): void {
  console.log(`
i18n Watch Script

Usage: npx ts-node scripts/i18n/watch.ts [options]

Options:
  --verbose           Show detailed output
  --help, -h          Show this help message

Examples:
  npx ts-node scripts/i18n/watch.ts
  npx ts-node scripts/i18n/watch.ts --verbose
`);
}

function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

function quickValidate(config: ReturnType<typeof loadConfig>): void {
  const timestamp = getTimeString();
  console.log(`\n${colors.dim}[${timestamp}]${colors.reset} Running quick validation...`);

  try {
    const enPath = path.join(process.cwd(), config.existingTranslations.enPath);
    const zhPath = path.join(process.cwd(), config.existingTranslations.zhCNPath);

    const enContent = fs.readFileSync(enPath, 'utf-8');
    const zhContent = fs.readFileSync(zhPath, 'utf-8');

    let enData: Record<string, unknown>;
    let zhData: Record<string, unknown>;

    try {
      enData = JSON.parse(enContent);
      zhData = JSON.parse(zhContent);
    } catch {
      log.error('Invalid JSON in translation files!');
      return;
    }

    const flattenKeys = (obj: Record<string, unknown>, prefix = ''): Set<string> => {
      const keys = new Set<string>();
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          flattenKeys(value as Record<string, unknown>, fullKey).forEach((k) => keys.add(k));
        } else {
          keys.add(fullKey);
        }
      }
      return keys;
    };

    const enKeys = flattenKeys(enData);
    const zhKeys = flattenKeys(zhData);

    let missingZh = 0;
    let emptyZh = 0;

    for (const key of enKeys) {
      if (!zhKeys.has(key)) {
        missingZh++;
      }
    }

    const checkEmpty = (obj: Record<string, unknown>, prefix = ''): void => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          checkEmpty(value as Record<string, unknown>, prefix ? `${prefix}.${key}` : key);
        } else if (typeof value === 'string') {
          if (!value || value.startsWith('[TODO]') || value.trim() === '') {
            emptyZh++;
          }
        }
      }
    };
    checkEmpty(zhData);

    if (missingZh === 0 && emptyZh === 0) {
      log.success('All translations are complete!');
    } else {
      if (missingZh > 0) {
        log.warn(`Missing zh-CN translations: ${missingZh}`);
      }
      if (emptyZh > 0) {
        log.warn(`Empty/TODO translations: ${emptyZh}`);
      }
    }
  } catch (error) {
    log.error(`Validation error: ${(error as Error).message}`);
  }
}

export function main(): void {
  const args = process.argv.slice(2);
  const cliOptions = parseCliOptions(args);

  if (cliOptions.help) {
    showHelp();
    process.exit(0);
  }

  const config = loadConfig();

  log.title('👀 i18n Watch Mode');
  console.log('Watching for changes in translation files...');
  console.log('Press Ctrl+C to stop.\n');

  const debouncedValidate = debounce(() => quickValidate(config), 500);

  // Watch translation files
  const enPath = path.join(process.cwd(), config.existingTranslations.enPath);
  const zhPath = path.join(process.cwd(), config.existingTranslations.zhCNPath);

  const watchFile = (filePath: string, name: string): void => {
    if (!fs.existsSync(filePath)) {
      log.warn(`File not found: ${filePath}`);
      return;
    }

    fs.watch(filePath, (eventType) => {
      if (eventType === 'change') {
        console.log(`${colors.cyan}${name}${colors.reset} changed`);
        debouncedValidate();
      }
    });

    if (cliOptions.verbose) {
      log.info(`Watching: ${filePath}`);
    }
  };

  watchFile(enPath, 'en.json');
  watchFile(zhPath, 'zh-CN.json');

  // Watch component directories
  for (const targetDir of config.targetDirectories) {
    const fullPath = path.join(process.cwd(), targetDir);
    if (!fs.existsSync(fullPath)) continue;

    try {
      fs.watch(fullPath, { recursive: true }, (eventType, filename) => {
        if (filename && (filename.endsWith('.tsx') || filename.endsWith('.ts'))) {
          console.log(`${colors.cyan}${targetDir}/${filename}${colors.reset} changed`);
          debouncedValidate();
        }
      });

      if (cliOptions.verbose) {
        log.info(`Watching: ${fullPath}`);
      }
    } catch {
      // Some systems don't support recursive watch
      log.warn(`Could not watch: ${targetDir}`);
    }
  }

  // Initial validation
  quickValidate(config);

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n\nWatch mode stopped.');
    process.exit(0);
  });
}

if (require.main === module) {
  main();
}
