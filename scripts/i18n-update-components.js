#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */

/**
 * i18n Component Updater
 *
 * Automatically updates components to use translations instead of hardcoded strings.
 * Generates a diff for review before applying changes.
 */

const fs = require('fs');
const path = require('path');

// Load configuration
const configPath = path.join(__dirname, 'i18n-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// Load translations to verify keys exist
const loadTranslations = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return {};
  }
};

// Check if a translation key exists
const translationKeyExists = (translations, fullKey) => {
  const parts = fullKey.split('.');
  let current = translations;

  for (const part of parts) {
    if (!current[part]) return false;
    current = current[part];
  }

  return typeof current === 'string';
};

// Add useTranslations import if not present
const addUseTranslationsImport = (content, namespace) => {
  // Check if useTranslations is already imported
  if (content.includes('useTranslations')) {
    return {
      content,
      added: false,
      reason: 'Already imports useTranslations'
    };
  }

  // Find the imports section
  const lines = content.split('\n');
  let lastImportLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('import ')) {
      lastImportLine = i;
    } else if (lastImportLine >= 0 && !trimmed.startsWith('import ')) {
      break;
    }
  }

  // Prepare import statement
  const importStatement = `import { useTranslations } from 'next-intl';`;

  if (lastImportLine >= 0) {
    // Insert after last import
    lines.splice(lastImportLine + 1, 0, importStatement);
  } else {
    // Insert at beginning (before component)
    lines.splice(0, 0, '');
    lines.splice(0, 0, importStatement);
  }

  return {
    content: lines.join('\n'),
    added: true,
    reason: 'Added useTranslations import'
  };
};

// Add useTranslations hook call in component
const addUseTranslationsHook = (content, namespace) => {
  // Check if hook is already called
  if (content.match(/const\s+\w+\s*=\s*useTranslations\s*\(/)) {
    return {
      content,
      added: false,
      reason: 'Already calls useTranslations hook'
    };
  }

  // Find component function
  const functionMatch = content.match(/(export\s+)?(function\s+(\w+)|const\s+(\w+)\s*=\s*(?:\([^)]*\)\s*=>|function))/);

  if (!functionMatch) {
    return {
      content,
      added: false,
      reason: 'Could not find component function'
    };
  }

  // Find opening brace of function
  const afterFunction = content.substring(functionMatch.index + functionMatch[0].length);
  const firstBraceIndex = afterFunction.indexOf('{');

  if (firstBraceIndex === -1) {
    return {
      content,
      added: false,
      reason: 'Could not find function body'
    };
  }

  // Insert hook call after opening brace
  const hookStatement = `  const t = useTranslations('${namespace}');`;
  const before = content.substring(0, functionMatch.index + functionMatch[0].length + firstBraceIndex + 1);
  const after = content.substring(functionMatch.index + functionMatch[0].length + firstBraceIndex + 1);

  return {
    content: before + '\n' + hookStatement + after,
    added: true,
    hookName: 't',
    reason: 'Added useTranslations hook call'
  };
};

// Replace hardcoded string with translation call
const replaceHardcodedString = (content, stringInfo, hookName = 't') => {
  const { string, suggestedKey, line, type } = stringInfo;
  const key = suggestedKey.split('.')[1] || suggestedKey;

  const lines = content.split('\n');
  const lineIndex = line - 1;

  if (lineIndex < 0 || lineIndex >= lines.length) {
    return {
      content,
      replaced: false,
      reason: 'Line number out of range'
    };
  }

  const lineContent = lines[lineIndex];
  let newLineContent = lineContent;

  // Different replacement strategies based on type
  if (type === 'JSXText') {
    // Replace: >Text< with >{t('key')}<
    const escapedString = string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex chars
    const regex = new RegExp(`>${escapedString}<`, 'g');
    newLineContent = newLineContent.replace(regex, `>{${hookName}('${key}')}<`);
  } else if (type === 'PropString') {
    // Replace: prop="value" with prop={t('key')}
    const escapedString = string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`=["']${escapedString}["']`, 'g');
    newLineContent = newLineContent.replace(regex, `={${hookName}('${key}')}`);
  } else if (type === 'TemplateLiteral') {
    // Replace: `value` with {t('key')}
    const escapedString = string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\`${escapedString}\``, 'g');
    newLineContent = newLineContent.replace(regex, `{${hookName}('${key}')}`);
  }

  if (newLineContent !== lineContent) {
    lines[lineIndex] = newLineContent;
    return {
      content: lines.join('\n'),
      replaced: true,
      originalLine: lineContent,
      newLine: newLineContent
    };
  }

  return {
    content,
    replaced: false,
    reason: 'String not found in line (may have already been replaced)'
  };
};

