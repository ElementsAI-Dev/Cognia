#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('node:fs');
const path = require('node:path');

const canvasSpecPath = path.resolve(__dirname, '../e2e/features/canvas.spec.ts');

if (!fs.existsSync(canvasSpecPath)) {
  console.error(`[canvas-e2e-quality] Missing spec file: ${canvasSpecPath}`);
  process.exit(1);
}

const specSource = fs.readFileSync(canvasSpecPath, 'utf8');

const checks = [
  {
    id: 'logical-or-true',
    regex: /\|\|\s*true/g,
    message: 'Found `|| true` fallback. Remove unconditional pass-through logic.',
  },
  {
    id: 'logical-nullish-true',
    regex: /\?\?\s*true/g,
    message: 'Found `?? true` fallback. Remove unconditional pass-through logic.',
  },
  {
    id: 'literal-true-expectation',
    regex: /expect(?:\.soft)?\(\s*true\s*\)\.(?:toBe|toEqual)\(\s*true\s*\)/g,
    message: 'Found literal `expect(true).toBe(true)` assertion with no behavioral signal.',
  },
];

const violations = checks.flatMap((check) => {
  const matches = Array.from(specSource.matchAll(check.regex));
  return matches.map((match) => ({
    id: check.id,
    index: match.index ?? -1,
    message: check.message,
  }));
});

if (violations.length > 0) {
  console.error('[canvas-e2e-quality] Validation failed for e2e/features/canvas.spec.ts');
  violations.forEach((violation, i) => {
    console.error(`  ${i + 1}. [${violation.id}] ${violation.message} (index ${violation.index})`);
  });
  process.exit(1);
}

console.log('[canvas-e2e-quality] Passed');
