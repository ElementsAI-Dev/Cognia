/**
 * Plugin Manifest Types
 *
 * @description Type definitions for plugin manifest configuration.
 * The manifest describes a plugin's metadata, requirements, and capabilities.
 */

import type { PluginType, PluginCapability, PluginPermission } from '../core/types';
import type { A2UIPluginComponentDef, A2UITemplateDef } from '../a2ui/types';
import type { PluginToolDef } from '../tools/types';
import type { PluginModeDef } from '../modes/types';

/**
 * Plugin manifest - describes a plugin's metadata and requirements
 *
 * @remarks
 * The manifest is the core configuration file for a plugin. It must be
 * included in the plugin's package.json or as a separate plugin.json file.
 *
 * @example
 * ```typescript
 * const manifest: PluginManifest = {
 *   id: 'com.example.my-plugin',
 *   name: 'My Plugin',
 *   version: '1.0.0',
 *   description: 'My awesome plugin',
 *   type: 'frontend',
 *   main: 'dist/index.js',
 *   capabilities: ['tools', 'hooks'],
 *   permissions: ['network:fetch'],
 *   engines: {
 *     cognia: '>=1.0.0',
 *   },
 * };
 * ```
 *
 * @see {@link PluginDefinition} for the plugin's activation logic
 */
export interface PluginManifest {
  /** Unique plugin identifier (reverse domain notation recommended) */
  id: string;

  /** Human-readable name */
  name: string;

  /** Semantic version (semver) */
  version: string;

  /** Plugin description */
  description: string;

  /** Author information */
  author?: {
    name: string;
    email?: string;
    url?: string;
  };

  /** Homepage/documentation URL */
  homepage?: string;

  /** Repository URL */
  repository?: string;

  /** License identifier (SPDX) */
  license?: string;

  /** Plugin type */
  type: PluginType;

  /** Capabilities this plugin provides */
  capabilities: PluginCapability[];

  /** Keywords for search/discovery */
  keywords?: string[];

  /** Icon (Lucide icon name or data URL) */
  icon?: string;

  /** Preview images */
  screenshots?: string[];

  // Entry Points
  /** Main entry point for frontend code */
  main?: string;

  /** Entry point for Python code */
  pythonMain?: string;

  /** Style entry point (CSS) */
  styles?: string;

  // Dependencies
  /** Plugin dependencies */
  dependencies?: Record<string, string>;

  /** Host application version requirements */
  engines?: {
    cognia?: string;
    node?: string;
    python?: string;
  };

  /** Python package dependencies */
  pythonDependencies?: string[];

  // Configuration
  /** JSON Schema for plugin configuration */
  configSchema?: PluginConfigSchema;

  /** Default configuration values */
  defaultConfig?: Record<string, unknown>;

  // Permissions
  /** Required permissions */
  permissions?: PluginPermission[];

  /** Optional permissions (requested at runtime) */
  optionalPermissions?: PluginPermission[];

  // A2UI Integration
  /** Custom A2UI components provided */
  a2uiComponents?: A2UIPluginComponentDef[];

  /** A2UI surface templates provided */
  a2uiTemplates?: A2UITemplateDef[];

  // Agent Integration
  /** Agent tools provided */
  tools?: PluginToolDef[];

  /** Agent modes provided */
  modes?: PluginModeDef[];

  // Activation
  /** Activation events - when to load the plugin */
  activationEvents?: PluginActivationEvent[];

  /** Whether plugin should be loaded at startup */
  activateOnStartup?: boolean;

  // Scheduled Tasks
  /** Scheduled tasks provided by this plugin */
  scheduledTasks?: PluginScheduledTaskDef[];
}

/**
 * Scheduled task definition in plugin manifest
 */
export interface PluginScheduledTaskDef {
  /** Task name */
  name: string;

  /** Task description */
  description?: string;

  /** Handler function name */
  handler: string;

  /** Trigger configuration */
  trigger: PluginManifestTaskTrigger;

  /** Whether task is enabled by default */
  defaultEnabled?: boolean;

  /** Retry configuration */
  retry?: {
    maxAttempts: number;
    delaySeconds: number;
  };

  /** Timeout in seconds */
  timeout?: number;

  /** Tags for organization */
  tags?: string[];
}

/**
 * Task trigger configuration in manifest
 */
export type PluginManifestTaskTrigger =
  | { type: 'cron'; expression: string; timezone?: string }
  | { type: 'interval'; seconds: number }
  | { type: 'once'; runAt: string }
  | { type: 'event'; eventType: string; eventSource?: string };

/**
 * Configuration schema definition
 *
 * @remarks
 * Defines the structure and validation rules for plugin configuration.
 * Uses JSON Schema format for validation.
 *
 * @example
 * ```typescript
 * const configSchema: PluginConfigSchema = {
 *   type: 'object',
 *   properties: {
 *     apiKey: {
 *       type: 'string',
 *       title: 'API Key',
 *       description: 'Your API key for the service',
 *     },
 *     maxResults: {
 *       type: 'number',
 *       title: 'Max Results',
 *       default: 10,
 *       minimum: 1,
 *       maximum: 100,
 *     },
 *   },
 *   required: ['apiKey'],
 * };
 * ```
 */
export interface PluginConfigSchema {
  type: 'object';
  properties: Record<string, PluginConfigProperty>;
  required?: string[];
}

/**
 * Configuration property definition
 *
 * @remarks
 * Individual property schema for plugin configuration.
 */
export interface PluginConfigProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  enumDescriptions?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  items?: PluginConfigProperty;
  properties?: Record<string, PluginConfigProperty>;
}

/**
 * Activation events for lazy loading plugins
 *
 * @remarks
 * Plugins can specify when they should be loaded. This allows for
 * lazy loading and better performance.
 *
 * @example
 * ```typescript
 * const manifest: PluginManifest = {
 *   activationEvents: [
 *     'onStartup',
 *     'onCommand:my-plugin.do-something',
 *     'onChat:*',
 *   ],
 * };
 * ```
 */
export type PluginActivationEvent =
  | 'onStartup'
  | 'onCommand:*'
  | `onCommand:${string}`
  | 'onChat:*'
  | 'onAgent:start'
  | 'onA2UI:surface'
  | `onLanguage:${string}`
  | `onFile:${string}`;
