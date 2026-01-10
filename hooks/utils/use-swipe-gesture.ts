import * as React from 'react';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface SwipeOptions {
  threshold?: number;
  minVelocity?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipe?: (direction: SwipeDirection) => void;
  preventDefaultOnSwipe?: boolean;
}

export interface SwipeState {
  swiping: boolean;
  direction: SwipeDirection | null;
  deltaX: number;
  deltaY: number;
}

export function useSwipeGesture(
  ref: React.RefObject<HTMLElement | null>,
  options: SwipeOptions = {}
) {
  const {
    threshold = 50,
    minVelocity = 0.3,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onSwipe,
    preventDefaultOnSwipe = false,
  } = options;

  const [state, setState] = React.useState<SwipeState>({
    swiping: false,
    direction: null,
    deltaX: 0,
    deltaY: 0,
  });

  const touchStart = React.useRef<{ x: number; y: number; time: number } | null>(null);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      setState((prev) => ({ ...prev, swiping: true, deltaX: 0, deltaY: 0 }));
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStart.current) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStart.current.x;
      const deltaY = touch.clientY - touchStart.current.y;

      let direction: SwipeDirection | null = null;
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }

      setState({ swiping: true, direction, deltaX, deltaY });

      if (preventDefaultOnSwipe && Math.abs(deltaX) > 10) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStart.current.x;
      const deltaY = touch.clientY - touchStart.current.y;
      const duration = Date.now() - touchStart.current.time;
      const velocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / duration;

      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (velocity >= minVelocity || absX > threshold || absY > threshold) {
        let direction: SwipeDirection | null = null;

        if (absX > absY && absX > threshold) {
          direction = deltaX > 0 ? 'right' : 'left';
          if (direction === 'left') onSwipeLeft?.();
          if (direction === 'right') onSwipeRight?.();
        } else if (absY > absX && absY > threshold) {
          direction = deltaY > 0 ? 'down' : 'up';
          if (direction === 'up') onSwipeUp?.();
          if (direction === 'down') onSwipeDown?.();
        }

        if (direction) {
          onSwipe?.(direction);
        }
      }

      touchStart.current = null;
      setState({ swiping: false, direction: null, deltaX: 0, deltaY: 0 });
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefaultOnSwipe });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [ref, threshold, minVelocity, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onSwipe, preventDefaultOnSwipe]);

  return state;
}
