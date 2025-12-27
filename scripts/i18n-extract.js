#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */

/**
 * i18n String Extraction Script (Simplified)
 *
 * Scans React components for hardcoded strings that need i18n.
 * Uses regex-based pattern matching for lightweight extraction.
 */

const fs = require('fs');
const path = require('path');

// Load configuration
const configPath = path.join(__dirname, 'i18n-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// Load existing translations
const loadTranslations = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`Could not load translations from ${filePath}:`, error.message);
    return {};
  }
};

// Get all existing translation keys (flattened)
const flattenKeys = (obj, prefix = '') => {
  const keys = new Set();
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      flattenKeys(value, fullKey).forEach(k => keys.add(k));
    } else {
      keys.add(fullKey);
    }
  }
  return keys;
};

// Check if a string should be extracted
const shouldExtractString = (str) => {
  // Skip empty strings or whitespace-only
  if (!str || str.trim().length < config.extractionRules.minLength) {
    return false;
  }

  // Skip if too long
  if (str.length > config.extractionRules.maxLength) {
    return false;
  }

  // Check exclusion patterns
  for (const pattern of config.extractionRules.excludePatterns) {
    const regex = new RegExp(pattern);
    if (regex.test(str)) {
      return false;
    }
  }

  // Skip technical strings
  if (config.extractionRules.excludeTechnicalStrings) {
    // Skip API endpoints, URLs, file paths
    if (str.startsWith('http://') || str.startsWith('https://') || str.startsWith('./') || str.startsWith('../')) {
      return false;
    }
    // Skip CSS class names (multiple words with hyphens, all lowercase)
    if (/^[a-z][a-z0-9- ]+$/.test(str) && str.includes(' ')) {
      return false;
    }
    // Skip file extensions
    if (/\.(css|scss|less|json|md|txt|html|js|jsx|ts|tsx)$/.test(str)) {
      return false;
    }
  }

  return true;
};

// Extract strings from component file using regex
const extractStringsFromFile = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    const results = [];

    // Check if file already uses useTranslations
    const hasI18nHook = content.includes('useTranslations');

    // Patterns for different string types
    const patterns = [
      // JSX text: <div>text</div>
      {
        regex: />([^<\n{]+)</g,
        type: 'JSXText',
        filter: (match) => {
          const str = match.trim();
          // Skip if it looks like HTML attribute
          if (str.includes('=')) return false;
          return shouldExtractString(str);
        }
      },
      // String literals in props: title="text"
      {
        regex: /=["']([^"']+)["']/g,
        type: 'PropString',
        filter: (match) => {
          // Skip common props that don't need translation
          const parentContext = content.substring(Math.max(0, content.indexOf(match) - 50), content.indexOf(match) + match.length + 10);
          if (/className|id=|style=|data-|aria-|key=|ref=|type=|name=|placeholder=|href|src=|alt=/.test(parentContext)) {
            return false;
          }
          return shouldExtractString(match);
        }
      },
      // Template literals: `text`
      {
        regex: /`([^`]+)`/g,
        type: 'TemplateLiteral',
        filter: (match) => {
          // Skip if contains expressions
          if (match.includes('${')) return false;
          return shouldExtractString(match);
        }
      }
    ];

    lines.forEach((line, lineIndex) => {
      // Skip lines that are comments
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) {
        return;
      }

      // Skip import/export statements
      if (trimmedLine.startsWith('import ') || trimmedLine.startsWith('export ')) {
        return;
      }

      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.regex.exec(line)) !== null) {
          const str = match[1];
          if (pattern.filter(str)) {
            results.push({
              string: str,
              type: pattern.type,
              line: lineIndex + 1,
              column: match.index + 1,
            });
          }
        }
      });
    });

    // Remove duplicates
    const uniqueResults = [];
    const seen = new Set();
    for (const result of results) {
      const key = `${result.string}:${result.line}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueResults.push(result);
      }
    }

    return {
      file: filePath,
      hasI18nHook: hasI18nHook,
      strings: uniqueResults,
    };
  } catch (error) {
    console.warn(`Error reading ${filePath}:`, error.message);
    return {
      file: filePath,
      hasI18nHook: false,
      strings: [],
      error: error.message,
    };
  }
};

