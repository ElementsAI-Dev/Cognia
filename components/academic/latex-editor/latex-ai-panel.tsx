'use client';

/**
 * LaTeX AI Panel - Integrated sidebar panel for AI assistance
 * Replaces the floating popup with an embedded resizable panel
 */

import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useSettingsStore } from '@/stores/settings';
import { useAIChat } from '@/lib/ai/generation/use-ai-chat';
import type { ProviderName } from '@/types/provider';
import {
  Sparkles,
  PanelRightClose,
  PanelRight,
  MessageSquare,
  Lightbulb,
  History,
  Send,
  Calculator,
  Loader2,
  Copy,
  Check,
  Trash2,
} from 'lucide-react';
import { LatexEquationAnalysis } from './latex-equation-analysis';

type SidebarTab = 'chat' | 'suggestions' | 'analysis' | 'history';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
};

function resolveProvider(
  defaultProvider: string,
  providerSettings: Record<string, { enabled?: boolean; apiKey?: string }>
) {
  if (defaultProvider === 'auto') {
    const candidates = Object.keys(providerSettings)
      .filter((key) => key !== 'auto')
      .filter(
        (key) =>
          providerSettings[key]?.enabled &&
          (key === 'ollama' || Boolean(providerSettings[key]?.apiKey))
      );

    const first = candidates[0];
    return (first ? first : 'openai') as ProviderName;
  }

  return defaultProvider as ProviderName;
}

interface LatexAIPanelProps {
  open: boolean;
  onToggle: () => void;
  selectedText?: string;
  onInsertText?: (text: string) => void;
  className?: string;
}

