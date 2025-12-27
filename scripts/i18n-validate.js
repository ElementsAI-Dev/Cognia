#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */

/**
 * i18n Validation Script
 *
 * Validates i18n implementation across components.
 * Checks for hardcoded strings, missing keys, orphaned keys, and consistency issues.
 */

const fs = require('fs');
const path = require('path');

// Load configuration
const configPath = path.join(__dirname, 'i18n-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// Load translations
const loadTranslations = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`Could not load translations from ${filePath}:`, error.message);
    return {};
  }
};

// Get all translation keys (flattened)
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

// Extract useTranslations calls from a file
const extractUsedKeys = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const usedKeys = [];
    const lines = content.split('\n');

    // Pattern to find t('key') or t("key") calls
    const patterns = [
      /t\(['"]([^'"]+)['"]\)/g,
      /useTranslations\(['"]([^'"]+)['"]\)/g,
    ];

    lines.forEach((line, lineIndex) => {
      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          usedKeys.push({
            key: match[1],
            line: lineIndex + 1,
          });
        }
      });
    });

    // Extract namespace
    const namespaceMatch = content.match(/useTranslations\(['"]([^'"]+)['"]\)/);
    const namespace = namespaceMatch ? namespaceMatch[1] : null;

    return {
      file: filePath,
      namespace: namespace,
      hasI18n: !!namespace,
      usedKeys: usedKeys,
    };
  } catch (error) {
    return {
      file: filePath,
      namespace: null,
      hasI18n: false,
      usedKeys: [],
      error: error.message,
    };
  }
};

