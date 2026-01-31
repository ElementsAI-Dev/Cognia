/**
 * Provider Status Checker Tool
 *
 * @description Agent-callable tool for checking AI provider health and availability
 */

import { tool } from '@cognia/plugin-sdk';
import type { PluginContext, PluginToolContext } from '@cognia/plugin-sdk';
import type {
  StatusToolParams,
  StatusToolResult,
  StatusReport,
  ProviderCheckResult,
  CheckResult,
  ProviderStatus,
  StatusProviderConfig,
} from '../types';
import {
  getStatusProvider,
  getStatusProvidersByRegion,
  getAllStatusProviders,
  listStatusProviderIds,
} from '../utils/providers';
import { saveStatusReport } from '../utils/output';
import { getConfigValue } from '../types/config';

const DEFAULT_RETRIES = 2;

/**
 * Get timeout from context config
 */
function getTimeout(ctx: PluginContext): number {
  return getConfigValue(ctx.config, 'defaultTimeout');
}

/**
 * Check a single endpoint
 */
async function checkEndpoint(
  ctx: PluginContext,
  config: StatusProviderConfig,
  endpoint: { name: string; url: string; type: string; method?: string; timeout?: number }
): Promise<CheckResult> {
  const startTime = Date.now();

  try {
    const response = await ctx.network.fetch<unknown>(endpoint.url, {
      method: (endpoint.method as 'GET' | 'POST' | 'HEAD') || 'GET',
      timeout: endpoint.timeout || getTimeout(ctx),
      headers: {
        'User-Agent': 'Cognia-AI-Tools/1.0',
      },
    });

    const responseTime = Date.now() - startTime;
    const status: ProviderStatus = response.ok ? 'operational' : response.status >= 500 ? 'down' : 'degraded';

    return {
      provider: config.id,
      endpoint: endpoint.name,
      status,
      responseTime,
      statusCode: response.status,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    return {
      provider: config.id,
      endpoint: endpoint.name,
      status: 'down',
      responseTime,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Check a single provider
 */
async function checkProvider(
  ctx: PluginContext,
  config: StatusProviderConfig,
  retries: number = DEFAULT_RETRIES
): Promise<ProviderCheckResult> {
  ctx.logger.info(`Checking status of ${config.name}...`);

  const checks: CheckResult[] = [];

  for (const endpoint of config.endpoints) {
    let result: CheckResult | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      result = await checkEndpoint(ctx, config, endpoint);

      if (result.status === 'operational') {
        break;
      }

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (result) {
      checks.push(result);
    }
  }

  // Calculate overall status
  const statusCounts = {
    operational: checks.filter((c) => c.status === 'operational').length,
    degraded: checks.filter((c) => c.status === 'degraded').length,
    down: checks.filter((c) => c.status === 'down').length,
  };

  let overallStatus: ProviderStatus;
  if (statusCounts.down === checks.length) {
    overallStatus = 'down';
  } else if (statusCounts.operational === checks.length) {
    overallStatus = 'operational';
  } else if (statusCounts.down > 0 || statusCounts.degraded > 0) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'unknown';
  }

  // Calculate averages
  const totalResponseTime = checks.reduce((sum, c) => sum + c.responseTime, 0);
  const avgResponseTime = checks.length > 0 ? Math.round(totalResponseTime / checks.length) : 0;
  const successRate = checks.length > 0 ? (statusCounts.operational / checks.length) * 100 : 0;

  return {
    provider: config.id,
    name: config.name,
    region: config.region,
    overallStatus,
    checks,
    avgResponseTime,
    successRate,
    timestamp: new Date().toISOString(),
    statusPageUrl: config.statusPage,
  };
}

/**
 * Create the status tool definition
 */
export function createStatusTool(ctx: PluginContext) {
  return tool<StatusToolParams>({
    name: 'provider_status_checker',
    description: `Check health and availability status of AI model providers.
    
Supported providers:
- US: OpenAI, Anthropic, Google, Mistral, Cohere, Groq, Together
- CN: DeepSeek, Zhipu, Moonshot, Qwen

Parameters:
- provider: Specific provider ID to check (optional)
- region: Filter by region 'US', 'CN', or 'EU' (optional)
- timeout: Request timeout in milliseconds (default: 10000)

Returns status information including:
- Overall status (operational, degraded, down, unknown)
- Response times
- Success rates
- Individual endpoint check results`,
    parameters: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          description: `Provider ID to check. Available: ${listStatusProviderIds().join(', ')}`,
        },
        region: {
          type: 'string',
          enum: ['US', 'CN', 'EU'],
          description: 'Filter providers by region',
        },
        timeout: {
          type: 'integer',
          description: 'Request timeout in milliseconds',
          minimum: 1000,
          maximum: 60000,
        },
      },
    },
    execute: async (params: StatusToolParams, toolCtx?: PluginToolContext): Promise<StatusToolResult> => {
      try {
        if (toolCtx?.reportProgress) {
          toolCtx.reportProgress(0, 'Starting status check...');
        }

        // Single provider check
        if (params.provider) {
          const config = getStatusProvider(params.provider);
          if (!config) {
            return {
              success: false,
              error: `Unknown provider: ${params.provider}. Available: ${listStatusProviderIds().join(', ')}`,
              timestamp: new Date().toISOString(),
            };
          }

          const result = await checkProvider(ctx, config);

          return {
            success: true,
            provider: result,
            timestamp: new Date().toISOString(),
          };
        }

        // Multiple providers check
        const providers = params.region
          ? getStatusProvidersByRegion(params.region)
          : getAllStatusProviders();

        if (providers.length === 0) {
          return {
            success: false,
            error: 'No providers match the criteria',
            timestamp: new Date().toISOString(),
          };
        }

        const report: StatusReport = {
          generated_at: new Date().toISOString(),
          total_providers: providers.length,
          summary: {
            operational: 0,
            degraded: 0,
            down: 0,
            unknown: 0,
          },
          providers: [],
        };

        let completed = 0;
        for (const config of providers) {
          if (toolCtx?.reportProgress) {
            toolCtx.reportProgress(
              Math.round((completed / providers.length) * 100),
              `Checking ${config.name}...`
            );
          }

          const result = await checkProvider(ctx, config);
          report.providers.push(result);
          report.summary[result.overallStatus]++;

          completed++;
        }

        // Save report
        await saveStatusReport(ctx, report);

        if (toolCtx?.reportProgress) {
          toolCtx.reportProgress(100, 'Status check complete');
        }

        return {
          success: true,
          data: report,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        ctx.logger.error(`Status tool error: ${error}`);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        };
      }
    },
    category: 'ai-tools',
    requiresApproval: false,
  });
}
