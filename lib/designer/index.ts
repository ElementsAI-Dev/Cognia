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
