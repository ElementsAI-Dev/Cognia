/**
 * AI Tools Plugin
 *
 * @description Cognia plugin for AI model pricing, status monitoring, and rankings tools.
 *
 * This plugin provides:
 * - ai_pricing_scraper: Scrape AI model pricing from various providers
 * - provider_status_checker: Check health and availability of AI providers
 * - openrouter_rankings: Get model rankings from OpenRouter
 * - lmarena_leaderboard: Get LMArena chatbot arena leaderboard
 */

import { definePlugin } from '@cognia/plugin-sdk';
import type { PluginContext, PluginHooksAll } from '@cognia/plugin-sdk';
import { createPricingTool, createStatusTool, createRankingsTool, createLMArenaTool } from './tools';
import { createCommands } from './commands';
import { clearCache } from './utils/output';
import { parseConfig, type AIToolsConfig } from './types';

// Plugin state
let currentConfig: AIToolsConfig;
const eventCleanups: Array<() => void> = [];

export default definePlugin({
  activate(context: PluginContext): PluginHooksAll | void {
    context.logger.info('AI Tools plugin activated');

    // Parse and store config
    currentConfig = parseConfig(context.config);
    context.logger.info('Config loaded:', currentConfig);

    // Register tools
    const pricingTool = createPricingTool(context);
    const statusTool = createStatusTool(context);
    const rankingsTool = createRankingsTool(context);
    const lmarenaTool = createLMArenaTool(context);

    context.agent.registerTool({
      name: pricingTool.name,
      pluginId: context.pluginId,
      definition: pricingTool,
      execute: pricingTool.execute,
    });

    context.agent.registerTool({
      name: statusTool.name,
      pluginId: context.pluginId,
      definition: statusTool,
      execute: statusTool.execute,
    });

    context.agent.registerTool({
      name: rankingsTool.name,
      pluginId: context.pluginId,
      definition: rankingsTool,
      execute: rankingsTool.execute,
    });

    context.agent.registerTool({
      name: lmarenaTool.name,
      pluginId: context.pluginId,
      definition: lmarenaTool,
      execute: lmarenaTool.execute,
    });

    context.logger.info('Registered 4 AI tools');

    // Register commands
    const commands = createCommands(context);
    context.logger.info(`Registered ${commands.length} commands`);

    // Event listeners for commands (store unsubscribe functions for cleanup)
    eventCleanups.push(context.events.on('ai-tools:scrape-pricing', async (params) => {
      context.logger.info('Executing scrape-pricing via event', params);
      try {
        const result = await pricingTool.execute(params as Parameters<typeof pricingTool.execute>[0]);
        context.events.emit('ai-tools:pricing-result', result);
      } catch (error) {
        context.logger.error('Pricing scrape failed:', error);
      }
    }));

    eventCleanups.push(context.events.on('ai-tools:check-status', async (params) => {
      context.logger.info('Executing check-status via event', params);
      try {
        const result = await statusTool.execute(params as Parameters<typeof statusTool.execute>[0]);
        context.events.emit('ai-tools:status-result', result);
      } catch (error) {
        context.logger.error('Status check failed:', error);
      }
    }));

    eventCleanups.push(context.events.on('ai-tools:view-rankings', async (params) => {
      context.logger.info('Executing view-rankings via event', params);
      try {
        const result = await rankingsTool.execute(params as Parameters<typeof rankingsTool.execute>[0]);
        context.events.emit('ai-tools:rankings-result', result);
      } catch (error) {
        context.logger.error('Rankings fetch failed:', error);
      }
    }));

    eventCleanups.push(context.events.on('ai-tools:view-leaderboard', async (params) => {
      context.logger.info('Executing view-leaderboard via event', params);
      try {
        const result = await lmarenaTool.execute(params as Parameters<typeof lmarenaTool.execute>[0]);
        context.events.emit('ai-tools:leaderboard-result', result);
      } catch (error) {
        context.logger.error('Leaderboard fetch failed:', error);
      }
    }));

    eventCleanups.push(context.events.on('ai-tools:clear-cache', async () => {
      context.logger.info('Clearing AI Tools cache');
      try {
        await clearCache(context);
        context.logger.info('Cache cleared successfully');
      } catch (error) {
        context.logger.error('Failed to clear cache:', error);
      }
    }));

    // Return hooks
    return {
      onEnable: async () => {
        context.logger.info('AI Tools plugin enabled');
      },

      onDisable: async () => {
        context.logger.info('AI Tools plugin disabled');
      },

      onConfigChange: (config: Record<string, unknown>) => {
        context.logger.info('Config changed, updating...');
        currentConfig = parseConfig(config);
        context.logger.info('Config updated:', currentConfig);
      },

      onCommand: (commandId: string) => {
        const command = commands.find((c) => c.id === commandId);
        if (command) {
          command.execute();
          return true;
        }
        return false;
      },
    };
  },

  deactivate() {
    for (const cleanup of eventCleanups) {
      cleanup();
    }
    eventCleanups.length = 0;
  },
});

/**
 * Get current plugin configuration
 */
export function getConfig(): AIToolsConfig {
  return currentConfig;
}

// Re-export types for external use
export * from './types';
export * from './utils/providers';
