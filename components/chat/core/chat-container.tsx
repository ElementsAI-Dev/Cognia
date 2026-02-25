'use client';

/**
 * ChatContainer — the central chat orchestrator for Cognia.
 *
 * This module wires together every major chat subsystem:
 *
 * - **AI streaming** via Vercel AI SDK (`useAIChat`) with 14+ provider backends
 * - **Agent mode** multi-step tool execution (`useAgent`)
 * - **Auto-routing** that selects the optimal model per message (`useAutoRouter`)
 * - **Message persistence** to IndexedDB through `useMessages` (branch-aware)
 * - **Plugin lifecycle hooks** (pre-send, post-receive, regenerate, edit)
 * - **Web search** with multi-provider fallback and source verification
 * - **Skill injection** via Progressive Disclosure into the system prompt
 * - **MCP tool execution** for inline `@tool` mentions
 * - **Multimodal support** (vision, audio, video) with per-model capability checks
 * - **Learning / research mode** with Socratic-method prompt injection
 * - **Project knowledge-base RAG** context injection
 * - **A2UI content** detection and rendering in assistant messages
 * - **Artifact auto-creation** from AI response code blocks
 * - **Streaming chunk coalescing** to reduce React render churn (~75 ms flush)
 * - **View modes**: list (default), flow canvas, arena, multi-column
 *
 * Exported components in this file:
 * - {@link ChatContainer} — top-level exported component (named + default)
 * - {@link MessagePartsRenderer} — renders structured message parts (text, reasoning, tool, sources, A2UI)
 * - {@link ChatMessageItem} — single message row with actions (edit, copy, bookmark, TTS, translate, share, react)
 * - {@link VirtualizedChatMessageList} — windowed message list using `react-virtuoso` with infinite scroll
 *
 * @module chat-container
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';

import { useTranslations } from 'next-intl';

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';

import { ErrorMessage } from '../message';
import { VirtualizedChatMessageList } from './virtualized-message-list';
import { ChatHeader } from './chat-header';
import { PluginExtensionPoint } from '@/components/plugin/extension';
import { ChatInput, type Attachment } from '../chat-input';
import { QuickReplyBar } from '../ui/quick-reply-bar';
import { WorkflowIndicator, type WorkflowStatus } from '../ui/workflow-indicator';
import { useKeyboardShortcuts } from '../ui/keyboard-shortcuts-handler';
import {
  type AISettings,
} from '../dialogs';
import { ChatDialogs } from '../dialogs/chat-dialogs';


import { ArenaChatView } from '@/components/arena';
import { MultiColumnChat } from './multi-column-chat';
import {
  type WorkflowResultData,
  type WorkflowExecutionStatus,
} from '../workflow/workflow-result-card';
import { WelcomeState } from '../welcome/welcome-state';
import { CarriedContextBanner } from '../ui/carried-context-banner';
import { ChatGoalBanner } from '../goal';
import { QuotedContent } from '../message';
import { useA2UIMessageIntegration } from '@/components/a2ui';
import { Suggestions, Suggestion } from '@/components/ai-elements/suggestion';
import {
  runPluginPreChatHook,
  buildMessageContent,
  buildEnhancedSystemPrompt,
  processPostResponse,
} from '@/lib/ai/chat/send-pipeline';
import {
  type ToolExecution,
  type ToolApprovalRequest,
  ExternalAgentCommands,
  ExternalAgentConfigOptions,
  ExternalAgentPlan,
} from '@/components/agent';

import { SkillSuggestions } from '@/components/skills';

import { useSkillStore } from '@/stores/skills';
import { findMatchingSkills } from '@/lib/skills/executor';
import { useWorkflowStore } from '@/stores/workflow';
import {
  initializeAgentTools,
  filterToolsForMode,
  convertMcpToolToAgentTool,
} from '@/lib/ai/agent';
import {
  useCustomModeStore,
  processPromptTemplateVariables,
} from '@/stores/agent/custom-mode-store';
import {
  generateSuggestions,
  getDefaultSuggestions,
  type GeneratedSuggestion,
} from '@/lib/ai/generation/suggestion-generator';
import { translateText } from '@/lib/ai/generation/translate';
import type { SearchResponse, SearchResult } from '@/types/search';

import { useSourceVerification } from '@/hooks/search/use-source-verification';
import {
  useSessionStore,
  useSettingsStore,
  usePresetStore,
  useMcpStore,
  useAgentStore,
  useProjectStore,
  useQuoteStore,
  useLearningStore,
  useArtifactStore,
  useExternalAgentStore,
} from '@/stores';




import {
  useMessages,
  useAgent,
  useExternalAgent,
  useProjectContext,
  calculateTokenBreakdown,
} from '@/hooks';
import { useIntentDetection } from '@/hooks/chat/use-intent-detection';
import { useFeatureRouting } from '@/hooks/chat/use-feature-routing';
import { useTTS } from '@/hooks/media/use-tts';


import type { ParsedToolCall, ToolCallResult } from '@/types/mcp';
import { getModelMaxTokens } from '@/lib/ai/model-limits';
import { compressMessages } from '@/lib/ai/embedding/compression';
import { loggers } from '@/lib/logger';

import {
  useAIChat,
  useAutoRouter,
  type ProviderName,
  normalizeLearningToolName,
  isVisionModel,
  buildMultimodalContent,
  type MultimodalMessage,
  isAudioModel,
  isVideoModel,
} from '@/lib/ai';
import { buildExternalAgentInstructionStack } from '@/lib/ai/instructions/external-agent-instruction-stack';
import {
  registerExternalAgentCommands,
  unregisterExternalAgentCommands,
} from '@/lib/chat/slash-command-registry';
import {
  analyzeLearnerResponse,
  detectPhaseTransition,
  extractSubQuestions,
  isLearningModeV2Enabled,
} from '@/lib/learning';
import { detectSpeedLearningMode, isSpeedLearningIntent } from '@/lib/learning/speedpass';
import { RoutingIndicator } from '../ui/routing-indicator';

import type { ModelSelection } from '@/types/provider/auto-router';
import { messageRepository } from '@/lib/db';
import { PROVIDERS } from '@/types/provider';
import type { ChatMode, UIMessage, ChatViewMode } from '@/types';
import type { ToolInvocationPart } from '@/types/core/message';
import type { AcpPermissionOption, AcpPermissionResponse, AcpMcpServerConfig } from '@/types/agent/external-agent';
import { getPluginEventHooks, getPluginLifecycleHooks } from '@/lib/plugin';
import { toast } from 'sonner';
import { useSummary } from '@/hooks/chat';
import { FlowChatCanvas } from '../flow';
import { ErrorBoundaryProvider } from '@/components/providers/core/error-boundary-provider';
import type { AgentModeConfig } from '@/types/agent/agent-mode';

const log = loggers.chat;

function resolveSpeedPassTargetScore(mode: 'extreme' | 'speed' | 'comprehensive'): number {
  switch (mode) {
    case 'extreme':
      return 60;
    case 'speed':
      return 75;
    case 'comprehensive':
      return 85;
  }
}

/**
 * Props for the {@link ChatContainer} component.
 */
interface ChatContainerProps {
  /**
   * Optional chat session ID to bind to.
   * When provided, the component loads the existing session from the store.
   * When omitted, the component uses the store's `activeSessionId` or creates
   * a new session on first message send.
   */
  sessionId?: string;
}

/**
 * Top-level chat orchestrator that manages the full lifecycle of a conversation.
 *
 * Responsibilities:
 * 1. **Session management** — resolves or creates a chat session, manages view mode (list / flow / arena / multi-column).
 * 2. **Message send pipeline** — builds the enhanced system prompt (project RAG, skills, search results, learning mode,
 *    carried context, plugin hooks, thinking instructions), then dispatches to `useAIChat` (chat/research) or `useAgent` (agent).
 * 3. **Streaming** — coalesces token chunks via a 75 ms flush buffer to reduce React re-renders.
 * 4. **Post-response processing** — auto-creates artifacts, detects analysis results (math blocks), processes A2UI content,
 *    tracks skill usage, generates follow-up suggestions.
 * 5. **UI composition** — renders header, goal banner, error state, conversation view, suggestions bar, quick replies,
 *    workflow indicators, chat input, and a suite of dialogs (model picker, AI settings, context settings, presets,
 *    prompt optimizer, arena, learning, source verification, mode switch confirmation).
 *
 * @param props - {@link ChatContainerProps}
 *
 * @example
 * ```tsx
 * // Bind to a specific session
 * <ChatContainer sessionId="abc-123" />
 *
 * // Use the active session from the store
 * <ChatContainer />
 * ```
 */
