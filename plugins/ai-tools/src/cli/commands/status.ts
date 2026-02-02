/**
 * Status Command
 *
 * @description CLI command to check health status of AI providers.
 */

import { listStatusProviderIds, getStatusProvider } from '../../utils/providers';
import type { ProviderStatus, CheckResult } from '../../types';

interface StatusOptions {
  region: 'US' | 'CN' | 'EU' | 'all';
  timeout: string;
  json: boolean;
}

interface ProviderStatusResult {
  provider: string;
  name: string;
  region: string;
  status: ProviderStatus;
  responseTime: number;
  checks: CheckResult[];
}

export async function statusCommand(
  providers: string[],
  options: StatusOptions
): Promise<void> {
  if (!options.json) {
    console.log('\n🏥 AI Tools - Provider Status Checker\n');
  }

  // Get provider list
  let providerIds = providers.length > 0 ? providers : listStatusProviderIds();

  // Filter by region if specified
  if (options.region !== 'all') {
    providerIds = providerIds.filter((id) => {
      const config = getStatusProvider(id);
      return config?.region === options.region;
    });
  }

  if (providerIds.length === 0) {
    if (options.json) {
      console.log(JSON.stringify({ error: 'No providers found matching criteria' }));
    } else {
      console.error('❌ No providers found matching criteria');
    }
    process.exit(1);
  }

  if (!options.json) {
    console.log(`📋 Checking ${providerIds.length} providers...`);
    console.log(`⏱️  Timeout: ${options.timeout}ms\n`);
  }

  const timeout = parseInt(options.timeout, 10);
  const results: ProviderStatusResult[] = [];

  for (const providerId of providerIds) {
    const config = getStatusProvider(providerId);
    if (!config) continue;

    const result = await checkProviderStatus(providerId, config.name, config.region, timeout);
    results.push(result);

    if (!options.json) {
      const icon = getStatusIcon(result.status);
      const time = result.responseTime > 0 ? `${result.responseTime}ms` : 'N/A';
      console.log(`${icon} ${config.name} (${config.region}) - ${result.status} [${time}]`);
    }
  }

  if (options.json) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      providers: results,
      summary: {
        total: results.length,
        operational: results.filter((r) => r.status === 'operational').length,
        degraded: results.filter((r) => r.status === 'degraded').length,
        down: results.filter((r) => r.status === 'down').length,
        unknown: results.filter((r) => r.status === 'unknown').length,
      },
    }, null, 2));
  } else {
    // Print summary
    const operational = results.filter((r) => r.status === 'operational').length;
    const degraded = results.filter((r) => r.status === 'degraded').length;
    const down = results.filter((r) => r.status === 'down').length;

    console.log('\n📊 Summary:');
    console.log(`   ✅ Operational: ${operational}`);
    console.log(`   ⚠️  Degraded: ${degraded}`);
    console.log(`   ❌ Down: ${down}\n`);
  }
}

async function checkProviderStatus(
  providerId: string,
  name: string,
  region: string,
  timeout: number
): Promise<ProviderStatusResult> {
  const config = getStatusProvider(providerId);
  if (!config) {
    return {
      provider: providerId,
      name,
      region,
      status: 'unknown',
      responseTime: 0,
      checks: [],
    };
  }

  const checks: CheckResult[] = [];
  let totalTime = 0;
  let successCount = 0;

  for (const endpoint of config.endpoints) {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(endpoint.url, {
        method: endpoint.method || 'GET',
        headers: {
          'User-Agent': 'AI-Tools-CLI/1.0',
          ...endpoint.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      totalTime += responseTime;

      const expectedStatus = endpoint.expectedStatus || [200];
      const isSuccess = expectedStatus.includes(response.status);

      checks.push({
        provider: providerId,
        endpoint: endpoint.name,
        status: isSuccess ? 'operational' : 'degraded',
        responseTime,
        statusCode: response.status,
        timestamp: new Date().toISOString(),
      });

      if (isSuccess) successCount++;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      totalTime += responseTime;

      checks.push({
        provider: providerId,
        endpoint: endpoint.name,
        status: 'down',
        responseTime,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Determine overall status
  let status: ProviderStatus;
  if (successCount === checks.length) {
    status = 'operational';
  } else if (successCount > 0) {
    status = 'degraded';
  } else if (checks.length > 0) {
    status = 'down';
  } else {
    status = 'unknown';
  }

  return {
    provider: providerId,
    name,
    region,
    status,
    responseTime: checks.length > 0 ? Math.round(totalTime / checks.length) : 0,
    checks,
  };
}

function getStatusIcon(status: ProviderStatus): string {
  switch (status) {
    case 'operational':
      return '✅';
    case 'degraded':
      return '⚠️';
    case 'down':
      return '❌';
    default:
      return '❓';
  }
}
