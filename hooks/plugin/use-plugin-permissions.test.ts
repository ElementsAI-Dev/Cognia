/**
 * Tests for Plugin Permissions React Hooks
 */

import { renderHook, act } from '@testing-library/react';
import {
  usePluginPermissions,
  usePermissionCheck,
  usePermissionRequest,
} from './use-plugin-permissions';

// Mock the PermissionGuard module
const mockGuard = {
  getPluginPermissions: jest.fn().mockReturnValue(['network:fetch']),
  getPluginGrants: jest
    .fn()
    .mockReturnValue([
      { permission: 'network:fetch', grantedBy: 'manifest', grantedAt: Date.now() },
    ]),
  getAuditLog: jest.fn().mockReturnValue([]),
  check: jest.fn().mockReturnValue(true),
  checkMultiple: jest.fn().mockReturnValue(true),
  checkAny: jest.fn().mockReturnValue(true),
  request: jest.fn().mockResolvedValue(true),
};

jest.mock('@/lib/plugin/permission-guard', () => ({
  getPermissionGuard: () => mockGuard,
}));

describe('usePluginPermissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return permissions data', () => {
    const { result } = renderHook(() => usePluginPermissions({ pluginId: 'plugin-a' }));

    expect(result.current.permissions).toContain('network:fetch');
    expect(result.current.grants.length).toBeGreaterThan(0);
  });

  it('should check single permission', () => {
    const { result } = renderHook(() => usePluginPermissions({ pluginId: 'plugin-a' }));

    const hasPermission = result.current.hasPermission('network:fetch');
    expect(hasPermission).toBe(true);
  });

  it('should check multiple permissions', () => {
    const { result } = renderHook(() => usePluginPermissions({ pluginId: 'plugin-a' }));

    const hasAll = result.current.hasAllPermissions(['network:fetch']);
    expect(hasAll).toBe(true);
  });

  it('should check any permission', () => {
    const { result } = renderHook(() => usePluginPermissions({ pluginId: 'plugin-a' }));

    const hasAny = result.current.hasAnyPermission(['network:fetch', 'filesystem:read']);
    expect(hasAny).toBe(true);
  });

  it('should request permission', async () => {
    const { result } = renderHook(() => usePluginPermissions({ pluginId: 'plugin-a' }));

    await act(async () => {
      const granted = await result.current.requestPermission(
        'clipboard:read',
        'Need clipboard access'
      );
      expect(granted).toBe(true);
    });
  });

  it('should return audit log', () => {
    const { result } = renderHook(() => usePluginPermissions({ pluginId: 'plugin-a' }));

    expect(Array.isArray(result.current.auditLog)).toBe(true);
  });
});

describe('usePermissionCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should check if plugin has permission', () => {
    const { result } = renderHook(() => usePermissionCheck('plugin-a', 'network:fetch'));

    expect(result.current).toBe(true);
  });

  it('should return false for missing permission', () => {
    mockGuard.check.mockReturnValueOnce(false);

    const { result } = renderHook(() => usePermissionCheck('plugin-a', 'filesystem:write'));

    expect(result.current).toBe(false);
  });
});

describe('usePermissionRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGuard.check.mockReturnValue(false);
    mockGuard.request.mockResolvedValue(true);
  });

  it('should return request state', () => {
    const { result } = renderHook(() => usePermissionRequest('plugin-a', 'clipboard:read'));

    expect(result.current.request).toBeDefined();
    expect(result.current.isRequesting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should request permission', async () => {
    const { result } = renderHook(() => usePermissionRequest('plugin-a', 'clipboard:read'));

    await act(async () => {
      const granted = await result.current.request('Need clipboard access');
      expect(granted).toBe(true);
    });

    expect(result.current.granted).toBe(true);
  });

  it('should handle request errors', async () => {
    mockGuard.request.mockRejectedValueOnce(new Error('Permission denied'));

    const { result } = renderHook(() => usePermissionRequest('plugin-a', 'shell:execute'));

    await act(async () => {
      const granted = await result.current.request();
      expect(granted).toBe(false);
    });

    expect(result.current.error).toBe('Permission denied');
    expect(result.current.granted).toBe(false);
  });

  it('should skip request if already granted', async () => {
    mockGuard.check.mockReturnValueOnce(true);

    const { result } = renderHook(() => usePermissionRequest('plugin-a', 'network:fetch'));

    await act(async () => {
      const granted = await result.current.request();
      expect(granted).toBe(true);
    });

    expect(mockGuard.request).not.toHaveBeenCalled();
  });

  it('should indicate already granted on mount', () => {
    mockGuard.check.mockReturnValueOnce(true);

    const { result } = renderHook(() => usePermissionRequest('plugin-a', 'network:fetch'));

    expect(result.current.granted).toBe(true);
  });
});
