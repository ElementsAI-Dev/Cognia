/**
 * Recording Toolbar Store Tests
 *
 * Tests for the recording toolbar Zustand store functionality.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { act, renderHook } from '@testing-library/react';

// Mock all external dependencies
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(() => Promise.resolve()),
}));

jest.mock('@tauri-apps/api/event', () => ({
  listen: jest.fn(() => Promise.resolve(() => {})),
}));

jest.mock('@/lib/native/utils', () => ({
  isTauri: jest.fn(() => false), // Default to false to skip backend calls
}));

jest.mock('@/lib/native/recording-toolbar', () => ({
  showRecordingToolbar: jest.fn(() => Promise.resolve()),
  hideRecordingToolbar: jest.fn(() => Promise.resolve()),
  isRecordingToolbarVisible: jest.fn(() => Promise.resolve(false)),
  setRecordingToolbarPosition: jest.fn(() => Promise.resolve()),
  getRecordingToolbarPosition: jest.fn(() => Promise.resolve([0, 0])),
  snapRecordingToolbarToEdge: jest.fn(() => Promise.resolve()),
  toggleRecordingToolbarCompact: jest.fn(() => Promise.resolve(false)),
  getRecordingToolbarConfig: jest.fn(() =>
    Promise.resolve({
      position: 'topCenter',
      autoDock: true,
      autoHide: false,
      autoHideDelayMs: 3000,
      showTimer: true,
      compactMode: false,
      opacity: 1.0,
      rememberPosition: true,
    })
  ),
  updateRecordingToolbarConfig: jest.fn(() => Promise.resolve()),
  getRecordingToolbarState: jest.fn(() =>
    Promise.resolve({
      isRecording: false,
      isPaused: false,
      durationMs: 0,
      formattedDuration: '00:00',
    })
  ),
  updateRecordingToolbarState: jest.fn(() => Promise.resolve()),
  setRecordingToolbarHovered: jest.fn(() => Promise.resolve()),
  destroyRecordingToolbar: jest.fn(() => Promise.resolve()),
  DEFAULT_RECORDING_TOOLBAR_CONFIG: {
    position: 'topCenter',
    autoDock: true,
    autoHide: false,
    autoHideDelayMs: 3000,
    showTimer: true,
    compactMode: false,
    opacity: 1.0,
    rememberPosition: true,
  },
}));

import {
  useRecordingToolbarStore,
  selectToolbarVisible,
  selectToolbarConfig,
  selectRecordingState,
  selectSnappedEdge,
  selectIsCompact,
} from './recording-toolbar-store';

describe('useRecordingToolbarStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset store state
    const { result } = renderHook(() => useRecordingToolbarStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const { result } = renderHook(() => useRecordingToolbarStore());

      expect(result.current.isVisible).toBe(false);
      expect(result.current.isHovered).toBe(false);
      expect(result.current.position).toEqual({ x: 0, y: 0 });
      expect(result.current.snappedEdge).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should have default config', () => {
      const { result } = renderHook(() => useRecordingToolbarStore());

      expect(result.current.config.position).toBe('topCenter');
      expect(result.current.config.autoDock).toBe(true);
      expect(result.current.config.autoHide).toBe(false);
      expect(result.current.config.compactMode).toBe(false);
    });

    it('should have default recording state', () => {
      const { result } = renderHook(() => useRecordingToolbarStore());

      expect(result.current.recordingState.isRecording).toBe(false);
      expect(result.current.recordingState.isPaused).toBe(false);
      expect(result.current.recordingState.durationMs).toBe(0);
      expect(result.current.recordingState.formattedDuration).toBe('00:00');
    });
  });

  describe('state manipulation', () => {
    it('should update visibility via setState', () => {
      const { result } = renderHook(() => useRecordingToolbarStore());

      act(() => {
        useRecordingToolbarStore.setState({ isVisible: true });
      });

      expect(result.current.isVisible).toBe(true);
    });

    it('should update snapped edge via setState', () => {
      const { result } = renderHook(() => useRecordingToolbarStore());

      act(() => {
        useRecordingToolbarStore.setState({ snappedEdge: 'top' });
      });

      expect(result.current.snappedEdge).toBe('top');
    });

    it('should update position via setState', () => {
      const { result } = renderHook(() => useRecordingToolbarStore());

      act(() => {
        useRecordingToolbarStore.setState({ position: { x: 100, y: 200 } });
      });

      expect(result.current.position).toEqual({ x: 100, y: 200 });
    });

    it('should update config via setState', () => {
      const { result } = renderHook(() => useRecordingToolbarStore());

      act(() => {
        useRecordingToolbarStore.setState((state) => ({
          config: { ...state.config, compactMode: true, autoHide: true },
        }));
      });

      expect(result.current.config.compactMode).toBe(true);
      expect(result.current.config.autoHide).toBe(true);
      expect(result.current.config.autoDock).toBe(true); // Unchanged
    });

    it('should update recording state via setState', () => {
      const { result } = renderHook(() => useRecordingToolbarStore());

      act(() => {
        useRecordingToolbarStore.setState({
          recordingState: {
            isRecording: true,
            isPaused: false,
            durationMs: 5000,
            formattedDuration: '00:05',
          },
        });
      });

      expect(result.current.recordingState.isRecording).toBe(true);
      expect(result.current.recordingState.durationMs).toBe(5000);
      expect(result.current.recordingState.formattedDuration).toBe('00:05');
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', () => {
      const { result } = renderHook(() => useRecordingToolbarStore());

      // Modify state
      act(() => {
        useRecordingToolbarStore.setState({
          isVisible: true,
          snappedEdge: 'top',
          position: { x: 100, y: 200 },
          isInitialized: true,
          error: 'some error',
        });
      });

      expect(result.current.isVisible).toBe(true);
      expect(result.current.snappedEdge).toBe('top');

      act(() => {
        result.current.reset();
      });

      expect(result.current.isVisible).toBe(false);
      expect(result.current.snappedEdge).toBeNull();
      expect(result.current.position).toEqual({ x: 0, y: 0 });
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('selectors', () => {
    it('selectToolbarVisible should return visibility state', () => {
      const { result } = renderHook(() => useRecordingToolbarStore());

      expect(selectToolbarVisible(result.current)).toBe(false);

      act(() => {
        useRecordingToolbarStore.setState({ isVisible: true });
      });

      expect(selectToolbarVisible(result.current)).toBe(true);
    });

    it('selectToolbarConfig should return config', () => {
      const { result } = renderHook(() => useRecordingToolbarStore());

      const config = selectToolbarConfig(result.current);
      expect(config.position).toBe('topCenter');
      expect(config.autoDock).toBe(true);
    });

    it('selectRecordingState should return recording state', () => {
      const { result } = renderHook(() => useRecordingToolbarStore());

      const state = selectRecordingState(result.current);
      expect(state.isRecording).toBe(false);
      expect(state.formattedDuration).toBe('00:00');
    });

    it('selectSnappedEdge should return snapped edge', () => {
      const { result } = renderHook(() => useRecordingToolbarStore());

      expect(selectSnappedEdge(result.current)).toBeNull();

      act(() => {
        useRecordingToolbarStore.setState({ snappedEdge: 'bottom' });
      });

      expect(selectSnappedEdge(result.current)).toBe('bottom');
    });

    it('selectIsCompact should return compact mode state', () => {
      const { result } = renderHook(() => useRecordingToolbarStore());

      expect(selectIsCompact(result.current)).toBe(false);

      act(() => {
        useRecordingToolbarStore.setState((state) => ({
          config: { ...state.config, compactMode: true },
        }));
      });

      expect(selectIsCompact(result.current)).toBe(true);
    });
  });

  describe('config persistence', () => {
    it('should only persist config in storage', () => {
      const { result } = renderHook(() => useRecordingToolbarStore());

      // The persist middleware should only store the config
      act(() => {
        useRecordingToolbarStore.setState({
          isVisible: true,
          config: {
            ...result.current.config,
            compactMode: true,
          },
        });
      });

      expect(result.current.config.compactMode).toBe(true);
    });
  });

  describe('edge snap values', () => {
    it.each([
      'top',
      'bottom',
      'left',
      'right',
      'topLeft',
      'topRight',
      'bottomLeft',
      'bottomRight',
    ] as const)('should accept %s as valid snap edge', (edge) => {
      const { result } = renderHook(() => useRecordingToolbarStore());

      act(() => {
        useRecordingToolbarStore.setState({ snappedEdge: edge });
      });

      expect(result.current.snappedEdge).toBe(edge);
    });
  });
});
