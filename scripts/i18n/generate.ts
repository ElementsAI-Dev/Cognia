#!/usr/bin/env ts-node
/**
 * i18n Key Generation Script
 *
 * Generates translation keys from extracted strings.
 * Reads extraction-report.json and creates translation-additions.json
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  loadConfig,
  loadTranslations,
  loadJSON,
  generateKey,
  ensureDir,
  writeJSON,
  log,
  sortKeys,
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
i18n Key Generation Script

Usage: npx ts-node scripts/i18n/generate.ts [options]

Options:
  --verbose           Show detailed output
  --dry-run           Preview without writing files
  --force             Overwrite existing keys
  --namespace <ns>    Only generate for specific namespace
  --help, -h          Show this help message

Examples:
  npx ts-node scripts/i18n/generate.ts
  npx ts-node scripts/i18n/generate.ts --verbose
  npx ts-node scripts/i18n/generate.ts --namespace chat
`);
}

interface GeneratedAdditions {
  en: Record<string, TranslationObject>;
  'zh-CN': Record<string, TranslationObject>;
}

export function main(): void {
  const args = process.argv.slice(2);
  const cliOptions = parseCliOptions(args);

  if (cliOptions.help) {
    showHelp();
    process.exit(0);
  }

  console.log('🔑 Generating translation keys...\n');

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

  const existingEn = loadTranslations(config.existingTranslations.enPath);
  // Load zh-CN for future conflict checking (currently unused but kept for extensibility)
  loadTranslations(config.existingTranslations.zhCNPath);

  const additions: GeneratedAdditions = {
    en: {},
    'zh-CN': {},
  };

  let totalNew = 0;
  let totalSkipped = 0;
  let totalConflicts = 0;

  for (const component of report.components) {
    if (cliOptions.namespace && component.namespace !== cliOptions.namespace) {
      continue;
    }

    const namespace = component.namespace;

    if (!additions.en[namespace]) {
      additions.en[namespace] = {};
      additions['zh-CN'][namespace] = {};
    }

    for (const str of component.hardcodedStrings) {
      let keyName = generateKey(str.string, config.keyGenerationRules.maxKeyLength);

      if (!keyName) continue;

      // Check for conflicts
      const existingNs = existingEn[namespace] as TranslationObject | undefined;
      if (existingNs && existingNs[keyName]) {
        if (existingNs[keyName] === str.string) {
          totalSkipped++;
          continue;
        }
        // Resolve conflict by adding suffix
        let suffix = 1;
        while (existingNs[`${keyName}_${suffix}`]) {
          suffix++;
        }
        keyName = `${keyName}_${suffix}`;
        totalConflicts++;
      }

      // Check if already added in this run
      if (additions.en[namespace][keyName]) {
        continue;
      }

      additions.en[namespace][keyName] = str.string;
      additions['zh-CN'][namespace][keyName] = `[TODO] ${str.string}`;
      totalNew++;

      if (cliOptions.verbose) {
        console.log(`  + ${namespace}.${keyName}: "${str.string}"`);
      }
    }
  }

  if (totalNew === 0) {
    log.info('No new keys to generate.');
    return;
  }

  // Sort keys
  additions.en = sortKeys(additions.en);
  additions['zh-CN'] = sortKeys(additions['zh-CN']);

  // Output files
  ensureDir(reportsDir);

  if (!cliOptions.dryRun) {
    const additionsPath = path.join(reportsDir, 'translation-additions.json');
    writeJSON(additionsPath, additions);
    log.success(`Translation additions saved: ${additionsPath}`);

    // Generate merge instructions
    const instructionsPath = path.join(reportsDir, 'merge-instructions.md');
    let instructions = '# Translation Merge Instructions\n\n';
    instructions += `**Generated:** ${new Date().toISOString()}\n\n`;
    instructions += '## Summary\n\n';
    instructions += `- New keys generated: ${totalNew}\n`;
    instructions += `- Skipped (already exist): ${totalSkipped}\n`;
    instructions += `- Conflicts resolved: ${totalConflicts}\n\n`;
    instructions += '## Next Steps\n\n';
    instructions += '1. Review `translation-additions.json`\n';
    instructions += '2. Translate `[TODO]` placeholders in zh-CN section\n';
    instructions += '3. Run `pnpm i18n:merge` to merge into translation files\n';
    instructions += '4. Run `pnpm i18n:validate` to verify\n';

    fs.writeFileSync(instructionsPath, instructions);
    log.success(`Merge instructions saved: ${instructionsPath}`);
  }

  // Summary
  console.log('\n📊 Generation Summary:');
  console.log(`   New keys generated: ${totalNew}`);
  console.log(`   Skipped (already exist): ${totalSkipped}`);
  console.log(`   Conflicts resolved: ${totalConflicts}`);

  if (cliOptions.dryRun) {
    log.warn('Dry run - no files were written.');
  } else {
    log.success('Key generation complete!\n');
  }
}

if (require.main === module) {
  main();
}
