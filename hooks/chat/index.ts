/**
 * Chat/Messages related hooks
 */

export { useMessages } from './use-messages';
export {
  useTokenCount,
  calculateTokenBreakdown,
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
  type TokenCountMethod,
} from './use-token-count';
export {
  useSummary,
  type UseSummaryOptions,
  type UseSummaryReturn,
} from './use-summary';
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