// Recursively find all component files
const findComponentFiles = (dir, extensions = ['.tsx', '.ts']) => {
  const files = [];

  const traverseDir = (currentDir) => {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        // Skip excluded directories
        let isExcluded = false;
        for (const pattern of config.excludePatterns) {
          const regex = new RegExp(pattern);
          if (regex.test(fullPath)) {
            isExcluded = true;
            break;
          }
        }

        if (isExcluded) {
          continue;
        }

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

// Generate namespace from file path
const getNamespace = (filePath) => {
  const relativePath = path.relative(process.cwd(), filePath);

  // Check namespace mapping
  for (const [dirPattern, namespace] of Object.entries(config.namespaceMapping)) {
    if (relativePath.startsWith(dirPattern)) {
      return namespace;
    }
  }

  // Default: use first directory name after components/
  const match = relativePath.match(/components\/([^\/]+)/);
  return match ? match[1] : 'common';
};

// Generate translation key from string
const generateKey = (str) => {
  // Convert to camelCase
  let key = str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, '_')  // Spaces to underscores
    .trim();

  // Limit length
  if (key.length > config.keyGenerationRules.maxKeyLength) {
    key = key.substring(0, config.keyGenerationRules.maxKeyLength);
  }

  return key;
};

// Main execution
const main = () => {
  console.log('🔍 Starting i18n string extraction...\n');

  const results = {
    summary: {
      totalFiles: 0,
      filesWithHardcodedStrings: 0,
      filesWithI18n: 0,
      totalHardcodedStrings: 0,
    },
    components: [],
    byNamespace: {},
  };

  // Load existing translations
  const existingTranslations = loadTranslations(config.existingTranslations.enPath);

  // Process each target directory
  for (const targetDir of config.targetDirectories) {
    const fullPath = path.join(process.cwd(), targetDir);

    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️  Directory not found: ${targetDir}`);
      continue;
    }

    console.log(`📂 Scanning ${targetDir}...`);
    const files = findComponentFiles(fullPath);

    for (const file of files) {
      const extraction = extractStringsFromFile(file);
      const namespace = getNamespace(file);

      if (extraction.strings.length > 0) {
        results.summary.filesWithHardcodedStrings++;
        results.summary.totalHardcodedStrings += extraction.strings.length;

        const componentResult = {
          file: path.relative(process.cwd(), file),
          namespace: namespace,
          hasI18nHook: extraction.hasI18nHook,
          hardcodedStrings: extraction.strings.map(s => ({
            ...s,
            suggestedKey: `${namespace}.${generateKey(s.string)}`,
          })),
        };

        results.components.push(componentResult);

        // Group by namespace
        if (!results.byNamespace[namespace]) {
          results.byNamespace[namespace] = {
            totalComponents: 0,
            totalStrings: 0,
            components: [],
          };
        }
        results.byNamespace[namespace].totalComponents++;
        results.byNamespace[namespace].totalStrings += extraction.strings.length;
        results.byNamespace[namespace].components.push(componentResult.file);
      }

      if (extraction.hasI18nHook) {
        results.summary.filesWithI18n++;
      }

      results.summary.totalFiles++;
    }
  }

  // Sort components by namespace and string count
  results.components.sort((a, b) => b.hardcodedStrings.length - a.hardcodedStrings.length);

  // Generate output files
  const outputDir = path.join(process.cwd(), 'i18n-reports');
  fs.mkdirSync(outputDir, { recursive: true });

  // JSON output
  const jsonPath = path.join(outputDir, 'extraction-report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ JSON report saved: ${jsonPath}`);

  // CSV output
  const csvPath = path.join(outputDir, 'extraction-report.csv');
  const csvHeaders = ['File', 'Namespace', 'Has i18n', 'String', 'Line', 'Type', 'Suggested Key'];
  const csvRows = results.components.flatMap(comp =>
    comp.hardcodedStrings.map(s => [
      comp.file,
      comp.namespace,
      comp.hasI18nHook ? 'Yes' : 'No',
      `"${s.string.replace(/"/g, '""')}"`,
      s.line || '',
      s.type,
      s.suggestedKey,
    ])
  );
  const csvContent = [csvHeaders.join(','), ...csvRows.map(r => r.join(','))].join('\n');
  fs.writeFileSync(csvPath, csvContent);
  console.log(`✅ CSV report saved: ${csvPath}`);

  // Markdown summary
  const mdPath = path.join(outputDir, 'extraction-report.md');
  const mdContent = generateMarkdownReport(results);
  fs.writeFileSync(mdPath, mdContent);
  console.log(`✅ Markdown report saved: ${mdPath}`);

  // Print summary
  console.log('\n📊 Extraction Summary:');
  console.log(`   Total files scanned: ${results.summary.totalFiles}`);
  console.log(`   Files with i18n hook: ${results.summary.filesWithI18n}`);
  console.log(`   Files with hardcoded strings: ${results.summary.filesWithHardcodedStrings}`);
  console.log(`   Total hardcoded strings found: ${results.summary.totalHardcodedStrings}`);
  console.log('\n📋 Top 10 Components by Hardcoded Strings:');
  results.components.slice(0, 10).forEach((comp, i) => {
    console.log(`   ${i + 1}. ${comp.file} (${comp.hardcodedStrings.length} strings)`);
  });

  console.log('\n📋 By Namespace:');
  for (const [namespace, data] of Object.entries(results.byNamespace)) {
    console.log(`   ${namespace}: ${data.totalComponents} components, ${data.totalStrings} strings`);
  }

  console.log('\n✨ Extraction complete! Check i18n-reports/ directory for detailed reports.\n');
};

// Generate markdown report
const generateMarkdownReport = (results) => {
  let md = '# i18n String Extraction Report\n\n';
  md += `**Generated:** ${new Date().toISOString()}\n\n`;

  md += '## Summary\n\n';
  md += `- **Total Files Scanned:** ${results.summary.totalFiles}\n`;
  md += `- **Files with i18n Hook:** ${results.summary.filesWithI18n}\n`;
  md += `- **Files with Hardcoded Strings:** ${results.summary.filesWithHardcodedStrings}\n`;
  md += `- **Total Hardcoded Strings:** ${results.summary.totalHardcodedStrings}\n\n`;

  md += '## By Namespace\n\n';
  md += '| Namespace | Components | Strings |\n';
  md += '|-----------|------------|--------|\n';
  const sortedNamespaces = Object.entries(results.byNamespace).sort((a, b) => b[1].totalStrings - a[1].totalStrings);
  for (const [namespace, data] of sortedNamespaces) {
    md += `| ${namespace} | ${data.totalComponents} | ${data.totalStrings} |\n`;
  }

  md += '\n## Top Components with Hardcoded Strings\n\n';
  md += '| Component | Namespace | Strings | Has i18n |\n';
  md += '|-----------|-----------|---------|----------|\n';
  for (const comp of results.components.slice(0, 50)) {
    const relativeFile = comp.file.replace(/\\/g, '/');
    md += `| [${relativeFile}](${relativeFile}) | ${comp.namespace} | ${comp.hardcodedStrings.length} | ${comp.hasI18nHook ? '✅' : '❌'} |\n`;
  }

  md += '\n## Detailed Component Results\n\n';
  for (const comp of results.components) {
    const relativeFile = comp.file.replace(/\\/g, '/');
    md += `### ${relativeFile}\n\n`;
    md += `- **Namespace:** ${comp.namespace}\n`;
    md += `- **Has i18n Hook:** ${comp.hasI18nHook ? '✅ Yes' : '❌ No'}\n`;
    md += `- **Hardcoded Strings:** ${comp.hardcodedStrings.length}\n\n`;

    if (comp.hardcodedStrings.length > 0 && comp.hardcodedStrings.length <= 20) {
      md += '| String | Line | Type | Suggested Key |\n';
      md += '|--------|------|------|---------------|\n';
      for (const s of comp.hardcodedStrings) {
        const escapedString = s.string.replace(/\|/g, '\\|').replace(/\n/g, ' ');
        md += `| ${escapedString} | ${s.line || ''} | ${s.type} | \`${s.suggestedKey}\` |\n`;
      }
      md += '\n';
    } else if (comp.hardcodedStrings.length > 20) {
      md += `*Showing first 20 of ${comp.hardcodedStrings.length} strings*\n\n`;
      md += '| String | Line | Type | Suggested Key |\n';
      md += '|--------|------|------|---------------|\n';
      for (const s of comp.hardcodedStrings.slice(0, 20)) {
        const escapedString = s.string.replace(/\|/g, '\\|').replace(/\n/g, ' ');
        md += `| ${escapedString} | ${s.line || ''} | ${s.type} | \`${s.suggestedKey}\` |\n`;
      }
      md += '\n';
    }
  }

  return md;
};

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { extractStringsFromFile, findComponentFiles, getNamespace, generateKey };
