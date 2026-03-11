/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const CHANGE_NAME = 'improve-canvas-feature-completeness';
const CHANGE_DIR = path.resolve('openspec', 'changes', CHANGE_NAME);
const TASKS_PATH = path.join(CHANGE_DIR, 'tasks.md');
const SPEC_PATH = path.join(
  CHANGE_DIR,
  'specs',
  'canvas-completeness-assurance',
  'spec.md'
);

function readFileOrThrow(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function collectPriorityTaskViolations(tasksContent) {
  const taskLines = tasksContent
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^- \[[ x]\]/.test(line));

  const priorityLines = taskLines.filter((line) => /\[(P0|P1)\]/.test(line));
  const missingBenchmark = priorityLines.filter((line) => !/BP-\d{2}/.test(line));

  return { priorityLines, missingBenchmark };
}

function collectSpecBenchmarkViolations(specContent) {
  const requirementBlocks = specContent.split(/\n(?=### Requirement:)/g).filter((block) =>
    block.trim().startsWith('### Requirement:')
  );

  const missingPatternRefs = requirementBlocks.filter((block) => !/BP-\d{2}/.test(block));
  return missingPatternRefs;
}

function main() {
  const tasksContent = readFileOrThrow(TASKS_PATH);
  const specContent = readFileOrThrow(SPEC_PATH);

  const { priorityLines, missingBenchmark } = collectPriorityTaskViolations(tasksContent);
  const missingSpecPatternRefs = collectSpecBenchmarkViolations(specContent);

  if (priorityLines.length === 0) {
    throw new Error('No prioritized tasks ([P0]/[P1]) found in tasks.md for traceability validation.');
  }

  if (missingBenchmark.length > 0) {
    throw new Error(
      `Prioritized tasks missing benchmark IDs:\n${missingBenchmark.join('\n')}`
    );
  }

  if (missingSpecPatternRefs.length > 0) {
    const labels = missingSpecPatternRefs
      .map((block) => block.split('\n')[0])
      .join('\n');
    throw new Error(
      `Requirements missing benchmark IDs:\n${labels}`
    );
  }

  console.log('Canvas benchmark traceability validation passed.');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
