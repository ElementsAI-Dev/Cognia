'use client';

import React from 'react';
import { act, render } from '@testing-library/react';
import { BackgroundRenderer } from './background-renderer';
import { DEFAULT_BACKGROUND_SETTINGS, type BackgroundSettings } from '@/lib/themes';

let prefersReducedMotion = false;
const mediaListeners = new Set<() => void>();

let mockBackgroundSettings: BackgroundSettings = {
  ...DEFAULT_BACKGROUND_SETTINGS,
  enabled: true,
  mode: 'layers',
  layers: [
    {
      ...DEFAULT_BACKGROUND_SETTINGS.layers[0],
      id: 'layer-1',
      enabled: true,
      source: 'url' as const,
      imageUrl: 'https://example.com/a.jpg',
    },
  ],
};

jest.mock('@/lib/native/utils', () => ({
  isTauri: () => false,
}));

jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn((selector: (state: { backgroundSettings: BackgroundSettings }) => unknown) =>
    selector({ backgroundSettings: mockBackgroundSettings })
  ),
}));

describe('BackgroundRenderer', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        get matches() {
          return prefersReducedMotion;
        },
        addEventListener: (_event: string, listener: () => void) => mediaListeners.add(listener),
        removeEventListener: (_event: string, listener: () => void) => mediaListeners.delete(listener),
      })),
    });

    Object.defineProperty(window, 'requestAnimationFrame', {
      writable: true,
      value: (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 0),
    });
    Object.defineProperty(window, 'cancelAnimationFrame', {
      writable: true,
      value: (id: number) => window.clearTimeout(id),
    });
  });

  beforeEach(() => {
    jest.useFakeTimers();
    prefersReducedMotion = false;
    mediaListeners.clear();
    mockBackgroundSettings = {
      ...DEFAULT_BACKGROUND_SETTINGS,
      enabled: true,
      mode: 'layers',
      layers: [
        {
          ...DEFAULT_BACKGROUND_SETTINGS.layers[0],
          id: 'layer-1',
          enabled: true,
          source: 'url',
          imageUrl: 'https://example.com/a.jpg',
          animation: 'none',
        },
      ],
    };
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('renders when enabled', () => {
    const { container } = render(<BackgroundRenderer />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('does not render when no layer is actually renderable', () => {
    mockBackgroundSettings = {
      ...DEFAULT_BACKGROUND_SETTINGS,
      enabled: true,
      mode: 'layers',
      layers: [
        {
          ...DEFAULT_BACKGROUND_SETTINGS.layers[0],
          id: 'layer-empty',
          enabled: true,
          source: 'url',
          imageUrl: '',
        },
      ],
    };

    const { container } = render(<BackgroundRenderer />);
    expect(container.firstChild).toBeNull();
  });

  it('has aria-hidden attribute', () => {
    const { container } = render(<BackgroundRenderer />);
    expect(container.firstChild).toHaveAttribute('aria-hidden');
  });

  it('applies fixed positioning', () => {
    const { container } = render(<BackgroundRenderer />);
    expect(container.firstChild).toHaveStyle({ position: 'fixed' });
  });

  it('uses slideshow crossfade with previous and current layers', () => {
    mockBackgroundSettings = {
      ...DEFAULT_BACKGROUND_SETTINGS,
      enabled: true,
      mode: 'slideshow' as BackgroundSettings['mode'],
      slideshow: {
        ...DEFAULT_BACKGROUND_SETTINGS.slideshow,
        intervalMs: 1000,
        transitionMs: 400,
        shuffle: false,
        slides: [
          {
            ...DEFAULT_BACKGROUND_SETTINGS.layers[0],
            id: 'slide-1',
            enabled: true,
            source: 'url',
            imageUrl: 'https://example.com/a.jpg',
          },
          {
            ...DEFAULT_BACKGROUND_SETTINGS.layers[0],
            id: 'slide-2',
            enabled: true,
            source: 'url',
            imageUrl: 'https://example.com/b.jpg',
          },
        ],
      },
    };

    const { container } = render(<BackgroundRenderer />);

    expect(container.querySelectorAll('[data-bg-render-layer="true"]')).toHaveLength(1);

    act(() => {
      jest.advanceTimersByTime(1000);
      jest.advanceTimersByTime(1);
    });

    expect(container.querySelectorAll('[data-bg-render-layer="true"]')).toHaveLength(2);

    act(() => {
      jest.advanceTimersByTime(450);
    });

    expect(container.querySelectorAll('[data-bg-render-layer="true"]')).toHaveLength(1);
  });

  it('shuffle avoids repeating current slide', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    mockBackgroundSettings = {
      ...DEFAULT_BACKGROUND_SETTINGS,
      enabled: true,
      mode: 'slideshow' as BackgroundSettings['mode'],
      slideshow: {
        ...DEFAULT_BACKGROUND_SETTINGS.slideshow,
        intervalMs: 1000,
        transitionMs: 0,
        shuffle: true,
        slides: [
          {
            ...DEFAULT_BACKGROUND_SETTINGS.layers[0],
            id: 'slide-1',
            enabled: true,
            source: 'url',
            imageUrl: 'https://example.com/a.jpg',
          },
          {
            ...DEFAULT_BACKGROUND_SETTINGS.layers[0],
            id: 'slide-2',
            enabled: true,
            source: 'url',
            imageUrl: 'https://example.com/b.jpg',
          },
        ],
      },
    };

    const { container } = render(<BackgroundRenderer />);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(container.innerHTML).toContain('b.jpg');
  });

  it('ignores non-renderable slides in slideshow mode', () => {
    mockBackgroundSettings = {
      ...DEFAULT_BACKGROUND_SETTINGS,
      enabled: true,
      mode: 'slideshow',
      slideshow: {
        ...DEFAULT_BACKGROUND_SETTINGS.slideshow,
        intervalMs: 1200,
        transitionMs: 0,
        shuffle: false,
        slides: [
          {
            ...DEFAULT_BACKGROUND_SETTINGS.layers[0],
            id: 'slide-valid',
            enabled: true,
            source: 'url',
            imageUrl: 'https://example.com/valid.jpg',
          },
          {
            ...DEFAULT_BACKGROUND_SETTINGS.layers[0],
            id: 'slide-empty',
            enabled: true,
            source: 'url',
            imageUrl: '',
          },
        ],
      },
    };

    const { container } = render(<BackgroundRenderer />);

    act(() => {
      jest.advanceTimersByTime(1300);
    });

    expect(container.innerHTML).toContain('valid.jpg');
    expect(container.innerHTML).not.toContain('slide-empty');
  });

  it('disables transitions and animations when reduced motion is preferred', () => {
    prefersReducedMotion = true;
    mediaListeners.forEach((listener) => listener());

    mockBackgroundSettings = {
      ...DEFAULT_BACKGROUND_SETTINGS,
      enabled: true,
      mode: 'slideshow' as BackgroundSettings['mode'],
      slideshow: {
        ...DEFAULT_BACKGROUND_SETTINGS.slideshow,
        intervalMs: 1000,
        transitionMs: 500,
        shuffle: false,
        slides: [
          {
            ...DEFAULT_BACKGROUND_SETTINGS.layers[0],
            id: 'slide-1',
            enabled: true,
            source: 'url',
            imageUrl: 'https://example.com/a.jpg',
            animation: 'kenburns',
          },
          {
            ...DEFAULT_BACKGROUND_SETTINGS.layers[0],
            id: 'slide-2',
            enabled: true,
            source: 'url',
            imageUrl: 'https://example.com/b.jpg',
            animation: 'kenburns',
          },
        ],
      },
    };

    const { container } = render(<BackgroundRenderer />);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(container.querySelectorAll('[data-bg-render-layer="true"]')).toHaveLength(1);
    const layer = container.querySelector('[data-bg-render-layer="true"]');
    expect(layer?.getAttribute('style')).not.toContain('animation');
  });
});
