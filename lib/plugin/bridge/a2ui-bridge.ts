/**
 * Plugin A2UI Bridge - Connects plugin system with A2UI rendering
 */

import React from 'react';
import type {
  PluginA2UIComponent,
  A2UITemplateDef,
  A2UIPluginComponentProps,
} from '@/types/plugin';
import type { A2UIComponent as _A2UIComponent, A2UISurfaceType } from '@/types/artifact/a2ui';
import { useA2UIStore } from '@/stores/a2ui';
import { registerComponent, unregisterComponent } from '@/lib/a2ui/catalog';
import type { PluginRegistry } from '../core/registry';
import type { PluginLifecycleHooks } from '../messaging/hooks-system';
import { loggers } from '../core/logger';

// =============================================================================
// Types
// =============================================================================

interface A2UIBridgeConfig {
  registry: PluginRegistry;
  hooksManager: PluginLifecycleHooks;
}

// =============================================================================
// Plugin A2UI Bridge
// =============================================================================

export class PluginA2UIBridge {
  private config: A2UIBridgeConfig;
  private registeredComponents: Map<string, string> = new Map(); // type -> pluginId
  private registeredTemplates: Map<string, string> = new Map(); // templateId -> pluginId
  private unsubscribers: Array<() => void> = [];

  constructor(config: A2UIBridgeConfig) {
    this.config = config;
    this.setupEventListeners();
  }

  // ===========================================================================
  // Setup
  // ===========================================================================

  private setupEventListeners(): void {
    const _a2uiStore = useA2UIStore.getState();

    // Subscribe to A2UI events and forward to plugins
    // This would integrate with the A2UI event system
    
    // For now, we'll use a polling approach or integrate with store subscriptions
    const unsubscribe = useA2UIStore.subscribe((state, prevState) => {
      // Detect surface changes
      const currentSurfaces = Object.keys(state.surfaces);
      const prevSurfaces = Object.keys(prevState.surfaces);

      // New surfaces
      for (const surfaceId of currentSurfaces) {
        if (!prevSurfaces.includes(surfaceId)) {
          const surface = state.surfaces[surfaceId];
          this.config.hooksManager.dispatchOnA2UISurfaceCreate(
            surfaceId,
            surface.type as A2UISurfaceType
          );
        }
      }

      // Deleted surfaces
      for (const surfaceId of prevSurfaces) {
        if (!currentSurfaces.includes(surfaceId)) {
          this.config.hooksManager.dispatchOnA2UISurfaceDestroy(surfaceId);
        }
      }
    });

    this.unsubscribers.push(unsubscribe);
  }

  // ===========================================================================
  // Component Registration
  // ===========================================================================

  /**
   * Register a plugin component with A2UI
   */
  registerComponent(pluginId: string, component: PluginA2UIComponent): void {
    const { type, metadata } = component;

    // Check for conflicts
    if (this.registeredComponents.has(type)) {
      const existingPluginId = this.registeredComponents.get(type);
      loggers.manager.warn(
        `Component type "${type}" already registered by plugin "${existingPluginId}". ` +
        `Overwriting with plugin "${pluginId}".`
      );
    }

    // Create wrapper component that provides plugin context
    const WrappedComponent = this.createWrappedComponent(pluginId, component);

    // Register with A2UI catalog
    registerComponent(type as never, WrappedComponent as never, {
      description: metadata.description,
    });

    // Track registration
    this.registeredComponents.set(type, pluginId);
    this.config.registry.registerComponent(pluginId, component);
  }

  /**
   * Unregister a plugin component
   */
  unregisterComponent(componentType: string): void {
    if (!this.registeredComponents.has(componentType)) {
      return;
    }

    unregisterComponent(componentType as never);
    this.registeredComponents.delete(componentType);
    this.config.registry.unregisterComponent(componentType);
  }

  /**
   * Unregister all components from a plugin
   */
  unregisterPluginComponents(pluginId: string): void {
    for (const [type, ownerPluginId] of this.registeredComponents.entries()) {
      if (ownerPluginId === pluginId) {
        this.unregisterComponent(type);
      }
    }
  }

