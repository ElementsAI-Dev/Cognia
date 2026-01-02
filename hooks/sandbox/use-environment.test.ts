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
      { tool: 'uv' as const, status: 'installed' as const, installed: true, version: '18.0.0', path: '/usr/bin/uv', error: null, lastChecked: new Date().toISOString() },
      { tool: 'nvm' as const, status: 'not_installed' as const, installed: false, version: null, path: null, error: null, lastChecked: new Date().toISOString() },
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
    const mockStatus = { tool: 'uv' as const, status: 'installed' as const, installed: true, version: '18.0.0', path: '/usr/bin/uv', error: null, lastChecked: new Date().toISOString() };
    mockEnvironmentService.checkTool.mockResolvedValue(mockStatus);

    const { result } = renderHook(() => useEnvironment());

    let status;
    await act(async () => {
      status = await result.current.checkTool('uv');
    });

    expect(mockStoreFunctions.setToolStatus).toHaveBeenCalledWith('uv', { status: 'checking' });
    expect(mockEnvironmentService.checkTool).toHaveBeenCalledWith('uv');
    expect(status).toEqual(mockStatus);
  });

  it('should handle check tool error', async () => {
    mockEnvironmentService.checkTool.mockRejectedValue(new Error('Check failed'));

    const { result } = renderHook(() => useEnvironment());

    const status = await act(async () => {
      return await result.current.checkTool('uv');
    });

    expect(status).toBeNull();
    expect(mockStoreFunctions.setToolStatus).toHaveBeenCalledWith('uv', {
      status: 'error',
      error: 'Check failed',
    });
  });

  it('should install a tool', async () => {
    mockEnvironmentService.installTool.mockResolvedValue({ tool: 'uv' as const, status: 'installed' as const, installed: true, version: '0.5.0', path: '/usr/bin/uv', error: null, lastChecked: new Date().toISOString() });

    const { result } = renderHook(() => useEnvironment());

    let success;
    await act(async () => {
      success = await result.current.installTool('uv');
    });

    expect(mockStoreFunctions.startInstallation).toHaveBeenCalledWith('uv');
    expect(mockEnvironmentService.installTool).toHaveBeenCalledWith('uv');
    expect(mockStoreFunctions.completeInstallation).toHaveBeenCalledWith('uv', true, undefined);
    expect(success).toBe(true);
  });

  it('should handle install error', async () => {
    mockEnvironmentService.installTool.mockRejectedValue(new Error('Install failed'));

    const { result } = renderHook(() => useEnvironment());

    const success = await act(async () => {
      return await result.current.installTool('uv');
    });

    expect(success).toBe(false);
    expect(mockStoreFunctions.completeInstallation).toHaveBeenCalledWith('uv', false, 'Install failed');
  });

  it('should uninstall a tool', async () => {
    mockEnvironmentService.uninstallTool.mockResolvedValue(true);

    const { result } = renderHook(() => useEnvironment());

    let success;
    await act(async () => {
      success = await result.current.uninstallTool('uv');
    });

    expect(mockEnvironmentService.uninstallTool).toHaveBeenCalledWith('uv');
    expect(success).toBe(true);
  });

  it('should handle uninstall error', async () => {
    mockEnvironmentService.uninstallTool.mockRejectedValue(new Error('Uninstall failed'));

    const { result } = renderHook(() => useEnvironment());

    const success = await act(async () => {
      return await result.current.uninstallTool('uv');
    });

    expect(success).toBe(false);
    expect(mockStoreFunctions.setGlobalError).toHaveBeenCalledWith('Uninstall failed');
  });

  it('should open tool website', async () => {
    const { result } = renderHook(() => useEnvironment());

    await act(async () => {
      await result.current.openToolWebsite('uv');
    });

    expect(mockEnvironmentService.openToolWebsite).toHaveBeenCalledWith('uv');
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
      return await result.current.checkTool('uv');
    });
    expect(toolStatus).toBeNull();

    const installResult = await act(async () => {
      return await result.current.installTool('uv');
    });
    expect(installResult).toBe(false);

    const uninstallResult = await act(async () => {
      return await result.current.uninstallTool('uv');
    });
    expect(uninstallResult).toBe(false);
  });
});
