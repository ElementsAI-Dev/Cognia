#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * i18n Merge Script
 *
 * Automatically merges generated translation additions into existing translation files.
 * Supports dry-run mode, backup creation, and conflict resolution.
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
  noBackup: args.includes('--no-backup'),
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

// Deep merge objects (additions into target)
const deepMerge = (target, additions, parentKey = '') => {
  const result = { ...target };
  const changes = [];

  for (const [key, value] of Object.entries(additions)) {
    const fullKey = parentKey ? `${parentKey}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      if (typeof result[key] === 'object' && result[key] !== null) {
        const nested = deepMerge(result[key], value, fullKey);
        result[key] = nested.result;
        changes.push(...nested.changes);
      } else {
        result[key] = value;
        changes.push({ type: 'add-namespace', key: fullKey, value });
      }
    } else {
      if (result[key] === undefined) {
        result[key] = value;
        changes.push({ type: 'add', key: fullKey, value });
      } else if (result[key] !== value) {
        changes.push({ type: 'conflict', key: fullKey, existing: result[key], new: value });
      } else {
        changes.push({ type: 'skip', key: fullKey, reason: 'already exists' });
      }
    }
  }

  return { result, changes };
};

// Sort object keys alphabetically (recursive)
const sortKeys = (obj) => {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return obj;
  }

  const sorted = {};
  const keys = Object.keys(obj).sort();

  for (const key of keys) {
    sorted[key] = sortKeys(obj[key]);
  }

  return sorted;
};

// Create backup of translation files
const createBackup = (filePath) => {
  const backupDir = path.join(process.cwd(), config.backupSettings?.backupDir || 'i18n-backups');
  fs.mkdirSync(backupDir, { recursive: true });

  const fileName = path.basename(filePath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `${fileName}.${timestamp}.backup`);

  fs.copyFileSync(filePath, backupPath);
  log.verbose(`Backup created: ${backupPath}`);

  // Clean up old backups
  const maxBackups = config.backupSettings?.maxBackups || 5;
  const backups = fs.readdirSync(backupDir)
    .filter(f => f.startsWith(fileName) && f.endsWith('.backup'))
    .sort()
    .reverse();

  if (backups.length > maxBackups) {
    for (const old of backups.slice(maxBackups)) {
      fs.unlinkSync(path.join(backupDir, old));
      log.verbose(`Removed old backup: ${old}`);
    }
  }

  return backupPath;
};

// Main merge function
const mergeTranslations = (targetPath, additions, lang) => {
  const fullPath = path.join(process.cwd(), targetPath);

  // Load existing translations
  let existing = loadJSON(fullPath);
  if (!existing) {
    log.warn(`Translation file not found: ${targetPath}, creating new file`);
    existing = {};
  }

  // Perform deep merge
  const { result, changes } = deepMerge(existing, additions);

  // Calculate statistics
  const stats = {
    added: changes.filter(c => c.type === 'add').length,
    addedNamespaces: changes.filter(c => c.type === 'add-namespace').length,
    conflicts: changes.filter(c => c.type === 'conflict').length,
    skipped: changes.filter(c => c.type === 'skip').length,
  };

  // Log changes
  console.log(`\n📝 Merging ${lang} translations (${targetPath}):`);
  console.log(`   Added: ${stats.added} keys`);
  console.log(`   New namespaces: ${stats.addedNamespaces}`);
  console.log(`   Conflicts: ${stats.conflicts}`);
  console.log(`   Skipped: ${stats.skipped}`);

  // Show conflicts
  if (stats.conflicts > 0) {
    log.warn('Conflicts detected:');
    for (const conflict of changes.filter(c => c.type === 'conflict')) {
      console.log(`   ${colors.yellow}${conflict.key}${colors.reset}`);
      console.log(`     Existing: "${conflict.existing}"`);
      console.log(`     New:      "${conflict.new}"`);
    }
  }

  // Show verbose details
  if (options.verbose) {
    console.log('\nDetailed changes:');
    for (const change of changes.filter(c => c.type === 'add')) {
      const preview = typeof change.value === 'string'
        ? change.value.substring(0, 50) + (change.value.length > 50 ? '...' : '')
        : '[object]';
      console.log(`   ${colors.green}+ ${change.key}${colors.reset}: ${preview}`);
    }
  }

  // Apply changes (unless dry-run)
  if (!options.dryRun) {
    // Create backup first
    if (!options.noBackup && fs.existsSync(fullPath)) {
      createBackup(fullPath);
    }

    // Sort keys and write
    const sorted = sortKeys(result);
    fs.writeFileSync(fullPath, JSON.stringify(sorted, null, 2) + '\n');
    log.success(`Updated ${targetPath}`);
  } else {
    log.info(`[DRY-RUN] Would update ${targetPath}`);
  }

  return stats;
};

// Main execution
const main = () => {
  console.log('🔀 Merging translation additions...\n');

  if (options.dryRun) {
    log.warn('DRY-RUN MODE: No files will be modified\n');
  }

  // Load translation additions
  const additionsPath = path.join(process.cwd(), 'i18n-reports', 'translation-additions.json');

  if (!fs.existsSync(additionsPath)) {
    log.error('Translation additions not found. Run i18n-generate-keys.js first.');
    process.exit(1);
  }

  const additions = loadJSON(additionsPath);

  if (!additions || (!additions.en && !additions.zhCN)) {
    log.info('No new translations to merge.');
    return;
  }

  // Check if there are actual additions
  const enCount = additions.en ? Object.keys(additions.en).reduce((sum, ns) =>
    sum + Object.keys(additions.en[ns]).length, 0) : 0;
  const zhCount = additions.zhCN ? Object.keys(additions.zhCN).reduce((sum, ns) =>
    sum + Object.keys(additions.zhCN[ns]).length, 0) : 0;

  if (enCount === 0 && zhCount === 0) {
    log.success('No new translations to merge. All keys already exist.');
    return;
  }

  console.log(`Found ${enCount} English and ${zhCount} Chinese keys to merge.\n`);

  // Merge English translations
  let totalStats = { added: 0, conflicts: 0, skipped: 0 };

  if (additions.en && Object.keys(additions.en).length > 0) {
    const enStats = mergeTranslations(
      config.existingTranslations.enPath,
      additions.en,
      'English'
    );
    totalStats.added += enStats.added + enStats.addedNamespaces;
    totalStats.conflicts += enStats.conflicts;
    totalStats.skipped += enStats.skipped;
  }

  // Merge Chinese translations
  if (additions.zhCN && Object.keys(additions.zhCN).length > 0) {
    const zhStats = mergeTranslations(
      config.existingTranslations.zhCNPath,
      additions.zhCN,
      'Chinese'
    );
    totalStats.added += zhStats.added + zhStats.addedNamespaces;
    totalStats.conflicts += zhStats.conflicts;
    totalStats.skipped += zhStats.skipped;
  }

  // Generate merge report
  const reportPath = path.join(process.cwd(), 'i18n-reports', 'merge-report.md');
  let report = '# Translation Merge Report\n\n';
  report += `**Generated:** ${new Date().toISOString()}\n`;
  report += `**Mode:** ${options.dryRun ? 'Dry Run' : 'Applied'}\n\n`;
  report += '## Summary\n\n';
  report += `- **Keys Added:** ${totalStats.added}\n`;
  report += `- **Conflicts:** ${totalStats.conflicts}\n`;
  report += `- **Skipped:** ${totalStats.skipped}\n\n`;

  if (totalStats.conflicts > 0) {
    report += '## Conflicts\n\n';
    report += 'The following keys had conflicts and were NOT overwritten:\n\n';
    report += '| Key | Existing Value | New Value |\n';
    report += '|-----|---------------|----------|\n';
    // Note: Would need to track conflicts to add here
  }

  fs.writeFileSync(reportPath, report);
  log.success(`Merge report saved: ${reportPath}`);

  // Final summary
  console.log('\n📊 Merge Summary:');
  console.log(`   Total keys added: ${totalStats.added}`);
  console.log(`   Total conflicts: ${totalStats.conflicts}`);
  console.log(`   Total skipped: ${totalStats.skipped}`);

  if (options.dryRun) {
    console.log('\n💡 Run without --dry-run to apply changes.');
  } else {
    console.log('\n✨ Merge complete!');
  }
};

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { mergeTranslations, deepMerge, sortKeys };
