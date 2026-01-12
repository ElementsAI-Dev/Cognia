#!/usr/bin/env ts-node
/**
 * i18n Stats Script
 *
 * Displays detailed statistics about i18n implementation.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  loadConfig,
  loadTranslations,
  flattenKeys,
  findComponentFiles,
  progressBar,
  log,
  colors,
} from './utils';
import type { TranslationObject, NamespaceStats, ComponentStats, HealthCheck } from './types';

interface CliOptions {
  json: boolean;
  verbose: boolean;
  help: boolean;
}

function parseCliOptions(args: string[]): CliOptions {
  return {
    json: args.includes('--json'),
    verbose: args.includes('--verbose'),
    help: args.includes('--help') || args.includes('-h'),
  };
}

function showHelp(): void {
  console.log(`
i18n Stats Script

Usage: npx ts-node scripts/i18n/stats.ts [options]

Options:
  --json              Output as JSON
  --verbose           Show detailed breakdown
  --help, -h          Show this help message

Examples:
  npx ts-node scripts/i18n/stats.ts
  npx ts-node scripts/i18n/stats.ts --verbose
  npx ts-node scripts/i18n/stats.ts --json
`);
}

function getNamespaceStats(
  enTranslations: Record<string, TranslationObject>,
  zhTranslations: Record<string, TranslationObject>
): Record<string, NamespaceStats> {
  const stats: Record<string, NamespaceStats> = {};

  for (const [namespace, nsObj] of Object.entries(enTranslations)) {
    const enKeys = flattenKeys(nsObj);
    const zhNs = zhTranslations[namespace] || {};
    const zhKeys = flattenKeys(zhNs);

    let emptyKeys = 0;
    let completedKeys = 0;

    for (const [key] of enKeys) {
      const zhValue = zhKeys.get(key);
      if (!zhValue || zhValue.startsWith('[TODO]') || zhValue === '') {
        emptyKeys++;
      } else {
        completedKeys++;
      }
    }

    const totalKeys = enKeys.size;
    stats[namespace] = {
      totalKeys,
      emptyKeys,
      completedKeys,
      completionRate: totalKeys > 0 ? ((completedKeys / totalKeys) * 100).toFixed(1) + '%' : '0%',
    };
  }

  return stats;
}

function getComponentStats(config: ReturnType<typeof loadConfig>): ComponentStats {
  const stats: ComponentStats = {
    total: 0,
    withI18n: 0,
    withoutI18n: 0,
    byNamespace: {},
    byDirectory: {},
  };

  const namespacePattern = /useTranslations\(['"]([^'"]+)['"]\)/;
  const keyPattern = /t\(['"]([^'"]+)['"]\)/g;

  for (const targetDir of config.targetDirectories) {
    const fullPath = path.join(process.cwd(), targetDir);
    if (!fs.existsSync(fullPath)) continue;

    const files = findComponentFiles(fullPath, config);

    if (!stats.byDirectory[targetDir]) {
      stats.byDirectory[targetDir] = { total: 0, withI18n: 0 };
    }

    for (const file of files) {
      stats.total++;
      stats.byDirectory[targetDir].total++;

      try {
        const content = fs.readFileSync(file, 'utf-8');
        const nsMatch = content.match(namespacePattern);

        if (nsMatch) {
          stats.withI18n++;
          stats.byDirectory[targetDir].withI18n++;

          const namespace = nsMatch[1];
          if (!stats.byNamespace[namespace]) {
            stats.byNamespace[namespace] = { files: [], keyUsages: 0 };
          }
          stats.byNamespace[namespace].files.push(path.relative(process.cwd(), file));

          while (keyPattern.exec(content) !== null) {
            stats.byNamespace[namespace].keyUsages++;
          }
          // Reset regex lastIndex for next file
          keyPattern.lastIndex = 0;
        } else {
          stats.withoutI18n++;
        }
      } catch {
        // Skip files that can't be read
      }
    }
  }

  return stats;
}

function runHealthChecks(
  enTranslations: Record<string, TranslationObject>,
  zhTranslations: Record<string, TranslationObject>
): HealthCheck[] {
  const checks: HealthCheck[] = [];

  const enKeys = flattenKeys(enTranslations as TranslationObject);
  const zhKeys = flattenKeys(zhTranslations as TranslationObject);

  // Check for missing zh-CN translations
  let missingZh = 0;
  for (const [key] of enKeys) {
    if (!zhKeys.has(key)) {
      missingZh++;
    }
  }
  checks.push({
    name: 'Missing zh-CN translations',
    status: missingZh === 0 ? 'pass' : missingZh < 10 ? 'warn' : 'fail',
    message: missingZh === 0 ? 'All keys translated' : `${missingZh} keys missing`,
  });

  // Check for empty translations
  let emptyTranslations = 0;
  for (const [, value] of zhKeys) {
    if (!value || value.startsWith('[TODO]') || value.trim() === '') {
      emptyTranslations++;
    }
  }
  checks.push({
    name: 'Empty/TODO translations',
    status: emptyTranslations === 0 ? 'pass' : emptyTranslations < 20 ? 'warn' : 'fail',
    message: emptyTranslations === 0 ? 'No empty translations' : `${emptyTranslations} empty/TODO`,
  });

  // Check for placeholder consistency
  let placeholderIssues = 0;
  const placeholderPattern = /\{[^}]+\}/g;
  for (const [key, enValue] of enKeys) {
    const zhValue = zhKeys.get(key);
    if (zhValue) {
      const enPlaceholders = (enValue.match(placeholderPattern) || []).sort();
      const zhPlaceholders = (zhValue.match(placeholderPattern) || []).sort();
      if (JSON.stringify(enPlaceholders) !== JSON.stringify(zhPlaceholders)) {
        placeholderIssues++;
      }
    }
  }
  checks.push({
    name: 'Placeholder consistency',
    status: placeholderIssues === 0 ? 'pass' : 'warn',
    message: placeholderIssues === 0 ? 'All placeholders match' : `${placeholderIssues} mismatches`,
  });

  return checks;
}

export function main(): void {
  const args = process.argv.slice(2);
  const cliOptions = parseCliOptions(args);

  if (cliOptions.help) {
    showHelp();
    process.exit(0);
  }

  const config = loadConfig();

  const enTranslations = loadTranslations(config.existingTranslations.enPath) as Record<string, TranslationObject>;
  const zhTranslations = loadTranslations(config.existingTranslations.zhCNPath) as Record<string, TranslationObject>;

  const enKeys = flattenKeys(enTranslations as TranslationObject);
  const zhKeys = flattenKeys(zhTranslations as TranslationObject);

  const namespaceStats = getNamespaceStats(enTranslations, zhTranslations);
  const componentStats = getComponentStats(config);
  const healthChecks = runHealthChecks(enTranslations, zhTranslations);

  if (cliOptions.json) {
    console.log(JSON.stringify({
      translations: {
        enKeyCount: enKeys.size,
        zhKeyCount: zhKeys.size,
        namespaces: namespaceStats,
      },
      components: componentStats,
      healthChecks,
    }, null, 2));
    return;
  }

  // Display stats
  log.title('📊 i18n Statistics');

  console.log(`${colors.bright}Translation Files${colors.reset}`);
  console.log(`  English keys:  ${enKeys.size}`);
  console.log(`  Chinese keys:  ${zhKeys.size}`);
  console.log(`  Namespaces:    ${Object.keys(namespaceStats).length}`);
  console.log('');

  console.log(`${colors.bright}By Namespace${colors.reset}`);
  const sortedNs = Object.entries(namespaceStats).sort((a, b) => b[1].totalKeys - a[1].totalKeys);
  for (const [ns, stat] of sortedNs) {
    console.log(`  ${ns.padEnd(20)} ${stat.totalKeys.toString().padStart(4)} keys  ${progressBar(stat.completedKeys, stat.totalKeys, 20)}`);
  }
  console.log('');

  console.log(`${colors.bright}Component Coverage${colors.reset}`);
  console.log(`  Total components:     ${componentStats.total}`);
  console.log(`  With i18n:            ${componentStats.withI18n} (${((componentStats.withI18n / componentStats.total) * 100).toFixed(1)}%)`);
  console.log(`  Without i18n:         ${componentStats.withoutI18n}`);
  console.log('');

  if (cliOptions.verbose) {
    console.log(`${colors.bright}By Directory${colors.reset}`);
    for (const [dir, stat] of Object.entries(componentStats.byDirectory)) {
      const pct = stat.total > 0 ? ((stat.withI18n / stat.total) * 100).toFixed(0) : '0';
      console.log(`  ${dir.padEnd(30)} ${stat.withI18n}/${stat.total} (${pct}%)`);
    }
    console.log('');
  }

  console.log(`${colors.bright}Health Checks${colors.reset}`);
  for (const check of healthChecks) {
    const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
    console.log(`  ${icon} ${check.name}: ${check.message}`);
  }
  console.log('');

  log.success('Stats generated successfully!\n');
}

if (require.main === module) {
  main();
}
