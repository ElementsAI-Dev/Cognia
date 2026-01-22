/**
 * Tests for useIsMobile hook
 */

import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from './use-mobile';

describe('useIsMobile', () => {
  const originalInnerWidth = window.innerWidth;
  const originalMatchMedia = window.matchMedia;

  let mediaQueryListeners: Map<string, Set<(e: MediaQueryListEvent) => void>>;

  beforeEach(() => {
    mediaQueryListeners = new Map();

    // Mock matchMedia
    window.matchMedia = jest.fn().mockImplementation((query: string) => {
      const listeners = new Set<(e: MediaQueryListEvent) => void>();
      mediaQueryListeners.set(query, listeners);

      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn((_event: string, listener: (e: MediaQueryListEvent) => void) => {
          listeners.add(listener);
        }),
        removeEventListener: jest.fn(
          (_event: string, listener: (e: MediaQueryListEvent) => void) => {
            listeners.delete(listener);
          }
        ),
        dispatchEvent: jest.fn(),
      };
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    window.matchMedia = originalMatchMedia;
  });

  it('should return false for desktop width', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it('should return true for mobile width', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it('should return false for tablet width (768px)', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it('should return true for width just below breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 767,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it('should update on resize', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    // Simulate resize to mobile
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      // Trigger the change event
      const query = '(max-width: 767px)';
      const listeners = mediaQueryListeners.get(query);
      if (listeners) {
        listeners.forEach((listener) => {
          listener({ matches: true } as MediaQueryListEvent);
        });
      }
    });

    expect(result.current).toBe(true);
  });

  it('should clean up event listener on unmount', () => {
    const { unmount } = renderHook(() => useIsMobile());

    const mockMql = (window.matchMedia as jest.Mock).mock.results[0]?.value;

    unmount();

    // Verify removeEventListener was called
    expect(mockMql?.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
