/**
 * Designer utilities index - Re-export all designer utilities
 */

export {
  type DesignerTemplate,
  type TemplateCategory,
  type FrameworkType,
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
} from './templates';

export {
  type DesignerAIConfig,
  type DesignerAIResult,
  executeDesignerAIEdit,
  generateDesignerComponent,
  getDesignerAIConfig,
  cleanAICodeResponse,
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
  normalizeSandpackFiles,
  generateViteProject,
  openInCodeSandbox,
  openInStackBlitz,
  downloadAsZip,
  downloadFile,
  copyToClipboard,
  generateShareableUrl,
} from './export-utils';

export {
  CSS_VARIABLES,
  BASE_STYLES,
  TAILWIND_CDN_SCRIPT,
  TAILWIND_CONFIG,
  generateSandpackStyles,
  getSandpackExternalResources,
  generateStyleInjectionScript,
} from './tailwind-config';
