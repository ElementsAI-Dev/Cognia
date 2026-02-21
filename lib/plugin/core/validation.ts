/**
 * Plugin Validation - Validates plugin manifests and configurations
 */

import type {
  PluginManifest,
  PluginConfigSchema,
  PluginConfigProperty,
  PluginCapability,
  PluginPermission,
  PluginType,
} from '@/types/plugin';
import { loggers } from './logger';

// =============================================================================
// Types
// =============================================================================

export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

// =============================================================================
// Constants
// =============================================================================

const VALID_CAPABILITIES: PluginCapability[] = [
  'tools',
  'components',
  'modes',
  'skills',
  'themes',
  'commands',
  'hooks',
  'processors',
  'providers',
  'exporters',
  'importers',
  'a2ui',
  'python',
  'scheduler',
];

const VALID_PERMISSIONS: PluginPermission[] = [
  'filesystem:read',
  'filesystem:write',
  'network:fetch',
  'network:websocket',
  'clipboard:read',
  'clipboard:write',
  'notification',
  'shell:execute',
  'process:spawn',
  'database:read',
  'database:write',
  'settings:read',
  'settings:write',
  'session:read',
  'session:write',
  'agent:control',
  'python:execute',
];

const VALID_PLUGIN_TYPES: PluginType[] = ['frontend', 'python', 'hybrid'];

const ID_PATTERN = /^[a-z0-9]([a-z0-9-_.]*[a-z0-9])?$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(-[a-z0-9]+)?$/i;
const ACTIVATION_EVENT_PATTERN =
  /^(startup|onStartup|onCommand:\*|onCommand:.+|onTool:\*|onTool:.+|onAgentTool:\*|onAgentTool:.+|onChat:\*|onAgent:start|onA2UI:surface|onLanguage:.+|onFile:.+)$/;

// =============================================================================
// Manifest Validation
// =============================================================================