// Find all component files
const findComponentFiles = (dir, extensions = ['.tsx', '.ts']) => {
  const files = [];

  const traverseDir = (currentDir) => {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        let isExcluded = false;
        for (const pattern of config.excludePatterns) {
          const regex = new RegExp(pattern);
          if (regex.test(fullPath)) {
            isExcluded = true;
            break;
          }
        }

        if (isExcluded) continue;

        if (entry.isDirectory()) {
          traverseDir(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  };

  traverseDir(dir);
  return files;
};

// Check for hardcoded strings (simple check)
const hasHardcodedStrings = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Simple heuristic: look for JSX with text content
    // that's not using {t('...')} pattern
    const jsxTextPattern = />([^<\n{][^<]{3,})</g;
    const matches = content.match(jsxTextPattern);

    if (!matches) return { hasHardcoded: false };

    // Filter out false positives
    const hardcoded = matches.filter(m => {
      const str = m.slice(1, -1).trim();

      // Skip if it's just numbers/symbols
      if (/^[\d\s\-\+\=\/\*\.,]+$/.test(str)) return false;

      // Skip if very short
      if (str.length < 3) return false;

      // Skip if looks like code
      if (str.includes('=>') || str.includes('function') || str.includes('return')) return false;

      return true;
    });

    return {
      hasHardcoded: hardcoded.length > 0,
      count: hardcoded.length,
      samples: hardcoded.slice(0, 5),
    };
  } catch (error) {
    return { hasHardcoded: false, error: error.message };
  }
};

// Validate translations between en and zh-CN
const validateTranslationsConsistency = (enTranslations, zhTranslations) => {
  const issues = [];

  const enKeys = flattenKeys(enTranslations);
  const zhKeys = flattenKeys(zhTranslations);

  // Check for missing keys in zh-CN
  for (const [key, value] of enKeys) {
    if (!zhKeys.has(key)) {
      issues.push({
        type: 'missing-zh',
        key: key,
        english: value,
        severity: 'error',
      });
    }
  }

  // Check for extra keys in zh-CN (not in en)
  for (const [key, value] of zhKeys) {
    if (!enKeys.has(key)) {
      issues.push({
        type: 'extra-zh',
        key: key,
        chinese: value,
        severity: 'warning',
      });
    }
  }

  return issues;
};

// Main execution
const main = () => {
  console.log('✅ Validating i18n implementation...\n');

  const results = {
    summary: {
      totalFiles: 0,
      filesWithI18n: 0,
      filesWithHardcodedStrings: 0,
      missingKeysCount: 0,
      orphanedKeysCount: 0,
      consistencyIssues: 0,
    },
    issues: {
      missingI18n: [],
      hardcodedStrings: [],
      missingKeys: [],
      orphanedKeys: [],
      consistency: [],
    },
    usedKeys: new Set(),
  };

  // Load translations
  const enTranslations = loadTranslations(config.existingTranslations.enPath);
  const zhTranslations = loadTranslations(config.existingTranslations.zhCNPath);
  const enKeys = flattenKeys(enTranslations);

  console.log('📂 Scanning components for i18n usage...');
  for (const targetDir of config.targetDirectories) {
    const fullPath = path.join(process.cwd(), targetDir);

    if (!fs.existsSync(fullPath)) {
      continue;
    }

    const files = findComponentFiles(fullPath);

    for (const file of files) {
      results.summary.totalFiles++;

      // Extract used keys
      const usage = extractUsedKeys(file);

      if (usage.hasI18n) {
        results.summary.filesWithI18n++;

        // Track used keys
        for (const used of usage.usedKeys) {
          if (used.key === usage.namespace) continue; // Skip namespace itself
          results.usedKeys.add(`${usage.namespace}.${used.key}`);
        }
      } else {
        // Component doesn't use i18n
        results.issues.missingI18n.push({
          file: path.relative(process.cwd(), file),
        });
      }

      // Check for hardcoded strings
      const hardcodedCheck = hasHardcodedStrings(file);
      if (hardcodedCheck.hasHardcoded) {
        results.summary.filesWithHardcodedStrings++;
        results.issues.hardcodedStrings.push({
          file: path.relative(process.cwd(), file),
          count: hardcodedCheck.count,
          samples: hardcodedCheck.samples,
        });
      }
    }
  }

  console.log('🔑 Checking for orphaned translation keys...');
  // Check for orphaned keys (in translations but not used)
  for (const [key] of enKeys) {
    if (!results.usedKeys.has(key)) {
      results.summary.orphanedKeysCount++;
      results.issues.orphanedKeys.push({
        key: key,
      });
    }
  }

  console.log('🔄 Checking translation consistency...');
  // Check translation consistency
  const consistencyIssues = validateTranslationsConsistency(enTranslations, zhTranslations);
  results.summary.consistencyIssues = consistencyIssues.length;
  results.issues.consistency = consistencyIssues;

  // Generate output
  const outputDir = path.join(process.cwd(), 'i18n-reports');
  fs.mkdirSync(outputDir, { recursive: true });

  // Save validation report
  const reportPath = path.join(outputDir, 'validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    summary: results.summary,
    issues: {
      missingI18n: results.issues.missingI18n,
      hardcodedStrings: results.issues.hardcodedStrings.slice(0, 50), // Limit output
      orphanedKeys: results.issues.orphanedKeys.slice(0, 50),
      consistency: results.issues.consistency,
    },
  }, null, 2));
  console.log(`✅ Validation report saved: ${reportPath}`);

  // Generate markdown report
  const mdPath = path.join(outputDir, 'validation-report.md');
  let md = '# i18n Validation Report\n\n';
  md += `**Generated:** ${new Date().toISOString()}\n\n`;

  md += '## Summary\n\n';
  md += '| Metric | Count |\n';
  md += '|--------|-------|\n';
  md += `| Total Files | ${results.summary.totalFiles} |\n`;
  md += `| Files with i18n | ${results.summary.filesWithI18n} |\n`;
  md += `| Files without i18n | ${results.summary.totalFiles - results.summary.filesWithI18n} |\n`;
  md += `| Files with Hardcoded Strings | ${results.summary.filesWithHardcodedStrings} |\n`;
  md += `| Missing Translation Keys (zh-CN) | ${results.issues.consistency.filter(i => i.type === 'missing-zh').length} |\n`;
  md += `| Orphaned Translation Keys | ${results.summary.orphanedKeysCount} |\n`;
  md += `| Consistency Issues | ${results.summary.consistencyIssues} |\n\n`;

  // Files without i18n
  md += '## Files Without i18n\n\n';
  if (results.issues.missingI18n.length > 0) {
    md += `Found **${results.issues.missingI18n.length}** files that don't use i18n:\n\n`;
    md += '| File |\n';
    md += '|------|\n';
    for (const issue of results.issues.missingI18n.slice(0, 50)) {
      md += `| ${issue.file} |\n`;
    }
    if (results.issues.missingI18n.length > 50) {
      md += `| ... and ${results.issues.missingI18n.length - 50} more |\n`;
    }
  } else {
    md += '*✅ All files use i18n!*\n';
  }
  md += '\n';

  // Hardcoded strings
  md += '## Files with Hardcoded Strings\n\n';
  if (results.issues.hardcodedStrings.length > 0) {
    md += `Found **${results.issues.hardcodedStrings.length}** files with potential hardcoded strings:\n\n`;
    md += '| File | Count | Samples |\n';
    md += '|------|-------|--------|\n';
    for (const issue of results.issues.hardcodedStrings.slice(0, 30)) {
      const file = issue.file.split('/').pop();
      const samples = issue.samples.map(s => `"${s.replace(/"/g, '\\"').substring(0, 30)}"`).join(', ');
      md += `| ${file} | ${issue.count} | ${samples} |\n`;
    }
    if (results.issues.hardcodedStrings.length > 30) {
      md += `| ... and ${results.issues.hardcodedStrings.length - 30} more |\n`;
    }
  } else {
    md += '*✅ No hardcoded strings detected!*\n';
  }
  md += '\n';

  // Missing translation keys
  md += '## Missing Translation Keys\n\n';
  const missingZh = results.issues.consistency.filter(i => i.type === 'missing-zh');
  if (missingZh.length > 0) {
    md += `Found **${missingZh.length}** keys missing in zh-CN.json:\n\n`;
    md += '| Key | English Value |\n';
    md += '|-----|--------------|\n';
    for (const issue of missingZh.slice(0, 50)) {
      const escaped = issue.english.replace(/\n/g, ' ').substring(0, 60);
      md += `| \`${issue.key}\` | ${escaped} |\n`;
    }
    if (missingZh.length > 50) {
      md += `| ... and ${missingZh.length - 50} more |\n`;
    }
  } else {
    md += '*✅ All English keys have Chinese translations!*\n';
  }
  md += '\n';

  // Orphaned keys
  md += '## Potentially Orphaned Translation Keys\n\n';
  if (results.issues.orphanedKeys.length > 0) {
    md += `Found **${results.issues.orphanedKeys.length}** keys that are defined but may not be used:\n\n`;
    md += '| Key |\n';
    md += '|-----|\n';
    for (const issue of results.issues.orphanedKeys.slice(0, 50)) {
      md += `| \`${issue.key}\` |\n`;
    }
    if (results.issues.orphanedKeys.length > 50) {
      md += `| ... and ${results.issues.orphanedKeys.length - 50} more |\n`;
    }
    md += '\n';
    md += '*Note: These keys might be used dynamically or in ways the validator couldn\'t detect.*\n';
  } else {
    md += '*✅ No orphaned keys!*\n';
  }
  md += '\n';

  // Recommendations
  md += '## Recommendations\n\n';

  if (results.issues.missingI18n.length > 0) {
    md += `1. **Add i18n to ${results.issues.missingI18n.length} components** - Run the extraction and update scripts\n`;
  }

  if (results.issues.hardcodedStrings.length > 0) {
    md += `2. **Replace ${results.issues.hardcodedStrings.length} components' hardcoded strings** - Use i18n-update-components.js\n`;
  }

  if (missingZh.length > 0) {
    md += `3. **Add ${missingZh.length} Chinese translations** - See merge-instructions.md\n`;
  }

  if (results.issues.orphanedKeys.length > 0) {
    md += `4. **Review ${results.issues.orphanedKeys.length} potentially unused keys** - Consider removing if truly orphaned\n`;
  }

  if (results.issues.missingI18n.length === 0 &&
      results.issues.hardcodedStrings.length === 0 &&
      missingZh.length === 0) {
    md += '*✅ All checks passed! Your i18n implementation is complete.*\n';
  }

  fs.writeFileSync(mdPath, md);
  console.log(`✅ Markdown report saved: ${mdPath}`);

  // Print summary
  console.log('\n📊 Validation Summary:');
  console.log(`   Total files scanned: ${results.summary.totalFiles}`);
  console.log(`   Files with i18n: ${results.summary.filesWithI18n}`);
  console.log(`   Files with hardcoded strings: ${results.summary.filesWithHardcodedStrings}`);
  console.log(`   Missing Chinese translations: ${missingZh.length}`);
  console.log(`   Potentially orphaned keys: ${results.summary.orphanedKeysCount}`);
  console.log(`   Consistency issues: ${results.summary.consistencyIssues}`);

  if (results.summary.filesWithI18n === results.summary.totalFiles &&
      results.summary.filesWithHardcodedStrings === 0 &&
      missingZh.length === 0) {
    console.log('\n✅ All validations passed!\n');
  } else {
    console.log('\n⚠️  Issues found. Check i18n-reports/validation-report.md for details.\n');
  }
};

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { extractUsedKeys, validateTranslationsConsistency, hasHardcodedStrings };
