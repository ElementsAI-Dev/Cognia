#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * i18n Watch Script
 *
 * Watches for changes in source files and translation files.
 * Automatically validates and reports issues in real-time.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Load configuration
const configPath = path.join(__dirname, 'i18n-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// Parse CLI arguments
const args = process.argv.slice(2);
const options = {
  verbose: args.includes('--verbose'),
  autoFix: args.includes('--auto-fix'),
  debounce: parseInt(args.find((a, i) => args[i - 1] === '--debounce') || '1000'),
};

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const log = {
  info: (msg) => console.log(`${colors.dim}[${getTime()}]${colors.reset} ℹ️  ${msg}`),
  success: (msg) => console.log(`${colors.dim}[${getTime()}]${colors.reset} ${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.dim}[${getTime()}]${colors.reset} ${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.dim}[${getTime()}]${colors.reset} ${colors.red}✗${colors.reset} ${msg}`),
  change: (msg) => console.log(`${colors.dim}[${getTime()}]${colors.reset} ${colors.magenta}◉${colors.reset} ${msg}`),
};

// Get current time string
const getTime = () => {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
};

// Debounce function
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Load JSON file safely
const loadJSON = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (_error) {
    return null;
  }
};

// Flatten translation keys
const flattenKeys = (obj, prefix = '') => {
  const keys = new Map();
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      flattenKeys(value, fullKey).forEach((v, k) => keys.set(k, v));
    } else {
      keys.set(fullKey, value);
    }
  }
  return keys;
};

// Quick validation check
const quickValidate = () => {
  const issues = [];

  // Load translations
  const enPath = path.join(process.cwd(), config.existingTranslations.enPath);
  const zhPath = path.join(process.cwd(), config.existingTranslations.zhCNPath);

  const enTranslations = loadJSON(enPath);
  const zhTranslations = loadJSON(zhPath);

  if (!enTranslations) {
    issues.push({ type: 'error', message: 'Could not load English translations' });
    return issues;
  }

  if (!zhTranslations) {
    issues.push({ type: 'error', message: 'Could not load Chinese translations' });
    return issues;
  }

  // Check for missing keys
  const enKeys = flattenKeys(enTranslations);
  const zhKeys = flattenKeys(zhTranslations);

  let missingCount = 0;
  let emptyCount = 0;

  for (const [key] of enKeys) {
    if (!zhKeys.has(key)) {
      missingCount++;
    } else if (zhKeys.get(key) === '' || zhKeys.get(key) === null) {
      emptyCount++;
    }
  }

  if (missingCount > 0) {
    issues.push({
      type: 'warn',
      message: `${missingCount} translation keys missing in zh-CN.json`,
    });
  }

  if (emptyCount > 0) {
    issues.push({
      type: 'warn',
      message: `${emptyCount} empty translations in zh-CN.json`,
    });
  }

  // Check for extra keys in zh-CN
  let extraCount = 0;
  for (const [key] of zhKeys) {
    if (!enKeys.has(key)) {
      extraCount++;
    }
  }

  if (extraCount > 0) {
    issues.push({
      type: 'info',
      message: `${extraCount} extra keys in zh-CN.json (not in en.json)`,
    });
  }

  return issues;
};

// Check component for hardcoded strings
const checkComponent = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const issues = [];

    // Check if using useTranslations
    const hasI18n = content.includes('useTranslations');

    // Simple check for potential hardcoded strings in JSX
    const jsxTextPattern = />([^<\n{][^<]{3,})</g;
    const matches = content.match(jsxTextPattern) || [];

    const potentialHardcoded = matches.filter(m => {
      const str = m.slice(1, -1).trim();
      if (/^[\d\s\-\+\=\/\*\.,]+$/.test(str)) return false;
      if (str.length < 3) return false;
      if (str.includes('=>') || str.includes('function')) return false;
      return true;
    });

    if (!hasI18n && potentialHardcoded.length > 0) {
      issues.push({
        type: 'warn',
        message: `Component doesn't use i18n and has ${potentialHardcoded.length} potential hardcoded strings`,
      });
    }

    return issues;
  } catch (_error) {
    return [];
  }
};

// Run validation script (reserved for future auto-fix feature)
const _runValidation = () => {
  return new Promise((resolve) => {
    const child = spawn('node', [path.join(__dirname, 'i18n-validate.js')], {
      stdio: 'pipe',
      cwd: process.cwd(),
    });

    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', () => {
      resolve(output);
    });

    child.on('error', () => {
      resolve('');
    });
  });
};

