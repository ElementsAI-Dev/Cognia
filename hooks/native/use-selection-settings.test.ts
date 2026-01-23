/**
 * Tests for useSelectionSettings hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSelectionSettings } from './use-selection-settings';
import { useSelectionStore } from '@/stores/context/selection-store';
import { isTauri } from '@/lib/native/utils';

// Mock the selection store with factory function
let mockSetEnabled: jest.MockedFunction<(enabled: boolean) => void>;
const mockUseSelectionStore = useSelectionStore as jest.MockedFunction<typeof useSelectionStore>;

jest.mock('@/stores/context/selection-store', () => ({
  useSelectionStore: jest.fn(),
}));

// Mock native utils
jest.mock('@/lib/native/utils', () => ({
  isTauri: jest.fn(() => true),
}));

// Mock Tauri invoke function
const mockInvoke = jest.fn();
jest.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

const mockIsTauri = isTauri as jest.MockedFunction<typeof isTauri>;

describe('useSelectionSettings', () => {
  const mockConfig = {
    enabled: true,
    trigger_mode: 'auto',
    min_text_length: 1,
    max_text_length: 5000,
    delay_ms: 200,
    target_language: 'zh-CN',
    excluded_apps: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
    
    // Initialize mock functions
    mockSetEnabled = jest.fn();
    mockUseSelectionStore.mockReturnValue({
      isEnabled: true,
      setEnabled: mockSetEnabled,
    } as ReturnType<typeof useSelectionStore>);
  });

  describe('initialization', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useSelectionSettings());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should load config from backend on mount', async () => {
      mockInvoke.mockResolvedValueOnce(mockConfig);

      renderHook(() => useSelectionSettings());

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('selection_get_config');
      });

      expect(mockSetEnabled).toHaveBeenCalledWith(mockConfig.enabled);
    });

    it('should set loading to false after successful load', async () => {
      mockInvoke.mockResolvedValueOnce(mockConfig);

      const { result } = renderHook(() => useSelectionSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle load error gracefully', async () => {
      const errorMessage = 'Failed to load config';
      mockInvoke.mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useSelectionSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe(errorMessage);
      });
    });

    it('should handle non-Error objects in error handling', async () => {
      mockInvoke.mockRejectedValueOnce('String error');

      const { result } = renderHook(() => useSelectionSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe('Failed to load settings');
      });
    });

    it('should not load from backend when not in Tauri environment', async () => {
      mockIsTauri.mockReturnValue(false);

      const { result } = renderHook(() => useSelectionSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe('setEnabled', () => {
    it('should set enabled state with backend sync', async () => {
      mockInvoke
        .mockResolvedValueOnce(mockConfig) // Initial load
        .mockResolvedValueOnce(undefined) // selection_set_enabled
        .mockResolvedValueOnce(undefined) // selection_save_config
        .mockResolvedValueOnce(undefined); // selection_start

      const { result } = renderHook(() => useSelectionSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.setEnabled(true);
      });

      expect(mockInvoke).toHaveBeenCalledWith('selection_set_enabled', { enabled: true });
      expect(mockInvoke).toHaveBeenCalledWith('selection_save_config');
      expect(mockInvoke).toHaveBeenCalledWith('selection_start');
      expect(mockSetEnabled).toHaveBeenCalledWith(true);
    });

    it('should stop selection service when disabling', async () => {
      mockInvoke
        .mockResolvedValueOnce(mockConfig) // Initial load
        .mockResolvedValueOnce(undefined) // selection_set_enabled
        .mockResolvedValueOnce(undefined) // selection_save_config
        .mockResolvedValueOnce(undefined); // selection_stop

      const { result } = renderHook(() => useSelectionSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.setEnabled(false);
      });

      expect(mockInvoke).toHaveBeenCalledWith('selection_set_enabled', { enabled: false });
      expect(mockInvoke).toHaveBeenCalledWith('selection_save_config');
      expect(mockInvoke).toHaveBeenCalledWith('selection_stop');
      expect(mockSetEnabled).toHaveBeenCalledWith(false);
    });

    it('should handle setEnabled error and revert state', async () => {
      const errorMessage = 'Failed to set enabled';
      mockInvoke
        .mockResolvedValueOnce(mockConfig) // Initial load
        .mockRejectedValueOnce(new Error(errorMessage)); // selection_set_enabled fails

      const { result } = renderHook(() => useSelectionSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.setEnabled(true);
        } catch (_err) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe(errorMessage);
      expect(mockSetEnabled).toHaveBeenCalledWith(false); // Reverted state
    });

    it('should work without backend sync when not in Tauri environment', async () => {
      mockIsTauri.mockReturnValue(false);

      const { result } = renderHook(() => useSelectionSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.setEnabled(true);
      });

      expect(mockInvoke).not.toHaveBeenCalled();
      expect(mockSetEnabled).toHaveBeenCalledWith(true);
    });

    it('should clear previous error on successful setEnabled', async () => {
      mockInvoke
        .mockResolvedValueOnce(mockConfig) // Initial load
        .mockRejectedValueOnce(new Error('Initial error')) // First setEnabled fails
        .mockResolvedValueOnce(mockConfig) // Second load
        .mockResolvedValueOnce(undefined) // Second setEnabled succeeds
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useSelectionSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // First call fails
      await act(async () => {
        try {
          await result.current.setEnabled(true);
        } catch (_err) {
          // Expected
        }
      });

      expect(result.current.error).toBeTruthy();

      // Second call succeeds
      await act(async () => {
        await result.current.setEnabled(false);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('refresh', () => {
    it('should refresh state from backend', async () => {
      const updatedConfig = { ...mockConfig, enabled: false };
      
      const { result } = renderHook(() => useSelectionSettings());
      
      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      // Clear the initial call
      mockSetEnabled.mockClear();
      mockInvoke.mockReset();
      
      // Set up the refresh call
      mockInvoke.mockResolvedValueOnce(updatedConfig);
      
      await act(async () => {
        await result.current.refresh();
      });

      expect(mockInvoke).toHaveBeenCalledWith('selection_get_config');
      expect(mockSetEnabled).toHaveBeenCalledWith(updatedConfig.enabled);
    });

    it('should handle refresh error', async () => {
      const errorMessage = 'Refresh failed';
      
      const { result } = renderHook(() => useSelectionSettings());
      
      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      // Clear mocks and set up refresh to fail
      mockInvoke.mockReset();
      mockInvoke.mockRejectedValueOnce(new Error(errorMessage));
      
      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
      });
    });

    it('should not call backend when refreshing in non-Tauri environment', async () => {
      mockIsTauri.mockReturnValue(false);

      const { result } = renderHook(() => useSelectionSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe('return values', () => {
    it('should return all expected properties', async () => {
      mockInvoke.mockResolvedValueOnce(mockConfig);

      const { result } = renderHook(() => useSelectionSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current).toHaveProperty('isEnabled');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('setEnabled');
      expect(result.current).toHaveProperty('refresh');
      expect(typeof result.current.setEnabled).toBe('function');
      expect(typeof result.current.refresh).toBe('function');
    });

    it('should return isEnabled from store', async () => {
      mockInvoke.mockResolvedValueOnce(mockConfig);
      mockUseSelectionStore.mockReturnValue({
        isEnabled: false,
        setEnabled: mockSetEnabled,
      } as ReturnType<typeof useSelectionStore>);

      const { result } = renderHook(() => useSelectionSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isEnabled).toBe(false);
    });
  });

  describe('initialization guard', () => {
    it('should only initialize once', async () => {
      mockInvoke.mockResolvedValueOnce(mockConfig);

      const { rerender } = renderHook(() => useSelectionSettings());

      // Rerender should not trigger another initialization
      rerender();

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('console logging', () => {
    it('should log successful enable', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockInvoke
        .mockResolvedValueOnce(mockConfig) // Initial load
        .mockResolvedValueOnce(undefined) // selection_set_enabled
        .mockResolvedValueOnce(undefined) // selection_save_config
        .mockResolvedValueOnce(undefined); // selection_start

      const { result } = renderHook(() => useSelectionSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.setEnabled(true);
      });

      expect(consoleSpy).toHaveBeenCalledWith('[useSelectionSettings] Selection toolbar enabled');
      consoleSpy.mockRestore();
    });

    it('should log successful disable', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockInvoke
        .mockResolvedValueOnce(mockConfig) // Initial load
        .mockResolvedValueOnce(undefined) // selection_set_enabled
        .mockResolvedValueOnce(undefined) // selection_save_config
        .mockResolvedValueOnce(undefined); // selection_stop

      const { result } = renderHook(() => useSelectionSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.setEnabled(false);
      });

      expect(consoleSpy).toHaveBeenCalledWith('[useSelectionSettings] Selection toolbar disabled');
      consoleSpy.mockRestore();
    });

    it('should log load errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Load failed');
      
      // Mock invoke to reject with our error
      mockInvoke.mockRejectedValueOnce(error);
      
      const { result } = renderHook(() => useSelectionSettings());

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[useSelectionSettings] Failed to load config from backend:',
        error
      );
      consoleSpy.mockRestore();
    });

    it('should log setEnabled errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Set failed');
      mockInvoke
        .mockResolvedValueOnce(mockConfig) // Initial load
        .mockRejectedValueOnce(error); // setEnabled fails

      const { result } = renderHook(() => useSelectionSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.setEnabled(true);
        } catch (_err) {
          // Expected
        }
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[useSelectionSettings] Failed to set enabled state:',
        error
      );
      consoleSpy.mockRestore();
    });
  });
});

describe('useSelectionSettings - non-desktop environment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(false);
    mockUseSelectionStore.mockReturnValue({
      isEnabled: true,
      setEnabled: mockSetEnabled,
    } as ReturnType<typeof useSelectionStore>);
  });

  it('should work without backend in non-Tauri environment', async () => {
    const { result } = renderHook(() => useSelectionSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isEnabled).toBe(true);
    expect(result.current.error).toBeNull();

    await act(async () => {
      await result.current.setEnabled(false);
    });

    expect(mockSetEnabled).toHaveBeenCalledWith(false);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('should handle refresh in non-Tauri environment', async () => {
    const { result } = renderHook(() => useSelectionSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockInvoke).not.toHaveBeenCalled();
  });
});
