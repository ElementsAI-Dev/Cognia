/**
 * Monaco Editor Configuration Module
 * Centralized configuration for all Monaco editor instances
 * Supports Monaco Editor v0.55.1+ features
 * 
 * Note: Monaco Editor types are available via @monaco-editor/react:
 *   import type { Monaco } from '@monaco-editor/react'
 * The Monaco type includes editor, languages, Range, Position, etc.
 */

import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

// Re-export types for convenience
export type { Monaco, editor };

/**
 * Base editor options shared across all Monaco instances
 */
export const MONACO_BASE_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  // Typography
  fontSize: 14,
  fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'SF Mono', Menlo, monospace",
  fontLigatures: true,
  fontWeight: '400',
  lineHeight: 1.6,

  // Indentation
  tabSize: 2,
  insertSpaces: true,
  detectIndentation: true,

  // Modern Features (v0.50+)
  bracketPairColorization: {
    enabled: true,
    independentColorPoolPerBracketType: true,
  },
  guides: {
    indentation: true,
    bracketPairs: true,
    bracketPairsHorizontal: 'active',
    highlightActiveBracketPair: true,
    highlightActiveIndentation: true,
  },
  stickyScroll: {
    enabled: true,
    maxLineCount: 5,
    defaultModel: 'outlineModel',
  },
  inlineSuggest: {
    enabled: true,
    mode: 'prefix',
    showToolbar: 'onHover',
  },

  // Cursor & Animation
  cursorBlinking: 'smooth',
  cursorSmoothCaretAnimation: 'on',
  cursorStyle: 'line',
  cursorWidth: 2,

  // Scrolling
  smoothScrolling: true,
  scrollBeyondLastLine: false,
  scrollbar: {
    vertical: 'auto',
    horizontal: 'auto',
    useShadows: false,
    verticalScrollbarSize: 10,
    horizontalScrollbarSize: 10,
  },

  // Visual
  renderLineHighlight: 'all',
  renderWhitespace: 'selection',
  renderControlCharacters: false,

  // Layout
  automaticLayout: true,
  padding: { top: 12, bottom: 12 },

  // Minimap
  minimap: {
    enabled: true,
    maxColumn: 80,
    renderCharacters: false,
    showSlider: 'mouseover',
    scale: 1,
  },

  // Line Numbers
  lineNumbers: 'on',
  lineNumbersMinChars: 3,
  lineDecorationsWidth: 10,

  // Folding
  folding: true,
  foldingStrategy: 'auto',
  foldingHighlight: true,
  unfoldOnClickAfterEndOfLine: true,
  showFoldingControls: 'mouseover',

  // Editing
  autoClosingBrackets: 'always',
  autoClosingQuotes: 'always',
  autoClosingDelete: 'always',
  autoSurround: 'languageDefined',
  formatOnPaste: false,
  formatOnType: false,

  // Word Wrap
  wordWrap: 'off',
  wordWrapColumn: 80,
  wrappingIndent: 'indent',

  // Accessibility
  accessibilitySupport: 'auto',
  ariaLabel: 'Code Editor',

  // Performance
  fastScrollSensitivity: 5,
  mouseWheelScrollSensitivity: 1,
  multiCursorModifier: 'ctrlCmd',

  // Find
  find: {
    addExtraSpaceOnTop: true,
    autoFindInSelection: 'multiline',
    seedSearchStringFromSelection: 'selection',
  },

  // Hover
  hover: {
    enabled: true,
    delay: 300,
    sticky: true,
  },

  // Suggestions
  quickSuggestions: {
    other: true,
    comments: false,
    strings: true,
  },
  suggestOnTriggerCharacters: true,
  acceptSuggestionOnEnter: 'on',
  snippetSuggestions: 'inline',
  tabCompletion: 'on',
};

/**
 * Minimal editor options for read-only or preview contexts
 */
export const MONACO_MINIMAL_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  ...MONACO_BASE_OPTIONS,
  minimap: { enabled: false },
  lineNumbers: 'off',
  folding: false,
  stickyScroll: { enabled: false },
  glyphMargin: false,
  lineDecorationsWidth: 0,
  lineNumbersMinChars: 0,
  renderLineHighlight: 'none',
  scrollbar: {
    vertical: 'hidden',
    horizontal: 'hidden',
  },
  overviewRulerLanes: 0,
  hideCursorInOverviewRuler: true,
  overviewRulerBorder: false,
};

