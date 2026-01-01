#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * i18n Backup Script
 *
 * Creates and manages backups of translation files.
 * Supports create, restore, list, and clean operations.
 */

const fs = require('fs');
const path = require('path');

// Load configuration
const configPath = path.join(__dirname, 'i18n-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// Parse CLI arguments
const args = process.argv.slice(2);
const command = args[0] || 'create';
const options = {
  force: args.includes('--force'),
  verbose: args.includes('--verbose'),
  backupId: args.find((a, i) => args[i - 1] === '--id'),
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

// Get backup directory
const getBackupDir = () => {
  return path.join(process.cwd(), config.backupSettings?.backupDir || 'i18n-backups');
};

// Get translation file paths
const getTranslationPaths = () => {
  return [
    { name: 'en.json', path: config.existingTranslations.enPath },
    { name: 'zh-CN.json', path: config.existingTranslations.zhCNPath },
  ];
};

// Generate timestamp for backup
const generateTimestamp = () => {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
};

// Create backup
const createBackup = () => {
  console.log('📦 Creating backup of translation files...\n');

  const backupDir = getBackupDir();
  const timestamp = generateTimestamp();
  const backupSubDir = path.join(backupDir, `backup_${timestamp}`);

  fs.mkdirSync(backupSubDir, { recursive: true });

  const files = getTranslationPaths();
  const createdFiles = [];

  for (const file of files) {
    const sourcePath = path.join(process.cwd(), file.path);

    if (!fs.existsSync(sourcePath)) {
      log.warn(`Source file not found: ${file.path}`);
      continue;
    }

    const destPath = path.join(backupSubDir, file.name);
    fs.copyFileSync(sourcePath, destPath);
    createdFiles.push(file.name);
    log.verbose(`Backed up: ${file.path} → ${destPath}`);
  }

  // Create metadata file
  const metadata = {
    timestamp: new Date().toISOString(),
    backupId: `backup_${timestamp}`,
    files: createdFiles,
    config: {
      enPath: config.existingTranslations.enPath,
      zhCNPath: config.existingTranslations.zhCNPath,
    },
  };

  fs.writeFileSync(
    path.join(backupSubDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );

  log.success(`Backup created: ${backupSubDir}`);
  console.log(`   Backup ID: backup_${timestamp}`);
  console.log(`   Files: ${createdFiles.join(', ')}`);

  // Clean up old backups
  cleanOldBackups();

  return `backup_${timestamp}`;
};

// List available backups
const listBackups = () => {
  console.log('📋 Available backups:\n');

  const backupDir = getBackupDir();

  if (!fs.existsSync(backupDir)) {
    log.info('No backups found.');
    return [];
  }

  const entries = fs.readdirSync(backupDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name.startsWith('backup_'))
    .sort()
    .reverse();

  if (entries.length === 0) {
    log.info('No backups found.');
    return [];
  }

  const backups = [];

  for (const entry of entries) {
    const metadataPath = path.join(backupDir, entry.name, 'metadata.json');
    let metadata = null;

    try {
      metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    } catch (_error) {
      // No metadata file
    }

    const files = fs.readdirSync(path.join(backupDir, entry.name))
      .filter(f => f !== 'metadata.json');

    const size = files.reduce((sum, f) => {
      const stat = fs.statSync(path.join(backupDir, entry.name, f));
      return sum + stat.size;
    }, 0);

    const backup = {
      id: entry.name,
      timestamp: metadata?.timestamp || 'Unknown',
      files: files,
      size: (size / 1024).toFixed(1) + ' KB',
    };

    backups.push(backup);

    console.log(`  ${colors.cyan}${backup.id}${colors.reset}`);
    console.log(`    Date: ${backup.timestamp}`);
    console.log(`    Files: ${backup.files.join(', ')}`);
    console.log(`    Size: ${backup.size}`);
    console.log();
  }

  console.log(`Total: ${backups.length} backup(s)\n`);
  return backups;
};

// Restore from backup
const restoreBackup = (backupId) => {
  console.log('🔄 Restoring from backup...\n');

  const backupDir = getBackupDir();

  // Find backup
  let targetBackup = backupId;

  if (!targetBackup) {
    // Get most recent backup
    const entries = fs.readdirSync(backupDir, { withFileTypes: true })
      .filter(e => e.isDirectory() && e.name.startsWith('backup_'))
      .sort()
      .reverse();

    if (entries.length === 0) {
      log.error('No backups found.');
      process.exit(1);
    }

    targetBackup = entries[0].name;
    log.info(`Using most recent backup: ${targetBackup}`);
  }

  const backupPath = path.join(backupDir, targetBackup);

  if (!fs.existsSync(backupPath)) {
    log.error(`Backup not found: ${targetBackup}`);
    process.exit(1);
  }

  // Create a backup of current state before restoring
  if (!options.force) {
    console.log('Creating safety backup of current files...');
    const safetyBackup = createBackup();
    log.info(`Safety backup created: ${safetyBackup}`);
  }

  // Restore files
  const files = getTranslationPaths();
  let restoredCount = 0;

  for (const file of files) {
    const backupFile = path.join(backupPath, file.name);

    if (!fs.existsSync(backupFile)) {
      log.warn(`Backup file not found: ${file.name}`);
      continue;
    }

    const destPath = path.join(process.cwd(), file.path);
    fs.copyFileSync(backupFile, destPath);
    restoredCount++;
    log.verbose(`Restored: ${backupFile} → ${destPath}`);
  }

  log.success(`Restored ${restoredCount} file(s) from ${targetBackup}`);
};

// Clean old backups
const cleanOldBackups = () => {
  const backupDir = getBackupDir();
  const maxBackups = config.backupSettings?.maxBackups || 5;

  if (!fs.existsSync(backupDir)) return;

  const entries = fs.readdirSync(backupDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name.startsWith('backup_'))
    .sort()
    .reverse();

  if (entries.length <= maxBackups) return;

  const toDelete = entries.slice(maxBackups);

  for (const entry of toDelete) {
    const backupPath = path.join(backupDir, entry.name);

    // Remove all files in backup directory
    const files = fs.readdirSync(backupPath);
    for (const file of files) {
      fs.unlinkSync(path.join(backupPath, file));
    }

    // Remove directory
    fs.rmdirSync(backupPath);
    log.verbose(`Removed old backup: ${entry.name}`);
  }

  if (toDelete.length > 0) {
    log.info(`Cleaned up ${toDelete.length} old backup(s)`);
  }
};

// Delete specific backup
const deleteBackup = (backupId) => {
  if (!backupId) {
    log.error('Please specify a backup ID to delete.');
    process.exit(1);
  }

  const backupDir = getBackupDir();
  const backupPath = path.join(backupDir, backupId);

  if (!fs.existsSync(backupPath)) {
    log.error(`Backup not found: ${backupId}`);
    process.exit(1);
  }

  // Remove all files
  const files = fs.readdirSync(backupPath);
  for (const file of files) {
    fs.unlinkSync(path.join(backupPath, file));
  }

  // Remove directory
  fs.rmdirSync(backupPath);
  log.success(`Deleted backup: ${backupId}`);
};

// Compare backup with current
const compareBackup = (backupId) => {
  console.log('🔍 Comparing backup with current files...\n');

  const backupDir = getBackupDir();

  let targetBackup = backupId;

  if (!targetBackup) {
    const entries = fs.readdirSync(backupDir, { withFileTypes: true })
      .filter(e => e.isDirectory() && e.name.startsWith('backup_'))
      .sort()
      .reverse();

    if (entries.length === 0) {
      log.error('No backups found.');
      process.exit(1);
    }

    targetBackup = entries[0].name;
  }

  const backupPath = path.join(backupDir, targetBackup);

  if (!fs.existsSync(backupPath)) {
    log.error(`Backup not found: ${targetBackup}`);
    process.exit(1);
  }

  console.log(`Comparing with: ${targetBackup}\n`);

  const files = getTranslationPaths();

  for (const file of files) {
    const backupFile = path.join(backupPath, file.name);
    const currentFile = path.join(process.cwd(), file.path);

    if (!fs.existsSync(backupFile)) {
      log.warn(`Backup file not found: ${file.name}`);
      continue;
    }

    if (!fs.existsSync(currentFile)) {
      log.warn(`Current file not found: ${file.path}`);
      continue;
    }

    const backupContent = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
    const currentContent = JSON.parse(fs.readFileSync(currentFile, 'utf-8'));

    const backupKeys = new Set();
    const currentKeys = new Set();

    const flatten = (obj, prefix = '') => {
      const keys = [];
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null) {
          keys.push(...flatten(value, fullKey));
        } else {
          keys.push(fullKey);
        }
      }
      return keys;
    };

    flatten(backupContent).forEach(k => backupKeys.add(k));
    flatten(currentContent).forEach(k => currentKeys.add(k));

    const added = [...currentKeys].filter(k => !backupKeys.has(k));
    const removed = [...backupKeys].filter(k => !currentKeys.has(k));

    console.log(`${colors.cyan}${file.name}${colors.reset}`);
    console.log(`  Backup keys: ${backupKeys.size}`);
    console.log(`  Current keys: ${currentKeys.size}`);
    console.log(`  ${colors.green}Added: ${added.length}${colors.reset}`);
    console.log(`  ${colors.red}Removed: ${removed.length}${colors.reset}`);

    if (options.verbose && added.length > 0) {
      console.log(`  Added keys:`);
      added.slice(0, 10).forEach(k => console.log(`    + ${k}`));
      if (added.length > 10) console.log(`    ... and ${added.length - 10} more`);
    }

    if (options.verbose && removed.length > 0) {
      console.log(`  Removed keys:`);
      removed.slice(0, 10).forEach(k => console.log(`    - ${k}`));
      if (removed.length > 10) console.log(`    ... and ${removed.length - 10} more`);
    }

    console.log();
  }
};

// Show help
const showHelp = () => {
  console.log(`
${colors.cyan}i18n Backup Manager${colors.reset}

Usage: node scripts/i18n-backup.js <command> [options]

Commands:
  create              Create a new backup (default)
  list                List available backups
  restore [--id ID]   Restore from a backup
  delete --id ID      Delete a specific backup
  compare [--id ID]   Compare backup with current files
  clean               Remove old backups beyond max limit
  help                Show this help message

Options:
  --id <backup-id>    Specify backup ID for restore/delete/compare
  --force             Skip safety backup during restore
  --verbose           Show detailed output

Examples:
  node scripts/i18n-backup.js create
  node scripts/i18n-backup.js list
  node scripts/i18n-backup.js restore --id backup_2024-01-15_10-30-00
  node scripts/i18n-backup.js compare --verbose
  node scripts/i18n-backup.js delete --id backup_2024-01-15_10-30-00
`);
};

// Main execution
const main = () => {
  switch (command) {
    case 'create':
      createBackup();
      break;
    case 'list':
      listBackups();
      break;
    case 'restore':
      restoreBackup(options.backupId);
      break;
    case 'delete':
      deleteBackup(options.backupId);
      break;
    case 'compare':
      compareBackup(options.backupId);
      break;
    case 'clean':
      cleanOldBackups();
      log.success('Cleanup complete');
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      log.error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
};

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { createBackup, listBackups, restoreBackup, compareBackup };