// Handle file change
const handleFileChange = debounce(async (eventType, filename) => {
  if (!filename) return;

  const ext = path.extname(filename);
  const basename = path.basename(filename);

  // Skip non-relevant files
  if (!['.tsx', '.ts', '.jsx', '.js', '.json'].includes(ext)) return;
  if (basename.includes('.test.') || basename.includes('.spec.')) return;

  log.change(`File changed: ${filename}`);

  // Handle translation file changes
  if (filename.endsWith('.json') && (filename.includes('en.json') || filename.includes('zh-CN.json'))) {
    log.info('Translation file changed, validating...');

    const issues = quickValidate();

    if (issues.length === 0) {
      log.success('Translations are valid!');
    } else {
      for (const issue of issues) {
        if (issue.type === 'error') log.error(issue.message);
        else if (issue.type === 'warn') log.warn(issue.message);
        else log.info(issue.message);
      }
    }

    return;
  }

  // Handle component file changes
  if (['.tsx', '.jsx'].includes(ext)) {
    const issues = checkComponent(path.join(process.cwd(), filename));

    if (issues.length > 0) {
      for (const issue of issues) {
        log.warn(`${filename}: ${issue.message}`);
      }
    } else if (options.verbose) {
      log.success(`${filename}: No i18n issues detected`);
    }
  }
}, options.debounce);

// Watch directories
const watchDirectories = () => {
  const watchers = [];

  // Watch translation files
  const translationDir = path.dirname(
    path.join(process.cwd(), config.existingTranslations.enPath)
  );

  if (fs.existsSync(translationDir)) {
    const watcher = fs.watch(translationDir, { recursive: false }, (event, filename) => {
      if (filename && filename.endsWith('.json')) {
        handleFileChange(event, path.join('lib/i18n/messages', filename));
      }
    });
    watchers.push(watcher);
    log.info(`Watching: ${translationDir}`);
  }

  // Watch component directories
  for (const targetDir of config.targetDirectories) {
    const fullPath = path.join(process.cwd(), targetDir);

    if (fs.existsSync(fullPath)) {
      try {
        const watcher = fs.watch(fullPath, { recursive: true }, (event, filename) => {
          if (filename) {
            handleFileChange(event, path.join(targetDir, filename));
          }
        });
        watchers.push(watcher);

        if (options.verbose) {
          log.info(`Watching: ${targetDir}`);
        }
      } catch (_error) {
        // Some directories might not support recursive watching
      }
    }
  }

  return watchers;
};

// Show initial status
const showInitialStatus = async () => {
  console.log(`\n${colors.bright}${colors.cyan}👁️  i18n Watch Mode${colors.reset}\n`);
  console.log(`Watching for changes in ${config.targetDirectories.length} directories...`);
  console.log(`Press Ctrl+C to stop.\n`);

  // Initial validation
  log.info('Running initial validation...');
  const issues = quickValidate();

  if (issues.length === 0) {
    log.success('All translations are valid!');
  } else {
    for (const issue of issues) {
      if (issue.type === 'error') log.error(issue.message);
      else if (issue.type === 'warn') log.warn(issue.message);
      else log.info(issue.message);
    }
  }

  console.log();
};

// Cleanup on exit
const cleanup = (watchers) => {
  console.log('\n');
  log.info('Stopping watchers...');
  for (const watcher of watchers) {
    watcher.close();
  }
  log.success('Watch mode stopped');
  process.exit(0);
};

// Main execution
const main = async () => {
  await showInitialStatus();

  const watchers = watchDirectories();

  // Handle Ctrl+C
  process.on('SIGINT', () => cleanup(watchers));
  process.on('SIGTERM', () => cleanup(watchers));

  // Keep process running
  process.stdin.resume();
};

// Show help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
${colors.cyan}i18n Watch Mode${colors.reset}

Usage: node scripts/i18n-watch.js [options]

Options:
  --verbose           Show detailed output for each file change
  --auto-fix          Automatically run fixes when issues are detected
  --debounce <ms>     Debounce time in milliseconds (default: 1000)
  --help, -h          Show this help message

Examples:
  node scripts/i18n-watch.js
  node scripts/i18n-watch.js --verbose
  node scripts/i18n-watch.js --debounce 500
`);
  process.exit(0);
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { quickValidate, checkComponent };
