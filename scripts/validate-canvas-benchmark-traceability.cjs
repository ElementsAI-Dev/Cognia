/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const CANVAS_CHANGE_NAMES = [
  'improve-existing-canvas-large-document-editing',
  'improve-existing-canvas-ai-workbench',
];

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

function collectSpecFiles(specsDir) {
  if (!fs.existsSync(specsDir)) {
    return [];
  }

  const entries = fs.readdirSync(specsDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(specsDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSpecFiles(fullPath));
    } else if (entry.isFile() && entry.name === 'spec.md') {
      files.push(fullPath);
    }
  }

  return files;
}

function main() {
  for (const changeName of CANVAS_CHANGE_NAMES) {
    const changeDir = path.resolve('openspec', 'changes', changeName);
    const tasksPath = path.join(changeDir, 'tasks.md');
    const specFiles = collectSpecFiles(path.join(changeDir, 'specs'));

    const tasksContent = readFileOrThrow(tasksPath);
    const { priorityLines, missingBenchmark } = collectPriorityTaskViolations(tasksContent);

    if (priorityLines.length === 0) {
      throw new Error(
        `No prioritized tasks ([P0]/[P1]) found in tasks.md for traceability validation: ${changeName}`
      );
    }

    if (missingBenchmark.length > 0) {
      throw new Error(
        `Prioritized tasks missing benchmark IDs in ${changeName}:\n${missingBenchmark.join('\n')}`
      );
    }

    if (specFiles.length === 0) {
      throw new Error(`No spec.md files found for Canvas change: ${changeName}`);
    }

    const missingRequirementRefs = [];
    for (const specPath of specFiles) {
      const specContent = readFileOrThrow(specPath);
      const missingSpecPatternRefs = collectSpecBenchmarkViolations(specContent);
      if (missingSpecPatternRefs.length > 0) {
        missingRequirementRefs.push(
          ...missingSpecPatternRefs.map((block) => `${path.relative(changeDir, specPath)} :: ${block.split('\n')[0]}`)
        );
      }
    }

    if (missingRequirementRefs.length > 0) {
      throw new Error(
        `Requirements missing benchmark IDs in ${changeName}:\n${missingRequirementRefs.join('\n')}`
      );
    }
  }

  console.log('Canvas benchmark traceability validation passed.');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
