#!/usr/bin/env node
/**
 * AI Tools CLI
 *
 * @description Command-line interface for AI Tools plugin operations.
 * Supports scraping pricing, checking status, and viewing rankings from terminal.
 */

import { Command } from 'commander';
import { scrapeCommand } from './commands/scrape';
import { statusCommand } from './commands/status';
import { rankingsCommand } from './commands/rankings';
import { configCommand } from './commands/config';

const program = new Command();

program
  .name('ai-tools')
  .description('AI Tools CLI - Scrape pricing, check status, view rankings')
  .version('1.0.0');

// Scrape pricing command
program
  .command('scrape [providers...]')
  .description('Scrape AI model pricing from providers')
  .option('-r, --region <region>', 'Filter by region (US, CN, all)', 'all')
  .option('-o, --output <dir>', 'Output directory', 'ai-tools-output')
  .option('-f, --format <format>', 'Output format (json, csv, markdown)', 'json')
  .option('--no-cache', 'Bypass cache and fetch fresh data')
  .action(scrapeCommand);

// Check status command
program
  .command('status [providers...]')
  .description('Check health status of AI providers')
  .option('-r, --region <region>', 'Filter by region (US, CN, EU, all)', 'all')
  .option('-t, --timeout <ms>', 'Request timeout in milliseconds', '30000')
  .option('--json', 'Output as JSON')
  .action(statusCommand);

// View rankings command
program
  .command('rankings')
  .description('View OpenRouter model rankings')
  .option('-t, --time-range <range>', 'Time range (week, month, all)', 'week')
  .option('-f, --format <format>', 'Output format (json, csv, markdown)', 'markdown')
  .option('-o, --output <file>', 'Output file path')
  .action(rankingsCommand);

// Leaderboard command
program
  .command('leaderboard')
  .description('View LMArena chatbot arena leaderboard')
  .option('-c, --category <cat>', 'Category (overall, coding, math, creative_writing)', 'overall')
  .option('-n, --limit <n>', 'Number of entries to show', '20')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const { leaderboardCommand } = await import('./commands/leaderboard');
    await leaderboardCommand(options);
  });

// Config command
program
  .command('config')
  .description('Manage AI Tools configuration')
  .option('--list', 'List current configuration')
  .option('--get <key>', 'Get a config value')
  .option('--set <key=value>', 'Set a config value')
  .option('--reset', 'Reset to default configuration')
  .action(configCommand);

// Clear cache command
program
  .command('clear-cache')
  .description('Clear all cached data')
  .option('--pricing', 'Clear only pricing cache')
  .option('--status', 'Clear only status cache')
  .option('--rankings', 'Clear only rankings cache')
  .action(async (options) => {
    const { clearCacheCommand } = await import('./commands/clear-cache');
    await clearCacheCommand(options);
  });

program.parse();
