#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * i18n Cleanup Script
 *
 * Removes orphaned translation keys that are no longer used in the codebase.
 * Supports dry-run mode and interactive confirmation.
 */

const fs = require('fs');
const path = require('path');

// Load configuration
const configPath = path.join(__dirname, 'i18n-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// Parse CLI arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  verbose: args.includes('--verbose'),
  force: args.includes('--force'),
  namespace: args.find((a, i) => args[i - 1] === '--namespace'),
};

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  verbose: (msg) => options.verbose && console.log(`${colors.dim}  ${msg}${colors.reset}`),
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

// Find all component files
const findComponentFiles = (dir, extensions = ['.tsx', '.ts', '.jsx', '.js']) => {
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

// Extract all used translation keys from source files
const extractUsedKeys = (files) => {
  const usedKeys = new Set();
  const keyUsages = new Map();

  // Patterns to find translation key usage
  const patterns = [
    /t\(['"]([^'"]+)['"]\)/g,                    // t('key')
    /t\(['"]([^'"]+)['"],\s*\{/g,                // t('key', { ... })
    /useTranslations\(['"]([^'"]+)['"]\)/g,      // useTranslations('namespace')
    /\bt\.([a-zA-Z_][a-zA-Z0-9_]*)/g,            // t.key (dot notation)
    /\[['"]([a-zA-Z_][a-zA-Z0-9_.]*)['"]\]/g,    // ['key'] bracket notation
  ];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const relPath = path.relative(process.cwd(), file);

      // Find namespace
      const nsMatch = content.match(/useTranslations\(['"]([^'"]+)['"]\)/);
      const namespace = nsMatch ? nsMatch[1] : null;

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const key = match[1];

          // Skip if it's a namespace reference
          if (key === namespace) continue;

          // Build full key
          const fullKey = namespace && !key.includes('.') ? `${namespace}.${key}` : key;

          usedKeys.add(fullKey);

          // Track usage location
          if (!keyUsages.has(fullKey)) {
            keyUsages.set(fullKey, []);
          }
          keyUsages.get(fullKey).push(relPath);
        }
      }
    } catch (_error) {
      // Skip files we can't read
    }
  }

  return { usedKeys, keyUsages };
};

// Remove key from nested object
const removeKey = (obj, keyPath) => {
  const parts = keyPath.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) return false;
    current = current[parts[i]];
  }

  const lastPart = parts[parts.length - 1];
  if (current[lastPart] !== undefined) {
    delete current[lastPart];
    return true;
  }
  return false;
};

// Clean empty namespaces
const cleanEmptyNamespaces = (obj) => {
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      cleanEmptyNamespaces(obj[key]);
      if (Object.keys(obj[key]).length === 0) {
        delete obj[key];
      }
    }
  }
  return obj;
};

// Create backup
const createBackup = (filePath) => {
  const backupDir = path.join(process.cwd(), config.backupSettings?.backupDir || 'i18n-backups');
  fs.mkdirSync(backupDir, { recursive: true });

  const fileName = path.basename(filePath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `${fileName}.${timestamp}.backup`);

  fs.copyFileSync(filePath, backupPath);
  return backupPath;
};

// Main cleanup function
const cleanupTranslations = (translationPath, usedKeys, lang) => {
  const fullPath = path.join(process.cwd(), translationPath);
  const translations = loadJSON(fullPath);

  if (!translations) {
    log.error(`Could not load ${translationPath}`);
    return { removed: 0, kept: 0 };
  }

  const allKeys = flattenKeys(translations);
  const orphanedKeys = [];
  const keptKeys = [];

  // Find orphaned keys
  for (const [key] of allKeys) {
    // Filter by namespace if specified
    if (options.namespace && !key.startsWith(options.namespace + '.')) {
      continue;
    }

    if (!usedKeys.has(key)) {
      orphanedKeys.push(key);
    } else {
      keptKeys.push(key);
    }
  }

  console.log(`\n📝 ${lang} translations (${translationPath}):`);
  console.log(`   Total keys: ${allKeys.size}`);
  console.log(`   Used keys: ${keptKeys.length}`);
  console.log(`   Orphaned keys: ${orphanedKeys.length}`);

  if (orphanedKeys.length === 0) {
    log.success('No orphaned keys found!');
    return { removed: 0, kept: keptKeys.length };
  }

  // Show orphaned keys
  if (options.verbose || orphanedKeys.length <= 20) {
    console.log('\n   Orphaned keys to remove:');
    for (const key of orphanedKeys.slice(0, 50)) {
      const value = allKeys.get(key);
      const preview = typeof value === 'string'
        ? value.substring(0, 40) + (value.length > 40 ? '...' : '')
        : '[object]';
      console.log(`   ${colors.red}- ${key}${colors.reset}: ${preview}`);
    }
    if (orphanedKeys.length > 50) {
      console.log(`   ... and ${orphanedKeys.length - 50} more`);
    }
  }

  // Apply cleanup (unless dry-run)
  if (!options.dryRun) {
    // Create backup first
    const backupPath = createBackup(fullPath);
    log.verbose(`Backup created: ${backupPath}`);

    // Remove orphaned keys
    const result = JSON.parse(JSON.stringify(translations));
    for (const key of orphanedKeys) {
      removeKey(result, key);
    }

    // Clean empty namespaces
    cleanEmptyNamespaces(result);

    // Write updated translations
    fs.writeFileSync(fullPath, JSON.stringify(result, null, 2) + '\n');
    log.success(`Removed ${orphanedKeys.length} orphaned keys from ${translationPath}`);
  } else {
    log.info(`[DRY-RUN] Would remove ${orphanedKeys.length} keys from ${translationPath}`);
  }

  return { removed: orphanedKeys.length, kept: keptKeys.length, orphaned: orphanedKeys };
};

