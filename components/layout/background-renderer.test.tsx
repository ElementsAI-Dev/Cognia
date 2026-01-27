'use client';

import React from 'react';
import { render } from '@testing-library/react';
import { BackgroundRenderer } from './background-renderer';

jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn((selector) => {
    const state = {
      backgroundSettings: {
        enabled: true,
        mode: 'layers',
        layers: [
          {
            id: 'test-layer',
            enabled: true,
            source: 'url',
            imageUrl: 'https://example.com/bg.jpg',
            opacity: 80,
            blur: 0,
            brightness: 100,
            saturation: 100,
            contrast: 100,
            grayscale: 0,
            fit: 'cover',
            position: 'center',
            attachment: 'fixed',
            overlayOpacity: 0,
            overlayColor: '#000000',
            animation: 'none',
            animationSpeed: 5,
          },
        ],
        slideshow: {
          slides: [],
          intervalMs: 5000,
          transitionMs: 500,
          shuffle: false,
        },
      },
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

jest.mock('@/lib/native/utils', () => ({
  isTauri: () => false,
}));

describe('BackgroundRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when enabled', () => {
    const { container } = render(<BackgroundRenderer />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders layer with correct styles', () => {
    const { container } = render(<BackgroundRenderer />);
    const layer = container.querySelector('[style*="backgroundImage"]');
    expect(layer).toBeInTheDocument();
  });

  it('applies opacity to layers', () => {
    const { container } = render(<BackgroundRenderer />);
    const layer = container.querySelector('[style*="opacity"]');
    expect(layer).toBeInTheDocument();
  });

  it('has aria-hidden attribute', () => {
    const { container } = render(<BackgroundRenderer />);
    expect(container.firstChild).toHaveAttribute('aria-hidden');
  });

  it('applies fixed positioning', () => {
    const { container } = render(<BackgroundRenderer />);
    expect(container.firstChild).toHaveStyle({ position: 'fixed' });
  });
});
