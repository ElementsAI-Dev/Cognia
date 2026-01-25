import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const componentsDir = path.join(__dirname, '../components');

// Function to get all non-test files recursively
function getComponentFiles(dir, excludeDirs = ['ai-elements', 'ui']) {
  const files = [];

  function walk(currentPath) {
    try {
      const items = fs.readdirSync(currentPath);

      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          const relativePath = path.relative(componentsDir, fullPath);
          const dirName = path.basename(fullPath);
          if (!excludeDirs.includes(dirName) && !dirName.startsWith('.') && dirName !== 'node_modules') {
            walk(fullPath);
          }
        } else if (stat.isFile() && (item.endsWith('.tsx') || item.endsWith('.ts'))) {
          if (!item.includes('.test.') && !item.includes('.spec.') && item !== 'index.ts') {
            const relativePath = path.relative(componentsDir, fullPath);
            files.push(relativePath);
          }
        }
      }
    } catch (err) {
      // Skip directories we can't read
    }
  }

  walk(dir);
  return files;
}

// Function to get all test files
function getTestFiles(dir) {
  const files = [];

  function walk(currentPath) {
    try {
      const items = fs.readdirSync(currentPath);

      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          if (!item.startsWith('.') && item !== 'node_modules') {
            walk(fullPath);
          }
        } else if (stat.isFile() && (item.includes('.test.') || item.includes('.spec.'))) {
          const relativePath = path.relative(componentsDir, fullPath);
          files.push(relativePath);
        }
      }
    } catch (err) {
      // Skip directories we can't read
    }
  }

  walk(dir);
  return files;
}

const componentFiles = getComponentFiles(componentsDir);
const testFiles = getTestFiles(componentsDir);

// Group by directory
const grouped = {};
for (const file of componentFiles) {
  const dir = path.dirname(file);
  const name = path.basename(file).replace(/\.(tsx|ts)$/, '');
  if (!grouped[dir]) grouped[dir] = { components: [], tests: [] };
  grouped[dir].components.push({ name, file });
}

for (const file of testFiles) {
  const dir = path.dirname(file);
  const name = path.basename(file).replace(/\.test\.(tsx|ts)$/, '').replace(/\.spec\.(tsx|ts)$/, '');
  if (!grouped[dir]) grouped[dir] = { components: [], tests: [] };
  if (!grouped[dir].tests.includes(name)) {
    grouped[dir].tests.push(name);
  }
}

// Find missing tests
const result = {};
for (const [dir, data] of Object.entries(grouped).sort()) {
  const missing = data.components.filter(c => !data.tests.includes(c.name));
  if (data.components.length > 0) {
    result[dir] = {
      total: data.components.length,
      tested: data.components.length - missing.length,
      tested_percent: Math.round(((data.components.length - missing.length) / data.components.length) * 100),
      missing: missing.map(m => ({ name: m.name, file: m.file }))
    };
  }
}

// Save results
const outputPath = path.join(__dirname, '../docs/plan/components-test-investigation.json');
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

// Calculate summary
let totalComponents = 0;
let totalTested = 0;
let totalMissing = 0;
const byPriority = { high: [], medium: [], low: [] };

for (const [dir, data] of Object.entries(result)) {
  totalComponents += data.total;
  totalTested += data.tested;
  totalMissing += data.missing.length;

  // Prioritize
  if (data.missing.length > 0) {
    const priority = getPriority(dir);
    byPriority[priority].push({ dir, ...data });
  }
}

function getPriority(dir) {
  const highPriority = [
    'chat', 'agent', 'canvas', 'artifacts', 'designer', 'workflow',
    'chat/core', 'chat/flow', 'chat/dialogs', 'chat/message', 'chat/utils',
    'workflow/editor', 'designer/core', 'designer/panels', 'designer/dnd'
  ];
  const lowPriority = [
    'layout', 'sidebar', 'providers', 'export', 'document', 'git',
    'a2ui/display', 'a2ui/form', 'a2ui/layout', 'ppt/rendering'
  ];

  if (highPriority.some(p => dir === p || dir.startsWith(p + '/'))) return 'high';
  if (lowPriority.some(p => dir === p || dir.startsWith(p + '/'))) return 'low';
  return 'medium';
}

const summary = {
  total_directories: Object.keys(result).length,
  total_components: totalComponents,
  total_tested: totalTested,
  total_missing: totalMissing,
  coverage_percent: Math.round((totalTested / totalComponents) * 100),
  by_priority: {
    high: {
      count: byPriority.high.length,
      missing: byPriority.high.reduce((sum, d) => sum + d.missing.length, 0)
    },
    medium: {
      count: byPriority.medium.length,
      missing: byPriority.medium.reduce((sum, d) => sum + d.missing.length, 0)
    },
    low: {
      count: byPriority.low.length,
      missing: byPriority.low.reduce((sum, d) => sum + d.missing.length, 0)
    }
  }
};

console.log(JSON.stringify({ summary, details: result }, null, 2));
