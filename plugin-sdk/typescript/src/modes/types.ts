/**
 * Mode Integration Types
 *
 * @description Type definitions for AI agent mode integration.
 * Modes define specialized AI agent behaviors with specific prompts and tools.
 */

/**
 * Mode definition in plugin manifest
 *
 * @remarks
 * Modes define specialized AI agent behaviors with specific prompts and tools.
 *
 * @example
 * ```typescript
 * const modeDef: PluginModeDef = {
 *   id: 'code-review',
 *   name: 'Code Review',
 *   description: 'Expert code review and analysis',
 *   icon: 'code',
 *   systemPrompt: 'You are an expert code reviewer...',
 *   tools: ['web_search', 'file_reader'],
 *   outputFormat: 'markdown',
 *   previewEnabled: true,
 * };
 * ```
 */
export interface PluginModeDef {
  /** Mode ID */
  id: string;

  /** Display name */
  name: string;

  /** Description */
  description: string;

  /** Icon (Lucide name) */
  icon: string;

  /** System prompt */
  systemPrompt?: string;

  /** Available tools */
  tools?: string[];

  /** Output format */
  outputFormat?: 'text' | 'code' | 'html' | 'react' | 'markdown';

  /** Whether preview is enabled */
  previewEnabled?: boolean;
}
