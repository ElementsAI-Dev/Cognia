#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function assertIncludes(content, needle, context) {
  if (!content.includes(needle)) {
    throw new Error(`Missing "${needle}" in ${context}`);
  }
}

function read(filePath) {
  return fs.readFileSync(path.join(process.cwd(), filePath), 'utf-8');
}

const tsCliSource = read('plugin-sdk/typescript/cli/index.ts');
const tsReadme = read('plugin-sdk/typescript/README.md');
const pyCliSource = read('plugin-sdk/python/src/cognia/cli.py');
const pyReadme = read('plugin-sdk/python/README.md');

const tsCommands = ['create', 'init', 'dev', 'build', 'pack', 'validate'];
for (const command of tsCommands) {
  assertIncludes(tsCliSource, `.command('${command}`, 'plugin-sdk/typescript/cli/index.ts');
}

const tsReadmeCommands = ['npm run dev', 'npm run build', 'npm run pack', 'npm run validate'];
for (const command of tsReadmeCommands) {
  assertIncludes(tsReadme, command, 'plugin-sdk/typescript/README.md');
}

const pyCommands = ['new', 'manifest', 'test', 'pack', 'dev', 'version'];
for (const command of pyCommands) {
  assertIncludes(pyCliSource, `add_parser("${command}"`, 'plugin-sdk/python/src/cognia/cli.py');
}

const pyReadmeCommands = ['cognia new', 'cognia manifest', 'cognia test', 'cognia pack', 'cognia dev'];
for (const command of pyReadmeCommands) {
  assertIncludes(pyReadme, command, 'plugin-sdk/python/README.md');
}

console.log('Plugin SDK docs-to-command verification passed.');
