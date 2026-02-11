/**
 * useVideoTimeline - Hook for timeline-specific functionality
 *
 * Handles:
 * - Playhead positioning
 * - Timeline zoom and pan
 * - Markers and regions
 * - Snapping behavior
 * - Time formatting
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import { nanoid } from 'nanoid';

export interface TimelineMarker {
  id: string;
  time: number;
  label?: string;
  color?: string;
  type: 'marker' | 'in-point' | 'out-point' | 'chapter';
}

export interface TimelineRegion {
  id: string;
  startTime: number;
  endTime: number;
  label?: string;
  color?: string;
}

export interface TimelineState {
  currentTime: number;
  duration: number;
  zoom: number;
  scrollPosition: number;
  pixelsPerSecond: number;
  visibleStartTime: number;
  visibleEndTime: number;
  isPlaying: boolean;
  isDragging: boolean;
  markers: TimelineMarker[];
  regions: TimelineRegion[];
  inPoint: number | null;
  outPoint: number | null;
  snapEnabled: boolean;
  snapThreshold: number; // in pixels
}

export interface UseTimelineOptions {
  duration?: number;
  defaultZoom?: number;
  pixelsPerSecondBase?: number;
  snapThreshold?: number;
  fps?: number;
  onTimeChange?: (time: number) => void;
  onMarkerAdd?: (marker: TimelineMarker) => void;
  onRegionChange?: (region: TimelineRegion) => void;
}

export interface UseTimelineReturn {
  // State
  state: TimelineState;

  // Time Navigation
  setCurrentTime: (time: number) => void;
  seekToStart: () => void;
  seekToEnd: () => void;
  seekForward: (seconds?: number) => void;
  seekBackward: (seconds?: number) => void;
  seekToNextMarker: () => void;
  seekToPreviousMarker: () => void;

  // Playback
  play: () => void;
  pause: () => void;
  togglePlayback: () => void;
  setPlaying: (isPlaying: boolean) => void;

  // Zoom & Pan
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  fitToView: (containerWidth: number) => void;
  setScrollPosition: (position: number) => void;
  scrollToTime: (time: number, containerWidth: number) => void;

  // Markers
  addMarker: (marker: Omit<TimelineMarker, 'id'>) => string;
  removeMarker: (id: string) => void;
  updateMarker: (id: string, updates: Partial<TimelineMarker>) => void;
  clearMarkers: () => void;
  getMarkerAtTime: (time: number, tolerance?: number) => TimelineMarker | null;

  // Regions
  addRegion: (region: Omit<TimelineRegion, 'id'>) => string;
  removeRegion: (id: string) => void;
  updateRegion: (id: string, updates: Partial<TimelineRegion>) => void;
  clearRegions: () => void;

  // In/Out Points
  setInPoint: (time: number | null) => void;
  setOutPoint: (time: number | null) => void;
  clearInOutPoints: () => void;
  getSelectedDuration: () => number | null;

  // Snapping
  setSnapEnabled: (enabled: boolean) => void;
  toggleSnap: () => void;
  getSnappedTime: (time: number, excludeMarkers?: string[]) => number;

  // Coordinate Conversion
  timeToPixels: (time: number) => number;
  pixelsToTime: (pixels: number) => number;
  getVisibleTimeRange: (containerWidth: number) => { start: number; end: number };

  // Formatting
  formatTime: (time: number, format?: 'full' | 'short' | 'frames') => string;
  parseTime: (timeString: string) => number;

  // Duration
  setDuration: (duration: number) => void;

  // Dragging
  setDragging: (isDragging: boolean) => void;

  // Refs
  timelineRef: React.RefObject<HTMLDivElement | null>;
  playheadRef: React.RefObject<HTMLDivElement | null>;
}

function generateId(): string {
  return nanoid();
}

const DEFAULT_PIXELS_PER_SECOND = 100;
const DEFAULT_SNAP_THRESHOLD = 10;

export function useVideoTimeline(options: UseTimelineOptions = {}): UseTimelineReturn {
  const {
    duration: initialDuration = 0,
    defaultZoom = 1,
    pixelsPerSecondBase = DEFAULT_PIXELS_PER_SECOND,
    snapThreshold = DEFAULT_SNAP_THRESHOLD,
    fps = 30,
    onTimeChange,
    onMarkerAdd,
    onRegionChange,
  } = options;

  const [state, setState] = useState<TimelineState>({
    currentTime: 0,
    duration: initialDuration,
    zoom: defaultZoom,
    scrollPosition: 0,
    pixelsPerSecond: pixelsPerSecondBase * defaultZoom,
    visibleStartTime: 0,
    visibleEndTime: initialDuration,
    isPlaying: false,
    isDragging: false,
    markers: [],
    regions: [],
    inPoint: null,
    outPoint: null,
    snapEnabled: true,
    snapThreshold,
  });

  const timelineRef = useRef<HTMLDivElement | null>(null);
  const playheadRef = useRef<HTMLDivElement | null>(null);
  const playbackRafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Derive pixels per second from zoom (computed value, not stored in state)
  const pixelsPerSecond = pixelsPerSecondBase * state.zoom;

  // Time Navigation
  const setCurrentTime = useCallback(
    (time: number) => {
      const clampedTime = Math.max(0, Math.min(time, state.duration));
      setState((prev) => ({ ...prev, currentTime: clampedTime }));
      onTimeChange?.(clampedTime);
    },
    [state.duration, onTimeChange]
  );

  const seekToStart = useCallback(() => setCurrentTime(0), [setCurrentTime]);
  const seekToEnd = useCallback(
    () => setCurrentTime(state.duration),
    [setCurrentTime, state.duration]
  );

  const seekForward = useCallback(
    (seconds = 1) => setCurrentTime(state.currentTime + seconds),
    [setCurrentTime, state.currentTime]
  );

  const seekBackward = useCallback(
    (seconds = 1) => setCurrentTime(state.currentTime - seconds),
    [setCurrentTime, state.currentTime]
  );

  const seekToNextMarker = useCallback(() => {
    const nextMarker = state.markers
      .filter((m) => m.time > state.currentTime)
      .sort((a, b) => a.time - b.time)[0];
    if (nextMarker) {
      setCurrentTime(nextMarker.time);
    }
  }, [state.markers, state.currentTime, setCurrentTime]);

  const seekToPreviousMarker = useCallback(() => {
    const prevMarker = state.markers
      .filter((m) => m.time < state.currentTime)
      .sort((a, b) => b.time - a.time)[0];
    if (prevMarker) {
      setCurrentTime(prevMarker.time);
    }
  }, [state.markers, state.currentTime, setCurrentTime]);

  // Playback
  const play = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: true }));
    lastFrameTimeRef.current = performance.now();

    const tick = (now: number) => {
      const delta = (now - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = now;

      setState((prev) => {
        if (prev.currentTime >= prev.duration) {
          playbackRafRef.current = null;
          return { ...prev, isPlaying: false, currentTime: 0 };
        }
        const newTime = Math.min(prev.currentTime + delta, prev.duration);
        onTimeChange?.(newTime);
        return { ...prev, currentTime: newTime };
      });

      playbackRafRef.current = requestAnimationFrame(tick);
    };

    playbackRafRef.current = requestAnimationFrame(tick);
  }, [onTimeChange]);

  const pause = useCallback(() => {
    if (playbackRafRef.current) {
      cancelAnimationFrame(playbackRafRef.current);
      playbackRafRef.current = null;
    }
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const togglePlayback = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  const setPlaying = useCallback(
    (isPlaying: boolean) => {
      if (isPlaying) {
        play();
      } else {
        pause();
      }
    },
    [play, pause]
  );

  // Zoom & Pan
  const setZoom = useCallback((zoom: number) => {
    const clampedZoom = Math.max(0.1, Math.min(10, zoom));
    setState((prev) => ({
      ...prev,
      zoom: clampedZoom,
      pixelsPerSecond: pixelsPerSecondBase * clampedZoom,
    }));
  }, [pixelsPerSecondBase]);

  const zoomIn = useCallback(() => {
    setState((prev) => {
      const newZoom = Math.min(10, prev.zoom * 1.25);
      return { ...prev, zoom: newZoom, pixelsPerSecond: pixelsPerSecondBase * newZoom };
    });
  }, [pixelsPerSecondBase]);

  const zoomOut = useCallback(() => {
    setState((prev) => {
      const newZoom = Math.max(0.1, prev.zoom / 1.25);
      return { ...prev, zoom: newZoom, pixelsPerSecond: pixelsPerSecondBase * newZoom };
    });
  }, [pixelsPerSecondBase]);

  const resetZoom = useCallback(() => {
    setState((prev) => ({ ...prev, zoom: 1, pixelsPerSecond: pixelsPerSecondBase }));
  }, [pixelsPerSecondBase]);

  const fitToView = useCallback(
    (containerWidth: number) => {
      if (state.duration === 0) return;
      const requiredZoom = containerWidth / (state.duration * pixelsPerSecondBase);
      const clampedZoom = Math.max(0.1, Math.min(10, requiredZoom));
      setState((prev) => ({
        ...prev,
        zoom: clampedZoom,
        pixelsPerSecond: pixelsPerSecondBase * clampedZoom,
        scrollPosition: 0,
      }));
    },
    [state.duration, pixelsPerSecondBase]
  );

  const setScrollPosition = useCallback((position: number) => {
    setState((prev) => ({ ...prev, scrollPosition: Math.max(0, position) }));
  }, []);

  const scrollToTime = useCallback(
    (time: number, containerWidth: number) => {
      const pixelPosition = time * pixelsPerSecond;
      const targetScroll = pixelPosition - containerWidth / 2;
      setScrollPosition(targetScroll);
    },
    [pixelsPerSecond, setScrollPosition]
  );

  // Markers
  const addMarker = useCallback(
    (marker: Omit<TimelineMarker, 'id'>): string => {
      const id = generateId();
      const fullMarker: TimelineMarker = { ...marker, id };
      setState((prev) => ({
        ...prev,
        markers: [...prev.markers, fullMarker].sort((a, b) => a.time - b.time),
      }));
      onMarkerAdd?.(fullMarker);
      return id;
    },
    [onMarkerAdd]
  );

  const removeMarker = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      markers: prev.markers.filter((m) => m.id !== id),
    }));
  }, []);

  const updateMarker = useCallback((id: string, updates: Partial<TimelineMarker>) => {
    setState((prev) => ({
      ...prev,
      markers: prev.markers
        .map((m) => (m.id === id ? { ...m, ...updates } : m))
        .sort((a, b) => a.time - b.time),
    }));
  }, []);

  const clearMarkers = useCallback(() => {
    setState((prev) => ({ ...prev, markers: [] }));
  }, []);

  const getMarkerAtTime = useCallback(
    (time: number, tolerance = 0.1): TimelineMarker | null => {
      return state.markers.find((m) => Math.abs(m.time - time) <= tolerance) || null;
    },
    [state.markers]
  );

  // Regions
  const addRegion = useCallback(
    (region: Omit<TimelineRegion, 'id'>): string => {
      const id = generateId();
      const fullRegion: TimelineRegion = { ...region, id };
      setState((prev) => ({
        ...prev,
        regions: [...prev.regions, fullRegion],
      }));
      onRegionChange?.(fullRegion);
      return id;
    },
    [onRegionChange]
  );

  const removeRegion = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      regions: prev.regions.filter((r) => r.id !== id),
    }));
  }, []);

  const updateRegion = useCallback(
    (id: string, updates: Partial<TimelineRegion>) => {
      setState((prev) => ({
        ...prev,
        regions: prev.regions.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      }));
      const region = state.regions.find((r) => r.id === id);
      if (region) {
        onRegionChange?.({ ...region, ...updates });
      }
    },
    [state.regions, onRegionChange]
  );

  const clearRegions = useCallback(() => {
    setState((prev) => ({ ...prev, regions: [] }));
  }, []);

  // In/Out Points
  const setInPoint = useCallback((time: number | null) => {
    setState((prev) => ({ ...prev, inPoint: time }));
  }, []);

  const setOutPoint = useCallback((time: number | null) => {
    setState((prev) => ({ ...prev, outPoint: time }));
  }, []);

  const clearInOutPoints = useCallback(() => {
    setState((prev) => ({ ...prev, inPoint: null, outPoint: null }));
  }, []);

  const getSelectedDuration = useCallback((): number | null => {
    if (state.inPoint !== null && state.outPoint !== null) {
      return Math.abs(state.outPoint - state.inPoint);
    }
    return null;
  }, [state.inPoint, state.outPoint]);

  // Snapping
  const setSnapEnabled = useCallback((enabled: boolean) => {
    setState((prev) => ({ ...prev, snapEnabled: enabled }));
  }, []);

  const toggleSnap = useCallback(() => {
    setState((prev) => ({ ...prev, snapEnabled: !prev.snapEnabled }));
  }, []);

  const getSnappedTime = useCallback(
    (time: number, excludeMarkers: string[] = []): number => {
      if (!state.snapEnabled) return time;

      const snapPoints: number[] = [
        0, // Start
        state.duration, // End
        ...state.markers.filter((m) => !excludeMarkers.includes(m.id)).map((m) => m.time),
      ];

      // Add in/out points if set
      if (state.inPoint !== null) snapPoints.push(state.inPoint);
      if (state.outPoint !== null) snapPoints.push(state.outPoint);

      const pixelThreshold = state.snapThreshold / pixelsPerSecond;

      for (const point of snapPoints) {
        if (Math.abs(time - point) <= pixelThreshold) {
          return point;
        }
      }

      return time;
    },
    [
      state.snapEnabled,
      state.duration,
      state.markers,
      state.inPoint,
      state.outPoint,
      state.snapThreshold,
      pixelsPerSecond,
    ]
  );

  // Coordinate Conversion
  const timeToPixels = useCallback(
    (time: number): number => {
      return time * pixelsPerSecond;
    },
    [pixelsPerSecond]
  );

  const pixelsToTime = useCallback(
    (pixels: number): number => {
      return pixels / pixelsPerSecond;
    },
    [pixelsPerSecond]
  );

  const getVisibleTimeRange = useCallback(
    (containerWidth: number): { start: number; end: number } => {
      const startTime = state.scrollPosition / pixelsPerSecond;
      const endTime = (state.scrollPosition + containerWidth) / pixelsPerSecond;
      return {
        start: Math.max(0, startTime),
        end: Math.min(state.duration, endTime),
      };
    },
    [state.scrollPosition, pixelsPerSecond, state.duration]
  );

  // Formatting
  const formatTime = useCallback(
    (time: number, format: 'full' | 'short' | 'frames' = 'full'): string => {
      const totalSeconds = Math.floor(time);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const frames = Math.floor((time % 1) * fps);

      switch (format) {
        case 'frames':
          return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
        case 'short':
          if (hours > 0) {
            return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
          }
          return `${minutes}:${String(seconds).padStart(2, '0')}`;
        case 'full':
        default:
          return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }
    },
    [fps]
  );

  const parseTime = useCallback((timeString: string): number => {
    const parts = timeString.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parseFloat(timeString) || 0;
  }, []);

  // Duration
  const setDuration = useCallback((duration: number) => {
    setState((prev) => ({ ...prev, duration: Math.max(0, duration) }));
  }, []);

  // Dragging
  const setDragging = useCallback((isDragging: boolean) => {
    setState((prev) => ({ ...prev, isDragging }));
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (playbackRafRef.current) {
        cancelAnimationFrame(playbackRafRef.current);
        playbackRafRef.current = null;
      }
    };
  }, []);

  return {
    state,

    setCurrentTime,
    seekToStart,
    seekToEnd,
    seekForward,
    seekBackward,
    seekToNextMarker,
    seekToPreviousMarker,

    play,
    pause,
    togglePlayback,
    setPlaying,

    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToView,
    setScrollPosition,
    scrollToTime,

    addMarker,
    removeMarker,
    updateMarker,
    clearMarkers,
    getMarkerAtTime,

    addRegion,
    removeRegion,
    updateRegion,
    clearRegions,

    setInPoint,
    setOutPoint,
    clearInOutPoints,
    getSelectedDuration,

    setSnapEnabled,
    toggleSnap,
    getSnappedTime,

    timeToPixels,
    pixelsToTime,
    getVisibleTimeRange,

    formatTime,
    parseTime,

    setDuration,
    setDragging,

    timelineRef,
    playheadRef,
  };
}

export default useVideoTimeline;
