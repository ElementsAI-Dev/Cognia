#!/usr/bin/env node
/**
 * Cognia Plugin SDK CLI
 *
 * @description Command-line interface for creating, developing, and building plugins.
 */

import { Command } from 'commander';
import { createCommand } from './commands/create';
import { devCommand } from './commands/dev';
import { buildCommand } from './commands/build';
import { validateCommand } from './commands/validate';
import { initCommand } from './commands/init';

const program = new Command();

program
  .name('cognia-plugin')
  .description('Cognia Plugin SDK CLI - Create, develop, and build plugins')
  .version('2.0.0');

// Create new plugin
program
  .command('create [name]')
  .description('Create a new plugin project (interactive wizard if name omitted)')
  .option('-t, --template <template>', 'Template to use (basic, tool, command, full)', 'basic')
  .option('-d, --directory <dir>', 'Directory to create the plugin in', '.')
  .option('--typescript', 'Use TypeScript (default)', true)
  .option('--no-typescript', 'Use JavaScript instead of TypeScript')
  .option('--no-git', 'Skip git initialization')
  .option('--no-install', 'Skip npm install')
  .option('-i, --interactive', 'Force interactive mode')
  .action(createCommand);

// Initialize existing project
program
  .command('init')
  .description('Initialize plugin SDK in an existing project')
  .option('-f, --force', 'Overwrite existing configuration')
  .option('-i, --interactive', 'Force interactive mode')
  .option('--no-interactive', 'Force non-interactive mode (for CI)')
  .action(initCommand);

// Development server
program
  .command('dev')
  .description('Start development server with hot reload')
  .option('-p, --port <port>', 'Port to run dev server on', '3001')
  .option('--no-open', 'Do not open browser automatically')
  .option('-w, --watch', 'Enable file watching', true)
  .action(devCommand);

// Build plugin
program
  .command('build')
  .description('Build plugin for production')
  .option('-o, --output <dir>', 'Output directory', 'dist')
  .option('--minify', 'Minify output', true)
  .option('--no-minify', 'Skip minification')
  .option('--sourcemap', 'Generate source maps')
  .action(buildCommand);

// Validate plugin
program
  .command('validate')
  .description('Validate plugin manifest and structure')
  .option('--strict', 'Enable strict validation mode')
  .action(validateCommand);

program.parse();
