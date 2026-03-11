#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const outputPath = process.env.READINESS_REPORT_PATH ||
  path.join(process.cwd(), 'artifacts', 'plugin-sdk-readiness-report.json');

const checks = [
  {
    id: 'host-plugin-contract-tests',
    command: 'pnpm',
    args: [
      'exec',
      'jest',
      'lib/plugin/core/compatibility.test.ts',
      'lib/plugin/core/validation.test.ts',
      'lib/plugin/core/manager.test.ts',
      'lib/plugin/devtools/dev-server.test.ts',
      'lib/plugin/conformance/plugin-lifecycle-conformance.test.ts',
      '--runInBand',
    ],
  },
  {
    id: 'typescript-sdk-cli-tests',
    command: 'pnpm',
    args: [
      'exec',
      'jest',
      'plugin-sdk/typescript/cli/commands/build.test.ts',
      'plugin-sdk/typescript/cli/commands/create.test.ts',
      'plugin-sdk/typescript/cli/commands/init.test.ts',
      'plugin-sdk/typescript/cli/commands/pack.test.ts',
      '--runInBand',
    ],
  },
  {
    id: 'docs-command-smoke',
    command: 'node',
    args: ['scripts/verify-plugin-sdk-doc-commands.mjs'],
  },
  {
    id: 'plugin-point-contract-audit',
    command: 'pnpm',
    args: ['audit:plugin-points'],
  },
  {
    id: 'plugin-point-parity-check',
    command: 'pnpm',
    args: ['check:plugin-point-parity'],
  },
  {
    id: 'python-sdk-cli-tests',
    command: 'python',
    args: ['-m', 'pytest', 'plugin-sdk/python/tests/test_cli.py', '-q'],
  },
  {
    id: 'python-scaffold-pack-flow',
    command: 'python',
    args: ['scripts/python-plugin-example-flow-check.py'],
  },
];

function runCheck(check) {
  const startedAt = Date.now();
  const result = spawnSync(check.command, check.args, {
    cwd: process.cwd(),
    shell: process.platform === 'win32',
    encoding: 'utf-8',
    env: process.env,
  });

  const completedAt = Date.now();
  return {
    id: check.id,
    command: `${check.command} ${check.args.join(' ')}`,
    passed: result.status === 0,
    exitCode: result.status ?? -1,
    durationMs: completedAt - startedAt,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

const started = new Date().toISOString();
const results = checks.map(runCheck);
const passed = results.every((entry) => entry.passed);

const report = {
  startedAt: started,
  completedAt: new Date().toISOString(),
  passed,
  checks: results,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');

console.log(`Readiness report written to ${outputPath}`);
for (const check of results) {
  console.log(`${check.passed ? 'PASS' : 'FAIL'} ${check.id} (${check.durationMs}ms)`);
}

if (!passed) {
  console.error('Plugin SDK readiness gate failed. See report for details.');
  process.exit(1);
}
