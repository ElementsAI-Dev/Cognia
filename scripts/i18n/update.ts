#!/usr/bin/env ts-node
/**
 * i18n Update Components Script
 *
 * Automatically updates component files to use translations.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  loadConfig,
  loadJSON,
  loadTranslations,
  ensureDir,
  log,
  colors,
} from './utils';
import type { ExtractionReport, TranslationObject } from './types';

interface CliOptions {
  verbose: boolean;
  dryRun: boolean;
  force: boolean;
  namespace?: string;
  help: boolean;
}

function parseCliOptions(args: string[]): CliOptions {
  return {
    verbose: args.includes('--verbose'),
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    namespace: args.find((a, i) => args[i - 1] === '--namespace'),
    help: args.includes('--help') || args.includes('-h'),
  };
}

function showHelp(): void {
  console.log(`
i18n Update Components Script

Usage: npx ts-node scripts/i18n/update.ts [options]

Options:
  --verbose           Show detailed output
  --dry-run           Preview without writing files
  --force             Skip confirmation prompt
  --namespace <ns>    Only update specific namespace
  --help, -h          Show this help message

Examples:
  npx ts-node scripts/i18n/update.ts --dry-run
  npx ts-node scripts/i18n/update.ts --verbose
  npx ts-node scripts/i18n/update.ts --namespace chat
`);
}

interface UpdateResult {
  file: string;
  changes: number;
  diff: string[];
}

function updateComponentFile(
  filePath: string,
  namespace: string,
  translations: TranslationObject,
  dryRun: boolean
): UpdateResult | null {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    const changes: string[] = [];

    // Check if already has useTranslations
    const hasUseTranslations = content.includes('useTranslations');

    // Find hardcoded strings that match translations
    for (const [key, value] of Object.entries(translations)) {
      if (typeof value !== 'string') continue;

      // Escape special regex characters in the value
      const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Replace in JSX text content
      const jsxPattern = new RegExp(`>\\s*${escapedValue}\\s*<`, 'g');
      if (jsxPattern.test(content)) {
        content = content.replace(jsxPattern, `>{t('${key}')}<`);
        changes.push(`JSX: "${value}" → t('${key}')`);
      }

      // Replace in string props
      const propPatterns = [
        new RegExp(`(title|label|placeholder|description)="${escapedValue}"`, 'g'),
        new RegExp(`(title|label|placeholder|description)='${escapedValue}'`, 'g'),
      ];

      for (const pattern of propPatterns) {
        if (pattern.test(content)) {
          content = content.replace(pattern, `$1={t('${key}')}`);
          changes.push(`Prop: "${value}" → t('${key}')`);
        }
      }
    }

    if (changes.length === 0) {
      return null;
    }

    // Add useTranslations import if needed
    if (!hasUseTranslations) {
      // Find existing imports
      const importMatch = content.match(/^import .+ from ['"][^'"]+['"];?\s*$/m);
      if (importMatch) {
        const importStatement = `import { useTranslations } from 'next-intl';\n`;
        content = content.replace(importMatch[0], `${importMatch[0]}\n${importStatement}`);
        changes.unshift('Added import: useTranslations');
      }

      // Add hook call after function declaration
      const functionMatch = content.match(
        /export\s+(?:default\s+)?function\s+\w+\s*\([^)]*\)\s*(?::\s*\w+\s*)?\{/
      );
      if (functionMatch) {
        const hookCall = `\n  const t = useTranslations('${namespace}');`;
        content = content.replace(functionMatch[0], `${functionMatch[0]}${hookCall}`);
        changes.unshift(`Added hook: useTranslations('${namespace}')`);
      }
    }

    if (!dryRun && content !== originalContent) {
      // Write to updates directory
      const updatesDir = path.join(process.cwd(), 'i18n-updates');
      ensureDir(updatesDir);

      const relativePath = path.relative(process.cwd(), filePath);
      const updatePath = path.join(updatesDir, relativePath);
      ensureDir(path.dirname(updatePath));
      fs.writeFileSync(updatePath, content);
    }

    return {
      file: path.relative(process.cwd(), filePath),
      changes: changes.length,
      diff: changes,
    };
  } catch (error) {
    log.error(`Error processing ${filePath}: ${(error as Error).message}`);
    return null;
  }
}

export function main(): void {
  const args = process.argv.slice(2);
  const cliOptions = parseCliOptions(args);

  if (cliOptions.help) {
    showHelp();
    process.exit(0);
  }

  console.log('🔄 Updating components with translations...\n');

  const config = loadConfig();
  const reportsDir = path.join(process.cwd(), 'i18n-reports');
  const extractionPath = path.join(reportsDir, 'extraction-report.json');

  if (!fs.existsSync(extractionPath)) {
    log.error('Extraction report not found. Run pnpm i18n:extract first.');
    process.exit(1);
  }

  const report = loadJSON<ExtractionReport>(extractionPath);
  if (!report) {
    log.error('Failed to load extraction report.');
    process.exit(1);
  }

  const enTranslations = loadTranslations(config.existingTranslations.enPath);
  const results: UpdateResult[] = [];

  for (const component of report.components) {
    if (cliOptions.namespace && component.namespace !== cliOptions.namespace) {
      continue;
    }

    const filePath = path.join(process.cwd(), component.file);
    const nsTranslations = enTranslations[component.namespace] as TranslationObject | undefined;

    if (!nsTranslations) {
      continue;
    }

    const result = updateComponentFile(
      filePath,
      component.namespace,
      nsTranslations,
      cliOptions.dryRun
    );

    if (result) {
      results.push(result);

      if (cliOptions.verbose) {
        console.log(`${colors.cyan}${result.file}${colors.reset}`);
        for (const change of result.diff) {
          console.log(`  ${colors.green}+${colors.reset} ${change}`);
        }
        console.log('');
      }
    }
  }

  // Summary
  console.log('\n📊 Update Summary:');
  console.log(`   Files updated: ${results.length}`);
  console.log(`   Total changes: ${results.reduce((sum, r) => sum + r.changes, 0)}`);

  if (results.length > 0 && !cliOptions.dryRun) {
    log.success('Updated files saved to i18n-updates/ directory.');
    log.info('Review the changes before applying them to your source files.');
  }

  if (cliOptions.dryRun) {
    log.warn('Dry run - no files were written.');
  }

  log.success('Update complete!\n');
}

if (require.main === module) {
  main();
}