/**
 * Options optimized for code editing (TypeScript, JavaScript, etc.)
 */
export const MONACO_CODE_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  ...MONACO_BASE_OPTIONS,
  formatOnPaste: true,
  formatOnType: true,
  autoIndent: 'advanced',
  parameterHints: {
    enabled: true,
    cycle: true,
  },
  suggest: {
    insertMode: 'replace',
    filterGraceful: true,
    showMethods: true,
    showFunctions: true,
    showConstructors: true,
    showFields: true,
    showVariables: true,
    showClasses: true,
    showStructs: true,
    showInterfaces: true,
    showModules: true,
    showProperties: true,
    showEvents: true,
    showOperators: true,
    showUnits: true,
    showValues: true,
    showConstants: true,
    showEnums: true,
    showEnumMembers: true,
    showKeywords: true,
    showWords: true,
    showColors: true,
    showFiles: true,
    showReferences: true,
    showFolders: true,
    showTypeParameters: true,
    showSnippets: true,
    showUsers: true,
    showIssues: true,
  },
};

/**
 * Options optimized for markdown/prose editing
 */
export const MONACO_MARKDOWN_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  ...MONACO_BASE_OPTIONS,
  wordWrap: 'on',
  lineNumbers: 'on',
  minimap: { enabled: false },
  folding: true,
  foldingStrategy: 'indentation',
  stickyScroll: { enabled: false },
  renderWhitespace: 'none',
  quickSuggestions: false,
  formatOnPaste: false,
  formatOnType: false,
  autoClosingBrackets: 'never',
  autoClosingQuotes: 'never',
  fontSize: 15,
  lineHeight: 1.8,
  padding: { top: 16, bottom: 16 },
};

/**
 * Options for diff/compare view
 */
export const MONACO_DIFF_OPTIONS: editor.IStandaloneDiffEditorConstructionOptions = {
  automaticLayout: true,
  renderSideBySide: true,
  enableSplitViewResizing: true,
  ignoreTrimWhitespace: false,
  renderMarginRevertIcon: true,
  originalEditable: false,
  diffWordWrap: 'off',
  renderOverviewRuler: true,
  diffAlgorithm: 'advanced',
};

/**
 * Get theme name based on app theme
 */
export function getMonacoTheme(theme: 'dark' | 'light' | 'system'): string {
  if (theme === 'system') {
    const isDark = typeof window !== 'undefined' && 
      window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return isDark ? 'vs-dark' : 'vs';
  }
  return theme === 'dark' ? 'vs-dark' : 'vs';
}

/**
 * Language mapping for Monaco editor
 */
export const LANGUAGE_MAP: Record<string, string> = {
  javascript: 'javascript',
  js: 'javascript',
  typescript: 'typescript',
  ts: 'typescript',
  jsx: 'javascript',
  tsx: 'typescript',
  python: 'python',
  py: 'python',
  html: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  json: 'json',
  jsonc: 'json',
  markdown: 'markdown',
  md: 'markdown',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',
  sql: 'sql',
  bash: 'shell',
  sh: 'shell',
  shell: 'shell',
  zsh: 'shell',
  powershell: 'powershell',
  rust: 'rust',
  rs: 'rust',
  go: 'go',
  java: 'java',
  kotlin: 'kotlin',
  swift: 'swift',
  cpp: 'cpp',
  c: 'c',
  csharp: 'csharp',
  cs: 'csharp',
  php: 'php',
  ruby: 'ruby',
  rb: 'ruby',
  lua: 'lua',
  r: 'r',
  dockerfile: 'dockerfile',
  graphql: 'graphql',
  toml: 'ini',
  ini: 'ini',
  mermaid: 'mermaid',
  plaintext: 'plaintext',
  text: 'plaintext',
};

/**
 * Get Monaco language from file extension or language name
 */
export function getMonacoLanguage(language: string): string {
  const normalized = language.toLowerCase().replace(/^\./, '');
  return LANGUAGE_MAP[normalized] || 'plaintext';
}

/**
 * Merge custom options with base options
 */
