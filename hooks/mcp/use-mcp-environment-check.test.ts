/**
 * Tests for useMcpEnvironmentCheck hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useMcpEnvironmentCheck } from './use-mcp-environment-check';
import { checkMcpEnvironment } from '@/lib/mcp/marketplace-utils';
import type { EnvironmentCheckResult } from '@/lib/mcp/marketplace-utils';

// Mock the environment check function
jest.mock('@/lib/mcp/marketplace-utils', () => ({
  checkMcpEnvironment: jest.fn(),
}));

const mockCheckMcpEnvironment = checkMcpEnvironment as jest.MockedFunction<typeof checkMcpEnvironment>;

describe('useMcpEnvironmentCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useMcpEnvironmentCheck());

      expect(result.current.envCheck).toBeNull();
      expect(result.current.isChecking).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isSupported).toBe(false);
    });

    it('should not check on mount by default', () => {
      renderHook(() => useMcpEnvironmentCheck());

      expect(mockCheckMcpEnvironment).not.toHaveBeenCalled();
    });
  });

  describe('checkOnMount option', () => {
    it('should check environment on mount when enabled', async () => {
      const mockResult: EnvironmentCheckResult = {
        supported: true,
        hasNode: true,
        hasNpx: true,
        missingDeps: [],
        message: 'Environment is ready',
      };
      mockCheckMcpEnvironment.mockResolvedValue(mockResult);

      const { result } = renderHook(() => 
        useMcpEnvironmentCheck({ checkOnMount: true })
      );

      expect(result.current.isChecking).toBe(true);

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      expect(mockCheckMcpEnvironment).toHaveBeenCalledTimes(1);
      expect(result.current.envCheck).toEqual(mockResult);
      expect(result.current.isSupported).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });

  describe('runCheck function', () => {
    it('should run environment check successfully', async () => {
      const mockResult: EnvironmentCheckResult = {
        supported: true,
        hasNode: true,
        hasNpx: true,
        missingDeps: ['python'],
        message: 'Python is missing but Node.js is available',
      };
      mockCheckMcpEnvironment.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useMcpEnvironmentCheck());

      await act(async () => {
        const checkResult = await result.current.runCheck();
        expect(checkResult).toEqual(mockResult);
      });

      expect(mockCheckMcpEnvironment).toHaveBeenCalledTimes(1);
      expect(result.current.envCheck).toEqual(mockResult);
      expect(result.current.isSupported).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should handle environment check failure', async () => {
      const errorMessage = 'Environment check failed';
      mockCheckMcpEnvironment.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useMcpEnvironmentCheck());

      await act(async () => {
        const checkResult = await result.current.runCheck();
        expect(checkResult.supported).toBe(false);
        expect(checkResult.message).toBe(errorMessage);
      });

      expect(result.current.envCheck?.supported).toBe(false);
      expect(result.current.envCheck?.message).toBe(errorMessage);
      expect(result.current.isSupported).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });

    it('should handle non-Error thrown values', async () => {
      mockCheckMcpEnvironment.mockRejectedValue('String error');

      const { result } = renderHook(() => useMcpEnvironmentCheck());

      await act(async () => {
        await result.current.runCheck();
      });

      expect(result.current.error).toBe('Failed to check environment');
      expect(result.current.envCheck?.message).toBe('Failed to check environment');
    });

    it('should reset error state on successful check after failure', async () => {
      // First call fails
      mockCheckMcpEnvironment.mockRejectedValueOnce(new Error('First failure'));
      
      const { result } = renderHook(() => useMcpEnvironmentCheck());

      await act(async () => {
        await result.current.runCheck();
      });

      expect(result.current.error).toBe('First failure');

      // Second call succeeds
      const mockResult: EnvironmentCheckResult = {
        supported: true,
        hasNode: true,
        hasNpx: true,
        missingDeps: [],
        message: 'Success',
      };
      mockCheckMcpEnvironment.mockResolvedValueOnce(mockResult);

      await act(async () => {
        await result.current.runCheck();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.envCheck).toEqual(mockResult);
    });

    it('should handle concurrent calls', async () => {
      const mockResult: EnvironmentCheckResult = {
        supported: true,
        hasNode: true,
        hasNpx: true,
        missingDeps: [],
        message: 'Success',
      };
      mockCheckMcpEnvironment.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useMcpEnvironmentCheck());

      // Start multiple concurrent calls
      const promises = [
        result.current.runCheck(),
        result.current.runCheck(),
        result.current.runCheck(),
      ];

      await act(async () => {
        await Promise.all(promises);
      });

      expect(mockCheckMcpEnvironment).toHaveBeenCalledTimes(3);
      expect(result.current.envCheck).toEqual(mockResult);
    });
  });

  describe('isSupported computed value', () => {
    it('should return false when envCheck is null', () => {
      const { result } = renderHook(() => useMcpEnvironmentCheck());

      expect(result.current.isSupported).toBe(false);
    });

    it('should return envCheck.supported when envCheck exists', async () => {
      const mockResult: EnvironmentCheckResult = {
        supported: false,
        hasNode: false,
        hasNpx: false,
        missingDeps: ['node', 'npx'],
        message: 'Node.js and npx are missing',
      };
      mockCheckMcpEnvironment.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useMcpEnvironmentCheck());

      await act(async () => {
        await result.current.runCheck();
      });

      expect(result.current.isSupported).toBe(false);
    });

    it('should return true when environment is supported', async () => {
      const mockResult: EnvironmentCheckResult = {
        supported: true,
        hasNode: true,
        hasNpx: true,
        missingDeps: [],
        message: 'Environment ready',
      };
      mockCheckMcpEnvironment.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useMcpEnvironmentCheck());

      await act(async () => {
        await result.current.runCheck();
      });

      expect(result.current.isSupported).toBe(true);
    });
  });

  describe('loading states', () => {
    it('should set isChecking to true during check', async () => {
      let resolveCheck: (value: EnvironmentCheckResult) => void;
      const checkPromise = new Promise<EnvironmentCheckResult>((resolve) => {
        resolveCheck = resolve;
      });
      mockCheckMcpEnvironment.mockReturnValue(checkPromise);

      const { result } = renderHook(() => useMcpEnvironmentCheck());

      await act(async () => {
        result.current.runCheck();
      });

      expect(result.current.isChecking).toBe(true);

      await act(async () => {
        const mockResult: EnvironmentCheckResult = {
          supported: true,
          hasNode: true,
          hasNpx: true,
          missingDeps: [],
          message: 'Success',
        };
        resolveCheck!(mockResult);
        await checkPromise;
      });

      expect(result.current.isChecking).toBe(false);
    });

    it('should reset isChecking after failure', async () => {
      mockCheckMcpEnvironment.mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => useMcpEnvironmentCheck());

      await act(async () => {
        await result.current.runCheck();
      });

      expect(result.current.isChecking).toBe(false);
    });
  });

  describe('options parameter', () => {
    it('should accept empty options object', () => {
      const { result } = renderHook(() => useMcpEnvironmentCheck({}));

      expect(result.current.envCheck).toBeNull();
      expect(result.current.isChecking).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isSupported).toBe(false);
    });

    it('should handle autoCheck option (deprecated)', () => {
      // autoCheck is not used in the implementation but should be accepted
      const { result } = renderHook(() => 
        useMcpEnvironmentCheck({ autoCheck: true })
      );

      expect(result.current.envCheck).toBeNull();
    });
  });
});
