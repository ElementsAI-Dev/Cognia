/**
 * Browser stub for monaco-editor
 * Use @monaco-editor/react for React integration instead
 */

export const editor = {
  create: (_container: HTMLElement, _options?: unknown) => {
    console.warn('monaco-editor direct import is not available. Use @monaco-editor/react instead.');
    return {
      getValue: () => '',
      setValue: (_value: string) => {},
      dispose: () => {},
      onDidChangeModelContent: (_callback: () => void) => ({ dispose: () => {} }),
      addCommand: (_keybinding: number, _handler: () => void) => '',
    };
  },
  setTheme: (_theme: string) => {},
  defineTheme: (_themeName: string, _themeData: unknown) => {},
};

export const KeyMod = {
  CtrlCmd: 2048,
  Shift: 1024,
  Alt: 512,
  WinCtrl: 256,
};

export const KeyCode = {
  KeyS: 49,
  KeyZ: 56,
  KeyY: 55,
};

export const languages = {
  register: (_language: unknown) => {},
  setMonarchTokensProvider: (_languageId: string, _languageDef: unknown) => {},
  registerCompletionItemProvider: (_languageId: string, _provider: unknown) => ({ dispose: () => {} }),
};

const monacoStub = { editor, KeyMod, KeyCode, languages };
export default monacoStub;