// Update a single component file
const updateComponentFile = (filePath, componentData) => {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const changes = [];

    // Step 1: Add import
    const importResult = addUseTranslationsImport(content, componentData.namespace);
    content = importResult.content;
    if (importResult.added) {
      changes.push({
        type: 'import',
        description: importResult.reason
      });
    }

    // Step 2: Add hook call
    const hookResult = addUseTranslationsHook(content, componentData.namespace);
    content = hookResult.content;
    const hookName = hookResult.hookName || 't';
    if (hookResult.added) {
      changes.push({
        type: 'hook',
        description: hookResult.reason
      });
    }

    // Step 3: Replace hardcoded strings
    const replacements = [];
    for (const stringInfo of componentData.hardcodedStrings) {
      const result = replaceHardcodedString(content, stringInfo, hookName);
      content = result.content;

      if (result.replaced) {
        replacements.push({
          string: stringInfo.string,
          key: stringInfo.suggestedKey.split('.')[1] || stringInfo.suggestedKey,
          line: stringInfo.line,
          original: result.originalLine,
          updated: result.newLine
        });
      }
    }

    if (replacements.length > 0) {
      changes.push({
        type: 'replacements',
        count: replacements.length,
        details: replacements
      });
    }

    return {
      success: true,
      changes: changes,
      content: content,
      hasChanges: changes.length > 0
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      changes: []
    };
  }
};

// Generate diff output
const generateDiff = (original, updated, filePath) => {
  const originalLines = original.split('\n');
  const updatedLines = updated.split('\n');

  let diff = `--- ${filePath} (original)\n`;
  diff += `+++ ${filePath} (updated)\n`;

  // Simple line-by-line diff
  for (let i = 0; i < Math.max(originalLines.length, updatedLines.length); i++) {
    const origLine = originalLines[i] || '';
    const updatedLine = updatedLines[i] || '';

    if (origLine !== updatedLine) {
      if (origLine) diff += `- ${origLine}\n`;
      if (updatedLine) diff += `+ ${updatedLine}\n`;
    }
  }

  return diff;
};

