/**
 * Security Command
 *
 * @description CLI command to manage Shell Tools security settings.
 */

import * as path from 'path';
import { loadConfig, saveConfig, type ShellToolsConfig } from './config';

interface SecurityOptions {
  block?: string;
  unblock?: string;
  allowDir?: string;
  denyDir?: string;
  hideEnv?: string;
  showEnv?: string;
  list?: boolean;
}

export async function securityCommand(options: SecurityOptions): Promise<void> {
  console.log('\n🔒 Shell Tools - Security Settings\n');

  const config = loadConfig();
  let modified = false;

  // Block command
  if (options.block) {
    if (!config.blockedCommands.includes(options.block)) {
      config.blockedCommands.push(options.block);
      modified = true;
      console.log(`✅ Added "${options.block}" to blocked commands\n`);
    } else {
      console.log(`ℹ️  "${options.block}" is already blocked\n`);
    }
  }

  // Unblock command
  if (options.unblock) {
    const index = config.blockedCommands.indexOf(options.unblock);
    if (index !== -1) {
      config.blockedCommands.splice(index, 1);
      modified = true;
      console.log(`✅ Removed "${options.unblock}" from blocked commands\n`);
    } else {
      console.log(`ℹ️  "${options.unblock}" is not in blocked list\n`);
    }
  }

  // Allow directory
  if (options.allowDir) {
    const normalizedPath = normalizePath(options.allowDir);
    if (!config.allowedDirectories.includes(normalizedPath)) {
      config.allowedDirectories.push(normalizedPath);
      modified = true;
      console.log(`✅ Added "${normalizedPath}" to allowed directories\n`);
    } else {
      console.log(`ℹ️  "${normalizedPath}" is already allowed\n`);
    }
  }

  // Deny directory
  if (options.denyDir) {
    const normalizedPath = normalizePath(options.denyDir);
    const index = config.allowedDirectories.indexOf(normalizedPath);
    if (index !== -1) {
      config.allowedDirectories.splice(index, 1);
      modified = true;
      console.log(`✅ Removed "${normalizedPath}" from allowed directories\n`);
    } else {
      console.log(`ℹ️  "${normalizedPath}" is not in allowed list\n`);
    }
  }

  // Hide environment variable
  if (options.hideEnv) {
    const varName = options.hideEnv.toUpperCase();
    if (!config.hiddenEnvVars.includes(varName)) {
      config.hiddenEnvVars.push(varName);
      modified = true;
      console.log(`✅ Added "${varName}" to hidden environment variables\n`);
    } else {
      console.log(`ℹ️  "${varName}" is already hidden\n`);
    }
  }

  // Show environment variable
  if (options.showEnv) {
    const varName = options.showEnv.toUpperCase();
    const index = config.hiddenEnvVars.indexOf(varName);
    if (index !== -1) {
      config.hiddenEnvVars.splice(index, 1);
      modified = true;
      console.log(`✅ Removed "${varName}" from hidden environment variables\n`);
    } else {
      console.log(`ℹ️  "${varName}" is not in hidden list\n`);
    }
  }

  // Save if modified
  if (modified) {
    saveConfig(config);
  }

  // Show current settings if list option or no action taken
  if (options.list || !modified) {
    printSecuritySettings(config);
  }
}

function normalizePath(inputPath: string): string {
  // Normalize path separators and resolve relative paths
  return path.resolve(inputPath).replace(/\\/g, '/');
}

function printSecuritySettings(config: ShellToolsConfig): void {
  console.log('📋 Current Security Settings:\n');

  console.log('🚫 Blocked Commands:');
  if (config.blockedCommands.length > 0) {
    for (const cmd of config.blockedCommands) {
      console.log(`   - ${cmd}`);
    }
  } else {
    console.log('   (none)');
  }

  console.log('\n📁 Allowed Directories:');
  if (config.allowedDirectories.length > 0) {
    for (const dir of config.allowedDirectories) {
      console.log(`   - ${dir}`);
    }
  } else {
    console.log('   (all directories - no restrictions)');
  }

  console.log('\n🙈 Hidden Environment Variables:');
  if (config.hiddenEnvVars.length > 0) {
    for (const envVar of config.hiddenEnvVars) {
      console.log(`   - ${envVar}`);
    }
  } else {
    console.log('   (none)');
  }

  console.log('');
}
