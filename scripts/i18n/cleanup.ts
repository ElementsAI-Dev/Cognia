#!/usr/bin/env ts-node
/**
 * i18n Cleanup Script
 *
 * Removes orphaned translation keys that are no longer used in the codebase.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  loadConfig,
  loadTranslations,
  flattenKeys,
  findComponentFiles,
  ensureDir,
  writeJSON,
  sortKeys,
  createBackup,
  log,
} from './utils';
import type { TranslationObject, Translations } from './types';

interface CliOptions {
  verbose: boolean;
  dryRun: boolean;
  force: boolean;
  noBackup: boolean;
  namespace?: string;
  help: boolean;
}

function parseCliOptions(args: string[]): CliOptions {
  return {
    verbose: args.includes('--verbose'),
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    noBackup: args.includes('--no-backup'),
    namespace: args.find((a, i) => args[i - 1] === '--namespace'),
    help: args.includes('--help') || args.includes('-h'),
  };
}

function showHelp(): void {
  console.log(`
i18n Cleanup Script

Usage: npx ts-node scripts/i18n/cleanup.ts [options]

Options:
  --verbose           Show detailed output
  --dry-run           Preview without writing files
  --force             Skip confirmation prompt
  --no-backup         Skip creating backups
  --namespace <ns>    Only cleanup specific namespace
  --help, -h          Show this help message

Examples:
  npx ts-node scripts/i18n/cleanup.ts --dry-run
  npx ts-node scripts/i18n/cleanup.ts --verbose
  npx ts-node scripts/i18n/cleanup.ts --namespace chat
`);
}

function findUsedKeys(config: ReturnType<typeof loadConfig>): Set<string> {
  const usedKeys = new Set<string>();
  const keyPattern = /t\(['"]([^'"]+)['"]\)/g;
  const namespacePattern = /useTranslations\(['"]([^'"]+)['"]\)/;

  for (const targetDir of config.targetDirectories) {
    const fullPath = path.join(process.cwd(), targetDir);
    if (!fs.existsSync(fullPath)) continue;

    const files = findComponentFiles(fullPath, config);

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const nsMatch = content.match(namespacePattern);
        const namespace = nsMatch ? nsMatch[1] : null;

        if (!namespace) continue;

        let match: RegExpExecArray | null;
        while ((match = keyPattern.exec(content)) !== null) {
          const key = match[1];
          if (key !== namespace) {
            usedKeys.add(`${namespace}.${key}`);
          }
        }
      } catch {
        // Skip files that can't be read
      }
    }
  }

  return usedKeys;
}

function removeOrphanedKeys(
  translations: Translations,
  usedKeys: Set<string>,
  namespace?: string
): { cleaned: Translations; removed: string[] } {
  const cleaned: Translations = {};
  const removed: string[] = [];

  for (const [ns, nsObj] of Object.entries(translations)) {
    if (namespace && ns !== namespace) {
      cleaned[ns] = nsObj;
      continue;
    }

    const cleanedNs: TranslationObject = {};

    const processObject = (
      obj: TranslationObject,
      prefix: string
    ): TranslationObject => {
      const result: TranslationObject = {};

      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : `${ns}.${key}`;

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const nested = processObject(value as TranslationObject, fullKey);
          if (Object.keys(nested).length > 0) {
            result[key] = nested;
          }
        } else {
          if (usedKeys.has(fullKey)) {
            result[key] = value;
          } else {
            removed.push(fullKey);
          }
        }
      }

      return result;
    };

    cleanedNs[ns] = processObject(nsObj as unknown as TranslationObject, '');
    if (Object.keys(cleanedNs[ns] as TranslationObject).length > 0) {
      cleaned[ns] = cleanedNs[ns] as TranslationObject;
    }
  }

  return { cleaned, removed };
}

export function main(): void {
  const args = process.argv.slice(2);
  const cliOptions = parseCliOptions(args);

  if (cliOptions.help) {
    showHelp();
    process.exit(0);
  }

  console.log('🧹 Cleaning up orphaned translation keys...\n');

  const config = loadConfig();

  // Find used keys
  console.log('📂 Scanning components for used keys...');
  const usedKeys = findUsedKeys(config);
  console.log(`   Found ${usedKeys.size} used keys`);

  // Load translations (supports both single file and split directory)
  const enPath = path.join(process.cwd(), config.existingTranslations.enPath);
  const zhPath = path.join(process.cwd(), config.existingTranslations.zhCNPath);
  const isSplitFiles = fs.existsSync(enPath) && fs.statSync(enPath).isDirectory();

  const enTranslations = loadTranslations(config.existingTranslations.enPath);
  const zhTranslations = loadTranslations(config.existingTranslations.zhCNPath);

  const enKeys = flattenKeys(enTranslations as unknown as TranslationObject);
  console.log(`   Total keys in ${isSplitFiles ? 'en/' : 'en.json'}: ${enKeys.size}`);

  // Remove orphaned keys
  const enResult = removeOrphanedKeys(enTranslations, usedKeys, cliOptions.namespace);
  const zhResult = removeOrphanedKeys(zhTranslations, usedKeys, cliOptions.namespace);

  if (enResult.removed.length === 0) {
    log.success('No orphaned keys found!');
    return;
  }

  console.log(`\n🗑️  Found ${enResult.removed.length} orphaned keys`);

  if (cliOptions.verbose) {
    console.log('\nOrphaned keys:');
    for (const key of enResult.removed.slice(0, 50)) {
      console.log(`  - ${key}`);
    }
    if (enResult.removed.length > 50) {
      console.log(`  ... and ${enResult.removed.length - 50} more`);
    }
  }

  // Confirm - skip interactive prompt if force or dryRun
  if (!cliOptions.force && !cliOptions.dryRun) {
    log.warn(`Will remove ${enResult.removed.length} orphaned keys. Use --force to confirm or --dry-run to preview.`);
    process.exit(0);
  }

  performCleanup();

  function performCleanup(): void {
    if (cliOptions.dryRun) {
      log.warn('Dry run - no files were written.');
      return;
    }

    // Create backups
    if (!cliOptions.noBackup && config.backupSettings.enabled) {
      const backupDir = path.join(process.cwd(), config.backupSettings.backupDir, 'pre-cleanup');
      ensureDir(backupDir);
      
      if (isSplitFiles) {
        // Backup split files by copying the directory
        const enBackupDir = path.join(backupDir, 'en');
        const zhBackupDir = path.join(backupDir, 'zh-CN');
        ensureDir(enBackupDir);
        ensureDir(zhBackupDir);
        
        for (const file of fs.readdirSync(enPath).filter(f => f.endsWith('.json'))) {
          fs.copyFileSync(path.join(enPath, file), path.join(enBackupDir, file));
        }
        for (const file of fs.readdirSync(zhPath).filter(f => f.endsWith('.json'))) {
          fs.copyFileSync(path.join(zhPath, file), path.join(zhBackupDir, file));
        }
      } else {
        createBackup(enPath, backupDir);
        createBackup(zhPath, backupDir);
      }
      log.success('Backups created');
    }

    // Write cleaned translations
    if (isSplitFiles) {
      // For split files, we need to update each JSON file in the directory
      const updateSplitFiles = (dirPath: string, cleaned: Translations): void => {
        for (const file of fs.readdirSync(dirPath).filter(f => f.endsWith('.json'))) {
          const filePath = path.join(dirPath, file);
          const original = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          const filtered: Record<string, unknown> = {};
          
          for (const [key, value] of Object.entries(original)) {
            if (key in cleaned || (typeof value === 'object' && value !== null)) {
              filtered[key] = value;
            }
          }
          
          if (Object.keys(filtered).length > 0) {
            writeJSON(filePath, sortKeys(filtered));
          }
        }
      };
      
      updateSplitFiles(enPath, enResult.cleaned);
      updateSplitFiles(zhPath, zhResult.cleaned);
    } else {
      writeJSON(enPath, sortKeys(enResult.cleaned as Record<string, unknown>));
      writeJSON(zhPath, sortKeys(zhResult.cleaned as Record<string, unknown>));
    }

    log.success(`Updated: ${enPath}`);
    log.success(`Updated: ${zhPath}`);

    // Save cleanup report
    const reportsDir = path.join(process.cwd(), 'i18n-reports');
    ensureDir(reportsDir);
    const reportPath = path.join(reportsDir, 'cleanup-report.json');
    writeJSON(reportPath, {
      timestamp: new Date().toISOString(),
      removedCount: enResult.removed.length,
      removedKeys: enResult.removed,
    });
    log.success(`Cleanup report saved: ${reportPath}`);

    console.log('\n📊 Cleanup Summary:');
    console.log(`   Keys removed: ${enResult.removed.length}`);
    log.success('Cleanup complete!\n');
  }
}

if (require.main === module) {
  main();
}
