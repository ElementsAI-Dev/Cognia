/**
 * Configuration utilities for designer - Re-export templates and Tailwind config
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
  CSS_VARIABLES,
  BASE_STYLES,
  TAILWIND_CDN_SCRIPT,
  TAILWIND_CONFIG,
  generateSandpackStyles,
  getTailwindExternalResources,
  generateStyleInjectionScript,
} from './tailwind-config';
