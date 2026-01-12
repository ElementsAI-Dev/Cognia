#!/usr/bin/env ts-node
/**
 * i18n Merge Script
 *
 * Merges generated translation additions into existing translation files.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  loadConfig,
  loadTranslations,
  loadJSON,
  ensureDir,
  writeJSON,
  sortKeys,
  createBackup,
  log,
} from './utils';
import type { MergeChange, MergeResult, MergeStats, TranslationObject } from './types';

interface CliOptions {
  verbose: boolean;
  dryRun: boolean;
  force: boolean;
  noBackup: boolean;
  help: boolean;
}

function parseCliOptions(args: string[]): CliOptions {
  return {
    verbose: args.includes('--verbose'),
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    noBackup: args.includes('--no-backup'),
    help: args.includes('--help') || args.includes('-h'),
  };
}

function showHelp(): void {
  console.log(`
i18n Merge Script

Usage: npx ts-node scripts/i18n/merge.ts [options]

Options:
  --verbose           Show detailed output
  --dry-run           Preview without writing files
  --force             Overwrite conflicting keys
  --no-backup         Skip creating backups
  --help, -h          Show this help message

Examples:
  npx ts-node scripts/i18n/merge.ts
  npx ts-node scripts/i18n/merge.ts --dry-run
  npx ts-node scripts/i18n/merge.ts --force
`);
}

function deepMerge(
  target: TranslationObject,
  source: TranslationObject,
  force: boolean = false
): MergeResult {
  const result = { ...target };
  const changes: MergeChange[] = [];

  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      if (!result[key]) {
        result[key] = {};
        changes.push({ type: 'add-namespace', key, value });
      }
      const nested = deepMerge(
        result[key] as TranslationObject,
        value as TranslationObject,
        force
      );
      result[key] = nested.result;
      changes.push(...nested.changes.map((c) => ({ ...c, key: `${key}.${c.key}` })));
    } else {
      const strValue = value as string;
      if (result[key] !== undefined) {
        if (result[key] === strValue) {
          changes.push({ type: 'skip', key, reason: 'identical' });
        } else if (force) {
          changes.push({
            type: 'conflict',
            key,
            existing: result[key] as string,
            new: strValue,
          });
          result[key] = strValue;
        } else {
          changes.push({
            type: 'skip',
            key,
            reason: 'conflict',
            existing: result[key] as string,
            new: strValue,
          });
        }
      } else {
        result[key] = strValue;
        changes.push({ type: 'add', key, value: strValue });
      }
    }
  }

  return { result, changes };
}

export function main(): void {
  const args = process.argv.slice(2);
  const cliOptions = parseCliOptions(args);

  if (cliOptions.help) {
    showHelp();
    process.exit(0);
  }

  console.log('🔀 Merging translations...\n');

  const config = loadConfig();
  const reportsDir = path.join(process.cwd(), 'i18n-reports');
  const additionsPath = path.join(reportsDir, 'translation-additions.json');

  if (!fs.existsSync(additionsPath)) {
    log.error('Translation additions not found. Run pnpm i18n:generate first.');
    process.exit(1);
  }

  interface TranslationAdditions {
    en: TranslationObject;
    'zh-CN': TranslationObject;
  }

  const additions = loadJSON<TranslationAdditions>(additionsPath);
  if (!additions) {
    log.error('Failed to load translation additions.');
    process.exit(1);
  }

  const enPath = path.join(process.cwd(), config.existingTranslations.enPath);
  const zhPath = path.join(process.cwd(), config.existingTranslations.zhCNPath);

  // Create backups
  if (!cliOptions.dryRun && !cliOptions.noBackup && config.backupSettings.enabled) {
    const backupDir = path.join(process.cwd(), config.backupSettings.backupDir, 'pre-merge');
    ensureDir(backupDir);
    createBackup(enPath, backupDir);
    createBackup(zhPath, backupDir);
    log.success('Backups created');
  }

  // Load existing translations
  const existingEn = loadTranslations(config.existingTranslations.enPath);
  const existingZh = loadTranslations(config.existingTranslations.zhCNPath);

  // Merge
  const enMerge = deepMerge(existingEn as TranslationObject, additions.en, cliOptions.force);
  const zhMerge = deepMerge(existingZh as TranslationObject, additions['zh-CN'], cliOptions.force);

  // Calculate stats
  const stats: MergeStats = {
    added: enMerge.changes.filter((c) => c.type === 'add').length,
    addedNamespaces: enMerge.changes.filter((c) => c.type === 'add-namespace').length,
    conflicts: enMerge.changes.filter((c) => c.type === 'conflict').length,
    skipped: enMerge.changes.filter((c) => c.type === 'skip').length,
  };

  if (cliOptions.verbose) {
    console.log('\nEnglish changes:');
    for (const change of enMerge.changes) {
      if (change.type === 'add') {
        console.log(`  + ${change.key}: "${change.value}"`);
      } else if (change.type === 'conflict') {
        console.log(`  ! ${change.key}: "${change.existing}" → "${change.new}"`);
      } else if (change.type === 'skip' && change.reason === 'conflict') {
        console.log(`  ~ ${change.key}: skipped (conflict)`);
      }
    }
  }

  if (!cliOptions.dryRun) {
    // Sort and write
    const sortedEn = sortKeys(enMerge.result as Record<string, unknown>);
    const sortedZh = sortKeys(zhMerge.result as Record<string, unknown>);

    writeJSON(enPath, sortedEn);
    writeJSON(zhPath, sortedZh);

    log.success(`Updated: ${enPath}`);
    log.success(`Updated: ${zhPath}`);

    // Save merge report
    const reportPath = path.join(reportsDir, 'merge-report.json');
    writeJSON(reportPath, { stats, enChanges: enMerge.changes, zhChanges: zhMerge.changes });
    log.success(`Merge report saved: ${reportPath}`);
  }

  // Summary
  console.log('\n📊 Merge Summary:');
  console.log(`   Keys added: ${stats.added}`);
  console.log(`   Namespaces added: ${stats.addedNamespaces}`);
  console.log(`   Conflicts: ${stats.conflicts}`);
  console.log(`   Skipped: ${stats.skipped}`);

  if (cliOptions.dryRun) {
    log.warn('Dry run - no files were written.');
  } else {
    log.success('Merge complete!\n');
  }
}

if (require.main === module) {
  main();
}
