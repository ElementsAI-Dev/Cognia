/**
 * Designer utilities index - Re-export all designer utilities
 */

export {
  type DesignerTemplate,
  type TemplateCategory,
  type FrameworkType,
  type CustomTemplate,
  DESIGNER_TEMPLATES,
  TEMPLATE_CATEGORIES,
  FRAMEWORK_OPTIONS,
  AI_SUGGESTIONS,
  TEMPLATE_ICONS,
  getTemplateById,
  getTemplatesByCategory,
  getTemplatesByFramework,
  getTemplatesByCategoryAndFramework,
  getDefaultTemplate,
  getRandomSuggestions,
  // Custom templates & favorites
  getCustomTemplates,
  saveCustomTemplate,
  updateCustomTemplate,
  deleteCustomTemplate,
  getFavoriteTemplateIds,
  toggleFavoriteTemplate,
  isTemplateFavorited,
  getFavoriteTemplates,
  getAllTemplates,
  searchTemplates,
  exportTemplatesAsJson,
  importTemplatesFromJson,
  duplicateTemplate,
} from './templates';

export {
  type DesignerAIConfig,
  type DesignerAIResult,
  type AISuggestionType,
  type AISuggestion,
  type AIConversationMessage,
  type QuickAIActionId,
  executeDesignerAIEdit,
  generateDesignerComponent,
  getDesignerAIConfig,
  cleanAICodeResponse,
  getAIStyleSuggestions,
  getAIAccessibilitySuggestions,
  editElementWithAI,
  continueDesignConversation,
  generateComponentVariations,
  QUICK_AI_ACTIONS,
  // New AI functions
  getAIResponsiveSuggestions,
  getAILayoutSuggestions,
  executeQuickAIAction,
  applyAISuggestions,
  getAIComponentAnalysis,
  generateTailwindClasses,
  optimizeTailwindClasses,
} from './ai';

export {
  type CDNProvider,
  type PackageInfo,
  type CDNConfig,
  type PackagePreset,
  parsePackageSpecifier,
  getCDNUrl,
  getCDNUrlWithFallback,
  batchResolveCDNUrls,
  clearCDNCache,
  getCDNCacheSize,
  generateImportMap,
  isKnownESMPackage,
  getSandpackExternalResources,
  generateSandpackDependencies,
  getPresetPackages,
  detectPackagesFromCode,
  PACKAGE_PRESETS,
} from './cdn-resolver';

export {
  type ProjectFiles,
  type ExportConfig,
  type CodeSnippet,
  normalizeSandpackFiles,
  generateViteProject,
  openInCodeSandbox,
  openInStackBlitz,
  downloadAsZip,
  downloadFile,
  copyToClipboard,
  generateShareableUrl,
  // New export functions
  createGitHubGist,
  encodeCodeForSharing,
  decodeSharedCode,
  generateCompactShareUrl,
  parseSharedUrl,
  generateEmbedCode,
  exportAsFormat,
  getQRCodeData,
  generateSocialShareLinks,
} from './export-utils';

export {
  CSS_VARIABLES,
  BASE_STYLES,
  TAILWIND_CDN_SCRIPT,
  TAILWIND_CONFIG,
  generateSandpackStyles,
  getTailwindExternalResources,
  generateStyleInjectionScript,
} from './tailwind-config';

export {
  type AIConversation,
  type CodeDiff,
  type ConversationStreamUpdate,
  createConversation,
  addUserMessage,
  continueConversation as continueAIConversation,
  streamConversation,
  getConversationSummary,
  clearConversationHistory,
} from './ai-conversation';

export {
  type CodePattern,
  type AccessibilityIssue,
  type ResponsiveIssue,
  type CodeAnalysisResult,
  detectPatternsSimple,
  detectAccessibilityIssues,
  detectResponsiveIssues,
  analyzeCodeWithAI,
  analyzeCodeLocal,
} from './ai-analyzer';

export {
  type ComponentVariant,
  type ComponentGenerationRequest,
  type GenerationResult,
  type StyleType,
  type ComponentTemplateKey,
  generateComponent,
  generateComponentVariants,
  generateVariantFromCode,
  generateComponentWithFeatures,
  generateFromTemplate,
  COMPONENT_TEMPLATES,
} from './ai-generator';

export * from './collaboration';

export * from './plugins';

export {
  parseComponentToElement,
  isContainerElement,
  isSelfClosingElement,
} from './element-parser';
