'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { GripVertical, Columns, Rows, Maximize2, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type SplitDirection = 'horizontal' | 'vertical';
export type SplitLayout = 'single' | 'split-equal' | 'split-left' | 'split-right';

interface SplitViewProps {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  direction?: SplitDirection;
  defaultRatio?: number;
  minRatio?: number;
  maxRatio?: number;
  showLayoutToggle?: boolean;
  className?: string;
  onLayoutChange?: (layout: SplitLayout) => void;
}

const STORAGE_KEY = 'cognia:split-view:ratio';

export function SplitView({
  primary,
  secondary,
  direction = 'horizontal',
  defaultRatio = 0.5,
  minRatio = 0.2,
  maxRatio = 0.8,
  showLayoutToggle = true,
  className,
  onLayoutChange,
}: SplitViewProps) {
  const [ratio, setRatio] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed)) return parsed;
      }
    }
    return defaultRatio;
  });

  const [layout, setLayout] = useState<SplitLayout>(secondary ? 'split-equal' : 'single');
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPos = useRef(0);
  const startRatio = useRef(0);

  // Save ratio to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, ratio.toString());
    }
  }, [ratio]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
    startRatio.current = ratio;
  }, [direction, ratio]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const size = direction === 'horizontal' ? rect.width : rect.height;
    const pos = direction === 'horizontal' ? e.clientX : e.clientY;
    const start = direction === 'horizontal' ? rect.left : rect.top;

    const newRatio = (pos - start) / size;
    const clampedRatio = Math.min(maxRatio, Math.max(minRatio, newRatio));
    setRatio(clampedRatio);
  }, [isResizing, direction, minRatio, maxRatio]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = direction === 'horizontal' ? 'ew-resize' : 'ns-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp, direction]);

  const handleDoubleClick = useCallback(() => {
    setRatio(0.5);
  }, []);

  const handleLayoutChange = useCallback((newLayout: SplitLayout) => {
    setLayout(newLayout);
    onLayoutChange?.(newLayout);
    
    if (newLayout === 'split-left') {
      setRatio(0.3);
    } else if (newLayout === 'split-right') {
      setRatio(0.7);
    } else if (newLayout === 'split-equal') {
      setRatio(0.5);
    }
  }, [onLayoutChange]);

  const showSecondary = secondary && layout !== 'single';
  const actualRatio = layout === 'single' ? 1 : ratio;

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex h-full w-full overflow-hidden',
        direction === 'horizontal' ? 'flex-row' : 'flex-col',
        isResizing && 'select-none',
        className
      )}
    >
      {/* Primary panel */}
      <div
        className="overflow-hidden"
        style={{
          [direction === 'horizontal' ? 'width' : 'height']: `${actualRatio * 100}%`,
        }}
      >
        {primary}
      </div>

      {/* Resize handle */}
      {showSecondary && (
        <div
          className={cn(
            'relative flex items-center justify-center bg-border',
            'hover:bg-primary/20 transition-colors',
            direction === 'horizontal'
              ? 'w-1 cursor-ew-resize hover:w-1.5'
              : 'h-1 cursor-ns-resize hover:h-1.5',
            isResizing && 'bg-primary/30'
          )}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
        >
          {direction === 'horizontal' && (
            <GripVertical className="h-4 w-4 text-muted-foreground/50 absolute" />
          )}
        </div>
      )}

      {/* Secondary panel */}
      {showSecondary && (
        <div
          className="overflow-hidden"
          style={{
            [direction === 'horizontal' ? 'width' : 'height']: `${(1 - actualRatio) * 100}%`,
          }}
        >
          {secondary}
        </div>
      )}

      {/* Layout toggle */}
      {showLayoutToggle && secondary && (
        <div className="absolute top-2 right-2 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-7 w-7">
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleLayoutChange('single')}>
                <Maximize2 className="mr-2 h-4 w-4" />
                Single View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleLayoutChange('split-equal')}>
                <Columns className="mr-2 h-4 w-4" />
                Split Equal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleLayoutChange('split-left')}>
                <Rows className="mr-2 h-4 w-4 rotate-90" />
                Focus Left
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleLayoutChange('split-right')}>
                <Rows className="mr-2 h-4 w-4 -rotate-90" />
                Focus Right
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

export default SplitView;
