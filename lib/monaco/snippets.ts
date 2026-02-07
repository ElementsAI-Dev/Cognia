/**
 * Monaco Editor Snippet Registration
 * Registers code snippets with Monaco's completion provider
 * Provides VSCode-like snippet experience for various languages
 */

import type * as Monaco from 'monaco-editor';
import { CODE_SNIPPETS } from './config';

/**
 * Extended snippets covering more languages and patterns
 */
const EXTENDED_SNIPPETS: Record<string, Record<string, { prefix: string; body: string; description: string }>> = {
  ...CODE_SNIPPETS,
  typescriptreact: {
    ...CODE_SNIPPETS.typescript,
    useState: {
      prefix: 'ust',
      body: `const [$\{1:state}, set$\{1/(.*)/$\{1:/capitalize}/}] = useState<$\{2:string}>($\{3:initialValue});`,
      description: 'React useState hook',
    },
    useEffect: {
      prefix: 'uef',
      body: `useEffect(() => {
  $\{1:// effect}
  return () => {
    $\{2:// cleanup}
  };
}, [$\{3:// deps}]);`,
      description: 'React useEffect hook',
    },
    useCallback: {
      prefix: 'ucb',
      body: `const $\{1:callback} = useCallback(($\{2:params}) => {
  $\{3:// implementation}
}, [$\{4:// deps}]);`,
      description: 'React useCallback hook',
    },
    useMemo: {
      prefix: 'umm',
      body: `const $\{1:value} = useMemo(() => {
  return $\{2:// computed value};
}, [$\{3:// deps}]);`,
      description: 'React useMemo hook',
    },
    useRef: {
      prefix: 'urf',
      body: `const $\{1:ref} = useRef<$\{2:HTMLDivElement}>(null);`,
      description: 'React useRef hook',
    },
    interface: {
      prefix: 'ifc',
      body: `interface $\{1:Name} {
  $\{2:property}: $\{3:type};
}`,
      description: 'TypeScript interface',
    },
    type: {
      prefix: 'tpe',
      body: `type $\{1:Name} = {
  $\{2:property}: $\{3:type};
};`,
      description: 'TypeScript type alias',
    },
    tryCatch: {
      prefix: 'trycatch',
      body: `try {
  $\{1:// code}
} catch (error) {
  console.error('$\{2:Error}:', error);
  $\{3:throw error;}
}`,
      description: 'Try-catch block with error logging',
    },
  },
  html: {
    div: {
      prefix: 'div',
      body: `<div class="$\{1:className}">
  $\{2:content}
</div>`,
      description: 'HTML div element',
    },
    section: {
      prefix: 'section',
      body: `<section class="$\{1:className}">
  <h2>$\{2:Title}</h2>
  $\{3:content}
</section>`,
      description: 'HTML section with heading',
    },
    form: {
      prefix: 'form',
      body: `<form action="$\{1:#}" method="$\{2|get,post|}">
  <label for="$\{3:input}">$\{4:Label}</label>
  <input type="$\{5|text,email,password,number|}" id="$\{3:input}" name="$\{3:input}" />
  <button type="submit">$\{6:Submit}</button>
</form>`,
      description: 'HTML form with input and submit',
    },
    flexContainer: {
      prefix: 'flex',
      body: `<div class="flex $\{1|items-center,items-start,items-end|} $\{2|justify-center,justify-between,justify-start|} $\{3|gap-2,gap-4,gap-6|}">
  $\{4:content}
</div>`,
      description: 'Flexbox container with Tailwind',
    },
    gridContainer: {
      prefix: 'grid',
      body: `<div class="grid $\{1|grid-cols-2,grid-cols-3,grid-cols-4|} $\{2|gap-2,gap-4,gap-6|}">
  $\{3:content}
</div>`,
      description: 'Grid container with Tailwind',
    },
  },
  css: {
    flexCenter: {
      prefix: 'flexcenter',
      body: `display: flex;
align-items: center;
justify-content: center;`,
      description: 'Flexbox center alignment',
    },
    gridLayout: {
      prefix: 'gridlayout',
      body: `display: grid;
grid-template-columns: repeat($\{1:3}, 1fr);
gap: $\{2:1rem};`,
      description: 'CSS Grid layout',
    },
    mediaQuery: {
      prefix: 'media',
      body: `@media (max-width: $\{1|768px,1024px,1280px|}) {
  $\{2:/* styles */}
}`,
      description: 'Media query',
    },
    keyframes: {
      prefix: 'keyframes',
      body: `@keyframes $\{1:name} {
  from {
    $\{2:/* start styles */}
  }
  to {
    $\{3:/* end styles */}
  }
}`,
      description: 'CSS keyframes animation',
    },
  },
  json: {
    packageJson: {
      prefix: 'pkgjson',
      body: `{
  "name": "$\{1:package-name}",
  "version": "$\{2:1.0.0}",
  "description": "$\{3:description}",
  "main": "$\{4:index.js}",
  "scripts": {
    "dev": "$\{5:next dev}",
    "build": "$\{6:next build}",
    "start": "$\{7:next start}"
  },
  "dependencies": {}
}`,
      description: 'package.json template',
    },
    tsconfig: {
      prefix: 'tscfg',
      body: `{
  "compilerOptions": {
    "target": "$\{1:ES2022}",
    "module": "$\{2:ESNext}",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "$\{3:./dist}"
  },
  "include": ["$\{4:src/**/*}"]
}`,
      description: 'tsconfig.json template',
    },
  },
};

/**
 * Convert snippet body to Monaco snippet format
 * Handles VSCode-style snippet placeholders
 */
