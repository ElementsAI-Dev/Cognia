'use client';

/**
 * ChatContainer - main chat component with AI integration
 * Uses Vercel AI SDK for streaming chat with multiple providers
 * Messages are persisted to IndexedDB via useMessages hook
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Copy, Check, Pencil, RotateCcw } from 'lucide-react';
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
import { type Attachment } from './chat-input';
import { ChatInputSimple } from './chat-input-simple';
import { ContextSettingsDialog } from './context-settings-dialog';
import { WelcomeState } from './welcome-state';
import { BranchButton } from './branch-selector';
import { PromptOptimizerDialog } from './prompt-optimizer-dialog';
import { PresetSelector } from './preset-selector';
import { PresetManagerDialog } from './preset-manager-dialog';
import { Suggestions, Suggestion } from '@/components/ai-elements/suggestion';
import { AgentPlanEditor } from '@/components/agent/agent-plan-editor';
import {
  generateSuggestions,
  getDefaultSuggestions,
  type GeneratedSuggestion,
} from '@/lib/ai/suggestion-generator';
import type { SearchResponse } from '@/lib/search/tavily';
import { useSessionStore, useSettingsStore, usePresetStore } from '@/stores';
import { useMessages } from '@/hooks';
import { useAIChat, useAutoRouter, type ProviderName, isVisionModel, buildMultimodalContent, type MultimodalMessage } from '@/lib/ai';
import { messageRepository } from '@/lib/db';
import { PROVIDERS } from '@/types/provider';
import type { ChatMode, UIMessage } from '@/types';

interface ChatContainerProps {
  sessionId?: string;
}

export function ChatContainer({ sessionId }: ChatContainerProps) {
  const setActiveSession = useSessionStore((state) => state.setActiveSession);
  const getSession = useSessionStore((state) => state.getSession);
  const getActiveSession = useSessionStore((state) => state.getActiveSession);
  const createSession = useSessionStore((state) => state.createSession);
  const updateSession = useSessionStore((state) => state.updateSession);

  const session = sessionId ? getSession(sessionId) : getActiveSession();
  const activeSessionId = session?.id || null;

  // Message persistence with IndexedDB
  const {
    messages,
    isLoading: isLoadingMessages,
    isInitialized,
    addMessage,
    updateMessage,
    deleteMessagesAfter,
    clearMessages,
    appendToMessage,
    createStreamingMessage,
  } = useMessages({
    sessionId: activeSessionId,
    onError: (err) => setError(err.message),
  });

  // Settings store for API keys
  const providerSettings = useSettingsStore((state) => state.providerSettings);

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
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Preset states
  const [showPresetManager, setShowPresetManager] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const trackPresetUsage = usePresetStore((state) => state.usePreset);

  // Context settings states
  const [showContextSettings, setShowContextSettings] = useState(false);
  const [contextLimitPercent, setContextLimitPercent] = useState(50);
  const [showMemoryActivation, setShowMemoryActivation] = useState(false);
  const [showTokenUsageMeter, setShowTokenUsageMeter] = useState(true);


  // Feature toggles from session
  const webSearchEnabled = session?.webSearchEnabled ?? false;
  const thinkingEnabled = session?.thinkingEnabled ?? false;

  // Current mode
  const currentMode: ChatMode = session?.mode || 'chat';

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

  // Token usage calculation (simplified estimation)
  const estimatedTokens = useMemo(() => {
    const messageText = messages.map(m => m.content).join(' ');
    // Rough estimation: ~4 characters per token
    const contextTokens = Math.round(messageText.length / 4);
    const systemTokens = 200; // Approximate system prompt tokens
    const totalTokens = contextTokens + systemTokens;
    return { contextTokens, systemTokens, totalTokens };
  }, [messages]);

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

  // Set active session on mount
  useEffect(() => {
    if (sessionId) {
      const existingSession = getSession(sessionId);
      if (existingSession) {
        setActiveSession(sessionId);
      }
    }
  }, [sessionId, setActiveSession, getSession]);

  const handleNewChat = useCallback(() => {
    createSession();
    setError(null);
  }, [createSession]);

  const handleModeChange = useCallback((mode: ChatMode) => {
    if (session) {
      updateSession(session.id, { mode });
    } else {
      createSession({ mode });
    }
  }, [session, updateSession, createSession]);

  // Handle preset selection
  const handleSelectPreset = useCallback((preset: import('@/types/preset').Preset) => {
    trackPresetUsage(preset.id);

    if (session) {
      updateSession(session.id, {
        provider: preset.provider === 'auto' ? 'openai' : preset.provider,
        model: preset.model,
        mode: preset.mode,
        systemPrompt: preset.systemPrompt,
        temperature: preset.temperature,
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

  // Open preset manager
  const handleManagePresets = useCallback(() => {
    setEditingPresetId(null);
    setShowPresetManager(true);
  }, []);

  // Create new preset
  const handleCreatePreset = useCallback(() => {
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

  // Open prompt optimizer
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
    searchResponse.results.forEach((result, index) => {
      parts.push(`${index + 1}. [${result.title}](${result.url})`);
      parts.push(`   ${result.content.slice(0, 200)}...`);
      parts.push('');
    });

    parts.push('---');
    parts.push('Use the above search results to provide an informed, up-to-date response. Cite sources when relevant.');

    return parts.join('\n');
  }, []);

  const handleSendMessage = useCallback(async (content: string, attachments?: Attachment[]) => {
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

    // Build message content with attachments info
    let messageContent = content;
    if (attachments && attachments.length > 0) {
      const attachmentInfo = attachments.map(a => `[Attached: ${a.name}]`).join(' ');
      messageContent = content ? `${content}\n\n${attachmentInfo}` : attachmentInfo;
    }

    setIsLoading(true);

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

      // Perform web search if enabled
      let enhancedSystemPrompt = session?.systemPrompt || '';
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

      // Send to AI
      const response = await aiSendMessage(
        {
          messages: coreMessages,
          systemPrompt: enhancedSystemPrompt || undefined,
          temperature: session?.temperature ?? 0.7,
          maxTokens: session?.maxTokens,
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
      }
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      setLastFailedMessage(content);
    } finally {
      setIsLoading(false);
    }
  }, [activeSessionId, messages, currentProvider, currentModel, isAutoMode, selectModel, aiSendMessage, createSession, isStreaming, session, addMessage, createStreamingMessage, appendToMessage, updateMessage, loadSuggestions, webSearchEnabled, thinkingEnabled, providerSettings, formatSearchResults]);

  const handleStop = useCallback(() => {
    aiStop();
    setIsLoading(false);
    setIsStreaming(false);
  }, [aiStop]);

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
    <div className="flex min-h-0 flex-1 flex-col">
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
              />
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <MessageUI from="assistant">
                <MessageContent>
                  <Loader size={20} />
                </MessageContent>
              </MessageUI>
            )}
          </ConversationContent>
        )}
        <ConversationScrollButton />
      </Conversation>

      {/* Suggestions after AI response */}
      {!isLoading && !isStreaming && suggestions.length > 0 && messages.length > 0 && (
        <div className="px-4 pb-2">
          <Suggestions>
            {suggestions.map((suggestion, index) => (
              <Suggestion
                key={index}
                suggestion={suggestion.text}
                onClick={handleSuggestionClick}
              />
            ))}
          </Suggestions>
        </div>
      )}

      {/* Agent Plan Editor for agent mode */}
      {currentMode === 'agent' && activeSessionId && (
        <div className="px-4 pb-2">
          <AgentPlanEditor sessionId={activeSessionId} />
        </div>
      )}

      <ChatInputSimple
        value={inputValue}
        onChange={setInputValue}
        onSubmit={() => handleSendMessage(inputValue)}
        isLoading={isLoading}
        isStreaming={isStreaming}
        onStop={handleStop}
        contextUsagePercent={contextUsagePercent}
        onOpenContextSettings={() => setShowContextSettings(true)}
        webSearchEnabled={webSearchEnabled}
        thinkingEnabled={thinkingEnabled}
        onWebSearchChange={handleWebSearchChange}
        onThinkingChange={handleThinkingChange}
        modelName={currentModel}
        modeName={currentMode}
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
      />
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
}: ChatMessageItemProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    <MessageUI from={message.role as "system" | "user" | "assistant"}>
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
        ) : message.role === 'user' ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <MessageResponse className={message.error ? 'text-destructive' : undefined}>
            {message.content}
          </MessageResponse>
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
            </>
          )}
          {/* Branch button for all messages */}
          <BranchButton
            sessionId={sessionId}
            messageId={message.id}
          />
        </MessageActions>
      )}
    </MessageUI>
  );
}

export default ChatContainer;
