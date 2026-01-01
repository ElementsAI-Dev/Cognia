#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * i18n Statistics Script
 *
 * Provides detailed statistics about i18n implementation across the codebase.
 * Shows coverage, progress, and health metrics.
 */

const fs = require('fs');
const path = require('path');

// Load configuration
const configPath = path.join(__dirname, 'i18n-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// Parse CLI arguments
const args = process.argv.slice(2);
const options = {
  verbose: args.includes('--verbose'),
  json: args.includes('--json'),
  namespace: args.find((a, i) => args[i - 1] === '--namespace'),
};

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
};

// Progress bar generator
const progressBar = (current, total, width = 30) => {
  const percentage = total > 0 ? current / total : 0;
  const filled = Math.round(width * percentage);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const color = percentage >= 0.9 ? colors.green : percentage >= 0.5 ? colors.yellow : colors.red;
  return `${color}${bar}${colors.reset} ${(percentage * 100).toFixed(1)}%`;
};

// Load JSON file safely
const loadJSON = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (_error) {
    return null;
  }
};

// Flatten translation keys
const flattenKeys = (obj, prefix = '') => {
  const keys = new Map();
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      flattenKeys(value, fullKey).forEach((v, k) => keys.set(k, v));
    } else {
      keys.set(fullKey, value);
    }
  }
  return keys;
};

// Get namespace statistics
const getNamespaceStats = (translations) => {
  const stats = {};

  for (const [namespace, values] of Object.entries(translations)) {
    if (typeof values !== 'object' || values === null) continue;

    const keys = flattenKeys(values);
    const emptyKeys = Array.from(keys.values()).filter(v => !v || v === '').length;

    stats[namespace] = {
      totalKeys: keys.size,
      emptyKeys: emptyKeys,
      completedKeys: keys.size - emptyKeys,
      completionRate: keys.size > 0 ? ((keys.size - emptyKeys) / keys.size * 100).toFixed(1) : 100,
    };
  }

  return stats;
};

// Find component files
const findComponentFiles = (dir, extensions = ['.tsx', '.ts']) => {
  const files = [];

  const traverseDir = (currentDir) => {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

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
    } catch (_error) {
      // Skip directories we can't read
    }
  };

  traverseDir(dir);
  return files;
};

// Analyze component i18n usage
const analyzeComponents = (files) => {
  const results = {
    total: files.length,
    withI18n: 0,
    withoutI18n: 0,
    byNamespace: {},
    byDirectory: {},
  };

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const hasI18n = content.includes('useTranslations');
      const relPath = path.relative(process.cwd(), file);
      const dir = path.dirname(relPath).split(path.sep)[0];

      if (hasI18n) {
        results.withI18n++;

        // Extract namespace
        const nsMatch = content.match(/useTranslations\(['"]([^'"]+)['"]\)/);
        if (nsMatch) {
          const ns = nsMatch[1];
          if (!results.byNamespace[ns]) {
            results.byNamespace[ns] = { files: [], keyUsages: 0 };
          }
          results.byNamespace[ns].files.push(relPath);

          // Count key usages
          const keyMatches = content.match(/t\(['"][^'"]+['"]\)/g);
          results.byNamespace[ns].keyUsages += keyMatches ? keyMatches.length : 0;
        }
      } else {
        results.withoutI18n++;
      }

      // Track by directory
      if (!results.byDirectory[dir]) {
        results.byDirectory[dir] = { total: 0, withI18n: 0 };
      }
      results.byDirectory[dir].total++;
      if (hasI18n) results.byDirectory[dir].withI18n++;

    } catch (_error) {
      // Skip files we can't read
    }
  }

  return results;
};

// Check for interpolation patterns
const analyzeInterpolation = (enTranslations, zhTranslations) => {
  const issues = [];
  const enKeys = flattenKeys(enTranslations);
  const zhKeys = flattenKeys(zhTranslations);

  for (const [key, enValue] of enKeys) {
    if (typeof enValue !== 'string') continue;

    const zhValue = zhKeys.get(key);
    if (!zhValue || typeof zhValue !== 'string') continue;

    // Check for {placeholder} patterns
    const enPlaceholders = enValue.match(/\{[^}]+\}/g) || [];
    const zhPlaceholders = zhValue.match(/\{[^}]+\}/g) || [];

    if (enPlaceholders.length !== zhPlaceholders.length) {
      issues.push({
        key,
        type: 'placeholder-mismatch',
        en: enPlaceholders,
        zh: zhPlaceholders,
      });
    }
  }

  return issues;
};