export function convertSnippetBody(body: string): string {
  // Monaco uses the same snippet syntax as VSCode
  // $\{1:placeholder} -> ${1:placeholder}
  // But we need to ensure proper escaping
  return body
    .replace(/\$\\{/g, '${')
    .replace(/\\}/g, '}');
}

/**
 * Register snippets for a specific language with Monaco
 */
export function registerLanguageSnippets(
  monaco: typeof Monaco,
  language: string
): Monaco.IDisposable | null {
  const snippets = EXTENDED_SNIPPETS[language];
  if (!snippets) return null;

  return monaco.languages.registerCompletionItemProvider(language, {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range: Monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions: Monaco.languages.CompletionItem[] = Object.entries(snippets).map(
        ([_key, snippet]) => ({
          label: snippet.prefix,
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: snippet.body,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: snippet.description,
          detail: `Snippet: ${snippet.description}`,
          range,
          sortText: `!${snippet.prefix}`, // Sort snippets first
        })
      );

      return { suggestions };
    },
  });
}

/**
 * Register snippets for all supported languages
 */
export function registerAllSnippets(monaco: typeof Monaco): Monaco.IDisposable[] {
  const disposables: Monaco.IDisposable[] = [];

  for (const language of Object.keys(EXTENDED_SNIPPETS)) {
    const disposable = registerLanguageSnippets(monaco, language);
    if (disposable) {
      disposables.push(disposable);
    }
  }

  // Also register TypeScript snippets for 'typescript' language
  // (typescriptreact snippets should also work in typescript files)
  const tsDisposable = registerLanguageSnippets(monaco, 'javascript');
  if (tsDisposable) disposables.push(tsDisposable);

  return disposables;
}

/**
 * Register Emmet-like abbreviation expansion for HTML/JSX
 */
export function registerEmmetSupport(
  monaco: typeof Monaco,
  languages: string[] = ['html', 'javascript', 'typescript']
): Monaco.IDisposable[] {
  const emmetAbbreviations: Record<string, { expansion: string; description: string }> = {
    '!': {
      expansion: `<!DOCTYPE html>
<html lang="\${1:en}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\${2:Document}</title>
</head>
<body>
  \${3}
</body>
</html>`,
      description: 'HTML5 boilerplate',
    },
    'link:css': {
      expansion: '<link rel="stylesheet" href="\${1:style.css}">',
      description: 'CSS link tag',
    },
    'script:src': {
      expansion: '<script src="\${1:script.js}"></script>',
      description: 'Script tag with src',
    },
    'btn': {
      expansion: '<button type="\${1|button,submit,reset|}" class="\${2:}">\${3:Button}</button>',
      description: 'Button element',
    },
    'inp': {
      expansion: '<input type="\${1|text,email,password,number,tel,url|}" name="\${2:}" id="\${2:}" placeholder="\${3:}" />',
      description: 'Input element',
    },
    'img': {
      expansion: '<img src="\${1:}" alt="\${2:}" width="\${3:}" height="\${4:}" />',
      description: 'Image element',
    },
    'a': {
      expansion: '<a href="\${1:#}">\${2:Link text}</a>',
      description: 'Anchor element',
    },
    'ul>li': {
      expansion: `<ul>
  <li>\${1:Item 1}</li>
  <li>\${2:Item 2}</li>
  <li>\${3:Item 3}</li>
</ul>`,
      description: 'Unordered list with items',
    },
    'ol>li': {
      expansion: `<ol>
  <li>\${1:Item 1}</li>
  <li>\${2:Item 2}</li>
  <li>\${3:Item 3}</li>
</ol>`,
      description: 'Ordered list with items',
    },
    'table': {
      expansion: `<table>
  <thead>
    <tr>
      <th>\${1:Header 1}</th>
      <th>\${2:Header 2}</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>\${3:Data 1}</td>
      <td>\${4:Data 2}</td>
    </tr>
  </tbody>
</table>`,
      description: 'HTML table with header and body',
    },
    'nav': {
      expansion: `<nav class="\${1:}">
  <ul>
    <li><a href="\${2:#}">\${3:Home}</a></li>
    <li><a href="\${4:#}">\${5:About}</a></li>
    <li><a href="\${6:#}">\${7:Contact}</a></li>
  </ul>
</nav>`,
      description: 'Navigation with links',
    },
  };

  const disposables: Monaco.IDisposable[] = [];

  for (const lang of languages) {
    const disposable = monaco.languages.registerCompletionItemProvider(lang, {
      triggerCharacters: ['!', '>', ':'],
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range: Monaco.IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        // Also check for multi-character triggers like "ul>li"
        const lineContent = model.getLineContent(position.lineNumber);
        const textBeforeCursor = lineContent.substring(0, position.column - 1);

        const suggestions: Monaco.languages.CompletionItem[] = [];

        for (const [abbrev, { expansion, description }] of Object.entries(emmetAbbreviations)) {
          // Check if the abbreviation matches the text before cursor
          if (abbrev.startsWith(word.word) || textBeforeCursor.endsWith(abbrev)) {
            suggestions.push({
              label: `⚡ ${abbrev}`,
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: expansion,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: { value: `**Emmet:** ${description}` },
              detail: `Emmet: ${description}`,
              range: textBeforeCursor.endsWith(abbrev)
                ? {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: position.column - abbrev.length,
                    endColumn: position.column,
                  }
                : range,
              sortText: `!!${abbrev}`, // Sort Emmet abbreviations at the top
            });
          }
        }

        return { suggestions };
      },
    });
    disposables.push(disposable);
  }

  return disposables;
}

export { EXTENDED_SNIPPETS };
