"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useChatWidget } from "@/hooks/chat";
import { useChatWidgetStore } from "@/stores/chat";
import { ChatWidgetHeader } from "./chat-widget-header";
import { ChatWidgetMessages } from "./chat-widget-messages";
import { ChatWidgetInput } from "./chat-widget-input";
import { ChatWidgetSettings } from "./chat-widget-settings";
import { ChatWidgetSuggestions } from "./chat-widget-suggestions";

interface ChatWidgetProps {
  className?: string;
}

export function ChatWidget({ className }: ChatWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const resetConfig = useChatWidgetStore((state) => state.resetConfig);
  const setFeedback = useChatWidgetStore((state) => state.setFeedback);
  const editMessage = useChatWidgetStore((state) => state.editMessage);
  
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
    if (typeof window === "undefined" || !window.__TAURI__) return;

    let unlisten: (() => void) | undefined;

    const setup = async () => {
      const { listen } = await import("@tauri-apps/api/event");
      unlisten = await listen("chat-widget-open-settings", () => {
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
    if (typeof window === "undefined" || !window.__TAURI__) return;

    const handleMouseDown = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Only start dragging if clicking on the header drag area
      if (target.closest("[data-tauri-drag-region]")) {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const appWindow = getCurrentWindow();
        await appWindow.startDragging();
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  // Handle escape key to hide
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isVisible) {
        hide();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isVisible, hide]);

  return (
    <div
      ref={containerRef}
      data-chat-widget-container
      data-content-ready={contentReady}
      className={cn(
        "flex flex-col h-screen w-full",
        // Use solid opaque background to ensure content visibility
        // Avoid backdrop-blur which can cause transparency issues on some platforms
        "bg-background",
        // No border/rounded corners to prevent gap at window edges
        "overflow-hidden",
        // Ensure text and content are always visible with proper contrast
        "text-foreground",
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
        onExport={() => {
          const content = messages
            .map((m) => `${m.role === "user" ? "👤 用户" : "🤖 助手"}:\n${m.content}`)
            .join("\n\n---\n\n");
          const blob = new Blob([content], { type: "text/markdown" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `chat-export-${new Date().toISOString().slice(0, 10)}.md`;
          a.click();
          URL.revokeObjectURL(url);
        }}
      />

      {/* Messages area */}
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
          setInputValue("请继续");
          handleSubmit();
        }}
      />

      {/* Quick suggestions - show when empty */}
      {messages.length === 0 && !isLoading && (
        <ChatWidgetSuggestions
          onSelect={(prompt) => {
            setInputValue(prompt);
            inputRef.current?.focus();
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