export function createEditorOptions(
  preset: 'base' | 'code' | 'markdown' | 'minimal' = 'base',
  overrides: Partial<editor.IStandaloneEditorConstructionOptions> = {}
): editor.IStandaloneEditorConstructionOptions {
  const presetOptions = {
    base: MONACO_BASE_OPTIONS,
    code: MONACO_CODE_OPTIONS,
    markdown: MONACO_MARKDOWN_OPTIONS,
    minimal: MONACO_MINIMAL_OPTIONS,
  }[preset];

  return {
    ...presetOptions,
    ...overrides,
    // Deep merge for nested objects
    minimap: {
      ...(typeof presetOptions.minimap === 'object' ? presetOptions.minimap : {}),
      ...(typeof overrides.minimap === 'object' ? overrides.minimap : {}),
    },
    scrollbar: {
      ...(typeof presetOptions.scrollbar === 'object' ? presetOptions.scrollbar : {}),
      ...(typeof overrides.scrollbar === 'object' ? overrides.scrollbar : {}),
    },
    padding: {
      ...(typeof presetOptions.padding === 'object' ? presetOptions.padding : {}),
      ...(typeof overrides.padding === 'object' ? overrides.padding : {}),
    },
  };
}

/**
 * Editor keyboard shortcuts configuration
 */
export const MONACO_KEYBINDINGS = {
  save: 'ctrl+s',
  find: 'ctrl+f',
  replace: 'ctrl+h',
  undo: 'ctrl+z',
  redo: 'ctrl+shift+z',
  format: 'shift+alt+f',
  comment: 'ctrl+/',
  duplicate: 'shift+alt+down',
  deleteLine: 'ctrl+shift+k',
  moveLine: 'alt+up',
  selectAll: 'ctrl+a',
  goToLine: 'ctrl+g',
  quickCommand: 'f1',
} as const;

export type MonacoKeybinding = keyof typeof MONACO_KEYBINDINGS;

/**
 * Options for designer/sandbox specific code editing
 */
export const MONACO_DESIGNER_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  ...MONACO_CODE_OPTIONS,
  minimap: { enabled: false },
  stickyScroll: { enabled: true, maxLineCount: 5 },
  bracketPairColorization: { enabled: true, independentColorPoolPerBracketType: true },
  guides: {
    indentation: true,
    bracketPairs: true,
    bracketPairsHorizontal: 'active',
    highlightActiveBracketPair: true,
    highlightActiveIndentation: true,
  },
  inlineSuggest: { enabled: true, mode: 'prefix', showToolbar: 'onHover' },
  codeLens: true,
  colorDecorators: true,
  linkedEditing: true,
  renameOnType: true,
  showUnused: true,
  showDeprecated: true,
  definitionLinkOpensInPeek: true,
  gotoLocation: {
    multipleDefinitions: 'peek',
    multipleTypeDefinitions: 'peek',
    multipleDeclarations: 'peek',
    multipleImplementations: 'peek',
    multipleReferences: 'peek',
  },
  peekWidgetDefaultFocus: 'tree',
  unicodeHighlight: {
    ambiguousCharacters: true,
    invisibleCharacters: true,
    nonBasicASCII: true,
    includeComments: true,
    includeStrings: true,
  },
  dropIntoEditor: { enabled: true },
  pasteAs: { enabled: true, showPasteSelector: 'afterPaste' },
};

/**
 * Deep merge editor options
 */
export function mergeEditorOptions(
  base: editor.IStandaloneEditorConstructionOptions,
  overrides: Partial<editor.IStandaloneEditorConstructionOptions>
): editor.IStandaloneEditorConstructionOptions {
  const result = { ...base, ...overrides };
  
  // Deep merge nested objects
  const nestedKeys: (keyof editor.IStandaloneEditorConstructionOptions)[] = [
    'minimap', 'scrollbar', 'padding', 'find', 'hover', 'suggest',
    'quickSuggestions', 'bracketPairColorization', 'guides', 'stickyScroll',
    'inlineSuggest', 'parameterHints', 'gotoLocation', 'unicodeHighlight',
  ];
  
  for (const key of nestedKeys) {
    const baseVal = base[key];
    const overrideVal = overrides[key];
    if (typeof baseVal === 'object' && baseVal !== null && 
        typeof overrideVal === 'object' && overrideVal !== null) {
      (result as Record<string, unknown>)[key] = { ...baseVal, ...overrideVal };
    }
  }
  
  return result;
}

/**
 * Get file extension from language
 */
