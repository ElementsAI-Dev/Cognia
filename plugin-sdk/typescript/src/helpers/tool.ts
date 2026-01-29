/**
 * Tool Definition Helper
 *
 * @description Type-safe helper for defining plugin tools with automatic type inference.
 */

import type { PluginToolContext } from '../tools/types';

/**
 * Tool configuration with type inference for parameters
 */
export interface ToolConfig<TParams extends Record<string, unknown> = Record<string, unknown>> {
  /** Tool name - used as identifier */
  name: string;
  /** Description for AI to understand what the tool does */
  description: string;
  /** JSON Schema for parameters */
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  /** Execute function with typed parameters */
  execute: (params: TParams, context?: PluginToolContext) => Promise<unknown>;
  /** Whether tool requires user approval before execution */
  requiresApproval?: boolean;
  /** Category for organizing tools */
  category?: string;
}

/**
 * Tool definition result type
 */
export interface ToolDefinition<TParams extends Record<string, unknown> = Record<string, unknown>> {
  name: string;
  description: string;
  parametersSchema: Record<string, unknown>;
  requiresApproval?: boolean;
  category?: string;
  execute: (params: TParams, context?: PluginToolContext) => Promise<unknown>;
}

/**
 * Create a tool definition with type-safe parameters
 *
 * @remarks
 * This helper provides a simpler API for defining tools compared to `defineTool`.
 * It infers parameter types from the execute function.
 *
 * @example
 * ```typescript
 * const calculateTool = tool({
 *   name: 'calculate',
 *   description: 'Perform basic math calculations',
 *   parameters: {
 *     type: 'object',
 *     properties: {
 *       operation: {
 *         type: 'string',
 *         enum: ['add', 'subtract', 'multiply', 'divide'],
 *         description: 'The math operation to perform',
 *       },
 *       a: { type: 'number', description: 'First operand' },
 *       b: { type: 'number', description: 'Second operand' },
 *     },
 *     required: ['operation', 'a', 'b'],
 *   },
 *   execute: async ({ operation, a, b }) => {
 *     switch (operation) {
 *       case 'add': return { result: a + b };
 *       case 'subtract': return { result: a - b };
 *       case 'multiply': return { result: a * b };
 *       case 'divide': return { result: a / b };
 *     }
 *   },
 * });
 * ```
 */
export function tool<TParams extends Record<string, unknown> = Record<string, unknown>>(
  config: ToolConfig<TParams>
): ToolDefinition<TParams> {
  return {
    name: config.name,
    description: config.description,
    parametersSchema: config.parameters,
    requiresApproval: config.requiresApproval,
    category: config.category,
    execute: config.execute,
  };
}

/**
 * Infer parameter types from JSON Schema properties
 *
 * @remarks
 * This type helper extracts TypeScript types from JSON Schema definitions.
 * Used internally for type inference.
 */
export type InferSchemaType<T> = T extends { type: 'string'; enum: infer E }
  ? E extends readonly string[]
    ? E[number]
    : string
  : T extends { type: 'string' }
    ? string
    : T extends { type: 'number' }
      ? number
      : T extends { type: 'integer' }
        ? number
        : T extends { type: 'boolean' }
          ? boolean
          : T extends { type: 'array'; items: infer I }
            ? InferSchemaType<I>[]
            : T extends { type: 'object'; properties: infer P }
              ? { [K in keyof P]: InferSchemaType<P[K]> }
              : unknown;

/**
 * Infer all parameter types from a parameters schema
 */
export type InferParams<T extends { properties: Record<string, unknown>; required?: string[] }> = {
  [K in keyof T['properties']]: InferSchemaType<T['properties'][K]>;
} & {
  [K in Exclude<keyof T['properties'], T['required'] extends readonly string[] ? T['required'][number] : never>]?: InferSchemaType<T['properties'][K]>;
};
