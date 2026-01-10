'use client';

import { useState, useRef, useCallback } from 'react';
import { Copy, RotateCcw, Pencil, Trash2, Reply, Bookmark, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useSwipeGesture } from '@/hooks/utils';

export type SwipeAction = 'copy' | 'edit' | 'delete' | 'reply' | 'regenerate' | 'bookmark' | 'share';

interface SwipeActionConfig {
  id: SwipeAction;
  icon: React.ReactNode;
  label: string;
  color: string;
  side: 'left' | 'right';
}

interface MessageSwipeActionsProps {
  children: React.ReactNode;
  onAction: (action: SwipeAction) => void;
  enabledActions?: SwipeAction[];
  className?: string;
  disabled?: boolean;
}

const allActions: SwipeActionConfig[] = [
  { id: 'reply', icon: <Reply className="h-4 w-4" />, label: 'Reply', color: 'bg-blue-500', side: 'left' },
  { id: 'copy', icon: <Copy className="h-4 w-4" />, label: 'Copy', color: 'bg-green-500', side: 'left' },
  { id: 'edit', icon: <Pencil className="h-4 w-4" />, label: 'Edit', color: 'bg-amber-500', side: 'right' },
  { id: 'delete', icon: <Trash2 className="h-4 w-4" />, label: 'Delete', color: 'bg-red-500', side: 'right' },
  { id: 'regenerate', icon: <RotateCcw className="h-4 w-4" />, label: 'Regenerate', color: 'bg-purple-500', side: 'right' },
  { id: 'bookmark', icon: <Bookmark className="h-4 w-4" />, label: 'Bookmark', color: 'bg-yellow-500', side: 'left' },
  { id: 'share', icon: <Share2 className="h-4 w-4" />, label: 'Share', color: 'bg-cyan-500', side: 'left' },
];

const SWIPE_THRESHOLD = 80;
const ACTION_WIDTH = 60;

export function MessageSwipeActions({
  children,
  onAction,
  enabledActions = ['copy', 'edit', 'delete'],
  className,
  disabled = false,
}: MessageSwipeActionsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [activeAction, setActiveAction] = useState<SwipeAction | null>(null);

  const leftActions = allActions.filter(a => a.side === 'left' && enabledActions.includes(a.id));
  const rightActions = allActions.filter(a => a.side === 'right' && enabledActions.includes(a.id));

  const maxLeftOffset = leftActions.length * ACTION_WIDTH;
  const maxRightOffset = rightActions.length * ACTION_WIDTH;

  const swipeState = useSwipeGesture(containerRef, {
    threshold: 30,
    onSwipe: (direction) => {
      if (disabled) return;
      
      if (direction === 'left' && offset < 0) {
        // Trigger rightmost action
        const action = rightActions[0];
        if (action && Math.abs(offset) >= SWIPE_THRESHOLD) {
          onAction(action.id);
        }
      } else if (direction === 'right' && offset > 0) {
        // Trigger leftmost action
        const action = leftActions[0];
        if (action && offset >= SWIPE_THRESHOLD) {
          onAction(action.id);
        }
      }
      
      // Reset position
      setOffset(0);
      setActiveAction(null);
    },
  });

  // Update offset during swipe
  const handleTouchMove = useCallback((_e: React.TouchEvent) => {
    if (disabled) return;
    
    const deltaX = swipeState.deltaX;
    
    // Clamp offset
    const clampedOffset = Math.max(
      -maxRightOffset,
      Math.min(maxLeftOffset, deltaX)
    );
    
    setOffset(clampedOffset);

    // Determine active action based on offset
    if (clampedOffset > SWIPE_THRESHOLD && leftActions.length > 0) {
      setActiveAction(leftActions[0].id);
    } else if (clampedOffset < -SWIPE_THRESHOLD && rightActions.length > 0) {
      setActiveAction(rightActions[0].id);
    } else {
      setActiveAction(null);
    }
  }, [disabled, swipeState.deltaX, maxLeftOffset, maxRightOffset, leftActions, rightActions]);

  const handleTouchEnd = useCallback(() => {
    // Snap to action or reset
    if (Math.abs(offset) < SWIPE_THRESHOLD) {
      setOffset(0);
    }
    setActiveAction(null);
  }, [offset]);

  return (
    <div 
      ref={containerRef}
      className={cn('relative overflow-hidden touch-pan-y', className)}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Left actions (revealed when swiping right) */}
      <div 
        className="absolute left-0 top-0 bottom-0 flex items-center"
        style={{ transform: `translateX(${Math.min(0, -maxLeftOffset + offset)}px)` }}
      >
        {leftActions.map((action) => (
          <Button
            key={action.id}
            variant="ghost"
            size="icon"
            className={cn(
              'h-full rounded-none transition-all',
              action.color,
              'text-white',
              activeAction === action.id && 'scale-110'
            )}
            style={{ width: ACTION_WIDTH }}
            onClick={() => onAction(action.id)}
          >
            {action.icon}
          </Button>
        ))}
      </div>

      {/* Right actions (revealed when swiping left) */}
      <div 
        className="absolute right-0 top-0 bottom-0 flex items-center"
        style={{ transform: `translateX(${Math.max(0, maxRightOffset + offset)}px)` }}
      >
        {rightActions.map((action) => (
          <Button
            key={action.id}
            variant="ghost"
            size="icon"
            className={cn(
              'h-full rounded-none transition-all',
              action.color,
              'text-white',
              activeAction === action.id && 'scale-110'
            )}
            style={{ width: ACTION_WIDTH }}
            onClick={() => onAction(action.id)}
          >
            {action.icon}
          </Button>
        ))}
      </div>

      {/* Main content */}
      <div
        className="relative bg-background transition-transform"
        style={{ transform: `translateX(${offset}px)` }}
      >
        {children}
      </div>
    </div>
  );
}

export default MessageSwipeActions;
