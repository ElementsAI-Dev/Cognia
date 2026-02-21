import type { editor } from 'monaco-editor';

export interface EditorAppearanceSettingsInput {
  fontSize?: number;
  tabSize?: number;
  wordWrap?: boolean;
  minimap?: boolean;
  cursorStyle?: editor.IStandaloneEditorConstructionOptions['cursorStyle'];
  renderWhitespace?: editor.IStandaloneEditorConstructionOptions['renderWhitespace'];
  formatOnPaste?: boolean;
  formatOnType?: boolean;
  bracketPairColorization?: boolean;
  stickyScroll?: boolean;
}

export interface EditorSettingsInput {
  appearance?: EditorAppearanceSettingsInput;
}

const DEFAULT_EDITOR_APPEARANCE: Required<EditorAppearanceSettingsInput> = {
  fontSize: 14,
  tabSize: 2,
  wordWrap: false,
  minimap: true,
  cursorStyle: 'line',
  renderWhitespace: 'selection',
  formatOnPaste: false,
  formatOnType: false,
  bracketPairColorization: true,
  stickyScroll: true,
};

function resolveAppearanceSettings(
  editorSettings?: EditorSettingsInput
): Required<EditorAppearanceSettingsInput> {
  return {
    ...DEFAULT_EDITOR_APPEARANCE,
    ...(editorSettings?.appearance ?? {}),
  };
}

export function mapEditorSettingsToMonacoOptions(
  editorSettings?: EditorSettingsInput
): Partial<editor.IStandaloneEditorConstructionOptions> {
  const appearance = resolveAppearanceSettings(editorSettings);
  return {
    fontSize: appearance.fontSize,
    tabSize: appearance.tabSize,
    wordWrap: appearance.wordWrap ? 'on' : 'off',
    minimap: { enabled: appearance.minimap },
    cursorStyle: appearance.cursorStyle,
    renderWhitespace: appearance.renderWhitespace,
    formatOnPaste: appearance.formatOnPaste,
    formatOnType: appearance.formatOnType,
    bracketPairColorization: { enabled: appearance.bracketPairColorization },
    stickyScroll: { enabled: appearance.stickyScroll },
  };
}
