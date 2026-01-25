"use client";

// Prevent static generation for this page (uses Tauri/browser APIs)
export const dynamic = 'force-dynamic';

/**
 * Region Selector Page
 * 
 * Full-screen overlay for selecting a screen region to capture.
 * Enhanced with 8-point resize handles, magnifier, and keyboard controls.
 * Communicates with the Tauri backend via events.
 */

import { useState, useCallback, useRef, useEffect } from "react";

// Type definition to avoid importing from @tauri-apps/api/event at build time
type UnlistenFn = () => void;
import { X, Check, Move, ZoomIn } from "lucide-react";
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

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const RESIZE_HANDLES: { id: ResizeHandle; position: string; cursor: string }[] = [
  { id: 'nw', position: '-top-1.5 -left-1.5', cursor: 'nwse-resize' },
  { id: 'n', position: '-top-1.5 left-1/2 -translate-x-1/2', cursor: 'ns-resize' },
  { id: 'ne', position: '-top-1.5 -right-1.5', cursor: 'nesw-resize' },
  { id: 'e', position: 'top-1/2 -right-1.5 -translate-y-1/2', cursor: 'ew-resize' },
  { id: 'se', position: '-bottom-1.5 -right-1.5', cursor: 'nwse-resize' },
  { id: 's', position: '-bottom-1.5 left-1/2 -translate-x-1/2', cursor: 'ns-resize' },
  { id: 'sw', position: '-bottom-1.5 -left-1.5', cursor: 'nesw-resize' },
  { id: 'w', position: 'top-1/2 -left-1.5 -translate-y-1/2', cursor: 'ew-resize' },
];

