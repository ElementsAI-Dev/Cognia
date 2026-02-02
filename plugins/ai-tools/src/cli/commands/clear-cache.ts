/**
 * Clear Cache Command
 *
 * @description CLI command to clear cached AI Tools data.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface ClearCacheOptions {
  pricing?: boolean;
  status?: boolean;
  rankings?: boolean;
}

const CACHE_DIR = path.join(os.homedir(), '.cognia', 'plugins', 'ai-tools', 'cache');

export async function clearCacheCommand(options: ClearCacheOptions): Promise<void> {
  console.log('\n🗑️  AI Tools - Clear Cache\n');

  // Check if any specific cache type is selected
  const clearAll = !options.pricing && !options.status && !options.rankings;

  if (!fs.existsSync(CACHE_DIR)) {
    console.log('ℹ️  No cache directory found. Nothing to clear.\n');
    return;
  }

  const cacheTypes: Array<{ name: string; pattern: string; flag: boolean | undefined }> = [
    { name: 'Pricing', pattern: 'pricing-*.json', flag: options.pricing },
    { name: 'Status', pattern: 'status-*.json', flag: options.status },
    { name: 'Rankings', pattern: 'rankings-*.json', flag: options.rankings },
  ];

  let totalCleared = 0;
  let totalSize = 0;

  for (const { name, pattern, flag } of cacheTypes) {
    if (!clearAll && !flag) continue;

    const files = findCacheFiles(pattern);

    if (files.length === 0) {
      console.log(`  ${name}: No cached files`);
      continue;
    }

    let cleared = 0;
    let size = 0;

    for (const file of files) {
      try {
        const stats = fs.statSync(file);
        size += stats.size;
        fs.unlinkSync(file);
        cleared++;
      } catch {
        // Ignore individual file errors
      }
    }

    console.log(`  ✅ ${name}: Cleared ${cleared} file(s) (${formatBytes(size)})`);
    totalCleared += cleared;
    totalSize += size;
  }

  if (totalCleared === 0) {
    console.log('ℹ️  No cache files to clear.\n');
  } else {
    console.log(`\n📊 Total: ${totalCleared} file(s) cleared (${formatBytes(totalSize)})\n`);
  }
}

function findCacheFiles(pattern: string): string[] {
  if (!fs.existsSync(CACHE_DIR)) return [];

  const files: string[] = [];
  const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');

  try {
    const entries = fs.readdirSync(CACHE_DIR);
    for (const entry of entries) {
      if (regex.test(entry)) {
        files.push(path.join(CACHE_DIR, entry));
      }
    }
  } catch {
    // Ignore directory read errors
  }

  return files;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
