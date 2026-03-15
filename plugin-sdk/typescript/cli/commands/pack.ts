/**
 * Pack Command
 *
 * @description Creates a deterministic distributable directory for a plugin build.
 */

import * as fs from 'fs';
import * as path from 'path';
import { buildCommand } from './build';
import { validateCapabilityContract } from './capability-contract';

interface PackOptions {
  output: string;
  skipBuild: boolean;
}

interface PluginManifest {
  id: string;
  name: string;
  version: string;
  main: string;
}

export async function packCommand(options: PackOptions): Promise<void> {
  const cwd = process.cwd();
  const manifestPath = path.join(cwd, 'plugin.json');

  if (!fs.existsSync(manifestPath)) {
    console.error('❌ No plugin.json found. Are you in a plugin directory?');
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as PluginManifest;
  validateManifest(manifest);

  if (!options.skipBuild) {
    await buildCommand({
      output: 'dist',
      minify: true,
      sourcemap: false,
    });
  }

  const builtMainPath = path.join(cwd, manifest.main);
  if (!fs.existsSync(builtMainPath)) {
    console.error(`❌ Built entry point not found: ${manifest.main}`);
    console.error('   Run `cognia-plugin build` first or omit --skip-build.');
    process.exit(1);
  }

  const packageRoot = path.join(cwd, options.output, `${manifest.id}-${manifest.version}`);
  if (fs.existsSync(packageRoot)) {
    fs.rmSync(packageRoot, { recursive: true, force: true });
  }
  fs.mkdirSync(packageRoot, { recursive: true });

  // Copy dist bundle and manifest
  const distSource = path.join(cwd, 'dist');
  const distTarget = path.join(packageRoot, 'dist');
  if (fs.existsSync(distSource)) {
    fs.cpSync(distSource, distTarget, { recursive: true });
  } else {
    // Fallback for custom main outside dist
    const fallbackDir = path.join(packageRoot, path.dirname(manifest.main));
    fs.mkdirSync(fallbackDir, { recursive: true });
    fs.copyFileSync(builtMainPath, path.join(packageRoot, manifest.main));
  }
  fs.copyFileSync(manifestPath, path.join(packageRoot, 'plugin.json'));

  const metadata = {
    id: manifest.id,
    version: manifest.version,
    createdAt: new Date().toISOString(),
    files: listFiles(packageRoot),
  };
  fs.writeFileSync(path.join(packageRoot, 'pack-metadata.json'), JSON.stringify(metadata, null, 2));

  console.log(`\n✅ Plugin package created at: ${packageRoot}\n`);
}

function validateManifest(manifest: PluginManifest): void {
  const errors: string[] = [];

  if (!manifest.id) errors.push('Missing required field: id');
  if (!manifest.name) errors.push('Missing required field: name');
  if (!manifest.version || !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(manifest.version)) {
    errors.push('Missing or invalid version field');
  }
  if (!manifest.main) errors.push('Missing required field: main');
  if (!Array.isArray((manifest as PluginManifest & { capabilities?: string[] }).capabilities)) {
    errors.push('Missing required field: capabilities');
  } else {
    const capabilityValidation = validateCapabilityContract(
      (manifest as PluginManifest & { capabilities: string[] }).capabilities,
    );
    errors.push(...capabilityValidation.errors);
    capabilityValidation.warnings.forEach((warning) => console.warn(`   • ${warning}`));
  }

  if (errors.length > 0) {
    console.error('❌ Invalid plugin manifest for packing:');
    for (const error of errors) {
      console.error(`   • ${error}`);
    }
    process.exit(1);
  }
}

function listFiles(root: string): Array<{ path: string; size: number }> {
  const files: Array<{ path: string; size: number }> = [];
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      const stats = fs.statSync(fullPath);
      files.push({
        path: path.relative(root, fullPath).replace(/\\/g, '/'),
        size: stats.size,
      });
    }
  }

  return files.sort((a, b) => a.path.localeCompare(b.path));
}

