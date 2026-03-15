import fs from 'node:fs';
import path from 'node:path';
import { validatePluginManifest } from '@/lib/plugin/core/validation';
import type { PluginManifest } from '@/types/plugin';

function collectPluginJsonFiles(): string[] {
  const repoRoot = path.resolve(__dirname, '..', '..', '..');
  const roots = [
    path.join(repoRoot, 'plugins'),
    path.join(repoRoot, 'plugin-sdk', 'examples'),
    path.join(repoRoot, 'plugin-sdk', 'python', 'examples'),
  ];

  const results: string[] = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const stack = [root];
    while (stack.length > 0) {
      const current = stack.pop()!;
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const fullPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(fullPath);
          continue;
        }
        if (entry.name === 'plugin.json') {
          results.push(fullPath);
        }
      }
    }
  }

  return results.sort();
}

describe('plugin manifest smoke', () => {
  it.each(collectPluginJsonFiles())('validates %s against current host contract', (manifestPath) => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as PluginManifest;
    const result = validatePluginManifest(manifest, { governanceMode: 'warn' });

    if (!result.valid) {
      throw new Error(`${manifestPath}: ${JSON.stringify(result.diagnostics, null, 2)}`);
    }
    expect(result.diagnostics?.filter((entry) => entry.severity === 'error')).toEqual([]);
  });
});