export default function RegionSelectorPage() {
  const [mounted, setMounted] = useState(false);
  const [screenInfo, setScreenInfo] = useState<ScreenInfo | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [selection, setSelection] = useState<CaptureRegion | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [showMagnifier, setShowMagnifier] = useState(true);
  const [originalSelection, setOriginalSelection] = useState<CaptureRegion | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);
  const minWidth = 10;
  const minHeight = 10;

  // Ensure component only renders on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCancel = useCallback(async () => {
    const { emit } = await import("@tauri-apps/api/event");
    emit("region-selection-cancelled", {});
  }, []);

  const handleConfirm = useCallback(async () => {
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

      const { emit } = await import("@tauri-apps/api/event");
      emit("region-selected", absoluteRegion);
    }
  }, [selection, screenInfo]);

  // Listen for screen info from backend
  useEffect(() => {
    let unlistenFn: UnlistenFn | null = null;
    let isMounted = true;

    const setupListener = async () => {
      const { listen } = await import("@tauri-apps/api/event");
      if (!isMounted) return;
      unlistenFn = await listen<ScreenInfo>("region-selection-started", (event) => {
        setScreenInfo(event.payload);
      });
    };

    setupListener();

    return () => {
      isMounted = false;
      if (unlistenFn) unlistenFn();
    };
  }, []);

  // Handle keyboard shortcuts including arrow key micro-adjustments
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
      } else if (e.key === "m" || e.key === "M") {
        setShowMagnifier((prev) => !prev);
      } else if (selection && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const rect = overlayRef.current?.getBoundingClientRect();
        if (!rect) return;

        let { x, y, width, height } = selection;

        if (e.ctrlKey || e.metaKey) {
          // Resize with Ctrl/Cmd + Arrow
          switch (e.key) {
            case "ArrowUp":
              height = Math.max(minHeight, height - step);
              break;
            case "ArrowDown":
              height = Math.min(rect.height - y, height + step);
              break;
            case "ArrowLeft":
              width = Math.max(minWidth, width - step);
              break;
            case "ArrowRight":
              width = Math.min(rect.width - x, width + step);
              break;
          }
        } else {
          // Move with Arrow keys
          switch (e.key) {
            case "ArrowUp":
              y = Math.max(0, y - step);
              break;
            case "ArrowDown":
              y = Math.min(rect.height - height, y + step);
              break;
            case "ArrowLeft":
              x = Math.max(0, x - step);
              break;
            case "ArrowRight":
              x = Math.min(rect.width - width, x + step);
              break;
          }
        }

        setSelection({ x, y, width, height });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selection, handleCancel, handleConfirm, setShowMagnifier]);

  // Handle resize from a specific handle
  const handleResizeStart = useCallback(
    (handle: ResizeHandle, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!selection) return;

      const rect = overlayRef.current?.getBoundingClientRect();
      if (!rect) return;

      setIsResizing(true);
      setResizeHandle(handle);
      setOriginalSelection({ ...selection });
      setStartPoint({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    },
    [selection]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if (isResizing) return;

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
    [selection, isDragging, isResizing]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = overlayRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

      // Update cursor position for magnifier
      setCursorPos({ x, y });

      if (isResizing && resizeHandle && originalSelection) {
        // Handle resize
        const dx = x - startPoint.x;
        const dy = y - startPoint.y;
        const newSelection = { ...originalSelection };

        switch (resizeHandle) {
          case 'nw':
            newSelection.x = Math.min(originalSelection.x + dx, originalSelection.x + originalSelection.width - minWidth);
            newSelection.y = Math.min(originalSelection.y + dy, originalSelection.y + originalSelection.height - minHeight);
            newSelection.width = originalSelection.width - (newSelection.x - originalSelection.x);
            newSelection.height = originalSelection.height - (newSelection.y - originalSelection.y);
            break;
          case 'n':
            newSelection.y = Math.min(originalSelection.y + dy, originalSelection.y + originalSelection.height - minHeight);
            newSelection.height = originalSelection.height - (newSelection.y - originalSelection.y);
            break;
          case 'ne':
            newSelection.y = Math.min(originalSelection.y + dy, originalSelection.y + originalSelection.height - minHeight);
            newSelection.width = Math.max(minWidth, originalSelection.width + dx);
            newSelection.height = originalSelection.height - (newSelection.y - originalSelection.y);
            break;
          case 'e':
            newSelection.width = Math.max(minWidth, originalSelection.width + dx);
            break;
          case 'se':
            newSelection.width = Math.max(minWidth, originalSelection.width + dx);
            newSelection.height = Math.max(minHeight, originalSelection.height + dy);
            break;
          case 's':
            newSelection.height = Math.max(minHeight, originalSelection.height + dy);
            break;
          case 'sw':
            newSelection.x = Math.min(originalSelection.x + dx, originalSelection.x + originalSelection.width - minWidth);
            newSelection.width = originalSelection.width - (newSelection.x - originalSelection.x);
            newSelection.height = Math.max(minHeight, originalSelection.height + dy);
            break;
          case 'w':
            newSelection.x = Math.min(originalSelection.x + dx, originalSelection.x + originalSelection.width - minWidth);
            newSelection.width = originalSelection.width - (newSelection.x - originalSelection.x);
            break;
        }

        setSelection(newSelection);
      } else if (isSelecting && !isDragging) {
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
    [isSelecting, isDragging, isResizing, resizeHandle, originalSelection, startPoint, selection, dragOffset]
  );

  const handleMouseUp = useCallback(() => {
    setIsSelecting(false);
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
    setOriginalSelection(null);
  }, []);

  const isValidSelection =
    selection && selection.width >= minWidth && selection.height >= minHeight;

  // Don't render during SSG - this page uses window APIs
  if (!mounted) {
    return null;
  }

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
            ? "拖拽移动 • 拖动手柄调整大小"
            : "点击并拖拽以选择区域"}
        </p>
        <p className="text-xs text-muted-foreground text-center mt-1">
          ESC 取消 • Enter 确认 • 方向键微调 • Shift+方向键 10px • Ctrl+方向键 调整大小
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

            {/* Resize handles - 8 point */}
            {!isSelecting && (
              <>
                {RESIZE_HANDLES.map(({ id, position, cursor }) => (
                  <div
                    key={id}
                    className={cn(
                      "absolute w-3 h-3 bg-primary rounded-sm border border-primary-foreground hover:bg-primary/80 transition-colors",
                      position
                    )}
                    style={{ cursor }}
                    onMouseDown={(e) => handleResizeStart(id, e)}
                  />
                ))}

                {/* Move indicator in center */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <Move className="h-6 w-6 text-primary opacity-50" />
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Magnifier - shows cursor position with zoom */}
      {showMagnifier && !selection && (
        <div
          className="absolute pointer-events-none bg-background/95 backdrop-blur rounded-lg border shadow-lg p-2"
          style={{
            left: Math.min(cursorPos.x + 20, window.innerWidth - 140),
            top: Math.min(cursorPos.y + 20, window.innerHeight - 60),
          }}
        >
          <div className="flex items-center gap-2 text-xs font-mono">
            <ZoomIn className="h-3 w-3 text-muted-foreground" />
            <span>{Math.round(cursorPos.x)}, {Math.round(cursorPos.y)}</span>
          </div>
        </div>
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

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMagnifier((prev) => !prev)}
          className={cn("bg-background/95 backdrop-blur", showMagnifier && "bg-primary/20")}
        >
          <ZoomIn className="h-4 w-4 mr-2" />
          放大镜 (M)
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
