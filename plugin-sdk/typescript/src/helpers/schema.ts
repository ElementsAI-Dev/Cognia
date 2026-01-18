/**
 * JSON Schema Helpers
 *
 * @description Type-safe builders for JSON Schema used in tool parameter definitions.
 */

/**
 * JSON Schema helpers for tool parameter definitions
 *
 * @remarks
 * Provides type-safe builders for JSON Schema used in tool parameters.
 *
 * @example
 * ```typescript
 * import { Schema, parameters } from '@cognia/plugin-sdk';
 *
 * const schema = parameters({
 *   // String parameter
 *   query: Schema.string('Search query'),
 *
 *   // Optional string with enum
 *   language: Schema.optional(
 *     Schema.string('Language', { enum: ['en', 'es', 'fr'] })
 *   ),
 *
 *   // Number with constraints
 *   limit: Schema.optional(
 *     Schema.integer('Max results', { minimum: 1, maximum: 100 })
 *   ),
 *
 *   // Array
 *   tags: Schema.optional(
 *     Schema.array(Schema.string('Tag'), 'Tags to filter by')
 *   ),
 *
 *   // Object
 *   filters: Schema.optional(
 *     Schema.object({
 *       dateRange: Schema.string('Date range'),
 *       type: Schema.string('Type'),
 *     })
 *   ),
 * }, ['query']);
 * ```
 */
export const Schema = {
  /**
   * String schema type
   *
   * @param description - Parameter description for AI
   * @param options - Additional options like enum, minLength, maxLength
   */
  string(description?: string, options?: { enum?: string[]; minLength?: number; maxLength?: number }) {
    return { type: 'string' as const, description, ...options };
  },

  /**
   * Number schema type
   *
   * @param description - Parameter description for AI
   * @param options - Additional options like minimum, maximum
   */
  number(description?: string, options?: { minimum?: number; maximum?: number }) {
    return { type: 'number' as const, description, ...options };
  },

  /**
   * Integer schema type
   *
   * @param description - Parameter description for AI
   * @param options - Additional options like minimum, maximum
   */
  integer(description?: string, options?: { minimum?: number; maximum?: number }) {
    return { type: 'integer' as const, description, ...options };
  },

  /**
   * Boolean schema type
   *
   * @param description - Parameter description for AI
   */
  boolean(description?: string) {
    return { type: 'boolean' as const, description };
  },

  /**
   * Array schema type
   *
   * @param items - Schema for array items
   * @param description - Parameter description for AI
   */
  array(items: Record<string, unknown>, description?: string) {
    return { type: 'array' as const, items, description };
  },

  /**
   * Object schema type
   *
   * @param properties - Object property schemas
   * @param required - Required property names
   * @param description - Parameter description for AI
   */
  object(properties: Record<string, unknown>, required?: string[], description?: string) {
    return { type: 'object' as const, properties, required, description };
  },

  /**
   * Mark a schema as optional
   *
   * @param schema - The schema to mark as optional
   */
  optional<T extends Record<string, unknown>>(schema: T): T & { required: false } {
    return { ...schema, required: false as const };
  },
};

/**
 * Type-safe parameter builder for tool schemas
 *
 * @remarks
 * Creates a JSON Schema object for tool parameters with proper typing.
 *
 * @example
 * ```typescript
 * const params = parameters({
 *   text: Schema.string('Input text'),
 *   count: Schema.optional(Schema.integer('Count')),
 * }, ['text']);
 *
 * // Result:
 * // {
 * //   type: 'object',
 * //   properties: { text: {...}, count: {...} },
 * //   required: ['text']
 * // }
 * ```
 */
export function parameters<T extends Record<string, unknown>>(
  props: T,
  required?: (keyof T)[]
): { type: 'object'; properties: T; required?: string[] } {
  return {
    type: 'object',
    properties: props,
    required: required as string[] | undefined,
  };
}