// Main execution
const main = () => {
  console.log('🔄 Updating components with i18n...\n');

  // Load extraction report
  const reportPath = path.join(process.cwd(), 'i18n-reports', 'extraction-report.json');

  if (!fs.existsSync(reportPath)) {
    console.error('❌ Extraction report not found. Run i18n-extract.js first.');
    process.exit(1);
  }

  const extractionData = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

  // Load existing translations
  const enTranslations = loadTranslations(config.existingTranslations.enPath);

  // Create output directory
  const outputDir = path.join(process.cwd(), 'i18n-updates');
  fs.mkdirSync(outputDir, { recursive: true });

  const summary = {
    totalComponents: 0,
    successfullyUpdated: 0,
    failed: 0,
    skipped: 0,
    totalReplacements: 0,
    components: []
  };

  const allDiffs = [];

  // Process each component
  for (const component of extractionData.components) {
    console.log(`📝 Processing ${component.file}...`);

    summary.totalComponents++;

    // Verify translation keys exist
    const missingKeys = component.hardcodedStrings.filter(s =>
      !translationKeyExists(enTranslations, s.suggestedKey)
    );

    if (missingKeys.length > 0) {
      console.log(`   ⚠️  Skipping: ${missingKeys.length} translation keys not found`);
      summary.skipped++;
      summary.components.push({
        file: component.file,
        status: 'skipped',
        reason: 'Missing translation keys',
        missingKeys: missingKeys.map(k => k.suggestedKey)
      });
      continue;
    }

    // Update component
    const result = updateComponentFile(
      path.join(process.cwd(), component.file),
      component
    );

    if (!result.success) {
      console.log(`   ❌ Failed: ${result.error}`);
      summary.failed++;
      summary.components.push({
        file: component.file,
        status: 'failed',
        error: result.error
      });
      continue;
    }

    if (!result.hasChanges) {
      console.log(`   ℹ️  No changes needed`);
      summary.components.push({
        file: component.file,
        status: 'no-changes',
        changes: []
      });
      continue;
    }

    // Save updated file
    const outputPath = path.join(outputDir, component.file);
    const outputDirPath = path.dirname(outputPath);
    fs.mkdirSync(outputDirPath, { recursive: true });
    fs.writeFileSync(outputPath, result.content);

    // Generate diff
    const originalContent = fs.readFileSync(path.join(process.cwd(), component.file), 'utf-8');
    const diff = generateDiff(originalContent, result.content, component.file);
    allDiffs.push(diff);

    // Count replacements
    const replacementCount = result.changes.find(c => c.type === 'replacements')?.count || 0;
    summary.totalReplacements += replacementCount;

    console.log(`   ✅ Updated: ${result.changes.length} changes, ${replacementCount} replacements`);
    summary.successfullyUpdated++;

    summary.components.push({
      file: component.file,
      status: 'updated',
      changes: result.changes,
      replacementCount: replacementCount
    });
  }

  // Save combined diff file
  const diffPath = path.join(outputDir, 'all-changes.diff');
  fs.writeFileSync(diffPath, allDiffs.join('\n\n'));
  console.log(`\n✅ Combined diff saved: ${diffPath}`);

  // Save summary
  const summaryPath = path.join(outputDir, 'update-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`✅ Update summary saved: ${summaryPath}`);

  // Generate markdown report
  const reportPath = path.join(outputDir, 'update-report.md');
  let report = '# Component Update Report\n\n';
  report += `**Generated:** ${new Date().toISOString()}\n\n`;

  report += '## Summary\n\n';
  report += `- **Total Components:** ${summary.totalComponents}\n`;
  report += `- **Successfully Updated:** ${summary.successfullyUpdated}\n`;
  report += `- **Failed:** ${summary.failed}\n`;
  report += `- **Skipped:** ${summary.skipped}\n`;
  report += `- **Total Replacements:** ${summary.totalReplacements}\n\n`;

  report += '## Updated Components\n\n';
  report += '| Component | Changes | Replacements |\n';
  report += '|-----------|---------|--------------|\n';

  for (const comp of summary.components) {
    if (comp.status === 'updated') {
      const fileName = comp.file.split('/').pop();
      const changeCount = comp.changes.length;
      const replacements = comp.replacementCount || 0;
      report += `| ${fileName} | ${changeCount} | ${replacements} |\n`;
    }
  }

  report += '\n## Failed Components\n\n';
  if (summary.failed > 0) {
    report += '| Component | Error |\n';
    report += '|-----------|-------|\n';
    for (const comp of summary.components) {
      if (comp.status === 'failed') {
        const fileName = comp.file.split('/').pop();
        report += `| ${fileName} | ${comp.error} |\n`;
      }
    }
  } else {
    report += '*No failures*\n';
  }

  report += '\n## Skipped Components\n\n';
  if (summary.skipped > 0) {
    report += '| Component | Reason |\n';
    report += '|-----------|--------|\n';
    for (const comp of summary.components) {
      if (comp.status === 'skipped') {
        const fileName = comp.file.split('/').pop();
        report += `| ${fileName} | ${comp.reason} (${comp.missingKeys?.length || 0} keys missing) |\n`;
      }
    }
  } else {
    report += '*No components skipped*\n';
  }

  fs.writeFileSync(reportPath, report);
  console.log(`✅ Update report saved: ${reportPath}`);

  console.log('\n📊 Update Summary:');
  console.log(`   Total components: ${summary.totalComponents}`);
  console.log(`   Successfully updated: ${summary.successfullyUpdated}`);
  console.log(`   Failed: ${summary.failed}`);
  console.log(`   Skipped: ${summary.skipped}`);
  console.log(`   Total replacements: ${summary.totalReplacements}`);

  console.log(`\n✨ Update complete! Check ${outputDir}/ for updated files and diffs.\n`);
  console.log('⚠️  REVIEW THE DIFFS BEFORE APPLYING TO SOURCE FILES!\n');
};

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { updateComponentFile, generateDiff };
