/**
 * Providers index - exports all provider components
 *
 * Provider Hierarchy (from outermost to innermost):
 * 1. ErrorBoundaryProvider - Catches React errors
 * 2. LoggerProvider - Centralized logging
 * 3. CacheProvider - Performance optimization
 * 4. AudioProvider - Voice/audio features
 * 5. ProviderProvider - Unified AI provider state
 * 6. WebSocketProvider - Real-time connections (optional)
 * 7. I18nProvider - Internationalization
 * 8. ThemeProvider - Theme management
 * 9. TooltipProvider - UI tooltips
 * 10. SkillProvider - Built-in skills
 * 11. NativeProvider - Desktop functionality
 * 12. OnboardingProvider - Setup wizard
 */

// Core providers
export { NativeProvider, type NativeProviderProps } from './native-provider';
export {
  SkillProvider,
  useInitializeSkills,
  initializeSkillsSync,
} from './skill-provider';

// Error handling
export {
  ErrorBoundaryProvider,
  type ErrorBoundaryProviderProps,
  type ErrorBoundaryState,
  useErrorBoundary,
} from './error-boundary-provider';

// Logging
export {
  LoggerProvider,
  useLogger,
  useLog,
  type LoggerConfig,
  type LogEntry,
  type LogTransport,
  type LogLevel,
} from './logger-provider';

// Caching
export {
  CacheProvider,
  useCache,
  useCachedAsync,
  useCachedValue,
  type CacheConfig,
  type CacheStats,
} from './cache-provider';

// Audio/Speech
export {
  AudioProvider,
  useAudio,
  useSpeechToText,
  useTextToSpeech,
  type RecordingState,
  type PlaybackState,
  type SpeechRecognitionResult,
  type RecordingOptions,
  // Type definitions
  type ISpeechRecognition,
  type ISpeechRecognitionErrorEvent,
  type ISpeechRecognitionEvent,
  type ISpeechRecognitionResult,
  type ISpeechRecognitionAlternative,
  type SpeechRecognitionResultList,
  // Type guards
  isSpeechRecognitionSupported,
  getSpeechRecognition,
  isSpeechSynthesisSupported,
} from './audio-provider';

// WebSocket
export {
  WebSocketProvider,
  useWebSocket,
  useWebSocketMessage,
  useWebSocketState,
  type ConnectionState,
  type WebSocketConfig,
  type WebSocketMessage,
  type WebSocketEventHandler,
  type WebSocketEventType,
} from './websocket-provider';

// Provider management
export {
  ProviderProvider,
  useProviderContext,
  useProvider,
  useAvailableProviders,
  useProviderModels,
  type ProviderContextValue,
  type EnhancedProvider,
  type ProviderMetadata,
  type ProviderHealth,
  type ProviderHealthStatus,
} from './provider-context';

// Locale initialization
export { LocaleInitializer } from './locale-initializer';

// Secure storage
export {
  StrongholdProvider,
  useStrongholdContext,
  useStrongholdOptional,
} from './stronghold-provider';
