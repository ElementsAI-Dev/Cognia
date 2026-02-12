/**
 * Preset types index
 *
 * Re-exports common preset types from types/content/preset and adds
 * export/import specific types used by lib/presets/export-import.
 */

export type {
  Preset,
  CreatePresetInput,
  UpdatePresetInput,
  BuiltinPrompt,
  PresetCategory,
} from '@/types/content/preset';

export {
  PRESET_COLORS,
  PRESET_ICONS,
  PRESET_CATEGORIES,
  DEFAULT_PRESETS,
} from '@/types/content/preset';

/**
 * Shape of a preset when serialised for JSON export.
 * Intentionally omits runtime-only fields (id, usageCount, timestamps).
 */
export interface PresetExportEntry {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  provider: string;
  model: string;
  mode?: string;
  systemPrompt?: string;
  builtinPrompts?: Array<{
    id: string;
    name: string;
    content: string;
    description?: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  webSearchEnabled?: boolean;
  thinkingEnabled?: boolean;
  isFavorite?: boolean;
  isDefault?: boolean;
  sortOrder?: number;
  category?: string;
}

/**
 * Top-level structure of a preset export file.
 */
export interface PresetExportData {
  version: number;
  exportedAt: string;
  presets: PresetExportEntry[];
}

/**
 * Result returned by the import parser.
 */
export interface PresetImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  error?: string;
}
