/**
 * Dev Command
 *
 * @description Starts a development server with hot reload for plugin development.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { execSync } from 'child_process';
import { WebSocketServer, WebSocket } from 'ws';
import { watch } from 'chokidar';
import { createDevReloadEvent } from './dev-events';

interface DevOptions {
  port: string;
  open: boolean;
  watch: boolean;
  buildOnChange?: boolean;
}

interface PluginManifest {
  id: string;
  name: string;
  version: string;
  main: string;
}

let wsClients: Set<WebSocket> = new Set();

export async function devCommand(options: DevOptions): Promise<void> {
  const cwd = process.cwd();
  const manifestPath = path.join(cwd, 'plugin.json');

  // Check for plugin.json
  if (!fs.existsSync(manifestPath)) {
    console.error('❌ No plugin.json found. Are you in a plugin directory?');
    console.log('   Run "cognia-plugin init" to initialize a plugin project.');
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

  const port = parseInt(options.port, 10);

  console.log(`\n🔧 Starting development server for: ${manifest.name}\n`);
  console.log(`  Plugin ID: ${manifest.id}`);
  console.log(`  Version: ${manifest.version}`);
  console.log(`  Port: ${port}`);
  console.log('');

  const buildOnChange = options.buildOnChange ?? true;

  // Create HTTP server
  const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Serve plugin files
    const url = req.url || '/';
    let filePath: string;

    if (url === '/' || url === '/manifest') {
      // Serve manifest
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(manifest));
      return;
    }

    if (url === '/bundle' || url === '/index.js') {
      // Serve main bundle
      filePath = path.join(cwd, manifest.main);
    } else {
      // Serve other files
      filePath = path.join(cwd, url);
    }

    // Security check - prevent path traversal
    if (!filePath.startsWith(cwd)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath);
    const contentType = getContentType(ext);
    const content = fs.readFileSync(filePath);

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });

  // Create WebSocket server for hot reload
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    wsClients.add(ws);
    console.log('🔌 Client connected');

    ws.on('close', () => {
      wsClients.delete(ws);
      console.log('🔌 Client disconnected');
    });
  });

  // Start file watcher
  if (options.watch) {
    const watcher = watch([
      path.join(cwd, '**/*.ts'),
      path.join(cwd, '**/*.tsx'),
      path.join(cwd, '**/*.js'),
      path.join(cwd, '**/*.jsx'),
      path.join(cwd, '**/*.json'),
    ], {
      ignored: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.git/**',
      ],
      persistent: true,
    });

    watcher.on('change', (filePath: string) => {
      console.log(`📝 File changed: ${path.relative(cwd, filePath)}`);
      const buildResult = buildOnChange ? buildPluginBundle(cwd) : { ok: true };
      notifyClients(createDevReloadEvent(manifest, buildResult, filePath));
    });

    watcher.on('add', (filePath: string) => {
      console.log(`➕ File added: ${path.relative(cwd, filePath)}`);
      const buildResult = buildOnChange ? buildPluginBundle(cwd) : { ok: true };
      notifyClients(createDevReloadEvent(manifest, buildResult, filePath));
    });

    watcher.on('unlink', (filePath: string) => {
      console.log(`➖ File removed: ${path.relative(cwd, filePath)}`);
      const buildResult = buildOnChange ? buildPluginBundle(cwd) : { ok: true };
      notifyClients(createDevReloadEvent(manifest, buildResult, filePath));
    });

    console.log('👀 Watching for file changes...');
  }

  // Start server
  server.listen(port, () => {
    console.log(`\n✅ Development server running at:`);
    console.log(`   http://localhost:${port}`);
    console.log(`   ws://localhost:${port} (hot reload)\n`);
    console.log('Press Ctrl+C to stop.\n');
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    wss.close();
    server.close();
    process.exit(0);
  });
}

function buildPluginBundle(cwd: string): { ok: boolean; error?: string } {
  try {
    const hasTsupConfig = fs.existsSync(path.join(cwd, 'tsup.config.ts'));
    if (hasTsupConfig) {
      execSync('npx tsup', { cwd, stdio: 'pipe' });
      return { ok: true };
    }

    const hasPackageJson = fs.existsSync(path.join(cwd, 'package.json'));
    if (hasPackageJson) {
      const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8')) as {
        scripts?: Record<string, string>;
      };
      if (pkg.scripts?.build) {
        execSync('npm run build --silent', { cwd, stdio: 'pipe' });
        return { ok: true };
      }
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function notifyClients(event: unknown): void {
  const message = JSON.stringify(event);
  wsClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function getContentType(ext: string): string {
  const types: Record<string, string> = {
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.ts': 'application/typescript',
    '.tsx': 'application/typescript',
    '.json': 'application/json',
    '.html': 'text/html',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
  };
  return types[ext] || 'application/octet-stream';
}
