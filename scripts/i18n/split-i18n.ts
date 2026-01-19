/**
 * Split large i18n files into smaller, categorized files
 * Usage: npx ts-node scripts/i18n/split-i18n.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MESSAGES_DIR = path.join(__dirname, '../../lib/i18n/messages');

// Define categories and their keys
const CATEGORIES: Record<string, string[]> = {
  // Core
  'common': ['common', 'platformWarning', 'toasts', 'accessibility', 'placeholders', 'table'],
  
  // Chat
  'chat': ['chat', 'chatHeader', 'chatInput', 'chatGoal', 'chatSummary', 'chatSettings', 'quotedContent', 'carriedContext', 'modeSwitch'],
  
  // Presets
  'presets': ['presetSelector', 'presetQuickSwitcher', 'presetManager', 'presets'],
  
  // Agent
  'agent': ['agent', 'agentMode', 'agentSummary', 'agentFlowVisualizer', 'customMode'],
  
  // AI & Models
  'ai': ['aiSettings', 'modelPicker', 'providers', 'reasoning', 'chainOfThought'],
  
  // Settings pages
  'settings': ['settings', 'searchSettings', 'dataSettings', 'themeEditor', 'customThemeEditor', 'responseSettings', 'keyboardSettings', 'keyboardShortcuts', 'speechSettings'],
  
  // Tools & MCP
  'tools': ['tools', 'toolSettings', 'toolStatus', 'toolResultDisplay', 'mcp', 'mcpSettings', 'mcpInstall', 'mcpMarketplace'],
  
  // Sandbox & Code Execution
  'sandbox': ['sandbox', 'sandboxPanel', 'sandboxSettings', 'sandboxFileExplorer', 'codeExecutor', 'executionStatistics'],
  
  // Native Tools (Desktop)
  'native': ['nativeToolsSettings', 'selectionToolbar', 'selectionHistory', 'screenshotPanel', 'windowSelector', 'clipboardPanel', 'systemMonitor', 'textSelection'],
  
  // Projects
  'projects': ['projects', 'projectDetail', 'projectActivity', 'projectEnv'],
  
  // Git
  'git': ['git', 'projectGit', 'branchSelector'],
  
  // Artifacts
  'artifacts': ['artifacts', 'artifactPreview', 'artifactList', 'artifactCreateButton'],
  
  // Designer
  'designer': ['designer', 'designerPanel', 'v0Designer', 'elementTree', 'componentLibrary', 'nodeQuickConfig', 'nodeTemplate', 'nodePreview'],
  
  // Canvas
  'canvas': ['canvas'],
  
  // PPT
  'ppt': ['pptPreview', 'pptGenerator', 'pptEditor'],
  
  // Image & Video
  'media': ['imageGeneration', 'videoGeneration', 'video', 'screenRecording', 'videoEditor'],
  
  // Memory & Instructions
  'memory': ['memory', 'customInstructions', 'rules', 'knowledgeBase'],
  
  // Prompt
  'prompt': ['promptOptimizer', 'promptSelfOptimizer', 'promptFeedback', 'promptABTest', 'promptAnalytics', 'promptOptimizationHub'],
  
  // Export
  'export': ['export', 'batchExport', 'batchCopy', 'document'],
  
  // Workflow
  'workflow': ['workflow', 'workflowEditor'],
  
  // Skills
  'skills': ['skills', 'skillSettings'],
  
  // Navigation
  'navigation': ['sidebar', 'mobileNav', 'commandPalette'],
  
  // Welcome & Onboarding
  'onboarding': ['welcome', 'onboarding', 'templates'],
  
  // Desktop Settings
  'desktop': ['desktopSettings', 'proxySettings', 'environmentSettings', 'virtualEnv'],
  
  // Usage
  'usage': ['usageSettings'],
  
  // Vector DB
  'vector': ['vectorManager', 'vectorSettings'],
  
  // Version History
  'version': ['versionHistory', 'versionHistoryPanel'],
  
  // Jupyter
  'jupyter': ['jupyter', 'jupyterRenderer'],
  
  // Miscellaneous
  'misc': ['quote', 'openInChat', 'sources', 'contextSettings', 'renderer', 'previewLoading', 'pendingMessagesQueue', 'recentFilesPopover'],
  
  // Learning & Academic
  'learning': ['learningMode', 'learning', 'academic', 'flowChat'],
};

function splitI18nFile(locale: string) {
  const inputPath = path.join(MESSAGES_DIR, `${locale}.json`);
  const outputDir = path.join(MESSAGES_DIR, locale);
  
  // Read original file
  const originalData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const originalKeys = Object.keys(originalData);
  
  console.log(`\n📂 Processing ${locale}.json...`);
  console.log(`   Total keys: ${originalKeys.length}`);
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Track processed keys
  const processedKeys = new Set<string>();
  const categoryFiles: Record<string, Record<string, unknown>> = {};
  
  // Process each category
  for (const [category, keys] of Object.entries(CATEGORIES)) {
    const categoryData: Record<string, unknown> = {};
    
    for (const key of keys) {
      if (originalData[key] !== undefined) {
        categoryData[key] = originalData[key];
        processedKeys.add(key);
      }
    }
    
    if (Object.keys(categoryData).length > 0) {
      categoryFiles[category] = categoryData;
    }
  }
  
  // Check for uncategorized keys
  const uncategorizedKeys = originalKeys.filter(k => !processedKeys.has(k));
  if (uncategorizedKeys.length > 0) {
    console.log(`   ⚠️  Uncategorized keys: ${uncategorizedKeys.join(', ')}`);
    // Add uncategorized to misc
    const miscData = categoryFiles['misc'] || {};
    for (const key of uncategorizedKeys) {
      (miscData as Record<string, unknown>)[key] = originalData[key];
      processedKeys.add(key);
    }
    categoryFiles['misc'] = miscData;
  }
  
  // Write category files
  let totalWrittenKeys = 0;
  for (const [category, data] of Object.entries(categoryFiles)) {
    const outputPath = path.join(outputDir, `${category}.json`);
    const keyCount = Object.keys(data).length;
    totalWrittenKeys += keyCount;
    
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`   ✅ ${category}.json (${keyCount} keys)`);
  }
  
  // Create index.ts for this locale
  const indexContent = generateIndexFile(Object.keys(categoryFiles), locale);
  fs.writeFileSync(path.join(outputDir, 'index.ts'), indexContent, 'utf8');
  console.log(`   ✅ index.ts`);
  
  // Verify completeness
  console.log(`\n   📊 Verification:`);
  console.log(`      Original keys: ${originalKeys.length}`);
  console.log(`      Processed keys: ${processedKeys.size}`);
  console.log(`      Written keys: ${totalWrittenKeys}`);
  
  if (originalKeys.length === processedKeys.size) {
    console.log(`   ✅ All keys preserved!`);
  } else {
    console.log(`   ❌ Missing keys: ${originalKeys.filter(k => !processedKeys.has(k)).join(', ')}`);
  }
  
  return { originalKeys: originalKeys.length, processedKeys: processedKeys.size };
}

function generateIndexFile(categories: string[], locale: string): string {
  // Handle reserved keywords
  const safeImportName = (name: string) => name === 'export' ? 'exportMessages' : name;
  const imports = categories.map(c => `import ${safeImportName(c)} from './${c}.json';`).join('\n');
  const spreads = categories.map(c => `  ...${safeImportName(c)}`).join(',\n');
  
  return `// Auto-generated index file for ${locale} translations
// Do not edit manually - run scripts/i18n/split-i18n.ts to regenerate

${imports}

const messages = {
${spreads}
};

export default messages;
`;
}

function createMainIndex() {
  const content = `// Auto-generated main index file for i18n messages
// Do not edit manually - run scripts/i18n/split-i18n.ts to regenerate

import en from './en';
import zhCN from './zh-CN';

export const messages = {
  en,
  'zh-CN': zhCN,
};

export type Locale = keyof typeof messages;

export default messages;
`;
  
  fs.writeFileSync(path.join(MESSAGES_DIR, 'index.ts'), content, 'utf8');
  console.log('\n✅ Created main index.ts');
}

// Run the split
console.log('🚀 Starting i18n file split...\n');

const enResult = splitI18nFile('en');
const zhResult = splitI18nFile('zh-CN');

createMainIndex();

console.log('\n✨ Split complete!');
console.log(`   EN: ${enResult.originalKeys} → ${enResult.processedKeys} keys`);
console.log(`   ZH-CN: ${zhResult.originalKeys} → ${zhResult.processedKeys} keys`);
