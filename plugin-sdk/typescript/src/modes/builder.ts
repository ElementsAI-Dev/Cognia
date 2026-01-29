/**
 * Mode Builder for TypeScript Plugin SDK
 *
 * @description Fluent builder for creating mode definitions.
 * Provides a convenient API for constructing modes with type safety.
 */

import type { PluginModeDef } from './types';

/**
 * Standard output formats for modes
 */
export type OutputFormat =
  | 'text'
  | 'markdown'
  | 'code'
  | 'json'
  | 'html'
  | 'xml'
  | 'structured'
  | 'react';

/**
 * Tool configuration for a mode
 */
export interface ModeToolConfig {
  name: string;
  enabled?: boolean;
  required?: boolean;
  config?: Record<string, unknown>;
}

/**
 * Prompt template for mode
 */
export interface ModePromptTemplate {
  template: string;
  variables?: Record<string, string>;
}

/**
 * Extended mode definition with all configuration options
 */
export interface ExtendedModeDef extends PluginModeDef {
  /** Prompt template with variables */
  promptTemplate?: ModePromptTemplate;

  /** Excluded tools */
  excludedTools?: string[];

  /** Model override */
  modelOverride?: string;

  /** Temperature override */
  temperature?: number;

  /** Max tokens override */
  maxTokens?: number;

  /** Stop sequences */
  stopSequences?: string[];

  /** Additional metadata */
  metadata?: Record<string, unknown>;

  /** Mode color */
  color?: string;

  /** Keyboard shortcut */
  shortcut?: string;

  /** Mode category */
  category?: string;

  /** Hidden mode */
  hidden?: boolean;
}

/**
 * Mode context passed to mode handlers
 */
export interface ModeContext {
  modeId: string;
  sessionId?: string;
  userInput?: string;
  variables: Record<string, unknown>;
  config: Record<string, unknown>;
}

/**
 * Fluent builder for mode definitions.
 *
 * @example
 * ```typescript
 * const modeDef = new ModeBuilder('code-assistant')
 *   .name('Code Assistant')
 *   .description('AI-powered coding assistant')
 *   .icon('code')
 *   .systemPrompt('You are an expert programmer...')
 *   .tools(['read_file', 'write_file', 'run_command'])
 *   .outputFormat('code')
 *   .temperature(0.3)
 *   .build();
 * ```
 */
export class ModeBuilder {
  private _id: string;
  private _name = '';
  private _description = '';
  private _icon = 'message-circle';
  private _systemPrompt?: string;
  private _promptTemplate?: ModePromptTemplate;
  private _tools?: (string | ModeToolConfig)[];
  private _excludedTools?: string[];
  private _outputFormat?: OutputFormat;
  private _previewEnabled = true;
  private _modelOverride?: string;
  private _temperature?: number;
  private _maxTokens?: number;
  private _stopSequences?: string[];
  private _metadata: Record<string, unknown> = {};
  private _color?: string;
  private _shortcut?: string;
  private _category?: string;
  private _hidden = false;

  constructor(modeId: string) {
    this._id = modeId;
  }

  /**
   * Set mode name
   */
  name(name: string): this {
    this._name = name;
    return this;
  }

  /**
   * Set mode description
   */
  description(description: string): this {
    this._description = description;
    return this;
  }

  /**
   * Set mode icon (Lucide icon name)
   */
  icon(icon: string): this {
    this._icon = icon;
    return this;
  }

  /**
   * Set system prompt
   */
  systemPrompt(prompt: string): this {
    this._systemPrompt = prompt;
    return this;
  }

  /**
   * Set prompt template with variables
   */
  promptTemplate(template: string, variables?: Record<string, string>): this {
    this._promptTemplate = { template, variables };
    return this;
  }

  /**
   * Set enabled tools
   */
  tools(toolNames: string[]): this {
    this._tools = toolNames;
    return this;
  }

  /**
   * Add a tool configuration
   */
  tool(
    name: string,
    options?: { enabled?: boolean; required?: boolean; config?: Record<string, unknown> }
  ): this {
    if (!this._tools) {
      this._tools = [];
    }
    this._tools.push({
      name,
      enabled: options?.enabled ?? true,
      required: options?.required ?? false,
      config: options?.config ?? {},
    });
    return this;
  }

  /**
   * Exclude specific tools
   */
  excludeTools(toolNames: string[]): this {
    this._excludedTools = toolNames;
    return this;
  }

  /**
   * Set output format
   */
  outputFormat(format: OutputFormat): this {
    this._outputFormat = format;
    return this;
  }

  /**
   * Set preview enabled
   */
  previewEnabled(enabled: boolean): this {
    this._previewEnabled = enabled;
    return this;
  }

  /**
   * Override the model
   */
  model(modelId: string): this {
    this._modelOverride = modelId;
    return this;
  }

  /**
   * Set temperature
   */
  temperature(temp: number): this {
    this._temperature = temp;
    return this;
  }

  /**
   * Set max tokens
   */
  maxTokens(tokens: number): this {
    this._maxTokens = tokens;
    return this;
  }

  /**
   * Set stop sequences
   */
  stopSequences(sequences: string[]): this {
    this._stopSequences = sequences;
    return this;
  }

  /**
   * Add metadata
   */
  metadata(data: Record<string, unknown>): this {
    this._metadata = { ...this._metadata, ...data };
    return this;
  }

  /**
   * Set mode color
   */
  color(color: string): this {
    this._color = color;
    return this;
  }

  /**
   * Set keyboard shortcut
   */
  shortcut(shortcut: string): this {
    this._shortcut = shortcut;
    return this;
  }

  /**
   * Set mode category
   */
  category(category: string): this {
    this._category = category;
    return this;
  }

  /**
   * Set hidden flag
   */
  hidden(hidden = true): this {
    this._hidden = hidden;
    return this;
  }

  /**
   * Build the mode definition
   */
  build(): ExtendedModeDef {
    const mode: ExtendedModeDef = {
      id: this._id,
      name: this._name,
      description: this._description,
      icon: this._icon,
      previewEnabled: this._previewEnabled,
    };

    if (this._systemPrompt) {
      mode.systemPrompt = this._systemPrompt;
    }

    if (this._promptTemplate) {
      mode.promptTemplate = this._promptTemplate;
    }

    if (this._tools) {
      mode.tools = this._tools.map((t) => (typeof t === 'string' ? t : t.name));
    }

    if (this._excludedTools) {
      mode.excludedTools = this._excludedTools;
    }

    if (this._outputFormat) {
      mode.outputFormat = this._outputFormat as PluginModeDef['outputFormat'];
    }

    if (this._modelOverride) {
      mode.modelOverride = this._modelOverride;
    }

    if (this._temperature !== undefined) {
      mode.temperature = this._temperature;
    }

    if (this._maxTokens) {
      mode.maxTokens = this._maxTokens;
    }

    if (this._stopSequences) {
      mode.stopSequences = this._stopSequences;
    }

    if (Object.keys(this._metadata).length > 0) {
      mode.metadata = this._metadata;
    }

    if (this._color) {
      mode.color = this._color;
    }

    if (this._shortcut) {
      mode.shortcut = this._shortcut;
    }

    if (this._category) {
      mode.category = this._category;
    }

    if (this._hidden) {
      mode.hidden = true;
    }

    return mode;
  }
}

/**
 * Create a mode builder (functional alternative)
 */
export function createModeBuilder(modeId: string): ModeBuilder {
  return new ModeBuilder(modeId);
}
