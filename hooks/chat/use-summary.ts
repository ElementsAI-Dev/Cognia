/**
 * useSummary Hook - Manages summary and diagram generation for chat and agents
 *
 * Provides functions to:
 * - Generate chat summaries (with or without AI)
 * - Generate agent summaries
 * - Generate Mermaid diagrams for visualization
 * - Export summaries and diagrams
 * - Persist summaries to database
 * - Incremental summarization for long conversations
 * - Conversation analysis
 */

import { useState, useCallback } from 'react';
import type { UIMessage } from '@/types/core/message';
import type { BackgroundAgent } from '@/types/agent/background-agent';
import type {
  ChatSummaryOptions,
  ChatSummaryResult,
  AgentSummaryOptions,
  AgentSummaryResult,
  DiagramOptions,
  DiagramResult,
  SummaryProgress,
  SummaryWithDiagram,
  SummaryExportOptions,
  StoredSummary,
  ConversationAnalysis,
  SummaryTemplate,
} from '@/types/learning/summary';
import {
  generateChatSummary,
  generateChatSummaryWithAI,
  generateAgentSummary,
  generateEnhancedChatSummary,
  generateIncrementalSummary,
  analyzeConversation,
  getSummaryTemplate,
  getAvailableTemplates,
} from '@/lib/ai/generation/summarizer';
import { generateChatDiagram } from '@/lib/export/chat-diagram';
import { generateAgentDiagram } from '@/lib/export/agent-diagram';
import { downloadFile, generateFilename } from '@/lib/export';
import type { ProviderName } from '@/lib/ai/core/client';
import { useSummaryStore } from '@/stores/chat';

export interface UseSummaryOptions {
  /** Use AI for summarization */
  useAI?: boolean;
  /** Use enhanced AI summarization with style/template support */
  useEnhanced?: boolean;
  /** AI provider configuration */
  aiConfig?: {
    provider: ProviderName;
    model: string;
    apiKey: string;
    baseURL?: string;
  };
  /** Session ID for persistence */
  sessionId?: string;
  /** Auto-persist summaries to database */
  autoPersist?: boolean;
}

export interface UseSummaryReturn {
  // State
  isGenerating: boolean;
  progress: SummaryProgress | null;
  chatSummary: ChatSummaryResult | null;
  agentSummary: AgentSummaryResult | null;
  diagram: DiagramResult | null;
  error: string | null;

  // Stored summaries
  storedSummaries: StoredSummary[];
  latestStoredSummary: StoredSummary | undefined;

  // Actions
  generateChatSummary: (
    messages: UIMessage[],
    options?: Partial<ChatSummaryOptions>,
    sessionTitle?: string
  ) => Promise<ChatSummaryResult>;
  generateAgentSummary: (
    agent: BackgroundAgent,
    options?: Partial<AgentSummaryOptions>
  ) => Promise<AgentSummaryResult>;
  generateChatDiagram: (messages: UIMessage[], options?: Partial<DiagramOptions>) => DiagramResult;
  generateAgentDiagram: (
    agent: BackgroundAgent,
    options?: Partial<DiagramOptions>
  ) => DiagramResult;
  generateChatSummaryWithDiagram: (
    messages: UIMessage[],
    summaryOptions?: Partial<ChatSummaryOptions>,
    diagramOptions?: Partial<DiagramOptions>,
    sessionTitle?: string
  ) => Promise<SummaryWithDiagram>;
  generateAgentSummaryWithDiagram: (
    agent: BackgroundAgent,
    summaryOptions?: Partial<AgentSummaryOptions>,
    diagramOptions?: Partial<DiagramOptions>
  ) => Promise<SummaryWithDiagram>;

  // Enhanced features
  generateEnhancedSummary: (
    messages: UIMessage[],
    options?: Partial<ChatSummaryOptions>,
    sessionTitle?: string
  ) => Promise<ChatSummaryResult>;
  generateIncrementalSummary: (
    newMessages: UIMessage[],
    options?: Partial<ChatSummaryOptions>
  ) => Promise<ChatSummaryResult>;
  analyzeConversation: (messages: UIMessage[]) => Promise<ConversationAnalysis>;

  // Persistence
  saveSummary: (sessionId: string) => Promise<StoredSummary | null>;
  loadSummaries: (sessionId: string) => Promise<void>;
  deleteSummary: (summaryId: string) => Promise<void>;

