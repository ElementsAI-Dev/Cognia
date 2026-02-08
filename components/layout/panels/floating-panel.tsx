'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X, Minimize2, Maximize2, GripHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/utils';

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface FloatingPanelProps {
  children: React.ReactNode;
  title?: string;
  defaultPosition?: Position;
  defaultSize?: Size;
  minWidth?: number;
  minHeight?: number;
  open?: boolean;
  onClose?: () => void;
  className?: string;
  resizable?: boolean;
  draggable?: boolean;
  zIndex?: number;
}

const STORAGE_KEY_PREFIX = 'cognia:floating-panel:';

export function FloatingPanel({
  children,
  title = 'Panel',
  defaultPosition = { x: 100, y: 100 },
  defaultSize = { width: 400, height: 300 },
  minWidth = 200,
  minHeight = 150,
  open = true,
  onClose,
  className,
  resizable = true,
  draggable = true,
  zIndex = 50,
}: FloatingPanelProps) {
  const storageKey = `${STORAGE_KEY_PREFIX}${title.toLowerCase().replace(/\s/g, '-')}`;

  const [position, setPosition] = useState<Position>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${storageKey}:position`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return defaultPosition;
  });

  const [size, setSize] = useState<Size>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${storageKey}:size`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return defaultSize;
  });

  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const isMobile = useIsMobile();

  const panelRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<Position>({ x: 0, y: 0 });
  const resizeStart = useRef<{ pos: Position; size: Size }>({
    pos: { x: 0, y: 0 },
    size: { width: 0, height: 0 },
  });

  // Save position and size
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${storageKey}:position`, JSON.stringify(position));
      localStorage.setItem(`${storageKey}:size`, JSON.stringify(size));
    }
  }, [position, size, storageKey]);

  // Drag handlers
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (!draggable) return;
      e.preventDefault();
      setIsDragging(true);
      dragStart.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [draggable, position]
  );

  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = Math.max(
        0,
        Math.min(window.innerWidth - size.width, e.clientX - dragStart.current.x)
      );
      const newY = Math.max(
        0,
        Math.min(window.innerHeight - size.height, e.clientY - dragStart.current.y)
      );

      setPosition({ x: newX, y: newY });
    },
    [isDragging, size]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Resize handlers
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (!resizable) return;
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      resizeStart.current = {
        pos: { x: e.clientX, y: e.clientY },
        size: { ...size },
      };
    },
    [resizable, size]
  );

  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const deltaX = e.clientX - resizeStart.current.pos.x;
      const deltaY = e.clientY - resizeStart.current.pos.y;

      const newWidth = Math.max(minWidth, resizeStart.current.size.width + deltaX);
      const newHeight = Math.max(minHeight, resizeStart.current.size.height + deltaY);

      setSize({ width: newWidth, height: newHeight });
    },
    [isResizing, minWidth, minHeight]
  );

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      if (!isResizing) {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
  }, [isDragging, handleDragMove, handleDragEnd, isResizing]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'se-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      if (!isDragging) {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
  }, [isResizing, handleResizeMove, handleResizeEnd, isDragging]);

  if (!open) return null;

  // On mobile, use full-width bottom sheet style
  const mobileStyles = isMobile
    ? {
        left: 0,
        right: 0,
        bottom: 0,
        top: 'auto',
        width: '100%',
        height: isMinimized ? 'auto' : '60vh',
        maxHeight: '80vh',
        borderRadius: '1rem 1rem 0 0',
      }
    : {
        left: position.x,
        top: position.y,
        width: isMinimized ? 200 : size.width,
        height: isMinimized ? 'auto' : size.height,
      };

  return (
    <div
      ref={panelRef}
      className={cn(
        'fixed flex flex-col border border-border bg-background shadow-xl overflow-hidden',
        isMobile ? 'rounded-t-2xl' : 'rounded-lg',
        (isDragging || isResizing) && 'select-none',
        className
      )}
      style={
        {
          ...mobileStyles,
          zIndex,
        } as React.CSSProperties
      }
    >
      {/* Header - draggable on desktop only */}
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50',
          !isMobile && draggable && 'cursor-grab',
          !isMobile && isDragging && 'cursor-grabbing'
        )}
        onMouseDown={isMobile ? undefined : handleDragStart}
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium truncate">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsMinimized(!isMinimized)}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {isMinimized ? (
                  <Maximize2 className="h-3.5 w-3.5" />
                ) : (
                  <Minimize2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isMinimized ? 'Expand' : 'Minimize'}</TooltipContent>
          </Tooltip>
          {onClose && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={onClose}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Close</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Content */}
      {!isMinimized && <div className="flex-1 overflow-auto">{children}</div>}

      {/* Resize handle - desktop only */}
      {resizable && !isMinimized && !isMobile && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onMouseDown={handleResizeStart}
        >
          <svg
            className="absolute bottom-1 right-1 w-2 h-2 text-muted-foreground"
            viewBox="0 0 6 6"
          >
            <circle cx="5" cy="1" r="0.5" fill="currentColor" />
            <circle cx="1" cy="5" r="0.5" fill="currentColor" />
            <circle cx="5" cy="5" r="0.5" fill="currentColor" />
          </svg>
        </div>
      )}
    </div>
  );
}

export default FloatingPanel;
