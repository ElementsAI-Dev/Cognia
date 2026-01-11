/**
 * Plugin Permission API Implementation
 * 
 * Provides permission management capabilities to plugins.
 */

import type {
  PluginPermissionAPI,
  ExtendedPluginPermission,
} from '@/types/plugin/plugin-extended';

// Permission grants by plugin
const grantedPermissions = new Map<string, Set<ExtendedPluginPermission>>();

// Permission mapping from manifest permissions to extended permissions
const permissionMapping: Record<string, ExtendedPluginPermission[]> = {
  'network:fetch': [],
  'fs:read': [],
  'fs:write': [],
  'clipboard:read': [],
  'clipboard:write': [],
  'shell:execute': [],
  'secrets:read': [],
  'secrets:write': [],
  // Extended permissions
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
  const permissions = new Set<ExtendedPluginPermission>();
  
  // Map manifest permissions to extended permissions
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
  // Initialize permissions if not already done
  if (!grantedPermissions.has(pluginId)) {
    initializePluginPermissions(pluginId, manifestPermissions);
  }

  const getPermissions = () => grantedPermissions.get(pluginId) || new Set();

  return {
    hasPermission: (permission: ExtendedPluginPermission): boolean => {
      return getPermissions().has(permission);
    },

    requestPermission: async (
      permission: ExtendedPluginPermission, 
      _reason?: string
    ): Promise<boolean> => {
      // For now, auto-grant requested permissions
      // In production, this would show a dialog to the user
      const permissions = getPermissions();
      permissions.add(permission);
      console.log(`[Plugin:${pluginId}] Granted permission: ${permission}`);
      return true;
    },

    getGrantedPermissions: (): ExtendedPluginPermission[] => {
      return Array.from(getPermissions());
    },

    hasAllPermissions: (permissions: ExtendedPluginPermission[]): boolean => {
      const granted = getPermissions();
      return permissions.every(p => granted.has(p));
    },

    hasAnyPermission: (permissions: ExtendedPluginPermission[]): boolean => {
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
export function grantPermission(pluginId: string, permission: ExtendedPluginPermission) {
  const permissions = grantedPermissions.get(pluginId) || new Set();
  permissions.add(permission);
  grantedPermissions.set(pluginId, permissions);
}

/**
 * Revoke a specific permission from a plugin
 */
export function revokePermission(pluginId: string, permission: ExtendedPluginPermission) {
  const permissions = grantedPermissions.get(pluginId);
  if (permissions) {
    permissions.delete(permission);
  }
}
