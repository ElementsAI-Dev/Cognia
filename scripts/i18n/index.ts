#!/usr/bin/env ts-node
/**
 * i18n CLI - Main Entry Point
 *
 * Orchestrates all i18n scripts with a unified command-line interface.
 * Usage: npx ts-node scripts/i18n/index.ts <command> [options]
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { loadConfig, parseArgs, colors, log } from './utils';
import type { CommandDefinition } from './types';

const commands: Record<string, CommandDefinition> = {
  extract: {
    script: 'extract.ts',
    description: 'Extract hardcoded strings from components',
    alias: 'e',
  },
  generate: {
    script: 'generate.ts',
    description: 'Generate translation keys from extracted strings',
    alias: 'g',
  },
  update: {
    script: 'update.ts',
    description: 'Update components to use translations',
    alias: 'u',
  },
  validate: {
    script: 'validate.ts',
    description: 'Validate i18n implementation',
    alias: 'v',
  },
  merge: {
    script: 'merge.ts',
    description: 'Merge new translations into JSON files',
    alias: 'm',
  },
  cleanup: {
    script: 'cleanup.ts',
    description: 'Remove orphaned translation keys',
    alias: 'c',
  },
  stats: {
    script: 'stats.ts',
    description: 'Show detailed i18n statistics',
    alias: 's',
  },
  backup: {
    script: 'backup.ts',
    description: 'Backup or restore translation files',
    alias: 'b',
  },
  watch: {
    script: 'watch.ts',
    description: 'Watch for changes and auto-validate',
    alias: 'w',
  },
  all: {
    description: 'Run full i18n workflow (extract → generate → validate)',
    alias: 'a',
  },
  help: {
    description: 'Show this help message',
    alias: 'h',
  },
};

function runScript(scriptName: string, extraArgs: string[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, scriptName);

    if (!fs.existsSync(scriptPath)) {
      reject(new Error(`Script not found: ${scriptName}`));
      return;
    }

    const child = spawn('npx', ['ts-node', scriptPath, ...extraArgs], {
      stdio: 'inherit',
      cwd: process.cwd(),
      shell: true,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

function showHelp(): void {
  log.title('🌐 i18n CLI - Internationalization Toolkit');

  console.log('Usage: npx ts-node scripts/i18n/index.ts <command> [options]\n');

  console.log('Commands:');
  const maxCmdLen = Math.max(...Object.keys(commands).map((k) => k.length));

  for (const [name, cmd] of Object.entries(commands)) {
    const padding = ' '.repeat(maxCmdLen - name.length + 2);
    const alias = cmd.alias ? `(${cmd.alias})` : '';
    console.log(
      `  ${colors.cyan}${name}${colors.reset}${padding}${alias.padEnd(5)} ${cmd.description}`
    );
  }

  console.log('\nOptions:');
  console.log('  --dry-run      Preview changes without applying them');
  console.log('  --verbose      Show detailed output');
  console.log('  --force        Skip confirmation prompts');
  console.log('  --namespace    Target specific namespace');
  console.log('  --help, -h     Show this help message');

  console.log('\nExamples:');
  console.log('  npx ts-node scripts/i18n/index.ts extract');
  console.log('  npx ts-node scripts/i18n/index.ts validate --verbose');
  console.log('  npx ts-node scripts/i18n/index.ts all');
  console.log('  npx ts-node scripts/i18n/index.ts cleanup --dry-run');

  console.log('\nWorkflow:');
  console.log('  1. extract   - Find hardcoded strings in components');
  console.log('  2. generate  - Create translation keys for extracted strings');
  console.log('  3. merge     - Add new keys to translation files');
  console.log('  4. update    - Update component files to use t() calls');
  console.log('  5. validate  - Verify all translations are complete');
  console.log('  6. cleanup   - Remove unused translation keys\n');
}

async function runFullWorkflow(options: Record<string, string | boolean>): Promise<void> {
  log.title('🚀 Running Full i18n Workflow');

  const steps = [
    { name: 'Backup', script: 'backup.ts', args: ['create'] },
    { name: 'Extract', script: 'extract.ts', args: [] },
    { name: 'Generate Keys', script: 'generate.ts', args: [] },
    { name: 'Validate', script: 'validate.ts', args: [] },
  ];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    log.info(`Step ${i + 1}/${steps.length}: ${step.name}`);

    try {
      await runScript(step.script, step.args);
      log.success(`${step.name} completed`);
    } catch (error) {
      log.error(`${step.name} failed: ${(error as Error).message}`);

      if (!options.force) {
        log.warn('Workflow stopped. Use --force to continue on errors.');
        process.exit(1);
      }
    }
  }

  log.title('✨ Workflow Complete!');
  log.info('Check i18n-reports/ for detailed results.');
  log.info('Review merge-instructions.md before applying changes.');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const { command, options, positional } = parseArgs(args);

  // Resolve alias to command name
  let resolvedCommand = command;
  if (command) {
    const aliasMatch = Object.entries(commands).find(
      ([, cmd]) => cmd.alias === command
    );
    if (aliasMatch) {
      resolvedCommand = aliasMatch[0];
    }
  }

  // Show help if no command or help requested
  if (!resolvedCommand || resolvedCommand === 'help' || options.help || options.h) {
    showHelp();
    return;
  }

  // Check if command exists
  if (!commands[resolvedCommand]) {
    log.error(`Unknown command: ${resolvedCommand}`);
    log.info('Run "npx ts-node scripts/i18n/index.ts help" to see available commands.');
    process.exit(1);
  }

  // Handle special commands
  if (resolvedCommand === 'all') {
    await runFullWorkflow(options);
    return;
  }

  // Run the corresponding script
  const cmd = commands[resolvedCommand];
  if (cmd.script) {
    try {
      const scriptArgs = [...positional];
      if (options['dry-run']) scriptArgs.push('--dry-run');
      if (options.verbose) scriptArgs.push('--verbose');
      if (options.force) scriptArgs.push('--force');
      if (typeof options.namespace === 'string') {
        scriptArgs.push('--namespace', options.namespace);
      }

      await runScript(cmd.script, scriptArgs);
    } catch (error) {
      log.error(`Command failed: ${(error as Error).message}`);
      process.exit(1);
    }
  }
}

// Ensure config is loadable
try {
  loadConfig();
} catch (error) {
  log.error(`Failed to load config: ${(error as Error).message}`);
  process.exit(1);
}

main().catch((error) => {
  log.error(`Unexpected error: ${(error as Error).message}`);
  process.exit(1);
});
