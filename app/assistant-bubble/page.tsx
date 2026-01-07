"use client";

import { useCallback, useEffect, useRef } from "react";

const STORAGE_KEY = "cognia-assistant-bubble";

type StoredBubblePosition = {
  x: number;
  y: number;
};

export default function AssistantBubblePage() {
  const pressTimerRef = useRef<number | null>(null);
  const didDragRef = useRef(false);

  // Restore last bubble position and keep it persisted.
  useEffect(() => {
    if (typeof window === "undefined" || !(window as typeof window & { __TAURI__?: unknown }).__TAURI__) {
      return;
    }

    let unlistenMove: (() => void) | undefined;

    const setup = async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const { PhysicalPosition } = await import("@tauri-apps/api/dpi");
      const appWindow = getCurrentWindow();

      // Restore
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

      // Persist on move
      unlistenMove = await appWindow.onMoved(({ payload }) => {
        try {
          const next: StoredBubblePosition = { x: payload.x, y: payload.y };
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
      });
    };

    setup();

    return () => {
      unlistenMove?.();
    };
  }, []);

  const handleClick = useCallback(async () => {
    if (typeof window === "undefined" || !(window as typeof window & { __TAURI__?: unknown }).__TAURI__) {
      return;
    }

    const { invoke } = await import("@tauri-apps/api/core");
    const visible = await invoke<boolean>("chat_widget_toggle");
    if (visible) {
      await invoke("chat_widget_focus_input");
    }
  }, []);

  const startDrag = useCallback(async () => {
    if (typeof window === "undefined" || !(window as typeof window & { __TAURI__?: unknown }).__TAURI__) {
      return;
    }
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const appWindow = getCurrentWindow();
    didDragRef.current = true;
    await appWindow.startDragging();
  }, []);

  const onPointerDown = useCallback(() => {
    didDragRef.current = false;

    // Long-press to drag (prevents accidental toggle when user wants to move it)
    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }

    pressTimerRef.current = window.setTimeout(() => {
      startDrag().catch(() => {
        // ignore
      });
    }, 140);
  }, [startDrag]);

  const onPointerUp = useCallback(() => {
    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }

    if (!didDragRef.current) {
      handleClick();
    }
  }, [handleClick]);

  const onPointerLeave = useCallback(() => {
    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  return (
    <div className="h-full w-full bg-transparent">
      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        className="h-full w-full rounded-full border border-border bg-background text-foreground text-sm font-medium"
        aria-label="Open Cognia Assistant"
      >
        AI
      </button>
    </div>
  );
}
