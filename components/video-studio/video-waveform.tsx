'use client';

/**
 * VideoWaveform - Audio waveform visualization component
 * 
 * Displays audio waveform data with:
 * - Visual amplitude bars
 * - Playhead indicator
 * - Selection region highlighting
 * - Click-to-seek interaction
 * 
 * Reuses patterns from chart components for consistent styling
 */

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';

export interface WaveformData {
  peaks: number[]; // Normalized amplitude values (0-1)
  duration: number; // Duration in seconds
  sampleRate?: number;
}

const DEFAULT_BAR_COUNT = 100;

export interface VideoWaveformProps {
  data: WaveformData | null;
  currentTime: number;
  duration: number;
  selectionStart?: number;
  selectionEnd?: number;
  isLoading?: boolean;
  color?: string;
  backgroundColor?: string;
  progressColor?: string;
  selectionColor?: string;
  barWidth?: number;
  barGap?: number;
  height?: number;
  onClick?: (time: number) => void;
  onSelectionChange?: (start: number, end: number) => void;
  className?: string;
}

export function VideoWaveform({
  data,
  currentTime,
  duration,
  selectionStart,
  selectionEnd,
  isLoading = false,
  color = 'hsl(var(--primary))',
  backgroundColor = 'hsl(var(--muted))',
  progressColor = 'hsl(var(--primary) / 0.7)',
  selectionColor = 'hsl(var(--primary) / 0.2)',
  barWidth = 2,
  barGap = 1,
  height = 60,
  onClick,
  onSelectionChange,
  className,
}: VideoWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStartX, setSelectionStartX] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  // Update container width on mount and resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      setContainerWidth(container.clientWidth);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Calculate number of bars based on container width
  const barCount = useMemo(() => {
    if (containerWidth <= 0) return DEFAULT_BAR_COUNT;
    return Math.floor(containerWidth / (barWidth + barGap));
  }, [containerWidth, barWidth, barGap]);

  // Resample waveform data to match bar count
  const sampledPeaks = useMemo(() => {
    if (!data?.peaks || data.peaks.length === 0) {
      // Generate deterministic placeholder data using sine wave pattern
      return Array.from({ length: barCount }, (_, i) => 
        0.2 + Math.abs(Math.sin(i * 0.3)) * 0.3
      );
    }

    const peaks = data.peaks;
    const sampledData: number[] = [];
    const samplesPerBar = peaks.length / barCount;

    for (let i = 0; i < barCount; i++) {
      const start = Math.floor(i * samplesPerBar);
      const end = Math.floor((i + 1) * samplesPerBar);
      let max = 0;

      for (let j = start; j < end && j < peaks.length; j++) {
        max = Math.max(max, Math.abs(peaks[j]));
      }

      sampledData.push(max);
    }

    return sampledData;
  }, [data, barCount]);

  // Draw waveform on canvas
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, height);

    // Calculate progress position
    const progressX = duration > 0 ? (currentTime / duration) * rect.width : 0;

    // Draw selection region if exists
    if (selectionStart !== undefined && selectionEnd !== undefined) {
      const startX = (selectionStart / duration) * rect.width;
      const endX = (selectionEnd / duration) * rect.width;
      ctx.fillStyle = selectionColor;
      ctx.fillRect(startX, 0, endX - startX, height);
    }

    // Draw bars
    const barTotalWidth = barWidth + barGap;
    const centerY = height / 2;

    sampledPeaks.forEach((peak, i) => {
      const x = i * barTotalWidth;
      const barHeight = Math.max(2, peak * (height - 4));
      const y = centerY - barHeight / 2;

      // Determine color based on progress
      if (x < progressX) {
        ctx.fillStyle = progressColor;
      } else {
        ctx.fillStyle = isLoading ? backgroundColor : color;
      }

      // Draw rounded bar
      const radius = barWidth / 2;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, radius);
      ctx.fill();
    });

    // Draw playhead
    ctx.fillStyle = 'hsl(var(--foreground))';
    ctx.fillRect(progressX - 1, 0, 2, height);
  }, [
    sampledPeaks,
    currentTime,
    duration,
    height,
    barWidth,
    barGap,
    color,
    backgroundColor,
    progressColor,
    selectionColor,
    selectionStart,
    selectionEnd,
    isLoading,
  ]);

  // Redraw on data change or container resize
  useEffect(() => {
    drawWaveform();
  }, [drawWaveform, containerWidth]);

  // Handle click to seek
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!onClick || !containerRef.current || isSelecting) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = (x / rect.width) * duration;

      onClick(Math.max(0, Math.min(duration, time)));
    },
    [onClick, duration, isSelecting]
  );

  // Handle selection
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!onSelectionChange || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;

      setIsSelecting(true);
      setSelectionStartX(x);
    },
    [onSelectionChange]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isSelecting || !onSelectionChange || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;

      const startTime = (Math.min(selectionStartX, x) / rect.width) * duration;
      const endTime = (Math.max(selectionStartX, x) / rect.width) * duration;

      onSelectionChange(
        Math.max(0, startTime),
        Math.min(duration, endTime)
      );
    },
    [isSelecting, onSelectionChange, selectionStartX, duration]
  );

  const handleMouseUp = useCallback(() => {
    setIsSelecting(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full cursor-pointer select-none',
        isLoading && 'animate-pulse',
        className
      )}
      style={{ height }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <span className="text-xs text-muted-foreground">Loading waveform...</span>
        </div>
      )}
    </div>
  );
}
