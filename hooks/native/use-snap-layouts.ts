import { useCallback, useState, useEffect } from 'react';
import { useWindowControls } from './use-window-controls';

export type SnapPosition = 
  | 'left-half' 
  | 'right-half' 
  | 'top-half' 
  | 'bottom-half'
  | 'top-left' 
  | 'top-right' 
  | 'bottom-left' 
  | 'bottom-right'
  | 'center'
  | 'maximize';

interface SnapLayout {
  id: SnapPosition;
  label: string;
  shortcut?: string;
}

export const SNAP_LAYOUTS: SnapLayout[] = [
  { id: 'left-half', label: 'Left Half', shortcut: 'Win+Left' },
  { id: 'right-half', label: 'Right Half', shortcut: 'Win+Right' },
  { id: 'top-half', label: 'Top Half' },
  { id: 'bottom-half', label: 'Bottom Half' },
  { id: 'top-left', label: 'Top Left Quarter' },
  { id: 'top-right', label: 'Top Right Quarter' },
  { id: 'bottom-left', label: 'Bottom Left Quarter' },
  { id: 'bottom-right', label: 'Bottom Right Quarter' },
  { id: 'center', label: 'Center', shortcut: 'Win+C' },
  { id: 'maximize', label: 'Maximize', shortcut: 'Win+Up' },
];

export function useSnapLayouts() {
  const { isTauri, snapToEdge, snapToCorner, center, toggleMaximize } = useWindowControls();
  const [currentSnap, setCurrentSnap] = useState<SnapPosition | null>(null);

  const snapTo = useCallback(async (position: SnapPosition) => {
    if (!isTauri) return;

    try {
      switch (position) {
        case 'left-half':
          await snapToEdge('left');
          break;
        case 'right-half':
          await snapToEdge('right');
          break;
        case 'top-half':
          await snapToEdge('top');
          break;
        case 'bottom-half':
          await snapToEdge('bottom');
          break;
        case 'top-left':
          await snapToCorner('topLeft');
          break;
        case 'top-right':
          await snapToCorner('topRight');
          break;
        case 'bottom-left':
          await snapToCorner('bottomLeft');
          break;
        case 'bottom-right':
          await snapToCorner('bottomRight');
          break;
        case 'center':
          await center();
          break;
        case 'maximize':
          await toggleMaximize();
          break;
      }
      setCurrentSnap(position);
    } catch (error) {
      console.error('Failed to snap window:', error);
    }
  }, [isTauri, snapToEdge, snapToCorner, center, toggleMaximize]);

  // Keyboard shortcuts for snap layouts
  useEffect(() => {
    if (!isTauri) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle when Meta/Win key is pressed
      if (!e.metaKey) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          snapTo('left-half');
          break;
        case 'ArrowRight':
          e.preventDefault();
          snapTo('right-half');
          break;
        case 'ArrowUp':
          e.preventDefault();
          snapTo('maximize');
          break;
        case 'ArrowDown':
          e.preventDefault();
          snapTo('center');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTauri, snapTo]);

  return {
    snapTo,
    currentSnap,
    layouts: SNAP_LAYOUTS,
    isSupported: isTauri,
  };
}

export default useSnapLayouts;