export function LatexAIPanel({
  open,
  onToggle,
  selectedText,
  onInsertText,
  className,
}: LatexAIPanelProps) {
  const t = useTranslations('latex');
  const [tab, setTab] = useState<SidebarTab>('chat');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const defaultProvider = useSettingsStore((s) => s.defaultProvider);
  const providerSettings = useSettingsStore((s) => s.providerSettings);

  const provider = useMemo(
    () => resolveProvider(defaultProvider, providerSettings as unknown as Record<string, { enabled?: boolean; apiKey?: string }>),
    [defaultProvider, providerSettings]
  );

  const model = useMemo(() => {
    const current = providerSettings[provider];
    if (current?.defaultModel) return current.defaultModel;

    const defaults: Record<string, string> = {
      openai: 'gpt-4o-mini',
      anthropic: 'claude-3-haiku-20240307',
      google: 'gemini-1.5-flash',
      deepseek: 'deepseek-chat',
      groq: 'llama-3.1-8b-instant',
    };

    return defaults[provider] || 'gpt-4o-mini';
  }, [provider, providerSettings]);

  const { sendMessage, stop } = useAIChat({
    provider,
    model,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput('');
    setIsStreaming(true);

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const systemPrompt = `You are an AI assistant helping with writing LaTeX documents. Be concise. When giving LaTeX, output plain LaTeX (no markdown fences) unless asked.${
      selectedText ? `\n\nThe user has selected the following text:\n"""${selectedText}"""` : ''
    }`;

    const historyForModel = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const result = await sendMessage({
        messages: historyForModel,
        systemPrompt,
        temperature: 0.7,
        maxTokens: 2000,
      });

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: result,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      console.error('AI chat error:', error);
    } finally {
      setIsStreaming(false);
    }
  }, [input, messages, sendMessage, selectedText, isStreaming]);

  const handleCopy = useCallback(async (id: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleInsert = useCallback(
    (content: string) => {
      onInsertText?.(content);
    },
    [onInsertText]
  );

  const handleClearHistory = useCallback(() => {
    setMessages([]);
  }, []);

  if (!open) {
    return (
      <div className={cn('flex items-center justify-center border-l bg-muted/20', className)}>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8"
        >
          <PanelRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full border-l bg-background', className)}>
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 to-blue-500 text-white px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-semibold">{t('ai.chat.title')}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-white hover:bg-white/10"
          onClick={() => {
            stop();
            onToggle();
          }}
        >
          <PanelRightClose className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="px-3 py-2 border-b shrink-0">
        <Tabs value={tab} onValueChange={(v) => setTab(v as SidebarTab)}>
          <TabsList className="grid w-full grid-cols-4 h-9">
            <TabsTrigger value="chat" className="gap-1 text-xs px-1">
              <MessageSquare className="h-3 w-3" />
              <span className="hidden sm:inline">{t('ai.chat.tabs.chat')}</span>
            </TabsTrigger>
            <TabsTrigger value="analysis" className="gap-1 text-xs px-1">
              <Calculator className="h-3 w-3" />
              <span className="hidden sm:inline">{t('ai.chat.tabs.analysis', { defaultValue: 'Analyze' })}</span>
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="gap-1 text-xs px-1">
              <Lightbulb className="h-3 w-3" />
              <span className="hidden sm:inline">{t('ai.chat.tabs.suggestions')}</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1 text-xs px-1">
              <History className="h-3 w-3" />
              <span className="hidden sm:inline">{t('ai.chat.tabs.history')}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'chat' && (
          <ScrollArea className="h-full">
            <div ref={scrollRef} className="p-3 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <Sparkles className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    {t('ai.chat.inputPlaceholder')}
                  </p>
                  {selectedText && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {t('ai.chat.selectedText', { defaultValue: 'Selection available for context' })}
                    </p>
                  )}
                </div>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    'group rounded-lg border p-3 text-sm',
                    m.role === 'user'
                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900'
                      : 'bg-muted/30'
                  )}
                >
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                  {m.role === 'assistant' && (
                    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleCopy(m.id, m.content)}
                      >
                        {copiedId === m.id ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                      {onInsertText && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => handleInsert(m.content)}
                        >
                          {t('ai.chat.insert', { defaultValue: 'Insert' })}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {isStreaming && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t('ai.chat.thinking', { defaultValue: 'Thinking...' })}</span>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {tab === 'analysis' && (
          <ScrollArea className="h-full">
            <div className="p-3">
              <LatexEquationAnalysis onInsert={onInsertText} />
            </div>
          </ScrollArea>
        )}

        {tab === 'suggestions' && (
          <ScrollArea className="h-full">
            <div className="p-3 text-sm text-muted-foreground">
              <div className="font-medium text-foreground mb-3">{t('ai.features')}</div>
              <div className="space-y-2">
                <div className="rounded-lg border p-3 bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer">
                  <div className="font-medium text-foreground text-xs mb-1">
                    {t('ai.writingAssistant.title', { defaultValue: 'Writing Assistant' })}
                  </div>
                  {t('ai.writingAssistant.description')}
                </div>
                <div className="rounded-lg border p-3 bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer">
                  <div className="font-medium text-foreground text-xs mb-1">
                    {t('ai.equationGenerator.title', { defaultValue: 'Equation Generator' })}
                  </div>
                  {t('ai.equationGenerator.description')}
                </div>
                <div className="rounded-lg border p-3 bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer">
                  <div className="font-medium text-foreground text-xs mb-1">
                    {t('ai.translation.title', { defaultValue: 'Translation' })}
                  </div>
                  {t('ai.translation.description')}
                </div>
              </div>
            </div>
          </ScrollArea>
        )}

        {tab === 'history' && (
          <ScrollArea className="h-full">
            <div className="p-3">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">{t('noHistory')}</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground">
                      {messages.length} {t('ai.chat.messages', { defaultValue: 'messages' })}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-destructive hover:text-destructive"
                      onClick={handleClearHistory}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      {t('ai.chat.clear', { defaultValue: 'Clear' })}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {messages
                      .filter((m) => m.role === 'assistant')
                      .slice(-20)
                      .reverse()
                      .map((m) => (
                        <div
                          key={m.id}
                          className="rounded-lg border p-2 text-xs text-muted-foreground line-clamp-3 hover:bg-muted/20 cursor-pointer"
                          onClick={() => handleCopy(m.id, m.content)}
                        >
                          {m.content}
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Input Area */}
      <Separator />
      <div className="p-3 shrink-0">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('ai.chat.inputPlaceholder')}
            className="min-h-[40px] max-h-[120px] resize-none"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            className="bg-gradient-to-br from-violet-600 to-blue-500 shrink-0"
            onClick={() => void handleSend()}
            disabled={isStreaming || !input.trim()}
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default LatexAIPanel;
