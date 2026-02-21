import { useSettingsStore } from '@/stores/settings';

export type EditorFeatureFlag =
  | 'editor.workbench.v2'
  | 'editor.lsp.extended'
  | 'editor.palette.contextCommands';

const EDITOR_FEATURE_FLAGS_KEY = 'cognia-editor-feature-flags-v1';

const DEFAULT_EDITOR_FEATURE_FLAGS: Record<EditorFeatureFlag, boolean> = {
  'editor.workbench.v2': true,
  'editor.lsp.extended': true,
  'editor.palette.contextCommands': true,
};

function readStoredFeatureFlags(): Partial<Record<EditorFeatureFlag, boolean>> {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(EDITOR_FEATURE_FLAGS_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Partial<Record<EditorFeatureFlag, unknown>>;
    const result: Partial<Record<EditorFeatureFlag, boolean>> = {};
    for (const [flag, value] of Object.entries(parsed)) {
      if (
        (flag === 'editor.workbench.v2' ||
          flag === 'editor.lsp.extended' ||
          flag === 'editor.palette.contextCommands') &&
        typeof value === 'boolean'
      ) {
        result[flag] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function getEditorFeatureFlags(): Record<EditorFeatureFlag, boolean> {
  return {
    ...DEFAULT_EDITOR_FEATURE_FLAGS,
    ...readStoredFeatureFlags(),
  };
}

export function isEditorFeatureFlagEnabled(flag: EditorFeatureFlag): boolean {
  const flags = getEditorFeatureFlags();
  if (flag === 'editor.palette.contextCommands') {
    const paletteEnabled = useSettingsStore.getState().editorSettings.palette.showContextCommands;
    return flags[flag] && paletteEnabled;
  }
  return flags[flag];
}

