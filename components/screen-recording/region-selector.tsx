'use client';

/**
 * Region Selector Component
 * 
 * Full-screen overlay for selecting a region to record.
 * Uses mouse drag to define the recording area.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X, Check, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Kbd } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';
import type { RecordingRegion } from '@/lib/native/screen-recording';

interface RegionSelectorProps {
  onSelect: (region: RecordingRegion) => void;
  onCancel: () => void;
  minWidth?: number;
  minHeight?: number;
}

export function RegionSelector({
  onSelect,
  onCancel,
  minWidth = 100,
  minHeight = 100,
}: RegionSelectorProps) {
  const t = useTranslations('screenRecording');
  
  // Selection state
  const [isSelecting, setIsSelecting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [selection, setSelection] = useState<RecordingRegion | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const overlayRef = useRef<HTMLDivElement>(null);

  // Handle mouse down to start selection
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if clicking on existing selection for dragging
    if (selection && !isResizing) {
      if (
        x >= selection.x &&
        x <= selection.x + selection.width &&
        y >= selection.y &&
        y <= selection.y + selection.height
      ) {
        // Check if clicking on a resize handle
        const handleSize = 12;
        const handles = getResizeHandles(selection, handleSize);
        
        for (const [handleName, handleRect] of Object.entries(handles)) {
          if (
            x >= handleRect.x &&
            x <= handleRect.x + handleRect.width &&
            y >= handleRect.y &&
            y <= handleRect.y + handleRect.height
          ) {
            setIsResizing(true);
            setResizeHandle(handleName);
            setStartPoint({ x, y });
            return;
          }
        }
        
        // Start dragging the selection
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
  }, [selection, isResizing]);

  // Handle mouse move during selection/drag/resize
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    
    if (isSelecting && !isDragging && !isResizing) {
      // Update selection rectangle
      const newSelection: RecordingRegion = {
        x: Math.min(startPoint.x, x),
        y: Math.min(startPoint.y, y),
        width: Math.abs(x - startPoint.x),
        height: Math.abs(y - startPoint.y),
      };
      setSelection(newSelection);
    } else if (isDragging && selection) {
      // Move the selection
      const newX = Math.max(0, Math.min(x - dragOffset.x, rect.width - selection.width));
      const newY = Math.max(0, Math.min(y - dragOffset.y, rect.height - selection.height));
      setSelection({
        ...selection,
        x: newX,
        y: newY,
      });
    } else if (isResizing && selection && resizeHandle) {
      // Resize the selection
      const newSelection = resizeSelection(selection, resizeHandle, x, y, startPoint, rect);
      setSelection(newSelection);
      setStartPoint({ x, y });
    }
  }, [isSelecting, isDragging, isResizing, startPoint, selection, dragOffset, resizeHandle]);

  // Handle mouse up to finish selection
  const handleMouseUp = useCallback(() => {
    setIsSelecting(false);
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter' && selection && selection.width >= minWidth && selection.height >= minHeight) {
        onSelect({
          x: Math.round(selection.x),
          y: Math.round(selection.y),
          width: Math.round(selection.width),
          height: Math.round(selection.height),
        });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection, minWidth, minHeight, onSelect, onCancel]);

  // Confirm selection
  const handleConfirm = useCallback(() => {
    if (selection && selection.width >= minWidth && selection.height >= minHeight) {
      onSelect({
        x: Math.round(selection.x),
        y: Math.round(selection.y),
        width: Math.round(selection.width),
        height: Math.round(selection.height),
      });
    }
  }, [selection, minWidth, minHeight, onSelect]);

  // Check if selection is valid
  const isValidSelection = selection && selection.width >= minWidth && selection.height >= minHeight;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] cursor-crosshair select-none"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Instructions */}
      <Card className="absolute top-4 left-1/2 -translate-x-1/2 bg-background/95 backdrop-blur shadow-lg">
        <CardContent className="px-4 py-2">
          <p className="text-sm text-center">
            {selection && selection.width > 0 
              ? t('dragToAdjust')
              : t('clickAndDrag')
            }
          </p>
          <div className="flex items-center justify-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Kbd>Esc</Kbd> {t('toCancel')}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Kbd>Enter</Kbd> {t('toConfirm')}
            </span>
          </div>
        </CardContent>
      </Card>

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
            <Badge className="absolute -top-8 left-1/2 -translate-x-1/2 font-mono whitespace-nowrap">
              {Math.round(selection.width)} × {Math.round(selection.height)}
            </Badge>

            {/* Resize handles */}
            {!isSelecting && (
              <>
                {/* Corner handles */}
                <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-primary rounded-sm cursor-nw-resize" />
                <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-primary rounded-sm cursor-ne-resize" />
                <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-primary rounded-sm cursor-sw-resize" />
                <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-primary rounded-sm cursor-se-resize" />
                
                {/* Edge handles */}
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 h-3 bg-primary rounded-sm cursor-n-resize" />
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-3 bg-primary rounded-sm cursor-s-resize" />
                <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-6 bg-primary rounded-sm cursor-w-resize" />
                <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-6 bg-primary rounded-sm cursor-e-resize" />
                
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
          onClick={onCancel}
          className="bg-background/95 backdrop-blur"
        >
          <X className="h-4 w-4 mr-2" />
          {t('cancel')}
        </Button>
        
        {isValidSelection && (
          <Button
            size="sm"
            onClick={handleConfirm}
            className="bg-primary text-primary-foreground"
          >
            <Check className="h-4 w-4 mr-2" />
            {t('startRecording')}
          </Button>
        )}
      </div>
    </div>
  );
}

