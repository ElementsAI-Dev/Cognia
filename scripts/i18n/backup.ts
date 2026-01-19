#!/usr/bin/env ts-node
/**
 * i18n Backup Script
 *
 * Manages backups of translation files.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  loadConfig,
  ensureDir,
  writeJSON,
  generateTimestamp,
  log,
  colors,
} from './utils';
import type { BackupMetadata, BackupInfo } from './types';

type Command = 'create' | 'list' | 'restore' | 'delete' | 'compare';

interface CliOptions {
  command: Command;
  id?: string;
  verbose: boolean;
  force: boolean;
  help: boolean;
}

function parseCliOptions(args: string[]): CliOptions {
  const command = (args[0] as Command) || 'create';
  return {
    command: ['create', 'list', 'restore', 'delete', 'compare'].includes(command)
      ? command
      : 'create',
    id: args.find((a, i) => args[i - 1] === '--id'),
    verbose: args.includes('--verbose'),
    force: args.includes('--force'),
    help: args.includes('--help') || args.includes('-h'),
  };
}

function showHelp(): void {
  console.log(`
i18n Backup Script

Usage: npx ts-node scripts/i18n/backup.ts <command> [options]

Commands:
  create              Create a new backup (default)
  list                List all backups
  restore             Restore from a backup
  delete              Delete a backup
  compare             Compare backup with current files

Options:
  --id <backup_id>    Specify backup ID for restore/delete/compare
  --verbose           Show detailed output
  --force             Skip confirmation prompts
  --help, -h          Show this help message

Examples:
  npx ts-node scripts/i18n/backup.ts create
  npx ts-node scripts/i18n/backup.ts list
  npx ts-node scripts/i18n/backup.ts restore --id backup_2024-01-15_10-30-00
  npx ts-node scripts/i18n/backup.ts compare --verbose
`);
}

function getBackupDir(config: ReturnType<typeof loadConfig>): string {
  return path.join(process.cwd(), config.backupSettings.backupDir);
}

function listBackups(backupDir: string): BackupInfo[] {
  if (!fs.existsSync(backupDir)) {
    return [];
  }

  const backups: BackupInfo[] = [];
  const entries = fs.readdirSync(backupDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.startsWith('backup_')) {
      const metadataPath = path.join(backupDir, entry.name, 'metadata.json');
      if (fs.existsSync(metadataPath)) {
        try {
          const metadata: BackupMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
          const dirPath = path.join(backupDir, entry.name);
          const sizeKB = Math.round(
            fs.readdirSync(dirPath).reduce((sum, file) => {
              const filePath = path.join(dirPath, file);
              return sum + fs.statSync(filePath).size;
            }, 0) / 1024
          );

          backups.push({
            id: entry.name,
            timestamp: metadata.timestamp,
            files: metadata.files,
            size: `${sizeKB} KB`,
          });
        } catch {
          // Skip invalid backups
        }
      }
    }
  }

  return backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

function copyDirRecursive(src: string, dest: string): void {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function createBackup(config: ReturnType<typeof loadConfig>): void {
  const backupDir = getBackupDir(config);
  const timestamp = generateTimestamp();
  const backupId = `backup_${timestamp}`;
  const backupPath = path.join(backupDir, backupId);

  ensureDir(backupPath);

  const enPath = path.join(process.cwd(), config.existingTranslations.enPath);
  const zhPath = path.join(process.cwd(), config.existingTranslations.zhCNPath);

  const files: string[] = [];

  // Check if paths are directories (split files) or single files
  if (fs.existsSync(enPath)) {
    if (fs.statSync(enPath).isDirectory()) {
      copyDirRecursive(enPath, path.join(backupPath, 'en'));
      files.push('en/');
    } else {
      fs.copyFileSync(enPath, path.join(backupPath, 'en.json'));
      files.push('en.json');
    }
  }

  if (fs.existsSync(zhPath)) {
    if (fs.statSync(zhPath).isDirectory()) {
      copyDirRecursive(zhPath, path.join(backupPath, 'zh-CN'));
      files.push('zh-CN/');
    } else {
      fs.copyFileSync(zhPath, path.join(backupPath, 'zh-CN.json'));
      files.push('zh-CN.json');
    }
  }

  const metadata: BackupMetadata = {
    timestamp: new Date().toISOString(),
    backupId,
    files,
    config: {
      enPath: config.existingTranslations.enPath,
      zhCNPath: config.existingTranslations.zhCNPath,
    },
  };

  writeJSON(path.join(backupPath, 'metadata.json'), metadata);

  log.success(`Backup created: ${backupId}`);

  // Cleanup old backups
  const allBackups = listBackups(backupDir);
  if (allBackups.length > config.backupSettings.maxBackups) {
    const toDelete = allBackups.slice(config.backupSettings.maxBackups);
    for (const backup of toDelete) {
      const deletePath = path.join(backupDir, backup.id);
      fs.rmSync(deletePath, { recursive: true });
      log.dim(`Deleted old backup: ${backup.id}`);
    }
  }
}

function restoreBackup(config: ReturnType<typeof loadConfig>, backupId: string): void {
  const backupDir = getBackupDir(config);
  const backupPath = path.join(backupDir, backupId);

  if (!fs.existsSync(backupPath)) {
    log.error(`Backup not found: ${backupId}`);
    process.exit(1);
  }

  const enPath = path.join(process.cwd(), config.existingTranslations.enPath);
  const zhPath = path.join(process.cwd(), config.existingTranslations.zhCNPath);

  // Check for split files backup (directory) or single file backup
  const enBackupDir = path.join(backupPath, 'en');
  const zhBackupDir = path.join(backupPath, 'zh-CN');
  const enBackupFile = path.join(backupPath, 'en.json');
  const zhBackupFile = path.join(backupPath, 'zh-CN.json');

  // Restore English translations
  if (fs.existsSync(enBackupDir) && fs.statSync(enBackupDir).isDirectory()) {
    // Restore from split files backup
    ensureDir(enPath);
    copyDirRecursive(enBackupDir, enPath);
    log.success(`Restored: ${config.existingTranslations.enPath}/`);
  } else if (fs.existsSync(enBackupFile)) {
    fs.copyFileSync(enBackupFile, enPath.endsWith('.json') ? enPath : `${enPath}.json`);
    log.success(`Restored: ${config.existingTranslations.enPath}`);
  }

  // Restore Chinese translations
  if (fs.existsSync(zhBackupDir) && fs.statSync(zhBackupDir).isDirectory()) {
    // Restore from split files backup
    ensureDir(zhPath);
    copyDirRecursive(zhBackupDir, zhPath);
    log.success(`Restored: ${config.existingTranslations.zhCNPath}/`);
  } else if (fs.existsSync(zhBackupFile)) {
    fs.copyFileSync(zhBackupFile, zhPath.endsWith('.json') ? zhPath : `${zhPath}.json`);
    log.success(`Restored: ${config.existingTranslations.zhCNPath}`);
  }

  log.success(`Restored from backup: ${backupId}`);
}

function compareBackup(
  config: ReturnType<typeof loadConfig>,
  backupId: string,
  _verbose: boolean
): void {
  const backupDir = getBackupDir(config);
  const allBackups = listBackups(backupDir);

  if (allBackups.length === 0) {
    log.warn('No backups available for comparison.');
    return;
  }

  const targetId = backupId || allBackups[0].id;
  const backupPath = path.join(backupDir, targetId);

  if (!fs.existsSync(backupPath)) {
    log.error(`Backup not found: ${targetId}`);
    return;
  }

  console.log(`Comparing with backup: ${targetId}\n`);

  const currentEn = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), config.existingTranslations.enPath), 'utf-8')
  );
  const backupEn = JSON.parse(fs.readFileSync(path.join(backupPath, 'en.json'), 'utf-8'));

  const currentKeys = new Set(Object.keys(JSON.stringify(currentEn).match(/"[^"]+"\s*:/g) || []));
  const backupKeys = new Set(Object.keys(JSON.stringify(backupEn).match(/"[^"]+"\s*:/g) || []));

  let added = 0;
  let removed = 0;

  for (const key of currentKeys) {
    if (!backupKeys.has(key)) added++;
  }
  for (const key of backupKeys) {
    if (!currentKeys.has(key)) removed++;
  }

  console.log(`${colors.green}+ Added:${colors.reset}   ${added} keys`);
  console.log(`${colors.red}- Removed:${colors.reset} ${removed} keys`);
}

export function main(): void {
  const args = process.argv.slice(2);
  const cliOptions = parseCliOptions(args);

  if (cliOptions.help) {
    showHelp();
    process.exit(0);
  }

  const config = loadConfig();
  const backupDir = getBackupDir(config);

  switch (cliOptions.command) {
    case 'create':
      console.log('💾 Creating backup...\n');
      createBackup(config);
      break;

    case 'list':
      console.log('📋 Available backups:\n');
      const backups = listBackups(backupDir);
      if (backups.length === 0) {
        log.warn('No backups found.');
      } else {
        for (const backup of backups) {
          console.log(`  ${colors.cyan}${backup.id}${colors.reset}`);
          console.log(`    Created: ${backup.timestamp}`);
          console.log(`    Size: ${backup.size}`);
          console.log(`    Files: ${backup.files.join(', ')}`);
          console.log('');
        }
      }
      break;

    case 'restore':
      if (!cliOptions.id) {
        const latest = listBackups(backupDir)[0];
        if (!latest) {
          log.error('No backups available.');
          process.exit(1);
        }
        cliOptions.id = latest.id;
        log.info(`Restoring latest backup: ${cliOptions.id}`);
      }
      if (!cliOptions.force) {
        log.warn(`Will restore from ${cliOptions.id}. Use --force to confirm.`);
        process.exit(0);
      }
      restoreBackup(config, cliOptions.id);
      break;

    case 'delete':
      if (!cliOptions.id) {
        log.error('Specify backup ID with --id');
        process.exit(1);
      }
      if (!cliOptions.force) {
        log.warn(`Will delete ${cliOptions.id}. Use --force to confirm.`);
        process.exit(0);
      }
      const deletePath = path.join(backupDir, cliOptions.id);
      if (fs.existsSync(deletePath)) {
        fs.rmSync(deletePath, { recursive: true });
        log.success(`Deleted: ${cliOptions.id}`);
      } else {
        log.error(`Backup not found: ${cliOptions.id}`);
      }
      break;

    case 'compare':
      compareBackup(config, cliOptions.id || '', cliOptions.verbose);
      break;
  }
}

if (require.main === module) {
  main();
}
