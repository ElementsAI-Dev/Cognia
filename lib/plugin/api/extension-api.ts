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

// Global extension registry
const extensions = new Map<ExtensionPoint, ExtensionRegistration[]>();

/**
 * Create the Extension Points API for a plugin
 */
export function createExtensionAPI(pluginId: string): PluginExtensionAPI {
  return {
    registerExtension: (
      point: ExtensionPoint,
      component: React.ComponentType<ExtensionProps>,
      options: ExtensionOptions = {}
    ) => {
      const extensionId = `${pluginId}:${nanoid()}`;
      
      const registration: ExtensionRegistration = {
        id: extensionId,
        pluginId,
        point,
        component,
        options: {
          priority: options.priority || 0,
          condition: options.condition,
        },
      };

      // Add to registry
      if (!extensions.has(point)) {
        extensions.set(point, []);
      }
      extensions.get(point)!.push(registration);

      // Sort by priority
      extensions.get(point)!.sort((a, b) => 
        (b.options.priority || 0) - (a.options.priority || 0)
      );

      console.log(`[Plugin:${pluginId}] Registered extension at ${point}`);

      // Return unregister function
      return () => {
        const pointExtensions = extensions.get(point);
        if (pointExtensions) {
          const index = pointExtensions.findIndex(e => e.id === extensionId);
          if (index !== -1) {
            pointExtensions.splice(index, 1);
          }
        }
        console.log(`[Plugin:${pluginId}] Unregistered extension at ${point}`);
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
}
