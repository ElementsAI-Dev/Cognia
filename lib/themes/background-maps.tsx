/**
 * Shared background image maps, types, and components for UI containers.
 *
 * Centralizes the fit/position CSS maps that were previously duplicated in:
 * - components/ui/card.tsx
 * - components/ui/sidebar.tsx
 * - lib/themes/presets.ts (applyBackgroundSettings)
 * - components/layout/shell/background-renderer.tsx
 */

import type { CSSProperties } from 'react';

import type { BackgroundImagePosition } from './presets';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Unified background-size fit type.
 * Superset of theme-level BackgroundImageFit ('tile') and component-level
 * values ('none', 'scale-down').
 */
export type ComponentBackgroundFit =
  | 'cover'
  | 'contain'
  | 'fill'
  | 'none'
  | 'scale-down'
  | 'tile';

// Re-export position type so consumers only need one import source.
export type { BackgroundImagePosition } from './presets';

// ---------------------------------------------------------------------------
// CSS value maps
// ---------------------------------------------------------------------------

/** Maps a fit value to the CSS `background-size` value. */
export const BACKGROUND_SIZE_MAP: Record<ComponentBackgroundFit, string> = {
  cover: 'cover',
  contain: 'contain',
  fill: '100% 100%',
  none: 'auto',
  'scale-down': 'contain',
  tile: 'auto',
};

/** Maps a position value to the CSS `background-position` value. */
export const BACKGROUND_POSITION_MAP: Record<BackgroundImagePosition, string> = {
  center: 'center center',
  top: 'center top',
  bottom: 'center bottom',
  left: 'left center',
  right: 'right center',
  'top-left': 'left top',
  'top-right': 'right top',
  'bottom-left': 'left bottom',
  'bottom-right': 'right bottom',
};

// ---------------------------------------------------------------------------
// Shared props interface
// ---------------------------------------------------------------------------

/** Background image props shared across container components (Card, Dialog, Sheet, etc.). */
export interface ComponentBackgroundProps {
  backgroundImage?: string;
  backgroundFit?: ComponentBackgroundFit;
  backgroundPosition?: BackgroundImagePosition;
  backgroundOpacity?: number;
  backgroundOverlay?: boolean;
  backgroundOverlayColor?: string;
  backgroundBlur?: number;
}

// ---------------------------------------------------------------------------
// Style builder
// ---------------------------------------------------------------------------

/** Build the inline CSS for the background image layer div. */
export function buildBackgroundStyle(
  image: string,
  fit: ComponentBackgroundFit,
  position: BackgroundImagePosition,
): CSSProperties {
  return {
    backgroundImage: `url(${image})`,
    backgroundSize: BACKGROUND_SIZE_MAP[fit],
    backgroundPosition: BACKGROUND_POSITION_MAP[position],
    backgroundRepeat: fit === 'tile' ? 'repeat' : 'no-repeat',
  };
}

// ---------------------------------------------------------------------------
// BackgroundImageLayer component
// ---------------------------------------------------------------------------

interface BackgroundImageLayerProps {
  image: string;
  fit?: ComponentBackgroundFit;
  position?: BackgroundImagePosition;
  opacity?: number;
  blur?: number;
  overlay?: boolean;
  overlayColor?: string;
}

/**
 * Renders an absolute-positioned background image layer with optional blur
 * and color overlay.  Designed to be placed inside a `relative overflow-hidden`
 * container.
 */
export function BackgroundImageLayer({
  image,
  fit = 'cover',
  position = 'center',
  opacity = 1,
  blur = 0,
  overlay = false,
  overlayColor = 'rgba(0,0,0,0.4)',
}: BackgroundImageLayerProps) {
  const bgStyle = buildBackgroundStyle(image, fit, position);

  return (
    <>
      <div
        className="absolute inset-0 -z-10"
        style={{
          ...bgStyle,
          opacity,
          filter: blur > 0 ? `blur(${blur}px)` : undefined,
        }}
      />
      {overlay && (
        <div
          className="absolute inset-0 -z-10"
          style={{ backgroundColor: overlayColor }}
        />
      )}
    </>
  );
}
