/**
 * Mermaid Language Definition for Monaco Editor
 * Provides syntax highlighting and completion for Mermaid diagrams
 * 
 * Monaco Editor provides official TypeScript types bundled with the package.
 * Types are imported from 'monaco-editor' directly.
 */

import type * as Monaco from 'monaco-editor';

export const MERMAID_LANGUAGE_ID = 'mermaid';

/**
 * Mermaid diagram types
 */
export const MERMAID_DIAGRAM_TYPES = [
  'graph',
  'flowchart',
  'sequenceDiagram',
  'classDiagram',
  'stateDiagram',
  'stateDiagram-v2',
  'erDiagram',
  'journey',
  'gantt',
  'pie',
  'quadrantChart',
  'requirementDiagram',
  'gitGraph',
  'mindmap',
  'timeline',
  'sankey-beta',
  'xychart-beta',
  'block-beta',
] as const;

/**
 * Mermaid language configuration
 */
export const mermaidLanguageConfiguration: Monaco.languages.LanguageConfiguration = {
  comments: {
    lineComment: '%%',
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
    ['((', '))'],
    ['[[', ']]'],
    ['{{', '}}'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
    { open: '`', close: '`' },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  folding: {
    markers: {
      start: /^\s*(subgraph|loop|alt|opt|par|critical|break|rect|group)/,
      end: /^\s*end\b/,
    },
  },
};

/**
 * Mermaid token provider (monarch syntax)
 */
export const mermaidTokenProvider: Monaco.languages.IMonarchLanguage = {
  defaultToken: '',
  ignoreCase: false,

  keywords: [
    'graph', 'flowchart', 'subgraph', 'end',
    'sequenceDiagram', 'participant', 'actor', 'activate', 'deactivate',
    'loop', 'alt', 'else', 'opt', 'par', 'and', 'critical', 'break',
    'rect', 'note', 'over', 'left', 'right', 'of',
    'classDiagram', 'class', 'namespace',
    'stateDiagram', 'stateDiagram-v2', 'state', 'fork', 'join',
    'erDiagram',
    'gantt', 'dateFormat', 'title', 'excludes', 'section', 'includes',
    'pie', 'showData',
    'journey', 'gitGraph', 'mindmap', 'timeline',
    'direction', 'TB', 'TD', 'BT', 'RL', 'LR',
  ],

  typeKeywords: [
    'string', 'int', 'float', 'bool', 'void',
  ],

  operators: [
    '-->',  '-->', '---', '-.->', '-.->',
    '==>', '===', '-..->', '.->',
    '-->|', '---|', '-.-|',
    '->>', '-->>', '->>',
    '--x', '--o', '<-->',
    '||--o{', '}|--|{', '}o--o{',
  ],

  symbols: /[=><!~?:&|+\-*\/\^%]+/,

  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

  tokenizer: {
    root: [
      // Comments
      [/%%.*$/, 'comment'],

      // Diagram type declarations
      [/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|stateDiagram-v2|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline|quadrantChart|requirementDiagram|sankey-beta|xychart-beta|block-beta)\b/, 'keyword.diagram'],

      // Direction keywords
      [/\b(TB|TD|BT|RL|LR)\b/, 'keyword.direction'],

      // Keywords
      [/\b(subgraph|end|participant|actor|activate|deactivate|loop|alt|else|opt|par|and|critical|break|rect|note|over|left|right|of|class|namespace|state|fork|join|dateFormat|title|excludes|section|includes|showData|direction)\b/, 'keyword'],

      // Node shapes
      [/\[\[.*?\]\]/, 'string.node.subroutine'],
      [/\[\(.*?\)\]/, 'string.node.cylindrical'],
      [/\(\(.*?\)\)/, 'string.node.circle'],
      [/\[\[.*?\]\]/, 'string.node.subroutine'],
      [/\{\{.*?\}\}/, 'string.node.hexagon'],
      [/\[\/.*?\/\]/, 'string.node.parallelogram'],
      [/\[\\.*?\\\]/, 'string.node.parallelogram-alt'],
      [/>\s*.*?\s*\]/, 'string.node.asymmetric'],

      // Arrows and connections
      [/-->|---|-\.->|\.->|==>|===|-->>|->>/,'operator.arrow'],
      [/--x|--o|<-->|x--|o--/, 'operator.arrow'],
      [/\|.*?\|/, 'string.label'],

      // Node IDs
      [/[A-Za-z_][A-Za-z0-9_]*/, {
        cases: {
          '@keywords': 'keyword',
          '@default': 'identifier',
        },
      }],

      // Strings
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/"/, 'string', '@string_double'],
      [/'([^'\\]|\\.)*$/, 'string.invalid'],
      [/'/, 'string', '@string_single'],

      // Brackets
      [/[{}()\[\]]/, '@brackets'],

      // Numbers
      [/\d+/, 'number'],

      // Whitespace
      [/\s+/, 'white'],
    ],

    string_double: [
      [/[^\\"]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/"/, 'string', '@pop'],
    ],

    string_single: [
      [/[^\\']+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/'/, 'string', '@pop'],
    ],
  },
};

/**
 * Mermaid completion items
 */
export function getMermaidCompletionItems(
  monaco: typeof Monaco,
  range: Monaco.IRange
): Monaco.languages.CompletionItem[] {
  return [
    // Diagram types
    {
      label: 'flowchart',
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: 'flowchart ${1|TB,TD,BT,LR,RL|}\n    ${2:A}[${3:Start}] --> ${4:B}[${5:End}]',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Create a flowchart diagram',
      range,
    },
    {
      label: 'sequenceDiagram',
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: 'sequenceDiagram\n    participant ${1:A}\n    participant ${2:B}\n    ${1:A}->>+${2:B}: ${3:Message}\n    ${2:B}-->>-${1:A}: ${4:Response}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Create a sequence diagram',
      range,
    },
    {
      label: 'classDiagram',
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: 'classDiagram\n    class ${1:ClassName} {\n        +${2:String} ${3:property}\n        +${4:method}()\n    }',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Create a class diagram',
      range,
    },
    {
      label: 'stateDiagram',
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: 'stateDiagram-v2\n    [*] --> ${1:State1}\n    ${1:State1} --> ${2:State2}\n    ${2:State2} --> [*]',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Create a state diagram',
      range,
    },
    {
      label: 'erDiagram',
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: 'erDiagram\n    ${1:CUSTOMER} ||--o{ ${2:ORDER} : places\n    ${2:ORDER} ||--|{ ${3:LINE-ITEM} : contains',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Create an entity relationship diagram',
      range,
    },
    {
      label: 'gantt',
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: 'gantt\n    title ${1:Project Schedule}\n    dateFormat YYYY-MM-DD\n    section ${2:Phase 1}\n        ${3:Task 1} :${4:a1}, ${5:2024-01-01}, ${6:30d}\n        ${7:Task 2} :after a1, ${8:20d}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Create a Gantt chart',
      range,
    },
    {
      label: 'pie',
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: 'pie showData\n    title ${1:Distribution}\n    "${2:Category A}" : ${3:45}\n    "${4:Category B}" : ${5:30}\n    "${6:Category C}" : ${7:25}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Create a pie chart',
      range,
    },
    {
      label: 'mindmap',
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: 'mindmap\n  root((${1:Central Topic}))\n    ${2:Branch 1}\n      ${3:Sub-topic}\n    ${4:Branch 2}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Create a mindmap',
      range,
    },
    {
      label: 'timeline',
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: 'timeline\n    title ${1:Timeline Title}\n    ${2:2024} : ${3:Event 1}\n    ${4:2025} : ${5:Event 2}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Create a timeline',
      range,
    },
    {
      label: 'gitGraph',
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: 'gitGraph\n    commit\n    branch ${1:develop}\n    checkout ${1:develop}\n    commit\n    checkout main\n    merge ${1:develop}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Create a git graph',
      range,
    },
    // Flow elements
    {
      label: 'subgraph',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'subgraph ${1:title}\n    ${2:content}\nend',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Create a subgraph',
      range,
    },
    {
      label: 'node-rectangle',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: '${1:id}[${2:text}]',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Rectangle node',
      range,
    },
    {
      label: 'node-rounded',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: '${1:id}(${2:text})',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Rounded rectangle node',
      range,
    },
    {
      label: 'node-circle',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: '${1:id}((${2:text}))',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Circle node',
      range,
    },
    {
      label: 'node-diamond',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: '${1:id}{${2:text}}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Diamond/rhombus node',
      range,
    },
    {
      label: 'node-hexagon',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: '${1:id}{{${2:text}}}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Hexagon node',
      range,
    },
    // Arrows
    {
      label: 'arrow',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: '${1:A} --> ${2:B}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Arrow connection',
      range,
    },
    {
      label: 'arrow-labeled',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: '${1:A} -->|${2:label}| ${3:B}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Labeled arrow connection',
      range,
    },
    {
      label: 'arrow-dotted',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: '${1:A} -.-> ${2:B}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Dotted arrow connection',
      range,
    },
    {
      label: 'arrow-thick',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: '${1:A} ==> ${2:B}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Thick arrow connection',
      range,
    },
    // Sequence diagram elements
    {
      label: 'participant',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'participant ${1:name} as ${2:alias}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Add a participant',
      range,
    },
    {
      label: 'actor',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'actor ${1:name} as ${2:alias}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Add an actor',
      range,
    },
    {
      label: 'loop',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'loop ${1:condition}\n    ${2:content}\nend',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Loop block',
      range,
    },
    {
      label: 'alt',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'alt ${1:condition}\n    ${2:content}\nelse ${3:else condition}\n    ${4:else content}\nend',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Alternative block',
      range,
    },
    {
      label: 'note',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'note ${1|over,left of,right of|} ${2:participant}: ${3:text}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Add a note',
      range,
    },
  ];
}

/**
 * Register Mermaid language with Monaco editor
 */
export function registerMermaidLanguage(monaco: typeof Monaco): void {
  // Check if already registered
  const languages = monaco.languages.getLanguages();
  if (languages.some(lang => lang.id === MERMAID_LANGUAGE_ID)) {
    return;
  }

  // Register language
  monaco.languages.register({
    id: MERMAID_LANGUAGE_ID,
    extensions: ['.mmd', '.mermaid'],
    aliases: ['Mermaid', 'mermaid'],
    mimetypes: ['text/x-mermaid'],
  });

  // Set language configuration
  monaco.languages.setLanguageConfiguration(MERMAID_LANGUAGE_ID, mermaidLanguageConfiguration);

  // Set token provider
  monaco.languages.setMonarchTokensProvider(MERMAID_LANGUAGE_ID, mermaidTokenProvider);

  // Register completion provider
  monaco.languages.registerCompletionItemProvider(MERMAID_LANGUAGE_ID, {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range: Monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      return {
        suggestions: getMermaidCompletionItems(monaco, range),
      };
    },
  });

  // Register hover provider
  monaco.languages.registerHoverProvider(MERMAID_LANGUAGE_ID, {
    provideHover: (model, position) => {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      const hoverInfo: Record<string, string> = {
        flowchart: 'Flowchart diagram - visualize processes and workflows',
        sequenceDiagram: 'Sequence diagram - show interactions between components',
        classDiagram: 'Class diagram - visualize class structures and relationships',
        stateDiagram: 'State diagram - show state transitions',
        erDiagram: 'Entity Relationship diagram - database schema visualization',
        gantt: 'Gantt chart - project timeline and scheduling',
        pie: 'Pie chart - data distribution visualization',
        mindmap: 'Mindmap - hierarchical idea organization',
        timeline: 'Timeline - chronological event visualization',
        gitGraph: 'Git graph - visualize git branches and commits',
        subgraph: 'Subgraph - group related nodes together',
        participant: 'Participant in a sequence diagram',
        actor: 'Actor in a sequence diagram (shown as a person)',
      };

      const info = hoverInfo[word.word];
      if (info) {
        return {
          range: new monaco.Range(
            position.lineNumber,
            word.startColumn,
            position.lineNumber,
            word.endColumn
          ),
          contents: [{ value: `**${word.word}**\n\n${info}` }],
        };
      }

      return null;
    },
  });
}
