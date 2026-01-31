/**
 * Plugin Permission API Implementation
 * 
 * Provides permission management capabilities to plugins.
 */

import type {
  PluginPermissionAPI,
  PluginAPIPermission,
} from '@/types/plugin/plugin-extended';
import { createPluginSystemLogger } from '../logger';

// Permission grants by plugin
const grantedPermissions = new Map<string, Set<PluginAPIPermission>>();

// Permission mapping from manifest permissions to API permissions
const permissionMapping: Record<string, PluginAPIPermission[]> = {
  'network:fetch': [],
  'fs:read': [],
  'fs:write': [],
  'clipboard:read': [],
  'clipboard:write': [],
  'shell:execute': [],
  'secrets:read': [],
  'secrets:write': [],
  // API permissions
  'session:read': ['session:read'],
  'session:write': ['session:write'],
  'session:delete': ['session:delete'],
  'project:read': ['project:read'],
  'project:write': ['project:write'],
  'project:delete': ['project:delete'],
  'vector:read': ['vector:read'],
  'vector:write': ['vector:write'],
  'canvas:read': ['canvas:read'],
  'canvas:write': ['canvas:write'],
  'artifact:read': ['artifact:read'],
  'artifact:write': ['artifact:write'],
  'ai:chat': ['ai:chat'],
  'ai:embed': ['ai:embed'],
  'export:session': ['export:session'],
  'export:project': ['export:project'],
  'theme:read': ['theme:read'],
  'theme:write': ['theme:write'],
  'extension:ui': ['extension:ui'],
  'notification:show': ['notification:show'],
};

/**
 * Initialize permissions for a plugin based on its manifest
 */
export function initializePluginPermissions(pluginId: string, manifestPermissions: string[]) {
  const permissions = new Set<PluginAPIPermission>();
  
  // Map manifest permissions to API permissions
  for (const perm of manifestPermissions) {
    const mapped = permissionMapping[perm];
    if (mapped) {
      for (const p of mapped) {
        permissions.add(p);
      }
    }
  }

  // Grant some default permissions
  permissions.add('notification:show');
  permissions.add('theme:read');

  grantedPermissions.set(pluginId, permissions);
}

/**
 * Create the Permission API for a plugin
 */
export function createPermissionAPI(
  pluginId: string, 
  manifestPermissions: string[]
): PluginPermissionAPI {
  const logger = createPluginSystemLogger(pluginId);
  // Initialize permissions if not already done
  if (!grantedPermissions.has(pluginId)) {
    initializePluginPermissions(pluginId, manifestPermissions);
  }

  const getPermissions = () => grantedPermissions.get(pluginId) || new Set();

  return {
    hasPermission: (permission: PluginAPIPermission): boolean => {
      return getPermissions().has(permission);
    },

    requestPermission: async (
      permission: PluginAPIPermission, 
      _reason?: string
    ): Promise<boolean> => {
      // For now, auto-grant requested permissions
      // In production, this would show a dialog to the user
      const permissions = getPermissions();
      permissions.add(permission);
      logger.info(`Granted permission: ${permission}`);
      return true;
    },

    getGrantedPermissions: (): PluginAPIPermission[] => {
      return Array.from(getPermissions());
    },

    hasAllPermissions: (permissions: PluginAPIPermission[]): boolean => {
      const granted = getPermissions();
      return permissions.every(p => granted.has(p));
    },

    hasAnyPermission: (permissions: PluginAPIPermission[]): boolean => {
      const granted = getPermissions();
      return permissions.some(p => granted.has(p));
    },
  };
}

/**
 * Revoke all permissions for a plugin
 */
export function revokePluginPermissions(pluginId: string) {
  grantedPermissions.delete(pluginId);
}

/**
 * Grant a specific permission to a plugin
 */
export function grantPermission(pluginId: string, permission: PluginAPIPermission) {
  const permissions = grantedPermissions.get(pluginId) || new Set();
  permissions.add(permission);
  grantedPermissions.set(pluginId, permissions);
}

/**
 * Revoke a specific permission from a plugin
 */
export function revokePermission(pluginId: string, permission: PluginAPIPermission) {
  const permissions = grantedPermissions.get(pluginId);
  if (permissions) {
    permissions.delete(permission);
  }
}
