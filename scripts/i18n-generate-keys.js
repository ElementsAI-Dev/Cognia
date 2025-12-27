#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */

/**
 * i18n Translation Key Generator
 *
 * Generates translation key additions based on extracted strings.
 * Creates organized translation structures ready to add to en.json and zh-CN.json.
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

// Check if a key already exists in translations
const keyExists = (translations, namespace, key) => {
  if (!translations[namespace]) return false;
  return key in translations[namespace];
};

// Generate a unique key to avoid conflicts
const generateUniqueKey = (translations, namespace, baseKey) => {
  let key = baseKey;
  let counter = 1;

  while (keyExists(translations, namespace, key)) {
    key = `${baseKey}_${counter}`;
    counter++;
  }

  return key;
};

// Convert string to translation key
const stringToKey = (str) => {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars except spaces
    .replace(/\s+/g, '_')  // Spaces to underscores
    .substring(0, 50);     // Limit length
};

// Group strings by namespace and organize keys
const organizeKeysByNamespace = (extractionData) => {
  const organized = {};

  for (const comp of extractionData.components) {
    const namespace = comp.namespace;

    if (!organized[namespace]) {
      organized[namespace] = {
        strings: {},
        conflicts: [],
      };
    }

    // Load existing translations for this namespace
    const enTranslations = loadTranslations(config.existingTranslations.enPath);
    const existingNamespace = enTranslations[namespace] || {};

    for (const str of comp.hardcodedStrings) {
      const suggestedKey = str.suggestedKey.split('.')[1] || stringToKey(str.string);
      const uniqueKey = generateUniqueKey(enTranslations, namespace, suggestedKey);

      // Check for conflicts
      if (suggestedKey !== uniqueKey) {
        organized[namespace].conflicts.push({
          original: suggestedKey,
          adjusted: uniqueKey,
          string: str.string,
          file: comp.file,
        });
      }

      // Only add if not already in organized strings
      if (!organized[namespace].strings[uniqueKey]) {
        organized[namespace].strings[uniqueKey] = {
          english: str.string,
          chinese: null, // To be translated
          files: [comp.file],
          usages: 1,
        };
      } else {
        // Track multiple usages of the same string
        if (!organized[namespace].strings[uniqueKey].files.includes(comp.file)) {
          organized[namespace].strings[uniqueKey].files.push(comp.file);
        }
        organized[namespace].strings[uniqueKey].usages++;
      }
    }
  }

  return organized;
};

// Generate translation additions file
const generateAdditions = (organizedData, existingTranslations) => {
  const additions = {
    en: {},
    zhCN: {},
    summary: {},
  };

  for (const [namespace, data] of Object.entries(organizedData)) {
    // Build namespace structure
    const namespaceData = {};
    const namespaceDataCN = {};

    // Sort keys alphabetically
    const sortedKeys = Object.keys(data.strings).sort();

    for (const key of sortedKeys) {
      const strData = data.strings[key];

      // Check if key already exists in translations
      if (!existingTranslations[namespace] || !existingTranslations[namespace][key]) {
        namespaceData[key] = strData.english;
        namespaceDataCN[key] = ''; // Placeholder for Chinese translation
      }
    }

    if (Object.keys(namespaceData).length > 0) {
      additions.en[namespace] = namespaceData;
      additions.zhCN[namespace] = namespaceDataCN;
      additions.summary[namespace] = {
        totalKeys: sortedKeys.length,
        newKeys: Object.keys(namespaceData).length,
        conflicts: data.conflicts.length,
      };
    }
  }

  return additions;
};

// Generate merge instructions
const generateMergeInstructions = (additions, existingPath) => {
  let instructions = '# Translation Merge Instructions\n\n';
  instructions += `**Generated:** ${new Date().toISOString()}\n\n`;
  instructions += '## Overview\n\n';
  instructions += 'This file contains instructions for merging new translation keys into your existing translation files.\n\n';

  instructions += '## Summary\n\n';
  instructions += `- **Namespaces to update:** ${Object.keys(additions.en).length}\n`;

  let totalNewKeys = 0;
  for (const ns of Object.keys(additions.en)) {
    totalNewKeys += Object.keys(additions.en[ns]).length;
  }
  instructions += `- **Total new keys:** ${totalNewKeys}\n\n`;

  instructions += '## Step-by-Step Instructions\n\n';

  // Step 1: Backup
  instructions += '### Step 1: Backup Current Files\n\n';
  instructions += 'Before making any changes, create backups of your translation files:\n';
  instructions += '```bash\n';
  instructions += 'cp lib/i18n/messages/en.json lib/i18n/messages/en.json.backup\n';
  instructions += 'cp lib/i18n/messages/zh-CN.json lib/i18n/messages/zh-CN.json.backup\n';
  instructions += '```\n\n';

  // Step 2: English translations
  instructions += '### Step 2: Add English Translations\n\n';
  instructions += 'Add the following keys to `lib/i18n/messages/en.json`:\n\n';

  for (const [namespace, keys] of Object.entries(additions.en)) {
    if (Object.keys(keys).length > 0) {
      instructions += `#### ${namespace}\n\n`;
      instructions += '```json\n';
      instructions += JSON.stringify(keys, null, 2);
      instructions += '\n```\n\n';
    }
  }

  // Step 3: Chinese translations
  instructions += '### Step 3: Add Chinese Translations\n\n';
  instructions += 'Translate and add the following keys to `lib/i18n/messages/zh-CN.json`:\n\n';

  for (const [namespace, keys] of Object.entries(additions.zhCN)) {
    if (Object.keys(keys).length > 0) {
      instructions += `#### ${namespace}\n\n`;
      instructions += '**English (reference):**\n';
      instructions += '```json\n';
      instructions += JSON.stringify(additions.en[namespace], null, 2);
      instructions += '\n```\n\n';

      instructions += '**Add Chinese translations for:**\n';
      instructions += '```json\n';
      instructions += JSON.stringify(keys, null, 2);
      instructions += '\n```\n\n';
    }
  }

  // Step 4: Validation
  instructions += '### Step 4: Validate\n\n';
  instructions += 'After adding the translations, validate your JSON files:\n';
  instructions += '```bash\n';
  instructions += 'node -e "console.log(JSON.parse(require(\'fs\').readFileSync(\'lib/i18n/messages/en.json\')))"\n';
  instructions += 'node -e "console.log(JSON.parse(require(\'fs\').readFileSync(\'lib/i18n/messages/zh-CN.json\')))"\n';
  instructions += '```\n\n';

  instructions += '### Step 5: Test\n\n';
  instructions += 'Switch languages in the application to verify translations work correctly.\n\n';

  return instructions;
};

// Main execution
const main = () => {
  console.log('🔑 Generating translation keys...\n');

  // Load extraction report
  const reportPath = path.join(process.cwd(), 'i18n-reports', 'extraction-report.json');

  if (!fs.existsSync(reportPath)) {
    console.error('❌ Extraction report not found. Run i18n-extract.js first.');
    process.exit(1);
  }

  const extractionData = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

  // Load existing translations
  const enTranslations = loadTranslations(config.existingTranslations.enPath);
  const zhTranslations = loadTranslations(config.existingTranslations.zhCNPath);

  // Organize keys by namespace
  console.log('📋 Organizing keys by namespace...');
  const organizedData = organizeKeysByNamespace(extractionData);

  // Generate additions
  console.log('➕ Generating translation additions...');
  const additions = generateAdditions(organizedData, enTranslations);

  // Generate output directory
  const outputDir = path.join(process.cwd(), 'i18n-reports');
  fs.mkdirSync(outputDir, { recursive: true });

  // Save additions (JSON format for easy merging)
  const additionsPath = path.join(outputDir, 'translation-additions.json');
  fs.writeFileSync(additionsPath, JSON.stringify(additions, null, 2));
  console.log(`✅ Translation additions saved: ${additionsPath}`);

  // Save merge instructions
  const instructionsPath = path.join(outputDir, 'merge-instructions.md');
  const instructions = generateMergeInstructions(additions);
  fs.writeFileSync(instructionsPath, instructions);
  console.log(`✅ Merge instructions saved: ${instructionsPath}`);

  // Generate detailed report
  const reportPath2 = path.join(outputDir, 'key-generation-report.md');
  let report = '# Translation Key Generation Report\n\n';
  report += `**Generated:** ${new Date().toISOString()}\n\n`;

  report += '## Summary\n\n';
  report += '| Namespace | New Keys | Conflicts |\n';
  report += '|-----------|----------|----------|\n';

  for (const [namespace, data] of Object.entries(organizedData)) {
    const newKeys = Object.keys(data.strings).filter(k => {
      return !enTranslations[namespace] || !enTranslations[namespace][k];
    }).length;

    report += `| ${namespace} | ${newKeys} | ${data.conflicts.length} |\n`;
  }

  report += '\n## Conflicts (Keys that were renamed)\n\n';
  report += '| Namespace | Original Key | Adjusted Key | String | File |\n';
  report += '|-----------|--------------|--------------|--------|------|\n';

  let hasConflicts = false;
  for (const [namespace, data] of Object.entries(organizedData)) {
    for (const conflict of data.conflicts) {
      hasConflicts = true;
      const fileShort = conflict.file.split('/').pop();
      report += `| ${namespace} | \`${conflict.original}\` | \`${conflict.adjusted}\` | "${conflict.string.substring(0, 50)}${conflict.string.length > 50 ? '...' : ''}" | ${fileShort} |\n`;
    }
  }

  if (!hasConflicts) {
    report += '*No conflicts detected. All suggested keys were unique.*\n';
  }

  report += '\n## All Generated Keys by Namespace\n\n';

  for (const [namespace, data] of Object.entries(organizedData)) {
    report += `### ${namespace}\n\n`;

    const sortedKeys = Object.keys(data.strings).sort();
    const newKeys = sortedKeys.filter(k => {
      return !enTranslations[namespace] || !enTranslations[namespace][k];
    });

    if (newKeys.length === 0) {
      report += '*All keys already exist in translations.*\n\n';
      continue;
    }

    report += `**New Keys (${newKeys.length}):**\n\n`;
    report += '| Key | English | Files | Usages |\n';
    report += '|-----|---------|-------|--------|\n';

    for (const key of newKeys) {
      const strData = data.strings[key];
      const escapedEnglish = strData.english.replace(/\|/g, '\\|');
      const fileCount = strData.files.length;
      report += `| \`${key}\` | ${escapedEnglish.substring(0, 60)}${escapedEnglish.length > 60 ? '...' : ''} | ${fileCount} files | ${strData.usages} |\n`;
    }

    report += '\n';
  }

  fs.writeFileSync(reportPath2, report);
  console.log(`✅ Key generation report saved: ${reportPath2}`);

  // Print summary
  console.log('\n📊 Key Generation Summary:');

  let totalNewKeys = 0;
  let totalConflicts = 0;

  for (const [namespace, data] of Object.entries(organizedData)) {
    const newKeys = Object.keys(data.strings).filter(k => {
      return !enTranslations[namespace] || !enTranslations[namespace][k];
    });
    totalNewKeys += newKeys.length;
    totalConflicts += data.conflicts.length;
  }

  console.log(`   Total new keys to add: ${totalNewKeys}`);
  console.log(`   Total conflicts resolved: ${totalConflicts}`);
  console.log(`   Namespaces affected: ${Object.keys(organizedData).length}`);

  console.log('\n✨ Key generation complete! Check i18n-reports/ directory for output files.\n');
};

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { organizeKeysByNamespace, generateAdditions, stringToKey };
