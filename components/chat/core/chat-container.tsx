'use client';

/**
 * ChatContainer - main chat component with AI integration
 * Uses Vercel AI SDK for streaming chat with multiple providers
 * Messages are persisted to IndexedDB via useMessages hook
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { useTranslations } from 'next-intl';
import {
  Copy,
  Check,
  Pencil,
  RotateCcw,
  Languages,
  Bookmark,
  BookmarkCheck,
  Volume2,
  VolumeX,
  Share2,
  Loader2,
  BookOpen,
} from 'lucide-react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  Message as MessageUI,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from '@/components/ai-elements/message';
import { Loader } from '@/components/ai-elements/loader';
import { ErrorMessage } from '../message';
import { ChatHeader } from './chat-header';
import { PluginExtensionPoint } from '@/components/plugin/extension';
import { ChatInput, type Attachment } from '../chat-input';
import { QuickReplyBar } from '../ui/quick-reply-bar';
import { WorkflowIndicator, type WorkflowStatus } from '../ui/workflow-indicator';
import { useKeyboardShortcuts } from '../ui/keyboard-shortcuts-handler';
import {
  ContextSettingsDialog,
  ContextDebugDialog,
  AISettingsDialog,
  type AISettings,
  ModelPickerDialog,
  PresetManagerDialog,
  ModeSwitchConfirmDialog,
} from '../dialogs';
import { PromptOptimizerDialog, PromptOptimizationHub } from '@/components/prompt';
import { WorkflowPickerDialog } from '../workflow/workflow-picker-dialog';
import { ArenaDialog, ArenaBattleView, ArenaChatView } from '@/components/arena';
import { MultiColumnChat } from './multi-column-chat';
import {
  WorkflowResultCard,
  type WorkflowResultData,
  type WorkflowExecutionStatus,
} from '../workflow/workflow-result-card';
import { MessageSwipeActions, type SwipeAction } from '../ui/message-swipe-actions';
import { WelcomeState } from '../welcome/welcome-state';
import { CarriedContextBanner } from '../ui/carried-context-banner';
import { ChatGoalBanner } from '../goal';
import { BranchButton } from '../selectors';
import { TextSelectionPopover } from '../popovers';
import { QuotedContent } from '../message';
import { TextPart, ReasoningPart, ToolPart, SourcesPart, A2UIPart } from '../message-parts';
import { A2UIMessageRenderer, hasA2UIContent, useA2UIMessageIntegration } from '@/components/a2ui';
import { MessageReactions } from '../message';
import { MessageArtifacts, MessageAnalysisResults } from '@/components/artifacts';
import type { EmojiReaction } from '@/types/core/message';
import type { MessagePart } from '@/types/core/message';
import { Suggestions, Suggestion } from '@/components/ai-elements/suggestion';
import {
  ToolTimeline,
  ToolApprovalDialog,
  WorkflowSelector,
  type ToolExecution,
  type ToolApprovalRequest,
} from '@/components/agent';
import { PPTPreview } from '@/components/ppt';
import { SkillSuggestions } from '@/components/skills';
import { LearningModePanel, LearningStartDialog } from '@/components/learning';
import { useSkillStore } from '@/stores/skills';
import { buildProgressiveSkillsPrompt, findMatchingSkills } from '@/lib/skills/executor';
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
import { SourceVerificationDialog } from '@/components/search/source-verification-dialog';
import { SearchSourcesIndicator } from '@/components/search/search-sources-indicator';
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
} from '@/stores';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useMessages, useAgent, useProjectContext, calculateTokenBreakdown, useTTS } from '@/hooks';
import { useIntentDetection } from '@/hooks/chat/use-intent-detection';
import { useFeatureRouting } from '@/hooks/chat/use-feature-routing';
import { ModeSwitchSuggestion } from '../ui/mode-switch-suggestion';
import { FeatureNavigationDialog } from '../ui/feature-navigation-dialog';
import type { ParsedToolCall, ToolCallResult } from '@/types/mcp';
import {
  useAIChat,
  useAutoRouter,
  type ProviderName,
  isVisionModel,
  buildMultimodalContent,
  type MultimodalMessage,
  isAudioModel,
  isVideoModel,
} from '@/lib/ai';
import { RoutingIndicator } from '../ui/routing-indicator';
import { ProviderIcon } from '@/components/providers/ai/provider-icon';
import type { ModelSelection } from '@/types/provider/auto-router';
import { messageRepository } from '@/lib/db';
import { PROVIDERS } from '@/types/provider';
import type { ChatMode, UIMessage, ChatViewMode } from '@/types';
import { getPluginEventHooks, getPluginLifecycleHooks } from '@/lib/plugin';
import { toast } from 'sonner';
import { useSummary } from '@/hooks/chat';
import { FlowChatCanvas } from '../flow';
import type { AgentModeConfig } from '@/types/agent/agent-mode';
import { useStickToBottomContext } from 'use-stick-to-bottom';

interface ChatContainerProps {
  sessionId?: string;
}

export function ChatContainer({ sessionId }: ChatContainerProps) {
  const t = useTranslations('chat');
  const tCommon = useTranslations('common');
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
  const defaultTemperature = useSettingsStore((state) => state.defaultTemperature);
  const defaultMaxTokens = useSettingsStore((state) => state.defaultMaxTokens);
  const defaultTopP = useSettingsStore((state) => state.defaultTopP);
  const defaultFrequencyPenalty = useSettingsStore((state) => state.defaultFrequencyPenalty);
  const defaultPresencePenalty = useSettingsStore((state) => state.defaultPresencePenalty);
  const addAlwaysAllowedTool = useSettingsStore((state) => state.addAlwaysAllowedTool);
  const simplifiedModeSettings = useSettingsStore((state) => state.simplifiedModeSettings);
  const isSimplifiedMode = simplifiedModeSettings.enabled;

  // Local state
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Derive streaming message ID for flow canvas
  const streamingMessageId = useMemo(() => {
    if (!isStreaming || messages.length === 0) return undefined;
    const lastMsg = messages[messages.length - 1];
    return lastMsg.role === 'assistant' ? lastMsg.id : undefined;
  }, [isStreaming, messages]);

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

  // Token usage calculation using provider-aware estimation
  // Uses tiktoken for OpenAI models, estimation for others
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

  // Model max tokens (varies by model)
  const modelMaxTokens = useMemo(() => {
    const modelTokenLimits: Record<string, number> = {
      'gpt-4o': 128000,
      'gpt-4-turbo': 128000,
      'gpt-4': 8192,
      'gpt-3.5-turbo': 16385,
      'claude-3-opus': 200000,
      'claude-3-sonnet': 200000,
      'claude-3-haiku': 200000,
    };
    return modelTokenLimits[currentModel] || 100000;
  }, [currentModel]);

  const contextUsagePercent = useMemo(() => {
    const limit = Math.round((contextLimitPercent / 100) * modelMaxTokens);
    return limit > 0 ? Math.min(100, Math.round((estimatedTokens.totalTokens / limit) * 100)) : 0;
  }, [estimatedTokens.totalTokens, contextLimitPercent, modelMaxTokens]);

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

  // Initialize agent tools based on available API keys and search providers
  const { searchProviders: agentSearchProviders, defaultSearchProvider: agentDefaultSearchProvider } = useSettingsStore();
  const allAgentTools = useMemo(() => {
    const tavilyApiKey = providerSettings.tavily?.apiKey;
    const openaiApiKey = providerSettings.openai?.apiKey;
    const hasEnabledSearchProvider = Object.values(agentSearchProviders).some(
      (p) => p.enabled && p.apiKey
    );
    return initializeAgentTools({
      tavilyApiKey,
      openaiApiKey,
      searchProviders: hasEnabledSearchProvider ? agentSearchProviders : undefined,
      defaultSearchProvider: agentDefaultSearchProvider,
      enableWebSearch: hasEnabledSearchProvider || !!tavilyApiKey,
      enableCalculator: true,
      enableRAGSearch: true,
      enableWebScraper: true,
      enableDocumentTools: true,
      enableAcademicTools: true,
      enableImageTools: !!openaiApiKey,
      enablePPTTools: true,
      enableLearningTools: true,
    });
  }, [providerSettings.tavily?.apiKey, providerSettings.openai?.apiKey, agentSearchProviders, agentDefaultSearchProvider]);

  // Create MCP tools for custom mode if configured
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

  // Filter tools based on custom mode configuration and merge with MCP tools
  const agentTools = useMemo(() => {
    let tools = allAgentTools;
    if (currentCustomMode?.tools && currentCustomMode.tools.length > 0) {
      tools = filterToolsForMode(allAgentTools, currentCustomMode.tools);
    }
    // Merge with custom mode MCP tools
    return { ...tools, ...customModeMcpTools };
  }, [allAgentTools, currentCustomMode, customModeMcpTools]);

  // Process system prompt with template variables and active skills
  const processedSystemPrompt = useMemo(() => {
    const basePrompt =
      session?.systemPrompt || 'You are a helpful AI assistant with access to tools.';
    let prompt = basePrompt;
    if (currentCustomMode) {
      prompt = processPromptTemplateVariables(basePrompt, {
        modeName: currentCustomMode.name,
        modeDescription: currentCustomMode.description,
        tools: currentCustomMode.tools,
      });
    }

    // Inject active skills into agent mode system prompt
    const activeSkills = getActiveSkills();
    if (activeSkills.length > 0) {
      const {
        prompt: skillsPrompt,
        level,
        tokenEstimate,
      } = buildProgressiveSkillsPrompt(activeSkills, 4000);
      if (skillsPrompt) {
        console.log(
          `[Agent] Injecting ${activeSkills.length} skills (level: ${level}, ~${tokenEstimate} tokens)`
        );
        prompt = `${skillsPrompt}\n\n${prompt}`;
      }
    }

    return prompt;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.systemPrompt, currentCustomMode, getActiveSkills, skillStoreActiveIds]);

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
    systemPrompt: processedSystemPrompt,
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

  // Handle tool approval
  const handleToolApproval = useCallback(
    async (toolCallId: string, alwaysAllow?: boolean) => {
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
    [toolApprovalRequest, addAlwaysAllowedTool]
  );

  const handleToolDeny = useCallback((toolCallId: string) => {
    if (pendingApprovalRef.current) {
      pendingApprovalRef.current.resolve(false);
      pendingApprovalRef.current = null;
    }
    setShowToolApproval(false);
    setToolApprovalRequest(null);
    console.log('Tool denied:', toolCallId);
  }, []);

  // Convert agent tool executions to ToolTimeline format
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

  // Handle mode switch confirmation
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

  // Generate summary for mode switch
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

  // Handle agent sub-mode change (within agent mode)
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

  // Handle preset selection
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

  // Handle web search toggle
  const handleWebSearchChange = useCallback(
    (enabled: boolean) => {
      if (session) {
        updateSession(session.id, { webSearchEnabled: enabled });
      }
    },
    [session, updateSession]
  );

  // Handle thinking mode toggle
  const handleThinkingChange = useCallback(
    (enabled: boolean) => {
      if (session) {
        updateSession(session.id, { thinkingEnabled: enabled });
      }
    },
    [session, updateSession]
  );

  // Handle AI settings change
  const handleAISettingsChange = useCallback(
    (settings: Partial<AISettings>) => {
      if (session) {
        updateSession(session.id, settings);
      }
    },
    [session, updateSession]
  );

  // Get current AI settings from session (fallback to global defaults)
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

  // Global default AI settings for reset functionality
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

  // Generate suggestions after AI response
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

  // Handle applying optimized prompt
  const handleApplyOptimizedPrompt = useCallback((optimizedPrompt: string) => {
    setInputValue(optimizedPrompt);
    setShowPromptOptimizer(false);
  }, []);

  // Open prompt optimizer (passed to ChatInput)
  const handleOpenPromptOptimizer = useCallback(() => {
    if (inputValue.trim()) {
      setShowPromptOptimizer(true);
    }
  }, [inputValue]);

  // Format search results for system prompt with enhanced context
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

  // Execute MCP tool calls and return results
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

  // Format tool call result for display
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

  // Handle Agent mode message sending
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
        // Run the agent with the user's prompt
        const agentResult = await runAgent(content);

        if (agentResult.success) {
          // Format the agent response with tool execution info
          let formattedResponse = agentResult.finalResponse;

          // Add tool execution summary if there were tool calls
          if (agentResult.steps.length > 0) {
            const toolSummary = agentResult.steps
              .filter((step) => step.toolCalls.length > 0)
              .map((step) => {
                const toolInfo = step.toolCalls
                  .map(
                    (tc) =>
                      `- **${tc.name}**: ${tc.status === 'completed' ? '✅' : '❌'} ${tc.status}`
                  )
                  .join('\n');
                return toolInfo;
              })
              .join('\n');

            if (toolSummary) {
              formattedResponse = `${formattedResponse}\n\n---\n**Tools Used:**\n${toolSummary}`;
            }
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
      runAgent,
      updateMessage,
      currentModel,
      currentProvider,
      loadSuggestions,
    ]
  );

  const handleSendMessage = useCallback(
    async (content: string, attachments?: Attachment[], toolCalls?: ParsedToolCall[]) => {
      if (!content.trim() && (!attachments || attachments.length === 0)) return;

      // ========== Pre-Chat Hook: UserPromptSubmit ==========
      // Allow plugins to modify, block, or enhance the user's prompt
      const pluginEventHooks = getPluginEventHooks();
      const promptResult = await pluginEventHooks.dispatchUserPromptSubmit(
        content,
        activeSessionId || '',
        {
          attachments: attachments?.map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type as 'image' | 'audio' | 'video' | 'file' | 'document',
            url: a.url,
            size: a.size,
            mimeType: a.mimeType,
          })),
          mode: currentMode,
          previousMessages: messages.map((m) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
          })),
        }
      );

      // Handle hook result: block, modify, or proceed
      if (promptResult.action === 'block') {
        toast.error(promptResult.blockReason || 'Message blocked by plugin');
        return;
      }

      // Use modified content if hook returned modifications
      const effectiveContent =
        promptResult.action === 'modify' && promptResult.modifiedPrompt
          ? promptResult.modifiedPrompt
          : content;

      // Store additional context from hook (will be added to system prompt later)
      const hookAdditionalContext = promptResult.additionalContext;
      // ========== End Pre-Chat Hook ==========

      // Check for feature routing intent (navigate to feature pages)
      const featureResult = await checkFeatureIntent(effectiveContent);
      if (featureResult.detected && featureResult.feature) {
        // If feature intent detected with high confidence, the dialog will show
        // and the message will be sent after user confirms or continues
        return;
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

      // Build message content with quotes and attachments
      let messageContent = effectiveContent;

      // Prepend quoted content if any
      const formattedQuotes = getFormattedQuotes();
      if (formattedQuotes) {
        messageContent = `${formattedQuotes}\n\n${effectiveContent}`;
        clearQuotes(); // Clear quotes after including them
      }

      if (attachments && attachments.length > 0) {
        const attachmentInfo = attachments.map((a) => `[Attached: ${a.name}]`).join(' ');
        messageContent = messageContent ? `${messageContent}\n\n${attachmentInfo}` : attachmentInfo;
      }

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

        // Build enhanced system prompt starting with project context if available
        let enhancedSystemPrompt = '';

        // Add carried context from mode switch if available
        if (session?.carriedContext && messages.length === 0) {
          const contextNote = `## Context from Previous Conversation\n\nThe user switched from ${session.carriedContext.fromMode} mode. Here's a summary of the previous conversation to provide context:\n\n${session.carriedContext.summary}\n\n---\n\nUse this context to provide continuity in your responses.`;
          enhancedSystemPrompt = contextNote;
        }

        // Add history context from recent sessions if available (only on first message)
        if (session?.historyContext?.contextText && messages.length === 0) {
          enhancedSystemPrompt = enhancedSystemPrompt
            ? `${session.historyContext.contextText}\n\n${enhancedSystemPrompt}`
            : session.historyContext.contextText;
        }

        // Add project knowledge base context if available
        if (session?.projectId && projectContext?.hasKnowledge) {
          // Rebuild context with the current query for relevance filtering
          const project = getProject(session.projectId);
          if (project) {
            const { buildProjectContext } = await import('@/lib/document/knowledge-rag');
            const queryContext = buildProjectContext(project, content, {
              maxContextLength: 6000,
              useRelevanceFiltering: true,
            });
            enhancedSystemPrompt = queryContext.systemPrompt;
            console.log(
              `Using ${queryContext.filesUsed.length} knowledge files:`,
              queryContext.filesUsed
            );
          }
        } else if (session?.systemPrompt) {
          enhancedSystemPrompt = session.systemPrompt;
        }

        // Track search sources for attaching to assistant message
        let searchSources: import('@/types/core/message').Source[] | undefined;

        // Perform web search if enabled (multi-provider with fallback)
        if (webSearchEnabled) {
          const { searchProviders, defaultSearchProvider, searchMaxResults } = useSettingsStore.getState();
          const hasEnabledProvider = Object.values(searchProviders).some(
            (p) => p.enabled && p.apiKey
          );
          // Fallback to legacy tavily key
          const tavilyApiKey = providerSettings.tavily?.apiKey;

          if (hasEnabledProvider || tavilyApiKey) {
            try {
              const { executeWebSearch } = await import('@/lib/ai/tools/web-search');
              const { optimizeSearchQuery } = await import('@/lib/search/search-query-optimizer');
              // Optimize search query: extract focused query from user message
              const searchQuery = optimizeSearchQuery(effectiveContent);

              const searchResult = await executeWebSearch(
                {
                  query: searchQuery,
                  maxResults: searchMaxResults || 5,
                  searchDepth: 'basic',
                },
                hasEnabledProvider
                  ? { providerSettings: searchProviders, provider: defaultSearchProvider }
                  : { apiKey: tavilyApiKey }
              );

              if (searchResult.success && searchResult.results && searchResult.results.length > 0) {
                const searchResponse: SearchResponse = {
                  provider: searchResult.provider || defaultSearchProvider || 'tavily',
                  query: searchResult.query || searchQuery,
                  answer: searchResult.answer,
                  results: searchResult.results.map((r) => ({
                    title: r.title,
                    url: r.url,
                    content: r.content,
                    score: r.score,
                    publishedDate: r.publishedDate,
                  })),
                  responseTime: searchResult.responseTime || 0,
                };

                // Store sources for attaching to assistant message
                searchSources = searchResult.results.map((r, i) => ({
                  id: `search-${i}`,
                  title: r.title,
                  url: r.url,
                  snippet: r.content?.slice(0, 200) || '',
                  relevance: r.score || 0,
                }));

                // Apply source verification if enabled
                const verificationSettings = sourceVerification.settings;

                if (verificationSettings.enabled && verificationSettings.mode === 'ask') {
                  await sourceVerification.verifyResults(searchResponse);
                  const searchContext = formatSearchResults(searchResponse);
                  enhancedSystemPrompt = enhancedSystemPrompt
                    ? `${enhancedSystemPrompt}\n\n${searchContext}`
                    : searchContext;
                } else if (verificationSettings.enabled && verificationSettings.mode === 'auto') {
                  const verified = await sourceVerification.verifyResults(searchResponse);
                  const filteredResults = verified.results.filter((r) => r.isEnabled);
                  if (filteredResults.length > 0) {
                    const filteredResponse: SearchResponse = {
                      ...searchResponse,
                      results: filteredResults,
                    };
                    const searchContext = formatSearchResults(filteredResponse);
                    enhancedSystemPrompt = enhancedSystemPrompt
                      ? `${enhancedSystemPrompt}\n\n${searchContext}`
                      : searchContext;
                  }
                } else {
                  const searchContext = formatSearchResults(searchResponse);
                  enhancedSystemPrompt = enhancedSystemPrompt
                    ? `${enhancedSystemPrompt}\n\n${searchContext}`
                    : searchContext;
                }
              }
            } catch (searchError) {
              console.warn('Web search failed:', searchError);
            }
          }
        }

        // Add thinking mode instructions if enabled
        if (thinkingEnabled) {
          const thinkingPrompt = `You are in "Thinking Mode". Before providing your final answer, you must:

1. **Think Step by Step**: Break down the problem into smaller parts
2. **Consider Multiple Angles**: Look at the question from different perspectives
3. **Evaluate Options**: If there are multiple approaches, briefly consider each
4. **Reason Through**: Show your reasoning process clearly

Format your response as:
<thinking>
[Your step-by-step reasoning process here]
</thinking>

<answer>
[Your final, well-reasoned answer here]
</answer>

Be thorough in your thinking but concise in your final answer.`;

          enhancedSystemPrompt = enhancedSystemPrompt
            ? `${enhancedSystemPrompt}\n\n${thinkingPrompt}`
            : thinkingPrompt;
        }

        // Add MCP tool results context if available
        if (toolResultsContext) {
          const toolContext = `## MCP Tool Results\n\nThe following tools were executed based on user request:\n\n${toolResultsContext}\n\n---\nUse the above tool results to inform your response.`;
          enhancedSystemPrompt = enhancedSystemPrompt
            ? `${enhancedSystemPrompt}\n\n${toolContext}`
            : toolContext;
        }

        // Auto-match skills based on message content and activate them
        const enabledSkills = Object.values(skillStoreSkills).filter(
          (s) => s.status === 'enabled'
        );
        if (enabledSkills.length > 0 && effectiveContent.length >= 5) {
          const matchedSkills = findMatchingSkills(enabledSkills, effectiveContent, 3);
          for (const matched of matchedSkills) {
            if (!matched.isActive) {
              activateSkill(matched.id);
              console.log(`Auto-activated skill: ${matched.metadata.name}`);
            }
          }
        }

        // Add active skills to context using Progressive Disclosure
        const activeSkills = getActiveSkills();
        if (activeSkills.length > 0) {
          const {
            prompt: skillsPrompt,
            level,
            tokenEstimate,
          } = buildProgressiveSkillsPrompt(
            activeSkills,
            4000 // Token budget for skills
          );
          if (skillsPrompt) {
            console.log(
              `Injecting ${activeSkills.length} skills (level: ${level}, ~${tokenEstimate} tokens)`
            );
            enhancedSystemPrompt = enhancedSystemPrompt
              ? `${enhancedSystemPrompt}\n\n${skillsPrompt}`
              : skillsPrompt;
          }

          // Track active skill IDs on the session for per-session skill awareness
          if (session) {
            const skillIds = activeSkills.map((s) => s.id);
            const currentSessionSkillIds = session.activeSkillIds || [];
            const mergedIds = [...new Set([...currentSessionSkillIds, ...skillIds])];
            if (mergedIds.length !== currentSessionSkillIds.length) {
              updateSession(session.id, { activeSkillIds: mergedIds });
            }
          }
        }

        // Add learning mode system prompt if in learning mode
        if (currentMode === 'learning') {
          const { buildLearningSystemPrompt } = await import('@/lib/learning');
          const learningSession = getLearningSessionByChat(currentSessionId!);
          const learningPrompt = buildLearningSystemPrompt(learningSession);
          if (learningPrompt) {
            console.log('Injecting learning mode (Socratic Method) system prompt');
            enhancedSystemPrompt =
              learningPrompt + (enhancedSystemPrompt ? `\n\n${enhancedSystemPrompt}` : '');
          }
        }

        // Add plugin hook additional context if provided
        if (hookAdditionalContext) {
          enhancedSystemPrompt = enhancedSystemPrompt
            ? `${enhancedSystemPrompt}\n\n## Plugin Context\n${hookAdditionalContext}`
            : `## Plugin Context\n${hookAdditionalContext}`;
        }

        // Send to AI
        const response = await aiSendMessage(
          {
            messages: coreMessages,
            systemPrompt: enhancedSystemPrompt || undefined,
            temperature: session?.temperature ?? 0.7,
            maxTokens: session?.maxTokens,
            topP: session?.topP,
            frequencyPenalty: session?.frequencyPenalty,
            presencePenalty: session?.presencePenalty,
            sessionId: currentSessionId!,
            messageId: assistantMessage.id,
            // Per-session streaming override (undefined = use global setting)
            streaming: session?.streamingEnabled,
          },
          // Streaming callback
          (chunk) => {
            if (
              !streamBufferRef.current ||
              streamBufferRef.current.messageId !== assistantMessage.id
            ) {
              streamBufferRef.current = { messageId: assistantMessage.id, buffer: '' };
            }
            streamBufferRef.current.buffer += chunk;

            if (!streamFlushTimerRef.current) {
              streamFlushTimerRef.current = setTimeout(() => {
                flushStreamBuffer();
              }, 75);
            }
          }
        );

        flushStreamBuffer();

        // If no streaming was used, update the message with the full response
        if (response && !isStreaming) {
          await updateMessage(assistantMessage.id, { content: response });
        }

        // Save the final assistant message to database
        let finalContent = response || assistantMessage.content;
        if (finalContent) {
          // ========== Post-Chat Hook: PostChatReceive ==========
          // Allow plugins to process AI responses before saving
          const postReceiveResult = await pluginEventHooks.dispatchPostChatReceive({
            content: finalContent,
            messageId: assistantMessage.id,
            sessionId: currentSessionId!,
            model: actualModel,
            provider: actualProvider,
          });

          // Apply modified content if hook returned modifications
          if (postReceiveResult.modifiedContent) {
            finalContent = postReceiveResult.modifiedContent;
            await updateMessage(assistantMessage.id, { content: finalContent });
          }
          // ========== End Post-Chat Hook ==========

          await messageRepository.create(currentSessionId!, {
            ...assistantMessage,
            content: finalContent,
            model: actualModel,
            provider: actualProvider,
            ...(searchSources && searchSources.length > 0 ? { sources: searchSources } : {}),
          });

          // ========== Message Receive Hook ==========
          getPluginLifecycleHooks().dispatchOnMessageReceive({
            id: assistantMessage.id,
            role: 'assistant',
            content: finalContent,
          });

          // Add any additional messages from plugins
          if (postReceiveResult.additionalMessages?.length) {
            for (const msg of postReceiveResult.additionalMessages) {
              await addMessage({
                role: msg.role,
                content: msg.content,
              });
            }
          }

          // Generate suggestions after successful response
          loadSuggestions(effectiveContent, finalContent);

          // Track usage for active skills that were injected into this message
          if (activeSkills.length > 0) {
            const duration = Date.now() - (assistantMessage.createdAt?.getTime?.() || Date.now());
            for (const skill of activeSkills) {
              recordSkillUsage(skill.id, true, duration);
            }
          }

          // Auto-detect and create artifacts from the response content
          try {
            autoCreateFromContent({
              sessionId: currentSessionId!,
              messageId: assistantMessage.id,
              content: finalContent,
            });
          } catch (artifactError) {
            console.warn('Failed to auto-create artifacts:', artifactError);
          }

          // Auto-detect analysis results (math expressions, chart data) from AI responses
          try {
            const mathBlocks = finalContent.match(/\$\$([\s\S]+?)\$\$/g);
            if (mathBlocks && mathBlocks.length > 0) {
              for (const block of mathBlocks) {
                const content = block.replace(/^\$\$|\$\$$/g, '').trim();
                if (content.split('\n').length >= 2) {
                  addAnalysisResult({
                    sessionId: currentSessionId!,
                    messageId: assistantMessage.id,
                    type: 'math',
                    content,
                    output: { latex: content },
                  });
                }
              }
            }
          } catch (analysisError) {
            console.warn('Failed to auto-detect analysis results:', analysisError);
          }

          // Process A2UI content if detected in the response
          if (hasA2UIContent(finalContent)) {
            try {
              processA2UIMessage(finalContent, assistantMessage.id);
            } catch (a2uiError) {
              console.warn('Failed to process A2UI content:', a2uiError);
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
      autoCreateFromContent,
      addAnalysisResult,
      processA2UIMessage,
      sourceVerification,
      checkIntent,
      autoRouterSettings.showRoutingIndicator,
      flushStreamBuffer,
      chatHistoryContextSettings,
      checkFeatureIntent,
    ]
  );

  const handleStop = useCallback(() => {
    aiStop();
    flushStreamBuffer();
    // Also stop agent execution if running
    if (isAgentExecuting) {
      stopAgent();
    }
    setIsLoading(false);
    setIsStreaming(false);
  }, [aiStop, flushStreamBuffer, isAgentExecuting, stopAgent]);

  // Keyboard shortcuts for chat actions
  useKeyboardShortcuts({
    onStopGeneration: isStreaming ? handleStop : undefined,
    onFocusInput: () => inputRef.current?.focus(),
  });

  // Edit message handlers
  const handleEditMessage = useCallback((messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditContent(content);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditContent('');
  }, []);

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

  // Translate message content
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

  // Handle workflow selection from WorkflowPickerDialog
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

  // Retry last assistant message
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
        </div>
      ) : viewMode === 'arena' ? (
        /* Arena View */
        <div className="flex-1 min-h-0">
          <ArenaChatView
            sessionId={activeSessionId || undefined}
            systemPrompt={activePreset?.systemPrompt}
            initialPrompt={inputValue}
          />
        </div>
      ) : session?.multiModelConfig?.enabled && session.multiModelConfig.models.length >= 2 ? (
        /* Multi-Model Arena Chat View */
        <div className="flex-1 min-h-0">
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
        modeName={currentMode === 'chat' ? 'Chat' : currentMode === 'agent' ? 'Agent' : 'Research'}
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
      <PluginExtensionPoint point="chat.input.below" />
      <PluginExtensionPoint point="chat.footer" />

      {/* Prompt Optimizer Dialog */}
      <PromptOptimizerDialog
        open={showPromptOptimizer}
        onOpenChange={setShowPromptOptimizer}
        initialPrompt={inputValue}
        onApply={handleApplyOptimizedPrompt}
      />

      {/* Prompt Optimization Hub - Advanced prompt optimization with analytics and A/B testing */}
      {activePreset && (
        <PromptOptimizationHub
          open={showPromptOptimizationHub}
          onOpenChange={setShowPromptOptimizationHub}
          template={{
            id: activePreset.id,
            name: activePreset.name,
            content: activePreset.systemPrompt || '',
            variables: [],
            tags: [],
            source: 'user' as const,
            usageCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          }}
          onTemplateUpdate={(content) => {
            // Update preset with optimized content
            if (activePreset) {
              usePresetStore.getState().updatePreset(activePreset.id, { systemPrompt: content });
            }
          }}
        />
      )}

      {/* Preset Manager Dialog */}
      <PresetManagerDialog
        open={showPresetManager}
        onOpenChange={setShowPresetManager}
        editPresetId={editingPresetId}
        onPresetSelect={handleSelectPreset}
      />

      {/* Context Settings Dialog */}
      <ContextSettingsDialog
        open={showContextSettings}
        onOpenChange={setShowContextSettings}
        totalTokens={Math.round((contextLimitPercent / 100) * modelMaxTokens)}
        usedTokens={estimatedTokens.totalTokens}
        systemTokens={estimatedTokens.systemTokens}
        contextTokens={estimatedTokens.contextTokens}
        contextLimitPercent={contextLimitPercent}
        onContextLimitChange={setContextLimitPercent}
        showMemoryActivation={showMemoryActivation}
        onShowMemoryActivationChange={setShowMemoryActivation}
        showTokenUsageMeter={showTokenUsageMeter}
        onShowTokenUsageMeterChange={setShowTokenUsageMeter}
        modelMaxTokens={modelMaxTokens}
        messageCount={messages.length}
        onClearContext={() => setShowClearContextConfirm(true)}
        onOpenDebug={() => setShowContextDebug(true)}
      />

      {/* Context Debug Dialog */}
      <ContextDebugDialog
        open={showContextDebug}
        onOpenChange={setShowContextDebug}
      />

      {/* AI Settings Dialog */}
      <AISettingsDialog
        open={showAISettings}
        onOpenChange={setShowAISettings}
        settings={currentAISettings}
        onSettingsChange={handleAISettingsChange}
        defaultSettings={globalDefaultAISettings}
      />

      {/* Model Picker Dialog */}
      <ModelPickerDialog
        open={showModelPicker}
        onOpenChange={setShowModelPicker}
        currentProvider={currentProvider}
        currentModel={currentModel}
        isAutoMode={isAutoMode}
        onModelSelect={(providerId, modelId) => {
          if (session) {
            updateSession(session.id, { provider: providerId as ProviderName, model: modelId });
          }
        }}
        onAutoModeToggle={() => {
          if (session) {
            updateSession(session.id, { provider: isAutoMode ? 'openai' : 'auto' });
          }
        }}
      />

      {/* Agent Tool Approval Dialog */}
      <ToolApprovalDialog
        request={toolApprovalRequest}
        open={showToolApproval}
        onOpenChange={setShowToolApproval}
        onApprove={handleToolApproval}
        onDeny={handleToolDeny}
      />

      {/* Agent Tool Timeline - shown when agent is executing */}
      {currentMode === 'agent' && toolTimelineExecutions.length > 0 && (
        <div className="fixed bottom-24 right-4 z-50 w-80">
          <ToolTimeline executions={toolTimelineExecutions} />
        </div>
      )}

      {/* Mode Switch Suggestion - shown when learning/research intent detected */}
      {showSuggestion && detectionResult && (
        <div className="fixed bottom-24 left-4 z-50 w-96">
          <ModeSwitchSuggestion
            result={detectionResult}
            currentMode={currentMode}
            onAccept={acceptSuggestion}
            onDismiss={dismissSuggestion}
            onKeepCurrent={keepCurrentMode}
          />
        </div>
      )}

      {/* Feature Navigation Dialog - shown when feature intent is detected */}
      <FeatureNavigationDialog
        open={hasFeatureRoutingSuggestion}
        feature={pendingFeature}
        confidence={featureDetectionResult?.confidence || 0}
        originalMessage={featureRoutingMessage}
        matchedPatterns={featureDetectionResult?.matchedPatterns || []}
        onNavigate={confirmFeatureNavigation}
        onContinue={() => {
          continueFeatureInChat();
          // After continuing, send the message normally
          if (featureRoutingMessage) {
            handleSendMessage(featureRoutingMessage);
          }
        }}
        onDismiss={dismissFeatureRouting}
        onOpenChange={(open) => {
          if (!open) {
            continueFeatureInChat();
          }
        }}
      />

      {/* Workflow Selector Dialog */}
      <WorkflowSelector open={showWorkflowSelector} onOpenChange={setShowWorkflowSelector} />

      {/* Workflow Picker Dialog - for running visual workflows from chat */}
      <WorkflowPickerDialog
        open={showWorkflowPicker}
        onOpenChange={setShowWorkflowPicker}
        onSelectWorkflow={handleWorkflowSelect}
        initialInput={inputValue}
      />

      {/* PPT Preview - shown when a presentation is generated */}
      <Dialog
        open={!!activePresentation && showPPTPreview}
        onOpenChange={(open) => setShowPPTPreview(open)}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Presentation Preview</DialogTitle>
            <DialogClose />
          </DialogHeader>
          {activePresentation && <PPTPreview presentation={activePresentation} />}
        </DialogContent>
      </Dialog>

      {/* Learning Mode Panel - shown when in learning mode */}
      {currentMode === 'learning' && showLearningPanel && (
        <div
          ref={learningPanelRef}
          className="fixed right-4 top-20 z-40 w-80 max-h-[calc(100vh-6rem)] overflow-auto"
        >
          <LearningModePanel onClose={() => setShowLearningPanel(false)} className="shadow-lg" />
        </div>
      )}

      {/* Learning Mode Start Dialog */}
      <LearningStartDialog
        open={showLearningStartDialog}
        onOpenChange={setShowLearningStartDialog}
        onStart={() => {
          setShowLearningPanel(true);
        }}
      />

      {/* Source Verification Dialog */}
      {sourceVerification.verifiedResponse && (
        <SourceVerificationDialog
          open={sourceVerification.shouldShowDialog}
          onOpenChange={(open) => {
            if (!open) {
              sourceVerification.skipVerification();
            }
          }}
          searchResponse={sourceVerification.verifiedResponse}
          onConfirm={(selectedResults) => {
            sourceVerification.setSelectedResults(selectedResults);
            sourceVerification.confirmSelection();
          }}
          onSkip={sourceVerification.skipVerification}
          onRememberChoice={(choice) => {
            const { setSourceVerificationMode } = useSettingsStore.getState();
            if (choice === 'always-use') {
              setSourceVerificationMode('auto');
            } else if (choice === 'always-skip') {
              setSourceVerificationMode('disabled');
            }
          }}
          onMarkTrusted={sourceVerification.markSourceTrusted}
          onMarkBlocked={sourceVerification.markSourceBlocked}
        />
      )}

      {/* Learning Mode Toggle Button - shown when in learning mode */}
      {currentMode === 'learning' && !showLearningPanel && (
        <Button
          onClick={() => setShowLearningPanel(true)}
          className="fixed right-4 top-20 z-40 rounded-full p-3 h-auto w-auto shadow-lg"
          title="Open Learning Panel"
          variant="default"
          size="icon"
        >
          <BookOpen className="h-5 w-5" />
        </Button>
      )}

      {/* Clear Context Confirmation Dialog */}
      <AlertDialog open={showClearContextConfirm} onOpenChange={setShowClearContextConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clearConversation')}</AlertDialogTitle>
            <AlertDialogDescription>{t('clearConversationConfirmation')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                _clearMessages();
                setShowClearContextConfirm(false);
              }}
            >
              {tCommon('clear')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mode Switch Confirmation Dialog */}
      {pendingTargetMode && (
        <ModeSwitchConfirmDialog
          open={showModeSwitchDialog}
          onOpenChange={setShowModeSwitchDialog}
          currentMode={currentMode}
          targetMode={pendingTargetMode}
          messageCount={messages.length}
          sessionTitle={session?.title}
          onConfirm={handleModeSwitchConfirm}
          onCancel={handleModeSwitchCancel}
          onGenerateSummary={handleGenerateSummaryForModeSwitch}
        />
      )}

      {/* Arena Dialog - for comparing multiple AI models */}
      <ArenaDialog
        open={showArenaDialog}
        onOpenChange={setShowArenaDialog}
        initialPrompt={inputValue}
        sessionId={activeSessionId || undefined}
        systemPrompt={activePreset?.systemPrompt}
        onBattleStart={() => {
          // Could track arena battle start
        }}
        onBattleComplete={() => {
          // Arena battle completed
        }}
      />

      {/* Arena Battle View - shows ongoing battle comparison */}
      {arenaBattleId && (
        <ArenaBattleView
          battleId={arenaBattleId}
          open={showArenaBattle}
          onOpenChange={setShowArenaBattle}
          onClose={() => {
            setArenaBattleId(null);
            setShowArenaBattle(false);
          }}
        />
      )}
    </div>
  );
}

