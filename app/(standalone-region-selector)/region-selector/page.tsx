"use client";

/**
 * Region Selector Page
 * 
 * Full-screen overlay for selecting a screen region to capture.
 * Used by the screenshot region selection feature.
 * Communicates with the Tauri backend via events.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { emit, listen } from "@tauri-apps/api/event";
import { X, Check, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CaptureRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ScreenInfo {
  screenX: number;
  screenY: number;
  screenWidth: number;
  screenHeight: number;
}

export default function RegionSelectorPage() {
  const [screenInfo, setScreenInfo] = useState<ScreenInfo | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [selection, setSelection] = useState<CaptureRegion | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const overlayRef = useRef<HTMLDivElement>(null);
  const minWidth = 50;
  const minHeight = 50;

  const handleCancel = useCallback(() => {
    emit("region-selection-cancelled", {});
  }, []);

  const handleConfirm = useCallback(() => {
    if (selection && selection.width >= minWidth && selection.height >= minHeight) {
      // Convert to absolute screen coordinates if we have screen info
      const absoluteRegion: CaptureRegion = screenInfo
        ? {
            x: Math.round(selection.x + screenInfo.screenX),
            y: Math.round(selection.y + screenInfo.screenY),
            width: Math.round(selection.width),
            height: Math.round(selection.height),
          }
        : {
            x: Math.round(selection.x),
            y: Math.round(selection.y),
            width: Math.round(selection.width),
            height: Math.round(selection.height),
          };

      emit("region-selected", absoluteRegion);
    }
  }, [selection, screenInfo]);

  // Listen for screen info from backend
  useEffect(() => {
    const unlisten = listen<ScreenInfo>("region-selection-started", (event) => {
      setScreenInfo(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCancel();
      } else if (
        e.key === "Enter" &&
        selection &&
        selection.width >= minWidth &&
        selection.height >= minHeight
      ) {
        handleConfirm();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selection, handleCancel, handleConfirm]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;

      const rect = overlayRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check if clicking on existing selection for dragging
      if (selection && !isDragging) {
        if (
          x >= selection.x &&
          x <= selection.x + selection.width &&
          y >= selection.y &&
          y <= selection.y + selection.height
        ) {
          setIsDragging(true);
          setDragOffset({
            x: x - selection.x,
            y: y - selection.y,
          });
          return;
        }
      }

      // Start new selection
      setIsSelecting(true);
      setStartPoint({ x, y });
      setSelection({ x, y, width: 0, height: 0 });
    },
    [selection, isDragging]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = overlayRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

      if (isSelecting && !isDragging) {
        const newSelection: CaptureRegion = {
          x: Math.min(startPoint.x, x),
          y: Math.min(startPoint.y, y),
          width: Math.abs(x - startPoint.x),
          height: Math.abs(y - startPoint.y),
        };
        setSelection(newSelection);
      } else if (isDragging && selection) {
        const newX = Math.max(
          0,
          Math.min(x - dragOffset.x, rect.width - selection.width)
        );
        const newY = Math.max(
          0,
          Math.min(y - dragOffset.y, rect.height - selection.height)
        );
        setSelection({
          ...selection,
          x: newX,
          y: newY,
        });
      }
    },
    [isSelecting, isDragging, startPoint, selection, dragOffset]
  );

  const handleMouseUp = useCallback(() => {
    setIsSelecting(false);
    setIsDragging(false);
  }, []);

  const isValidSelection =
    selection && selection.width >= minWidth && selection.height >= minHeight;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] cursor-crosshair select-none"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Instructions */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-background/95 backdrop-blur rounded-lg px-4 py-2 shadow-lg border pointer-events-none">
        <p className="text-sm text-center">
          {selection && selection.width > 0
            ? "拖拽调整选区位置"
            : "点击并拖拽以选择区域"}
        </p>
        <p className="text-xs text-muted-foreground text-center mt-1">
          按 ESC 取消 • 按 Enter 确认
        </p>
      </div>

      {/* Selection overlay */}
      {selection && selection.width > 0 && selection.height > 0 && (
        <>
          {/* Dim areas outside selection */}
          <div
            className="absolute bg-black/50 pointer-events-none"
            style={{
              top: 0,
              left: 0,
              right: 0,
              height: selection.y,
            }}
          />
          <div
            className="absolute bg-black/50 pointer-events-none"
            style={{
              top: selection.y + selection.height,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          <div
            className="absolute bg-black/50 pointer-events-none"
            style={{
              top: selection.y,
              left: 0,
              width: selection.x,
              height: selection.height,
            }}
          />
          <div
            className="absolute bg-black/50 pointer-events-none"
            style={{
              top: selection.y,
              left: selection.x + selection.width,
              right: 0,
              height: selection.height,
            }}
          />

          {/* Selection rectangle */}
          <div
            className={cn(
              "absolute border-2 border-primary",
              isDragging && "cursor-move"
            )}
            style={{
              left: selection.x,
              top: selection.y,
              width: selection.width,
              height: selection.height,
            }}
          >
            {/* Clear area inside selection */}
            <div className="absolute inset-0 bg-transparent" />

            {/* Size indicator */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-mono whitespace-nowrap pointer-events-none">
              {Math.round(selection.width)} × {Math.round(selection.height)}
            </div>

            {/* Resize handles */}
            {!isSelecting && (
              <>
                {/* Corner handles */}
                <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-primary rounded-sm cursor-nw-resize" />
                <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-primary rounded-sm cursor-ne-resize" />
                <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-primary rounded-sm cursor-sw-resize" />
                <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-primary rounded-sm cursor-se-resize" />

                {/* Move indicator in center */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <Move className="h-6 w-6 text-primary opacity-50" />
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Action buttons */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCancel}
          className="bg-background/95 backdrop-blur"
        >
          <X className="h-4 w-4 mr-2" />
          取消
        </Button>

        {isValidSelection && (
          <Button
            size="sm"
            onClick={handleConfirm}
            className="bg-primary text-primary-foreground"
          >
            <Check className="h-4 w-4 mr-2" />
            确认选区
          </Button>
        )}
      </div>
    </div>
  );
}
