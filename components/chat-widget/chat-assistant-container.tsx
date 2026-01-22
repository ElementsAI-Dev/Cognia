"use client";

/**
 * Chat Assistant Container
 * Main container that combines the FAB button and chat panel
 * Handles state management and positioning logic
 * 
 * Only displays in Tauri desktop mode (not in web browser)
 * Does NOT display in chat-widget or selection-toolbar windows
 */

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { useChatWidgetStore } from "@/stores/chat";
import { ChatAssistantFab } from "./chat-assistant-fab";
import { ChatAssistantPanel } from "./chat-assistant-panel";
import { useFloatingPosition, useDraggableFab, type FabPosition } from "@/hooks/chat";
import { isTauri as detectTauri } from "@/lib/native/utils";

interface ChatAssistantContainerProps {
  defaultPosition?: FabPosition;
  defaultOpen?: boolean;
  panelWidth?: number;
  panelHeight?: number;
  disabled?: boolean;
  draggable?: boolean;
  /** Only show in Tauri desktop mode (default: true) */
  tauriOnly?: boolean;
}

export function ChatAssistantContainer({
  defaultPosition = "bottom-right",
  defaultOpen = false,
  panelWidth = 400,
  panelHeight = 560,
  disabled = false,
  draggable = true,
  tauriOnly = true,
}: ChatAssistantContainerProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [mounted, setMounted] = useState(false);
  const [isTauri, setIsTauri] = useState(false);
  
  // Check environment after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    
    // Check if running in Tauri
    const checkTauri = () => {
      const hasTauri = detectTauri();
      console.log("[ChatAssistantContainer] Tauri check:", { hasTauri, pathname: window.location.pathname });
      setIsTauri(hasTauri);
    };
    
    // Check immediately
    checkTauri();
    
    // Also check after a small delay in case Tauri injects later
    const timer = setTimeout(checkTauri, 100);
    return () => clearTimeout(timer);
  }, []);
  
  // Determine if should render based on environment
  const shouldRender = (() => {
    if (!mounted) return false;
    
    // Don't render in chat-widget or selection-toolbar windows
    if (typeof window !== "undefined") {
      const pathname = window.location.pathname;
      if (pathname === "/chat-widget" || pathname === "/selection-toolbar") {
        return false;
      }
    }
    
    // If tauriOnly is true, only render in Tauri environment
    if (tauriOnly) {
      return isTauri;
    }
    
    return true;
  })();
  
  // Use draggable FAB hook for position management
  const {
    position: fabPosition,
    offset: dragOffset,
    isDragging,
    handleDragStart,
  } = useDraggableFab({
    initialPosition: defaultPosition,
    snapToCorner: true,
  });
  
  // Get loading state and messages from store
  const isLoading = useChatWidgetStore((state) => state.isLoading);
  const messages = useChatWidgetStore((state) => state.messages);
  const config = useChatWidgetStore((state) => state.config);
  
  // Use floating position hook for adaptive positioning
  const {
    expandDirection,
    fabOffset,
  } = useFloatingPosition({
    fabPosition,
    panelWidth,
    panelHeight,
  });

  // Calculate unread count (messages since last close)
  const [lastSeenCount, setLastSeenCount] = useState(messages.length);
  const unreadCount = isOpen ? 0 : Math.max(0, messages.length - lastSeenCount);

  // Update last seen count when closing
  useEffect(() => {
    if (!isOpen) {
      // Give a slight delay to allow animation to complete
      const timer = setTimeout(() => {
        setLastSeenCount(messages.length);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, messages.length]);

  // Handle toggle
  const handleToggle = useCallback(() => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
  }, [disabled]);

  // Handle close
  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Listen for selection toolbar "send to chat" event
  useEffect(() => {
    if (typeof window === "undefined" || !isTauri) return;

    let unlisten: (() => void) | undefined;

    const setupListeners = async () => {
      const { listen } = await import("@tauri-apps/api/event");
      unlisten = await listen<{ text: string }>("selection-send-to-chat", (event) => {
        const { text } = event.payload;
        if (text) {
          // Open the panel and set the input
          setIsOpen(true);
          useChatWidgetStore.getState().setInputValue(text);
        }
      });
    };

    void setupListeners();

    return () => {
      unlisten?.();
    };
  }, [isTauri]);

  // Listen for global keyboard shortcut
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for the configured shortcut (default: Ctrl+Shift+Space)
      const shortcut = config.shortcut || "CommandOrControl+Shift+Space";
      const parts = shortcut.toLowerCase().split("+");
      
      const needsCtrl = parts.includes("control") || parts.includes("commandorcontrol");
      const needsShift = parts.includes("shift");
      const needsAlt = parts.includes("alt");
      const key = parts[parts.length - 1];

      const ctrlPressed = e.ctrlKey || e.metaKey;
      const shiftPressed = e.shiftKey;
      const altPressed = e.altKey;

      if (
        needsCtrl === ctrlPressed &&
        needsShift === shiftPressed &&
        needsAlt === altPressed &&
        e.key.toLowerCase() === key
      ) {
        e.preventDefault();
        handleToggle();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [config.shortcut, handleToggle]);

  // Debug log render decision
  useEffect(() => {
    console.log("[ChatAssistantContainer] Render decision:", { mounted, isTauri, tauriOnly, shouldRender, disabled });
  }, [mounted, isTauri, tauriOnly, shouldRender, disabled]);

  // Don't render if conditions not met
  if (!shouldRender || disabled) {
    return null;
  }

  return (
    <>
      {/* Floating Action Button */}
      <ChatAssistantFab
        isOpen={isOpen}
        onClick={isDragging ? undefined : handleToggle}
        position={fabPosition}
        offset={draggable ? dragOffset : fabOffset}
        unreadCount={unreadCount}
        isLoading={isLoading && !isOpen}
        showTooltip={!isOpen && !isDragging}
        onMouseDown={draggable ? handleDragStart : undefined}
        onTouchStart={draggable ? handleDragStart : undefined}
        data-chat-fab
      />

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <ChatAssistantPanel
            isOpen={isOpen}
            onClose={handleClose}
            fabPosition={fabPosition}
            expandDirection={expandDirection}
            width={panelWidth}
            height={panelHeight}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default ChatAssistantContainer;
