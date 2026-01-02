/**
 * useEnvironment Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useEnvironment } from './use-environment';

// Mock dependencies
jest.mock('@/stores/system', () => ({
  useEnvironmentStore: jest.fn(() => ({
    platform: 'darwin',
    tools: {},
    isRefreshing: false,
    isInstalling: false,
    installProgress: null,
    globalError: null,
    setPlatform: jest.fn(),
    setToolStatus: jest.fn(),
    setAllToolStatuses: jest.fn(),
    setRefreshing: jest.fn(),
    startInstallation: jest.fn(),
    completeInstallation: jest.fn(),
    setInstallProgress: jest.fn(),
    setGlobalError: jest.fn(),
    clearError: jest.fn(),
  })),
}));

jest.mock('@/lib/native/environment', () => ({
  environmentService: {
    getPlatform: jest.fn().mockResolvedValue('darwin'),
    checkAllTools: jest.fn().mockResolvedValue([]),
    checkTool: jest.fn(),
    installTool: jest.fn(),
    uninstallTool: jest.fn(),
    openToolWebsite: jest.fn(),
    onInstallProgress: jest.fn().mockResolvedValue(() => {}),
  },
  isEnvironmentAvailable: jest.fn(() => true),
}));

import { useEnvironmentStore } from '@/stores/system';
import { environmentService, isEnvironmentAvailable } from '@/lib/native/environment';

const mockUseEnvironmentStore = useEnvironmentStore as jest.MockedFunction<typeof useEnvironmentStore>;
const mockIsEnvironmentAvailable = isEnvironmentAvailable as jest.MockedFunction<typeof isEnvironmentAvailable>;
const mockEnvironmentService = environmentService as jest.Mocked<typeof environmentService>;

describe('useEnvironment', () => {
  const mockStoreFunctions = {
    platform: 'darwin',
    tools: {},
    isRefreshing: false,
    isInstalling: false,
    installProgress: null,
    globalError: null,
    setPlatform: jest.fn(),
    setToolStatus: jest.fn(),
    setAllToolStatuses: jest.fn(),
    setRefreshing: jest.fn(),
    startInstallation: jest.fn(),
    completeInstallation: jest.fn(),
    setInstallProgress: jest.fn(),
    setGlobalError: jest.fn(),
    clearError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEnvironmentStore.mockReturnValue(mockStoreFunctions);
    mockIsEnvironmentAvailable.mockReturnValue(true);
  });

  it('should return environment state', () => {
    const { result } = renderHook(() => useEnvironment());

    expect(result.current.platform).toBe('darwin');
    expect(result.current.tools).toEqual({});
    expect(result.current.isAvailable).toBe(true);
  });

  it('should return isAvailable as false when not in Tauri', () => {
    mockIsEnvironmentAvailable.mockReturnValue(false);

    const { result } = renderHook(() => useEnvironment());

    expect(result.current.isAvailable).toBe(false);
  });

  it('should refresh tool statuses', async () => {
    const mockStatuses = [
      { tool: 'node', status: 'installed', installed: true, version: '18.0.0' },
      { tool: 'python', status: 'not_installed', installed: false },
    ];
    mockEnvironmentService.checkAllTools.mockResolvedValue(mockStatuses);

    const { result } = renderHook(() => useEnvironment());

    await act(async () => {
      await result.current.refreshStatus();
    });

    expect(mockStoreFunctions.setRefreshing).toHaveBeenCalledWith(true);
    expect(mockEnvironmentService.checkAllTools).toHaveBeenCalled();
    expect(mockStoreFunctions.setAllToolStatuses).toHaveBeenCalled();
    expect(mockStoreFunctions.setRefreshing).toHaveBeenCalledWith(false);
  });

  it('should handle refresh error', async () => {
    mockEnvironmentService.checkAllTools.mockRejectedValue(new Error('Refresh failed'));

    const { result } = renderHook(() => useEnvironment());

    await act(async () => {
      await result.current.refreshStatus();
    });

    expect(mockStoreFunctions.setGlobalError).toHaveBeenCalledWith('Refresh failed');
  });

  it('should check a specific tool', async () => {
    const mockStatus = { tool: 'node', status: 'installed', installed: true, version: '18.0.0' };
    mockEnvironmentService.checkTool.mockResolvedValue(mockStatus);

    const { result } = renderHook(() => useEnvironment());

    let status;
    await act(async () => {
      status = await result.current.checkTool('node');
    });

    expect(mockStoreFunctions.setToolStatus).toHaveBeenCalledWith('node', { status: 'checking' });
    expect(mockEnvironmentService.checkTool).toHaveBeenCalledWith('node');
    expect(status).toEqual(mockStatus);
  });

  it('should handle check tool error', async () => {
    mockEnvironmentService.checkTool.mockRejectedValue(new Error('Check failed'));

    const { result } = renderHook(() => useEnvironment());

    const status = await act(async () => {
      return await result.current.checkTool('node');
    });

    expect(status).toBeNull();
    expect(mockStoreFunctions.setToolStatus).toHaveBeenCalledWith('node', {
      status: 'error',
      error: 'Check failed',
    });
  });

  it('should install a tool', async () => {
    mockEnvironmentService.installTool.mockResolvedValue({ installed: true });

    const { result } = renderHook(() => useEnvironment());

    let success;
    await act(async () => {
      success = await result.current.installTool('node');
    });

    expect(mockStoreFunctions.startInstallation).toHaveBeenCalledWith('node');
    expect(mockEnvironmentService.installTool).toHaveBeenCalledWith('node');
    expect(mockStoreFunctions.completeInstallation).toHaveBeenCalledWith('node', true, undefined);
    expect(success).toBe(true);
  });

  it('should handle install error', async () => {
    mockEnvironmentService.installTool.mockRejectedValue(new Error('Install failed'));

    const { result } = renderHook(() => useEnvironment());

    const success = await act(async () => {
      return await result.current.installTool('node');
    });

    expect(success).toBe(false);
    expect(mockStoreFunctions.completeInstallation).toHaveBeenCalledWith('node', false, 'Install failed');
  });

  it('should uninstall a tool', async () => {
    mockEnvironmentService.uninstallTool.mockResolvedValue(true);

    const { result } = renderHook(() => useEnvironment());

    let success;
    await act(async () => {
      success = await result.current.uninstallTool('node');
    });

    expect(mockEnvironmentService.uninstallTool).toHaveBeenCalledWith('node');
    expect(success).toBe(true);
  });

  it('should handle uninstall error', async () => {
    mockEnvironmentService.uninstallTool.mockRejectedValue(new Error('Uninstall failed'));

    const { result } = renderHook(() => useEnvironment());

    const success = await act(async () => {
      return await result.current.uninstallTool('node');
    });

    expect(success).toBe(false);
    expect(mockStoreFunctions.setGlobalError).toHaveBeenCalledWith('Uninstall failed');
  });

  it('should open tool website', async () => {
    const { result } = renderHook(() => useEnvironment());

    await act(async () => {
      await result.current.openToolWebsite('node');
    });

    expect(mockEnvironmentService.openToolWebsite).toHaveBeenCalledWith('node');
  });

  it('should clear error', () => {
    const { result } = renderHook(() => useEnvironment());

    act(() => {
      result.current.clearError();
    });

    expect(mockStoreFunctions.clearError).toHaveBeenCalled();
  });

  it('should not perform actions when unavailable', async () => {
    mockIsEnvironmentAvailable.mockReturnValue(false);

    const { result } = renderHook(() => useEnvironment());

    await act(async () => {
      await result.current.refreshStatus();
    });

    expect(mockEnvironmentService.checkAllTools).not.toHaveBeenCalled();

    const toolStatus = await act(async () => {
      return await result.current.checkTool('node');
    });
    expect(toolStatus).toBeNull();

    const installResult = await act(async () => {
      return await result.current.installTool('node');
    });
    expect(installResult).toBe(false);

    const uninstallResult = await act(async () => {
      return await result.current.uninstallTool('node');
    });
    expect(uninstallResult).toBe(false);
  });
});
