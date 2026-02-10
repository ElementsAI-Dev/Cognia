"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from 'next-intl';
import { cn } from "@/lib/utils";
import { Sparkles, MessageCircle, Settings, X, RotateCcw } from "lucide-react";
import { isTauri } from "@/lib/native/utils";

// Drag detection threshold in pixels
const DRAG_THRESHOLD = 6;
// Safety timeout for startDragging() in case it gets stuck (ms)
const DRAG_SAFETY_TIMEOUT = 3000;
// Debounce delay for edge snapping after drag ends (ms)
const SNAP_DEBOUNCE_MS = 200;

type BubbleState = {
  isLoading: boolean;
  unreadCount: number;
  isChatVisible: boolean;
};

// Track if we're near the top of the screen to flip menu/tooltip position
type MenuPosition = 'above' | 'below';

export default function AssistantBubblePage() {
  const t = useTranslations('assistantBubble');
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const didDragRef = useRef(false);
  const isDraggingRef = useRef(false);
  const lastClickTimeRef = useRef<number>(0);
  const snapTimerRef = useRef<number | null>(null);
  const dragSafetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>('above');
  const [bubbleState, setBubbleState] = useState<BubbleState>({
    isLoading: false,
    unreadCount: 0,
    isChatVisible: false,
  });

  // Tooltip delay timer
  const tooltipTimerRef = useRef<number | null>(null);

  // Perform edge snapping after drag ends (debounced to avoid loops)
  const performEdgeSnap = useCallback(async () => {
    if (!isTauri()) return;
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const { PhysicalPosition } = await import("@tauri-apps/api/dpi");
      const { invoke } = await import("@tauri-apps/api/core");
      const appWindow = getCurrentWindow();

      const workArea = await invoke<{
        width: number;
        height: number;
        x: number;
        y: number;
        scaleFactor: number;
      }>("assistant_bubble_get_work_area");

      const pos = await appWindow.outerPosition();
      const bubbleSize = Math.round(64 * workArea.scaleFactor);
      const snapThreshold = 20;
      const edgePadding = 8;

      let { x, y } = pos;

      const workLeft = workArea.x;
      const workRight = workArea.x + workArea.width;
      const workTop = workArea.y;
      const workBottom = workArea.y + workArea.height;

      // Snap to edges
      if (x < workLeft + snapThreshold) x = workLeft + edgePadding;
      if (x > workRight - bubbleSize - snapThreshold) x = workRight - bubbleSize - edgePadding;
      if (y < workTop + snapThreshold) y = workTop + edgePadding;
      if (y > workBottom - bubbleSize - snapThreshold) y = workBottom - bubbleSize - edgePadding;

      // Clamp to ensure fully within work area
      x = Math.max(workLeft, Math.min(x, workRight - bubbleSize));
      y = Math.max(workTop, Math.min(y, workBottom - bubbleSize));

      if (x !== pos.x || y !== pos.y) {
        await appWindow.setPosition(new PhysicalPosition(x, y));
      }

      // Update menu position based on final position
      const menuHeight = 180;
      const spaceAbove = y - workTop;
      setMenuPosition(spaceAbove < menuHeight ? 'below' : 'above');

      // Persist config to disk after drag ends
      await invoke("assistant_bubble_save_config");
    } catch {
      // ignore
    }
  }, []);

  // Listen for events and set up move handler
  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    let unlistenMove: (() => void) | undefined;
    let unlistenLoading: (() => void) | undefined;
    let unlistenUnread: (() => void) | undefined;
    let unlistenChatVisible: (() => void) | undefined;
    let unlistenChatHidden: (() => void) | undefined;

    const setup = async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const { listen } = await import("@tauri-apps/api/event");
      const appWindow = getCurrentWindow();

      // onMoved: lightweight handler — no IPC during drag, debounced snap after
      unlistenMove = await appWindow.onMoved(({ payload }) => {
        // Skip heavy processing while actively dragging
        if (isDraggingRef.current) {
          return;
        }

        // Debounce edge snap: clear previous timer, set new one
        if (snapTimerRef.current) {
          window.clearTimeout(snapTimerRef.current);
        }
        snapTimerRef.current = window.setTimeout(() => {
          performEdgeSnap();
          snapTimerRef.current = null;
        }, SNAP_DEBOUNCE_MS);

        // Update menu position from payload (lightweight, no IPC)
        const menuHeight = 180;
        setMenuPosition(payload.y < menuHeight ? 'below' : 'above');
      });

      // Listen for loading state changes from chat widget
      unlistenLoading = await listen<boolean>("bubble-loading-state", (event) => {
        setBubbleState((prev) => ({ ...prev, isLoading: event.payload }));
      });

      // Listen for unread message count updates
      unlistenUnread = await listen<number>("bubble-unread-count", (event) => {
        setBubbleState((prev) => ({ ...prev, unreadCount: event.payload }));
      });

      // Listen for chat widget visibility
      unlistenChatVisible = await listen("chat-widget-shown", () => {
        setBubbleState((prev) => ({ ...prev, isChatVisible: true, unreadCount: 0 }));
      });

      unlistenChatHidden = await listen("chat-widget-hidden", () => {
        setBubbleState((prev) => ({ ...prev, isChatVisible: false }));
      });
    };

    setup();

    return () => {
      unlistenMove?.();
      unlistenLoading?.();
      unlistenUnread?.();
      unlistenChatVisible?.();
      unlistenChatHidden?.();
      if (snapTimerRef.current) {
        window.clearTimeout(snapTimerRef.current);
      }
    };
  }, [performEdgeSnap]);

  const handleClick = useCallback(async () => {
    if (!isTauri()) {
      return;
    }

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      
      // First ensure the chat widget window exists and sync state
      await invoke("chat_widget_sync_state");
      await invoke("chat_widget_recreate");
      
      // Now toggle visibility
      const visible = await invoke<boolean>("chat_widget_toggle");
      if (visible) {
        // Small delay to ensure window is fully shown before focusing
        setTimeout(async () => {
          try {
            await invoke("chat_widget_focus_input");
          } catch {
            // ignore focus errors
          }
        }, 100);
      }
    } catch (error) {
      console.error("[AssistantBubble] Failed to toggle chat widget:", error);
      // Try to recreate and show as fallback
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("chat_widget_show");
      } catch {
        // ignore fallback errors
      }
    }
  }, []);

  // Create new session (moved before onPointerUp to fix declaration order)
  const handleNewSession = useCallback(async () => {
    setShowContextMenu(false);
    if (!isTauri()) {
      return;
    }
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("chat_widget_show");
    const { emit } = await import("@tauri-apps/api/event");
    await emit("bubble-new-session");
    await invoke("chat_widget_focus_input");
  }, []);

  const startDrag = useCallback(async () => {
    if (!isTauri() || isDraggingRef.current) {
      return;
    }

    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const appWindow = getCurrentWindow();
    didDragRef.current = true;
    isDraggingRef.current = true;
    setIsDragging(true);

    // Safety timeout: if startDragging() promise never resolves (known Tauri bug on Windows),
    // force-reset the dragging state to prevent the button from being stuck.
    dragSafetyTimerRef.current = setTimeout(() => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
        // Perform snap + save after forced reset
        performEdgeSnap();
      }
      dragSafetyTimerRef.current = null;
    }, DRAG_SAFETY_TIMEOUT);

    try {
      await appWindow.startDragging();
    } finally {
      // Clear safety timer since promise resolved normally
      if (dragSafetyTimerRef.current) {
        clearTimeout(dragSafetyTimerRef.current);
        dragSafetyTimerRef.current = null;
      }
      isDraggingRef.current = false;
      setIsDragging(false);

      // Edge snap + persist config after drag ends
      performEdgeSnap();
    }
  }, [performEdgeSnap]);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    didDragRef.current = false;
    setIsPressed(true);
    setShowContextMenu(false);
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  }, []);

  const onPointerUp = useCallback(() => {
    setIsPressed(false);
    pointerStartRef.current = null;

    if (!didDragRef.current) {
      const now = Date.now();
      const timeSinceLastClick = now - lastClickTimeRef.current;
      lastClickTimeRef.current = now;

      // Double-click detection (within 300ms)
      if (timeSinceLastClick < 300) {
        // Double-click: create new session
        handleNewSession();
      } else {
        // Single-click: toggle chat widget
        handleClick();
      }
    }
  }, [handleClick, handleNewSession]);

  const onPointerLeave = useCallback(() => {
    setIsPressed(false);
    setIsHovered(false);
    setShowTooltip(false);
    pointerStartRef.current = null;
    if (tooltipTimerRef.current) {
      window.clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (!isPressed || isDragging || !pointerStartRef.current) {
      return;
    }

    const deltaX = event.clientX - pointerStartRef.current.x;
    const deltaY = event.clientY - pointerStartRef.current.y;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance > DRAG_THRESHOLD) {
      startDrag().catch(() => {
        // ignore
      });
    }
  }, [isPressed, isDragging, startDrag]);

  // Show tooltip after hover delay
  const onPointerEnterHandler = useCallback(() => {
    setIsHovered(true);
    setShowTooltip(false);
    
    // Show tooltip after 800ms hover
    tooltipTimerRef.current = window.setTimeout(() => {
      setShowTooltip(true);
    }, 800);
  }, []);

  // Right-click context menu
  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setShowContextMenu((prev) => !prev);
  }, []);

  const handleOpenSettings = useCallback(async () => {
    setShowContextMenu(false);
    if (!isTauri()) {
      return;
    }
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("chat_widget_show");
    const { emit } = await import("@tauri-apps/api/event");
    await emit("bubble-open-settings");
  }, []);

  const handleHideBubble = useCallback(async () => {
    setShowContextMenu(false);
    if (!isTauri()) {
      return;
    }
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const appWindow = getCurrentWindow();
    await appWindow.hide();
  }, []);

  return (
    <div className="assistant-bubble-window relative bg-transparent" style={{ width: 64, height: 64 }}>
      {/* Tooltip */}
      {showTooltip && !showContextMenu && (
        <div
          className={cn(
            "absolute left-1/2 -translate-x-1/2",
            menuPosition === 'above' ? "bottom-full mb-2" : "top-full mt-2",
            "px-2 py-1 text-xs font-medium",
            "bg-popover text-popover-foreground border border-border rounded-md shadow-md",
            "whitespace-nowrap",
            "animate-in fade-in-0 zoom-in-95 duration-150"
          )}
        >
          <div className="text-center">
            <div>{t('tooltip.clickAction', { action: bubbleState.isChatVisible ? t('tooltip.hide') : t('tooltip.open') })}</div>
            <div className="text-muted-foreground text-[10px]">{t('tooltip.hints')}</div>
          </div>
          {/* Tooltip arrow */}
          <div className={cn(
            "absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-popover border-border rotate-45",
            menuPosition === 'above' ? "-bottom-1 border-r border-b" : "-top-1 border-l border-t"
          )} />
        </div>
      )}

      {/* Main Bubble Button */}
      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerEnter={onPointerEnterHandler}
        onPointerLeave={onPointerLeave}
        onContextMenu={onContextMenu}
        className={cn(
          "relative rounded-full bubble-breathe bubble-glow",
          "flex items-center justify-center",
          "transition-all duration-300 ease-out",
          // Gradient background
          "bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600",
          // Shadow effects
          "shadow-lg shadow-purple-500/30",
          // Hover effects
          isHovered && !isDragging && "shadow-xl shadow-purple-500/50 scale-105",
          // Pressed effects
          isPressed && !isDragging && "scale-95 shadow-md",
          // Dragging effects
          isDragging && "scale-110 shadow-2xl shadow-purple-500/60 cursor-grabbing opacity-90",
          // Glow effect when chat is visible
          bubbleState.isChatVisible && "ring-2 ring-purple-400/50 ring-offset-2 ring-offset-transparent"
        )}
        style={{ width: 56, height: 56 }}
        aria-label="Open Cognia Assistant"
      >
        {/* Breathing animation overlay - only when idle */}
        {!bubbleState.isLoading && !isDragging && (
          <div
            className={cn(
              "absolute inset-0 rounded-full",
              "bg-gradient-to-br from-white/20 to-transparent",
              "animate-pulse"
            )}
          />
        )}

        {/* Loading spinner overlay - improved */}
        {bubbleState.isLoading && (
          <div className="absolute inset-0 rounded-full">
            {/* Outer rotating ring */}
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white/70 border-r-white/30 animate-spin" />
            {/* Inner pulsing glow */}
            <div className="absolute inset-1 rounded-full bg-white/10 animate-pulse" />
          </div>
        )}

        {/* Chat visible indicator - subtle glow pulse */}
        {bubbleState.isChatVisible && !bubbleState.isLoading && (
          <div className="absolute inset-0 rounded-full">
            <div className="absolute inset-0 rounded-full bg-purple-400/20 animate-pulse" />
          </div>
        )}

        {/* Icon */}
        <Sparkles
          className={cn(
            "h-6 w-6 text-white drop-shadow-md bubble-sparkle",
            "transition-transform duration-300",
            isHovered && !isDragging && "scale-110 rotate-12",
            isDragging && "scale-90",
            bubbleState.isLoading && "animate-pulse opacity-80"
          )}
        />

        {/* Unread count badge */}
        {bubbleState.unreadCount > 0 && (
          <div
            className={cn(
              "absolute -top-1 -right-1",
              "min-w-[18px] h-[18px] px-1",
              "flex items-center justify-center",
              "bg-red-500 text-white text-[10px] font-bold",
              "rounded-full",
              "shadow-md shadow-red-500/50",
              "animate-bounce"
            )}
          >
            {bubbleState.unreadCount > 9 ? "9+" : bubbleState.unreadCount}
          </div>
        )}
      </button>

      {/* Context Menu */}
      {showContextMenu && (
        <div
          className={cn(
            "absolute left-1/2 -translate-x-1/2",
            menuPosition === 'above' ? "bottom-full mb-2" : "top-full mt-2",
            "w-40 py-1",
            "bg-popover border border-border rounded-lg shadow-xl",
            "animate-in fade-in-0 zoom-in-95 duration-150"
          )}
        >
          <button
            type="button"
            onClick={handleClick}
            className={cn(
              "w-full px-3 py-2 text-left text-sm",
              "flex items-center gap-2",
              "hover:bg-accent transition-colors"
            )}
          >
            <MessageCircle className="h-4 w-4" />
            {bubbleState.isChatVisible ? t('menu.hideChat') : t('menu.openChat')}
          </button>
          <button
            type="button"
            onClick={handleNewSession}
            className={cn(
              "w-full px-3 py-2 text-left text-sm",
              "flex items-center gap-2",
              "hover:bg-accent transition-colors"
            )}
          >
            <RotateCcw className="h-4 w-4" />
            {t('menu.newSession')}
          </button>
          <button
            type="button"
            onClick={handleOpenSettings}
            className={cn(
              "w-full px-3 py-2 text-left text-sm",
              "flex items-center gap-2",
              "hover:bg-accent transition-colors"
            )}
          >
            <Settings className="h-4 w-4" />
            {t('menu.settings')}
          </button>
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            onClick={handleHideBubble}
            className={cn(
              "w-full px-3 py-2 text-left text-sm text-destructive",
              "flex items-center gap-2",
              "hover:bg-destructive/10 transition-colors"
            )}
          >
            <X className="h-4 w-4" />
            {t('menu.hideBubble')}
          </button>
        </div>
      )}

      {/* Click outside to close context menu */}
      {showContextMenu && (
        <div
          className="fixed inset-0 -z-10"
          onClick={() => setShowContextMenu(false)}
        />
      )}
    </div>
  );
}
