#!/usr/bin/env node
/**
 * Shell Tools CLI
 *
 * @description Command-line interface for Shell Tools plugin security configuration.
 * Supports managing blocked commands, allowed directories, and security settings.
 */

import { Command } from 'commander';
import { configCommand } from './commands/config';
import { securityCommand } from './commands/security';

const program = new Command();

program
  .name('shell-tools')
  .description('Shell Tools CLI - Security configuration management')
  .version('1.0.0');

// Config command
program
  .command('config')
  .description('Manage Shell Tools configuration')
  .option('--list', 'List current configuration')
  .option('--get <key>', 'Get a config value')
  .option('--set <key=value>', 'Set a config value')
  .option('--reset', 'Reset to default configuration')
  .action(configCommand);

// Security command
program
  .command('security')
  .description('Manage security settings')
  .option('--block <command>', 'Add command to blocklist')
  .option('--unblock <command>', 'Remove command from blocklist')
  .option('--allow-dir <path>', 'Add directory to allowed list')
  .option('--deny-dir <path>', 'Remove directory from allowed list')
  .option('--hide-env <var>', 'Add environment variable to hidden list')
  .option('--show-env <var>', 'Remove environment variable from hidden list')
  .option('--list', 'Show current security settings')
  .action(securityCommand);

// Validate command
program
  .command('validate')
  .description('Validate security configuration')
  .option('--strict', 'Enable strict validation mode')
  .action(async (options) => {
    const { validateCommand } = await import('./commands/validate');
    await validateCommand(options);
  });

program.parse();