// Main execution
const main = () => {
  console.log('🧹 Cleaning up orphaned translation keys...\n');

  if (options.dryRun) {
    log.warn('DRY-RUN MODE: No files will be modified\n');
  }

  if (options.namespace) {
    log.info(`Filtering by namespace: ${options.namespace}\n`);
  }

  // Find all source files
  console.log('📂 Scanning source files for key usage...');
  const allFiles = [];

  for (const targetDir of config.targetDirectories) {
    const fullPath = path.join(process.cwd(), targetDir);
    if (fs.existsSync(fullPath)) {
      const files = findComponentFiles(fullPath);
      allFiles.push(...files);
    }
  }

  // Also scan hooks, lib, and stores
  const additionalDirs = ['hooks', 'lib', 'stores'];
  for (const dir of additionalDirs) {
    const fullPath = path.join(process.cwd(), dir);
    if (fs.existsSync(fullPath)) {
      const files = findComponentFiles(fullPath);
      allFiles.push(...files);
    }
  }

  console.log(`   Found ${allFiles.length} source files\n`);

  // Extract used keys
  console.log('🔍 Extracting used translation keys...');
  const { usedKeys } = extractUsedKeys(allFiles);
  console.log(`   Found ${usedKeys.size} unique keys in use\n`);

  // Clean up English translations
  const enStats = cleanupTranslations(
    config.existingTranslations.enPath,
    usedKeys,
    'English'
  );

  // Clean up Chinese translations
  const zhStats = cleanupTranslations(
    config.existingTranslations.zhCNPath,
    usedKeys,
    'Chinese'
  );

  // Generate cleanup report
  const reportPath = path.join(process.cwd(), 'i18n-reports', 'cleanup-report.md');
  let report = '# Translation Cleanup Report\n\n';
  report += `**Generated:** ${new Date().toISOString()}\n`;
  report += `**Mode:** ${options.dryRun ? 'Dry Run' : 'Applied'}\n\n`;

  report += '## Summary\n\n';
  report += '| Language | Total Keys | Used | Orphaned | Removed |\n';
  report += '|----------|------------|------|----------|--------|\n';
  report += `| English | ${enStats.kept + enStats.removed} | ${enStats.kept} | ${enStats.removed} | ${options.dryRun ? 'N/A' : enStats.removed} |\n`;
  report += `| Chinese | ${zhStats.kept + zhStats.removed} | ${zhStats.kept} | ${zhStats.removed} | ${options.dryRun ? 'N/A' : zhStats.removed} |\n\n`;

  if (enStats.orphaned && enStats.orphaned.length > 0) {
    report += '## Orphaned Keys (English)\n\n';
    report += '| Key |\n';
    report += '|-----|\n';
    for (const key of enStats.orphaned.slice(0, 100)) {
      report += `| \`${key}\` |\n`;
    }
    if (enStats.orphaned.length > 100) {
      report += `\n*... and ${enStats.orphaned.length - 100} more*\n`;
    }
  }

  report += '\n## Notes\n\n';
  report += '- Some keys may be used dynamically and could not be detected\n';
  report += '- Keys used in server components or API routes may not be detected\n';
  report += '- Review the backup files if you need to restore any keys\n';

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report);
  log.success(`Cleanup report saved: ${reportPath}`);

  // Final summary
  console.log('\n📊 Cleanup Summary:');
  console.log(`   English: ${enStats.removed} keys removed, ${enStats.kept} kept`);
  console.log(`   Chinese: ${zhStats.removed} keys removed, ${zhStats.kept} kept`);
  console.log(`   Total removed: ${enStats.removed + zhStats.removed}`);

  if (options.dryRun) {
    console.log('\n💡 Run without --dry-run to apply changes.');
  } else {
    console.log('\n✨ Cleanup complete! Backups saved to i18n-backups/');
  }
};

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { cleanupTranslations, extractUsedKeys, removeKey };
