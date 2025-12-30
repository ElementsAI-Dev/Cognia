'use client';

/**
 * ChatContainer - main chat component with AI integration
 * Uses Vercel AI SDK for streaming chat with multiple providers
 * Messages are persisted to IndexedDB via useMessages hook
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Check, Pencil, RotateCcw, Languages, Bookmark, BookmarkCheck, Volume2, VolumeX, Share2 } from 'lucide-react';
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
import { ErrorMessage } from './error-message';
import { ChatHeader } from './chat-header';
import { ChatInput, type Attachment } from './chat-input';
import { ContextSettingsDialog } from './context-settings-dialog';
import { AISettingsDialog, type AISettings } from './ai-settings-dialog';
import { ModelPickerDialog } from './model-picker-dialog';
import { WelcomeState } from './welcome-state';
import { BranchButton } from './branch-selector';
import { TextSelectionPopover } from './text-selection-popover';
import { QuotedContent } from './quoted-content';
import { TextPart, ReasoningPart, ToolPart, SourcesPart } from './message-parts';
import { MessageReactions } from './message-reactions';
import { MessageArtifacts } from '@/components/artifacts';
import type { EmojiReaction } from '@/types/message';
import type { MessagePart } from '@/types/message';
import { PromptOptimizerDialog } from './prompt-optimizer-dialog';
import { PresetManagerDialog } from './preset-manager-dialog';
import { Suggestions, Suggestion } from '@/components/ai-elements/suggestion';
import {
  ToolTimeline,
  ToolApprovalDialog,
  WorkflowSelector,
  type ToolExecution,
  type ToolApprovalRequest,
} from '@/components/agent';
import { PPTPreview } from '@/components/ai-elements/ppt-preview';
import { SkillSuggestions } from '@/components/skills';
import { LearningModePanel, LearningStartDialog } from '@/components/learning';
import { useSkillStore } from '@/stores/skill-store';
import { buildProgressiveSkillsPrompt } from '@/lib/skills/executor';
import { useWorkflowStore } from '@/stores/workflow-store';
import { initializeAgentTools } from '@/lib/ai/agent';
import {
  generateSuggestions,
  getDefaultSuggestions,
  type GeneratedSuggestion,
} from '@/lib/ai/suggestion-generator';
import { translateText } from '@/lib/ai/translate';
import type { SearchResponse, SearchResult } from '@/types/search';
import { useSessionStore, useSettingsStore, usePresetStore, useMcpStore, useAgentStore, useProjectStore, useQuoteStore, useLearningStore, useArtifactStore } from '@/stores';
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
import { useMessages, useAgent, useProjectContext, calculateTokenBreakdown } from '@/hooks';
import type { ParsedToolCall, ToolCallResult } from '@/types/mcp';
import { useAIChat, useAutoRouter, type ProviderName, isVisionModel, buildMultimodalContent, type MultimodalMessage } from '@/lib/ai';
import { messageRepository } from '@/lib/db';
import { PROVIDERS } from '@/types/provider';
import type { ChatMode, UIMessage } from '@/types';
import type { AgentModeConfig } from '@/types/agent-mode';

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
      return sessions.find(s => s.id === sessionId);
    }
    return sessions.find(s => s.id === storeActiveSessionId);
  }, [sessionId, sessions, storeActiveSessionId]);
  
  const activeSessionId = session?.id || null;
  const activeBranchId = session?.activeBranchId;

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

  // Skill store for active skills injection
  const getActiveSkills = useSkillStore((state) => state.getActiveSkills);

  // Learning store for Socratic method learning mode
  const getLearningSessionByChat = useLearningStore((state) => state.getLearningSessionByChat);

  // Artifact store for auto-creating artifacts from AI responses
  const autoCreateFromContent = useArtifactStore((state) => state.autoCreateFromContent);

  // Message persistence with IndexedDB (branch-aware)
  const {
    messages,
    isLoading: _isLoadingMessages,
    isInitialized,
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

  // Local state
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // New feature states
  const [showPromptOptimizer, setShowPromptOptimizer] = useState(false);
  const [suggestions, setSuggestions] = useState<GeneratedSuggestion[]>([]);
  const [_isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Preset states
  const [showPresetManager, setShowPresetManager] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const trackPresetUsage = usePresetStore((state) => state.usePreset);

  // Workflow states
  const [showWorkflowSelector, setShowWorkflowSelector] = useState(false);
  const [showPPTPreview, setShowPPTPreview] = useState(false);

  // Learning mode states
  const [showLearningPanel, setShowLearningPanel] = useState(false);
  const learningPanelRef = useRef<HTMLDivElement>(null);
  const [showLearningStartDialog, setShowLearningStartDialog] = useState(false);
  const workflowPresentations = useWorkflowStore((state) => state.presentations);
  const activePresentationId = useWorkflowStore((state) => state.activePresentationId);
  const activePresentation = activePresentationId ? workflowPresentations[activePresentationId] : null;

  // Context settings states
  const [showContextSettings, setShowContextSettings] = useState(false);
  const [contextLimitPercent, setContextLimitPercent] = useState(50);
  const [showMemoryActivation, setShowMemoryActivation] = useState(false);
  const [showTokenUsageMeter, setShowTokenUsageMeter] = useState(true);

  // AI settings dialog state
  const [showAISettings, setShowAISettings] = useState(false);

  // Clear context confirmation dialog state
  const [showClearContextConfirm, setShowClearContextConfirm] = useState(false);

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

  // Auto router for intelligent model selection
  const { selectModel } = useAutoRouter();

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

  // Initialize agent tools based on available API keys
  const agentTools = useMemo(() => {
    const tavilyApiKey = providerSettings.tavily?.apiKey;
    return initializeAgentTools({
      tavilyApiKey,
      enableWebSearch: !!tavilyApiKey,
      enableCalculator: true,
      enableRAGSearch: true,
    });
  }, [providerSettings.tavily?.apiKey]);

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
    systemPrompt: session?.systemPrompt || 'You are a helpful AI assistant with access to tools.',
    maxSteps: 10,
    temperature: session?.temperature ?? 0.7,
    tools: agentTools,
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
  const handleToolApproval = useCallback(async (toolCallId: string, alwaysAllow?: boolean) => {
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
  }, [toolApprovalRequest, addAlwaysAllowedTool]);

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
      state: exec.status === 'completed' ? 'output-available' as const :
             exec.status === 'error' ? 'output-error' as const :
             exec.status === 'running' ? 'input-available' as const :
             'input-streaming' as const,
      startTime: exec.startedAt?.getTime() || Date.now(),
      endTime: exec.completedAt?.getTime(),
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

  const handleModeChange = useCallback((mode: ChatMode) => {
    if (session) {
      updateSession(session.id, { mode });
    } else {
      createSession({ mode });
    }
    // Show learning start dialog when switching to learning mode
    if (mode === 'learning') {
      const currentSessionId = session?.id;
      const hasLearningSession = currentSessionId ? getLearningSessionByChat(currentSessionId) : null;
      if (!hasLearningSession) {
        setShowLearningStartDialog(true);
      } else {
        setShowLearningPanel(true);
      }
    }
  }, [session, updateSession, createSession, getLearningSessionByChat]);

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
  const handleAgentModeChange = useCallback((agentMode: AgentModeConfig) => {
    if (session) {
      updateSession(session.id, {
        agentModeId: agentMode.id,
        systemPrompt: agentMode.systemPrompt,
      });
    }
  }, [session, updateSession]);

  // Handle preset selection
  const handleSelectPreset = useCallback((preset: import('@/types/preset').Preset) => {
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
  }, [session, updateSession, createSession, trackPresetUsage]);

  // Handle web search toggle
  const handleWebSearchChange = useCallback((enabled: boolean) => {
    if (session) {
      updateSession(session.id, { webSearchEnabled: enabled });
    }
  }, [session, updateSession]);

  // Handle thinking mode toggle
  const handleThinkingChange = useCallback((enabled: boolean) => {
    if (session) {
      updateSession(session.id, { thinkingEnabled: enabled });
    }
  }, [session, updateSession]);

  // Handle AI settings change
  const handleAISettingsChange = useCallback((settings: Partial<AISettings>) => {
    if (session) {
      updateSession(session.id, settings);
    }
  }, [session, updateSession]);

  // Get current AI settings from session (fallback to global defaults)
  const currentAISettings: AISettings = useMemo(() => ({
    temperature: session?.temperature ?? defaultTemperature,
    maxTokens: session?.maxTokens ?? defaultMaxTokens,
    topP: session?.topP ?? defaultTopP,
    frequencyPenalty: session?.frequencyPenalty ?? defaultFrequencyPenalty,
    presencePenalty: session?.presencePenalty ?? defaultPresencePenalty,
  }), [session?.temperature, session?.maxTokens, session?.topP, session?.frequencyPenalty, session?.presencePenalty, defaultTemperature, defaultMaxTokens, defaultTopP, defaultFrequencyPenalty, defaultPresencePenalty]);

  // Global default AI settings for reset functionality
  const globalDefaultAISettings: AISettings = useMemo(() => ({
    temperature: defaultTemperature,
    maxTokens: defaultMaxTokens,
    topP: defaultTopP,
    frequencyPenalty: defaultFrequencyPenalty,
    presencePenalty: defaultPresencePenalty,
  }), [defaultTemperature, defaultMaxTokens, defaultTopP, defaultFrequencyPenalty, defaultPresencePenalty]);

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
  const loadSuggestions = useCallback(async (userMsg: string, assistantMsg: string) => {
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
  }, [currentProvider, currentModel, providerSettings]);

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

  // Format search results for system prompt
  const formatSearchResults = useCallback((searchResponse: SearchResponse): string => {
    const parts: string[] = [
      '## Web Search Results',
      `Query: "${searchResponse.query}"`,
      '',
    ];

    if (searchResponse.answer) {
      parts.push(`**Quick Answer:** ${searchResponse.answer}`, '');
    }

    parts.push('**Sources:**');
    searchResponse.results.forEach((result: SearchResult, index: number) => {
      parts.push(`${index + 1}. [${result.title}](${result.url})`);
      parts.push(`   ${result.content.slice(0, 200)}...`);
      parts.push('');
    });

    parts.push('---');
    parts.push('Use the above search results to provide an informed, up-to-date response. Cite sources when relevant.');

    return parts.join('\n');
  }, []);

  // Execute MCP tool calls and return results
  const executeMcpTools = useCallback(async (toolCalls: ParsedToolCall[]): Promise<string> => {
    const results: string[] = [];
    
    for (const toolCall of toolCalls) {
      try {
        // Find the server
        const server = mcpServers.find(s => s.id === toolCall.serverId);
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
  }, [mcpServers, mcpCallTool]);

  // Format tool call result for display
  const formatToolResult = (result: ToolCallResult): string => {
    return result.content.map(item => {
      if (item.type === 'text') {
        return item.text;
      } else if (item.type === 'image') {
        return `[Image: ${item.mimeType}]`;
      } else if (item.type === 'resource') {
        return item.resource.text || `[Resource: ${item.resource.uri}]`;
      }
      return '[Unknown content]';
    }).join('\n');
  };

  // Handle Agent mode message sending
  const handleAgentMessage = useCallback(async (content: string, currentSessionId: string) => {
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
            .filter(step => step.toolCalls.length > 0)
            .map(step => {
              const toolInfo = step.toolCalls.map(tc => 
                `- **${tc.name}**: ${tc.status === 'completed' ? '✅' : '❌'} ${tc.status}`
              ).join('\n');
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
        await updateMessage(assistantMessage.id, { content: errorContent, error: agentResult.error });
        setError(agentResult.error || 'Agent execution failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Agent execution failed';
      await updateMessage(assistantMessage.id, { content: `Error: ${errorMessage}`, error: errorMessage });
      setError(errorMessage);
    }
  }, [addMessage, createStreamingMessage, runAgent, updateMessage, currentModel, currentProvider, loadSuggestions]);

  const handleSendMessage = useCallback(async (content: string, attachments?: Attachment[], toolCalls?: ParsedToolCall[]) => {
    if (!content.trim() && (!attachments || attachments.length === 0)) return;

    setError(null);
    setRetryCount(0);
    setLastFailedMessage(null);

    // Ensure we have an active session
    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      const newSession = createSession({ title: content.slice(0, 50) || 'New conversation' });
      currentSessionId = newSession.id;
    }

    // Build message content with quotes and attachments
    let messageContent = content;
    
    // Prepend quoted content if any
    const formattedQuotes = getFormattedQuotes();
    if (formattedQuotes) {
      messageContent = `${formattedQuotes}\n\n${content}`;
      clearQuotes(); // Clear quotes after including them
    }
    
    if (attachments && attachments.length > 0) {
      const attachmentInfo = attachments.map(a => `[Attached: ${a.name}]`).join(' ');
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
      try {
        await handleAgentMessage(messageContent, currentSessionId);
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
        attachments: attachments?.map(a => ({
          id: a.id,
          name: a.name,
          type: a.type as 'image' | 'file' | 'document',
          url: a.url,
          size: a.size,
          mimeType: a.mimeType,
        })),
      });

      // Create streaming assistant message
      const assistantMessage = createStreamingMessage('assistant');

      // Determine the actual provider/model to use
      let actualProvider = currentProvider as ProviderName;
      let actualModel = currentModel;

      if (isAutoMode) {
        const selection = selectModel(content);
        actualProvider = selection.provider;
        actualModel = selection.model;
        console.log('Auto-selected:', selection.reason);
      }

      // Check if we have image attachments and the model supports vision
      const imageAttachments = attachments?.filter((a) => a.type === 'image') || [];
      const hasImages = imageAttachments.length > 0;
      const modelSupportsVision = isVisionModel(actualModel);

      // Build messages for AI - use multimodal format if we have images
      let coreMessages: MultimodalMessage[];

      if (hasImages && modelSupportsVision) {
        // Build multimodal content for the last user message
        const multimodalContent = await buildMultimodalContent(
          content,
          imageAttachments.map((a) => ({
            url: a.url,
            mimeType: a.mimeType,
            file: a.file,
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
      } else {
        // Text-only messages
        coreMessages = [...messages, userMessage].map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));
      }

      // Build enhanced system prompt starting with project context if available
      let enhancedSystemPrompt = '';
      
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
          console.log(`Using ${queryContext.filesUsed.length} knowledge files:`, queryContext.filesUsed);
        }
      } else if (session?.systemPrompt) {
        enhancedSystemPrompt = session.systemPrompt;
      }

      // Perform web search if enabled
      if (webSearchEnabled) {
        const tavilyApiKey = providerSettings.tavily?.apiKey;
        if (tavilyApiKey) {
          try {
            const searchRes = await fetch('/api/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: content,
                apiKey: tavilyApiKey,
                options: {
                  maxResults: 5,
                  searchDepth: 'basic',
                  includeAnswer: true,
                },
              }),
            });

            if (searchRes.ok) {
              const searchResponse: SearchResponse = await searchRes.json();
              if (searchResponse.results && searchResponse.results.length > 0) {
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

      // Add active skills to context using Progressive Disclosure
      const activeSkills = getActiveSkills();
      if (activeSkills.length > 0) {
        const { prompt: skillsPrompt, level, tokenEstimate } = buildProgressiveSkillsPrompt(
          activeSkills,
          4000 // Token budget for skills
        );
        if (skillsPrompt) {
          console.log(`Injecting ${activeSkills.length} skills (level: ${level}, ~${tokenEstimate} tokens)`);
          enhancedSystemPrompt = enhancedSystemPrompt
            ? `${enhancedSystemPrompt}\n\n${skillsPrompt}`
            : skillsPrompt;
        }
      }

      // Add learning mode system prompt if in learning mode
      if (currentMode === 'learning') {
        const { buildLearningSystemPrompt } = await import('@/lib/learning');
        const learningSession = getLearningSessionByChat(currentSessionId!);
        const learningPrompt = buildLearningSystemPrompt(learningSession);
        if (learningPrompt) {
          console.log('Injecting learning mode (Socratic Method) system prompt');
          enhancedSystemPrompt = learningPrompt + (enhancedSystemPrompt ? `\n\n${enhancedSystemPrompt}` : '');
        }
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
        },
        // Streaming callback
        (chunk) => {
          appendToMessage(assistantMessage.id, chunk);
        }
      );

      // If no streaming was used, update the message with the full response
      if (response && !isStreaming) {
        await updateMessage(assistantMessage.id, { content: response });
      }

      // Save the final assistant message to database
      const finalContent = response || assistantMessage.content;
      if (finalContent) {
        await messageRepository.create(currentSessionId!, {
          ...assistantMessage,
          content: finalContent,
          model: actualModel,
          provider: actualProvider,
        });

        // Generate suggestions after successful response
        loadSuggestions(content, finalContent);

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
      }
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      setLastFailedMessage(content);
    } finally {
      setIsLoading(false);
    }
  }, [activeSessionId, messages, currentProvider, currentModel, isAutoMode, selectModel, aiSendMessage, createSession, isStreaming, session, addMessage, createStreamingMessage, appendToMessage, updateMessage, loadSuggestions, webSearchEnabled, thinkingEnabled, providerSettings, formatSearchResults, executeMcpTools, currentMode, handleAgentMessage, getProject, projectContext?.hasKnowledge, getFormattedQuotes, clearQuotes, getActiveSkills, getLearningSessionByChat, autoCreateFromContent]);

  const handleStop = useCallback(() => {
    aiStop();
    // Also stop agent execution if running
    if (isAgentExecuting) {
      stopAgent();
    }
    setIsLoading(false);
    setIsStreaming(false);
  }, [aiStop, isAgentExecuting, stopAgent]);

  // Edit message handlers
  const handleEditMessage = useCallback((messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditContent(content);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditContent('');
  }, []);

  const handleSaveEdit = useCallback(async (messageId: string) => {
    if (!editContent.trim()) return;

    try {
      // Delete all messages after this one
      await deleteMessagesAfter(messageId);

      // Update the message content
      await updateMessage(messageId, { content: editContent });

      // Clear edit state
      setEditingMessageId(null);
      setEditContent('');

      // Re-send to get new response
      // Find the edited message
      const editedMessage = messages.find(m => m.id === messageId);
      if (editedMessage && editedMessage.role === 'user') {
        // Trigger a new response
        await handleSendMessage(editContent);
      }
    } catch (err) {
      console.error('Failed to edit message:', err);
      setError(err instanceof Error ? err.message : 'Failed to edit message');
    }
  }, [editContent, deleteMessagesAfter, updateMessage, messages, handleSendMessage]);

  // Translate message content
  const handleTranslateMessage = useCallback(async (_messageId: string, content: string) => {
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
  }, [providerSettings, currentProvider, currentModel, addMessage]);

  // Retry last assistant message
  const handleRetry = useCallback(async (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    // Find the user message before this assistant message
    const userMessage = messages
      .slice(0, messageIndex)
      .reverse()
      .find(m => m.role === 'user');

    if (!userMessage) return;

    try {
      // Delete from this message onwards
      await deleteMessagesAfter(userMessage.id);

      // Re-send the user message
      await handleSendMessage(userMessage.content);
    } catch (err) {
      console.error('Failed to retry:', err);
      setError(err instanceof Error ? err.message : 'Failed to retry');
    }
  }, [messages, deleteMessagesAfter, handleSendMessage]);

  const isEmpty = messages.length === 0 && isInitialized;

  // Note: Removed loading state check to prevent infinite loading issues
  // The UI will show even while messages are loading

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <ChatHeader sessionId={sessionId} />

      {error && (
        <ErrorMessage
          error={error}
          onRetry={lastFailedMessage ? () => {
            setRetryCount((prev) => prev + 1);
            handleSendMessage(lastFailedMessage);
          } : undefined}
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

      <Conversation>
        {isEmpty ? (
          <WelcomeState
            mode={currentMode}
            onSuggestionClick={handleSuggestionClick}
            onModeChange={handleModeChange}
            agentModeId={agentModeId}
            onAgentModeChange={handleAgentModeChange}
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
        ) : (
          <ConversationContent>
            {messages.map((message, index) => (
              <ChatMessageItem
                key={message.id}
                message={message}
                sessionId={activeSessionId!}
                isStreaming={isStreaming && index === messages.length - 1 && message.role === 'assistant'}
                isEditing={editingMessageId === message.id}
                editContent={editContent}
                onEditContentChange={setEditContent}
                onEdit={() => handleEditMessage(message.id, message.content)}
                onCancelEdit={handleCancelEdit}
                onSaveEdit={() => handleSaveEdit(message.id)}
                onRetry={() => handleRetry(message.id)}
                onCopyMessagesForBranch={copyMessagesForBranch}
                onTranslate={handleTranslateMessage}
              />
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <MessageUI from="assistant">
                <MessageContent>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader size={18} />
                    <span className="text-sm animate-pulse">Thinking...</span>
                  </div>
                </MessageContent>
              </MessageUI>
            )}
          </ConversationContent>
        )}
        <ConversationScrollButton />
      </Conversation>

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
            <SkillSuggestions
              query={inputValue}
              showActiveSkills={true}
            />
          </div>
        </div>
      )}

      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSubmit={(content, attachments, toolCalls) => {
          handleSendMessage(content, attachments, toolCalls);
          setInputValue('');
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
        onWebSearchChange={handleWebSearchChange}
        onThinkingChange={handleThinkingChange}
        modelName={currentModel}
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
      />

      {/* Prompt Optimizer Dialog */}
      <PromptOptimizerDialog
        open={showPromptOptimizer}
        onOpenChange={setShowPromptOptimizer}
        initialPrompt={inputValue}
        onApply={handleApplyOptimizedPrompt}
      />

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

      {/* Workflow Selector Dialog */}
      <WorkflowSelector
        open={showWorkflowSelector}
        onOpenChange={setShowWorkflowSelector}
      />

      {/* PPT Preview - shown when a presentation is generated */}
      {activePresentation && showPPTPreview && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-5xl max-h-[90vh] overflow-auto rounded-lg border bg-background shadow-lg">
            <button
              onClick={() => setShowPPTPreview(false)}
              className="absolute top-2 right-2 z-10 p-2 rounded-full bg-background/80 hover:bg-background border shadow-sm"
            >
              ✕
            </button>
            <PPTPreview presentation={activePresentation} />
          </div>
        </div>
      )}

      {/* Learning Mode Panel - shown when in learning mode */}
      {currentMode === 'learning' && showLearningPanel && (
        <div
          ref={learningPanelRef}
          className="fixed right-4 top-20 z-40 w-80 max-h-[calc(100vh-6rem)] overflow-auto"
        >
          <LearningModePanel
            onClose={() => setShowLearningPanel(false)}
            className="shadow-lg"
          />
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

      {/* Learning Mode Toggle Button - shown when in learning mode */}
      {currentMode === 'learning' && !showLearningPanel && (
        <button
          onClick={() => setShowLearningPanel(true)}
          className="fixed right-4 top-20 z-40 p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
          title="Open Learning Panel"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
            <path d="M6 12v5c3 3 9 3 12 0v-5"/>
          </svg>
        </button>
      )}

      {/* Clear Context Confirmation Dialog */}
      <AlertDialog open={showClearContextConfirm} onOpenChange={setShowClearContextConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clearConversation')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('clearConversationConfirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              _clearMessages();
              setShowClearContextConfirm(false);
            }}>
              {tCommon('clear')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
            return (
              <TextPart
                key={`text-${index}`}
                part={part}
                isError={isError}
              />
            );
          case 'reasoning':
            return (
              <ReasoningPart
                key={`reasoning-${index}`}
                part={part}
              />
            );
          case 'tool-invocation':
            return (
              <ToolPart
                key={`tool-${part.toolCallId}`}
                part={part}
              />
            );
          case 'sources':
            return (
              <SourcesPart
                key={`sources-${index}`}
                part={part}
              />
            );
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
}: ChatMessageItemProps) {
  const [copied, setCopied] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(message.isBookmarked || false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [reactions, setReactions] = useState<EmojiReaction[]>(message.reactions || []);
  const messageContentRef = useRef<HTMLDivElement>(null);

  const handleReaction = async (emoji: string) => {
    setReactions(prev => {
      const existing = prev.find(r => r.emoji === emoji);
      if (existing) {
        if (existing.reacted) {
          // Remove reaction
          if (existing.count === 1) {
            return prev.filter(r => r.emoji !== emoji);
          }
          return prev.map(r => 
            r.emoji === emoji ? { ...r, count: r.count - 1, reacted: false } : r
          );
        } else {
          // Add reaction
          return prev.map(r => 
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
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTranslate = () => {
    if (onTranslate && !isTranslating) {
      setIsTranslating(true);
      onTranslate(message.id, message.content);
      setTimeout(() => setIsTranslating(false), 1000);
    }
  };

  const handleBookmark = async () => {
    const newBookmarked = !isBookmarked;
    setIsBookmarked(newBookmarked);
    // Update in database
    await messageRepository.update(message.id, { isBookmarked: newBookmarked });
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(message.content);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
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

  return (
    <MessageUI id={`message-${message.id}`} from={message.role as "system" | "user" | "assistant"}>
      <MessageContent>
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={editContent}
              onChange={(e) => onEditContentChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full min-h-[100px] p-3 rounded-md border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={onCancelEdit}
                className="px-3 py-1.5 text-sm rounded-md border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onSaveEdit}
                className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Save & Submit
              </button>
            </div>
          </div>
        ) : (
          <div ref={messageContentRef}>
            {message.role === 'user' ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <MessagePartsRenderer
                parts={message.parts}
                content={message.content}
                isError={!!message.error}
              />
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
                <MessageReactions
                  reactions={reactions}
                  onReact={handleReaction}
                />
              </div>
            )}
            {/* Message artifacts */}
            {message.role === 'assistant' && (
              <MessageArtifacts messageId={message.id} compact />
            )}
          </div>
        )}
      </MessageContent>

      {!isEditing && !isStreaming && (
        <MessageActions>
          {message.role === 'user' && (
            <MessageAction
              tooltip="Edit message"
              onClick={onEdit}
            >
              <Pencil className="h-4 w-4" />
            </MessageAction>
          )}
          {message.role === 'assistant' && !message.error && (
            <>
              <MessageAction
                tooltip="Retry"
                onClick={onRetry}
              >
                <RotateCcw className="h-4 w-4" />
              </MessageAction>
              <MessageAction
                tooltip={copied ? 'Copied!' : 'Copy'}
                onClick={handleCopy}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </MessageAction>
              <MessageAction
                tooltip={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                onClick={handleBookmark}
              >
                {isBookmarked ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
              </MessageAction>
              <MessageAction
                tooltip={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                onClick={handleSpeak}
              >
                {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </MessageAction>
              <MessageAction
                tooltip="Share"
                onClick={handleShare}
              >
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
  );
}

export default ChatContainer;