// Helper component to render message parts
interface MessagePartsRendererProps {
  parts?: MessagePart[];
  content: string;
  isError?: boolean;
}

function MessagePartsRenderer({ parts, content, isError }: MessagePartsRendererProps) {
  // If no parts, render content directly
  if (!parts || parts.length === 0) {
    return (
      <MessageResponse className={isError ? 'text-destructive' : undefined}>
        {content}
      </MessageResponse>
    );
  }

  // Render each part based on its type
  return (
    <div className="space-y-2">
      {parts.map((part, index) => {
        switch (part.type) {
          case 'text':
            return <TextPart key={`text-${index}`} part={part} isError={isError} />;
          case 'reasoning':
            return <ReasoningPart key={`reasoning-${index}`} part={part} />;
          case 'tool-invocation':
            return (
              <ToolPart
                key={`tool-${part.toolCallId}`}
                part={part}
                serverId={part.mcpServerId}
                serverName={part.mcpServerName}
              />
            );
          case 'sources':
            return <SourcesPart key={`sources-${index}`} part={part} />;
          case 'a2ui':
            return <A2UIPart key={`a2ui-${index}`} part={part} />;
          default:
            return null;
        }
      })}
    </div>
  );
}

// Individual message component with edit/retry support
interface ChatMessageItemProps {
  message: UIMessage;
  sessionId: string;
  isStreaming: boolean;
  isEditing: boolean;
  editContent: string;
  onEditContentChange: (content: string) => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onRetry: () => void;
  onCopyMessagesForBranch?: (branchPointMessageId: string, newBranchId: string) => Promise<unknown>;
  onTranslate?: (messageId: string, content: string) => void;
  workflowResult?: WorkflowResultData;
  onWorkflowRerun?: (input: Record<string, unknown>) => void;
  hideMessageActions?: boolean;
  hideMessageTimestamps?: boolean;
}

