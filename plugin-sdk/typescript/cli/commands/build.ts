/**
 * Build Command
 *
 * @description Builds the plugin for production.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface BuildOptions {
  output: string;
  minify: boolean;
  sourcemap: boolean;
}

interface PluginManifest {
  id: string;
  name: string;
  version: string;
  main: string;
}

export async function buildCommand(options: BuildOptions): Promise<void> {
  const cwd = process.cwd();
  const manifestPath = path.join(cwd, 'plugin.json');

  // Check for plugin.json
  if (!fs.existsSync(manifestPath)) {
    console.error('❌ No plugin.json found. Are you in a plugin directory?');
    process.exit(1);
  }

  // Load manifest
  let manifest: PluginManifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch (error) {
    console.error('❌ Failed to parse plugin.json:', error);
    process.exit(1);
  }

  console.log(`\n🔨 Building plugin: ${manifest.name}\n`);
  console.log(`  Output: ${options.output}`);
  console.log(`  Minify: ${options.minify}`);
  console.log(`  Sourcemap: ${options.sourcemap}`);
  console.log('');

  const startTime = Date.now();
  const outputDir = path.join(cwd, options.output);

  // Clean output directory
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true });
  }
  fs.mkdirSync(outputDir, { recursive: true });

  // Determine entry point
  const entryPoints = ['index.ts', 'index.tsx', 'index.js', 'index.jsx', 'src/index.ts', 'src/index.tsx'];
  let entryPoint: string | null = null;

  for (const entry of entryPoints) {
    const fullPath = path.join(cwd, entry);
    if (fs.existsSync(fullPath)) {
      entryPoint = entry;
      break;
    }
  }

  if (!entryPoint) {
    console.error('❌ No entry point found. Expected one of:', entryPoints.join(', '));
    process.exit(1);
  }

  console.log(`📦 Entry point: ${entryPoint}`);

  // Check for tsup or esbuild
  const hastsup = fs.existsSync(path.join(cwd, 'node_modules', 'tsup'));
  const hasEsbuild = fs.existsSync(path.join(cwd, 'node_modules', 'esbuild'));

  try {
    if (hastsup) {
      // Use tsup for building
      const tsupArgs = [
        entryPoint,
        '--format', 'esm',
        '--out-dir', options.output,
        '--dts',
        options.minify ? '--minify' : '',
        options.sourcemap ? '--sourcemap' : '',
        '--external', 'react',
        '--external', '@cognia/plugin-sdk',
      ].filter(Boolean).join(' ');

      console.log('🔧 Building with tsup...');
      execSync(`npx tsup ${tsupArgs}`, { cwd, stdio: 'inherit' });
    } else if (hasEsbuild) {
      // Use esbuild directly
      const esbuildArgs = [
        entryPoint,
        '--bundle',
        '--format=esm',
        `--outdir=${options.output}`,
        options.minify ? '--minify' : '',
        options.sourcemap ? '--sourcemap' : '',
        '--external:react',
        '--external:@cognia/plugin-sdk',
        '--platform=browser',
        '--target=es2020',
      ].filter(Boolean).join(' ');

      console.log('🔧 Building with esbuild...');
      execSync(`npx esbuild ${esbuildArgs}`, { cwd, stdio: 'inherit' });
    } else {
      // Fall back to TypeScript compiler
      console.log('🔧 Building with tsc...');
      execSync('npx tsc', { cwd, stdio: 'inherit' });
    }
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }

  // Copy plugin.json to output
  const outputManifest = { ...manifest };
  outputManifest.main = 'index.js';
  fs.writeFileSync(
    path.join(outputDir, 'plugin.json'),
    JSON.stringify(outputManifest, null, 2)
  );

  // Calculate bundle size
  const bundlePath = path.join(outputDir, 'index.js');
  if (fs.existsSync(bundlePath)) {
    const stats = fs.statSync(bundlePath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`\n📊 Bundle size: ${sizeKB} KB`);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✅ Build completed in ${duration}s`);
  console.log(`   Output: ${outputDir}\n`);
}
