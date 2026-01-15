"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Sparkles, MessageCircle, Settings, X, RotateCcw } from "lucide-react";
import { isTauri } from "@/lib/native/utils";

const STORAGE_KEY = "cognia-assistant-bubble";

type StoredBubblePosition = {
  x: number;
  y: number;
};

type BubbleState = {
  isLoading: boolean;
  unreadCount: number;
  isChatVisible: boolean;
};

// Track if we're near the top of the screen to flip menu/tooltip position
type MenuPosition = 'above' | 'below';

export default function AssistantBubblePage() {
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const didDragRef = useRef(false);
  const lastClickTimeRef = useRef<number>(0);
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

  // Restore last bubble position and keep it persisted + listen for state updates
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
      const { PhysicalPosition } = await import("@tauri-apps/api/dpi");
      const { listen } = await import("@tauri-apps/api/event");
      const appWindow = getCurrentWindow();

      // Restore position
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as StoredBubblePosition;
          if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
            await appWindow.setPosition(new PhysicalPosition(parsed.x, parsed.y));
          }
        }
      } catch {
        // ignore
      }

      // Persist on move with edge snapping (multi-monitor aware)
      unlistenMove = await appWindow.onMoved(async ({ payload }) => {
        try {
          const { invoke } = await import("@tauri-apps/api/core");
          
          // Get work area from Rust backend (properly handles multi-monitor)
          const workArea = await invoke<{
            width: number;
            height: number;
            x: number;
            y: number;
          }>("assistant_bubble_get_work_area");
          
          const bubbleSize = 56; // BUBBLE_SIZE from Rust
          const snapThreshold = 20; // Snap when within 20px of edge
          const edgePadding = 8; // Final padding from edge
          const menuHeight = 180; // Approximate height of context menu + tooltip

          let { x, y } = payload;

          // Calculate edges relative to the work area (handles multi-monitor offsets)
          const workLeft = workArea.x;
          const workRight = workArea.x + workArea.width;
          const workTop = workArea.y;
          const workBottom = workArea.y + workArea.height;

          // Snap to left edge
          if (x < workLeft + snapThreshold) {
            x = workLeft + edgePadding;
          }
          // Snap to right edge
          if (x > workRight - bubbleSize - snapThreshold) {
            x = workRight - bubbleSize - edgePadding;
          }
          // Snap to top edge
          if (y < workTop + snapThreshold) {
            y = workTop + edgePadding;
          }
          // Snap to bottom edge
          if (y > workBottom - bubbleSize - snapThreshold) {
            y = workBottom - bubbleSize - edgePadding;
          }

          // Apply snapped position if different
          if (x !== payload.x || y !== payload.y) {
            await appWindow.setPosition(new PhysicalPosition(x, y));
          }

          const next: StoredBubblePosition = { x, y };
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

          // Also sync to Rust backend
          await invoke("assistant_bubble_set_position", { x, y });
          
          // Determine menu position based on available space above
          // If bubble is near top of screen, show menu below
          const spaceAbove = y - workTop;
          if (spaceAbove < menuHeight) {
            setMenuPosition('below');
          } else {
            setMenuPosition('above');
          }
        } catch {
          // ignore
        }
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
    };
  }, []);

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
    if (!isTauri() || isDragging) {
      return;
    }

    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const appWindow = getCurrentWindow();
    didDragRef.current = true;
    setIsDragging(true);

    try {
      await appWindow.startDragging();
    } finally {
      setIsDragging(false);
    }
  }, [isDragging]);

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

    if (distance > 4) {
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
    <div className="assistant-bubble-window relative h-full w-full bg-transparent">
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
            <div>点击：{bubbleState.isChatVisible ? "隐藏" : "打开"}对话</div>
            <div className="text-muted-foreground text-[10px]">双击新建 | 右键菜单</div>
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
          "relative h-full w-full rounded-full bubble-breathe bubble-glow",
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
            {bubbleState.isChatVisible ? "隐藏对话" : "打开对话"}
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
            新对话
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
            设置
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
            隐藏气泡
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
