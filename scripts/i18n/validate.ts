#!/usr/bin/env ts-node
/**
 * i18n Validation Script
 *
 * Validates i18n implementation across components.
 * Checks for hardcoded strings, missing keys, orphaned keys, and consistency issues.
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
  log,
} from './utils';
import type {
  ValidationResult,
  ValidationIssue,
  Translations,
} from './types';

interface CliOptions {
  ci: boolean;
  verbose: boolean;
  strict: boolean;
  fix: boolean;
  namespace?: string;
  help: boolean;
}

function parseCliOptions(args: string[]): CliOptions {
  return {
    ci: args.includes('--ci'),
    verbose: args.includes('--verbose'),
    strict: args.includes('--strict'),
    fix: args.includes('--fix'),
    namespace: args.find((a, i) => args[i - 1] === '--namespace'),
    help: args.includes('--help') || args.includes('-h'),
  };
}

function showHelp(): void {
  console.log(`
i18n Validation Script

Usage: npx ts-node scripts/i18n/validate.ts [options]

Options:
  --ci                CI mode - exit with code 1 if errors found
  --strict            Strict mode - treat warnings as errors
  --verbose           Show detailed output
  --fix               Attempt to auto-fix issues
  --namespace <ns>    Only validate specific namespace
  --help, -h          Show this help message

Examples:
  npx ts-node scripts/i18n/validate.ts
  npx ts-node scripts/i18n/validate.ts --ci --strict
  npx ts-node scripts/i18n/validate.ts --verbose
`);
}

interface UsedKeyInfo {
  key: string;
  line: number;
}

interface FileUsage {
  file: string;
  namespace: string | null;
  hasI18n: boolean;
  usedKeys: UsedKeyInfo[];
  error?: string;
}

export function extractUsedKeys(filePath: string): FileUsage {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const usedKeys: UsedKeyInfo[] = [];
    const lines = content.split('\n');

    const patterns = [/t\(['"]([^'"]+)['"]\)/g, /useTranslations\(['"]([^'"]+)['"]\)/g];

    lines.forEach((line, lineIndex) => {
      patterns.forEach((pattern) => {
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(line)) !== null) {
          usedKeys.push({
            key: match[1],
            line: lineIndex + 1,
          });
        }
      });
    });

    const namespaceMatch = content.match(/useTranslations\(['"]([^'"]+)['"]\)/);
    const namespace = namespaceMatch ? namespaceMatch[1] : null;

    return {
      file: filePath,
      namespace,
      hasI18n: !!namespace,
      usedKeys,
    };
  } catch (error) {
    return {
      file: filePath,
      namespace: null,
      hasI18n: false,
      usedKeys: [],
      error: (error as Error).message,
    };
  }
}

interface HardcodedCheck {
  hasHardcoded: boolean;
  count?: number;
  samples?: string[];
  error?: string;
}

export function hasHardcodedStrings(filePath: string): HardcodedCheck {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const jsxTextPattern = />([^<\n{][^<]{3,})</g;
    const matches = content.match(jsxTextPattern);

    if (!matches) return { hasHardcoded: false };

    const hardcoded = matches.filter((m) => {
      const str = m.slice(1, -1).trim();
      if (/^[\d\s\-+=/\\*.,]+$/.test(str)) return false;
      if (str.length < 3) return false;
      if (str.includes('=>') || str.includes('function') || str.includes('return'))
        return false;
      return true;
    });

    return {
      hasHardcoded: hardcoded.length > 0,
      count: hardcoded.length,
      samples: hardcoded.slice(0, 5),
    };
  } catch (error) {
    return { hasHardcoded: false, error: (error as Error).message };
  }
}

export function validateTranslationsConsistency(
  enTranslations: Translations,
  zhTranslations: Translations
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const enKeys = flattenKeys(enTranslations);
  const zhKeys = flattenKeys(zhTranslations);

  for (const [key, value] of enKeys) {
    if (!zhKeys.has(key)) {
      issues.push({
        type: 'missing-zh',
        key,
        english: value,
        severity: 'error',
      });
    }
  }

  for (const [key, value] of zhKeys) {
    if (!enKeys.has(key)) {
      issues.push({
        type: 'extra-zh',
        key,
        chinese: value,
        severity: 'warning',
      });
    }
  }

  return issues;
}

export function main(): void {
  const args = process.argv.slice(2);
  const cliOptions = parseCliOptions(args);

  if (cliOptions.help) {
    showHelp();
    process.exit(0);
  }

  console.log('✅ Validating i18n implementation...\n');

  const config = loadConfig();
  const results: ValidationResult = {
    summary: {
      totalFiles: 0,
      filesWithI18n: 0,
      filesWithHardcodedStrings: 0,
      missingKeysCount: 0,
      orphanedKeysCount: 0,
      consistencyIssues: 0,
    },
    issues: {
      missingI18n: [],
      hardcodedStrings: [],
      missingKeys: [],
      orphanedKeys: [],
      consistency: [],
    },
    usedKeys: new Set<string>(),
  };

  const enTranslations = loadTranslations(config.existingTranslations.enPath);
  const zhTranslations = loadTranslations(config.existingTranslations.zhCNPath);
  const enKeys = flattenKeys(enTranslations);

  console.log('📂 Scanning components for i18n usage...');
  for (const targetDir of config.targetDirectories) {
    const fullPath = path.join(process.cwd(), targetDir);

    if (!fs.existsSync(fullPath)) {
      continue;
    }

    const files = findComponentFiles(fullPath, config);

    for (const file of files) {
      results.summary.totalFiles++;

      const usage = extractUsedKeys(file);

      if (usage.hasI18n) {
        results.summary.filesWithI18n++;

        for (const used of usage.usedKeys) {
          if (used.key === usage.namespace) continue;
          results.usedKeys.add(`${usage.namespace}.${used.key}`);
        }
      } else {
        results.issues.missingI18n.push({
          file: path.relative(process.cwd(), file),
        });
      }

      const hardcodedCheck = hasHardcodedStrings(file);
      if (hardcodedCheck.hasHardcoded) {
        results.summary.filesWithHardcodedStrings++;
        results.issues.hardcodedStrings.push({
          file: path.relative(process.cwd(), file),
          count: hardcodedCheck.count || 0,
          samples: hardcodedCheck.samples || [],
        });
      }
    }
  }

  console.log('🔑 Checking for orphaned translation keys...');
  for (const [key] of enKeys) {
    if (!results.usedKeys.has(key)) {
      results.summary.orphanedKeysCount++;
      results.issues.orphanedKeys.push({ key });
    }
  }

  console.log('🔄 Checking translation consistency...');
  const consistencyIssues = validateTranslationsConsistency(
    enTranslations,
    zhTranslations
  );
  results.summary.consistencyIssues = consistencyIssues.length;
  results.issues.consistency = consistencyIssues;

  // Generate output
  const outputDir = path.join(process.cwd(), 'i18n-reports');
  ensureDir(outputDir);

  const reportPath = path.join(outputDir, 'validation-report.json');
  writeJSON(reportPath, {
    summary: results.summary,
    issues: {
      missingI18n: results.issues.missingI18n,
      hardcodedStrings: results.issues.hardcodedStrings.slice(0, 50),
      orphanedKeys: results.issues.orphanedKeys.slice(0, 50),
      consistency: results.issues.consistency,
    },
  });
  console.log(`✅ Validation report saved: ${reportPath}`);

  // Generate markdown report
  const mdPath = path.join(outputDir, 'validation-report.md');
  let md = '# i18n Validation Report\n\n';
  md += `**Generated:** ${new Date().toISOString()}\n\n`;

  md += '## Summary\n\n';
  md += '| Metric | Count |\n';
  md += '|--------|-------|\n';
  md += `| Total Files | ${results.summary.totalFiles} |\n`;
  md += `| Files with i18n | ${results.summary.filesWithI18n} |\n`;
  md += `| Files without i18n | ${results.summary.totalFiles - results.summary.filesWithI18n} |\n`;
  md += `| Files with Hardcoded Strings | ${results.summary.filesWithHardcodedStrings} |\n`;
  md += `| Missing Translation Keys (zh-CN) | ${results.issues.consistency.filter((i) => i.type === 'missing-zh').length} |\n`;
  md += `| Orphaned Translation Keys | ${results.summary.orphanedKeysCount} |\n`;
  md += `| Consistency Issues | ${results.summary.consistencyIssues} |\n\n`;

  fs.writeFileSync(mdPath, md);
  console.log(`✅ Markdown report saved: ${mdPath}`);

  // Print summary
  const missingZh = results.issues.consistency.filter((i) => i.type === 'missing-zh');
  console.log('\n📊 Validation Summary:');
  console.log(`   Total files scanned: ${results.summary.totalFiles}`);
  console.log(`   Files with i18n: ${results.summary.filesWithI18n}`);
  console.log(
    `   Files with hardcoded strings: ${results.summary.filesWithHardcodedStrings}`
  );
  console.log(`   Missing Chinese translations: ${missingZh.length}`);
  console.log(`   Potentially orphaned keys: ${results.summary.orphanedKeysCount}`);
  console.log(`   Consistency issues: ${results.summary.consistencyIssues}`);

  const hasErrors = missingZh.length > 0;
  const hasWarnings =
    results.summary.filesWithHardcodedStrings > 0 ||
    results.summary.orphanedKeysCount > 0;

  const shouldFail = cliOptions.ci && (hasErrors || (cliOptions.strict && hasWarnings));

  if (!hasErrors && !hasWarnings) {
    log.success('All validations passed!\n');
  } else if (hasErrors) {
    log.error(
      'Validation errors found. Check i18n-reports/validation-report.md for details.\n'
    );
  } else {
    log.warn(
      'Validation warnings found. Check i18n-reports/validation-report.md for details.\n'
    );
  }

  if (cliOptions.ci) {
    console.log(`CI Mode: ${shouldFail ? 'FAILED' : 'PASSED'}`);
    process.exit(shouldFail ? 1 : 0);
  }
}

if (require.main === module) {
  main();
}
