/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProviderTest } from './use-provider-test';

jest.mock('@/lib/ai/infrastructure/api-test', () => ({
  testProviderConnection: jest.fn(),
  testCustomProviderConnectionByProtocol: jest.fn(),
}));

const mockTestProviderConnection = jest.requireMock('@/lib/ai/infrastructure/api-test').testProviderConnection;
const mockTestCustomProvider = jest.requireMock('@/lib/ai/infrastructure/api-test').testCustomProviderConnectionByProtocol;

describe('useProviderTest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have empty initial state', () => {
      const { result } = renderHook(() => useProviderTest());

      expect(result.current.state.results).toEqual({});
      expect(result.current.state.testing).toEqual({});
      expect(result.current.state.customResults).toEqual({});
      expect(result.current.state.customMessages).toEqual({});
      expect(result.current.isBatchTesting).toBe(false);
      expect(result.current.batchProgress).toBe(0);
    });
  });

  describe('testProvider', () => {
    it('should test provider successfully', async () => {
      mockTestProviderConnection.mockResolvedValueOnce({ success: true, message: 'Connected' });

      const { result } = renderHook(() => useProviderTest());

      let testResult;
      await act(async () => {
        testResult = await result.current.testProvider('openai', 'sk-test-key');
      });

      expect(testResult).toEqual({ success: true, message: 'Connected' });
      expect(result.current.state.results.openai).toEqual({ success: true, message: 'Connected' });
      expect(result.current.state.testing.openai).toBe(false);
    });

    it('should handle test failure', async () => {
      mockTestProviderConnection.mockResolvedValueOnce({ success: false, message: 'Invalid key' });

      const { result } = renderHook(() => useProviderTest());

      await act(async () => {
        await result.current.testProvider('openai', 'invalid-key');
      });

      expect(result.current.state.results.openai?.success).toBe(false);
    });

    it('should handle exception', async () => {
      mockTestProviderConnection.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useProviderTest());

      await act(async () => {
        await result.current.testProvider('openai', 'sk-test-key');
      });

      expect(result.current.state.results.openai?.success).toBe(false);
      expect(result.current.state.results.openai?.message).toBe('Network error');
    });

    it('should return undefined for empty apiKey', async () => {
      const { result } = renderHook(() => useProviderTest());

      let testResult;
      await act(async () => {
        testResult = await result.current.testProvider('openai', '');
      });

      expect(testResult).toBeUndefined();
      expect(mockTestProviderConnection).not.toHaveBeenCalled();
    });

    it('should set testing state during test', async () => {
      let resolveTest: (value: { success: boolean; message: string }) => void;
      mockTestProviderConnection.mockImplementationOnce(
        () => new Promise((resolve) => { resolveTest = resolve; })
      );

      const { result } = renderHook(() => useProviderTest());

      act(() => {
        result.current.testProvider('openai', 'sk-test-key');
      });

      await waitFor(() => {
        expect(result.current.state.testing.openai).toBe(true);
      });

      await act(async () => {
        resolveTest!({ success: true, message: 'OK' });
      });

      expect(result.current.state.testing.openai).toBe(false);
    });
  });

  describe('testCustomProvider', () => {
    it('should test custom provider successfully', async () => {
      mockTestCustomProvider.mockResolvedValueOnce({ success: true, message: 'Connected' });

      const { result } = renderHook(() => useProviderTest());

      await act(async () => {
        await result.current.testCustomProvider('custom-1', 'https://api.example.com', 'key-123', 'openai');
      });

      expect(result.current.state.customResults['custom-1']).toBe('success');
      expect(result.current.state.customMessages['custom-1']).toBe('Connected');
    });

    it('should handle invalid URL', async () => {
      const { result } = renderHook(() => useProviderTest());

      await act(async () => {
        await result.current.testCustomProvider('custom-1', 'not-a-url', 'key-123', 'openai');
      });

      expect(result.current.state.customResults['custom-1']).toBe('error');
      expect(result.current.state.customMessages['custom-1']).toBe('Invalid base URL');
    });

    it('should return undefined for empty baseURL or apiKey', async () => {
      const { result } = renderHook(() => useProviderTest());

      let testResult;
      await act(async () => {
        testResult = await result.current.testCustomProvider('custom-1', '', 'key-123', 'openai');
      });

      expect(testResult).toBeUndefined();
    });
  });

  describe('batchTest', () => {
    it('should test multiple providers', async () => {
      mockTestProviderConnection.mockResolvedValue({ success: true, message: 'OK' });

      const { result } = renderHook(() => useProviderTest());

      await act(async () => {
        await result.current.batchTest(
          [
            { id: 'openai', apiKey: 'key-1' },
            { id: 'anthropic', apiKey: 'key-2' },
          ],
          []
        );
      });

      expect(mockTestProviderConnection).toHaveBeenCalledTimes(2);
      expect(result.current.batchProgress).toBe(100);
      expect(result.current.isBatchTesting).toBe(false);
    });

    it('should call onProgress callback', async () => {
      mockTestProviderConnection.mockResolvedValue({ success: true, message: 'OK' });
      const onProgress = jest.fn();

      const { result } = renderHook(() => useProviderTest());

      await act(async () => {
        await result.current.batchTest([{ id: 'openai', apiKey: 'key-1' }], [], onProgress);
      });

      expect(onProgress).toHaveBeenCalledWith(100);
    });

    it('should cancel batch test', async () => {
      let resolveFirst: (value: { success: boolean; message: string }) => void;
      mockTestProviderConnection.mockImplementationOnce(
        () => new Promise((resolve) => { resolveFirst = resolve; })
      );

      const { result } = renderHook(() => useProviderTest());

      act(() => {
        result.current.batchTest(
          [
            { id: 'openai', apiKey: 'key-1' },
            { id: 'anthropic', apiKey: 'key-2' },
          ],
          []
        );
      });

      await waitFor(() => {
        expect(result.current.isBatchTesting).toBe(true);
      });

      act(() => {
        result.current.cancelBatchTest();
      });

      await act(async () => {
        resolveFirst!({ success: true, message: 'OK' });
      });

      // Second provider should not be tested after cancel
      expect(mockTestProviderConnection).toHaveBeenCalledTimes(1);
    });
  });

  describe('getResultsSummary', () => {
    it('should return correct summary', async () => {
      mockTestProviderConnection
        .mockResolvedValueOnce({ success: true, message: 'OK' })
        .mockResolvedValueOnce({ success: false, message: 'Failed' });

      const { result } = renderHook(() => useProviderTest());

      await act(async () => {
        await result.current.testProvider('openai', 'key-1');
        await result.current.testProvider('anthropic', 'key-2');
      });

      const summary = result.current.getResultsSummary();
      expect(summary.success).toBe(1);
      expect(summary.failed).toBe(1);
      expect(summary.total).toBe(2);
    });
  });

  describe('clearResults', () => {
    it('should clear all results', async () => {
      mockTestProviderConnection.mockResolvedValueOnce({ success: true, message: 'OK' });

      const { result } = renderHook(() => useProviderTest());

      await act(async () => {
        await result.current.testProvider('openai', 'key-1');
      });

      expect(result.current.state.results.openai).toBeDefined();

      act(() => {
        result.current.clearResults();
      });

      expect(result.current.state.results).toEqual({});
    });
  });
});