// Main execution
const main = () => {
  const stats = {
    generated: new Date().toISOString(),
    translations: {},
    components: {},
    health: {},
  };

  console.log(`\n${colors.bright}${colors.cyan}📊 i18n Statistics Dashboard${colors.reset}\n`);
  console.log(`${colors.dim}Generated: ${stats.generated}${colors.reset}\n`);

  // Load translations
  const enPath = path.join(process.cwd(), config.existingTranslations.enPath);
  const zhPath = path.join(process.cwd(), config.existingTranslations.zhCNPath);

  const enTranslations = loadJSON(enPath) || {};
  const zhTranslations = loadJSON(zhPath) || {};

  // Translation statistics
  console.log(`${colors.bright}📝 Translation Files${colors.reset}\n`);

  const enKeys = flattenKeys(enTranslations);
  const zhKeys = flattenKeys(zhTranslations);

  stats.translations = {
    english: {
      totalKeys: enKeys.size,
      namespaces: Object.keys(enTranslations).length,
    },
    chinese: {
      totalKeys: zhKeys.size,
      namespaces: Object.keys(zhTranslations).length,
    },
  };

  console.log(`  English (en.json):`);
  console.log(`    Keys: ${enKeys.size}`);
  console.log(`    Namespaces: ${Object.keys(enTranslations).length}`);
  console.log();

  console.log(`  Chinese (zh-CN.json):`);
  console.log(`    Keys: ${zhKeys.size}`);
  console.log(`    Namespaces: ${Object.keys(zhTranslations).length}`);
  console.log();

  // Translation coverage
  console.log(`${colors.bright}🌐 Translation Coverage${colors.reset}\n`);

  let missingInZh = 0;
  let emptyInZh = 0;

  for (const [key] of enKeys) {
    const zhValue = zhKeys.get(key);
    if (zhValue === undefined) {
      missingInZh++;
    } else if (zhValue === '' || zhValue === null) {
      emptyInZh++;
    }
  }

  const coverageRate = enKeys.size > 0 ? ((enKeys.size - missingInZh - emptyInZh) / enKeys.size) : 1;
  console.log(`  Chinese Coverage: ${progressBar(enKeys.size - missingInZh - emptyInZh, enKeys.size)}`);
  console.log(`    Complete: ${enKeys.size - missingInZh - emptyInZh}`);
  console.log(`    Missing: ${missingInZh}`);
  console.log(`    Empty: ${emptyInZh}`);
  console.log();

  stats.translations.coverage = {
    complete: enKeys.size - missingInZh - emptyInZh,
    missing: missingInZh,
    empty: emptyInZh,
    rate: (coverageRate * 100).toFixed(1) + '%',
  };

  // Namespace breakdown
  console.log(`${colors.bright}📦 Namespace Breakdown${colors.reset}\n`);

  const enNsStats = getNamespaceStats(enTranslations);
  const zhNsStats = getNamespaceStats(zhTranslations);

  const nsTable = [];
  for (const ns of Object.keys(enNsStats).sort()) {
    const en = enNsStats[ns] || { totalKeys: 0 };
    const zh = zhNsStats[ns] || { totalKeys: 0, completedKeys: 0 };

    const coverage = en.totalKeys > 0 ? (zh.completedKeys / en.totalKeys * 100) : 100;
    nsTable.push({
      namespace: ns,
      enKeys: en.totalKeys,
      zhComplete: zh.completedKeys,
      coverage: coverage.toFixed(0) + '%',
    });
  }

  // Print namespace table
  console.log('  ' + 'Namespace'.padEnd(25) + 'EN Keys'.padEnd(10) + 'ZH Complete'.padEnd(15) + 'Coverage');
  console.log('  ' + '-'.repeat(60));
  for (const row of nsTable) {
    const color = parseFloat(row.coverage) >= 90 ? colors.green :
                  parseFloat(row.coverage) >= 50 ? colors.yellow : colors.red;
    console.log(`  ${row.namespace.padEnd(25)}${String(row.enKeys).padEnd(10)}${String(row.zhComplete).padEnd(15)}${color}${row.coverage}${colors.reset}`);
  }
  console.log();

  stats.translations.namespaces = nsTable;

  // Component coverage
  console.log(`${colors.bright}🧩 Component Coverage${colors.reset}\n`);

  const allFiles = [];
  for (const targetDir of config.targetDirectories) {
    const fullPath = path.join(process.cwd(), targetDir);
    if (fs.existsSync(fullPath)) {
      const files = findComponentFiles(fullPath);
      allFiles.push(...files);
    }
  }

  const componentStats = analyzeComponents(allFiles);
  stats.components = componentStats;

  const componentCoverage = componentStats.total > 0
    ? componentStats.withI18n / componentStats.total
    : 0;

  console.log(`  Component i18n Usage: ${progressBar(componentStats.withI18n, componentStats.total)}`);
  console.log(`    Total components: ${componentStats.total}`);
  console.log(`    With i18n: ${componentStats.withI18n}`);
  console.log(`    Without i18n: ${componentStats.withoutI18n}`);
  console.log();

  // Directory breakdown
  if (options.verbose) {
    console.log(`  ${colors.dim}By Directory:${colors.reset}`);
    for (const [dir, data] of Object.entries(componentStats.byDirectory).sort()) {
      const rate = data.total > 0 ? (data.withI18n / data.total * 100).toFixed(0) : 0;
      console.log(`    ${dir}: ${data.withI18n}/${data.total} (${rate}%)`);
    }
    console.log();
  }

  // Health checks
  console.log(`${colors.bright}🏥 Health Checks${colors.reset}\n`);

  const healthChecks = [];

  // Check 1: Translation coverage
  const coveragePct = coverageRate * 100;
  healthChecks.push({
    name: 'Translation Coverage',
    status: coveragePct >= 95 ? 'pass' : coveragePct >= 80 ? 'warn' : 'fail',
    message: `${coveragePct.toFixed(1)}% of keys translated`,
  });

  // Check 2: Component coverage
  const compCoveragePct = componentCoverage * 100;
  healthChecks.push({
    name: 'Component Coverage',
    status: compCoveragePct >= 90 ? 'pass' : compCoveragePct >= 70 ? 'warn' : 'fail',
    message: `${compCoveragePct.toFixed(1)}% of components use i18n`,
  });

  // Check 3: Placeholder consistency
  const interpolationIssues = analyzeInterpolation(enTranslations, zhTranslations);
  healthChecks.push({
    name: 'Placeholder Consistency',
    status: interpolationIssues.length === 0 ? 'pass' : 'warn',
    message: interpolationIssues.length === 0
      ? 'All placeholders match'
      : `${interpolationIssues.length} placeholder mismatches found`,
  });

  // Check 4: Empty translations
  healthChecks.push({
    name: 'Empty Translations',
    status: emptyInZh === 0 ? 'pass' : emptyInZh < 10 ? 'warn' : 'fail',
    message: emptyInZh === 0 ? 'No empty translations' : `${emptyInZh} empty translations found`,
  });

  stats.health = healthChecks;

  for (const check of healthChecks) {
    const icon = check.status === 'pass' ? `${colors.green}✓` :
                 check.status === 'warn' ? `${colors.yellow}⚠` : `${colors.red}✗`;
    console.log(`  ${icon} ${check.name}${colors.reset}: ${check.message}`);
  }
  console.log();

  // Overall score
  const passCount = healthChecks.filter(c => c.status === 'pass').length;
  const warnCount = healthChecks.filter(c => c.status === 'warn').length;
  const score = ((passCount + warnCount * 0.5) / healthChecks.length * 100).toFixed(0);

  console.log(`${colors.bright}📈 Overall i18n Score: ${score >= 80 ? colors.green : score >= 50 ? colors.yellow : colors.red}${score}%${colors.reset}\n`);

  // Save JSON output if requested
  if (options.json) {
    const outputPath = path.join(process.cwd(), 'i18n-reports', 'stats.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(stats, null, 2));
    console.log(`📄 JSON output saved: ${outputPath}\n`);
  }

  // Recommendations
  console.log(`${colors.bright}💡 Recommendations${colors.reset}\n`);

  if (missingInZh > 0) {
    console.log(`  ${colors.cyan}→${colors.reset} Run 'node scripts/i18n-cli.js merge' to add ${missingInZh} missing translations`);
  }
  if (componentStats.withoutI18n > 0) {
    console.log(`  ${colors.cyan}→${colors.reset} Run 'node scripts/i18n-cli.js extract' to find hardcoded strings in ${componentStats.withoutI18n} components`);
  }
  if (interpolationIssues.length > 0) {
    console.log(`  ${colors.cyan}→${colors.reset} Review ${interpolationIssues.length} translations with placeholder mismatches`);
  }
  if (passCount === healthChecks.length) {
    console.log(`  ${colors.green}✨ Great job! Your i18n implementation is complete.${colors.reset}`);
  }

  console.log();
};

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { getNamespaceStats, analyzeComponents, analyzeInterpolation };