export function ChatContainer({ sessionId }: ChatContainerProps) {
  const _t = useTranslations('chat');
  const _tCommon = useTranslations('common');
  const setActiveSession = useSessionStore((state) => state.setActiveSession);
  const getSession = useSessionStore((state) => state.getSession);
  const _getActiveSession = useSessionStore((state) => state.getActiveSession);
  const createSession = useSessionStore((state) => state.createSession);
  const updateSession = useSessionStore((state) => state.updateSession);
  // Subscribe to sessions and activeSessionId to trigger re-renders when they change
  const sessions = useSessionStore((state) => state.sessions);
  const storeActiveSessionId = useSessionStore((state) => state.activeSessionId);

  const session = useMemo(() => {
    if (sessionId) {
      return sessions.find((s) => s.id === sessionId);
    }
    return sessions.find((s) => s.id === storeActiveSessionId);
  }, [sessionId, sessions, storeActiveSessionId]);

  const activeSessionId = session?.id || null;
  const activeBranchId = session?.activeBranchId;

  // View mode state (list or flow canvas)
  const getViewMode = useSessionStore((state) => state.getViewMode);
  const setViewMode = useSessionStore((state) => state.setViewMode);
  const getFlowCanvasState = useSessionStore((state) => state.getFlowCanvasState);
  const updateFlowCanvasState = useSessionStore((state) => state.updateFlowCanvasState);
  const getBranches = useSessionStore((state) => state.getBranches);

  const setSelectedNodes = useSessionStore((state) => state.setSelectedNodes);

  const viewMode: ChatViewMode = activeSessionId ? getViewMode(activeSessionId) : 'list';
  const flowCanvasState = activeSessionId ? getFlowCanvasState(activeSessionId) : undefined;
  const branches = activeSessionId ? getBranches(activeSessionId) : [];

  const handleViewModeChange = useCallback(
    (mode: ChatViewMode) => {
      if (activeSessionId) {
        setViewMode(activeSessionId, mode);
      }
    },
    [activeSessionId, setViewMode]
  );

  // Project context for knowledge base integration
  const getProject = useProjectStore((state) => state.getProject);
  const projectContext = useProjectContext(
    session?.projectId,
    undefined, // Query will be set dynamically when sending
    { maxContextLength: 6000, useRelevanceFiltering: true }
  );

  // Quote store for text selection and referencing
  const getFormattedQuotes = useQuoteStore((state) => state.getFormattedQuotes);
  const clearQuotes = useQuoteStore((state) => state.clearQuotes);

  // Skill store for active skills injection and auto-matching
  const getActiveSkills = useSkillStore((state) => state.getActiveSkills);
  const skillStoreSkills = useSkillStore((state) => state.skills);
  const skillStoreActiveIds = useSkillStore((state) => state.activeSkillIds);
  const activateSkill = useSkillStore((state) => state.activateSkill);
  const recordSkillUsage = useSkillStore((state) => state.recordSkillUsage);

  // Learning store for Socratic method learning mode
  const getLearningSessionByChat = useLearningStore((state) => state.getLearningSessionByChat);
  const addLearningSubQuestion = useLearningStore((state) => state.addSubQuestion);
  const incrementLearningAttempts = useLearningStore((state) => state.incrementAttempts);
  const setLearningPhase = useLearningStore((state) => state.setPhase);
  const updateLearningEngagement = useLearningStore((state) => state.updateEngagement);
  const recordLearningAnswer = useLearningStore((state) => state.recordAnswer);
  const endLearningSession = useLearningStore((state) => state.endLearningSession);

  // Artifact store for auto-creating artifacts from AI responses
  const autoCreateFromContent = useArtifactStore((state) => state.autoCreateFromContent);
  const addAnalysisResult = useArtifactStore((state) => state.addAnalysisResult);

  // A2UI message integration for processing A2UI content from AI responses
  const { processMessage: processA2UIMessage } = useA2UIMessageIntegration();

  // Message persistence with IndexedDB (branch-aware)
  const {
    messages,
    isLoading: _isLoadingMessages,
    isInitialized,
    hasOlderMessages,
    isLoadingOlder,
    loadOlderMessages,
    addMessage,
    updateMessage,
    deleteMessagesAfter,
    clearMessages: _clearMessages,
    appendToMessage,
    createStreamingMessage,
    copyMessagesForBranch,
  } = useMessages({
    sessionId: activeSessionId,
    branchId: activeBranchId,
    onError: (err) => setError(err.message),
  });

  // Settings store for API keys and global defaults
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const speechSettings = useSettingsStore((state) => state.speechSettings);
  const defaultTemperature = useSettingsStore((state) => state.defaultTemperature);
  const defaultMaxTokens = useSettingsStore((state) => state.defaultMaxTokens);
  const defaultTopP = useSettingsStore((state) => state.defaultTopP);
  const defaultFrequencyPenalty = useSettingsStore((state) => state.defaultFrequencyPenalty);
  const defaultPresencePenalty = useSettingsStore((state) => state.defaultPresencePenalty);
  const addAlwaysAllowedTool = useSettingsStore((state) => state.addAlwaysAllowedTool);
  const simplifiedModeSettings = useSettingsStore((state) => state.simplifiedModeSettings);
  const customInstructionsEnabled = useSettingsStore((state) => state.customInstructionsEnabled);
  const aboutUser = useSettingsStore((state) => state.aboutUser);
  const responsePreferences = useSettingsStore((state) => state.responsePreferences);
  const globalCustomInstructions = useSettingsStore((state) => state.customInstructions);
  const isSimplifiedMode = simplifiedModeSettings.enabled;
  const externalChatFailurePolicy = useExternalAgentStore((state) => state.chatFailurePolicy);

  // Local state
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const autoPlayedMessageIdsRef = useRef<Set<string>>(new Set());
  const autoPlayInitializedRef = useRef(false);
  const { speak: speakChatReply } = useTTS({ source: 'chat' });

  // Derive streaming message ID for flow canvas
  const streamingMessageId = useMemo(() => {
    if (!isStreaming || messages.length === 0) return undefined;
    const lastMsg = messages[messages.length - 1];
    return lastMsg.role === 'assistant' ? lastMsg.id : undefined;
  }, [isStreaming, messages]);

  useEffect(() => {
    autoPlayedMessageIdsRef.current.clear();
    autoPlayInitializedRef.current = false;
  }, [activeSessionId, activeBranchId]);

  useEffect(() => {
    if (!autoPlayInitializedRef.current) {
      if (!isInitialized) return;
      for (const message of messages) {
        if (message.role !== 'assistant') continue;
        if (!message.content?.trim()) continue;
        autoPlayedMessageIdsRef.current.add(message.id);
      }
      autoPlayInitializedRef.current = true;
    }

    if (!speechSettings.ttsEnabled || !speechSettings.ttsAutoPlay || isStreaming || isLoading) {
      return;
    }

    const latestAssistant = [...messages]
      .reverse()
      .find((message) => {
        if (message.role !== 'assistant') return false;
        if (!message.content?.trim()) return false;
        if (message.id.startsWith('translation-')) return false;
        if (message.id.startsWith('workflow-')) return false;
        return true;
      });

    if (!latestAssistant) return;
    if (autoPlayedMessageIdsRef.current.has(latestAssistant.id)) return;

    autoPlayedMessageIdsRef.current.add(latestAssistant.id);
    void speakChatReply(latestAssistant.content).catch(() => {});
  }, [
    isLoading,
    isStreaming,
    messages,
    speakChatReply,
    speechSettings.ttsAutoPlay,
    speechSettings.ttsEnabled,
    isInitialized,
  ]);

  // New feature states
  const [showPromptOptimizer, setShowPromptOptimizer] = useState(false);
  const [showPromptOptimizationHub, setShowPromptOptimizationHub] = useState(false);
  const [suggestions, setSuggestions] = useState<GeneratedSuggestion[]>([]);
  const [_isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Preset states
  const [showPresetManager, setShowPresetManager] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const trackPresetUsage = usePresetStore((state) => state.usePreset);
  const getPreset = usePresetStore((state) => state.getPreset);
  const activePreset = session?.presetId ? getPreset(session.presetId) : null;

  // Workflow states
  const [showWorkflowSelector, setShowWorkflowSelector] = useState(false);
  const [showWorkflowPicker, setShowWorkflowPicker] = useState(false);

  // Arena states
  const [showArenaDialog, setShowArenaDialog] = useState(false);
  const [showArenaBattle, setShowArenaBattle] = useState(false);
  const [arenaBattleId, setArenaBattleId] = useState<string | null>(null);
  const [showPPTPreview, setShowPPTPreview] = useState(false);
  const [workflowResults, setWorkflowResults] = useState<Map<string, WorkflowResultData>>(
    new Map()
  );

  // Active workflow indicator state
  const [activeWorkflow, setActiveWorkflow] = useState<{
    id: string;
    name: string;
    icon?: string;
    status: WorkflowStatus;
    progress: number;
    currentStep?: string;
  } | null>(null);

  // Learning mode states
  const [showLearningPanel, setShowLearningPanel] = useState(false);
  const learningPanelRef = useRef<HTMLDivElement>(null);
  const [showLearningStartDialog, setShowLearningStartDialog] = useState(false);
  const workflowPresentations = useWorkflowStore((state) => state.presentations);
  const activePresentationId = useWorkflowStore((state) => state.activePresentationId);
  const activePresentation = activePresentationId
    ? workflowPresentations[activePresentationId]
    : null;

  // Context settings states
  const [showContextSettings, setShowContextSettings] = useState(false);
  const [showContextDebug, setShowContextDebug] = useState(false);
  const [contextLimitPercent, setContextLimitPercent] = useState(50);
  const [showMemoryActivation, setShowMemoryActivation] = useState(false);
  const [showTokenUsageMeter, setShowTokenUsageMeter] = useState(true);

  // AI settings dialog state
  const [showAISettings, setShowAISettings] = useState(false);

  // Auto-routing state
  const [lastRoutingSelection, setLastRoutingSelection] = useState<ModelSelection | null>(null);
  const [showRoutingIndicator, setShowRoutingIndicator] = useState(false);
  const autoRouterSettings = useSettingsStore((state) => state.autoRouterSettings);

  // Chat history context settings
  const chatHistoryContextSettings = useSettingsStore((state) => state.chatHistoryContextSettings);

  // Compression settings
  const compressionSettings = useSettingsStore((state) => state.compressionSettings);

  // Clear context confirmation dialog state
  const [showClearContextConfirm, setShowClearContextConfirm] = useState(false);

  // Mode switch confirmation dialog state
  const [showModeSwitchDialog, setShowModeSwitchDialog] = useState(false);
  const [pendingTargetMode, setPendingTargetMode] = useState<ChatMode | null>(null);

  // Feature routing hook for intent-based navigation
  const {
    hasPendingSuggestion: hasFeatureRoutingSuggestion,
    pendingFeature,
    pendingMessage: featureRoutingMessage,
    detectionResult: featureDetectionResult,
    checkFeatureIntent,
    confirmNavigation: confirmFeatureNavigation,
    continueInChat: continueFeatureInChat,
    dismissSuggestion: dismissFeatureRouting,
  } = useFeatureRouting();

  // Streaming chunk coalescing (reduces render churn during token streaming)
  const streamBufferRef = useRef<{ messageId: string; buffer: string } | null>(null);
  const streamFlushTimerRef = useRef<NodeJS.Timeout | null>(null);
  const permissionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /** Flush any buffered streaming tokens to the message store immediately. */
  const flushStreamBuffer = useCallback(() => {
    if (streamFlushTimerRef.current) {
      clearTimeout(streamFlushTimerRef.current);
      streamFlushTimerRef.current = null;
    }

    const pending = streamBufferRef.current;
    if (!pending || !pending.buffer) return;

    const { messageId, buffer } = pending;
    streamBufferRef.current = { messageId, buffer: '' };
    appendToMessage(messageId, buffer);
  }, [appendToMessage]);

  // Source verification hook
  const sourceVerification = useSourceVerification();

  // Model picker dialog state
  const [showModelPicker, setShowModelPicker] = useState(false);

  // MCP store for tool execution
  const mcpCallTool = useMcpStore((state) => state.callTool);
  const mcpServers = useMcpStore((state) => state.servers);
  const mcpInitialize = useMcpStore((state) => state.initialize);
  const mcpIsInitialized = useMcpStore((state) => state.isInitialized);

  // Initialize MCP store - only run once on mount
  useEffect(() => {
    if (!mcpIsInitialized) {
      mcpInitialize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const externalAcpMcpServers = useMemo<AcpMcpServerConfig[]>(() => {
    return mcpServers
      .filter((server) => server.status.type === 'connected')
      .map((server) => {
        if (server.config.connectionType === 'sse' && server.config.url) {
          return {
            type: 'sse',
            name: server.name,
            url: server.config.url,
          } as AcpMcpServerConfig;
        }
        return {
          name: server.name,
          command: server.config.command,
          args: server.config.args || [],
          env: Object.entries(server.config.env || {}).map(([name, value]) => ({ name, value })),
        } as AcpMcpServerConfig;
      });
  }, [mcpServers]);

  // Feature toggles from session
  const webSearchEnabled = session?.webSearchEnabled ?? false;
  const thinkingEnabled = session?.thinkingEnabled ?? false;

  // Current mode
  const currentMode: ChatMode = session?.mode || 'chat';

  // Agent sub-mode (when in agent mode)
  const agentModeId = session?.agentModeId || 'general';

  // Mode switch function
  const switchMode = useSessionStore((state) => state.switchMode);
  const switchModeWithNewSession = useSessionStore((state) => state.switchModeWithNewSession);

  // Settings for AI summary generation
  const openaiSettings = providerSettings?.openai;
  const { generateChatSummary } = useSummary({
    useAI: !!openaiSettings?.apiKey,
    aiConfig: openaiSettings?.apiKey
      ? {
          provider: 'openai',
          model: openaiSettings.defaultModel || 'gpt-4o-mini',
          apiKey: openaiSettings.apiKey,
        }
      : undefined,
  });

  // Intent detection for mode switching suggestions (enabled in all modes)
  const {
    detectionResult,
    showSuggestion,
    checkIntent,
    acceptSuggestion,
    dismissSuggestion,
    keepCurrentMode,
    resetSuggestion: _resetSuggestion,
  } = useIntentDetection({
    currentMode,
    enabled: true, // Enable in all modes for bidirectional suggestions
    maxSuggestionsPerSession: 3,
    onModeSwitch: (mode) => {
      if (activeSessionId) {
        switchMode(activeSessionId, mode);
      }
    },
  });

  // Auto router for intelligent model selection
  const { selectModel, getAvailableModels } = useAutoRouter();

  // Determine effective provider/model (considering auto mode)
  const currentProvider = session?.provider || 'openai';
  const currentModel = session?.model || PROVIDERS[currentProvider]?.defaultModel || 'gpt-4o';
  const isAutoMode = currentProvider === 'auto';

  // For auto mode, we'll select the model when sending a message
  // For now, use a default for the hook
  const effectiveProvider = useMemo(() => {
    if (isAutoMode) {
      return 'openai' as ProviderName; // Default, will be overridden per message
    }
    return currentProvider as ProviderName;
  }, [isAutoMode, currentProvider]);

  const effectiveModel = useMemo(() => {
    if (isAutoMode) {
      return 'gpt-4o'; // Default, will be overridden per message
    }
    return currentModel;
  }, [isAutoMode, currentModel]);

  /**
   * Token usage breakdown (system, user, assistant, context) computed via
   * `calculateTokenBreakdown`. Uses tiktoken for OpenAI models, heuristic for others.
   */
  const estimatedTokens = useMemo(() => {
    // Get system prompt from session
    const systemPrompt = session?.systemPrompt || '';

    // Calculate token breakdown with provider info for accurate counting
    const breakdown = calculateTokenBreakdown(messages, {
      systemPrompt,
      provider: currentProvider,
      model: currentModel,
    });

    return {
      contextTokens: breakdown.contextTokens,
      systemTokens: breakdown.systemTokens,
      totalTokens: breakdown.totalTokens,
      userTokens: breakdown.userTokens,
      assistantTokens: breakdown.assistantTokens,
      messageTokens: breakdown.messageTokens,
      method: breakdown.method,
      isExact: breakdown.isExact,
    };
  }, [messages, session?.systemPrompt, currentProvider, currentModel]);

  /** Maximum context window size for the current model (falls back to 100 000). */
  const modelMaxTokens = useMemo(() => {
    return getModelMaxTokens(currentModel);
  }, [currentModel]);

  /** Context usage as a 0–100 percentage relative to the user-configured context limit. */
  const contextUsagePercent = useMemo(() => {
    const limit = Math.round((contextLimitPercent / 100) * modelMaxTokens);
    return limit > 0 ? Math.min(100, Math.round((estimatedTokens.totalTokens / limit) * 100)) : 0;
  }, [estimatedTokens.totalTokens, contextLimitPercent, modelMaxTokens]);

  // Handle context optimization via compression engine
  const handleOptimizeContext = useCallback(async () => {
    if (messages.length === 0) return;

    const result = await compressMessages(messages, compressionSettings);
    if (result.success && result.messagesCompressed > 0) {
      log.info('Context optimized', {
        compressed: result.messagesCompressed,
        ratio: result.compressionRatio.toFixed(2),
        tokensBefore: result.tokensBefore,
        tokensAfter: result.tokensAfter,
      });
    }
  }, [messages, compressionSettings]);

  // Input ref for keyboard shortcuts
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // AI Chat hook
  const { sendMessage: aiSendMessage, stop: aiStop } = useAIChat({
    provider: effectiveProvider,
    model: effectiveModel,
    onStreamStart: () => setIsStreaming(true),
    onStreamEnd: () => setIsStreaming(false),
    onError: (err) => {
      console.error('AI Error:', err);
      setError(err.message);
    },
  });

  // Agent store for plan and tool execution state
  const _isAgentRunning = useAgentStore((state) => state.isAgentRunning);
  const agentToolExecutions = useAgentStore((state) => state.toolExecutions);
  const addToolExecution = useAgentStore((state) => state.addToolExecution);
  const completeToolExecution = useAgentStore((state) => state.completeToolExecution);
  const failToolExecution = useAgentStore((state) => state.failToolExecution);

  // Agent tool approval state
  const [toolApprovalRequest, setToolApprovalRequest] = useState<ToolApprovalRequest | null>(null);
  const [showToolApproval, setShowToolApproval] = useState(false);
  const pendingApprovalRef = useRef<{
    resolve: (approved: boolean) => void;
    reject: (error: Error) => void;
  } | null>(null);

  // Get custom mode configuration for tool filtering
  const customModes = useCustomModeStore((state) => state.customModes);
  const currentCustomMode = useMemo(() => {
    if (currentMode !== 'agent' || !agentModeId) return null;
    return customModes[agentModeId] || null;
  }, [currentMode, agentModeId, customModes]);

  /**
   * Full set of agent tools initialised from available API keys and search providers.
   * Includes web search, calculator, RAG, web scraper, document, academic, image, PPT,
   * and learning tools — each gated on the presence of its required API key.
   */
  const {
    searchProviders: agentSearchProviders = {},
    defaultSearchProvider: agentDefaultSearchProvider,
  } = useSettingsStore();
  const enableRAGSearch = useSettingsStore((state) => state.enableRAGSearch);
  const learningModeV2Enabled = useMemo(() => isLearningModeV2Enabled(), []);
  const allAgentTools = useMemo(() => {
    const tavilyApiKey = providerSettings.tavily?.apiKey;
    const openaiApiKey = providerSettings.openai?.apiKey;
    const hasEnabledSearchProvider = Object.values(
      (agentSearchProviders || {}) as Record<string, { enabled?: boolean; apiKey?: string }>
    ).some((p) => p.enabled && p.apiKey);
    return initializeAgentTools({
      tavilyApiKey,
      openaiApiKey,
      searchProviders: hasEnabledSearchProvider ? agentSearchProviders : undefined,
      defaultSearchProvider: agentDefaultSearchProvider,
      enableWebSearch: hasEnabledSearchProvider || !!tavilyApiKey,
      enableCalculator: true,
      enableRAGSearch,
      enableWebScraper: true,
      enableDocumentTools: true,
      enableAcademicTools: true,
      enableImageTools: !!openaiApiKey,
      enablePPTTools: true,
      enableLearningTools: true,
    });
  }, [providerSettings.tavily?.apiKey, providerSettings.openai?.apiKey, agentSearchProviders, agentDefaultSearchProvider, enableRAGSearch]);

  const learningChatTools = useMemo(() => {
    if (!learningModeV2Enabled) {
      return undefined;
    }
    const tools = Object.entries(allAgentTools).filter(([name]) => name.startsWith('display_'));
    if (tools.length === 0) {
      return undefined;
    }
    return Object.fromEntries(tools);
  }, [allAgentTools, learningModeV2Enabled]);

  /**
   * MCP-based tools selected by the current custom agent mode.
   * Each MCP tool reference is resolved against connected MCP servers and
   * converted to the agent-tool interface via `convertMcpToolToAgentTool`.
   */
  const customModeMcpTools = useMemo(() => {
    if (!currentCustomMode?.mcpTools || currentCustomMode.mcpTools.length === 0) {
      return {};
    }
    // Filter MCP servers to only include tools selected in custom mode
    const selectedMcpTools: Record<string, (typeof allAgentTools)[string]> = {};
    for (const mcpToolRef of currentCustomMode.mcpTools) {
      const server = mcpServers.find((s) => s.id === mcpToolRef.serverId);
      if (server?.status.type === 'connected') {
        // Find the tool definition from the server
        const mcpTool = server.tools?.find((t) => t.name === mcpToolRef.toolName);
        if (mcpTool) {
          // Use the proper conversion function
          const agentTool = convertMcpToolToAgentTool(mcpToolRef.serverId, server.name, mcpTool, {
            callTool: mcpCallTool,
          });
          selectedMcpTools[agentTool.name] = agentTool;
        }
      }
    }
    return selectedMcpTools;
  }, [currentCustomMode?.mcpTools, mcpServers, mcpCallTool]);

  /**
   * Final set of tools available to the agent: built-in tools filtered by
   * custom mode configuration, merged with custom-mode MCP tools.
   */
  const agentTools = useMemo(() => {
    let tools = allAgentTools;
    if (currentCustomMode?.tools && currentCustomMode.tools.length > 0) {
      tools = filterToolsForMode(allAgentTools, currentCustomMode.tools);
    }
    // Merge with custom mode MCP tools
    return { ...tools, ...customModeMcpTools };
  }, [allAgentTools, currentCustomMode, customModeMcpTools]);

  const baseAgentPrompt = useMemo(() => {
    const basePrompt =
      session?.systemPrompt || 'You are a helpful AI assistant with access to tools.';
    if (!currentCustomMode) {
      return basePrompt;
    }
    return processPromptTemplateVariables(basePrompt, {
      modeName: currentCustomMode.name,
      modeDescription: currentCustomMode.description,
      tools: currentCustomMode.tools,
    });
  }, [session?.systemPrompt, currentCustomMode]);

  const activeSkills = useMemo(() => {
    void skillStoreActiveIds;
    return getActiveSkills();
  }, [getActiveSkills, skillStoreActiveIds]);

  const activeProject = useMemo(
    () => (session?.projectId ? getProject(session.projectId) : undefined),
    [session?.projectId, getProject]
  );

  const agentInstructionStack = useMemo(() => {
    return buildExternalAgentInstructionStack({
      baseSystemPrompt: baseAgentPrompt,
      customInstructionsEnabled,
      aboutUser,
      responsePreferences,
      customInstructions: globalCustomInstructions,
      activeSkills,
      project: activeProject,
      workingDirectory: session?.virtualEnvPath,
    });
  }, [
    baseAgentPrompt,
    customInstructionsEnabled,
    aboutUser,
    responsePreferences,
    globalCustomInstructions,
    activeSkills,
    activeProject,
    session?.virtualEnvPath,
  ]);

  // Agent hook for multi-step execution
  const {
    isRunning: isAgentExecuting,
    currentStep: _agentCurrentStep,
    error: _agentError,
    toolCalls: _agentToolCalls,
    run: runAgent,
    stop: stopAgent,
    reset: _resetAgent,
  } = useAgent({
    systemPrompt: agentInstructionStack.systemPrompt,
    maxSteps: 10,
    temperature: session?.temperature ?? 0.7,
    tools: agentTools,
    // Context-aware features
    enableContextFiles: true,
    injectContextTools: true,
    enableSystemContext: true,
    onStepStart: (step) => {
      console.log(`Agent step ${step} started`);
    },
    onStepComplete: (step, response, toolCalls) => {
      console.log(`Agent step ${step} completed:`, response, toolCalls);
    },
    onToolCall: (toolCall) => {
      console.log('Tool call:', toolCall);
      addToolExecution({
        id: toolCall.id,
        toolName: toolCall.name,
        input: toolCall.args,
        status: 'running',
        state: 'input-available',
      });
    },
    onToolResult: (toolCall) => {
      console.log('Tool result:', toolCall);
      if (toolCall.status === 'completed') {
        completeToolExecution(toolCall.id, toolCall.result);
      } else if (toolCall.status === 'error') {
        failToolExecution(toolCall.id, toolCall.error || 'Tool execution failed');
      }
    },
  });

  const {
    execute: executeExternalAgent,
    setActiveAgent: setActiveExternalAgent,
    checkHealth: checkExternalAgentHealth,
    connect: connectExternalAgent,
    cancel: cancelExternalAgent,
    pendingPermission: pendingExternalPermission,
    respondToPermission: respondToExternalPermission,
    availableCommands: externalAvailableCommands,
    planEntries: externalPlanEntries,
    planStep: externalPlanStep,
    configOptions: externalConfigOptions,
    setConfigOption: setExternalConfigOption,
    isExecuting: isExternalAgentExecuting,
  } = useExternalAgent();

  const mapAcpOptions = useCallback(
    (options?: AcpPermissionOption[]) =>
      options?.map((option) => ({
        optionId: option.optionId,
        name: option.name,
        kind: option.kind,
        description: option.description,
        isDefault: option.isDefault,
      })),
    []
  );

  const resolvePermissionRequestId = useCallback((): string => {
    if (!pendingExternalPermission) {
      return '';
    }
    return pendingExternalPermission.requestId || pendingExternalPermission.id;
  }, [pendingExternalPermission]);

  const pickAllowOptionId = useCallback((options?: AcpPermissionOption[]): string | undefined => {
    if (!options?.length) {
      return undefined;
    }
    const preferred =
      options.find((option) => option.kind === 'allow_always') ||
      options.find((option) => option.kind === 'allow_once');
    return preferred?.optionId;
  }, []);

  useEffect(() => {
    if (!pendingExternalPermission) {
      if (toolApprovalRequest?.acpOptions) {
        setToolApprovalRequest(null);
        setShowToolApproval(false);
      }
      return;
    }

    const nextRequest: ToolApprovalRequest = {
      id: resolvePermissionRequestId(),
      toolName: pendingExternalPermission.title || pendingExternalPermission.toolInfo.name,
      toolDescription:
        pendingExternalPermission.reason || pendingExternalPermission.toolInfo.description || '',
      args: pendingExternalPermission.rawInput || {},
      riskLevel:
        pendingExternalPermission.riskLevel === 'critical'
          ? 'high'
          : pendingExternalPermission.riskLevel || 'medium',
      acpOptions: mapAcpOptions(pendingExternalPermission.options),
    };

    setToolApprovalRequest((current) => {
      if (current?.id === nextRequest.id) {
        return current;
      }
      return nextRequest;
    });
    setShowToolApproval(true);
  }, [pendingExternalPermission, mapAcpOptions, resolvePermissionRequestId, toolApprovalRequest?.acpOptions]);

  useEffect(() => {
    if (permissionTimeoutRef.current) {
      clearTimeout(permissionTimeoutRef.current);
      permissionTimeoutRef.current = null;
    }

    if (!pendingExternalPermission) {
      return;
    }

    const rawTimeout = pendingExternalPermission.autoApproveTimeout;
    const timeoutMs =
      typeof rawTimeout === 'number' && Number.isFinite(rawTimeout) && rawTimeout > 0
        ? rawTimeout
        : 300000;
    const requestId = pendingExternalPermission.requestId || pendingExternalPermission.id;

    permissionTimeoutRef.current = setTimeout(() => {
      void (async () => {
        try {
          await respondToExternalPermission({
            requestId,
            granted: false,
            reason: 'Permission request timed out',
          });
        } catch (error) {
          console.error('[ChatContainer] Failed to deny timed-out permission request:', error);
        }

        if (pendingApprovalRef.current) {
          pendingApprovalRef.current.resolve(false);
          pendingApprovalRef.current = null;
        }
        setShowToolApproval(false);
        setToolApprovalRequest(null);
        toast.error('Permission request timed out. Please retry.');
      })();
    }, timeoutMs);

    return () => {
      if (permissionTimeoutRef.current) {
        clearTimeout(permissionTimeoutRef.current);
        permissionTimeoutRef.current = null;
      }
    };
  }, [pendingExternalPermission, respondToExternalPermission]);

  /**
   * Approve a pending agent tool execution.
   * Optionally persists an "always allow" preference for the tool.
   *
   * @param toolCallId - ID of the tool call to approve
   * @param alwaysAllow - When `true`, adds the tool to the always-allowed list in settings
   */
  const handleToolApproval = useCallback(
    async (_toolCallId: string, alwaysAllow?: boolean) => {
      if (pendingExternalPermission) {
        const requestId = resolvePermissionRequestId();
        const response: AcpPermissionResponse = {
          requestId,
          granted: true,
          optionId: pickAllowOptionId(pendingExternalPermission.options),
        };
        await respondToExternalPermission(response);
      }

      if (pendingApprovalRef.current) {
        pendingApprovalRef.current.resolve(true);
        pendingApprovalRef.current = null;
      }
      setShowToolApproval(false);

      // Store alwaysAllow preference for the tool
      if (alwaysAllow && toolApprovalRequest?.toolName) {
        addAlwaysAllowedTool(toolApprovalRequest.toolName);
      }

      setToolApprovalRequest(null);
    },
    [
      pendingExternalPermission,
      resolvePermissionRequestId,
      pickAllowOptionId,
      respondToExternalPermission,
      toolApprovalRequest,
      addAlwaysAllowedTool,
    ]
  );

  /**
   * Deny a pending agent tool execution and resolve the approval promise as `false`.
   *
   * @param toolCallId - ID of the tool call being denied
   */
  const handleToolDeny = useCallback(
    async (_toolCallId: string) => {
      if (pendingExternalPermission) {
        const requestId = resolvePermissionRequestId();
        await respondToExternalPermission({
          requestId,
          granted: false,
        });
      }
      if (pendingApprovalRef.current) {
        pendingApprovalRef.current.resolve(false);
        pendingApprovalRef.current = null;
      }
      setShowToolApproval(false);
      setToolApprovalRequest(null);
    },
    [pendingExternalPermission, resolvePermissionRequestId, respondToExternalPermission]
  );

  const handleToolOptionSelect = useCallback(
    async (_toolCallId: string, optionId: string) => {
      if (!pendingExternalPermission) {
        return;
      }
      const requestId = resolvePermissionRequestId();
      await respondToExternalPermission({
        requestId,
        granted: true,
        optionId,
      });
      setShowToolApproval(false);
      setToolApprovalRequest(null);
    },
    [pendingExternalPermission, resolvePermissionRequestId, respondToExternalPermission]
  );

  const handleToolApprovalOpenChange = useCallback(
    (open: boolean) => {
      setShowToolApproval(open);
      if (!open && pendingExternalPermission) {
        void handleToolDeny(toolApprovalRequest?.id || resolvePermissionRequestId());
      }
    },
    [
      pendingExternalPermission,
      handleToolDeny,
      toolApprovalRequest?.id,
      resolvePermissionRequestId,
    ]
  );

  /** Agent tool executions mapped to the {@link ToolTimeline} display format. */
  const toolTimelineExecutions: ToolExecution[] = useMemo(() => {
    return agentToolExecutions.map((exec) => ({
      id: exec.id,
      toolName: exec.toolName,
      state:
        exec.status === 'completed'
          ? ('output-available' as const)
          : exec.status === 'error'
            ? ('output-error' as const)
            : exec.status === 'running'
              ? ('input-available' as const)
              : ('input-streaming' as const),
      startTime: exec.startedAt ?? new Date(),
      endTime: exec.completedAt,
      error: exec.error,
    }));
  }, [agentToolExecutions]);

  // Set active session on mount
  useEffect(() => {
    if (sessionId) {
      const existingSession = getSession(sessionId);
      if (existingSession) {
        setActiveSession(sessionId);
      }
    }
  }, [sessionId, setActiveSession, getSession]);

  const _handleNewChat = useCallback(() => {
    createSession();
    setError(null);
  }, [createSession]);

  /**
   * Switch the current chat mode (chat / agent / research / learning).
   * If the session already has messages and the mode is changing, a confirmation
   * dialog is shown so the user can choose to carry context to the new session.
   *
   * @param mode - Target chat mode
   */
  const handleModeChange = useCallback(
    (mode: ChatMode) => {
      if (session) {
        // Check if there are messages - if so, show confirmation dialog
        if (messages.length > 0 && mode !== currentMode) {
          setPendingTargetMode(mode);
          setShowModeSwitchDialog(true);
          return;
        }
        updateSession(session.id, { mode });
      } else {
        createSession({ mode });
      }
      // Show learning start dialog when switching to learning mode
      if (mode === 'learning') {
        const currentSessionId = session?.id;
        const hasLearningSession = currentSessionId
          ? getLearningSessionByChat(currentSessionId)
          : null;
        if (!hasLearningSession) {
          setShowLearningStartDialog(true);
        } else {
          setShowLearningPanel(true);
        }
      }
    },
    [session, updateSession, createSession, getLearningSessionByChat, messages.length, currentMode]
  );

  /**
   * Confirm a pending mode switch after the user chooses to carry (or discard) context.
   * Creates a new session with the target mode and optional conversation summary.
   *
   * @param options.carryContext - Whether to copy context to the new session
   * @param options.summary - Optional AI-generated conversation summary
   */
  const handleModeSwitchConfirm = useCallback(
    (options: { carryContext: boolean; summary?: string }) => {
      if (!session || !pendingTargetMode) return;

      // Create new session with the target mode
      switchModeWithNewSession(session.id, pendingTargetMode, {
        carryContext: options.carryContext,
        summary: options.summary,
      });

      // Show learning start dialog when switching to learning mode
      if (pendingTargetMode === 'learning') {
        setShowLearningStartDialog(true);
      }

      // Reset state
      setPendingTargetMode(null);
      setShowModeSwitchDialog(false);
    },
    [session, pendingTargetMode, switchModeWithNewSession]
  );

  // Handle mode switch cancel
  const handleModeSwitchCancel = useCallback(() => {
    setPendingTargetMode(null);
    setShowModeSwitchDialog(false);
  }, []);

  /**
   * Generate an AI-powered brief summary of the current conversation
   * for use when carrying context across a mode switch.
   *
   * @returns The summary string, or `null` if generation fails or there are no messages
   */
  const handleGenerateSummaryForModeSwitch = useCallback(async (): Promise<string | null> => {
    if (messages.length === 0) return null;
    try {
      const result = await generateChatSummary(messages, { format: 'brief' }, session?.title);
      return result.summary;
    } catch (error) {
      console.error('Failed to generate summary:', error);
      return null;
    }
  }, [messages, generateChatSummary, session?.title]);

  // Close learning panel when clicking outside
  useEffect(() => {
    if (!showLearningPanel) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (learningPanelRef.current && !learningPanelRef.current.contains(e.target as Node)) {
        setShowLearningPanel(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLearningPanel]);

  /**
   * Switch the agent sub-mode (e.g. general, code, research) within agent mode.
   * Updates the session's `agentModeId` and `systemPrompt`.
   *
   * @param agentMode - The target agent mode configuration
   */
  const handleAgentModeChange = useCallback(
    (agentMode: AgentModeConfig) => {
      if (session) {
        updateSession(session.id, {
          agentModeId: agentMode.id,
          systemPrompt: agentMode.systemPrompt,
        });
      }
    },
    [session, updateSession]
  );

  /**
   * Apply a preset configuration to the current (or new) session.
   * Copies provider, model, mode, system prompt, temperature, and feature toggles
   * from the preset into the session.
   *
   * @param preset - The preset to apply
   */
  const handleSelectPreset = useCallback(
    (preset: import('@/types/content/preset').Preset) => {
      trackPresetUsage(preset.id);

      if (session) {
        updateSession(session.id, {
          provider: preset.provider === 'auto' ? 'openai' : preset.provider,
          model: preset.model,
          mode: preset.mode,
          systemPrompt: preset.systemPrompt,
          builtinPrompts: preset.builtinPrompts,
          temperature: preset.temperature,
          maxTokens: preset.maxTokens,
          webSearchEnabled: preset.webSearchEnabled,
          thinkingEnabled: preset.thinkingEnabled,
          presetId: preset.id,
        });
      } else {
        createSession({
          provider: preset.provider === 'auto' ? 'openai' : preset.provider,
          model: preset.model,
          mode: preset.mode,
          systemPrompt: preset.systemPrompt,
        });
      }
    },
    [session, updateSession, createSession, trackPresetUsage]
  );

  /**
   * Toggle the per-session web-search feature flag.
   *
   * @param enabled - Whether web search should be active for this session
   */
  const handleWebSearchChange = useCallback(
    (enabled: boolean) => {
      if (session) {
        updateSession(session.id, { webSearchEnabled: enabled });
      }
    },
    [session, updateSession]
  );

  /**
   * Toggle the per-session thinking-mode (chain-of-thought) feature flag.
   *
   * @param enabled - Whether thinking mode should be active for this session
   */
  const handleThinkingChange = useCallback(
    (enabled: boolean) => {
      if (session) {
        updateSession(session.id, { thinkingEnabled: enabled });
      }
    },
    [session, updateSession]
  );

  /**
   * Apply partial AI inference settings (temperature, maxTokens, etc.) to the current session.
   *
   * @param settings - Partial settings object to merge into the session
   */
  const handleAISettingsChange = useCallback(
    (settings: Partial<AISettings>) => {
      if (session) {
        updateSession(session.id, settings);
      }
    },
    [session, updateSession]
  );

  /** Per-session AI inference settings (temperature, maxTokens, topP, penalties) with global-default fallback. */
  const currentAISettings: AISettings = useMemo(
    () => ({
      temperature: session?.temperature ?? defaultTemperature,
      maxTokens: session?.maxTokens ?? defaultMaxTokens,
      topP: session?.topP ?? defaultTopP,
      frequencyPenalty: session?.frequencyPenalty ?? defaultFrequencyPenalty,
      presencePenalty: session?.presencePenalty ?? defaultPresencePenalty,
    }),
    [
      session?.temperature,
      session?.maxTokens,
      session?.topP,
      session?.frequencyPenalty,
      session?.presencePenalty,
      defaultTemperature,
      defaultMaxTokens,
      defaultTopP,
      defaultFrequencyPenalty,
      defaultPresencePenalty,
    ]
  );

  /** Global default AI settings used by the "Reset to defaults" button in the settings dialog. */
  const globalDefaultAISettings: AISettings = useMemo(
    () => ({
      temperature: defaultTemperature,
      maxTokens: defaultMaxTokens,
      topP: defaultTopP,
      frequencyPenalty: defaultFrequencyPenalty,
      presencePenalty: defaultPresencePenalty,
    }),
    [
      defaultTemperature,
      defaultMaxTokens,
      defaultTopP,
      defaultFrequencyPenalty,
      defaultPresencePenalty,
    ]
  );

  // Open preset manager (can be used by child components)
  const _handleManagePresets = useCallback(() => {
    setEditingPresetId(null);
    setShowPresetManager(true);
  }, []);

  // Create new preset (can be used by child components)
  const _handleCreatePreset = useCallback(() => {
    setEditingPresetId(null);
    setShowPresetManager(true);
  }, []);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setInputValue(suggestion);
  }, []);

  /**
   * Generate follow-up suggestion chips after an AI response.
   * Falls back to static default suggestions when no API key is available.
   *
   * @param userMsg - The user's original message text
   * @param assistantMsg - The assistant's response text
   */
  const loadSuggestions = useCallback(
    async (userMsg: string, assistantMsg: string) => {
      const settings = providerSettings[currentProvider as keyof typeof providerSettings];
      if (!settings?.apiKey) {
        // Use default suggestions if no API key
        setSuggestions(getDefaultSuggestions());
        return;
      }

      setIsLoadingSuggestions(true);
      try {
        const result = await generateSuggestions(userMsg, assistantMsg, {
          provider: currentProvider as ProviderName,
          model: currentModel,
          apiKey: settings.apiKey,
          baseURL: settings.baseURL,
          maxSuggestions: 4,
        });

        if (result.success && result.suggestions) {
          setSuggestions(result.suggestions);
        } else {
          setSuggestions(getDefaultSuggestions());
        }
      } catch {
        setSuggestions(getDefaultSuggestions());
      } finally {
        setIsLoadingSuggestions(false);
      }
    },
    [currentProvider, currentModel, providerSettings]
  );

  /**
   * Apply the output of the {@link PromptOptimizerDialog} back into the chat input.
   *
   * @param optimizedPrompt - The optimised prompt text
   */
  const handleApplyOptimizedPrompt = useCallback((optimizedPrompt: string) => {
    setInputValue(optimizedPrompt);
    setShowPromptOptimizer(false);
  }, []);

  /** Open the prompt optimiser dialog (only if the input is non-empty). */
  const handleOpenPromptOptimizer = useCallback(() => {
    if (inputValue.trim()) {
      setShowPromptOptimizer(true);
    }
  }, [inputValue]);

  /**
   * Format a {@link SearchResponse} into a Markdown system-prompt section.
   * Includes the query, provider, quick answer, and numbered source entries
   * with content previews (up to 500 chars each). Appends citation instructions
   * for the LLM.
   *
   * @param searchResponse - Raw search results from the multi-provider search pipeline
   * @returns Markdown string ready to be injected into the system prompt
   */
  const formatSearchResults = useCallback((searchResponse: SearchResponse): string => {
    const parts: string[] = [
      '## Web Search Results',
      `**Search Query:** "${searchResponse.query}"`,
      `**Provider:** ${searchResponse.provider} | **Response Time:** ${searchResponse.responseTime}ms`,
      '',
    ];

    if (searchResponse.answer) {
      parts.push(`### Quick Answer`, searchResponse.answer, '');
    }

    parts.push('### Sources');
    searchResponse.results.forEach((result: SearchResult, index: number) => {
      parts.push(`**[${index + 1}] ${result.title}**`);
      parts.push(`URL: ${result.url}`);
      if (result.publishedDate) {
        parts.push(`Published: ${result.publishedDate}`);
      }
      // Include more content for better LLM context (up to 500 chars)
      const contentPreview = result.content.length > 500
        ? result.content.slice(0, 500) + '...'
        : result.content;
      parts.push(`Content: ${contentPreview}`);
      parts.push('');
    });

    parts.push('---');
    parts.push(
      '**Instructions:** Use the above web search results to provide an accurate, up-to-date response. ' +
      'Cite sources using [N] notation (e.g., [1], [2]) when referencing specific information. ' +
      'If search results conflict, note the discrepancy. ' +
      'If the search results are insufficient, say so honestly.'
    );

    return parts.join('\n');
  }, []);

  /**
   * Execute a batch of MCP tool calls (from `@tool` mentions in the user's message)
   * and return a formatted summary of all results.
   *
   * Each tool call is validated against connected MCP servers before execution.
   * Errors per tool are captured individually so one failure doesn't block others.
   *
   * @param toolCalls - Parsed tool call references from the user's input
   * @returns Formatted Markdown string with ✅/❌ prefixed results per tool
   */
  const executeMcpTools = useCallback(
    async (toolCalls: ParsedToolCall[]): Promise<string> => {
      const results: string[] = [];

      for (const toolCall of toolCalls) {
        try {
          // Find the server
          const server = mcpServers.find((s) => s.id === toolCall.serverId);
          if (!server) {
            results.push(`❌ Server "${toolCall.serverId}" not found`);
            continue;
          }

          // Check if server is connected
          if (server.status.type !== 'connected') {
            results.push(`❌ Server "${toolCall.serverId}" is not connected`);
            continue;
          }

          // Execute the tool
          console.log(`Executing MCP tool: ${toolCall.serverId}:${toolCall.toolName}`);
          const result = await mcpCallTool(
            toolCall.serverId,
            toolCall.toolName,
            toolCall.arguments || {}
          );

          // Format the result
          if (result.isError) {
            results.push(`❌ **${toolCall.mentionText}** error:\n${formatToolResult(result)}`);
          } else {
            results.push(`✅ **${toolCall.mentionText}** result:\n${formatToolResult(result)}`);
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          results.push(`❌ **${toolCall.mentionText}** failed: ${errorMsg}`);
        }
      }

      return results.join('\n\n');
    },
    [mcpServers, mcpCallTool]
  );

  /**
   * Convert an MCP {@link ToolCallResult} into a human-readable string.
   * Handles text, image, and resource content types.
   *
   * @param result - The raw tool call result containing mixed content items
   * @returns Plain-text representation of the result
   */
  const formatToolResult = (result: ToolCallResult): string => {
    return result.content
      .map((item) => {
        if (item.type === 'text') {
          return item.text;
        } else if (item.type === 'image') {
          return `[Image: ${item.mimeType}]`;
        } else if (item.type === 'resource') {
          return item.resource.text || `[Resource: ${item.resource.uri}]`;
        }
        return '[Unknown content]';
      })
      .join('\n');
  };

  /**
   * Execute a user message through the agent pipeline (multi-step tool execution).
   *
   * Flow:
   * 1. Persist the user message to IndexedDB.
   * 2. Create a streaming placeholder for the assistant response.
   * 3. Run the agent loop via `runAgent`, which may invoke multiple tools.
   * 4. Append a tool-usage summary to the final response.
   * 5. Save the assistant message and generate follow-up suggestions.
   *
   * @param content - User message text (may include extracted video context)
   * @param currentSessionId - Active session ID for persistence
   */
  const handleAgentMessage = useCallback(
    async (content: string, currentSessionId: string) => {
      // Add user message to database
      await addMessage({
        role: 'user',
        content,
      });

      // Create streaming assistant message for agent response
      const assistantMessage = createStreamingMessage('assistant');

      try {
        const currentSession = getSession(currentSessionId);
        const externalAgentId = currentSession?.externalAgentId;

        const formatBuiltInToolSummary = (steps: Array<{ toolCalls: Array<{ name: string; status: string }> }>) => {
          if (!steps.length) {
            return '';
          }
          return steps
            .filter((step) => step.toolCalls.length > 0)
            .map((step) =>
              step.toolCalls
                .map(
                  (toolCall) =>
                    `- **${toolCall.name}**: ${toolCall.status === 'completed' ? '✅' : '❌'} ${toolCall.status}`
                )
                .join('\n')
            )
            .join('\n');
        };

        const formatExternalToolSummary = (
          toolCalls: Array<{ name: string; status: 'pending' | 'completed' | 'error' }>
        ) =>
          toolCalls
            .map(
              (toolCall) =>
                `- **${toolCall.name}**: ${toolCall.status === 'completed' ? '✅' : '❌'} ${toolCall.status}`
            )
            .join('\n');

        let agentResult: {
          success: boolean;
          finalResponse: string;
          toolSummary: string;
          error?: string;
        };

        if (externalAgentId) {
          try {
            setActiveExternalAgent(externalAgentId);
            let isHealthy = await checkExternalAgentHealth(externalAgentId);
            if (!isHealthy) {
              await connectExternalAgent(externalAgentId);
              isHealthy = await checkExternalAgentHealth(externalAgentId);
            }
            if (!isHealthy) {
              throw new Error('External agent is unavailable. Please retry.');
            }

            let resolvedExternalSessionId = currentSession?.externalAgentSessionId;
            if (
              currentSession?.externalAgentInstructionHash &&
              currentSession.externalAgentInstructionHash !== agentInstructionStack.instructionHash
            ) {
              resolvedExternalSessionId = undefined;
              updateSession(currentSessionId, {
                externalAgentSessionId: undefined,
              });
            }

            const externalResult = await executeExternalAgent(content, {
              sessionId: resolvedExternalSessionId,
              systemPrompt: agentInstructionStack.systemPrompt,
              workingDirectory: session?.virtualEnvPath,
              instructionEnvelope: {
                hash: agentInstructionStack.instructionHash,
                developerInstructions: agentInstructionStack.developerInstructions,
                customInstructions: agentInstructionStack.customInstructionsSection,
                skillsSummary: agentInstructionStack.skillsSummary,
                sourceFlags: agentInstructionStack.sourceFlags,
                projectContextSummary: agentInstructionStack.projectContextSummary,
              },
              context: {
                custom: {
                  mcpServers: externalAcpMcpServers,
                  sessionId: currentSessionId,
                },
              },
              onEvent: (event) => {
                if (event.type === 'message_delta' && event.delta.type === 'text') {
                  appendToMessage(assistantMessage.id, event.delta.text);
                  return;
                }
                if (event.type === 'tool_use_start') {
                  addToolExecution({
                    id: event.toolUseId,
                    toolName: event.toolName,
                    input: event.rawInput || {},
                    status: 'running',
                    state: 'input-available',
                  });
                  return;
                }
                if (event.type === 'tool_result') {
                  if (event.isError) {
                    failToolExecution(
                      event.toolUseId,
                      typeof event.result === 'string'
                        ? event.result
                        : JSON.stringify(event.result || 'External tool execution failed')
                    );
                  } else {
                    completeToolExecution(event.toolUseId, event.result);
                  }
                }
              },
              traceContext: {
                sessionId: currentSessionId,
                metadata: {
                  source: 'chat-container',
                  mode: 'agent',
                },
              },
            });

            if (!externalResult.success) {
              throw new Error(externalResult.error || 'External agent execution failed');
            }

            if (
              externalResult.sessionId &&
              (externalResult.sessionId !== currentSession?.externalAgentSessionId ||
                currentSession?.externalAgentInstructionHash !== agentInstructionStack.instructionHash)
            ) {
              updateSession(currentSessionId, {
                externalAgentSessionId: externalResult.sessionId,
                externalAgentInstructionHash: agentInstructionStack.instructionHash,
              });
            }

            agentResult = {
              success: true,
              finalResponse: externalResult.finalResponse,
              toolSummary: formatExternalToolSummary(externalResult.toolCalls),
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'External agent execution failed';
            if (externalChatFailurePolicy === 'strict') {
              toast.error('External agent execution failed.', {
                description: errorMessage,
              });
              agentResult = {
                success: false,
                finalResponse: '',
                toolSummary: '',
                error: errorMessage,
              };
            } else {
              toast.warning('External agent failed. Switched to built-in agent.', {
                description: errorMessage,
              });
              log.warn('External agent execution failed. Falling back to built-in agent.', {
                externalAgentId,
                sessionId: currentSessionId,
                error: errorMessage,
              });

              const fallbackResult = await runAgent(content);
              agentResult = {
                success: fallbackResult.success,
                finalResponse: fallbackResult.finalResponse,
                toolSummary: formatBuiltInToolSummary(
                  fallbackResult.steps as Array<{
                    toolCalls: Array<{ name: string; status: string }>;
                  }>
                ),
                error: fallbackResult.error,
              };
            }
          }
        } else {
          const builtInResult = await runAgent(content);
          agentResult = {
            success: builtInResult.success,
            finalResponse: builtInResult.finalResponse,
            toolSummary: formatBuiltInToolSummary(
              builtInResult.steps as Array<{ toolCalls: Array<{ name: string; status: string }> }>
            ),
            error: builtInResult.error,
          };
        }

        if (agentResult.success) {
          let formattedResponse = agentResult.finalResponse;
          if (agentResult.toolSummary) {
            formattedResponse = `${formattedResponse}\n\n---\n**Tools Used:**\n${agentResult.toolSummary}`;
          }

          // Update the assistant message with the final response
          await updateMessage(assistantMessage.id, { content: formattedResponse });

          // Save to database
          await messageRepository.create(currentSessionId, {
            ...assistantMessage,
            content: formattedResponse,
            model: currentModel,
            provider: currentProvider as ProviderName,
          });

          // Generate suggestions
          loadSuggestions(content, formattedResponse);
        } else {
          // Handle agent error
          const errorContent = `Agent execution failed: ${agentResult.error || 'Unknown error'}`;
          await updateMessage(assistantMessage.id, {
            content: errorContent,
            error: agentResult.error,
          });
          setError(agentResult.error || 'Agent execution failed');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Agent execution failed';
        await updateMessage(assistantMessage.id, {
          content: `Error: ${errorMessage}`,
          error: errorMessage,
        });
        setError(errorMessage);
      }
    },
    [
      addMessage,
      createStreamingMessage,
      executeExternalAgent,
      setActiveExternalAgent,
      checkExternalAgentHealth,
      connectExternalAgent,
      getSession,
      agentInstructionStack,
      session?.virtualEnvPath,
      externalAcpMcpServers,
      appendToMessage,
      addToolExecution,
      completeToolExecution,
      failToolExecution,
      externalChatFailurePolicy,
      runAgent,
      updateMessage,
      updateSession,
      currentModel,
      currentProvider,
      loadSuggestions,
    ]
  );

  const applyLearningSessionAutomation = useCallback(
    (
      chatSessionId: string,
      userInput: string,
      assistantOutput: string,
      responseStartedAt: number
    ) => {
      const currentChatSession = getSession(chatSessionId);
      if (!learningModeV2Enabled) {
        return;
      }
      if (currentChatSession?.learningContext?.subMode === 'speedpass') {
        return;
      }

      const learningSession = getLearningSessionByChat(chatSessionId);
      if (!learningSession) {
        return;
      }

      const responseAnalysis = analyzeLearnerResponse(userInput, [], learningSession);
      const responseTimeMs = Math.max(0, Date.now() - responseStartedAt);
      const answeredCorrectly =
        responseAnalysis.understanding === 'good' || responseAnalysis.understanding === 'excellent';
      recordLearningAnswer(learningSession.id, answeredCorrectly, responseTimeMs);
      updateLearningEngagement(learningSession.id, responseAnalysis.confidenceScore >= 45);

      const existingQuestions = new Set(
        learningSession.subQuestions.map((subQuestion) => subQuestion.question.trim().toLowerCase())
      );
      const extractedQuestions = extractSubQuestions(assistantOutput);
      for (const question of extractedQuestions) {
        const normalizedQuestion = question.trim().toLowerCase();
        if (!normalizedQuestion || existingQuestions.has(normalizedQuestion)) {
          continue;
        }
        if (existingQuestions.size >= 10) {
          break;
        }
        addLearningSubQuestion(learningSession.id, question);
        existingQuestions.add(normalizedQuestion);
      }

      const refreshedSession = getLearningSessionByChat(chatSessionId);
      if (!refreshedSession) {
        return;
      }

      const transition = detectPhaseTransition(refreshedSession);
      if (transition.shouldTransition && transition.nextPhase) {
        if (transition.nextPhase === 'summary') {
          const keyTakeaways = assistantOutput
            .split('\n')
            .map((line) => line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '').trim())
            .filter((line) => line.length > 8)
            .slice(0, 5);
          endLearningSession(
            refreshedSession.id,
            assistantOutput.slice(0, 1200),
            keyTakeaways.length > 0 ? keyTakeaways : undefined
          );
        } else {
          setLearningPhase(refreshedSession.id, transition.nextPhase);
        }
      }
    },
    [
      addLearningSubQuestion,
      endLearningSession,
      getLearningSessionByChat,
      getSession,
      recordLearningAnswer,
      setLearningPhase,
      updateLearningEngagement,
      learningModeV2Enabled,
    ]
  );

  /**
   * Primary message-send handler for all chat modes.
   *
   * Pipeline (in order):
   * 1. **Plugin pre-hook** (`UserPromptSubmit`) — may block, modify, or enrich the prompt.
   * 2. **Feature routing** — detects intent to navigate to a feature page (e.g. academic, arena).
   * 3. **Intent detection** — suggests mode switches (chat ↔ research ↔ learning).
   * 4. **Session bootstrap** — creates a session if none exists, optionally with cross-session history context.
   * 5. **Quote / attachment assembly** — prepends quoted text, appends attachment info.
   * 6. **MCP tool execution** — runs any `@tool` mentions and collects results.
   * 7. **Agent dispatch** — if in agent mode, delegates to {@link handleAgentMessage} and returns.
   * 8. **Auto-routing** — if provider is `auto`, selects the optimal model via {@link useAutoRouter}.
   * 9. **Multimodal processing** — builds vision/audio/video content parts; falls back to video transcription.
   * 10. **System prompt enrichment** — layers: carried context → history context → project RAG → web search →
   *     thinking mode → MCP tool results → skills (Progressive Disclosure) → learning prompt → plugin context.
   * 11. **AI send** — dispatches to `useAIChat.sendMessage` with streaming callback (75 ms coalesced flush).
   * 12. **Post-response hooks** — plugin post-receive, artifact auto-creation, math block detection,
   *     A2UI processing, skill usage tracking, follow-up suggestion generation.
   *
   * @param content - Raw user input text
   * @param attachments - Optional file attachments (images, audio, video, documents)
   * @param toolCalls - Optional parsed MCP tool call references from `@tool` mentions
   */
  const handleSendMessage = useCallback(
    async (content: string, attachments?: Attachment[], toolCalls?: ParsedToolCall[]) => {
      if (!content.trim() && (!attachments || attachments.length === 0)) return;

      // ========== 1. Pre-Chat Hook: UserPromptSubmit ==========
      const preChatResult = await runPluginPreChatHook(
        content,
        activeSessionId || '',
        attachments,
        currentMode,
        messages
      );

      if (preChatResult.blocked) {
        toast.error(preChatResult.blockReason || 'Message blocked by plugin');
        return;
      }

      const effectiveContent = preChatResult.effectiveContent;
      const hookAdditionalContext = preChatResult.hookAdditionalContext;

      const shouldSwitchToSpeedPassSubMode =
        currentMode === 'learning' && isSpeedLearningIntent(effectiveContent);

      if (shouldSwitchToSpeedPassSubMode && session) {
        const modeDetection = detectSpeedLearningMode(effectiveContent);
        const existingSpeedPassContext = session.learningContext?.speedpassContext;
        const detectedExamDate = modeDetection.detectedUrgencyDays;
        const examDate =
          typeof detectedExamDate === 'number'
            ? new Date(Date.now() + detectedExamDate * 24 * 60 * 60 * 1000).toISOString()
            : existingSpeedPassContext?.examDate;

        updateSession(session.id, {
          learningContext: {
            subMode: 'speedpass',
            speedpassContext: {
              ...existingSpeedPassContext,
              sourceMessage: effectiveContent,
              textbookId: existingSpeedPassContext?.textbookId,
              availableTimeMinutes:
                modeDetection.detectedTime ?? existingSpeedPassContext?.availableTimeMinutes,
              targetScore:
                existingSpeedPassContext?.targetScore ??
                resolveSpeedPassTargetScore(modeDetection.recommendedMode),
              examDate,
              recommendedMode: modeDetection.recommendedMode,
              updatedAt: new Date(),
            },
          },
        });

        const featureResult = await checkFeatureIntent(effectiveContent);
        if (featureResult.detected && featureResult.feature?.id === 'speedpass') {
          return;
        }
      } else {
        // Check for feature routing intent (navigate to feature pages)
        const featureResult = await checkFeatureIntent(effectiveContent);
        if (featureResult.detected && featureResult.feature) {
          // If feature intent detected with high confidence, the dialog will show
          // and the message will be sent after user confirms or continues
          return;
        }
      }

      // Check for learning/research intent (works in all modes)
      checkIntent(effectiveContent);

      setError(null);
      setRetryCount(0);
      setLastFailedMessage(null);

      // Ensure we have an active session
      let currentSessionId = activeSessionId;
      if (!currentSessionId) {
        // Build history context if enabled
        let historyContext:
          | { contextText: string; sessionCount: number; generatedAt: Date }
          | undefined;
        if (chatHistoryContextSettings.enabled) {
          try {
            const { buildHistoryContext } = await import('@/lib/context/cross-session-context');
            const result = await buildHistoryContext(chatHistoryContextSettings, {
              projectId: session?.projectId,
            });
            if (result.success && result.contextText) {
              historyContext = {
                contextText: result.contextText,
                sessionCount: result.sessionCount,
                generatedAt: new Date(),
              };
            }
          } catch (err) {
            console.warn('Failed to build history context:', err);
          }
        }

        const newSession = createSession({
          title: content.slice(0, 50) || 'New conversation',
          historyContext,
        });
        currentSessionId = newSession.id;
      }

      // ========== 2. Build message content with quotes and attachments ==========
      const formattedQuotes = getFormattedQuotes();
      const messageContent = buildMessageContent(effectiveContent, formattedQuotes, attachments);
      if (formattedQuotes) clearQuotes();

      // Execute MCP tool calls if present
      let toolResultsContext = '';
      if (toolCalls && toolCalls.length > 0) {
        try {
          toolResultsContext = await executeMcpTools(toolCalls);
          console.log('Tool execution results:', toolResultsContext);
        } catch (err) {
          console.error('Failed to execute MCP tools:', err);
        }
      }

      setIsLoading(true);

      // Use Agent mode execution if in agent mode
      if (currentMode === 'agent') {
        // Auto-match skills based on message content for agent mode
        const agentEnabledSkills = Object.values(skillStoreSkills).filter(
          (s) => s.status === 'enabled'
        );
        if (agentEnabledSkills.length > 0 && effectiveContent.length >= 5) {
          const agentMatchedSkills = findMatchingSkills(agentEnabledSkills, effectiveContent, 3);
          for (const matched of agentMatchedSkills) {
            if (!matched.isActive) {
              activateSkill(matched.id);
              console.log(`[Agent] Auto-activated skill: ${matched.metadata.name}`);
            }
          }
        }

        try {
          // For agent mode, also process video attachments if present
          let agentContent = messageContent;
          const videoAttachments = attachments?.filter((a) => a.type === 'video') || [];

          if (videoAttachments.length > 0) {
            const openaiApiKey = providerSettings.openai?.apiKey;
            if (openaiApiKey) {
              try {
                const { buildVideoContextMessage } = await import('@/lib/ai/media/media-utils');
                let videoContext = '';
                for (const videoAttachment of videoAttachments) {
                  if (videoAttachment.file) {
                    const videoText = await buildVideoContextMessage(
                      videoAttachment.file,
                      videoAttachment.name,
                      openaiApiKey
                    );
                    videoContext += videoText + '\n\n';
                  }
                }
                if (videoContext) {
                  agentContent = `${videoContext}${messageContent}`;
                  console.log('Extracted video content for agent analysis');
                }
              } catch (err) {
                console.warn('Failed to extract video content for agent:', err);
              }
            }
          }

          await handleAgentMessage(agentContent, currentSessionId);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      try {
        // Add user message to database
        const userMessage = await addMessage({
          role: 'user',
          content: messageContent,
          attachments: attachments?.map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type as 'image' | 'audio' | 'video' | 'file' | 'document',
            url: a.url,
            size: a.size,
            mimeType: a.mimeType,
          })),
        });

        // ========== Message Send Hook ==========
        getPluginLifecycleHooks().dispatchOnMessageSend({
          id: userMessage.id,
          role: 'user',
          content: messageContent,
        });

        // Create streaming assistant message
        const assistantMessage = createStreamingMessage('assistant');
        const responseStartedAt = Date.now();
        let streamedAssistantContent = '';
        const toolPartsById = new Map<string, ToolInvocationPart>();

        const activeLearningSession =
          currentMode === 'learning' ? getLearningSessionByChat(currentSessionId!) : undefined;
        if (
          learningModeV2Enabled &&
          activeLearningSession?.currentSubQuestionId &&
          session?.learningContext?.subMode !== 'speedpass'
        ) {
          incrementLearningAttempts(
            activeLearningSession.id,
            activeLearningSession.currentSubQuestionId
          );
        }

        const syncAssistantParts = (latestContent?: string) => {
          const resolvedContent = latestContent ?? streamedAssistantContent;
          const toolParts = Array.from(toolPartsById.values()).sort((left, right) => {
            const leftTime = left.startedAt ? new Date(left.startedAt).getTime() : 0;
            const rightTime = right.startedAt ? new Date(right.startedAt).getTime() : 0;
            return leftTime - rightTime;
          });
          const parts = [
            ...(resolvedContent ? [{ type: 'text' as const, content: resolvedContent }] : []),
            ...toolParts,
          ];
          if (parts.length > 0) {
            assistantMessage.parts = parts;
            void updateMessage(assistantMessage.id, { parts });
          }
        };

        // Determine the actual provider/model to use
        let actualProvider = currentProvider as ProviderName;
        let actualModel = currentModel;

        if (isAutoMode) {
          // Gather active skill categories for skill-aware routing
          const currentActiveSkills = getActiveSkills();
          const skillCategories = [...new Set(currentActiveSkills.map((s) => s.category))];
          const selection = selectModel(content, {
            activeSkillCategories: skillCategories.length > 0 ? skillCategories : undefined,
            activeSkillCount: currentActiveSkills.length || undefined,
          });
          actualProvider = selection.provider;
          actualModel = selection.model;
          console.log('Auto-selected:', selection.reason);

          // Track routing selection for UI display
          setLastRoutingSelection(selection);
          if (autoRouterSettings.showRoutingIndicator) {
            setShowRoutingIndicator(true);
          }
        }

        // Check if we have media attachments and the model supports them
        const imageAttachments = attachments?.filter((a) => a.type === 'image') || [];
        const audioAttachments = attachments?.filter((a) => a.type === 'audio') || [];
        const videoAttachments = attachments?.filter((a) => a.type === 'video') || [];

        const hasImages = imageAttachments.length > 0;
        const hasAudio = audioAttachments.length > 0;
        const hasVideo = videoAttachments.length > 0;
        const hasMediaAttachments = hasImages || hasAudio || hasVideo;

        const modelSupportsVision = isVisionModel(actualModel);
        const modelSupportsAudio = isAudioModel(actualModel);
        const modelSupportsVideo = isVideoModel(actualModel);

        // Build messages for AI - use multimodal format if we have supported media
        let coreMessages: MultimodalMessage[];

        // Filter attachments to only include supported media types for the model
        const supportedAttachments = [
          ...(hasImages && modelSupportsVision ? imageAttachments : []),
          ...(hasAudio && modelSupportsAudio ? audioAttachments : []),
          ...(hasVideo && modelSupportsVideo ? videoAttachments : []),
        ];

        if (supportedAttachments.length > 0) {
          // Build multimodal content for the last user message
          const multimodalContent = await buildMultimodalContent(
            content,
            supportedAttachments.map((a) => ({
              url: a.url,
              mimeType: a.mimeType,
              file: a.file,
              type: a.type,
            }))
          );

          // Previous messages are text-only
          coreMessages = [...messages].map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));

          // Add the new user message with multimodal content
          coreMessages.push({
            role: 'user',
            content: multimodalContent,
          });

          // Log unsupported media types for debugging
          if (hasImages && !modelSupportsVision) {
            console.warn(`Model ${actualModel} does not support vision/images`);
          }
          if (hasAudio && !modelSupportsAudio) {
            console.warn(`Model ${actualModel} does not support audio input`);
          }
          if (hasVideo && !modelSupportsVideo) {
            console.warn(`Model ${actualModel} does not support video input`);
          }
        } else if (hasMediaAttachments) {
          // Has media but model doesn't support any of them
          // For video, try to extract text content via transcription
          let videoContextText = '';

          if (hasVideo && !modelSupportsVideo) {
            const openaiApiKey = providerSettings.openai?.apiKey;
            if (openaiApiKey && videoAttachments.length > 0) {
              try {
                const { buildVideoContextMessage } = await import('@/lib/ai/media/media-utils');
                for (const videoAttachment of videoAttachments) {
                  if (videoAttachment.file) {
                    const videoText = await buildVideoContextMessage(
                      videoAttachment.file,
                      videoAttachment.name,
                      openaiApiKey
                    );
                    videoContextText += videoText + '\n\n';
                  }
                }
                console.log('Extracted video content for AI analysis');
              } catch (err) {
                console.warn('Failed to extract video content:', err);
              }
            } else {
              console.warn('OpenAI API key required for video transcription');
            }
          }

          // Build messages with video context if available
          const enhancedContent = videoContextText ? `${videoContextText}${content}` : content;

          coreMessages = [...messages].map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));
          coreMessages.push({
            role: 'user',
            content: enhancedContent,
          });

          if (!videoContextText && hasVideo) {
            console.warn(
              `Model ${actualModel} does not support video input and transcription unavailable`
            );
          }
        } else {
          // Text-only messages
          coreMessages = [...messages, userMessage].map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));
        }

        // ========== 3. Build enhanced system prompt ==========
        const { systemPrompt: enhancedSystemPrompt, searchSources } = await buildEnhancedSystemPrompt(
          {
            session: session as Parameters<typeof buildEnhancedSystemPrompt>[0]['session'],
            messages,
            content,
            effectiveContent,
            currentSessionId: currentSessionId!,
            currentMode,
            webSearchEnabled,
            thinkingEnabled,
            toolResultsContext,
            hookAdditionalContext,
            providerSettings,
            getProject,
            projectContextHasKnowledge: !!projectContext?.hasKnowledge,
            sourceVerification,
            skillStoreSkills,
            getActiveSkills,
            activateSkill,
            getLearningSessionByChat,
            getLearningConfig: () => useLearningStore.getState().config,
            getLearningPromptTemplates: () => useLearningStore.getState().promptTemplates,
            updateSession,
          },
          formatSearchResults
        );

        // Get active skills for post-response tracking
        const activeSkills = getActiveSkills();

        // Send to AI
        const response = await aiSendMessage(
          {
            messages: coreMessages,
            systemPrompt: enhancedSystemPrompt || undefined,
            ...(currentMode === 'learning' && learningChatTools ? { tools: learningChatTools } : {}),
            temperature: session?.temperature ?? 0.7,
            maxTokens: session?.maxTokens,
            topP: session?.topP,
            frequencyPenalty: session?.frequencyPenalty,
            presencePenalty: session?.presencePenalty,
            sessionId: currentSessionId!,
            messageId: assistantMessage.id,
            onToolEvent: (event) => {
              if (!learningModeV2Enabled) {
                return;
              }
              const normalizedToolName = normalizeLearningToolName(event.toolName) ?? event.toolName;
              const existingPart = toolPartsById.get(event.toolCallId);
              const nextPart: ToolInvocationPart = {
                type: 'tool-invocation',
                toolCallId: event.toolCallId,
                toolName: normalizedToolName,
                args:
                  event.input && typeof event.input === 'object'
                    ? (event.input as Record<string, unknown>)
                    : {},
                state:
                  event.type === 'finish'
                    ? 'output-available'
                    : event.type === 'error'
                      ? 'output-error'
                      : event.type === 'start'
                        ? 'input-available'
                        : 'input-streaming',
                result: event.type === 'finish' ? event.output : existingPart?.result,
                errorText: event.type === 'error' ? event.error : existingPart?.errorText,
                startedAt: existingPart?.startedAt ?? event.startedAt ?? new Date(),
                completedAt: event.type === 'finish' || event.type === 'error'
                  ? event.completedAt ?? new Date()
                  : existingPart?.completedAt,
                duration:
                  event.type === 'finish' || event.type === 'error'
                    ? Math.max(
                        0,
                        (event.completedAt ?? new Date()).getTime() -
                          (existingPart?.startedAt ?? event.startedAt ?? new Date()).getTime()
                      )
                    : existingPart?.duration,
              };
              toolPartsById.set(event.toolCallId, nextPart);
              syncAssistantParts();
            },
            // Per-session streaming override (undefined = use global setting)
            streaming: session?.streamingEnabled,
          },
          // Streaming callback
          (chunk) => {
            streamedAssistantContent += chunk;
            if (
              !streamBufferRef.current ||
              streamBufferRef.current.messageId !== assistantMessage.id
            ) {
              streamBufferRef.current = { messageId: assistantMessage.id, buffer: '' };
            }
            streamBufferRef.current.buffer += chunk;
            if (toolPartsById.size > 0) {
              syncAssistantParts(streamedAssistantContent);
            }

            if (!streamFlushTimerRef.current) {
              streamFlushTimerRef.current = setTimeout(() => {
                flushStreamBuffer();
              }, 75);
            }
          }
        );

        flushStreamBuffer();

        if (response) {
          streamedAssistantContent = response;
        }

        // If no streaming was used, update the message with the full response
        if (response && !isStreaming) {
          await updateMessage(assistantMessage.id, { content: response });
        }

        if (toolPartsById.size > 0) {
          syncAssistantParts(response);
        }

        // Save the final assistant message to database
        let finalContent = response || assistantMessage.content;
        if (finalContent) {
          streamedAssistantContent = finalContent;
          if (toolPartsById.size > 0) {
            syncAssistantParts(finalContent);
          }
          // ========== 4. Post-response processing ==========
          finalContent = await processPostResponse({
            finalContent,
            assistantMessage,
            currentSessionId: currentSessionId!,
            actualModel,
            actualProvider,
            effectiveContent,
            searchSources,
            activeSkills,
            updateMessage,
            loadSuggestions,
            recordSkillUsage,
            autoCreateFromContent,
            addAnalysisResult,
            processA2UIMessage,
          });

          applyLearningSessionAutomation(
            currentSessionId!,
            content,
            finalContent,
            responseStartedAt
          );

          // Add any additional plugin messages (requires addMessage from component scope)
          const pluginEventHooks = getPluginEventHooks();
          const postReceiveResult = await pluginEventHooks.dispatchPostChatReceive({
            content: finalContent,
            messageId: assistantMessage.id,
            sessionId: currentSessionId!,
            model: actualModel,
            provider: actualProvider,
          });
          if (postReceiveResult.additionalMessages?.length) {
            for (const msg of postReceiveResult.additionalMessages) {
              await addMessage({ role: msg.role, content: msg.content });
            }
          }
        }
      } catch (err) {
        console.error('Chat error:', err);
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMessage);
        setLastFailedMessage(content);
      } finally {
        setIsLoading(false);
      }
    },
    [
      activeSessionId,
      messages,
      currentProvider,
      currentModel,
      isAutoMode,
      selectModel,
      aiSendMessage,
      createSession,
      isStreaming,
      session,
      addMessage,
      createStreamingMessage,
      updateMessage,
      loadSuggestions,
      webSearchEnabled,
      thinkingEnabled,
      providerSettings,
      formatSearchResults,
      executeMcpTools,
      currentMode,
      handleAgentMessage,
      getProject,
      projectContext?.hasKnowledge,
      getFormattedQuotes,
      clearQuotes,
      getActiveSkills,
      skillStoreSkills,
      activateSkill,
      recordSkillUsage,
      updateSession,
      getLearningSessionByChat,
      incrementLearningAttempts,
      applyLearningSessionAutomation,
      autoCreateFromContent,
      addAnalysisResult,
      processA2UIMessage,
      sourceVerification,
      checkIntent,
      autoRouterSettings.showRoutingIndicator,
      flushStreamBuffer,
      chatHistoryContextSettings,
      checkFeatureIntent,
      learningChatTools,
      learningModeV2Enabled,
    ]
  );

  const executeExternalSlashCommand = useCallback(
    (commandName: string, args: string) => {
      const prompt = `/${commandName} ${args}`.trim();
      void handleSendMessage(prompt);
    },
    [handleSendMessage]
  );

  useEffect(() => {
    const activeExternalAgentId =
      currentMode === 'agent' ? session?.externalAgentId || null : null;

    if (!activeExternalAgentId) {
      return;
    }

    if (externalAvailableCommands.length === 0) {
      unregisterExternalAgentCommands(activeExternalAgentId);
      return;
    }

    unregisterExternalAgentCommands(activeExternalAgentId);
    registerExternalAgentCommands(
      activeExternalAgentId,
      session?.title || 'External Agent',
      externalAvailableCommands.map((command) => ({
        name: command.name,
        description: command.description,
        inputHint: command.input?.hint,
      })),
      executeExternalSlashCommand
    );

    return () => {
      unregisterExternalAgentCommands(activeExternalAgentId);
    };
  }, [
    currentMode,
    session?.externalAgentId,
    session?.title,
    externalAvailableCommands,
    executeExternalSlashCommand,
  ]);

  /** Stop all in-flight generation: AI streaming, agent execution, and flush remaining buffer. */
  const handleStop = useCallback(() => {
    aiStop();
    flushStreamBuffer();
    // Also stop agent execution if running
    if (isAgentExecuting) {
      stopAgent();
    }
    if (isExternalAgentExecuting) {
      void cancelExternalAgent();
    }
    setIsLoading(false);
    setIsStreaming(false);
  }, [aiStop, flushStreamBuffer, isAgentExecuting, stopAgent, isExternalAgentExecuting, cancelExternalAgent]);

  const handleExternalRuntimeCommand = useCallback(
    (command: string, args?: string) => {
      const prompt = args ? `${command} ${args}` : command;
      void handleSendMessage(prompt);
    },
    [handleSendMessage]
  );

  const handleExternalRuntimeConfigOption = useCallback(
    async (configId: string, value: string) => {
      return setExternalConfigOption(configId, value);
    },
    [setExternalConfigOption]
  );

  const showExternalRuntimeControls =
    currentMode === 'agent' &&
    !!session?.externalAgentId &&
    (externalConfigOptions.length > 0 ||
      externalAvailableCommands.length > 0 ||
      externalPlanEntries.length > 0);

  // Keyboard shortcuts for chat actions
  useKeyboardShortcuts({
    onStopGeneration: isStreaming ? handleStop : undefined,
    onFocusInput: () => inputRef.current?.focus(),
  });

  /**
   * Enter edit mode for a user message.
   *
   * @param messageId - ID of the message to edit
   * @param content - Current content to pre-fill the editor
   */
  const handleEditMessage = useCallback((messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditContent(content);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditContent('');
  }, []);

  /**
   * Save an edited message, delete all subsequent messages, and re-send
   * the edited content to get a fresh AI response.
   * Fires the `onMessageEdit` plugin lifecycle hook.
   *
   * @param messageId - ID of the message being edited
   */
  const handleSaveEdit = useCallback(
    async (messageId: string) => {
      if (!editContent.trim()) return;

      try {
        // ========== Message Edit Hook ==========
        const originalMessage = messages.find((m) => m.id === messageId);
        if (originalMessage) {
          getPluginLifecycleHooks().dispatchOnMessageEdit(
            messageId,
            originalMessage.content,
            editContent,
            activeSessionId || ''
          );
        }

        // Delete all messages after this one
        await deleteMessagesAfter(messageId);

        // Update the message content
        await updateMessage(messageId, { content: editContent });

        // Clear edit state
        setEditingMessageId(null);
        setEditContent('');

        // Re-send to get new response
        // Find the edited message
        const editedMessage = messages.find((m) => m.id === messageId);
        if (editedMessage && editedMessage.role === 'user') {
          // Trigger a new response
          await handleSendMessage(editContent);
        }
      } catch (err) {
        console.error('Failed to edit message:', err);
        setError(err instanceof Error ? err.message : 'Failed to edit message');
      }
    },
    [editContent, deleteMessagesAfter, updateMessage, messages, handleSendMessage, activeSessionId]
  );

  /**
   * Translate a message's content and insert the translation as a new
   * assistant message. Auto-detects language direction:
   * Chinese → English, otherwise → Chinese.
   *
   * @param _messageId - ID of the source message (unused, kept for callback signature)
   * @param content - Text content to translate
   */
  const handleTranslateMessage = useCallback(
    async (_messageId: string, content: string) => {
      const settings = providerSettings[currentProvider as keyof typeof providerSettings];
      if (!settings?.apiKey) {
        setError('No API key configured for translation');
        return;
      }

      try {
        // Auto-detect: translate to English if not English, otherwise to Chinese
        const targetLang = /[\u4e00-\u9fa5]/.test(content) ? 'en' : 'zh';

        const result = await translateText(content, targetLang, {
          provider: currentProvider as ProviderName,
          model: currentModel,
          apiKey: settings.apiKey,
          baseURL: settings.baseURL,
        });

        if (result.success && result.translatedText) {
          // Create a new assistant message with the translation
          const translationMessage: UIMessage = {
            id: `translation-${Date.now()}`,
            role: 'assistant',
            content: `**Translation (${result.sourceLanguage || 'auto'} → ${result.targetLanguage}):**\n\n${result.translatedText}`,
            createdAt: new Date(),
          };
          await addMessage(translationMessage);
        } else if (result.error) {
          setError(result.error);
        }
      } catch (err) {
        console.error('Translation failed:', err);
        setError(err instanceof Error ? err.message : 'Translation failed');
      }
    },
    [providerSettings, currentProvider, currentModel, addMessage]
  );

  /**
   * Start executing a visual workflow selected from the {@link WorkflowPickerDialog}.
   * Creates a workflow result entry, shows the active workflow indicator,
   * and inserts a status message into the conversation.
   *
   * @param workflow - Selected workflow metadata (id, name, icon)
   * @param input - User-provided input parameters for the workflow
   */
  const handleWorkflowSelect = useCallback(
    async (
      workflow: { id: string; name: string; icon?: string },
      input: Record<string, unknown>
    ) => {
      setShowWorkflowPicker(false);

      // Create a workflow result entry
      const resultId = `workflow-${Date.now()}`;
      const resultData: WorkflowResultData = {
        workflowId: workflow.id,
        workflowName: workflow.name,
        executionId: resultId,
        status: 'running' as WorkflowExecutionStatus,
        progress: 0,
        startedAt: new Date(),
        input: input,
      };

      setWorkflowResults((prev) => new Map(prev).set(resultId, resultData));

      // Set active workflow for the indicator
      setActiveWorkflow({
        id: resultId,
        name: workflow.name,
        icon: workflow.icon,
        status: 'running',
        progress: 0,
        currentStep: 'Starting workflow...',
      });

      // Add a message indicating workflow started
      const workflowMessage: UIMessage = {
        id: resultId,
        role: 'assistant',
        content: `🔄 Running workflow: **${workflow.name}**\n\nWorkflow execution started...`,
        createdAt: new Date(),
      };
      await addMessage(workflowMessage);

      // Simulate workflow completion after a delay (in real implementation, this would be tied to actual workflow execution)
      setTimeout(() => {
        setActiveWorkflow((prev) =>
          prev ? { ...prev, status: 'completed', progress: 100 } : null
        );
        // Auto-dismiss after 3 seconds
        setTimeout(() => setActiveWorkflow(null), 3000);
      }, 5000);
    },
    [addMessage]
  );

  /**
   * Regenerate an assistant message by deleting it (and subsequent messages)
   * and re-sending the preceding user message.
   * Fires the `onChatRegenerate` plugin lifecycle hook.
   *
   * @param messageId - ID of the assistant message to regenerate
   */
  const handleRetry = useCallback(
    async (messageId: string) => {
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex === -1) return;

      // Find the user message before this assistant message
      const userMessage = messages
        .slice(0, messageIndex)
        .reverse()
        .find((m) => m.role === 'user');

      if (!userMessage) return;

      // ========== Chat Regenerate Hook ==========
      getPluginLifecycleHooks().dispatchOnChatRegenerate(messageId, activeSessionId || '');

      try {
        // Delete from this message onwards
        await deleteMessagesAfter(userMessage.id);

        // Re-send the user message
        await handleSendMessage(userMessage.content);
      } catch (err) {
        console.error('Failed to retry:', err);
        setError(err instanceof Error ? err.message : 'Failed to retry');
      }
    },
    [messages, deleteMessagesAfter, handleSendMessage, activeSessionId]
  );

  const isEmpty = messages.length === 0 && isInitialized;

  // Note: Removed loading state check to prevent infinite loading issues
  // The UI will show even while messages are loading

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-chat-container>
      <ChatHeader
        sessionId={sessionId}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />

      {/* Chat Goal Banner */}
      {session?.goal && (
        <div className="px-4 py-2 border-b border-border/50">
          <ChatGoalBanner
            goal={session.goal}
            onEdit={() => {
              // Goal editing is handled in ChatHeader's goal dialog
              // We could emit an event or use a store to open it
            }}
            onComplete={() => {
              useSessionStore.getState().completeGoal(session.id);
            }}
            onPause={() => {
              useSessionStore.getState().pauseGoal(session.id);
            }}
            onResume={() => {
              useSessionStore.getState().resumeGoal(session.id);
            }}
            onClear={() => {
              useSessionStore.getState().clearGoal(session.id);
            }}
            compact
          />
        </div>
      )}

      {error && (
        <ErrorMessage
          error={error}
          onRetry={
            lastFailedMessage
              ? () => {
                  setRetryCount((prev) => prev + 1);
                  handleSendMessage(lastFailedMessage);
                }
              : undefined
          }
          onDismiss={() => {
            setError(null);
            setRetryCount(0);
            setLastFailedMessage(null);
          }}
          autoRetry={!!lastFailedMessage}
          maxRetries={3}
          retryCount={retryCount}
        />
      )}

      {/* Flow Canvas View */}
      {viewMode === 'flow' && activeSessionId && flowCanvasState ? (
        <div className="flex-1 min-h-0">
          <ErrorBoundaryProvider maxRetries={2}>
          <FlowChatCanvas
            sessionId={activeSessionId}
            messages={messages}
            branches={branches}
            activeBranchId={activeBranchId}
            canvasState={flowCanvasState}
            isLoading={isLoading}
            isStreaming={isStreaming}
            streamingMessageId={streamingMessageId}
            onCanvasStateChange={(updates) => updateFlowCanvasState(activeSessionId, updates)}
            onNodeSelect={(nodeIds) => {
              setSelectedNodes(activeSessionId, nodeIds);
            }}
            onFollowUp={(messageId, content) => {
              // Pre-fill input with referenced message content for follow-up
              if (content) {
                setInputValue(content);
              } else {
                const msg = messages.find((m) => m.id === messageId);
                if (msg?.content) {
                  setInputValue(`> ${msg.content.slice(0, 200)}${msg.content.length > 200 ? '...' : ''}\n\n`);
                }
              }
            }}
            onRegenerate={(messageId) => {
              handleRetry(messageId);
            }}
            onCreateBranch={(messageId) => {
              const createBranch = useSessionStore.getState().createBranch;
              createBranch(activeSessionId, messageId);
            }}
            onDeleteNode={(messageId, deleteSubsequent) => {
              if (deleteSubsequent) {
                deleteMessagesAfter(messageId);
              }
            }}
            onAddReference={(reference) => {
              // Insert referenced content into input area
              const refMsg = messages.find((m) => m.id === reference.messageId);
              if (refMsg?.content) {
                setInputValue((prev) => prev + `\n> [ref: ${refMsg.role}] ${refMsg.content.slice(0, 300)}\n\n`);
              }
            }}
          />
          </ErrorBoundaryProvider>
        </div>
      ) : viewMode === 'arena' ? (
        /* Arena View */
        <div className="flex-1 min-h-0">
          <ErrorBoundaryProvider maxRetries={2}>
          <ArenaChatView
            sessionId={activeSessionId || undefined}
            systemPrompt={activePreset?.systemPrompt}
            initialPrompt={inputValue}
          />
          </ErrorBoundaryProvider>
        </div>
      ) : session?.multiModelConfig?.enabled && session.multiModelConfig.models.length >= 2 ? (
        /* Multi-Model Arena Chat View */
        <div className="flex-1 min-h-0">
          <ErrorBoundaryProvider maxRetries={2}>
          <MultiColumnChat
            sessionId={activeSessionId || ''}
            models={session.multiModelConfig.models}
            onModelsChange={(models) => {
              if (session) {
                updateSession(session.id, {
                  multiModelConfig: {
                    ...session.multiModelConfig!,
                    models,
                  },
                });
              }
            }}
            systemPrompt={session.systemPrompt || activePreset?.systemPrompt}
          />
          </ErrorBoundaryProvider>
        </div>
      ) : (
        /* List View (default) */
        <Conversation>
          {isEmpty ? (
            <>
              {/* Show carried context banner if session was created with context from mode switch */}
              {session?.carriedContext && (
                <CarriedContextBanner
                  fromMode={session.carriedContext.fromMode}
                  toMode={currentMode}
                  summary={session.carriedContext.summary}
                  carriedAt={new Date(session.carriedContext.carriedAt)}
                  onDismiss={() => {
                    // Clear carried context from session
                    if (session) {
                      updateSession(session.id, { carriedContext: undefined } as Parameters<
                        typeof updateSession
                      >[1]);
                    }
                  }}
                />
              )}
              <WelcomeState
                mode={currentMode}
                onSuggestionClick={handleSuggestionClick}
                onModeChange={handleModeChange}
                agentModeId={agentModeId}
                onAgentModeChange={handleAgentModeChange}
                modelName={currentModel}
                providerName={currentProvider}
                onSelectTemplate={(template) => {
                  // Apply template settings to session
                  if (session) {
                    updateSession(session.id, {
                      systemPrompt: template.systemPrompt,
                      provider: (template.provider as ProviderName) || session.provider,
                      model: template.model || session.model,
                    });
                  }
                  // Set initial message if provided
                  if (template.initialMessage) {
                    setInputValue(template.initialMessage);
                  }
                }}
              />
            </>
          ) : (
            <ConversationContent>
              <VirtualizedChatMessageList
                messages={messages}
                sessionId={activeSessionId!}
                isStreaming={isStreaming}
                isLoading={isLoading}
                editingMessageId={editingMessageId}
                editContent={editContent}
                onEditContentChange={setEditContent}
                onEditMessage={handleEditMessage}
                onCancelEdit={handleCancelEdit}
                onSaveEdit={handleSaveEdit}
                onRetry={handleRetry}
                onCopyMessagesForBranch={copyMessagesForBranch}
                onTranslate={handleTranslateMessage}
                hasOlderMessages={hasOlderMessages}
                isLoadingOlder={isLoadingOlder}
                loadOlderMessages={loadOlderMessages}
                workflowResults={workflowResults}
                onWorkflowRerun={(_input) => setShowWorkflowPicker(true)}
                hideMessageActions={isSimplifiedMode && simplifiedModeSettings.hideMessageActions}
                hideMessageTimestamps={isSimplifiedMode && simplifiedModeSettings.hideMessageTimestamps}
                showTokenUsageMeter={showTokenUsageMeter}
              />
            </ConversationContent>
          )}
          <ConversationScrollButton />
        </Conversation>
      )}

      {/* Suggestions after AI response */}
      {!isLoading && !isStreaming && suggestions.length > 0 && messages.length > 0 && (
        <div className="px-4 pb-3 mx-auto w-full max-w-4xl animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
          <Suggestions>
            {suggestions.map((suggestion, index) => (
              <Suggestion
                key={index}
                suggestion={suggestion.text}
                onClick={handleSuggestionClick}
                className="animate-in fade-in-0 duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              />
            ))}
          </Suggestions>
        </div>
      )}

      {/* Quoted content display */}
      <QuotedContent />

      {/* Skill suggestions based on input - floats above chat input */}
      {inputValue.length >= 3 && (
        <div className="relative mx-auto w-full max-w-4xl px-4">
          <div className="absolute bottom-0 left-4 right-4 z-10">
            <SkillSuggestions query={inputValue} showActiveSkills={true} />
          </div>
        </div>
      )}

      {/* Auto-Routing Indicator - shown when auto mode selected a model */}
      {isAutoMode && showRoutingIndicator && lastRoutingSelection && (
        <div className="px-4 pb-2">
          <RoutingIndicator
            selection={lastRoutingSelection}
            isVisible={showRoutingIndicator}
            onDismiss={() => setShowRoutingIndicator(false)}
            availableModels={getAvailableModels()}
            onOverride={(provider, model) => {
              if (session) {
                updateSession(session.id, { provider, model });
                setShowRoutingIndicator(false);
              }
            }}
            compact={false}
          />
        </div>
      )}

      {/* Quick Reply Bar - AI-powered suggestions (only show after assistant messages) */}
      {messages.length > 0 &&
        messages[messages.length - 1]?.role === 'assistant' &&
        !isLoading &&
        !isStreaming && (
          <QuickReplyBar
            messages={messages}
            onSelect={(text) => {
              setInputValue(text);
              inputRef.current?.focus();
            }}
            disabled={isLoading || isStreaming}
          />
        )}

      {/* Workflow Indicator - shown when a workflow is selected/running */}
      {activeWorkflow && (
        <WorkflowIndicator
          name={activeWorkflow.name}
          icon={activeWorkflow.icon}
          status={activeWorkflow.status}
          progress={activeWorkflow.progress}
          currentStep={activeWorkflow.currentStep}
          onCancel={() => setActiveWorkflow(null)}
          onPause={() => setActiveWorkflow((prev) => (prev ? { ...prev, status: 'paused' } : null))}
          onResume={() =>
            setActiveWorkflow((prev) => (prev ? { ...prev, status: 'running' } : null))
          }
        />
      )}

      <PluginExtensionPoint point="chat.input.above" />
      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSubmit={(content, attachments, toolCalls) => {
          handleSendMessage(content, attachments, toolCalls);
          setInputValue('');
          // Hide routing indicator after sending
          setShowRoutingIndicator(false);
        }}
        isLoading={isLoading}
        isStreaming={isStreaming}
        onStop={handleStop}
        onOptimizePrompt={handleOpenPromptOptimizer}
        contextUsagePercent={contextUsagePercent}
        onOpenContextSettings={() => setShowContextSettings(true)}
        onOpenAISettings={() => setShowAISettings(true)}
        webSearchEnabled={webSearchEnabled}
        thinkingEnabled={thinkingEnabled}
        streamingEnabled={session?.streamingEnabled}
        onWebSearchChange={handleWebSearchChange}
        onThinkingChange={handleThinkingChange}
        onStreamingChange={(enabled) => {
          if (session) {
            updateSession(session.id, { streamingEnabled: enabled });
          }
        }}
        modelName={currentModel}
        providerId={currentProvider}
        modeName={
          currentMode === 'chat'
            ? 'Chat'
            : currentMode === 'agent'
              ? 'Agent'
              : currentMode === 'learning'
                ? 'Learning'
                : 'Research'
        }
        onModeClick={() => {
          // Cycle through modes: chat -> agent -> research -> chat
          const modes: ChatMode[] = ['chat', 'agent', 'research'];
          const currentIndex = modes.indexOf(currentMode);
          const nextMode = modes[(currentIndex + 1) % modes.length];
          handleModeChange(nextMode);
        }}
        onModelClick={() => setShowModelPicker(true)}
        onWorkflowClick={() => setShowWorkflowSelector(true)}
        onPresetChange={handleSelectPreset}
        onCreatePreset={() => {
          setEditingPresetId(null);
          setShowPresetManager(true);
        }}
        onManagePresets={() => {
          setEditingPresetId(null);
          setShowPresetManager(true);
        }}
        onOpenWorkflowPicker={() => setShowWorkflowPicker(true)}
        onOpenPromptOptimization={() => setShowPromptOptimizationHub(true)}
        onOpenArena={() => setShowArenaDialog(true)}
        hasActivePreset={!!activePreset}
        multiModelEnabled={session?.multiModelConfig?.enabled}
        multiModelModels={session?.multiModelConfig?.models}
        onMultiModelModelsChange={(models) => {
          if (session) {
            updateSession(session.id, {
              multiModelConfig: {
                ...session.multiModelConfig!,
                models,
              },
            });
          }
        }}
      />
      {showExternalRuntimeControls && (
        <div className="px-3 pb-2 flex flex-col gap-2">
          {externalConfigOptions.length > 0 && (
            <ExternalAgentConfigOptions
              configOptions={externalConfigOptions}
              onSetConfigOption={handleExternalRuntimeConfigOption}
              disabled={isLoading || isStreaming}
              compact
            />
          )}
          {(externalAvailableCommands.length > 0 || externalPlanEntries.length > 0) && (
            <div className="flex flex-col gap-2">
              {externalAvailableCommands.length > 0 && (
                <ExternalAgentCommands
                  commands={externalAvailableCommands}
                  onExecute={handleExternalRuntimeCommand}
                  isExecuting={isExternalAgentExecuting}
                />
              )}
              {externalPlanEntries.length > 0 && (
                <ExternalAgentPlan
                  entries={externalPlanEntries}
                  currentStep={externalPlanStep ?? undefined}
                />
              )}
            </div>
          )}
        </div>
      )}
      <PluginExtensionPoint point="chat.input.below" />
      <PluginExtensionPoint point="chat.footer" />

      <ChatDialogs
        // Prompt optimizer
        showPromptOptimizer={showPromptOptimizer}
        setShowPromptOptimizer={setShowPromptOptimizer}
        showPromptOptimizationHub={showPromptOptimizationHub}
        setShowPromptOptimizationHub={setShowPromptOptimizationHub}
        inputValue={inputValue}
        onApplyOptimizedPrompt={handleApplyOptimizedPrompt}
        activePreset={activePreset}
        // Preset manager
        showPresetManager={showPresetManager}
        setShowPresetManager={setShowPresetManager}
        editingPresetId={editingPresetId}
        onPresetSelect={handleSelectPreset}
        // Context settings
        showContextSettings={showContextSettings}
        setShowContextSettings={setShowContextSettings}
        showContextDebug={showContextDebug}
        setShowContextDebug={setShowContextDebug}
        contextLimitPercent={contextLimitPercent}
        setContextLimitPercent={setContextLimitPercent}
        showMemoryActivation={showMemoryActivation}
        setShowMemoryActivation={setShowMemoryActivation}
        showTokenUsageMeter={showTokenUsageMeter}
        setShowTokenUsageMeter={setShowTokenUsageMeter}
        modelMaxTokens={modelMaxTokens}
        estimatedTokens={estimatedTokens}
        messageCount={messages.length}
        onOptimizeContext={handleOptimizeContext}
        setShowClearContextConfirm={setShowClearContextConfirm}
        // AI settings
        showAISettings={showAISettings}
        setShowAISettings={setShowAISettings}
        currentAISettings={currentAISettings}
        onAISettingsChange={handleAISettingsChange}
        globalDefaultAISettings={globalDefaultAISettings}
        // Model picker
        showModelPicker={showModelPicker}
        setShowModelPicker={setShowModelPicker}
        currentProvider={currentProvider}
        currentModel={currentModel}
        isAutoMode={isAutoMode}
        sessionId={activeSessionId}
        updateSession={updateSession}
        // Tool approval & timeline
        toolApprovalRequest={toolApprovalRequest}
        showToolApproval={showToolApproval}
        setShowToolApproval={handleToolApprovalOpenChange}
        onToolApproval={handleToolApproval}
        onToolDeny={handleToolDeny}
        onToolOptionSelect={handleToolOptionSelect}
        currentMode={currentMode}
        toolTimelineExecutions={toolTimelineExecutions}
        // Mode switch suggestion
        showSuggestion={showSuggestion}
        detectionResult={detectionResult}
        onAcceptSuggestion={acceptSuggestion}
        onDismissSuggestion={dismissSuggestion}
        onKeepCurrentMode={keepCurrentMode}
        // Feature navigation
        hasFeatureRoutingSuggestion={hasFeatureRoutingSuggestion}
        pendingFeature={pendingFeature}
        featureDetectionResult={featureDetectionResult}
        featureRoutingMessage={featureRoutingMessage}
        onConfirmFeatureNavigation={confirmFeatureNavigation}
        onContinueFeatureInChat={continueFeatureInChat}
        onDismissFeatureRouting={dismissFeatureRouting}
        onSendMessage={handleSendMessage}
        // Workflow
        showWorkflowSelector={showWorkflowSelector}
        setShowWorkflowSelector={setShowWorkflowSelector}
        showWorkflowPicker={showWorkflowPicker}
        setShowWorkflowPicker={setShowWorkflowPicker}
        onWorkflowSelect={handleWorkflowSelect}
        // PPT preview
        activePresentation={activePresentation}
        showPPTPreview={showPPTPreview}
        setShowPPTPreview={setShowPPTPreview}
        // Learning mode
        showLearningPanel={showLearningPanel}
        setShowLearningPanel={setShowLearningPanel}
        learningPanelRef={learningPanelRef}
        showLearningStartDialog={showLearningStartDialog}
        setShowLearningStartDialog={setShowLearningStartDialog}
        // Source verification
        sourceVerification={sourceVerification}
        // Clear context confirm
        showClearContextConfirm={showClearContextConfirm}
        onClearMessages={_clearMessages}
        // Mode switch confirm
        showModeSwitchDialog={showModeSwitchDialog}
        setShowModeSwitchDialog={setShowModeSwitchDialog}
        pendingTargetMode={pendingTargetMode}
        sessionTitle={session?.title}
        onModeSwitchConfirm={handleModeSwitchConfirm}
        onModeSwitchCancel={handleModeSwitchCancel}
        onGenerateSummaryForModeSwitch={handleGenerateSummaryForModeSwitch}
        // Arena
        showArenaDialog={showArenaDialog}
        setShowArenaDialog={setShowArenaDialog}
        activeSessionId={activeSessionId}
        activePresetSystemPrompt={activePreset?.systemPrompt}
        arenaBattleId={arenaBattleId}
        showArenaBattle={showArenaBattle}
        setShowArenaBattle={setShowArenaBattle}
        setArenaBattleId={setArenaBattleId}
      />
    </div>
  );
}

export default ChatContainer;
