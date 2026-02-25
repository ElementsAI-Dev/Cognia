/**
 * send-pipeline.ts — Pure helper functions extracted from ChatContainer.handleSendMessage.
 *
 * Each function encapsulates one stage of the 12-step message-send pipeline.
 * They are intentionally side-effect-free (aside from dynamic imports and console logs)
 * so they can be tested independently.
 *
 * @module send-pipeline
 */

import type { Attachment } from '@/types/core/message';
import type { SearchResponse } from '@/types/search';
import type { ProviderName } from '@/types/provider';
import type { UIMessage, ChatMode } from '@/types';
import type { AnalysisResult } from '@/types';
import type { LearningModeConfig, PromptTemplate } from '@/types/learning';
import { getEnabledProviders } from '@/types/search';
import { getPluginEventHooks, getPluginLifecycleHooks } from '@/lib/plugin';
import { messageRepository } from '@/lib/db';

// ---------------------------------------------------------------------------
// 1. Plugin pre-chat hook
// ---------------------------------------------------------------------------

export interface PreChatHookResult {
  /** Blocked by plugin — stop the pipeline. */
  blocked: boolean;
  blockReason?: string;
  /** Effective content after possible plugin modification. */
  effectiveContent: string;
  /** Additional context string to add to system prompt later. */
  hookAdditionalContext?: string;
}

/**
 * Dispatch the `UserPromptSubmit` plugin event, allowing plugins to block,
 * modify or enrich the user's prompt before it enters the send pipeline.
 */
export async function runPluginPreChatHook(
  content: string,
  sessionId: string,
  attachments: Attachment[] | undefined,
  currentMode: ChatMode,
  messages: UIMessage[]
): Promise<PreChatHookResult> {
  const pluginEventHooks = getPluginEventHooks();
  const promptResult = await pluginEventHooks.dispatchUserPromptSubmit(content, sessionId, {
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
  });

  if (promptResult.action === 'block') {
    return { blocked: true, blockReason: promptResult.blockReason, effectiveContent: content };
  }

  const effectiveContent =
    promptResult.action === 'modify' && promptResult.modifiedPrompt
      ? promptResult.modifiedPrompt
      : content;

  return {
    blocked: false,
    effectiveContent,
    hookAdditionalContext: promptResult.additionalContext,
  };
}

// ---------------------------------------------------------------------------
// 2. Message content assembly
// ---------------------------------------------------------------------------

/**
 * Builds the user-facing message string from effective content, quoted text,
 * and attachment info lines.
 */
export function buildMessageContent(
  effectiveContent: string,
  formattedQuotes: string | null,
  attachments: Attachment[] | undefined
): string {
  let messageContent = effectiveContent;

  if (formattedQuotes) {
    messageContent = `${formattedQuotes}\n\n${effectiveContent}`;
  }

  if (attachments && attachments.length > 0) {
    const attachmentInfo = attachments.map((a) => `[Attached: ${a.name}]`).join(' ');
    messageContent = messageContent ? `${messageContent}\n\n${attachmentInfo}` : attachmentInfo;
  }

  return messageContent;
}

// ---------------------------------------------------------------------------
// 3. System prompt assembly
// ---------------------------------------------------------------------------

export interface SystemPromptParams {
  session: {
    carriedContext?: { fromMode: string; summary: string };
    historyContext?: { contextText: string };
    projectId?: string;
    systemPrompt?: string;
    mode?: ChatMode;
    activeSkillIds?: string[];
    learningContext?: {
      subMode?: 'socratic' | 'speedpass';
      speedpassContext?: {
        availableTimeMinutes?: number;
        targetScore?: number;
        examDate?: string;
        recommendedMode?: 'extreme' | 'speed' | 'comprehensive';
      };
    };
    id: string;
  } | undefined;
  messages: UIMessage[];
  content: string;
  effectiveContent: string;
  currentSessionId: string;
  currentMode: ChatMode;

  // Feature flags
  webSearchEnabled: boolean;
  thinkingEnabled: boolean;

  // Extra context fragments
  toolResultsContext: string;
  hookAdditionalContext?: string;