// Helper to get resize handle positions
function getResizeHandles(selection: RecordingRegion, handleSize: number) {
  const half = handleSize / 2;
  const edgeLong = handleSize * 2;
  const edgeLongHalf = edgeLong / 2;
  return {
    nw: { x: selection.x - half, y: selection.y - half, width: handleSize, height: handleSize },
    ne: { x: selection.x + selection.width - half, y: selection.y - half, width: handleSize, height: handleSize },
    sw: { x: selection.x - half, y: selection.y + selection.height - half, width: handleSize, height: handleSize },
    se: { x: selection.x + selection.width - half, y: selection.y + selection.height - half, width: handleSize, height: handleSize },
    n: { x: selection.x + selection.width / 2 - edgeLongHalf, y: selection.y - half, width: edgeLong, height: handleSize },
    s: { x: selection.x + selection.width / 2 - edgeLongHalf, y: selection.y + selection.height - half, width: edgeLong, height: handleSize },
    w: { x: selection.x - half, y: selection.y + selection.height / 2 - edgeLongHalf, width: handleSize, height: edgeLong },
    e: { x: selection.x + selection.width - half, y: selection.y + selection.height / 2 - edgeLongHalf, width: handleSize, height: edgeLong },
  };
}

// Helper to resize selection based on handle
function resizeSelection(
  selection: RecordingRegion,
  handle: string,
  x: number,
  y: number,
  _startPoint: { x: number; y: number },
  bounds: DOMRect
): RecordingRegion {
  let { x: sx, y: sy, width: sw, height: sh } = selection;
  
  switch (handle) {
    case 'nw':
      sw = sw + (sx - x);
      sh = sh + (sy - y);
      sx = x;
      sy = y;
      break;
    case 'ne':
      sw = x - sx;
      sh = sh + (sy - y);
      sy = y;
      break;
    case 'sw':
      sw = sw + (sx - x);
      sx = x;
      sh = y - sy;
      break;
    case 'se':
      sw = x - sx;
      sh = y - sy;
      break;
    case 'n':
      sh = sh + (sy - y);
      sy = y;
      break;
    case 's':
      sh = y - sy;
      break;
    case 'w':
      sw = sw + (sx - x);
      sx = x;
      break;
    case 'e':
      sw = x - sx;
      break;
  }
  
  // Ensure minimum size and bounds
  sw = Math.max(50, Math.min(sw, bounds.width - sx));
  sh = Math.max(50, Math.min(sh, bounds.height - sy));
  sx = Math.max(0, Math.min(sx, bounds.width - 50));
  sy = Math.max(0, Math.min(sy, bounds.height - 50));
  
  return { x: sx, y: sy, width: sw, height: sh };
}

