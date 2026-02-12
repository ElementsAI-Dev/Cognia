/**
 * Preset export / import business logic.
 *
 * Extracted from components/presets/presets-manager.tsx so that the
 * serialisation, validation, and file-handling logic lives in lib/.
 */

import type { Preset, CreatePresetInput } from '@/types/content/preset';
import type {
  PresetExportData,
  PresetExportEntry,
} from '@/types/presets';

const VALID_MODES = ['chat', 'agent', 'research', 'learning'] as const;

/**
 * Serialise presets into the export format and trigger a browser download.
 */
export function exportPresetsToFile(presets: Preset[]): void {
  const exportData: PresetExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    presets: presets.map<PresetExportEntry>((p) => ({
      name: p.name,
      description: p.description,
      icon: p.icon,
      color: p.color,
      provider: p.provider,
      model: p.model,
      mode: p.mode,
      systemPrompt: p.systemPrompt,
      builtinPrompts: p.builtinPrompts,
      temperature: p.temperature,
      maxTokens: p.maxTokens,
      webSearchEnabled: p.webSearchEnabled,
      thinkingEnabled: p.thinkingEnabled,
      isFavorite: p.isFavorite,
      isDefault: p.isDefault,
      sortOrder: p.sortOrder,
    })),
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cognia-presets-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Validate and normalise a single raw preset entry from an import file.
 * Returns a valid `CreatePresetInput` or `null` if the entry is invalid.
 */
function validateImportEntry(
  raw: Record<string, unknown>,
): (CreatePresetInput & { isFavorite?: boolean; isDefault?: boolean }) | null {
  // Required fields
  if (!raw.name || typeof raw.name !== 'string') return null;
  if (!raw.provider || typeof raw.provider !== 'string') return null;
  if (!raw.model || typeof raw.model !== 'string') return null;

  const mode =
    raw.mode && VALID_MODES.includes(raw.mode as (typeof VALID_MODES)[number])
      ? (raw.mode as (typeof VALID_MODES)[number])
      : ('chat' as const);

  const temperature =
    typeof raw.temperature === 'number'
      ? Math.max(0, Math.min(2, raw.temperature))
      : 0.7;

  const maxTokens =
    typeof raw.maxTokens === 'number' && raw.maxTokens > 0
      ? raw.maxTokens
      : undefined;

  return {
    name: String(raw.name).slice(0, 100),
    description:
      typeof raw.description === 'string'
        ? raw.description.slice(0, 500)
        : undefined,
    icon: raw.icon as string | undefined,
    color: raw.color as string | undefined,
    provider: raw.provider as CreatePresetInput['provider'],
    model: raw.model as string,
    mode,
    systemPrompt:
      typeof raw.systemPrompt === 'string' ? raw.systemPrompt : undefined,
    builtinPrompts: Array.isArray(raw.builtinPrompts)
      ? raw.builtinPrompts
      : undefined,
    temperature,
    maxTokens,
    webSearchEnabled:
      typeof raw.webSearchEnabled === 'boolean' ? raw.webSearchEnabled : false,
    thinkingEnabled:
      typeof raw.thinkingEnabled === 'boolean' ? raw.thinkingEnabled : false,
    isDefault: typeof raw.isDefault === 'boolean' ? raw.isDefault : undefined,
    isFavorite: typeof raw.isFavorite === 'boolean' ? raw.isFavorite : false,
  };
}

/**
 * Read a JSON file selected by the user and return validated preset inputs.
 *
 * The caller is responsible for actually creating the presets in the store.
 */
export function parsePresetImportFile(
  file: File,
): Promise<{
  entries: Array<CreatePresetInput & { isFavorite?: boolean }>;
  skipped: number;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!data.presets || !Array.isArray(data.presets)) {
          reject(new Error('invalidFileFormat'));
          return;
        }

        let skipped = 0;
        const entries: Array<CreatePresetInput & { isFavorite?: boolean }> = [];

        for (const raw of data.presets) {
          const validated = validateImportEntry(raw);
          if (validated) {
            entries.push(validated);
          } else {
            skipped++;
          }
        }

        resolve({ entries, skipped });
      } catch {
        reject(new Error('parseFileFailed'));
      }
    };
    reader.onerror = () => reject(new Error('parseFileFailed'));
    reader.readAsText(file);
  });
}
