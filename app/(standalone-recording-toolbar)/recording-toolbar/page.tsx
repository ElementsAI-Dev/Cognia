"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Pause, Play, Square, Minimize2, Maximize2, GripHorizontal } from "lucide-react";
import { isTauri } from "@/lib/native/utils";

type ToolbarState = {
  isRecording: boolean;
  isPaused: boolean;
  durationMs: number;
  formattedDuration: string;
};

type SnapEdge = "top" | "bottom" | "left" | "right" | "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

export default function RecordingToolbarPage() {
  const [toolbarState, setToolbarState] = useState<ToolbarState>({
    isRecording: false,
    isPaused: false,
    durationMs: 0,
    formattedDuration: "00:00",
  });
  const [isCompact, setIsCompact] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [snappedEdge, setSnappedEdge] = useState<SnapEdge | null>(null);
  
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const pausedDurationRef = useRef<number>(0);

  // Format duration to MM:SS or HH:MM:SS
  const formatDuration = useCallback((ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  // Start timer
  const startTimer = useCallback(() => {
    if (timerIntervalRef.current) return;

    recordingStartTimeRef.current = Date.now() - pausedDurationRef.current;
    
    timerIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - (recordingStartTimeRef.current || Date.now());
      setToolbarState((prev) => ({
        ...prev,
        durationMs: elapsed,
        formattedDuration: formatDuration(elapsed),
      }));
    }, 100);
  }, [formatDuration]);

  // Stop timer
  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // Pause timer
  const pauseTimer = useCallback(() => {
    stopTimer();
    pausedDurationRef.current = toolbarState.durationMs;
  }, [stopTimer, toolbarState.durationMs]);

  // Reset timer
  const resetTimer = useCallback(() => {
    stopTimer();
    pausedDurationRef.current = 0;
    recordingStartTimeRef.current = null;
    setToolbarState((prev) => ({
      ...prev,
      durationMs: 0,
      formattedDuration: "00:00",
    }));
  }, [stopTimer]);

  // Listen for state updates from backend
  useEffect(() => {
    if (!isTauri()) return;

    let unlistenStateUpdated: (() => void) | undefined;
    let unlistenSnapped: (() => void) | undefined;
    let unlistenCompactToggled: (() => void) | undefined;

    const setup = async () => {
      const { listen } = await import("@tauri-apps/api/event");

      unlistenStateUpdated = await listen<{
        isRecording: boolean;
        isPaused: boolean;
        durationMs: number;
        formattedDuration: string;
      }>("recording-toolbar://state-updated", (event) => {
        const { isRecording, isPaused, durationMs, formattedDuration } = event.payload;
        setToolbarState({ isRecording, isPaused, durationMs, formattedDuration });

        // Manage timer based on state
        if (isRecording && !isPaused) {
          pausedDurationRef.current = durationMs;
          startTimer();
        } else if (isPaused) {
          pauseTimer();
        } else {
          resetTimer();
        }
      });

      unlistenSnapped = await listen<{ edge: SnapEdge }>("recording-toolbar://snapped", (event) => {
        setSnappedEdge(event.payload.edge);
      });

      unlistenCompactToggled = await listen<boolean>("recording-toolbar://compact-toggled", (event) => {
        setIsCompact(event.payload);
      });

      // Notify backend that we're hovered for auto-hide logic
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("recording_toolbar_set_hovered", { hovered: isHovered });
    };

    setup();

    return () => {
      unlistenStateUpdated?.();
      unlistenSnapped?.();
      unlistenCompactToggled?.();
      stopTimer();
    };
  }, [startTimer, pauseTimer, resetTimer, stopTimer, isHovered]);

  // Handle pause/resume
  const handlePauseResume = useCallback(async () => {
    if (!isTauri()) return;

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      
      if (toolbarState.isPaused) {
        await invoke("recording_resume");
      } else {
        await invoke("recording_pause");
      }
    } catch (error) {
      console.error("[RecordingToolbar] Failed to pause/resume:", error);
    }
  }, [toolbarState.isPaused]);

  // Handle stop recording
  const handleStop = useCallback(async () => {
    if (!isTauri()) return;

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("recording_stop");
      resetTimer();
    } catch (error) {
      console.error("[RecordingToolbar] Failed to stop recording:", error);
    }
  }, [resetTimer]);

  // Handle compact mode toggle
  const handleToggleCompact = useCallback(async () => {
    if (!isTauri()) return;

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const newCompact = await invoke<boolean>("recording_toolbar_toggle_compact");
      setIsCompact(newCompact);
    } catch (error) {
      console.error("[RecordingToolbar] Failed to toggle compact:", error);
    }
  }, []);

  // Dragging logic
  const startDrag = useCallback(async () => {
    if (!isTauri() || isDragging) return;

    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const appWindow = getCurrentWindow();
    setIsDragging(true);

    try {
      await appWindow.startDragging();
    } finally {
      setIsDragging(false);
    }
  }, [isDragging]);

  const onPointerDown = useCallback((event: React.PointerEvent) => {
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent) => {
    if (!pointerStartRef.current || isDragging) return;

    const deltaX = event.clientX - pointerStartRef.current.x;
    const deltaY = event.clientY - pointerStartRef.current.y;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance > 4) {
      startDrag();
    }
  }, [isDragging, startDrag]);

  const onPointerUp = useCallback(() => {
    pointerStartRef.current = null;
  }, []);

  // Hover handlers for auto-hide
  const onMouseEnter = useCallback(async () => {
    setIsHovered(true);
    if (!isTauri()) return;
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("recording_toolbar_set_hovered", { hovered: true });
  }, []);

  const onMouseLeave = useCallback(async () => {
    setIsHovered(false);
    pointerStartRef.current = null;
    if (!isTauri()) return;
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("recording_toolbar_set_hovered", { hovered: false });
  }, []);

  // Compact mode view
  if (isCompact) {
    return (
      <div
        className="recording-toolbar-compact bg-transparent"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div
          className={cn(
            "flex items-center gap-1 px-2 py-1",
            "bg-background/95 backdrop-blur-sm border border-border rounded-full shadow-lg",
            "transition-all duration-200",
            isDragging && "opacity-80"
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {/* Recording indicator */}
          <div className={cn(
            "w-2 h-2 rounded-full",
            toolbarState.isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"
          )} />

          {/* Timer */}
          <span className="text-xs font-mono font-medium tabular-nums min-w-[40px]">
            {toolbarState.formattedDuration}
          </span>

          {/* Expand button */}
          <button
            type="button"
            onClick={handleToggleCompact}
            className="p-0.5 hover:bg-accent rounded-full transition-colors"
            aria-label="Expand toolbar"
          >
            <Maximize2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  // Full mode view
  return (
    <div
      className="recording-toolbar bg-transparent"
      style={{ width: 320, height: 56 }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className={cn(
          "flex items-center justify-between h-full px-3",
          "bg-background/95 backdrop-blur-sm border border-border rounded-xl shadow-xl",
          "transition-all duration-200",
          isDragging && "opacity-80 scale-[1.02]",
          snappedEdge && "ring-2 ring-primary/20"
        )}
      >
        {/* Drag handle + Recording indicator */}
        <div
          className="flex items-center gap-2 cursor-grab active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <GripHorizontal className="h-4 w-4 text-muted-foreground" />
          
          {/* Recording dot */}
          <div className={cn(
            "w-3 h-3 rounded-full",
            toolbarState.isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"
          )} />
        </div>

        {/* Timer display */}
        <div className="flex-1 text-center">
          <span className={cn(
            "text-lg font-mono font-semibold tabular-nums",
            toolbarState.isPaused && "text-yellow-500"
          )}>
            {toolbarState.formattedDuration}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          {/* Pause/Resume button */}
          <button
            type="button"
            onClick={handlePauseResume}
            className={cn(
              "p-2 rounded-lg transition-colors",
              "hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
            )}
            aria-label={toolbarState.isPaused ? "Resume recording" : "Pause recording"}
          >
            {toolbarState.isPaused ? (
              <Play className="h-4 w-4 text-green-500" />
            ) : (
              <Pause className="h-4 w-4 text-yellow-500" />
            )}
          </button>

          {/* Stop button */}
          <button
            type="button"
            onClick={handleStop}
            className={cn(
              "p-2 rounded-lg transition-colors",
              "hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-ring"
            )}
            aria-label="Stop recording"
          >
            <Square className="h-4 w-4 text-red-500 fill-red-500" />
          </button>

          {/* Minimize button */}
          <button
            type="button"
            onClick={handleToggleCompact}
            className={cn(
              "p-2 rounded-lg transition-colors",
              "hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
            )}
            aria-label="Minimize toolbar"
          >
            <Minimize2 className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