export function getExtensionFromLanguage(language: string): string {
  const extensionMap: Record<string, string> = {
    javascript: '.js',
    typescript: '.ts',
    typescriptreact: '.tsx',
    javascriptreact: '.jsx',
    python: '.py',
    html: '.html',
    css: '.css',
    scss: '.scss',
    less: '.less',
    json: '.json',
    markdown: '.md',
    yaml: '.yaml',
    xml: '.xml',
    sql: '.sql',
    shell: '.sh',
    powershell: '.ps1',
    rust: '.rs',
    go: '.go',
    java: '.java',
    kotlin: '.kt',
    swift: '.swift',
    cpp: '.cpp',
    c: '.c',
    csharp: '.cs',
    php: '.php',
    ruby: '.rb',
    lua: '.lua',
    r: '.r',
    dockerfile: 'Dockerfile',
    graphql: '.graphql',
    mermaid: '.mmd',
  };
  return extensionMap[language] || '.txt';
}

/**
 * Detect language from file path
 */
export function detectLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  return getMonacoLanguage(ext);
}

/**
 * Common code snippets for different languages
 */
export const CODE_SNIPPETS: Record<string, Record<string, { prefix: string; body: string; description: string }>> = {
  typescript: {
    component: {
      prefix: 'rfc',
      body: `import { FC } from 'react';

interface \${1:Component}Props {
  \${2:// props}
}

export const \${1:Component}: FC<\${1:Component}Props> = ({\${3}}) => {
  return (
    <div>
      \${4:// content}
    </div>
  );
};`,
      description: 'React Functional Component with TypeScript',
    },
    hook: {
      prefix: 'hook',
      body: `import { useState, useCallback } from 'react';

export function use\${1:Hook}(\${2:initialValue}: \${3:any}) {
  const [state, setState] = useState(\${2:initialValue});

  const update = useCallback((value: \${3:any}) => {
    setState(value);
  }, []);

  return { state, update };
}`,
      description: 'Custom React Hook',
    },
    zustand: {
      prefix: 'zustand',
      body: `import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface \${1:Store}State {
  \${2:// state}
}

interface \${1:Store}Actions {
  \${3:// actions}
}

export const use\${1:Store} = create<\${1:Store}State & \${1:Store}Actions>()(
  persist(
    (set, get) => ({
      \${4:// implementation}
    }),
    { name: '\${5:store-name}' }
  )
);`,
      description: 'Zustand Store with Persist',
    },
  },
  javascript: {
    asyncFunction: {
      prefix: 'afn',
      body: `async function \${1:name}(\${2:params}) {
  try {
    \${3:// implementation}
  } catch (error) {
    console.error('Error in \${1:name}:', error);
    throw error;
  }
}`,
      description: 'Async Function with Error Handling',
    },
  },
};

/**
 * Editor action types
 */
export type EditorActionType = 
  | 'format'
  | 'comment'
  | 'uncomment'
  | 'fold'
  | 'unfold'
  | 'foldAll'
  | 'unfoldAll'
  | 'duplicate'
  | 'deleteLine'
  | 'moveLineUp'
  | 'moveLineDown'
  | 'copyLineUp'
  | 'copyLineDown'
  | 'indentLine'
  | 'outdentLine'
  | 'transformToUppercase'
  | 'transformToLowercase'
  | 'transformToTitlecase'
  | 'sortLinesAsc'
  | 'sortLinesDesc'
  | 'trimTrailingWhitespace'
  | 'joinLines';

/**
 * Editor action IDs mapping to Monaco built-in actions
 */
export const EDITOR_ACTION_IDS: Record<EditorActionType, string> = {
  format: 'editor.action.formatDocument',
  comment: 'editor.action.commentLine',
  uncomment: 'editor.action.removeCommentLine',
  fold: 'editor.fold',
  unfold: 'editor.unfold',
  foldAll: 'editor.foldAll',
  unfoldAll: 'editor.unfoldAll',
  duplicate: 'editor.action.copyLinesDownAction',
  deleteLine: 'editor.action.deleteLines',
  moveLineUp: 'editor.action.moveLinesUpAction',
  moveLineDown: 'editor.action.moveLinesDownAction',
  copyLineUp: 'editor.action.copyLinesUpAction',
  copyLineDown: 'editor.action.copyLinesDownAction',
  indentLine: 'editor.action.indentLines',
  outdentLine: 'editor.action.outdentLines',
  transformToUppercase: 'editor.action.transformToUppercase',
  transformToLowercase: 'editor.action.transformToLowercase',
  transformToTitlecase: 'editor.action.transformToTitlecase',
  sortLinesAsc: 'editor.action.sortLinesAscending',
  sortLinesDesc: 'editor.action.sortLinesDescending',
  trimTrailingWhitespace: 'editor.action.trimTrailingWhitespace',
  joinLines: 'editor.action.joinLines',
};
