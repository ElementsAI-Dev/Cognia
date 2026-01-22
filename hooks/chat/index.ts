/**
 * Chat/Messages related hooks
 */

export { useMessages } from './use-messages';
export {
  useTokenCount,
  calculateTokenBreakdown,
  calculateTokenBreakdownAsync,
  estimateTokens,
  estimateTokensFast,
  estimateTokensForClaude,
  countTokens,
  countTokensTiktoken,
  countChatMessageTokens,
  countConversationTokens,
  getEncodingForModel,
  getTokenCountMethod,
  getContextUtilization,
  formatTokenCount,
  type TokenBreakdown,
  type TokenCountOptions,
  type TokenCountOptionsEnhanced,
  type TokenCountMethod,
} from './use-token-count';

export { useSummary, type UseSummaryOptions, type UseSummaryReturn } from './use-summary';
export {
  useArtifactDetection,
  detectArtifactType,
  mapToArtifactLanguage,
  type DetectedArtifact,
} from './use-artifact-detection';
export {
  useTranslate,
  type UseTranslateOptions,
  type UseTranslateReturn,
  type LanguageDetectionResult,
  SUPPORTED_LANGUAGES,
} from './use-translate';
export {
  useFloatingPosition,
  type FabPosition,
  type PanelExpandDirection,
} from './use-floating-position';
export { useDraggableFab } from './use-draggable-fab';
export { useChatWidget, type UseChatWidgetReturn } from './use-chat-widget';
export {
  useWorkflowCommand,
  type WorkflowCommandResult,
  type UseWorkflowCommandOptions,
  type UseWorkflowCommandReturn,
} from './use-workflow-command';
export { useIntentDetection } from './use-intent-detection';
export {
  useFeatureRouting,
  type UseFeatureRoutingOptions,
  type UseFeatureRoutingReturn,
} from './use-feature-routing';
