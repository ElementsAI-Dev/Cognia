"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useChatWidget } from "@/hooks/use-chat-widget";
import { useChatWidgetStore } from "@/stores/chat";
import { ChatWidgetHeader } from "./chat-widget-header";
import { ChatWidgetMessages } from "./chat-widget-messages";
import { ChatWidgetInput } from "./chat-widget-input";
import { ChatWidgetSettings } from "./chat-widget-settings";

interface ChatWidgetProps {
  className?: string;
}

export function ChatWidget({ className }: ChatWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const resetConfig = useChatWidgetStore((state) => state.resetConfig);
  
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
  } = useChatWidget();

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
      className={cn(
        "flex flex-col h-screen w-full",
        "bg-background/95 backdrop-blur-xl",
        "border border-border/50 rounded-xl shadow-2xl",
        "overflow-hidden",
        className
      )}
    >
      {/* Header with drag region */}
      <ChatWidgetHeader
        config={config}
        onClose={hide}
        onNewSession={newSession}
        onClearMessages={clearMessages}
        onTogglePin={() => setPinned(!config.pinned)}
        onSettings={() => setSettingsOpen(true)}
      />

      {/* Messages area */}
      <ChatWidgetMessages
        messages={messages}
        isLoading={isLoading}
        error={error}
      />

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
