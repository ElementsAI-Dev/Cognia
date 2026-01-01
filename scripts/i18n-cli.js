#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * i18n CLI - Main Entry Point
 *
 * Orchestrates all i18n scripts with a unified command-line interface.
 * Usage: node scripts/i18n-cli.js <command> [options]
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
  dim: (msg) => console.log(`${colors.dim}${msg}${colors.reset}`),
};

// Load configuration
const configPath = path.join(__dirname, 'i18n-config.json');
const _config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// Available commands
const commands = {
  extract: {
    script: 'i18n-extract.js',
    description: 'Extract hardcoded strings from components',
    alias: 'e',
  },
  generate: {
    script: 'i18n-generate-keys.js',
    description: 'Generate translation keys from extracted strings',
    alias: 'g',
  },
  update: {
    script: 'i18n-update-components.js',
    description: 'Update components to use translations',
    alias: 'u',
  },
  validate: {
    script: 'i18n-validate.js',
    description: 'Validate i18n implementation',
    alias: 'v',
  },
  merge: {
    script: 'i18n-merge.js',
    description: 'Merge new translations into JSON files',
    alias: 'm',
  },
  cleanup: {
    script: 'i18n-cleanup.js',
    description: 'Remove orphaned translation keys',
    alias: 'c',
  },
  stats: {
    script: 'i18n-stats.js',
    description: 'Show detailed i18n statistics',
    alias: 's',
  },
  backup: {
    script: 'i18n-backup.js',
    description: 'Backup or restore translation files',
    alias: 'b',
  },
  watch: {
    script: 'i18n-watch.js',
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

// Parse command line arguments
const parseArgs = (args) => {
  const parsed = {
    command: null,
    options: {},
    positional: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        parsed.options[key] = nextArg;
        i++;
      } else {
        parsed.options[key] = true;
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      parsed.options[key] = true;
    } else if (!parsed.command) {
      // Check if it's an alias
      const aliasMatch = Object.entries(commands).find(([_, cmd]) => cmd.alias === arg);
      parsed.command = aliasMatch ? aliasMatch[0] : arg;
    } else {
      parsed.positional.push(arg);
    }
  }

  return parsed;
};

// Run a script
const runScript = (scriptName, extraArgs = []) => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, scriptName);

    if (!fs.existsSync(scriptPath)) {
      reject(new Error(`Script not found: ${scriptName}`));
      return;
    }

    const child = spawn('node', [scriptPath, ...extraArgs], {
      stdio: 'inherit',
      cwd: process.cwd(),
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
};

// Show help
const showHelp = () => {
  log.title('🌐 i18n CLI - Internationalization Toolkit');

  console.log('Usage: node scripts/i18n-cli.js <command> [options]\n');

  console.log('Commands:');
  const maxCmdLen = Math.max(...Object.keys(commands).map(k => k.length));

  for (const [name, cmd] of Object.entries(commands)) {
    const padding = ' '.repeat(maxCmdLen - name.length + 2);
    const alias = cmd.alias ? `(${cmd.alias})` : '';
    console.log(`  ${colors.cyan}${name}${colors.reset}${padding}${alias.padEnd(5)} ${cmd.description}`);
  }

  console.log('\nOptions:');
  console.log('  --dry-run      Preview changes without applying them');
  console.log('  --verbose      Show detailed output');
  console.log('  --force        Skip confirmation prompts');
  console.log('  --namespace    Target specific namespace');
  console.log('  --help, -h     Show this help message');

  console.log('\nExamples:');
  console.log('  node scripts/i18n-cli.js extract');
  console.log('  node scripts/i18n-cli.js validate --verbose');
  console.log('  node scripts/i18n-cli.js all');
  console.log('  node scripts/i18n-cli.js cleanup --dry-run');
  console.log('  node scripts/i18n-cli.js backup create');
  console.log('  node scripts/i18n-cli.js backup restore');

  console.log('\nWorkflow:');
  console.log('  1. extract   - Find hardcoded strings in components');
  console.log('  2. generate  - Create translation keys for extracted strings');
  console.log('  3. merge     - Add new keys to translation files');
  console.log('  4. update    - Update component files to use t() calls');
  console.log('  5. validate  - Verify all translations are complete');
  console.log('  6. cleanup   - Remove unused translation keys\n');
};

// Run full workflow
const runFullWorkflow = async (options) => {
  log.title('🚀 Running Full i18n Workflow');

  const steps = [
    { name: 'Backup', script: 'i18n-backup.js', args: ['create'] },
    { name: 'Extract', script: 'i18n-extract.js', args: [] },
    { name: 'Generate Keys', script: 'i18n-generate-keys.js', args: [] },
    { name: 'Validate', script: 'i18n-validate.js', args: [] },
  ];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    log.info(`Step ${i + 1}/${steps.length}: ${step.name}`);

    try {
      await runScript(step.script, step.args);
      log.success(`${step.name} completed`);
    } catch (error) {
      log.error(`${step.name} failed: ${error.message}`);

      if (!options.force) {
        log.warn('Workflow stopped. Use --force to continue on errors.');
        process.exit(1);
      }
    }
  }

  log.title('✨ Workflow Complete!');
  log.info('Check i18n-reports/ for detailed results.');
  log.info('Review merge-instructions.md before applying changes.');
};

// Main entry point
const main = async () => {
  const args = process.argv.slice(2);
  const { command, options, positional } = parseArgs(args);

  // Show help if no command or help requested
  if (!command || command === 'help' || options.help || options.h) {
    showHelp();
    return;
  }

  // Check if command exists
  if (!commands[command]) {
    log.error(`Unknown command: ${command}`);
    log.info('Run "node scripts/i18n-cli.js help" to see available commands.');
    process.exit(1);
  }

  // Handle special commands
  if (command === 'all') {
    await runFullWorkflow(options);
    return;
  }

  // Run the corresponding script
  const cmd = commands[command];
  if (cmd.script) {
    try {
      const scriptArgs = [...positional];
      if (options['dry-run']) scriptArgs.push('--dry-run');
      if (options.verbose) scriptArgs.push('--verbose');
      if (options.force) scriptArgs.push('--force');
      if (options.namespace) scriptArgs.push('--namespace', options.namespace);

      await runScript(cmd.script, scriptArgs);
    } catch (error) {
      log.error(`Command failed: ${error.message}`);
      process.exit(1);
    }
  }
};

// Run
main().catch((error) => {
  log.error(`Unexpected error: ${error.message}`);
  process.exit(1);
});
