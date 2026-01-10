'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { GripVertical, X, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export type PanelPosition = 'left' | 'right' | 'bottom';

interface ResizablePanelProps {
  children: React.ReactNode;
  position?: PanelPosition;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  open?: boolean;
  onClose?: () => void;
  title?: string;
  className?: string;
  showHeader?: boolean;
  collapsible?: boolean;
}

const STORAGE_KEY_PREFIX = 'cognia:panel:';

export function ResizablePanel({
  children,
  position = 'right',
  defaultWidth = 400,
  defaultHeight = 300,
  minWidth = 280,
  maxWidth = 800,
  minHeight = 200,
  maxHeight = 600,
  open = true,
  onClose,
  title,
  className,
  showHeader = true,
  collapsible = true,
}: ResizablePanelProps) {
  const storageKey = `${STORAGE_KEY_PREFIX}${position}`;
  
  const [size, setSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return { width: defaultWidth, height: defaultHeight };
  });

  const [isResizing, setIsResizing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const startSize = useRef({ width: 0, height: 0 });

  // Save size to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && !isFullscreen) {
      localStorage.setItem(storageKey, JSON.stringify(size));
    }
  }, [size, storageKey, isFullscreen]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    startSize.current = { width: size.width, height: size.height };
  }, [size]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startPos.current.x;
    const deltaY = e.clientY - startPos.current.y;

    if (position === 'left') {
      const newWidth = Math.min(maxWidth, Math.max(minWidth, startSize.current.width + deltaX));
      setSize((prev: { width: number; height: number }) => ({ ...prev, width: newWidth }));
    } else if (position === 'right') {
      const newWidth = Math.min(maxWidth, Math.max(minWidth, startSize.current.width - deltaX));
      setSize((prev: { width: number; height: number }) => ({ ...prev, width: newWidth }));
    } else if (position === 'bottom') {
      const newHeight = Math.min(maxHeight, Math.max(minHeight, startSize.current.height - deltaY));
      setSize((prev: { width: number; height: number }) => ({ ...prev, height: newHeight }));
    }
  }, [isResizing, position, minWidth, maxWidth, minHeight, maxHeight]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = position === 'bottom' ? 'ns-resize' : 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp, position]);

  const handleDoubleClick = useCallback(() => {
    setSize({ width: defaultWidth, height: defaultHeight });
  }, [defaultWidth, defaultHeight]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  if (!open) return null;

  const isHorizontal = position === 'left' || position === 'right';
  const resizeHandlePosition = position === 'left' ? 'right-0' : position === 'right' ? 'left-0' : 'top-0';

  return (
    <div
      ref={panelRef}
      className={cn(
        'flex flex-col bg-background border-border overflow-hidden transition-all duration-200',
        isFullscreen && 'fixed inset-0 z-50',
        !isFullscreen && position === 'left' && 'border-r',
        !isFullscreen && position === 'right' && 'border-l',
        !isFullscreen && position === 'bottom' && 'border-t',
        isResizing && 'select-none',
        className
      )}
      style={isFullscreen ? undefined : {
        width: isHorizontal ? size.width : '100%',
        height: isHorizontal ? '100%' : size.height,
      }}
    >
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
          <span className="text-sm font-medium truncate">{title}</span>
          <div className="flex items-center gap-1">
            {collapsible && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={toggleFullscreen}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-3.5 w-3.5" />
                    ) : (
                      <Maximize2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                </TooltipContent>
              </Tooltip>
            )}
            {onClose && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={onClose}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Close</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>

      {/* Resize handle */}
      {!isFullscreen && (
        <div
          className={cn(
            'absolute z-10 flex items-center justify-center',
            'hover:bg-primary/10 transition-colors',
            isHorizontal
              ? 'w-1 h-full cursor-ew-resize hover:w-1.5'
              : 'h-1 w-full cursor-ns-resize hover:h-1.5',
            resizeHandlePosition,
            isResizing && 'bg-primary/20'
          )}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
        >
          {isHorizontal && (
            <GripVertical className="h-4 w-4 text-muted-foreground/50" />
          )}
        </div>
      )}
    </div>
  );
}

export default ResizablePanel;
