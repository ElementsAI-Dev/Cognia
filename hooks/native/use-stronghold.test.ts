/**
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useStronghold } from './use-stronghold';

// Mock the stronghold module
const mockInitStronghold = jest.fn();
const mockCloseStronghold = jest.fn();
const mockIsStrongholdReady = jest.fn();
const mockStoreProviderApiKey = jest.fn();
const mockGetProviderApiKey = jest.fn();
const mockRemoveProviderApiKey = jest.fn();
const mockHasProviderApiKey = jest.fn();
const mockStoreSearchApiKey = jest.fn();
const mockGetSearchApiKey = jest.fn();
const mockRemoveSearchApiKey = jest.fn();
const mockStoreCustomProviderApiKey = jest.fn();
const mockGetCustomProviderApiKey = jest.fn();
const mockRemoveCustomProviderApiKey = jest.fn();

jest.mock('@/lib/native/stronghold', () => ({
  initStronghold: (...args: unknown[]) => mockInitStronghold(...args),
  closeStronghold: () => mockCloseStronghold(),
  isStrongholdReady: () => mockIsStrongholdReady(),
  storeProviderApiKey: (...args: unknown[]) => mockStoreProviderApiKey(...args),
  getProviderApiKey: (...args: unknown[]) => mockGetProviderApiKey(...args),
  removeProviderApiKey: (...args: unknown[]) => mockRemoveProviderApiKey(...args),
  hasProviderApiKey: (...args: unknown[]) => mockHasProviderApiKey(...args),
  storeSearchApiKey: (...args: unknown[]) => mockStoreSearchApiKey(...args),
  getSearchApiKey: (...args: unknown[]) => mockGetSearchApiKey(...args),
  removeSearchApiKey: (...args: unknown[]) => mockRemoveSearchApiKey(...args),
  storeCustomProviderApiKey: (...args: unknown[]) => mockStoreCustomProviderApiKey(...args),
  getCustomProviderApiKey: (...args: unknown[]) => mockGetCustomProviderApiKey(...args),
  removeCustomProviderApiKey: (...args: unknown[]) => mockRemoveCustomProviderApiKey(...args),
}));

// Mock Tauri environment
const mockTauriWindow = () => {
  Object.defineProperty(window, '__TAURI__', {
    value: {},
    writable: true,
    configurable: true,
  });
};

const clearTauriWindow = () => {
  delete (window as { __TAURI__?: unknown }).__TAURI__;
};

describe('useStronghold', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockIsStrongholdReady.mockReturnValue(false);
    clearTauriWindow();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useStronghold());

      expect(result.current.isInitialized).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isLocked).toBe(true);
    });

    it('should detect already initialized Stronghold', async () => {
      mockTauriWindow();
      mockIsStrongholdReady.mockReturnValue(true);

      const { result } = renderHook(() => useStronghold());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
        expect(result.current.isLocked).toBe(false);
      });
    });
  });

  describe('Initialization', () => {
    beforeEach(() => {
      mockTauriWindow();
      mockIsStrongholdReady.mockReturnValue(false);
    });

    it('should initialize Stronghold with password', async () => {
      mockInitStronghold.mockResolvedValue(true);

      const { result } = renderHook(() => useStronghold());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.initialize('test-password');
      });

      expect(success).toBe(true);
      expect(mockInitStronghold).toHaveBeenCalledWith('test-password');
      expect(result.current.isInitialized).toBe(true);
      expect(result.current.isLocked).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle initialization failure', async () => {
      mockInitStronghold.mockResolvedValue(false);

      const { result } = renderHook(() => useStronghold());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.initialize('wrong-password');
      });

      expect(success).toBe(false);
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.isLocked).toBe(true);
      expect(result.current.error).toBe('Failed to initialize Stronghold');
    });

    it('should handle initialization error', async () => {
      mockInitStronghold.mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => useStronghold());

      await act(async () => {
        await result.current.initialize('test-password');
      });

      expect(result.current.isInitialized).toBe(false);
      expect(result.current.error).toBe('Test error');
    });

    it('should return false when not in Tauri environment', async () => {
      clearTauriWindow();

      const { result } = renderHook(() => useStronghold());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.initialize('test-password');
      });

      expect(success).toBe(false);
    });
  });

  describe('Lock', () => {
    beforeEach(() => {
      mockTauriWindow();
      mockIsStrongholdReady.mockReturnValue(false);
    });

    it('should lock Stronghold', async () => {
      mockInitStronghold.mockResolvedValue(true);
      mockCloseStronghold.mockResolvedValue(undefined);

      const { result } = renderHook(() => useStronghold());

      await act(async () => {
        await result.current.initialize('test-password');
      });

      expect(result.current.isLocked).toBe(false);

      await act(async () => {
        await result.current.lock();
      });

      expect(mockCloseStronghold).toHaveBeenCalled();
      expect(result.current.isLocked).toBe(true);
      expect(result.current.isInitialized).toBe(false);
    });
  });

  describe('Provider API Key Operations', () => {
    beforeEach(() => {
      mockTauriWindow();
      mockInitStronghold.mockResolvedValue(true);
      mockIsStrongholdReady.mockReturnValue(false);
    });

    it('should store API key', async () => {
      mockStoreProviderApiKey.mockResolvedValue(true);

      const { result } = renderHook(() => useStronghold());

      await act(async () => {
        await result.current.initialize('password');
      });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.storeApiKey('openai', 'sk-test');
      });

      expect(success).toBe(true);
      expect(mockStoreProviderApiKey).toHaveBeenCalledWith('openai', 'sk-test');
    });

    it('should get API key', async () => {
      mockGetProviderApiKey.mockResolvedValue('sk-test-key');

      const { result } = renderHook(() => useStronghold());

      await act(async () => {
        await result.current.initialize('password');
      });

      let key: string | null = null;
      await act(async () => {
        key = await result.current.getApiKey('openai');
      });

      expect(key).toBe('sk-test-key');
    });

    it('should remove API key', async () => {
      mockRemoveProviderApiKey.mockResolvedValue(true);

      const { result } = renderHook(() => useStronghold());

      await act(async () => {
        await result.current.initialize('password');
      });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.removeApiKey('openai');
      });

      expect(success).toBe(true);
      expect(mockRemoveProviderApiKey).toHaveBeenCalledWith('openai');
    });

    it('should check if API key exists', async () => {
      mockHasProviderApiKey.mockResolvedValue(true);

      const { result } = renderHook(() => useStronghold());

      await act(async () => {
        await result.current.initialize('password');
      });

      let exists: boolean = false;
      await act(async () => {
        exists = await result.current.hasApiKey('openai');
      });

      expect(exists).toBe(true);
    });

    it('should return false when not initialized', async () => {
      const { result } = renderHook(() => useStronghold());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.storeApiKey('openai', 'key');
      });

      expect(success).toBe(false);
    });
  });

  describe('Search API Key Operations', () => {
    beforeEach(() => {
      mockTauriWindow();
      mockInitStronghold.mockResolvedValue(true);
      mockIsStrongholdReady.mockReturnValue(false);
    });

    it('should store search API key', async () => {
      mockStoreSearchApiKey.mockResolvedValue(true);

      const { result } = renderHook(() => useStronghold());

      await act(async () => {
        await result.current.initialize('password');
      });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.storeSearchKey('tavily', 'tvly-test');
      });

      expect(success).toBe(true);
      expect(mockStoreSearchApiKey).toHaveBeenCalledWith('tavily', 'tvly-test');
    });

    it('should get search API key', async () => {
      mockGetSearchApiKey.mockResolvedValue('tvly-key');

      const { result } = renderHook(() => useStronghold());

      await act(async () => {
        await result.current.initialize('password');
      });

      let key: string | null = null;
      await act(async () => {
        key = await result.current.getSearchKey('tavily');
      });

      expect(key).toBe('tvly-key');
    });

    it('should remove search API key', async () => {
      mockRemoveSearchApiKey.mockResolvedValue(true);

      const { result } = renderHook(() => useStronghold());

      await act(async () => {
        await result.current.initialize('password');
      });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.removeSearchKey('tavily');
      });

      expect(success).toBe(true);
    });
  });

  describe('Custom Provider API Key Operations', () => {
    beforeEach(() => {
      mockTauriWindow();
      mockInitStronghold.mockResolvedValue(true);
      mockIsStrongholdReady.mockReturnValue(false);
    });

    it('should store custom API key', async () => {
      mockStoreCustomProviderApiKey.mockResolvedValue(true);

      const { result } = renderHook(() => useStronghold());

      await act(async () => {
        await result.current.initialize('password');
      });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.storeCustomKey('custom', 'custom-key');
      });

      expect(success).toBe(true);
      expect(mockStoreCustomProviderApiKey).toHaveBeenCalledWith('custom', 'custom-key');
    });

    it('should get custom API key', async () => {
      mockGetCustomProviderApiKey.mockResolvedValue('custom-key');

      const { result } = renderHook(() => useStronghold());

      await act(async () => {
        await result.current.initialize('password');
      });

      let key: string | null = null;
      await act(async () => {
        key = await result.current.getCustomKey('custom');
      });

      expect(key).toBe('custom-key');
    });

    it('should remove custom API key', async () => {
      mockRemoveCustomProviderApiKey.mockResolvedValue(true);

      const { result } = renderHook(() => useStronghold());

      await act(async () => {
        await result.current.initialize('password');
      });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.removeCustomKey('custom');
      });

      expect(success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockTauriWindow();
      mockInitStronghold.mockResolvedValue(true);
      mockIsStrongholdReady.mockReturnValue(false);
    });

    it('should handle store error gracefully', async () => {
      mockStoreProviderApiKey.mockRejectedValue(new Error('Store failed'));

      const { result } = renderHook(() => useStronghold());

      await act(async () => {
        await result.current.initialize('password');
      });

      let success: boolean = true;
      await act(async () => {
        success = await result.current.storeApiKey('openai', 'key');
      });

      expect(success).toBe(false);
    });

    it('should handle get error gracefully', async () => {
      mockGetProviderApiKey.mockRejectedValue(new Error('Get failed'));

      const { result } = renderHook(() => useStronghold());

      await act(async () => {
        await result.current.initialize('password');
      });

      let key: string | null = 'initial';
      await act(async () => {
        key = await result.current.getApiKey('openai');
      });

      expect(key).toBeNull();
    });
  });
});