  // Utilities
  getTemplate: (
    name: SummaryTemplate
  ) => { name: string; description: string; prompt: string } | undefined;
  getAvailableTemplates: () => SummaryTemplate[];

  exportSummary: (options: SummaryExportOptions) => void;
  reset: () => void;
}

/**
 * Hook for generating summaries and diagrams
 */
export function useSummary(hookOptions: UseSummaryOptions = {}): UseSummaryReturn {
  const { useAI = false, aiConfig, sessionId, autoPersist = false } = hookOptions;

  // Summary store for persistence
  const summaryStore = useSummaryStore();
  const storedSummaries = sessionId ? summaryStore.getSummariesForSession(sessionId) : [];
  const latestStoredSummary = sessionId ? summaryStore.getLatestSummary(sessionId) : undefined;

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<SummaryProgress | null>(null);
  const [chatSummary, setChatSummary] = useState<ChatSummaryResult | null>(null);
  const [agentSummary, setAgentSummary] = useState<AgentSummaryResult | null>(null);
  const [diagram, setDiagram] = useState<DiagramResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setChatSummary(null);
    setAgentSummary(null);
    setDiagram(null);
    setError(null);
    setProgress(null);
    setIsGenerating(false);
  }, []);

  const handleGenerateChatSummary = useCallback(
    async (
      messages: UIMessage[],
      options: Partial<ChatSummaryOptions> = {},
      sessionTitle?: string
    ): Promise<ChatSummaryResult> => {
      setIsGenerating(true);
      setError(null);

      const mergedOptions: ChatSummaryOptions = {
        scope: 'all',
        format: 'detailed',
        includeCode: true,
        includeToolCalls: true,
        maxLength: 2000,
        ...options,
      };

      try {
        let result: ChatSummaryResult;

        if (useAI && aiConfig) {
          result = await generateChatSummaryWithAI(
            {
              messages,
              sessionTitle,
              options: mergedOptions,
              onProgress: setProgress,
            },
            aiConfig
          );
        } else {
          result = generateChatSummary({
            messages,
            sessionTitle,
            options: mergedOptions,
            onProgress: setProgress,
          });
        }

        setChatSummary(result);
        setIsGenerating(false);
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to generate summary';
        setError(errorMsg);
        setIsGenerating(false);
        throw err;
      }
    },
    [useAI, aiConfig]
  );

  const handleGenerateAgentSummary = useCallback(
    async (
      agent: BackgroundAgent,
      options: Partial<AgentSummaryOptions> = {}
    ): Promise<AgentSummaryResult> => {
      setIsGenerating(true);
      setError(null);

      const mergedOptions: AgentSummaryOptions = {
        includeSubAgents: true,
        includeToolCalls: true,
        includeLogs: false,
        includeTiming: true,
        format: 'detailed',
        maxLength: 2000,
        ...options,
      };

      try {
        const result = generateAgentSummary({
          agent,
          options: mergedOptions,
          onProgress: setProgress,
        });

        setAgentSummary(result);
        setIsGenerating(false);
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to generate agent summary';
        setError(errorMsg);
        setIsGenerating(false);
        throw err;
      }
    },
    []
  );

  const handleGenerateChatDiagram = useCallback(
    (messages: UIMessage[], options: Partial<DiagramOptions> = {}): DiagramResult => {
      setError(null);

      try {
        const result = generateChatDiagram(messages, options);
        setDiagram(result);
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to generate diagram';
        setError(errorMsg);
        throw err;
      }
    },
    []
  );

  const handleGenerateAgentDiagram = useCallback(
    (agent: BackgroundAgent, options: Partial<DiagramOptions> = {}): DiagramResult => {
      setError(null);

      try {
        const result = generateAgentDiagram(agent, options);
        setDiagram(result);
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to generate agent diagram';
        setError(errorMsg);
        throw err;
      }
    },
    []
  );

  const handleGenerateChatSummaryWithDiagram = useCallback(
    async (
      messages: UIMessage[],
      summaryOptions: Partial<ChatSummaryOptions> = {},
      diagramOptions: Partial<DiagramOptions> = {},
      sessionTitle?: string
    ): Promise<SummaryWithDiagram> => {
      setIsGenerating(true);
      setError(null);

      try {
        // Generate summary
        setProgress({ stage: 'analyzing', progress: 10, message: 'Analyzing messages...' });
        const summary = await handleGenerateChatSummary(messages, summaryOptions, sessionTitle);

        // Generate diagram
        setProgress({
          stage: 'generating-diagram',
          progress: 80,
          message: 'Generating diagram...',
        });
        const diagramResult = handleGenerateChatDiagram(messages, diagramOptions);

        setProgress({ stage: 'complete', progress: 100, message: 'Complete!' });
        setIsGenerating(false);

        return {
          summary,
          diagram: diagramResult,
        };
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to generate summary with diagram';
        setError(errorMsg);
        setIsGenerating(false);
        throw err;
      }
    },
    [handleGenerateChatSummary, handleGenerateChatDiagram]
  );

  const handleGenerateAgentSummaryWithDiagram = useCallback(
    async (
      agent: BackgroundAgent,
      summaryOptions: Partial<AgentSummaryOptions> = {},
      diagramOptions: Partial<DiagramOptions> = {}
    ): Promise<SummaryWithDiagram> => {
      setIsGenerating(true);
      setError(null);

      try {
        // Generate summary
        setProgress({ stage: 'analyzing', progress: 10, message: 'Analyzing agent execution...' });
        const summary = await handleGenerateAgentSummary(agent, summaryOptions);

        // Generate diagram
        setProgress({
          stage: 'generating-diagram',
          progress: 80,
          message: 'Generating diagram...',
        });
        const diagramResult = handleGenerateAgentDiagram(agent, diagramOptions);

        setProgress({ stage: 'complete', progress: 100, message: 'Complete!' });
        setIsGenerating(false);

        return {
          summary,
          diagram: diagramResult,
        };
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to generate agent summary with diagram';
        setError(errorMsg);
        setIsGenerating(false);
        throw err;
      }
    },
    [handleGenerateAgentSummary, handleGenerateAgentDiagram]
  );

  const handleExportSummary = useCallback(
    (options: SummaryExportOptions) => {
      const { format, includeDiagram, filename } = options;

      const summary = chatSummary || agentSummary;
      if (!summary) {
        setError('No summary to export');
        return;
      }

      let content = '';
      let mimeType = 'text/plain';
      let extension = 'txt';

      const summaryText = 'summary' in summary ? summary.summary : '';
      const diagramCode = includeDiagram && diagram ? diagram.mermaidCode : '';

      switch (format) {
        case 'markdown':
          content = buildMarkdownExport(summaryText, diagramCode, summary);
          mimeType = 'text/markdown';
          extension = 'md';
          break;

        case 'html':
          content = buildHTMLExport(summaryText, diagramCode, summary);
          mimeType = 'text/html';
          extension = 'html';
          break;

        case 'json':
          content = JSON.stringify(
            {
              summary,
              diagram: includeDiagram ? diagram : undefined,
              exportedAt: new Date().toISOString(),
            },
            null,
            2
          );
          mimeType = 'application/json';
          extension = 'json';
          break;

        default:
          content = summaryText + (diagramCode ? `\n\n--- Diagram ---\n\n${diagramCode}` : '');
          break;
      }

      const exportFilename = filename || generateFilename('summary', extension);
      downloadFile(content, exportFilename, mimeType);
    },
    [chatSummary, agentSummary, diagram]
  );

  // Enhanced summary generation
  const handleGenerateEnhancedSummary = useCallback(
    async (
      messages: UIMessage[],
      options: Partial<ChatSummaryOptions> = {},
      sessionTitle?: string
    ): Promise<ChatSummaryResult> => {
      if (!aiConfig) {
        throw new Error('AI config required for enhanced summary');
      }

      setIsGenerating(true);
      setError(null);

      const mergedOptions: ChatSummaryOptions = {
        scope: 'all',
        format: 'detailed',
        style: 'professional',
        includeCode: true,
        includeToolCalls: true,
        maxLength: 2000,
        autoDetectLanguage: true,
        ...options,
      };

      try {
        const result = await generateEnhancedChatSummary(
          { messages, sessionTitle, options: mergedOptions, onProgress: setProgress },
          aiConfig
        );
        setChatSummary(result);
        setIsGenerating(false);

        // Auto-persist if enabled
        if (autoPersist && sessionId && result.success) {
          await summaryStore.createSummary({
            sessionId,
            type: 'chat',
            summary: result.summary,
            keyPoints: result.keyPoints,
            topics: result.topics,
            messageRange: { startIndex: 0, endIndex: messages.length - 1 },
            messageCount: result.messageCount,
            sourceTokens: result.sourceTokens,
            summaryTokens: result.summaryTokens,
            compressionRatio: result.compressionRatio,
            format: mergedOptions.format,
            style: mergedOptions.style,
            usedAI: true,
          });
        }

        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to generate enhanced summary';
        setError(errorMsg);
        setIsGenerating(false);
        throw err;
      }
    },
    [aiConfig, autoPersist, sessionId, summaryStore]
  );

  // Incremental summary generation
  const handleGenerateIncrementalSummary = useCallback(
    async (
      newMessages: UIMessage[],
      options: Partial<ChatSummaryOptions> = {}
    ): Promise<ChatSummaryResult> => {
      if (!aiConfig) {
        throw new Error('AI config required for incremental summary');
      }
      if (!latestStoredSummary) {
        throw new Error('No previous summary to build upon');
      }

      setIsGenerating(true);
      setError(null);

      const mergedOptions: ChatSummaryOptions = {
        scope: 'all',
        format: latestStoredSummary.format,
        style: latestStoredSummary.style,
        includeCode: true,
        includeToolCalls: true,
        maxLength: 2000,
        ...options,
      };

      try {
        const result = await generateIncrementalSummary(
          {
            previousSummary: latestStoredSummary,
            newMessages,
            options: mergedOptions,
            onProgress: setProgress,
          },
          aiConfig
        );
        setChatSummary(result);
        setIsGenerating(false);
        return result;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to generate incremental summary';
        setError(errorMsg);
        setIsGenerating(false);
        throw err;
      }
    },
    [aiConfig, latestStoredSummary]
  );

  // Conversation analysis
  const handleAnalyzeConversation = useCallback(
    async (messages: UIMessage[]): Promise<ConversationAnalysis> => {
      if (!aiConfig) {
        throw new Error('AI config required for conversation analysis');
      }

      try {
        return await analyzeConversation(messages, aiConfig);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to analyze conversation';
        setError(errorMsg);
        throw err;
      }
    },
    [aiConfig]
  );

  // Save current summary to store
  const handleSaveSummary = useCallback(
    async (targetSessionId: string): Promise<StoredSummary | null> => {
      if (!chatSummary) {
        setError('No summary to save');
        return null;
      }

      try {
        const stored = await summaryStore.createSummary({
          sessionId: targetSessionId,
          type: 'chat',
          summary: chatSummary.summary,
          keyPoints: chatSummary.keyPoints,
          topics: chatSummary.topics,
          diagram: diagram?.mermaidCode,
          diagramType: diagram?.type,
          messageRange: { startIndex: 0, endIndex: chatSummary.messageCount - 1 },
          messageCount: chatSummary.messageCount,
          sourceTokens: chatSummary.sourceTokens,
          summaryTokens: chatSummary.summaryTokens,
          compressionRatio: chatSummary.compressionRatio,
          format: 'detailed',
          usedAI: useAI,
        });
        return stored;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to save summary';
        setError(errorMsg);
        return null;
      }
    },
    [chatSummary, diagram, summaryStore, useAI]
  );

  // Load summaries for session
  const handleLoadSummaries = useCallback(
    async (targetSessionId: string): Promise<void> => {
      await summaryStore.loadSummariesForSession(targetSessionId);
    },
    [summaryStore]
  );

  // Delete summary
  const handleDeleteSummary = useCallback(
    async (summaryId: string): Promise<void> => {
      await summaryStore.deleteSummary(summaryId);
    },
    [summaryStore]
  );

  // Template utilities
  const handleGetTemplate = useCallback(
    (name: SummaryTemplate) =>
      getSummaryTemplate(
        name as keyof typeof import('@/lib/ai/prompts/summary-prompts').SUMMARY_TEMPLATES
      ),
    []
  );

  const handleGetAvailableTemplates = useCallback(
    () => getAvailableTemplates() as SummaryTemplate[],
    []
  );

  return {
    isGenerating,
    progress,
    chatSummary,
    agentSummary,
    diagram,
    error,
    storedSummaries,
    latestStoredSummary,
    generateChatSummary: handleGenerateChatSummary,
    generateAgentSummary: handleGenerateAgentSummary,
    generateChatDiagram: handleGenerateChatDiagram,
    generateAgentDiagram: handleGenerateAgentDiagram,
    generateChatSummaryWithDiagram: handleGenerateChatSummaryWithDiagram,
    generateAgentSummaryWithDiagram: handleGenerateAgentSummaryWithDiagram,
    generateEnhancedSummary: handleGenerateEnhancedSummary,
    generateIncrementalSummary: handleGenerateIncrementalSummary,
    analyzeConversation: handleAnalyzeConversation,
    saveSummary: handleSaveSummary,
    loadSummaries: handleLoadSummaries,
    deleteSummary: handleDeleteSummary,
    getTemplate: handleGetTemplate,
    getAvailableTemplates: handleGetAvailableTemplates,
    exportSummary: handleExportSummary,
    reset,
  };
}

