'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { isTauri } from '@/lib/native/utils';
import { useChatWidget } from '@/hooks/chat';
import { useChatWidgetStore } from '@/stores/chat';
import { useSettingsStore } from '@/stores';
import { getCurrentTimePeriod, DEFAULT_TIME_GREETINGS } from '@/types/settings/welcome';
import { Sparkles, Command } from 'lucide-react';
import { ChatWidgetHeader } from './chat-widget-header';
import { ChatWidgetMessages } from './chat-widget-messages';
import { ChatWidgetInput } from './chat-widget-input';
import { ChatWidgetSettings } from './chat-widget-settings';
import { ChatWidgetSuggestions } from './chat-widget-suggestions';
import { exportChatMessages } from '@/lib/chat-widget/constants';

interface ChatWidgetProps {
  className?: string;
}

export function ChatWidget({ className }: ChatWidgetProps) {
  const t = useTranslations('chatWidget');
  const containerRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const resetConfig = useChatWidgetStore((state) => state.resetConfig);
  const setFeedback = useChatWidgetStore((state) => state.setFeedback);
  const editMessage = useChatWidgetStore((state) => state.editMessage);

  // Settings for time-based greeting
  const language = useSettingsStore((state) => state.language);
  const userName = useSettingsStore((state) => state.welcomeSettings.userName);

  // Time-based greeting
  const greeting = useMemo(() => {
    const period = getCurrentTimePeriod();
    const localeKey = language === 'zh-CN' ? 'zh-CN' : 'en';
    const timeGreeting = DEFAULT_TIME_GREETINGS[period][localeKey];
    return userName ? `${timeGreeting}, ${userName}` : timeGreeting;
  }, [language, userName]);

  const {
    isVisible,
    isLoading,
    error,
    messages,
    inputValue,
    config,
    inputRef,
    hide,
    setInputValue,
    handleSubmit,
    handleKeyDown,
    clearMessages,
    newSession,
    updateConfig,
    setPinned,
    stop,
    regenerate,
    openMainWindow,
  } = useChatWidget();

  // Mark content as ready after initial render
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM is fully painted
    const rafId = requestAnimationFrame(() => {
      setContentReady(true);
    });
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Listen for bubble "open settings" event
  useEffect(() => {
    if (typeof window === 'undefined' || !isTauri()) return;

    let unlisten: (() => void) | undefined;

    const setup = async () => {
      const { listen } = await import('@tauri-apps/api/event');
      unlisten = await listen('chat-widget-open-settings', () => {
        setSettingsOpen(true);
      });
    };

    setup();

    return () => {
      unlisten?.();
    };
  }, []);

  // Handle window dragging
  useEffect(() => {
    if (typeof window === 'undefined' || !isTauri()) return;

    const handleMouseDown = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (e.button !== 0) return;

      if (target.closest('[data-no-drag],button,a,input,select,textarea,[role="button"]')) {
        return;
      }

      // Only start dragging if clicking on the header drag area
      if (target.closest('[data-tauri-drag-region]')) {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const appWindow = getCurrentWindow();
        await appWindow.startDragging();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  // Handle escape key to hide
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        hide();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isVisible, hide]);

  return (
    <div
      ref={containerRef}
      data-chat-widget-container
      data-content-ready={contentReady}
      className={cn(
        'flex flex-col h-screen w-full',
        'bg-gradient-to-b from-background via-background to-background/95',
        'overflow-hidden',
        'text-foreground',
        className
      )}
    >
      {/* Header with drag region */}
      <ChatWidgetHeader
        config={config}
        messages={messages}
        onClose={hide}
        onNewSession={newSession}
        onClearMessages={clearMessages}
        onTogglePin={() => setPinned(!config.pinned)}
        onSettings={() => setSettingsOpen(true)}
        onExpandToFull={() => openMainWindow(true)}
        onProviderChange={(provider) => updateConfig({ provider })}
        onModelChange={(model) => updateConfig({ model })}
        onExport={() => exportChatMessages(messages, t)}
      />

      {/* Welcome area - show when no messages */}
      {messages.length === 0 && !isLoading ? (
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Greeting section */}
          <div className="flex flex-col items-center justify-center px-4 pt-8 pb-4">
            <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 mb-3 shadow-sm">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-base font-semibold tracking-tight text-center">
              {greeting}
            </h2>
            <p className="text-xs text-muted-foreground mt-1 text-center max-w-[240px]">
              {t('messages.emptyDesc')}
            </p>
            <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground/60">
              <Command className="h-3 w-3" />
              <span>+</span>
              <span className="font-mono">Enter</span>
              <span className="ml-1">{t('input.sendMessage')}</span>
            </div>
          </div>

          {/* Suggestions below greeting */}
          <div className="mt-auto">
            <ChatWidgetSuggestions
              onSelect={(prompt) => {
                setInputValue(prompt);
                inputRef.current?.focus();
              }}
            />
          </div>
        </div>
      ) : (
        /* Messages area */
        <ChatWidgetMessages
          messages={messages}
          isLoading={isLoading}
          error={error}
          showTimestamps={config.showTimestamps}
          onRegenerate={regenerate}
          onFeedback={(messageId, feedback) => setFeedback(messageId, feedback)}
          onEdit={(messageId, newContent) => {
            editMessage(messageId, newContent);
            // Re-submit to get new response after editing
            handleSubmit();
          }}
          onContinue={() => {
            // Continue generation by sending a "continue" message
            setInputValue(t('continueGeneration'));
            handleSubmit();
          }}
        />
      )}

      {/* Input area */}
      <ChatWidgetInput
        ref={inputRef}
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        onStop={stop}
        isLoading={isLoading}
        disabled={isLoading}
      />

      {/* Settings panel */}
      <ChatWidgetSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        config={config}
        onUpdateConfig={updateConfig}
        onResetConfig={resetConfig}
      />
    </div>
  );
}
