'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSettingsStore } from '@/stores/settings';
import { useAIChat } from '@/lib/ai/generation/use-ai-chat';
import type { ProviderName } from '@/types/provider';
import { Sparkles, PanelRightClose, MessageSquare, Lightbulb, History, Send } from 'lucide-react';

type SidebarTab = 'chat' | 'suggestions' | 'history';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
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

interface LatexAISidebarProps {
  open: boolean;
  onClose: () => void;
  className?: string;
}

export function LatexAISidebar({ open, onClose, className }: LatexAISidebarProps) {
  const t = useTranslations('latex');
  const [tab, setTab] = useState<SidebarTab>('chat');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

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

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text) return;

    setInput('');
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);

    const systemPrompt = 'You are an AI assistant helping with writing LaTeX documents. Be concise. When giving LaTeX, output plain LaTeX (no markdown fences) unless asked.';

    const historyForModel = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const result = await sendMessage({
      messages: historyForModel,
      systemPrompt,
      temperature: 0.7,
      maxTokens: 2000,
    });

    const assistantMsg: ChatMessage = { id: `a-${Date.now()}`, role: 'assistant', content: result };
    setMessages((prev) => [...prev, assistantMsg]);
  }, [input, messages, sendMessage]);

  if (!open) return null;

  return (
    <div
      className={cn(
        'fixed right-6 bottom-24 z-50',
        'w-80 h-[500px]',
        'rounded-xl border bg-background shadow-2xl',
        'overflow-hidden',
        className
      )}
    >
      <div className="bg-linear-to-br from-violet-600 to-blue-500 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <div className="text-sm font-semibold">{t('ai.chat.title')}</div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-white hover:bg-white/10"
          onClick={() => {
            stop();
            onClose();
          }}
        >
          <PanelRightClose className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-3 py-2 border-b">
        <Tabs value={tab} onValueChange={(v) => setTab(v as SidebarTab)}>
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="chat" className="gap-2 text-xs">
              <MessageSquare className="h-4 w-4" />
              {t('ai.chat.tabs.chat')}
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="gap-2 text-xs">
              <Lightbulb className="h-4 w-4" />
              {t('ai.chat.tabs.suggestions')}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 text-xs">
              <History className="h-4 w-4" />
              {t('ai.chat.tabs.history')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 min-h-0">
        {tab === 'chat' && (
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    'rounded-lg border p-2 text-sm whitespace-pre-wrap',
                    m.role === 'user'
                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900'
                      : 'bg-muted/30'
                  )}
                >
                  {m.content}
                </div>
              ))}
              {messages.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  {t('ai.chat.inputPlaceholder')}
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {tab === 'suggestions' && (
          <div className="p-3 text-sm text-muted-foreground">
            <div className="font-medium text-foreground mb-2">{t('ai.features')}</div>
            <div className="space-y-2">
              <div className="rounded-lg border p-3 bg-muted/20">
                {t('ai.writingAssistant.description')}
              </div>
              <div className="rounded-lg border p-3 bg-muted/20">
                {t('ai.equationGenerator.description')}
              </div>
              <div className="rounded-lg border p-3 bg-muted/20">
                {t('ai.translation.description')}
              </div>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="p-3">
            {messages.length === 0 ? (
              <div className="text-sm text-muted-foreground">{t('noHistory')}</div>
            ) : (
              <ScrollArea className="h-full">
                <div className="space-y-2">
                  {messages
                    .filter((m) => m.role === 'assistant')
                    .slice(-20)
                    .reverse()
                    .map((m) => (
                      <div key={m.id} className="rounded-lg border p-2 text-xs text-muted-foreground line-clamp-3">
                        {m.content}
                      </div>
                    ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </div>

      <Separator />

      <div className="p-3 flex items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('ai.chat.inputPlaceholder')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
        />
        <Button type="button" size="icon" className="bg-linear-to-br from-violet-600 to-blue-500" onClick={() => void handleSend()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default LatexAISidebar;
