/**
 * Scrape Command
 *
 * @description CLI command to scrape AI model pricing from providers.
 */

import * as fs from 'fs';
import * as path from 'path';
import { listPricingProviderIds, getPricingProviderConfig } from '../../utils/providers';
import type { PricingProviderConfig } from '../../types';

interface ScrapeOptions {
  region: 'US' | 'CN' | 'all';
  output: string;
  format: 'json' | 'csv' | 'markdown';
  cache: boolean;
}

export async function scrapeCommand(
  providers: string[],
  options: ScrapeOptions
): Promise<void> {
  console.log('\n🔍 AI Tools - Pricing Scraper\n');

  // Get provider list
  let providerIds = providers.length > 0 ? providers : listPricingProviderIds();

  // Filter by region if specified
  if (options.region !== 'all') {
    providerIds = providerIds.filter((id) => {
      const config = getPricingProvider(id);
      return config?.region === options.region;
    });
  }

  if (providerIds.length === 0) {
    console.error('❌ No providers found matching criteria');
    process.exit(1);
  }

  console.log(`📋 Providers to scrape: ${providerIds.join(', ')}`);
  console.log(`📁 Output directory: ${options.output}`);
  console.log(`📄 Format: ${options.format}`);
  console.log(`🔄 Cache: ${options.cache ? 'enabled' : 'disabled'}\n`);

  // Ensure output directory exists
  const outputDir = path.resolve(options.output);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const results: Array<{ provider: string; success: boolean; error?: string }> = [];
  const startTime = Date.now();

  for (const providerId of providerIds) {
    const config = getPricingProvider(providerId);
    if (!config) {
      results.push({ provider: providerId, success: false, error: 'Config not found' });
      continue;
    }

    console.log(`⏳ Scraping ${config.name}...`);

    try {
      // Note: In CLI mode, we call the scraper directly without plugin context
      // This is a simplified version - full implementation would use the actual scraper
      const result = await scrapePricing(config, options);

      if (result.success) {
        const outputPath = path.join(outputDir, `${providerId}.${options.format}`);
        await writeOutput(outputPath, result.data, options.format);
        console.log(`✅ ${config.name} - saved to ${outputPath}`);
        results.push({ provider: providerId, success: true });
      } else {
        console.log(`❌ ${config.name} - ${result.error}`);
        results.push({ provider: providerId, success: false, error: result.error });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`❌ ${config.name} - ${errorMsg}`);
      results.push({ provider: providerId, success: false, error: errorMsg });
    }
  }

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  console.log('\n📊 Summary:');
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   ⏱️  Duration: ${duration}s\n`);

  if (failCount > 0) {
    process.exit(1);
  }
}

async function scrapePricing(
  config: PricingProviderConfig,
  _options: ScrapeOptions
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  // Simplified scraping logic for CLI
  // In production, this would use the full scraper implementation
  try {
    // For API-based providers, we can fetch directly
    if (config.type === 'api') {
      const response = await fetch(config.urls[0], {
        headers: { 'User-Agent': 'AI-Tools-CLI/1.0' },
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }

      const data = await response.json();
      return { success: true, data };
    }

    // For scraper-based providers, we need browser automation
    // This would require playwright which is a heavy dependency
    return {
      success: false,
      error: 'Browser-based scraping not supported in CLI mode. Use the plugin UI instead.',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function writeOutput(
  filePath: string,
  data: unknown,
  format: 'json' | 'csv' | 'markdown'
): Promise<void> {
  let content: string;

  switch (format) {
    case 'json':
      content = JSON.stringify(data, null, 2);
      break;
    case 'csv':
      content = convertToCSV(data);
      break;
    case 'markdown':
      content = convertToMarkdown(data);
      break;
  }

  fs.writeFileSync(filePath, content, 'utf-8');
}

function convertToCSV(data: unknown): string {
  if (!Array.isArray(data)) {
    return JSON.stringify(data);
  }

  if (data.length === 0) return '';

  const headers = Object.keys(data[0] as Record<string, unknown>);
  const rows = data.map((item) =>
    headers.map((h) => {
      const val = (item as Record<string, unknown>)[h];
      return typeof val === 'string' && val.includes(',') ? `"${val}"` : String(val ?? '');
    }).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

function convertToMarkdown(data: unknown): string {
  if (!Array.isArray(data)) {
    return '```json\n' + JSON.stringify(data, null, 2) + '\n```';
  }

  if (data.length === 0) return 'No data';

  const headers = Object.keys(data[0] as Record<string, unknown>);
  const headerRow = '| ' + headers.join(' | ') + ' |';
  const separator = '| ' + headers.map(() => '---').join(' | ') + ' |';
  const rows = data.map((item) =>
    '| ' + headers.map((h) => String((item as Record<string, unknown>)[h] ?? '')).join(' | ') + ' |'
  );

  return [headerRow, separator, ...rows].join('\n');
}
