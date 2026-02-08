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
    context: {
      prefix: 'rctx',
      body: `import { createContext, useContext, useState, type ReactNode } from 'react';

interface $\{1:MyContext}Value {
  $\{2:value}: $\{3:string};
  $\{4:setValue}: (value: $\{3:string}) => void;
}

const $\{1:MyContext}Context = createContext<$\{1:MyContext}Value | undefined>(undefined);

export function $\{1:MyContext}Provider({ children }: { children: ReactNode }) {
  const [$\{2:value}, $\{4:setValue}] = useState<$\{3:string}>($\{5:''});

  return (
    <$\{1:MyContext}Context.Provider value={{ $\{2:value}, $\{4:setValue} }}>
      {children}
    </$\{1:MyContext}Context.Provider>
  );
}

export function use$\{1:MyContext}() {
  const context = useContext($\{1:MyContext}Context);
  if (!context) {
    throw new Error('use$\{1:MyContext} must be used within a $\{1:MyContext}Provider');
  }
  return context;
}`,
      description: 'React Context with Provider and Hook',
    },
    reducer: {
      prefix: 'rred',
      body: `import { useReducer } from 'react';

type $\{1:State} = {
  $\{2:count}: number;
};

type $\{1:State}Action =
  | { type: '$\{3:INCREMENT}' }
  | { type: '$\{4:DECREMENT}' }
  | { type: '$\{5:RESET}'; payload: number };

function $\{1:state}Reducer(state: $\{1:State}, action: $\{1:State}Action): $\{1:State} {
  switch (action.type) {
    case '$\{3:INCREMENT}':
      return { ...state, $\{2:count}: state.$\{2:count} + 1 };
    case '$\{4:DECREMENT}':
      return { ...state, $\{2:count}: state.$\{2:count} - 1 };
    case '$\{5:RESET}':
      return { ...state, $\{2:count}: action.payload };
    default:
      return state;
  }
}

const initialState: $\{1:State} = { $\{2:count}: 0 };

export function use$\{1:State}() {
  return useReducer($\{1:state}Reducer, initialState);
}`,
      description: 'React useReducer Pattern',
    },
    suspenseBoundary: {
      prefix: 'rsus',
      body: `import { Suspense } from 'react';

function $\{1:Component}Fallback() {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
    </div>
  );
}

export function $\{2:Wrapper}() {
  return (
    <Suspense fallback={<$\{1:Component}Fallback />}>
      <$\{3:AsyncComponent} />
    </Suspense>
  );
}`,
      description: 'React Suspense Boundary',
    },
    forwardRefComponent: {
      prefix: 'rfref',
      body: `import { forwardRef } from 'react';

interface $\{1:Component}Props {
  $\{2:// props}
}

export const $\{1:Component} = forwardRef<$\{3:HTMLDivElement}, $\{1:Component}Props>(
  ({ $\{4:...props} }, ref) => {
    return (
      <div ref={ref} $\{4:...props}>
        $\{5:// content}
      </div>
    );
  }
);

$\{1:Component}.displayName = '$\{1:Component}';`,
      description: 'React forwardRef Component',
    },
    customHookWithState: {
      prefix: 'rhook',
      body: `import { useState, useCallback } from 'react';

export function use$\{1:Hook}($\{2:initialValue}: $\{3:string} = $\{4:''}) {
  const [$\{5:state}, set$\{5/(.*)/$\{1:/capitalize}/}] = useState<$\{3:string}>($\{2:initialValue});

  const $\{6:update} = useCallback(($\{7:newValue}: $\{3:string}) => {
    set$\{5/(.*)/$\{1:/capitalize}/}($\{7:newValue});
  }, []);

  const $\{8:reset} = useCallback(() => {
    set$\{5/(.*)/$\{1:/capitalize}/}($\{2:initialValue});
  }, [$\{2:initialValue}]);

  return { $\{5:state}, $\{6:update}, $\{8:reset} } as const;
}`,
      description: 'Custom React Hook with State',
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
  // Next.js App Router patterns
  nextjs: {
    page: {
      prefix: 'npage',
      body: `export default function $\{1:Page}() {
  return (
    <div className="$\{2:container mx-auto p-4}">
      <h1 className="text-2xl font-bold">$\{3:Page Title}</h1>
      $\{4:// content}
    </div>
  );
}`,
      description: 'Next.js Page Component',
    },
    layout: {
      prefix: 'nlayout',
      body: `export default function $\{1:Root}Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="$\{2:min-h-screen}">
      $\{3:// header, nav, etc.}
      <main>{children}</main>
    </div>
  );
}`,
      description: 'Next.js Layout Component',
    },
    loading: {
      prefix: 'nloading',
      body: `export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}`,
      description: 'Next.js Loading Component',
    },
    error: {
      prefix: 'nerror',
      body: `'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
      <h2 className="text-xl font-semibold text-destructive">Something went wrong!</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}`,
      description: 'Next.js Error Boundary Component',
    },
    notFound: {
      prefix: 'nnotfound',
      body: `export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <h2 className="text-4xl font-bold">404</h2>
      <p className="text-muted-foreground">$\{1:Page not found}</p>
    </div>
  );
}`,
      description: 'Next.js Not Found Component',
    },
    routeHandler: {
      prefix: 'nroute',
      body: `import { NextResponse } from 'next/server';

export async function $\{1|GET,POST,PUT,PATCH,DELETE|}(request: Request) {
  try {
    $\{2:// implementation}

    return NextResponse.json({ $\{3:data: null} });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}`,
      description: 'Next.js API Route Handler',
    },
    middleware: {
      prefix: 'nmiddleware',
      body: `import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  $\{1:// middleware logic}

  return NextResponse.next();
}

export const config = {
  matcher: ['$\{2:/((?!api|_next/static|_next/image|favicon.ico).*)}'  ],
};`,
      description: 'Next.js Middleware',
    },
    generateMetadata: {
      prefix: 'nmeta',
      body: `import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '$\{1:Page Title}',
  description: '$\{2:Page description}',
  openGraph: {
    title: '$\{1:Page Title}',
    description: '$\{2:Page description}',
  },
};`,
      description: 'Next.js Static Metadata',
    },
    serverAction: {
      prefix: 'naction',
      body: `'use server';

export async function $\{1:actionName}($\{2:formData: FormData}) {
  try {
    $\{3:// server action implementation}

    return { success: true };
  } catch (error) {
    console.error('Action error:', error);
    return { success: false, error: 'Failed to execute action' };
  }
}`,
      description: 'Next.js Server Action',
    },
    useClient: {
      prefix: 'nuc',
      body: `'use client';

$\{1:}`,
      description: "Next.js 'use client' directive",
    },
    useServer: {
      prefix: 'nus',
      body: `'use server';

$\{1:}`,
      description: "Next.js 'use server' directive",
    },
  },
  // Testing patterns (Jest/Vitest)
  test: {
    describeBlock: {
      prefix: 'desc',
      body: `describe('$\{1:component/function}', () => {
  $\{2:// test cases}
});`,
      description: 'Test describe block',
    },
    testCase: {
      prefix: 'test',
      body: `it('should $\{1:do something}', () => {
  $\{2:// arrange}
  $\{3:// act}
  $\{4:// assert}
});`,
      description: 'Test case (it block)',
    },
    asyncTest: {
      prefix: 'atest',
      body: `it('should $\{1:do something}', async () => {
  $\{2:// arrange}
  $\{3:// act}
  $\{4:// assert}
});`,
      description: 'Async test case',
    },
    beforeAfter: {
      prefix: 'bdd',
      body: `beforeEach(() => {
  $\{1:// setup}
});

afterEach(() => {
  $\{2:// cleanup}
});`,
      description: 'beforeEach/afterEach setup',
    },
    mockFn: {
      prefix: 'jmock',
      body: `const $\{1:mockFn} = jest.fn($\{2:});`,
      description: 'Jest mock function',
    },
    spyOn: {
      prefix: 'jspy',
      body: `jest.spyOn($\{1:object}, '$\{2:method}').mockImplementation($\{3:() => {}});`,
      description: 'Jest spyOn',
    },
    expectToEqual: {
      prefix: 'exp',
      body: `expect($\{1:actual}).toEqual($\{2:expected});`,
      description: 'expect().toEqual()',
    },
    expectToBe: {
      prefix: 'exb',
      body: `expect($\{1:actual}).toBe($\{2:expected});`,
      description: 'expect().toBe()',
    },
    renderTest: {
      prefix: 'rtl',
      body: `import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { $\{1:Component} } from './$\{2:component}';

describe('$\{1:Component}', () => {
  it('renders correctly', () => {
    render(<$\{1:Component} />);
    expect(screen.getByText('$\{3:text}')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const user = userEvent.setup();
    render(<$\{1:Component} />);

    await user.click(screen.getByRole('button', { name: '$\{4:button}' }));
    $\{5:// assertions}
  });
});`,
      description: 'React Testing Library test suite',
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
