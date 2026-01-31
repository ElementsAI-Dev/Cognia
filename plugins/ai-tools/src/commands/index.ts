/**
 * Plugin Commands
 *
 * @description Command palette commands for AI Tools plugin
 */

import { defineCommand } from '@cognia/plugin-sdk';
import type { PluginContext } from '@cognia/plugin-sdk';
import {
  listPricingProviderIds,
  listStatusProviderIds,
} from '../utils/providers';

/**
 * Create all plugin commands
 */
export function createCommands(ctx: PluginContext) {
  return [
    // Scrape Pricing Command
    defineCommand(
      'ai-tools.scrape-pricing',
      'Scrape AI Pricing',
      async () => {
        ctx.logger.info('Scrape AI Pricing command executed');

        // showInputDialog returns string | null per SDK interface
        const value = await ctx.ui.showInputDialog({
          title: 'Scrape AI Pricing',
          message: 'Select provider or leave empty for all providers',
          placeholder: `Provider ID (${listPricingProviderIds().slice(0, 5).join(', ')}...)`,
        });

        // null means cancelled, empty string means all providers
        if (value !== null) {
          ctx.ui.showToast(
            value ? `Scraping ${value}...` : 'Scraping all providers...',
            'info'
          );

          // Trigger the tool via agent
          ctx.events.emit('ai-tools:scrape-pricing', {
            provider: value || undefined,
          });
        }
      },
      {
        description: 'Scrape pricing data from AI providers',
        icon: 'dollar-sign',
      }
    ),

    // Check Status Command
    defineCommand(
      'ai-tools.check-status',
      'Check Provider Status',
      async () => {
        ctx.logger.info('Check Provider Status command executed');

        const value = await ctx.ui.showInputDialog({
          title: 'Check Provider Status',
          message: 'Select provider or leave empty for all providers',
          placeholder: `Provider ID (${listStatusProviderIds().slice(0, 5).join(', ')}...)`,
        });

        if (value !== null) {
          ctx.ui.showToast(
            value ? `Checking ${value}...` : 'Checking all providers...',
            'info'
          );

          ctx.events.emit('ai-tools:check-status', {
            provider: value || undefined,
          });
        }
      },
      {
        description: 'Check health status of AI providers',
        icon: 'activity',
      }
    ),

    // View Rankings Command
    defineCommand(
      'ai-tools.view-rankings',
      'View OpenRouter Rankings',
      async () => {
        ctx.logger.info('View OpenRouter Rankings command executed');

        // showDialog returns unknown per SDK interface, cast appropriately
        const result = await ctx.ui.showDialog({
          title: 'OpenRouter Rankings',
          content: 'Select time range for rankings',
          actions: [
            { label: 'This Week', value: 'week' },
            { label: 'This Month', value: 'month' },
            { label: 'All Time', value: 'all' },
            { label: 'Cancel', value: null },
          ],
        });

        if (result && result !== 'cancel') {
          ctx.ui.showToast(`Fetching ${result} rankings...`, 'info');

          ctx.events.emit('ai-tools:view-rankings', {
            timeRange: result as string,
          });
        }
      },
      {
        description: 'View model rankings from OpenRouter',
        icon: 'bar-chart-2',
      }
    ),

    // View Leaderboard Command
    defineCommand(
      'ai-tools.view-leaderboard',
      'View LMArena Leaderboard',
      async () => {
        ctx.logger.info('View LMArena Leaderboard command executed');

        const result = await ctx.ui.showDialog({
          title: 'LMArena Leaderboard',
          content: 'Select category',
          actions: [
            { label: 'Overall', value: 'overall' },
            { label: 'Coding', value: 'coding' },
            { label: 'Math', value: 'math' },
            { label: 'Creative Writing', value: 'creative_writing' },
            { label: 'All Categories', value: 'all' },
            { label: 'Cancel', value: null },
          ],
        });

        if (result && result !== 'cancel') {
          ctx.ui.showToast(
            result === 'all' ? 'Fetching all categories...' : `Fetching ${result} leaderboard...`,
            'info'
          );

          ctx.events.emit('ai-tools:view-leaderboard', {
            category: result === 'all' ? undefined : result as string,
          });
        }
      },
      {
        description: 'View LMArena chatbot arena leaderboard',
        icon: 'trophy',
      }
    ),

    // Clear Cache Command
    defineCommand(
      'ai-tools.clear-cache',
      'Clear AI Tools Cache',
      async () => {
        ctx.logger.info('Clear AI Tools Cache command executed');

        // showConfirmDialog returns boolean per SDK interface
        const confirmed = await ctx.ui.showConfirmDialog({
          title: 'Clear Cache',
          message: 'Are you sure you want to clear all cached AI tools data?',
          confirmLabel: 'Clear',
          cancelLabel: 'Cancel',
        });

        if (confirmed) {
          ctx.events.emit('ai-tools:clear-cache', {});
          ctx.ui.showToast('AI Tools cache has been cleared', 'success');
        }
      },
      {
        description: 'Clear all cached data from AI Tools',
        icon: 'trash-2',
      }
    ),
  ];
}
