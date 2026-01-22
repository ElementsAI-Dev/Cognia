"use client";

import { useEffect, useState, useCallback } from "react";
import { SelectionToolbar } from "@/components/selection-toolbar";
import { useSelectionStore } from "@/stores/context";
import { isTauri } from "@/lib/native/utils";

/**
 * Standalone Selection Toolbar wrapper for the dedicated Tauri window.
 * 
 * This component handles the standalone window context where:
 * 1. The toolbar should ALWAYS render (visibility is controlled by Tauri window, not React)
 * 2. Events from the Rust backend update the toolbar state
 * 3. The window is shown/hidden by native code, not by React conditionals
 */
export function StandaloneSelectionToolbar() {
  const [isReady, setIsReady] = useState(false);
  const { showToolbar, hideToolbar } = useSelectionStore();

  // Initialize and listen for selection events
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let unlistenShow: (() => void) | undefined;
    let unlistenHide: (() => void) | undefined;

    const setupListeners = async () => {
      // Check if we're in Tauri environment
      if (!isTauri()) {
        console.warn("[StandaloneToolbar] Not in Tauri environment");
        setIsReady(true);
        return;
      }

      try {
        const [{ listen }, { invoke }] = await Promise.all([
          import("@tauri-apps/api/event"),
          import("@tauri-apps/api/core"),
        ]);
        
        // Listen for show events with selection data
        unlistenShow = await listen<{ text: string; x: number; y: number; textLength?: number }>(
          "selection-toolbar-show",
          (event) => {
            console.debug("[StandaloneToolbar] Received show event:", event.payload);
            // Update the store with selection data
            showToolbar(event.payload.text, event.payload.x, event.payload.y);
          }
        );

        // Listen for hide events
        unlistenHide = await listen("selection-toolbar-hide", () => {
          console.debug("[StandaloneToolbar] Received hide event");
          hideToolbar();
        });

        console.debug("[StandaloneToolbar] Event listeners set up successfully");
        
        // Check if there's already a selection state (in case event was missed during load)
        try {
          const currentState = await invoke<{ text: string; x: number; y: number } | null>("selection_get_toolbar_state");
          if (currentState) {
            console.debug("[StandaloneToolbar] Found existing state on init:", currentState);
            showToolbar(currentState.text, currentState.x, currentState.y);
          }
        } catch (e) {
          console.debug("[StandaloneToolbar] No existing state or failed to get state:", e);
        }
        
        setIsReady(true);
      } catch (error) {
        console.error("[StandaloneToolbar] Failed to set up event listeners:", error);
        setIsReady(true);
      }
    };

    setupListeners();

    return () => {
      unlistenShow?.();
      unlistenHide?.();
    };
  }, [showToolbar, hideToolbar]);

  // Handle hover state to prevent auto-hide
  const handleMouseEnter = useCallback(async () => {
    if (isTauri()) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("selection_set_toolbar_hovered", { hovered: true });
      } catch (e) {
        console.error("[StandaloneToolbar] Failed to set hovered state:", e);
      }
    }
  }, []);

  const handleMouseLeave = useCallback(async () => {
    if (isTauri()) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("selection_set_toolbar_hovered", { hovered: false });
      } catch (e) {
        console.error("[StandaloneToolbar] Failed to clear hovered state:", e);
      }
    }
  }, []);

  // Show loading state while initializing
  if (!isReady) {
    return (
      <div className="flex items-center justify-center p-4 text-white/50 text-sm">
        Loading...
      </div>
    );
  }

  // Always render the toolbar in standalone mode
  // The window visibility is controlled by Tauri, not by React
  return (
    <div 
      className="w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <SelectionToolbar standaloneMode />
    </div>
  );
}