export function validatePluginManifest(manifest: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['Manifest must be an object'], warnings: [] };
  }

  const m = manifest as Record<string, unknown>;

  // Required fields
  if (!m.id || typeof m.id !== 'string') {
    errors.push('Missing or invalid "id" field');
  } else if (!ID_PATTERN.test(m.id)) {
    errors.push(`Invalid plugin ID "${m.id}". Must be lowercase alphanumeric with hyphens/underscores/dots`);
  }

  if (!m.name || typeof m.name !== 'string') {
    errors.push('Missing or invalid "name" field');
  } else if (m.name.length > 50) {
    warnings.push('Plugin name exceeds 50 characters');
  }

  if (!m.version || typeof m.version !== 'string') {
    errors.push('Missing or invalid "version" field');
  } else if (!VERSION_PATTERN.test(m.version)) {
    errors.push(`Invalid version "${m.version}". Must be semver format (e.g., 1.0.0)`);
  }

  if (!m.description || typeof m.description !== 'string') {
    errors.push('Missing or invalid "description" field');
  } else if (m.description.length > 500) {
    warnings.push('Plugin description exceeds 500 characters');
  }

  if (!m.type || typeof m.type !== 'string') {
    errors.push('Missing or invalid "type" field');
  } else if (!VALID_PLUGIN_TYPES.includes(m.type as PluginType)) {
    errors.push(`Invalid plugin type "${m.type}". Must be one of: ${VALID_PLUGIN_TYPES.join(', ')}`);
  }

  if (!m.capabilities || !Array.isArray(m.capabilities)) {
    errors.push('Missing or invalid "capabilities" field');
  } else {
    for (const cap of m.capabilities) {
      if (!VALID_CAPABILITIES.includes(cap as PluginCapability)) {
        errors.push(`Invalid capability "${cap}". Must be one of: ${VALID_CAPABILITIES.join(', ')}`);
      }
    }
  }

  // Entry points validation based on type
  if (m.type === 'frontend' || m.type === 'hybrid') {
    if (!m.main || typeof m.main !== 'string') {
      if (m.type === 'frontend') {
        errors.push('Frontend plugin must have a "main" entry point');
      }
    }
  }

  if (m.type === 'python' || m.type === 'hybrid') {
    if (!m.pythonMain || typeof m.pythonMain !== 'string') {
      if (m.type === 'python') {
        errors.push('Python plugin must have a "pythonMain" entry point');
      }
    }
  }

  // Optional fields validation
  if (m.permissions && Array.isArray(m.permissions)) {
    for (const perm of m.permissions) {
      if (!VALID_PERMISSIONS.includes(perm as PluginPermission)) {
        warnings.push(`Unknown permission "${perm}"`);
      }
    }
  }

  if (m.engines && typeof m.engines === 'object') {
    const engines = m.engines as Record<string, unknown>;
    if (engines.cognia && typeof engines.cognia !== 'string') {
      errors.push('Invalid "engines.cognia" field');
    }
    if (engines.python && typeof engines.python !== 'string') {
      errors.push('Invalid "engines.python" field');
    }
  }

  if (m.configSchema) {
    const schemaResult = validateConfigSchema(m.configSchema);
    errors.push(...schemaResult.errors);
    warnings.push(...schemaResult.warnings);
  }

  if (m.a2uiComponents && Array.isArray(m.a2uiComponents)) {
    for (let i = 0; i < m.a2uiComponents.length; i++) {
      const comp = m.a2uiComponents[i] as Record<string, unknown>;
      if (!comp.type || typeof comp.type !== 'string') {
        errors.push(`A2UI component at index ${i} missing "type" field`);
      }
      if (!comp.name || typeof comp.name !== 'string') {
        errors.push(`A2UI component at index ${i} missing "name" field`);
      }
    }
  }

  if (m.tools && Array.isArray(m.tools)) {
    for (let i = 0; i < m.tools.length; i++) {
      const tool = m.tools[i] as Record<string, unknown>;
      if (!tool.name || typeof tool.name !== 'string') {
        errors.push(`Tool at index ${i} missing "name" field`);
      }
      if (!tool.description || typeof tool.description !== 'string') {
        errors.push(`Tool at index ${i} missing "description" field`);
      }
      if (tool.parametersSchema !== undefined && typeof tool.parametersSchema !== 'object') {
        errors.push(`Tool at index ${i} has invalid "parametersSchema" field (must be an object)`);
      }
    }
  }

  if (m.modes && Array.isArray(m.modes)) {
    for (let i = 0; i < m.modes.length; i++) {
      const mode = m.modes[i] as Record<string, unknown>;
      if (!mode.id || typeof mode.id !== 'string') {
        errors.push(`Mode at index ${i} missing "id" field`);
      }
      if (!mode.name || typeof mode.name !== 'string') {
        errors.push(`Mode at index ${i} missing "name" field`);
      }
      if (!mode.icon || typeof mode.icon !== 'string') {
        errors.push(`Mode at index ${i} missing "icon" field`);
      }
    }
  }

  if (m.commands && Array.isArray(m.commands)) {
    for (let i = 0; i < m.commands.length; i++) {
      const command = m.commands[i] as Record<string, unknown>;
      if (!command.id || typeof command.id !== 'string') {
        errors.push(`Command at index ${i} missing "id" field`);
      }
      if (!command.name || typeof command.name !== 'string') {
        errors.push(`Command at index ${i} missing "name" field`);
      }
      if (command.description !== undefined && typeof command.description !== 'string') {
        errors.push(`Command at index ${i} has invalid "description" field`);
      }
      if (command.icon !== undefined && typeof command.icon !== 'string') {
        errors.push(`Command at index ${i} has invalid "icon" field`);
      }
      if (command.aliases !== undefined) {
        if (!Array.isArray(command.aliases)) {
          errors.push(`Command at index ${i} has invalid "aliases" field (must be an array)`);
        } else if (!command.aliases.every((alias) => typeof alias === 'string')) {
          errors.push(`Command at index ${i} has invalid "aliases" field (must contain strings)`);
        }
      }
    }
  }

  if (m.activationEvents !== undefined) {
    if (!Array.isArray(m.activationEvents)) {
      errors.push('"activationEvents" must be an array');
    } else {
      for (let i = 0; i < m.activationEvents.length; i++) {
        const event = m.activationEvents[i];
        if (typeof event !== 'string') {
          errors.push(`Activation event at index ${i} must be a string`);
          continue;
        }
        if (!ACTIVATION_EVENT_PATTERN.test(event)) {
          warnings.push(`Unknown activation event "${event}"`);
        }
      }
    }
  }

  if (m.activateOnStartup !== undefined && typeof m.activateOnStartup !== 'boolean') {
    errors.push('"activateOnStartup" must be a boolean');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// =============================================================================
// Config Schema Validation
// =============================================================================

function validateConfigSchema(schema: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!schema || typeof schema !== 'object') {
    return { valid: false, errors: ['Config schema must be an object'], warnings: [] };
  }

  const s = schema as Record<string, unknown>;

  if (s.type !== 'object') {
    errors.push('Config schema root type must be "object"');
  }

  if (s.properties && typeof s.properties === 'object') {
    const props = s.properties as Record<string, unknown>;
    for (const [key, value] of Object.entries(props)) {
      const propResult = validateConfigProperty(key, value);
      errors.push(...propResult.errors);
      warnings.push(...propResult.warnings);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateConfigProperty(
  name: string,
  prop: unknown
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!prop || typeof prop !== 'object') {
    errors.push(`Config property "${name}" must be an object`);
    return { valid: false, errors, warnings };
  }

  const p = prop as Record<string, unknown>;
  const validTypes = ['string', 'number', 'boolean', 'array', 'object'];

  if (!p.type || typeof p.type !== 'string') {
    errors.push(`Config property "${name}" missing "type" field`);
  } else if (!validTypes.includes(p.type)) {
    errors.push(`Config property "${name}" has invalid type "${p.type}"`);
  }

  if (p.type === 'array' && p.items) {
    const itemsResult = validateConfigProperty(`${name}.items`, p.items);
    errors.push(...itemsResult.errors);
    warnings.push(...itemsResult.warnings);
  }

  if (p.type === 'object' && p.properties) {
    const props = p.properties as Record<string, unknown>;
    for (const [key, value] of Object.entries(props)) {
      const propResult = validateConfigProperty(`${name}.${key}`, value);
      errors.push(...propResult.errors);
      warnings.push(...propResult.warnings);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// =============================================================================
// Config Value Validation
// =============================================================================

export function validatePluginConfig(
  config: Record<string, unknown>,
  schema?: PluginConfigSchema
): ConfigValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // If no schema provided, any config is valid
  if (!schema) {
    return { valid: true, errors: [], warnings: [] };
  }

  // Check required fields
  if (schema.required) {
    for (const required of schema.required) {
      if (config[required] === undefined) {
        errors.push({
          field: required,
          code: 'required',
          message: `Missing required config field: ${required}`,
        });
      }
    }
  }

  // Validate each property
  for (const [key, value] of Object.entries(config)) {
    const propSchema = schema.properties[key];
    if (!propSchema) {
      warnings.push(`Unknown config field: ${key}`);
      continue;
    }

    const propErrors = validateConfigValueWithErrors(key, value, propSchema);
    errors.push(...propErrors);
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateConfigValueWithErrors(
  name: string,
  value: unknown,
  schema: PluginConfigProperty
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Type check
  const actualType = Array.isArray(value) ? 'array' : typeof value;
  if (actualType !== schema.type) {
    errors.push({
      field: name,
      code: 'invalid_type',
      message: `Config field "${name}" expected type "${schema.type}" but got "${actualType}"`,
    });
    return errors;
  }

  // Enum check
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push({
      field: name,
      code: 'enum',
      message: `Config field "${name}" value must be one of: ${schema.enum.join(', ')}`,
    });
  }

  // String validations
  if (schema.type === 'string' && typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push({
        field: name,
        code: 'minLength',
        message: `Config field "${name}" must be at least ${schema.minLength} characters`,
      });
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push({
        field: name,
        code: 'maxLength',
        message: `Config field "${name}" must be at most ${schema.maxLength} characters`,
      });
    }
    if (schema.pattern) {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(value)) {
        errors.push({
          field: name,
          code: 'pattern',
          message: `Config field "${name}" does not match pattern: ${schema.pattern}`,
        });
      }
    }
  }

  // Number validations
  if (schema.type === 'number' && typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push({
        field: name,
        code: 'minimum',
        message: `Config field "${name}" must be at least ${schema.minimum}`,
      });
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push({
        field: name,
        code: 'maximum',
        message: `Config field "${name}" must be at most ${schema.maximum}`,
      });
    }
  }

  // Array validations
  if (schema.type === 'array' && Array.isArray(value) && schema.items) {
    for (let i = 0; i < value.length; i++) {
      const itemErrors = validateConfigValueWithErrors(`${name}[${i}]`, value[i], schema.items);
      errors.push(...itemErrors);
    }
  }

  // Object validations
  if (schema.type === 'object' && typeof value === 'object' && value !== null && schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const propValue = (value as Record<string, unknown>)[key];
      if (propValue !== undefined) {
        const propErrors = validateConfigValueWithErrors(`${name}.${key}`, propValue, propSchema);
        errors.push(...propErrors);
      }
    }
  }

  return errors;
}

// =============================================================================
// Manifest Parser
// =============================================================================

export function parseManifest(content: string): PluginManifest | null {
  try {
    const parsed = JSON.parse(content);
    const validation = validatePluginManifest(parsed);
    
    if (!validation.valid) {
      loggers.manager.error('Invalid plugin manifest:', validation.errors);
      return null;
    }
    
    if (validation.warnings.length > 0) {
      loggers.manager.warn('Plugin manifest warnings:', validation.warnings);
    }
    
    return parsed as PluginManifest;
  } catch (error) {
    loggers.manager.error('Failed to parse plugin manifest:', error);
    return null;
  }
}
