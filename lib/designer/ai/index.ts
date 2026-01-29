/**
 * AI utilities for designer - Re-export all AI-related functionality
 */

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
  getAIResponsiveSuggestions,
  getAILayoutSuggestions,
  executeQuickAIAction,
  applyAISuggestions,
  getAIComponentAnalysis,
  generateTailwindClasses,
  optimizeTailwindClasses,
  generateElementContext,
  generateTreeContext,
  resetElementCache,
  getElementCacheStats,
  findElementInCode,
  buildCodeMapping,
  getElementSourceLocation,
} from './ai';

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
