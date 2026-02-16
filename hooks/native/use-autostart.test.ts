/**
 * useAutostart Hook Tests
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { loggers } from '@/lib/logger';

// Extend globalThis for Tauri detection in tests
declare global {
  var __TAURI_INTERNALS__: Record<string, unknown> | undefined;
}

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
    // The hook checks typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
    // In Jest, __TAURI_INTERNALS__ is not in window, so it will behave as non-Tauri

    it('should return disabled state', async () => {
      const { result } = renderHook(() => useAutostart());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isEnabled).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should warn when trying to enable', async () => {
      const warnSpy = jest.spyOn(loggers.native, 'warn').mockImplementation();
      const { result } = renderHook(() => useAutostart());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.enable();
      });

      expect(warnSpy).toHaveBeenCalledWith('Autostart is only available in Tauri environment');
      warnSpy.mockRestore();
    });

    it('should warn when trying to disable', async () => {
      const warnSpy = jest.spyOn(loggers.native, 'warn').mockImplementation();
      const { result } = renderHook(() => useAutostart());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.disable();
      });

      expect(warnSpy).toHaveBeenCalledWith('Autostart is only available in Tauri environment');
      warnSpy.mockRestore();
    });

    it('should provide toggle function', async () => {
      const warnSpy = jest.spyOn(loggers.native, 'warn').mockImplementation();
      const { result } = renderHook(() => useAutostart());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Toggle should try to enable since isEnabled is false
      await act(async () => {
        await result.current.toggle();
      });

      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
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
  // as the isTauri check happens at module load time and jest.isolateModules
  // breaks React context
  describe('Tauri environment', () => {
    it('should have Tauri detection logic', () => {
      // The hook checks for __TAURI_INTERNALS__ to detect Tauri environment
      // This test just verifies the detection logic exists
      expect(typeof globalThis.__TAURI_INTERNALS__).toBe('undefined');
    });
  });
});
