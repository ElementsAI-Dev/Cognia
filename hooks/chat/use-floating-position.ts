"use client";

/**
 * useFloatingPosition Hook
 * Calculates optimal position and expand direction for the floating chat panel
 * Supports multi-screen setups and adapts to available screen space
 */

import { useState, useEffect, useCallback, useMemo } from "react";

export type FabPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left";
export type PanelExpandDirection = "up" | "down" | "left" | "right";

interface ScreenInfo {
  width: number;
  height: number;
  availWidth: number;
  availHeight: number;
  left: number;
  top: number;
}

interface FloatingPositionConfig {
  fabPosition: FabPosition;
  panelWidth: number;
  panelHeight: number;
  fabOffset?: { x: number; y: number };
  minMargin?: number;
}

interface FloatingPositionResult {
  fabPosition: FabPosition;
  expandDirection: PanelExpandDirection;
  fabOffset: { x: number; y: number };
  screenInfo: ScreenInfo;
  canExpandUp: boolean;
  canExpandDown: boolean;
  canExpandLeft: boolean;
  canExpandRight: boolean;
  updatePosition: () => void;
}

const DEFAULT_CONFIG: Partial<FloatingPositionConfig> = {
  fabOffset: { x: 0, y: 0 },
  minMargin: 20,
};

/**
 * Get current screen information
 * Handles multi-monitor setups by using window.screen
 */
function getScreenInfo(): ScreenInfo {
  if (typeof window === "undefined") {
    return {
      width: 1920,
      height: 1080,
      availWidth: 1920,
      availHeight: 1040,
      left: 0,
      top: 0,
    };
  }

  const screen = window.screen;
  return {
    width: screen.width,
    height: screen.height,
    availWidth: screen.availWidth,
    availHeight: screen.availHeight,
    // screenX and screenY give position on multi-monitor setup
    left: window.screenX || window.screenLeft || 0,
    top: window.screenY || window.screenTop || 0,
  };
}

/**
 * Get viewport dimensions
 */
function getViewportInfo() {
  if (typeof window === "undefined") {
    return { width: 1920, height: 1080 };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

/**
 * Calculate available space in each direction from FAB
 */
function calculateAvailableSpace(
  fabPosition: FabPosition,
  viewport: { width: number; height: number },
  fabSize: number = 56,
  fabOffset: number = 24
) {
  const isRight = fabPosition.includes("right");
  const isBottom = fabPosition.includes("bottom");

  // FAB position in viewport
  const fabX = isRight ? viewport.width - fabOffset - fabSize : fabOffset + fabSize;
  const fabY = isBottom ? viewport.height - fabOffset - fabSize : fabOffset + fabSize;

  return {
    up: isBottom ? viewport.height - fabOffset - fabSize - 16 : fabY - 16,
    down: isBottom ? fabY - 16 : viewport.height - fabOffset - fabSize - 16,
    left: isRight ? viewport.width - fabOffset - fabSize - 16 : fabX - 16,
    right: isRight ? fabX - 16 : viewport.width - fabOffset - fabSize - 16,
  };
}

/**
 * Determine best expand direction based on available space and panel dimensions
 */
function determineExpandDirection(
  fabPosition: FabPosition,
  panelWidth: number,
  panelHeight: number,
  availableSpace: ReturnType<typeof calculateAvailableSpace>
): PanelExpandDirection {
  const _isRight = fabPosition.includes("right");
  const isBottom = fabPosition.includes("bottom");

  // Check if we have enough space in preferred direction
  const canExpandUp = availableSpace.up >= panelHeight;
  const canExpandDown = availableSpace.down >= panelHeight;

  // For bottom FAB positions, prefer expanding up
  if (isBottom) {
    if (canExpandUp) return "up";
    if (canExpandDown) return "down";
  } else {
    // For top FAB positions, prefer expanding down
    if (canExpandDown) return "down";
    if (canExpandUp) return "up";
  }

  // Fallback: use the direction with more space
  return availableSpace.up >= availableSpace.down ? "up" : "down";
}

/**
 * Hook to manage floating position with adaptive behavior
 */
export function useFloatingPosition(
  config: FloatingPositionConfig
): FloatingPositionResult {
  const mergedConfig = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...config }),
    [config]
  );

  const [screenInfo, setScreenInfo] = useState<ScreenInfo>(getScreenInfo);
  const [viewport, setViewport] = useState(getViewportInfo);

  // Update screen and viewport info
  const updatePosition = useCallback(() => {
    setScreenInfo(getScreenInfo());
    setViewport(getViewportInfo());
  }, []);

  // Listen for window resize and move
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Update on resize
    const handleResize = () => updatePosition();

    // Update when window moves (for multi-monitor)
    let lastScreenX = window.screenX;
    let lastScreenY = window.screenY;
    let animationFrameId: number;

    const checkWindowMove = () => {
      if (window.screenX !== lastScreenX || window.screenY !== lastScreenY) {
        lastScreenX = window.screenX;
        lastScreenY = window.screenY;
        updatePosition();
      }
      animationFrameId = requestAnimationFrame(checkWindowMove);
    };

    window.addEventListener("resize", handleResize);
    animationFrameId = requestAnimationFrame(checkWindowMove);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [updatePosition]);

  // Calculate available space and expand direction
  const availableSpace = useMemo(
    () => calculateAvailableSpace(mergedConfig.fabPosition, viewport),
    [mergedConfig.fabPosition, viewport]
  );

  const expandDirection = useMemo(
    () =>
      determineExpandDirection(
        mergedConfig.fabPosition,
        mergedConfig.panelWidth,
        mergedConfig.panelHeight,
        availableSpace
      ),
    [
      mergedConfig.fabPosition,
      mergedConfig.panelWidth,
      mergedConfig.panelHeight,
      availableSpace,
    ]
  );

  // Check what directions are possible
  const canExpandUp = availableSpace.up >= mergedConfig.panelHeight;
  const canExpandDown = availableSpace.down >= mergedConfig.panelHeight;
  const canExpandLeft = availableSpace.left >= mergedConfig.panelWidth;
  const canExpandRight = availableSpace.right >= mergedConfig.panelWidth;

  return {
    fabPosition: mergedConfig.fabPosition,
    expandDirection,
    fabOffset: mergedConfig.fabOffset!,
    screenInfo,
    canExpandUp,
    canExpandDown,
    canExpandLeft,
    canExpandRight,
    updatePosition,
  };
}

export default useFloatingPosition;
