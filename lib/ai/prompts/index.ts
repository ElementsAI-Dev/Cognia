/**
 * AI Prompts Index - Export all prompt templates and optimization utilities
 */

// Summary prompts
export {
  buildSummaryPrompt,
  buildKeyPointExtractionPrompt,
  buildTopicIdentificationPrompt,
  buildIncrementalSummaryPrompt,
  buildContextCompressionPrompt,
  buildConversationAnalysisPrompt,
  detectConversationLanguage,
  SUMMARY_STYLE_CONFIGS,
  SUMMARY_TEMPLATES,
  type SummaryTemplate,
} from './summary-prompts';

// A2UI prompts
export {
  A2UI_SYSTEM_PROMPT,
  A2UI_TEMPLATES,
  buildA2UIFormPrompt,
  buildA2UIDashboardPrompt,
  buildA2UIChoicePrompt,
  buildA2UIWizardPrompt,
  buildA2UIFeedbackPrompt,
  type A2UITemplate,
} from './a2ui-prompts';

// Prompt optimizer
export * from './prompt-optimizer';

// Prompt self-optimizer (analysis, A/B testing, feedback)
export * from './prompt-self-optimizer';
