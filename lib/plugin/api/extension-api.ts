/**
 * Plugin Extension Points API Implementation
 * 
 * Provides UI extension point capabilities to plugins.
 */

import type {
  PluginExtensionAPI,
  ExtensionPoint,
  ExtensionOptions,
  ExtensionRegistration,
  ExtensionProps,
} from '@/types/plugin/plugin-extended';
import { nanoid } from 'nanoid';
import React from 'react';
import { createPluginSystemLogger } from '../core/logger';
import {
  type PluginPointDiagnostic,
  type PluginPointGovernanceMode,
  validateExtensionPoint,
} from '../contracts/plugin-points';

interface CreateExtensionAPIOptions {
  governanceMode?: PluginPointGovernanceMode;
  hasPermission?: (permission: string) => boolean;
  onDiagnostic?: (diagnostic: PluginPointDiagnostic) => void;
}

// Global extension registry
const extensions = new Map<ExtensionPoint, ExtensionRegistration[]>();
const pluginExtensionIds = new Map<string, Set<string>>();
const extensionDiagnostics = new Map<string, PluginPointDiagnostic[]>();

function recordExtensionDiagnostic(
  pluginId: string,
  diagnostic: PluginPointDiagnostic,
  onDiagnostic?: (diagnostic: PluginPointDiagnostic) => void
): void {
  const list = extensionDiagnostics.get(pluginId) || [];
  list.push(diagnostic);
  extensionDiagnostics.set(pluginId, list);
  onDiagnostic?.(diagnostic);
}

/**
 * Create the Extension Points API for a plugin
 */
export function createExtensionAPI(
  pluginId: string,
  options: CreateExtensionAPIOptions = {}
): PluginExtensionAPI {
  const logger = createPluginSystemLogger(pluginId);
  return {
    registerExtension: (
      point: ExtensionPoint,
      component: React.ComponentType<ExtensionProps>,
      extensionOptions: ExtensionOptions = {}
    ) => {
      const validation = validateExtensionPoint(String(point), {
        governanceMode: options.governanceMode || 'warn',
        hasPermission: options.hasPermission,
      });

      for (const diagnostic of validation.diagnostics) {
        recordExtensionDiagnostic(pluginId, diagnostic, options.onDiagnostic);
        if (diagnostic.severity === 'error') {
          logger.error(`[extension:${diagnostic.code}] ${diagnostic.message}`);
        } else {
          logger.warn(`[extension:${diagnostic.code}] ${diagnostic.message}`);
        }
      }

      if (!validation.allowed || !validation.canonicalId) {
        throw new Error(
          `Extension registration blocked for plugin ${pluginId} at point "${String(point)}"`
        );
      }

      const normalizedPoint = validation.canonicalId as ExtensionPoint;
      const extensionId = `${pluginId}:${nanoid()}`;
      
      const registration: ExtensionRegistration = {
        id: extensionId,
        pluginId,
        point: normalizedPoint,
        component,
        options: {
          priority: extensionOptions.priority || 0,
          condition: extensionOptions.condition,
        },
      };

      // Add to registry
      if (!extensions.has(normalizedPoint)) {
        extensions.set(normalizedPoint, []);
      }
      extensions.get(normalizedPoint)!.push(registration);

      // Sort by priority
      extensions.get(normalizedPoint)!.sort((a, b) =>
        (b.options.priority || 0) - (a.options.priority || 0)
      );

      const ownedIds = pluginExtensionIds.get(pluginId) || new Set<string>();
      ownedIds.add(extensionId);
      pluginExtensionIds.set(pluginId, ownedIds);

      logger.info(`Registered extension at ${normalizedPoint}`);

      // Return unregister function
      return () => {
        const pointExtensions = extensions.get(normalizedPoint);
        if (pointExtensions) {
          const index = pointExtensions.findIndex(e => e.id === extensionId);
          if (index !== -1) {
            pointExtensions.splice(index, 1);
          }
        }
        const pluginIds = pluginExtensionIds.get(pluginId);
        pluginIds?.delete(extensionId);
        if (pluginIds && pluginIds.size === 0) {
          pluginExtensionIds.delete(pluginId);
        }
        logger.info(`Unregistered extension at ${normalizedPoint}`);
      };
    },

    getExtensions: (point: ExtensionPoint): ExtensionRegistration[] => {
      const pointExtensions = extensions.get(point) || [];
      
      // Filter by condition if specified
      return pointExtensions.filter(ext => {
        if (ext.options.condition) {
          try {
            return ext.options.condition();
          } catch {
            return false;
          }
        }
        return true;
      });
    },

    hasExtensions: (point: ExtensionPoint): boolean => {
      const pointExtensions = extensions.get(point) || [];
      return pointExtensions.some(ext => {
        if (ext.options.condition) {
          try {
            return ext.options.condition();
          } catch {
            return false;
          }
        }
        return true;
      });
    },
  };
}

/**
 * Get all extensions for a point (for use by host components)
 */
export function getExtensionsForPoint(point: ExtensionPoint): ExtensionRegistration[] {
  const pointExtensions = extensions.get(point) || [];
  
  return pointExtensions.filter(ext => {
    if (ext.options.condition) {
      try {
        return ext.options.condition();
      } catch {
        return false;
      }
    }
    return true;
  });
}

/**
 * Clear all extensions for a plugin
 */
export function clearPluginExtensions(pluginId: string) {
  for (const [point, pointExtensions] of extensions) {
    const filtered = pointExtensions.filter(ext => ext.pluginId !== pluginId);
    extensions.set(point, filtered);
  }
  pluginExtensionIds.delete(pluginId);
  extensionDiagnostics.delete(pluginId);
}

export function getPluginExtensionRegistrationCount(pluginId: string): number {
  return pluginExtensionIds.get(pluginId)?.size || 0;
}

export function getPluginExtensionDiagnostics(pluginId: string): PluginPointDiagnostic[] {
  return [...(extensionDiagnostics.get(pluginId) || [])];
}

export function clearAllExtensionDiagnostics(): void {
  extensionDiagnostics.clear();
}
