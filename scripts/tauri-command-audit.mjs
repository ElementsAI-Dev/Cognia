#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const libRsPath = path.join(repoRoot, 'src-tauri', 'src', 'lib.rs');

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function extractGenerateHandlerContent(source) {
  const marker = 'tauri::generate_handler![';
  const start = source.indexOf(marker);
  if (start === -1) return null;

  let i = start + marker.length;
  let depth = 1;
  while (i < source.length && depth > 0) {
    const ch = source[i];
    if (ch === '[') depth += 1;
    if (ch === ']') depth -= 1;
    i += 1;
  }
  if (depth !== 0) return null;

  return source.slice(start + marker.length, i - 1);
}

function extractRegisteredCommands(content) {
  const commands = new Set();
  if (!content) return commands;

  const withoutComments = content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  const re = /([A-Za-z_][A-Za-z0-9_:]*)\s*,/g;
  for (const match of withoutComments.matchAll(re)) {
    const full = match[1];
    if (!full.includes('::')) continue;
    const name = full.split('::').pop();
    if (name) commands.add(name);
  }
  return commands;
}

const SCAN_DIRS = ['app', 'components', 'hooks', 'lib', 'stores'];
const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  'plugin-sdk',
  'src-tauri',
  '.git',
]);
const SCAN_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

function walk(dirPath, out) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, out);
      continue;
    }
    const ext = path.extname(entry.name);
    if (!SCAN_EXTS.has(ext)) continue;
    if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) continue;
    out.push(fullPath);
  }
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1');
}

function extractInvokedCommands(source) {
  const commands = [];
  const cleaned = stripComments(source);
  const re = /\binvoke(?:\s*<[\s\S]*?>)?\s*\(\s*['"`]([^'"`]+)['"`]/g;
  for (const match of cleaned.matchAll(re)) {
    commands.push(match[1]);
  }
  return commands;
}

const libSource = readFileSafe(libRsPath);
const handlerContent = extractGenerateHandlerContent(libSource);
if (!handlerContent) {
  console.error('Failed to parse generate_handler![] from src-tauri/src/lib.rs');
  process.exit(2);
}

const registered = extractRegisteredCommands(handlerContent);

const files = [];
for (const dir of SCAN_DIRS) {
  walk(path.join(repoRoot, dir), files);
}

const invokedMap = new Map();
for (const filePath of files) {
  const rel = path.relative(repoRoot, filePath).replace(/\\/g, '/');
  const source = readFileSafe(filePath);
  const cmds = extractInvokedCommands(source);
  for (const cmd of cmds) {
    if (!invokedMap.has(cmd)) invokedMap.set(cmd, new Set());
    invokedMap.get(cmd).add(rel);
  }
}

const invoked = new Set(invokedMap.keys());
const missing = [...invoked].filter((cmd) => !registered.has(cmd)).sort();

console.log(`registered commands: ${registered.size}`);
console.log(`invoked commands: ${invoked.size}`);
console.log(`missing commands: ${missing.length}`);

if (missing.length > 0) {
  console.log('--- missing command details ---');
  for (const cmd of missing) {
    const locations = [...(invokedMap.get(cmd) || [])].sort();
    console.log(`${cmd}`);
    for (const file of locations) {
      console.log(`  - ${file}`);
    }
  }
  process.exit(1);
}

process.exit(0);