  /**
   * Create a wrapped component with plugin context
   */
  private createWrappedComponent(
    pluginId: string,
    pluginComponent: PluginA2UIComponent
  ): React.ComponentType<A2UIPluginComponentProps> {
    const OriginalComponent = pluginComponent.component;

    // Return a wrapper that injects plugin context
    return function PluginComponentWrapper(props: A2UIPluginComponentProps) {
      // Add plugin context to props
      const enhancedProps: A2UIPluginComponentProps = {
        ...props,
        pluginContext: {
          pluginId,
          pluginPath: '',
          config: {},
          logger: console as never,
          storage: {} as never,
          events: {} as never,
          ui: {} as never,
          a2ui: {} as never,
          agent: {} as never,
          settings: {} as never,
          network: {} as never,
          fs: {} as never,
          clipboard: {} as never,
          shell: {} as never,
          db: {} as never,
          shortcuts: {} as never,
          contextMenu: {} as never,
          window: {} as never,
          secrets: {} as never,
        },
      };

      // Use React.createElement instead of JSX (this is a .ts file)
      return React.createElement(OriginalComponent, enhancedProps);
    };
  }

  // ===========================================================================
  // Template Registration
  // ===========================================================================

  /**
   * Register a surface template
   */
  registerTemplate(pluginId: string, template: A2UITemplateDef): void {
    const templateId = `${pluginId}:${template.id}`;

    if (this.registeredTemplates.has(templateId)) {
      loggers.manager.warn(`Template "${templateId}" already registered. Overwriting.`);
    }

    this.registeredTemplates.set(templateId, pluginId);
    this.config.registry.registerTemplate(pluginId, {
      ...template,
      id: templateId,
    });
  }

  /**
   * Unregister a template
   */
  unregisterTemplate(templateId: string): void {
    if (!this.registeredTemplates.has(templateId)) {
      return;
    }

    this.registeredTemplates.delete(templateId);
    this.config.registry.unregisterTemplate(templateId);
  }

  /**
   * Unregister all templates from a plugin
   */
  unregisterPluginTemplates(pluginId: string): void {
    for (const [templateId, ownerPluginId] of this.registeredTemplates.entries()) {
      if (ownerPluginId === pluginId) {
        this.unregisterTemplate(templateId);
      }
    }
  }

  // ===========================================================================
  // Surface Operations
  // ===========================================================================

  /**
   * Create a surface from a template
   */
  createSurfaceFromTemplate(
    templateId: string,
    surfaceId: string,
    dataOverrides?: Record<string, unknown>
  ): void {
    const template = this.config.registry.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const a2uiStore = useA2UIStore.getState();

    // Create surface
    a2uiStore.createSurface(surfaceId, template.surfaceType, {
      title: template.name,
    });

    // Update components
    a2uiStore.processMessage({
      type: 'updateComponents',
      surfaceId,
      components: template.components,
    });

    // Update data model
    const dataModel = {
      ...template.dataModel,
      ...dataOverrides,
    };

    a2uiStore.processMessage({
      type: 'dataModelUpdate',
      surfaceId,
      data: dataModel,
      merge: false,
    });
  }

  // ===========================================================================
  // Utilities
  // ===========================================================================

  /**
   * Get all registered component types
   */
  getRegisteredComponentTypes(): string[] {
    return Array.from(this.registeredComponents.keys());
  }

  /**
   * Get all registered templates
   */
  getRegisteredTemplates(): A2UITemplateDef[] {
    return this.config.registry.getAllTemplates();
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): A2UITemplateDef[] {
    return this.config.registry.getTemplatesByCategory(category);
  }

  /**
   * Check if a component type is registered by a plugin
   */
  isPluginComponent(componentType: string): boolean {
    return this.registeredComponents.has(componentType);
  }

  /**
   * Get the plugin ID that registered a component
   */
  getComponentPluginId(componentType: string): string | undefined {
    return this.registeredComponents.get(componentType);
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    this.unsubscribers = [];

    // Unregister all components
    for (const type of this.registeredComponents.keys()) {
      unregisterComponent(type as never);
    }
    this.registeredComponents.clear();
    this.registeredTemplates.clear();
  }
}

// =============================================================================
// Factory
// =============================================================================

export function createPluginA2UIBridge(config: A2UIBridgeConfig): PluginA2UIBridge {
  return new PluginA2UIBridge(config);
}
