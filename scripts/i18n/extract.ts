#!/usr/bin/env ts-node
/**
 * i18n String Extraction Script
 *
 * Scans React components for hardcoded strings that need i18n.
 * Uses regex-based pattern matching for lightweight extraction.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  loadConfig,
  loadTranslations,
  findComponentFiles,
  getNamespace,
  generateKey,
  isUserFacingText,
  ensureDir,
  writeJSON,
  log,
} from './utils';
import type {
  I18nConfig,
  ExtractedString,
  ExtractionResult,
  ExtractionReport,
  ComponentResult,
  StringType,
} from './types';

interface ExtractionPattern {
  regex: RegExp;
  type: StringType;
  filter: (match: string) => boolean;
}

interface CliOptions {
  verbose: boolean;
  json: boolean;
  quiet: boolean;
  namespace?: string;
  directory?: string;
  help: boolean;
}

function parseCliOptions(args: string[]): CliOptions {
  return {
    verbose: args.includes('--verbose'),
    json: args.includes('--json'),
    quiet: args.includes('--quiet'),
    namespace: args.find((a, i) => args[i - 1] === '--namespace'),
    directory: args.find((a, i) => args[i - 1] === '--directory'),
    help: args.includes('--help') || args.includes('-h'),
  };
}

function showHelp(): void {
  console.log(`
i18n String Extraction Script

Usage: npx ts-node scripts/i18n/extract.ts [options]

Options:
  --verbose           Show detailed output for each file
  --json              Output results as JSON to stdout
  --quiet             Suppress progress output
  --namespace <ns>    Only extract from specific namespace
  --directory <dir>   Only scan specific directory
  --help, -h          Show this help message

Examples:
  npx ts-node scripts/i18n/extract.ts
  npx ts-node scripts/i18n/extract.ts --verbose
  npx ts-node scripts/i18n/extract.ts --namespace chat
`);
}

function shouldExtractString(str: string, config: I18nConfig): boolean {
  const { extractionRules } = config;

  // Skip empty strings or whitespace-only
  if (!str || str.trim().length < extractionRules.minLength) {
    return false;
  }

  // Skip if too long
  if (str.length > extractionRules.maxLength) {
    return false;
  }

  // Check exclusion patterns
  for (const pattern of extractionRules.excludePatterns) {
    const regex = new RegExp(pattern);
    if (regex.test(str)) {
      return false;
    }
  }

  // Skip technical strings
  if (extractionRules.excludeTechnicalStrings) {
    if (
      str.startsWith('http://') ||
      str.startsWith('https://') ||
      str.startsWith('./') ||
      str.startsWith('../')
    ) {
      return false;
    }
    if (/^[a-z][a-z0-9- ]+$/.test(str) && str.includes(' ')) {
      return false;
    }
    if (
      /\.(css|scss|less|json|md|txt|html|js|jsx|ts|tsx|svg|png|jpg|jpeg|gif|ico|woff|woff2)$/.test(
        str
      )
    ) {
      return false;
    }
    if (/^#[0-9a-fA-F]{3,8}$/.test(str)) {
      return false;
    }
    if (/^\d+(\.\d+)?(px|em|rem|%|vh|vw|deg|ms|s)$/.test(str)) {
      return false;
    }
    if (str.startsWith('{') && str.endsWith('}')) {
      return false;
    }
    if (str.startsWith('[') && str.endsWith(']')) {
      return false;
    }
  }

  // Must be user-facing text
  if (!isUserFacingText(str)) {
    return false;
  }

  return true;
}

function createPatterns(config: I18nConfig): ExtractionPattern[] {
  return [
    {
      regex: />([^<\n{]+)</g,
      type: 'JSXText',
      filter: (match: string): boolean => {
        const str = match.trim();
        if (str.includes('=')) return false;
        if (!str || str.length === 0) return false;
        return shouldExtractString(str, config);
      },
    },
    {
      regex:
        /(?:title|label|placeholder|description|message|text|tooltip|aria-label)=["']([^"']+)["']/gi,
      type: 'PropString',
      filter: (match: string): boolean => shouldExtractString(match, config),
    },
    {
      regex: /<(?:Button|button|Link|a)[^>]*>([^<{]+)</g,
      type: 'ButtonText',
      filter: (match: string): boolean => {
        const str = match.trim();
        if (!str || str.length === 0) return false;
        return shouldExtractString(str, config);
      },
    },
    {
      regex: /<h[1-6][^>]*>([^<{]+)</g,
      type: 'HeadingText',
      filter: (match: string): boolean => {
        const str = match.trim();
        if (!str || str.length === 0) return false;
        return shouldExtractString(str, config);
      },
    },
    {
      regex: /<[Ll]abel[^>]*>([^<{]+)</g,
      type: 'LabelText',
      filter: (match: string): boolean => {
        const str = match.trim();
        if (!str || str.length === 0) return false;
        return shouldExtractString(str, config);
      },
    },
    {
      regex: /`([^`]+)`/g,
      type: 'TemplateLiteral',
      filter: (match: string): boolean => {
        if (match.includes('${')) return false;
        if (match.includes('=>') || match.includes('function')) return false;
        return shouldExtractString(match, config);
      },
    },
    {
      regex: /(?:Error|throw)\s*\(?["']([^"']+)["']/g,
      type: 'ErrorMessage',
      filter: (match: string): boolean => shouldExtractString(match, config),
    },
    {
      regex: /toast(?:\.\w+)?\(["']([^"']+)["']/g,
      type: 'ToastMessage',
      filter: (match: string): boolean => shouldExtractString(match, config),
    },
  ];
}

export function extractStringsFromFile(
  filePath: string,
  config: I18nConfig
): ExtractionResult {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const results: ExtractedString[] = [];
    const hasI18nHook = content.includes('useTranslations');
    const patterns = createPatterns(config);

    lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim();
      if (
        trimmedLine.startsWith('//') ||
        trimmedLine.startsWith('/*') ||
        trimmedLine.startsWith('*')
      ) {
        return;
      }
      if (trimmedLine.startsWith('import ') || trimmedLine.startsWith('export ')) {
        return;
      }

      patterns.forEach((pattern) => {
        let match: RegExpExecArray | null;
        while ((match = pattern.regex.exec(line)) !== null) {
          const str = match[1];
          if (pattern.filter(str)) {
            results.push({
              string: str,
              type: pattern.type,
              line: lineIndex + 1,
              column: match.index + 1,
            });
          }
        }
      });
    });

    // Remove duplicates
    const uniqueResults: ExtractedString[] = [];
    const seen = new Set<string>();
    for (const result of results) {
      const key = `${result.string}:${result.line}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueResults.push(result);
      }
    }

    return {
      file: filePath,
      hasI18nHook,
      strings: uniqueResults,
    };
  } catch (error) {
    return {
      file: filePath,
      hasI18nHook: false,
      strings: [],
      error: (error as Error).message,
    };
  }
}

function generateMarkdownReport(results: ExtractionReport): string {
  let md = '# i18n String Extraction Report\n\n';
  md += `**Generated:** ${new Date().toISOString()}\n\n`;

  md += '## Summary\n\n';
  md += `- **Total Files Scanned:** ${results.summary.totalFiles}\n`;
  md += `- **Files with i18n Hook:** ${results.summary.filesWithI18n}\n`;
  md += `- **Files with Hardcoded Strings:** ${results.summary.filesWithHardcodedStrings}\n`;
  md += `- **Total Hardcoded Strings:** ${results.summary.totalHardcodedStrings}\n\n`;

  md += '## By Namespace\n\n';
  md += '| Namespace | Components | Strings |\n';
  md += '|-----------|------------|--------|\n';
  const sortedNamespaces = Object.entries(results.byNamespace).sort(
    (a, b) => b[1].totalStrings - a[1].totalStrings
  );
  for (const [namespace, data] of sortedNamespaces) {
    md += `| ${namespace} | ${data.totalComponents} | ${data.totalStrings} |\n`;
  }

  md += '\n## Top Components with Hardcoded Strings\n\n';
  md += '| Component | Namespace | Strings | Has i18n |\n';
  md += '|-----------|-----------|---------|----------|\n';
  for (const comp of results.components.slice(0, 50)) {
    const relativeFile = comp.file.replace(/\\/g, '/');
    md += `| [${relativeFile}](${relativeFile}) | ${comp.namespace} | ${comp.hardcodedStrings.length} | ${comp.hasI18nHook ? '✅' : '❌'} |\n`;
  }

  return md;
}

export function main(): void {
  const args = process.argv.slice(2);
  const cliOptions = parseCliOptions(args);

  if (cliOptions.help) {
    showHelp();
    process.exit(0);
  }

  console.log('🔍 Starting i18n string extraction...\n');

  const config = loadConfig();
  const results: ExtractionReport = {
    summary: {
      totalFiles: 0,
      filesWithHardcodedStrings: 0,
      filesWithI18n: 0,
      totalHardcodedStrings: 0,
    },
    components: [],
    byNamespace: {},
  };

  // Load existing translations for reference
  loadTranslations(config.existingTranslations.enPath);

  // Process each target directory
  for (const targetDir of config.targetDirectories) {
    const fullPath = path.join(process.cwd(), targetDir);

    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️  Directory not found: ${targetDir}`);
      continue;
    }

    console.log(`📂 Scanning ${targetDir}...`);
    const files = findComponentFiles(fullPath, config);

    for (const file of files) {
      const extraction = extractStringsFromFile(file, config);
      const namespace = getNamespace(file, config);

      if (extraction.strings.length > 0) {
        results.summary.filesWithHardcodedStrings++;
        results.summary.totalHardcodedStrings += extraction.strings.length;

        const componentResult: ComponentResult = {
          file: path.relative(process.cwd(), file),
          namespace,
          hasI18nHook: extraction.hasI18nHook,
          hardcodedStrings: extraction.strings.map((s) => ({
            ...s,
            suggestedKey: `${namespace}.${generateKey(s.string, config.keyGenerationRules.maxKeyLength)}`,
          })),
        };

        results.components.push(componentResult);

        if (!results.byNamespace[namespace]) {
          results.byNamespace[namespace] = {
            totalComponents: 0,
            totalStrings: 0,
            components: [],
          };
        }
        results.byNamespace[namespace].totalComponents++;
        results.byNamespace[namespace].totalStrings += extraction.strings.length;
        results.byNamespace[namespace].components.push(componentResult.file);
      }

      if (extraction.hasI18nHook) {
        results.summary.filesWithI18n++;
      }

      results.summary.totalFiles++;
    }
  }

  // Sort components by string count
  results.components.sort(
    (a, b) => b.hardcodedStrings.length - a.hardcodedStrings.length
  );

  // Generate output files
  const outputDir = path.join(process.cwd(), 'i18n-reports');
  ensureDir(outputDir);

  // JSON output
  const jsonPath = path.join(outputDir, 'extraction-report.json');
  writeJSON(jsonPath, results);
  console.log(`\n✅ JSON report saved: ${jsonPath}`);

  // CSV output
  const csvPath = path.join(outputDir, 'extraction-report.csv');
  const csvHeaders = [
    'File',
    'Namespace',
    'Has i18n',
    'String',
    'Line',
    'Type',
    'Suggested Key',
  ];
  const csvRows = results.components.flatMap((comp) =>
    comp.hardcodedStrings.map((s) => [
      comp.file,
      comp.namespace,
      comp.hasI18nHook ? 'Yes' : 'No',
      `"${s.string.replace(/"/g, '""')}"`,
      s.line?.toString() || '',
      s.type,
      s.suggestedKey || '',
    ])
  );
  const csvContent = [csvHeaders.join(','), ...csvRows.map((r) => r.join(','))].join(
    '\n'
  );
  fs.writeFileSync(csvPath, csvContent);
  console.log(`✅ CSV report saved: ${csvPath}`);

  // Markdown summary
  const mdPath = path.join(outputDir, 'extraction-report.md');
  const mdContent = generateMarkdownReport(results);
  fs.writeFileSync(mdPath, mdContent);
  console.log(`✅ Markdown report saved: ${mdPath}`);

  // JSON output mode
  if (cliOptions.json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  // Print summary
  if (!cliOptions.quiet) {
    console.log('\n📊 Extraction Summary:');
    console.log(`   Total files scanned: ${results.summary.totalFiles}`);
    console.log(`   Files with i18n hook: ${results.summary.filesWithI18n}`);
    console.log(
      `   Files with hardcoded strings: ${results.summary.filesWithHardcodedStrings}`
    );
    console.log(
      `   Total hardcoded strings found: ${results.summary.totalHardcodedStrings}`
    );

    if (results.components.length > 0) {
      console.log('\n📋 Top 10 Components by Hardcoded Strings:');
      results.components.slice(0, 10).forEach((comp, i) => {
        console.log(
          `   ${i + 1}. ${comp.file} (${comp.hardcodedStrings.length} strings)`
        );
      });
    }

    if (Object.keys(results.byNamespace).length > 0) {
      console.log('\n📋 By Namespace:');
      for (const [namespace, data] of Object.entries(results.byNamespace)) {
        console.log(
          `   ${namespace}: ${data.totalComponents} components, ${data.totalStrings} strings`
        );
      }
    }

    log.success('Extraction complete! Check i18n-reports/ directory for detailed reports.\n');
  }
}

if (require.main === module) {
  main();
}