function ChatMessageItem({
  message,
  sessionId,
  isStreaming,
  isEditing,
  editContent,
  onEditContentChange,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onRetry,
  onCopyMessagesForBranch,
  onTranslate,
  workflowResult,
  onWorkflowRerun,
  hideMessageActions = false,
  hideMessageTimestamps = false,
}: ChatMessageItemProps) {
  const t = useTranslations('chat');
  const tCommon = useTranslations('common');
  const [copied, setCopied] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(message.isBookmarked || false);
  const [reactions, setReactions] = useState<EmojiReaction[]>(message.reactions || []);
  const messageContentRef = useRef<HTMLDivElement>(null);

  // TTS hook for multi-provider text-to-speech
  const { speak, stop: stopTTS, isPlaying: isSpeaking, isLoading: isTTSLoading } = useTTS();
  const ttsTooltip = isTTSLoading ? 'Loading...' : isSpeaking ? 'Stop speaking' : 'Read aloud';

  const handleReaction = async (emoji: string) => {
    setReactions((prev) => {
      const existing = prev.find((r) => r.emoji === emoji);
      if (existing) {
        if (existing.reacted) {
          // Remove reaction
          if (existing.count === 1) {
            return prev.filter((r) => r.emoji !== emoji);
          }
          return prev.map((r) =>
            r.emoji === emoji ? { ...r, count: r.count - 1, reacted: false } : r
          );
        } else {
          // Add reaction
          return prev.map((r) =>
            r.emoji === emoji ? { ...r, count: r.count + 1, reacted: true } : r
          );
        }
      } else {
        // New reaction
        return [...prev, { emoji, count: 1, reacted: true }];
      }
    });
    // Persist to database
    await messageRepository.update(message.id, { reactions });

    // Send quality score to Langfuse for 👍/👎 on assistant messages
    if (message.role === 'assistant' && (emoji === '👍' || emoji === '👎')) {
      try {
        const { addScore, isLangfuseEnabled, createChatTrace } = await import('@/lib/ai/observability/langfuse-client');
        if (isLangfuseEnabled()) {
          const trace = createChatTrace({ sessionId });
          addScore(trace, {
            name: 'user-feedback',
            value: emoji === '👍' ? 1 : 0,
            comment: `User reacted with ${emoji} to message ${message.id}`,
          });
        }
      } catch {
        // Langfuse not available — ignore silently
      }
    }
  };

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content]);

  const handleTranslate = () => {
    if (onTranslate && !isTranslating) {
      setIsTranslating(true);
      onTranslate(message.id, message.content);
      setTimeout(() => setIsTranslating(false), 1000);
    }
  };

  const handleBookmark = useCallback(async () => {
    const newBookmarked = !isBookmarked;
    setIsBookmarked(newBookmarked);
    // Update in database
    await messageRepository.update(message.id, { isBookmarked: newBookmarked });
  }, [isBookmarked, message.id]);

  const handleSpeak = () => {
    if (isSpeaking) {
      stopTTS();
    } else {
      speak(message.content);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Shared Message',
          text: message.content,
        });
      } catch {
        // User cancelled or share failed, copy to clipboard instead
        await handleCopy();
      }
    } else {
      // Fallback to copy
      await handleCopy();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSaveEdit();
    } else if (e.key === 'Escape') {
      onCancelEdit();
    }
  };

  // Handle swipe actions for mobile
  const handleSwipeAction = useCallback(
    (action: SwipeAction) => {
      switch (action) {
        case 'copy':
          handleCopy();
          break;
        case 'edit':
          if (message.role === 'user') onEdit();
          break;
        case 'regenerate':
          if (message.role === 'assistant') onRetry();
          break;
        case 'bookmark':
          handleBookmark();
          break;
        case 'delete':
          // Could be implemented with a delete handler
          break;
      }
    },
    [handleCopy, handleBookmark, message.role, onEdit, onRetry]
  );

  return (
    <MessageSwipeActions
      onAction={handleSwipeAction}
      enabledActions={
        message.role === 'user' ? ['copy', 'edit'] : ['copy', 'regenerate', 'bookmark']
      }
      disabled={isEditing || isStreaming}
    >
      <MessageUI
        id={`message-${message.id}`}
        from={message.role as 'system' | 'user' | 'assistant'}
      >
        {/* Provider icon label for assistant messages */}
        {message.role === 'assistant' && message.provider && (
          <div className="flex items-center gap-1.5 mb-1">
            <ProviderIcon providerId={message.provider} size={16} className="shrink-0" />
            <span className="text-xs text-muted-foreground">
              {message.model || message.provider}
            </span>
          </div>
        )}
        <MessageContent>
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <Textarea
                value={editContent}
                onChange={(e) => onEditContentChange(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                placeholder={t('editMessagePlaceholder')}
                aria-label={t('editMessage')}
                className="min-h-[100px] resize-none"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  onClick={onCancelEdit}
                  variant="outline"
                  size="sm"
                  aria-label={tCommon('cancel')}
                >
                  {tCommon('cancel')}
                </Button>
                <Button
                  onClick={onSaveEdit}
                  variant="default"
                  size="sm"
                  aria-label={t('saveAndSubmit')}
                >
                  {t('saveAndSubmit')}
                </Button>
              </div>
            </div>
          ) : (
            <div ref={messageContentRef}>
              {/* Workflow Result Card - render if this message has workflow data */}
              {workflowResult && (
                <WorkflowResultCard
                  data={workflowResult}
                  onRerun={onWorkflowRerun}
                  className="mb-3"
                />
              )}
              {message.role === 'user' ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
              ) : hasA2UIContent(message.content) ? (
                <A2UIMessageRenderer
                  content={message.content}
                  messageId={message.id}
                  textRenderer={(text) => (
                    <MessagePartsRenderer
                      parts={message.parts}
                      content={text}
                      isError={!!message.error}
                    />
                  )}
                />
              ) : (
                <MessagePartsRenderer
                  parts={message.parts}
                  content={message.content}
                  isError={!!message.error}
                />
              )}
              {/* Web search sources indicator */}
              {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                <div className="mt-2">
                  <SearchSourcesIndicator sources={message.sources} />
                </div>
              )}
              {/* Text selection popover for quoting */}
              <TextSelectionPopover
                containerRef={messageContentRef}
                messageId={message.id}
                messageRole={message.role as 'user' | 'assistant'}
              />
              {/* Message reactions */}
              {message.role === 'assistant' && !message.error && (
                <div className="mt-2">
                  <MessageReactions reactions={reactions} onReact={handleReaction} />
                </div>
              )}
              {/* Message artifacts */}
              {message.role === 'assistant' && <MessageArtifacts messageId={message.id} compact />}
              {/* Message analysis results */}
              {message.role === 'assistant' && <MessageAnalysisResults messageId={message.id} />}
              {/* Message timestamp */}
              {!hideMessageTimestamps && message.createdAt && (
                <div className="mt-1 text-[10px] text-muted-foreground/50">
                  {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          )}
        </MessageContent>

        {!isEditing && !isStreaming && !hideMessageActions && (
          <MessageActions>
            {message.role === 'user' && (
              <MessageAction tooltip="Edit message" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
              </MessageAction>
            )}
            {message.role === 'assistant' && !message.error && (
              <>
                <MessageAction tooltip="Retry" onClick={onRetry}>
                  <RotateCcw className="h-4 w-4" />
                </MessageAction>
                <MessageAction tooltip={copied ? 'Copied!' : 'Copy'} onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </MessageAction>
                <MessageAction
                  tooltip={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                  onClick={handleBookmark}
                >
                  {isBookmarked ? (
                    <BookmarkCheck className="h-4 w-4 text-primary" />
                  ) : (
                    <Bookmark className="h-4 w-4" />
                  )}
                </MessageAction>
                <MessageAction tooltip={ttsTooltip} onClick={handleSpeak} disabled={isTTSLoading}>
                  {isTTSLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isSpeaking ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </MessageAction>
                <MessageAction tooltip="Share" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                </MessageAction>
                <MessageAction
                  tooltip="Translate"
                  onClick={handleTranslate}
                  disabled={isTranslating}
                >
                  <Languages className="h-4 w-4" />
                </MessageAction>
              </>
            )}
            {/* Branch button for all messages */}
            <BranchButton
              sessionId={sessionId}
              messageId={message.id}
              onCopyMessages={onCopyMessagesForBranch}
            />
          </MessageActions>
        )}
      </MessageUI>
    </MessageSwipeActions>
  );
}

interface VirtualizedChatMessageListProps {
  messages: UIMessage[];
  sessionId: string;
  isStreaming: boolean;
  isLoading: boolean;
  editingMessageId: string | null;
  editContent: string;
  onEditContentChange: (content: string) => void;
  onEditMessage: (messageId: string, content: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (messageId: string) => Promise<void>;
  onRetry: (messageId: string) => Promise<void>;
  onCopyMessagesForBranch?: (branchPointMessageId: string, newBranchId: string) => Promise<unknown>;
  onTranslate?: (messageId: string, content: string) => void;
  hasOlderMessages: boolean;
  isLoadingOlder: boolean;
  loadOlderMessages: () => Promise<void>;
  workflowResults?: Map<string, WorkflowResultData>;
  onWorkflowRerun?: (input: Record<string, unknown>) => void;
  hideMessageActions?: boolean;
  hideMessageTimestamps?: boolean;
}

function VirtualizedChatMessageList({
  messages,
  sessionId,
  isStreaming,
  isLoading,
  editingMessageId,
  editContent,
  onEditContentChange,
  onEditMessage,
  onCancelEdit,
  onSaveEdit,
  onRetry,
  onCopyMessagesForBranch,
  onTranslate,
  hasOlderMessages,
  isLoadingOlder,
  loadOlderMessages,
  workflowResults,
  onWorkflowRerun,
  hideMessageActions = false,
  hideMessageTimestamps = false,
}: VirtualizedChatMessageListProps) {
  const { scrollRef } = useStickToBottomContext();

  const [scrollParent, setScrollParent] = useState<HTMLElement | null>(null);

  const showThinking = isLoading && messages[messages.length - 1]?.role === 'user';

  useEffect(() => {
    if (scrollRef.current) {
      setScrollParent(scrollRef.current);
    }
  }, [scrollRef]);

  // Preserve scroll position when prepending older messages.
  const [firstItemIndex, setFirstItemIndex] = useState(0);
  const prevLenRef = useRef<number>(messages.length);
  const prevFirstIdRef = useRef<string | undefined>(messages[0]?.id);
  const prevLastIdRef = useRef<string | undefined>(messages[messages.length - 1]?.id);

  useEffect(() => {
    const prevLen = prevLenRef.current;
    const prevLastId = prevLastIdRef.current;
    const nextLastId = messages[messages.length - 1]?.id;
    const nextFirstId = messages[0]?.id;

    // Detect a prepend (older messages loaded) by: length increased, last item unchanged, first item changed.
    if (
      messages.length > prevLen &&
      prevLastId &&
      nextLastId === prevLastId &&
      nextFirstId &&
      nextFirstId !== prevFirstIdRef.current
    ) {
      const delta = messages.length - prevLen;
      setFirstItemIndex((v) => v - delta);
    }

    prevLenRef.current = messages.length;
    prevFirstIdRef.current = nextFirstId;
    prevLastIdRef.current = nextLastId;
  }, [messages]);

  const items = useMemo(() => {
    if (!showThinking) return messages as Array<UIMessage | { kind: 'thinking' }>;
    return [...messages, { kind: 'thinking' } as const];
  }, [messages, showThinking]);

  const lastItemIndex = messages.length - 1;

  if (!scrollParent) {
    return (
      <>
        {messages.map((message, index) => (
          <ChatMessageItem
            key={message.id}
            message={message}
            sessionId={sessionId}
            isStreaming={isStreaming && index === lastItemIndex && message.role === 'assistant'}
            isEditing={editingMessageId === message.id}
            editContent={editContent}
            onEditContentChange={onEditContentChange}
            onEdit={() => onEditMessage(message.id, message.content)}
            onCancelEdit={onCancelEdit}
            onSaveEdit={() => onSaveEdit(message.id)}
            onRetry={() => onRetry(message.id)}
            onCopyMessagesForBranch={onCopyMessagesForBranch}
            onTranslate={onTranslate}
            workflowResult={workflowResults?.get(message.id)}
            onWorkflowRerun={onWorkflowRerun}
            hideMessageActions={hideMessageActions}
            hideMessageTimestamps={hideMessageTimestamps}
          />
        ))}
      </>
    );
  }

  return (
    <Virtuoso
      data={items}
      customScrollParent={scrollParent}
      firstItemIndex={firstItemIndex}
      startReached={() => {
        if (hasOlderMessages && !isLoadingOlder) {
          void loadOlderMessages();
        }
      }}
      computeItemKey={(_index, item) => {
        if ((item as { kind?: string }).kind === 'thinking') return 'thinking';
        return (item as UIMessage).id;
      }}
      components={{
        List: (() => {
          const VirtualizedList = React.forwardRef<
            HTMLDivElement,
            React.HTMLAttributes<HTMLDivElement>
          >((props, ref) => <div {...props} ref={ref} className="flex flex-col gap-5 w-full" />);
          VirtualizedList.displayName = 'VirtualizedList';
          return VirtualizedList;
        })(),
      }}
      itemContent={(index, item) => {
        if ((item as { kind?: string }).kind === 'thinking') {
          return (
            <MessageUI from="assistant">
              <MessageContent>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader size={18} />
                  <span className="text-sm animate-pulse">Thinking...</span>
                </div>
              </MessageContent>
            </MessageUI>
          );
        }

        const message = item as UIMessage;
        return (
          <ChatMessageItem
            message={message}
            sessionId={sessionId}
            isStreaming={isStreaming && index === lastItemIndex && message.role === 'assistant'}
            isEditing={editingMessageId === message.id}
            editContent={editContent}
            onEditContentChange={onEditContentChange}
            onEdit={() => onEditMessage(message.id, message.content)}
            onCancelEdit={onCancelEdit}
            onSaveEdit={() => onSaveEdit(message.id)}
            onRetry={() => onRetry(message.id)}
            onCopyMessagesForBranch={onCopyMessagesForBranch}
            onTranslate={onTranslate}
            workflowResult={workflowResults?.get(message.id)}
            onWorkflowRerun={onWorkflowRerun}
            hideMessageActions={hideMessageActions}
            hideMessageTimestamps={hideMessageTimestamps}
          />
        );
      }}
    />
  );
}

export default ChatContainer;
