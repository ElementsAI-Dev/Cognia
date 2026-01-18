/**
 * A2UI Integration Types
 *
 * @description Type definitions for A2UI (AI-to-UI) integration.
 * A2UI allows plugins to provide custom UI components for AI-generated interfaces.
 */

import type { PluginContext } from '../context/base';

/**
 * A2UI component definition in plugin manifest
 *
 * @remarks
 * A2UI (AI-to-UI) components allow plugins to provide custom UI components
 * that can be used in AI-generated interfaces.
 *
 * @example
 * ```typescript
 * const componentDef: A2UIPluginComponentDef = {
 *   type: 'weather-card',
 *   name: 'Weather Card',
 *   description: 'Displays weather information',
 *   category: 'display',
 *   icon: 'cloud',
 *   propsSchema: {
 *     type: 'object',
 *     properties: {
 *       location: { type: 'string' },
 *       units: { type: 'string', enum: ['celsius', 'fahrenheit'] },
 *     },
 *   },
 * };
 * ```
 */
export interface A2UIPluginComponentDef {
  /** Component type name */
  type: string;

  /** Display name */
  name: string;

  /** Description */
  description?: string;

  /** Category for organization */
  category?: 'layout' | 'form' | 'display' | 'data' | 'custom';

  /** Icon (Lucide name) */
  icon?: string;

  /** JSON Schema for component props */
  propsSchema?: Record<string, unknown>;

  /** Whether component supports children */
  supportsChildren?: boolean;

  /** Default props */
  defaultProps?: Record<string, unknown>;
}

/**
 * A2UI template definition
 *
 * @remarks
 * Templates are pre-built A2UI component trees that can be used as
 * starting points for AI-generated interfaces.
 */
export interface A2UITemplateDef {
  /** Template ID */
  id: string;

  /** Display name */
  name: string;

  /** Description */
  description?: string;

  /** Template category */
  category?: string;

  /** Icon */
  icon?: string;

  /** Surface type */
  surfaceType: string; // A2UISurfaceType from core types

  /** Preview image */
  preview?: string;

  /** Component tree */
  components: unknown[]; // A2UIComponent[]

  /** Initial data model */
  dataModel?: Record<string, unknown>;

  /** Tags for search */
  tags?: string[];
}

/**
 * Registered A2UI component from plugin
 *
 * @remarks
 * Runtime representation of a registered A2UI component.
 */
export interface PluginA2UIComponent {
  /** Component type (used in A2UI spec) */
  type: string;

  /** Plugin that provides this component */
  pluginId: string;

  /** React component */
  component: unknown; // React.ComponentType<A2UIPluginComponentProps>

  /** Component metadata */
  metadata: A2UIPluginComponentDef;
}

/**
 * Props passed to plugin A2UI components
 *
 * @remarks
 * These props are provided to custom A2UI components when they are rendered.
 */
export interface A2UIPluginComponentProps {
  /** Component definition */
  component: unknown; // A2UIComponent

  /** Surface ID */
  surfaceId: string;

  /** Data model */
  dataModel: Record<string, unknown>;

  /** Action handler */
  onAction: (action: string, data?: Record<string, unknown>) => void;

  /** Data change handler */
  onDataChange: (path: string, value: unknown) => void;

  /** Child renderer */
  renderChild: (componentId: string) => unknown; // React.ReactNode

  /** Plugin context */
  pluginContext: PluginContext;
}

/**
 * A2UI action payload
 */
export interface PluginA2UIAction {
  surfaceId: string;
  action: string;
  componentId: string;
  data?: Record<string, unknown>;
}

/**
 * A2UI data change payload
 */
export interface PluginA2UIDataChange {
  surfaceId: string;
  path: string;
  value: unknown;
  previousValue?: unknown;
}

/**
 * A2UI API for AI-generated UI
 *
 * @remarks
 * Allows plugins to create and manage A2UI surfaces and components.
 *
 * @example
 * ```typescript
 * // Create a surface
 * context.a2ui.createSurface('my-surface', 'panel', {
 *   title: 'My Panel',
 * });
 *
 * // Update components
 * context.a2ui.updateComponents('my-surface', components);
 *
 * // Update data model
 * context.a2ui.updateDataModel('my-surface', { foo: 'bar' });
 *
 * // Delete surface
 * context.a2ui.deleteSurface('my-surface');
 * ```
 */
export interface PluginA2UIAPI {
  createSurface: (id: string, type: string, options?: { title?: string }) => void;
  deleteSurface: (id: string) => void;
  updateComponents: (surfaceId: string, components: unknown[]) => void;
  updateDataModel: (surfaceId: string, data: Record<string, unknown>, merge?: boolean) => void;
  getSurface: (id: string) => unknown | undefined;
  registerComponent: (component: PluginA2UIComponent) => void;
  registerTemplate: (template: A2UITemplateDef) => void;
}