/**
 * Build markdown export content
 */
function buildMarkdownExport(
  summaryText: string,
  diagramCode: string,
  summary: ChatSummaryResult | AgentSummaryResult
): string {
  const lines: string[] = [];

  lines.push('# Summary Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push('');

  lines.push('## Summary');
  lines.push('');
  lines.push(summaryText);
  lines.push('');

  // Add key points if available
  if ('keyPoints' in summary && summary.keyPoints.length > 0) {
    lines.push('## Key Points');
    lines.push('');
    summary.keyPoints.forEach((kp) => {
      lines.push(`- ${kp.content}`);
    });
    lines.push('');
  }

  // Add topics if available
  if ('topics' in summary && summary.topics.length > 0) {
    lines.push('## Topics Discussed');
    lines.push('');
    summary.topics.forEach((topic) => {
      lines.push(`- **${topic.name}**: ${topic.description || ''}`);
    });
    lines.push('');
  }

  // Add steps if agent summary
  if ('steps' in summary && summary.steps.length > 0) {
    lines.push('## Execution Steps');
    lines.push('');
    summary.steps.forEach((step) => {
      lines.push(`${step.stepNumber}. [${step.status}] ${step.description}`);
    });
    lines.push('');
  }

  // Add diagram if available
  if (diagramCode) {
    lines.push('## Visualization');
    lines.push('');
    lines.push('```mermaid');
    lines.push(diagramCode);
    lines.push('```');
  }

  return lines.join('\n');
}

/**
 * Build HTML export content
 */
function buildHTMLExport(
  summaryText: string,
  diagramCode: string,
  summary: ChatSummaryResult | AgentSummaryResult
): string {
  const escapedSummary = summaryText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Summary Report</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
    h1, h2 { color: #333; }
    .summary { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .diagram { margin: 20px 0; padding: 20px; background: white; border: 1px solid #ddd; border-radius: 8px; }
    .meta { color: #666; font-size: 14px; }
    .key-point { margin: 8px 0; padding-left: 16px; border-left: 3px solid #4caf50; }
    .topic { display: inline-block; background: #e3f2fd; padding: 4px 12px; border-radius: 16px; margin: 4px; }
  </style>
</head>
<body>
  <h1>Summary Report</h1>
  <p class="meta">Generated: ${new Date().toLocaleString()}</p>
  
  <h2>Summary</h2>
  <div class="summary">${escapedSummary}</div>
  
  ${
    'keyPoints' in summary && summary.keyPoints.length > 0
      ? `
  <h2>Key Points</h2>
  ${summary.keyPoints.map((kp) => `<div class="key-point">${kp.content}</div>`).join('')}
  `
      : ''
  }
  
  ${
    'topics' in summary && summary.topics.length > 0
      ? `
  <h2>Topics</h2>
  <div>${summary.topics.map((t) => `<span class="topic">${t.name}</span>`).join('')}</div>
  `
      : ''
  }
  
  ${
    diagramCode
      ? `
  <h2>Visualization</h2>
  <div class="diagram">
    <pre class="mermaid">${diagramCode}</pre>
  </div>
  <script>mermaid.initialize({ startOnLoad: true });</script>
  `
      : ''
  }
</body>
</html>`;
}

export default useSummary;
