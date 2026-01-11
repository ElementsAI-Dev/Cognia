/**
 * React hooks for Plugin Permissions
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  getPermissionGuard,
  type PermissionGrant,
  type PermissionAuditEntry,
} from '@/lib/plugin/permission-guard';
import type { PluginPermission } from '@/types/plugin';

// =============================================================================
// usePluginPermissions
// =============================================================================

export interface UsePluginPermissionsOptions {
  pluginId: string;
}

export interface UsePluginPermissionsResult {
  permissions: PluginPermission[];
  grants: PermissionGrant[];
  hasPermission: (permission: PluginPermission) => boolean;
  hasAllPermissions: (permissions: PluginPermission[]) => boolean;
  hasAnyPermission: (permissions: PluginPermission[]) => boolean;
  requestPermission: (permission: PluginPermission, reason?: string) => Promise<boolean>;
  auditLog: PermissionAuditEntry[];
}

export function usePluginPermissions(
  options: UsePluginPermissionsOptions
): UsePluginPermissionsResult {
  const { pluginId } = options;
  const guard = useMemo(() => getPermissionGuard(), []);

  const [permissions, setPermissions] = useState<PluginPermission[]>(() =>
    guard.getPluginPermissions(pluginId)
  );

  const [grants, setGrants] = useState<PermissionGrant[]>(() =>
    guard.getPluginGrants(pluginId)
  );

  const [auditLog, setAuditLog] = useState<PermissionAuditEntry[]>(() =>
    guard.getAuditLog({ pluginId, limit: 50 })
  );

  // Refresh permissions when they might have changed
  const refreshPermissions = useCallback(() => {
    setPermissions(guard.getPluginPermissions(pluginId));
    setGrants(guard.getPluginGrants(pluginId));
    setAuditLog(guard.getAuditLog({ pluginId, limit: 50 }));
  }, [guard, pluginId]);

  useEffect(() => {
    // Set up a polling interval for permission changes (skip initial call)
    const interval = setInterval(refreshPermissions, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [refreshPermissions]);

  const hasPermission = useCallback(
    (permission: PluginPermission) => {
      return guard.check(pluginId, permission);
    },
    [guard, pluginId]
  );

  const hasAllPermissions = useCallback(
    (perms: PluginPermission[]) => {
      return guard.checkMultiple(pluginId, perms);
    },
    [guard, pluginId]
  );

  const hasAnyPermission = useCallback(
    (perms: PluginPermission[]) => {
      return guard.checkAny(pluginId, perms);
    },
    [guard, pluginId]
  );

  const requestPermission = useCallback(
    async (permission: PluginPermission, reason?: string) => {
      const result = await guard.request(pluginId, permission, reason);
      refreshPermissions();
      return result;
    },
    [guard, pluginId, refreshPermissions]
  );

  return {
    permissions,
    grants,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    requestPermission,
    auditLog,
  };
}

// =============================================================================
// usePermissionCheck
// =============================================================================

export function usePermissionCheck(
  pluginId: string,
  permission: PluginPermission
): boolean {
  const guard = useMemo(() => getPermissionGuard(), []);
  const [hasPermission, setHasPermission] = useState(() =>
    guard.check(pluginId, permission)
  );

  useEffect(() => {
    setHasPermission(guard.check(pluginId, permission));
  }, [guard, pluginId, permission]);

  return hasPermission;
}

// =============================================================================
// usePermissionRequest
// =============================================================================

export interface UsePermissionRequestResult {
  request: (reason?: string) => Promise<boolean>;
  isRequesting: boolean;
  granted: boolean | null;
  error: string | null;
}

export function usePermissionRequest(
  pluginId: string,
  permission: PluginPermission
): UsePermissionRequestResult {
  const guard = useMemo(() => getPermissionGuard(), []);
  const [isRequesting, setIsRequesting] = useState(false);
  const [granted, setGranted] = useState<boolean | null>(() =>
    guard.check(pluginId, permission) ? true : null
  );
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(
    async (reason?: string) => {
      if (guard.check(pluginId, permission)) {
        setGranted(true);
        return true;
      }

      setIsRequesting(true);
      setError(null);

      try {
        const result = await guard.request(pluginId, permission, reason);
        setGranted(result);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setGranted(false);
        return false;
      } finally {
        setIsRequesting(false);
      }
    },
    [guard, pluginId, permission]
  );

  return {
    request,
    isRequesting,
    granted,
    error,
  };
}

// =============================================================================
// Exports
// =============================================================================

export type { PluginPermission, PermissionGrant, PermissionAuditEntry };
