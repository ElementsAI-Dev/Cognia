/**
 * useAutostart Hook Tests
 */

import { renderHook, act, waitFor } from '@testing-library/react';

// Mock tauri plugin before importing hook
const mockIsEnabled = jest.fn();
const mockEnable = jest.fn();
const mockDisable = jest.fn();

jest.mock('@tauri-apps/plugin-autostart', () => ({
  isEnabled: () => mockIsEnabled(),
  enable: () => mockEnable(),
  disable: () => mockDisable(),
}));

// Import after mocks
import { useAutostart } from './use-autostart';

describe('useAutostart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('in non-Tauri environment (browser)', () => {
    // The hook checks typeof window !== 'undefined' && '__TAURI__' in window
    // In Jest, __TAURI__ is not in window, so it will behave as non-Tauri

    it('should return disabled state', async () => {
      const { result } = renderHook(() => useAutostart());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isEnabled).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should warn when trying to enable', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const { result } = renderHook(() => useAutostart());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.enable();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Autostart is only available in Tauri environment'
      );
      consoleSpy.mockRestore();
    });

    it('should warn when trying to disable', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const { result } = renderHook(() => useAutostart());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.disable();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Autostart is only available in Tauri environment'
      );
      consoleSpy.mockRestore();
    });

    it('should provide toggle function', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const { result } = renderHook(() => useAutostart());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Toggle should try to enable since isEnabled is false
      await act(async () => {
        await result.current.toggle();
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should provide refresh function', async () => {
      const { result } = renderHook(() => useAutostart());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Refresh in non-Tauri should just set loading to false
      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isEnabled).toBe(false);
    });
  });

  // Note: Testing Tauri-specific behavior requires integration tests
  // as the isTauri check happens at module load time
});
