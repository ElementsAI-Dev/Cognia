/**
 * Tests for useDevice hook
 * Comprehensive test coverage for device detection utilities
 */

import { renderHook, act } from '@testing-library/react';
import { useDevice, useIsTouch } from './use-device';

// Mock window properties
const mockWindowDimensions = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', { value: width, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: height, writable: true });
};

// Mock touch support
const mockTouchSupport = (hasTouch: boolean) => {
  if (hasTouch) {
    Object.defineProperty(window, 'ontouchstart', {
      value: () => {},
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 5,
      writable: true,
      configurable: true,
    });
  } else {
    // Delete ontouchstart to simulate non-touch
    if ('ontouchstart' in window) {
      delete (window as unknown as Record<string, unknown>).ontouchstart;
    }
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 0,
      writable: true,
      configurable: true,
    });
  }
};

// Mock matchMedia
const createMockMatchMedia = (matches: boolean) => ({
  matches,
  media: '',
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
});

describe('useDevice', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to desktop defaults
    mockWindowDimensions(1920, 1080);
    mockTouchSupport(false);
    window.matchMedia = jest.fn().mockReturnValue(createMockMatchMedia(false));
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight, writable: true });
    window.matchMedia = originalMatchMedia;
  });

  describe('Device Type Detection', () => {
    it('should detect desktop by default', () => {
      mockWindowDimensions(1920, 1080);

      const { result } = renderHook(() => useDevice());

      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isMobile).toBe(false);
    });

    it('should detect mobile device', () => {
      mockWindowDimensions(375, 667);

      const { result } = renderHook(() => useDevice());

      expect(result.current.isMobile).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(false);
    });

    it('should detect tablet device', () => {
      mockWindowDimensions(768, 1024);

      const { result } = renderHook(() => useDevice());

      expect(result.current.isTablet).toBe(true);
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isDesktop).toBe(false);
    });
  });

  describe('Touch Detection', () => {
    it('should detect touch device', () => {
      mockTouchSupport(true);

      const { result } = renderHook(() => useDevice());

      expect(result.current.isTouchDevice).toBe(true);
    });

    it('should detect non-touch device', () => {
      mockTouchSupport(false);

      const { result } = renderHook(() => useDevice());

      expect(result.current.isTouchDevice).toBe(false);
    });
  });

  describe('Orientation Detection', () => {
    it('should detect landscape orientation', () => {
      mockWindowDimensions(1920, 1080);

      const { result } = renderHook(() => useDevice());

      expect(result.current.isLandscape).toBe(true);
    });

    it('should detect portrait orientation', () => {
      mockWindowDimensions(768, 1024);

      const { result } = renderHook(() => useDevice());

      expect(result.current.isLandscape).toBe(false);
    });
  });

  describe('Screen Dimensions', () => {
    it('should return correct screen width', () => {
      mockWindowDimensions(1440, 900);

      const { result } = renderHook(() => useDevice());

      expect(result.current.screenWidth).toBe(1440);
    });

    it('should return correct screen height', () => {
      mockWindowDimensions(1440, 900);

      const { result } = renderHook(() => useDevice());

      expect(result.current.screenHeight).toBe(900);
    });
  });

  describe('Responsive Updates', () => {
    it('should update on window resize', () => {
      mockWindowDimensions(1920, 1080);

      const { result } = renderHook(() => useDevice());

      expect(result.current.isDesktop).toBe(true);

      // Simulate resize to mobile
      act(() => {
        mockWindowDimensions(375, 667);
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current.isMobile).toBe(true);
    });

    it('should attach resize listener', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

      renderHook(() => useDevice());

      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('should remove resize listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useDevice());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });

  describe('Media Query Listeners', () => {
    it('should attach media query listeners', () => {
      const mockMQ = createMockMatchMedia(false);
      window.matchMedia = jest.fn().mockReturnValue(mockMQ);

      renderHook(() => useDevice());

      expect(mockMQ.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should remove media query listeners on unmount', () => {
      const mockMQ = createMockMatchMedia(false);
      window.matchMedia = jest.fn().mockReturnValue(mockMQ);

      const { unmount } = renderHook(() => useDevice());

      unmount();

      expect(mockMQ.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  describe('Breakpoints', () => {
    it('should use 640px as mobile breakpoint', () => {
      mockWindowDimensions(639, 800);
      const { result: mobileResult } = renderHook(() => useDevice());
      expect(mobileResult.current.isMobile).toBe(true);

      mockWindowDimensions(640, 800);
      const { result: tabletResult } = renderHook(() => useDevice());
      expect(tabletResult.current.isTablet).toBe(true);
    });

    it('should use 1024px as tablet/desktop breakpoint', () => {
      mockWindowDimensions(1023, 800);
      const { result: tabletResult } = renderHook(() => useDevice());
      expect(tabletResult.current.isTablet).toBe(true);

      mockWindowDimensions(1024, 800);
      const { result: desktopResult } = renderHook(() => useDevice());
      expect(desktopResult.current.isDesktop).toBe(true);
    });
  });
});

describe('useIsTouch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true for touch device', () => {
    mockTouchSupport(true);

    const { result } = renderHook(() => useIsTouch());

    expect(result.current).toBe(true);
  });

  it('should return false for non-touch device', () => {
    mockTouchSupport(false);

    const { result } = renderHook(() => useIsTouch());

    expect(result.current).toBe(false);
  });

  it('should detect touch via ontouchstart', () => {
    Object.defineProperty(window, 'ontouchstart', {
      value: () => {},
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 0,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useIsTouch());

    expect(result.current).toBe(true);
  });

  it('should detect touch via maxTouchPoints', () => {
    // Remove ontouchstart
    Object.defineProperty(window, 'ontouchstart', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 10,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useIsTouch());

    expect(result.current).toBe(true);
  });
});