  // Dependencies (injected)
  providerSettings: Record<string, { apiKey?: string; defaultModel?: string; enabled?: boolean }>;
  getProject: (id: string) => { id: string } | undefined;
  projectContextHasKnowledge: boolean;
  sourceVerification: {
    settings: { enabled: boolean; mode: string };
    verifyResults: (response: SearchResponse) => Promise<SearchResponse>;
  };
  skillStoreSkills: Record<string, { status: string; id: string; category: string; metadata: { name: string } }>;
  getActiveSkills: () => Array<{ id: string; category: string; metadata: { name: string } }>;
  activateSkill: (id: string) => void;
  getLearningSessionByChat: (sessionId: string) => unknown;
  getLearningConfig: () => LearningModeConfig;
  getLearningPromptTemplates: () => Record<string, PromptTemplate>;
  updateSession: (id: string, update: Record<string, unknown>) => void;
}

/**
 * Assembles the enhanced system prompt by layering:
 * carried context → history context → project RAG → web search →
 * thinking mode → MCP tool results → skills → learning prompt → plugin context.
 *
 * Returns `{ systemPrompt, searchSources }`.
 */
export async function buildEnhancedSystemPrompt(
  params: SystemPromptParams,
  formatSearchResults: (response: SearchResponse) => string
): Promise<{
  systemPrompt: string;
  searchSources: import('@/types/core/message').Source[] | undefined;
}> {
  const {
    session,
    messages,
    content,
    effectiveContent,
    currentSessionId,
    currentMode,
    webSearchEnabled,
    thinkingEnabled,
    toolResultsContext,
    hookAdditionalContext,
    providerSettings,
    getProject,
    projectContextHasKnowledge,
    sourceVerification,
    skillStoreSkills,
    getActiveSkills,
    activateSkill,
    getLearningSessionByChat,
    getLearningConfig,
    getLearningPromptTemplates,
    updateSession,
  } = params;

  let enhancedSystemPrompt = '';
  let searchSources: import('@/types/core/message').Source[] | undefined;

  // --- Carried context from mode switch ---
  if (session?.carriedContext && messages.length === 0) {
    const contextNote = `## Context from Previous Conversation\n\nThe user switched from ${session.carriedContext.fromMode} mode. Here's a summary of the previous conversation to provide context:\n\n${session.carriedContext.summary}\n\n---\n\nUse this context to provide continuity in your responses.`;
    enhancedSystemPrompt = contextNote;
  }

  // --- History context from recent sessions ---
  if (session?.historyContext?.contextText && messages.length === 0) {
    enhancedSystemPrompt = enhancedSystemPrompt
      ? `${session.historyContext.contextText}\n\n${enhancedSystemPrompt}`
      : session.historyContext.contextText;
  }

  // --- Project knowledge base RAG ---
  if (session?.projectId && projectContextHasKnowledge) {
    const project = getProject(session.projectId);
    if (project) {
      const { buildProjectContext } = await import('@/lib/document/knowledge-rag');
      const queryContext = buildProjectContext(project as Parameters<typeof import('@/lib/document/knowledge-rag').buildProjectContext>[0], content, {
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

  // --- Web search ---
  if (webSearchEnabled) {
    const searchResult = await performWebSearch(content, effectiveContent, providerSettings, sourceVerification, formatSearchResults);
    if (searchResult.contextToAppend) {
      enhancedSystemPrompt = enhancedSystemPrompt
        ? `${enhancedSystemPrompt}\n\n${searchResult.contextToAppend}`
        : searchResult.contextToAppend;
    }
    searchSources = searchResult.sources;
  }

  // --- Thinking mode ---
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

  // --- MCP tool results ---
  if (toolResultsContext) {
    const toolContext = `## MCP Tool Results\n\nThe following tools were executed based on user request:\n\n${toolResultsContext}\n\n---\nUse the above tool results to inform your response.`;
    enhancedSystemPrompt = enhancedSystemPrompt
      ? `${enhancedSystemPrompt}\n\n${toolContext}`
      : toolContext;
  }

  // --- Skill auto-matching & injection ---
  const { findMatchingSkills, buildProgressiveSkillsPrompt, selectSkillsForContext } = await import('@/lib/skills/executor');
  const enabledSkills = Object.values(skillStoreSkills).filter((s) => s.status === 'enabled');
  if (enabledSkills.length > 0 && effectiveContent.length >= 5) {
    const matchedSkills = findMatchingSkills(enabledSkills as Parameters<typeof findMatchingSkills>[0], effectiveContent, 3);
    for (const matched of matchedSkills) {
      if (!(matched as { isActive?: boolean }).isActive) {
        activateSkill(matched.id);
        console.log(`Auto-activated skill: ${(matched as { metadata: { name: string } }).metadata.name}`);
      }
    }
  }

  const activeSkills = getActiveSkills();
  if (activeSkills.length > 0) {
    const budgetFilteredSkills = selectSkillsForContext(
      activeSkills as Parameters<typeof selectSkillsForContext>[0],
      4000,
      activeSkills.map((s: { id: string }) => s.id)
    );
    const { prompt: skillsPrompt, level, tokenEstimate } = buildProgressiveSkillsPrompt(
      budgetFilteredSkills,
      4000
    );
    if (skillsPrompt) {
      console.log(
        `Injecting ${budgetFilteredSkills.length}/${activeSkills.length} skills (level: ${level}, ~${tokenEstimate} tokens)`
      );
      enhancedSystemPrompt = enhancedSystemPrompt
        ? `${enhancedSystemPrompt}\n\n${skillsPrompt}`
        : skillsPrompt;
    }

    // Track active skill IDs on the session
    if (session) {
      const skillIds = activeSkills.map((s: { id: string }) => s.id);
      const currentSessionSkillIds = session.activeSkillIds || [];
      const mergedIds = [...new Set([...currentSessionSkillIds, ...skillIds])];
      if (mergedIds.length !== currentSessionSkillIds.length) {
        updateSession(session.id, { activeSkillIds: mergedIds });
      }
    }
  }

  // --- Learning mode ---
  if (currentMode === 'learning') {
    const { buildLearningSystemPrompt, buildAdaptiveLearningPrompt, isLearningModeV2Enabled } = await import('@/lib/learning');
    const learningModeV2Enabled = isLearningModeV2Enabled();
    const learningSession = getLearningSessionByChat(currentSessionId);
    const speedpassContext = session?.learningContext?.subMode === 'speedpass'
      ? session.learningContext.speedpassContext
      : undefined;

    const speedpassContextPrompt = speedpassContext
      ? (() => {
          const examDate = speedpassContext.examDate ? new Date(speedpassContext.examDate) : undefined;
          const examDateIso =
            examDate && !Number.isNaN(examDate.getTime()) ? examDate.toISOString() : undefined;
          const constraintPayload = {
            schema: learningModeV2Enabled
              ? 'cognia.speedpass.constraints.v2'
              : 'cognia.speedpass.constraints.v1',
            generatedAtIso: new Date().toISOString(),
            subMode: 'speedpass',
            availableTimeMinutes: speedpassContext.availableTimeMinutes ?? null,
            targetScore: speedpassContext.targetScore ?? null,
            examDateIso: examDateIso ?? null,
            recommendedMode: speedpassContext.recommendedMode ?? null,
            constraints: [
              'Prioritize high-yield topics first',
              'Use active recall and spaced review',
              'Keep explanations concise and actionable',
            ],
          };

          return [
            '## SpeedPass Constraints (Auditable)',
            'Use the following structured constraints as the source of truth:',
            '```json',
            JSON.stringify(constraintPayload, null, 2),
            '```',
          ].join('\n');
        })()
      : undefined;

    // Use buildAdaptiveLearningPrompt when session exists (includes difficulty/style/engagement)
    // Fall back to buildLearningSystemPrompt when no session (base Socratic prompt only)
    const learningConfig = getLearningConfig();
    const learningPromptTemplates = getLearningPromptTemplates();
    let learningPrompt: string | null = null;
    if (learningSession) {
      learningPrompt = buildAdaptiveLearningPrompt(
        learningSession as Parameters<typeof buildAdaptiveLearningPrompt>[0],
        {
          customContext: speedpassContextPrompt ?? undefined,
          config: learningConfig,
          customTemplates: learningPromptTemplates,
        },
      );
    } else {
      learningPrompt = buildLearningSystemPrompt(
        null,
        speedpassContextPrompt ?? undefined,
        learningConfig,
        learningPromptTemplates,
      );
    }
    if (learningPrompt) {
      console.log('Injecting learning mode (Socratic Method) system prompt');
      enhancedSystemPrompt = learningPrompt + (enhancedSystemPrompt ? `\n\n${enhancedSystemPrompt}` : '');
    }
  }

  // --- Plugin hook additional context ---
  if (hookAdditionalContext) {
    enhancedSystemPrompt = enhancedSystemPrompt
      ? `${enhancedSystemPrompt}\n\n## Plugin Context\n${hookAdditionalContext}`
      : `## Plugin Context\n${hookAdditionalContext}`;
  }

  return { systemPrompt: enhancedSystemPrompt, searchSources };
}

// ---------------------------------------------------------------------------
// Web search helper (used by buildEnhancedSystemPrompt)
// ---------------------------------------------------------------------------

async function performWebSearch(
  content: string,
  effectiveContent: string,
  providerSettings: Record<string, { apiKey?: string; defaultModel?: string; enabled?: boolean }>,
  sourceVerification: {
    settings: { enabled: boolean; mode: string };
    verifyResults: (response: SearchResponse) => Promise<SearchResponse>;
  },
  formatSearchResults: (response: SearchResponse) => string
): Promise<{
  contextToAppend: string | null;
  sources: import('@/types/core/message').Source[] | undefined;
}> {
  // Access settings store directly for search provider config
  const { useSettingsStore } = await import('@/stores');
  const { searchProviders, defaultSearchProvider, searchMaxResults } = useSettingsStore.getState();
  const hasEnabledProvider = getEnabledProviders(searchProviders).length > 0;
  const tavilyApiKey = providerSettings.tavily?.apiKey;

  if (!hasEnabledProvider && !tavilyApiKey) {
    return { contextToAppend: null, sources: undefined };
  }

  try {
    const { executeWebSearch } = await import('@/lib/ai/tools/web-search');
    const { optimizeSearchQuery } = await import('@/lib/search/search-query-optimizer');
    const searchQuery = optimizeSearchQuery(effectiveContent);

    const searchResult = await executeWebSearch(
      { query: searchQuery, maxResults: searchMaxResults || 5, searchDepth: 'basic' },
      hasEnabledProvider
        ? { providerSettings: searchProviders, provider: defaultSearchProvider }
        : { apiKey: tavilyApiKey }
    );

    if (!searchResult.success || !searchResult.results?.length) {
      return { contextToAppend: null, sources: undefined };
    }

    const searchResponse: SearchResponse = {
      provider: searchResult.provider || defaultSearchProvider || 'tavily',
      query: searchResult.query || searchQuery,
      answer: searchResult.answer,
      results: searchResult.results.map((r: { title: string; url: string; content: string; score: number; publishedDate?: string }) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score,
        publishedDate: r.publishedDate,
      })),
      responseTime: searchResult.responseTime || 0,
    };

    const sources = searchResult.results.map((r: { title: string; url: string; content?: string; score?: number }, i: number) => ({
      id: `search-${i}`,
      title: r.title,
      url: r.url,
      snippet: r.content?.slice(0, 200) || '',
      relevance: r.score || 0,
    }));

    // Source verification
    const verificationSettings = sourceVerification.settings;
    let contextToAppend: string | null = null;

    if (verificationSettings.enabled && verificationSettings.mode === 'ask') {
      await sourceVerification.verifyResults(searchResponse);
      contextToAppend = formatSearchResults(searchResponse);
    } else if (verificationSettings.enabled && verificationSettings.mode === 'auto') {
      const verified = await sourceVerification.verifyResults(searchResponse);
      const filteredResults = (verified.results as Array<{ isEnabled?: boolean }>).filter((r) => r.isEnabled);
      if (filteredResults.length > 0) {
        const filteredResponse: SearchResponse = { ...searchResponse, results: filteredResults as SearchResponse['results'] };
        contextToAppend = formatSearchResults(filteredResponse);
      }
    } else {
      contextToAppend = formatSearchResults(searchResponse);
    }

    return { contextToAppend, sources };
  } catch (searchError) {
    console.warn('Web search failed:', searchError);
    return { contextToAppend: null, sources: undefined };
  }
}

// ---------------------------------------------------------------------------
// 4. Post-response processing
// ---------------------------------------------------------------------------

export interface PostResponseParams {
  finalContent: string;
  assistantMessage: UIMessage;
  currentSessionId: string;
  actualModel: string;
  actualProvider: ProviderName;
  effectiveContent: string;
  searchSources: import('@/types/core/message').Source[] | undefined;
  activeSkills: Array<{ id: string }>;

  // Dependencies
  updateMessage: (id: string, update: Record<string, unknown>) => Promise<void>;
  loadSuggestions: (query: string, response: string) => void;
  recordSkillUsage: (id: string, success: boolean, duration: number) => void;
  autoCreateFromContent: (params: { sessionId: string; messageId: string; content: string }) => void;
  addAnalysisResult: (params: Omit<AnalysisResult, 'id' | 'createdAt'>) => unknown;
  processA2UIMessage: (content: string, messageId: string) => void;
}

/**
 * Runs all post-response processing after the AI response is fully received:
 * plugin post-receive hooks, message persistence, suggestion generation,
 * skill usage tracking, artifact auto-creation, math block detection,
 * and A2UI content processing.
 */
export async function processPostResponse(params: PostResponseParams): Promise<string> {
  const {
    assistantMessage,
    currentSessionId,
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
  } = params;

  let finalContent = params.finalContent;

  // --- Plugin post-receive hook ---
  const pluginEventHooks = getPluginEventHooks();
  const postReceiveResult = await pluginEventHooks.dispatchPostChatReceive({
    content: finalContent,
    messageId: assistantMessage.id,
    sessionId: currentSessionId,
    model: actualModel,
    provider: actualProvider,
  });

  if (postReceiveResult.modifiedContent) {
    finalContent = postReceiveResult.modifiedContent;
    await updateMessage(assistantMessage.id, { content: finalContent });
  }

  // --- Persist to IndexedDB ---
  await messageRepository.create(currentSessionId, {
    ...assistantMessage,
    content: finalContent,
    model: actualModel,
    provider: actualProvider,
    ...(searchSources && searchSources.length > 0 ? { sources: searchSources } : {}),
  });

  // --- Plugin message receive hook ---
  getPluginLifecycleHooks().dispatchOnMessageReceive({
    id: assistantMessage.id,
    role: 'assistant',
    content: finalContent,
  });

  // --- Additional messages from plugins ---
  // (Note: addMessage not injected here — handled in the caller)

  // --- Suggestions ---
  loadSuggestions(effectiveContent, finalContent);

  // --- Skill usage tracking ---
  if (activeSkills.length > 0) {
    const duration = Date.now() - (assistantMessage.createdAt?.getTime?.() || Date.now());
    for (const skill of activeSkills) {
      recordSkillUsage(skill.id, true, duration);
    }
  }

  // --- Artifact auto-creation ---
  try {
    autoCreateFromContent({
      sessionId: currentSessionId,
      messageId: assistantMessage.id,
      content: finalContent,
    });
  } catch (artifactError) {
    console.warn('Failed to auto-create artifacts:', artifactError);
  }

  // --- Math block detection ---
  try {
    const mathBlocks = finalContent.match(/\$\$([\s\S]+?)\$\$/g);
    if (mathBlocks && mathBlocks.length > 0) {
      for (const block of mathBlocks) {
        const blockContent = block.replace(/^\$\$|\$\$$/g, '').trim();
        if (blockContent.split('\n').length >= 2) {
          addAnalysisResult({
            sessionId: currentSessionId,
            messageId: assistantMessage.id,
            type: 'math',
            content: blockContent,
            output: { latex: blockContent },
          });
        }
      }
    }
  } catch (analysisError) {
    console.warn('Failed to auto-detect analysis results:', analysisError);
  }

  // --- A2UI content processing ---
  const { hasA2UIContent } = await import('@/components/a2ui');
  if (hasA2UIContent(finalContent)) {
    try {
      processA2UIMessage(finalContent, assistantMessage.id);
    } catch (a2uiError) {
      console.warn('Failed to process A2UI content:', a2uiError);
    }
  }

  return finalContent;
}
