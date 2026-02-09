/**
 * @jest-environment jsdom
 */
import {
  registerLanguageSnippets,
  registerAllSnippets,
  registerEmmetSupport,
  convertSnippetBody,
  EXTENDED_SNIPPETS,
} from './snippets';

// Mock Monaco
const mockDisposable = { dispose: jest.fn() };
const mockRegisterCompletionItemProvider = jest.fn(() => mockDisposable);

const mockMonaco = {
  languages: {
    registerCompletionItemProvider: mockRegisterCompletionItemProvider,
    CompletionItemKind: { Snippet: 27 },
    CompletionItemInsertTextRule: { InsertAsSnippet: 4 },
  },
} as unknown as typeof import('monaco-editor');

describe('snippets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('EXTENDED_SNIPPETS', () => {
    it('should contain typescript snippets', () => {
      expect(EXTENDED_SNIPPETS.typescript).toBeDefined();
      expect(EXTENDED_SNIPPETS.typescript.component).toBeDefined();
      expect(EXTENDED_SNIPPETS.typescript.component.prefix).toBe('rfc');
    });

    it('should contain typescriptreact snippets', () => {
      expect(EXTENDED_SNIPPETS.typescriptreact).toBeDefined();
      expect(EXTENDED_SNIPPETS.typescriptreact.useState).toBeDefined();
      expect(EXTENDED_SNIPPETS.typescriptreact.useState.prefix).toBe('ust');
    });

    it('should contain html snippets', () => {
      expect(EXTENDED_SNIPPETS.html).toBeDefined();
      expect(EXTENDED_SNIPPETS.html.div).toBeDefined();
      expect(EXTENDED_SNIPPETS.html.flexContainer).toBeDefined();
    });

    it('should contain css snippets', () => {
      expect(EXTENDED_SNIPPETS.css).toBeDefined();
      expect(EXTENDED_SNIPPETS.css.flexCenter).toBeDefined();
      expect(EXTENDED_SNIPPETS.css.mediaQuery).toBeDefined();
    });

    it('should contain json snippets', () => {
      expect(EXTENDED_SNIPPETS.json).toBeDefined();
      expect(EXTENDED_SNIPPETS.json.packageJson).toBeDefined();
      expect(EXTENDED_SNIPPETS.json.tsconfig).toBeDefined();
    });

    it('should contain javascript snippets', () => {
      expect(EXTENDED_SNIPPETS.javascript).toBeDefined();
      expect(EXTENDED_SNIPPETS.javascript.asyncFunction).toBeDefined();
    });

    it('typescriptreact should inherit from typescript', () => {
      // typescriptreact should have all typescript snippets plus its own
      expect(EXTENDED_SNIPPETS.typescriptreact.component).toBeDefined();
      expect(EXTENDED_SNIPPETS.typescriptreact.hook).toBeDefined();
      expect(EXTENDED_SNIPPETS.typescriptreact.zustand).toBeDefined();
      // Plus its own
      expect(EXTENDED_SNIPPETS.typescriptreact.useEffect).toBeDefined();
      expect(EXTENDED_SNIPPETS.typescriptreact.useCallback).toBeDefined();
      expect(EXTENDED_SNIPPETS.typescriptreact.useMemo).toBeDefined();
      expect(EXTENDED_SNIPPETS.typescriptreact.useRef).toBeDefined();
      expect(EXTENDED_SNIPPETS.typescriptreact.interface).toBeDefined();
      expect(EXTENDED_SNIPPETS.typescriptreact.type).toBeDefined();
      expect(EXTENDED_SNIPPETS.typescriptreact.tryCatch).toBeDefined();
    });

    it('each snippet should have prefix, body, and description', () => {
      for (const [_lang, snippets] of Object.entries(EXTENDED_SNIPPETS)) {
        for (const [_name, snippet] of Object.entries(snippets)) {
          expect(snippet.prefix).toBeDefined();
          expect(typeof snippet.prefix).toBe('string');
          expect(snippet.body).toBeDefined();
          expect(typeof snippet.body).toBe('string');
          expect(snippet.description).toBeDefined();
          expect(typeof snippet.description).toBe('string');
        }
      }
    });
  });

  describe('registerLanguageSnippets', () => {
    it('should register completion provider for a known language', () => {
      const disposable = registerLanguageSnippets(mockMonaco, 'typescript');
      expect(disposable).not.toBeNull();
      expect(mockRegisterCompletionItemProvider).toHaveBeenCalledWith(
        'typescript',
        expect.objectContaining({
          provideCompletionItems: expect.any(Function),
        })
      );
    });

    it('should return null for an unknown language', () => {
      const disposable = registerLanguageSnippets(mockMonaco, 'unknown-lang');
      expect(disposable).toBeNull();
      expect(mockRegisterCompletionItemProvider).not.toHaveBeenCalled();
    });

    it('should register for html language', () => {
      const disposable = registerLanguageSnippets(mockMonaco, 'html');
      expect(disposable).not.toBeNull();
    });

    it('should register for css language', () => {
      const disposable = registerLanguageSnippets(mockMonaco, 'css');
      expect(disposable).not.toBeNull();
    });

    it('should register for json language', () => {
      const disposable = registerLanguageSnippets(mockMonaco, 'json');
      expect(disposable).not.toBeNull();
    });

    it('should register for typescriptreact language', () => {
      const disposable = registerLanguageSnippets(mockMonaco, 'typescriptreact');
      expect(disposable).not.toBeNull();
    });

    it('completion provider should return suggestions', () => {
      registerLanguageSnippets(mockMonaco, 'typescript');

      const providerCall = mockRegisterCompletionItemProvider.mock.calls[0] as unknown[];
      const provider = providerCall[1] as { provideCompletionItems: (...args: unknown[]) => { suggestions: { label: string; kind: number }[] } };

      const mockModel = {
        getWordUntilPosition: jest.fn(() => ({ word: 'rfc', startColumn: 1, endColumn: 4 })),
      };
      const mockPosition = { lineNumber: 1, column: 4 };

      const result = provider.provideCompletionItems(mockModel, mockPosition);
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions.length).toBeGreaterThan(0);

      const rfcSnippet = result.suggestions.find(
        (s: { label: string }) => s.label === 'rfc'
      );
      expect(rfcSnippet).toBeDefined();
      expect(rfcSnippet!.kind).toBe(27); // CompletionItemKind.Snippet
    });
  });

  describe('registerAllSnippets', () => {
    it('should register snippets for multiple languages', () => {
      const disposables = registerAllSnippets(mockMonaco);
      expect(disposables.length).toBeGreaterThan(0);
      // Should register for each language in EXTENDED_SNIPPETS plus javascript
      expect(mockRegisterCompletionItemProvider).toHaveBeenCalled();
    });

    it('should return disposables array', () => {
      const disposables = registerAllSnippets(mockMonaco);
      expect(Array.isArray(disposables)).toBe(true);
      for (const d of disposables) {
        expect(d.dispose).toBeDefined();
      }
    });
  });

  describe('registerEmmetSupport', () => {
    it('should register emmet for default languages', () => {
      const disposables = registerEmmetSupport(mockMonaco);
      expect(disposables.length).toBe(3); // html, javascript, typescript
    });

    it('should register emmet for custom languages', () => {
      const disposables = registerEmmetSupport(mockMonaco, ['html', 'css']);
      expect(disposables.length).toBe(2);
    });

    it('emmet provider should have trigger characters', () => {
      registerEmmetSupport(mockMonaco);

      const providerCall = mockRegisterCompletionItemProvider.mock.calls[0] as unknown[];
      const provider = providerCall[1] as Record<string, unknown>;
      expect((provider.triggerCharacters as string[])).toContain('!');
      expect((provider.triggerCharacters as string[])).toContain('>');
      expect((provider.triggerCharacters as string[])).toContain(':');
    });

    it('emmet provider should return suggestions for known abbreviations', () => {
      registerEmmetSupport(mockMonaco);

      const providerCall = mockRegisterCompletionItemProvider.mock.calls[0] as unknown[];
      const provider = providerCall[1] as { provideCompletionItems: (...args: unknown[]) => { suggestions: { label: string }[] } };

      const mockModel = {
        getWordUntilPosition: jest.fn(() => ({ word: 'btn', startColumn: 1, endColumn: 4 })),
        getLineContent: jest.fn(() => 'btn'),
      };
      const mockPosition = { lineNumber: 1, column: 4 };

      const result = provider.provideCompletionItems(mockModel, mockPosition);
      expect(result.suggestions.length).toBeGreaterThan(0);

      const btnSuggestion = result.suggestions.find(
        (s: { label: string }) => s.label.includes('btn')
      );
      expect(btnSuggestion).toBeDefined();
    });

    it('should return disposables array', () => {
      const disposables = registerEmmetSupport(mockMonaco);
      expect(Array.isArray(disposables)).toBe(true);
      for (const d of disposables) {
        expect(d.dispose).toBeDefined();
      }
    });
  });

  describe('convertSnippetBody', () => {
    it('should convert escaped snippet placeholders', () => {
      const input = 'const $\\{1:name} = $\\{2:value};';
      const result = convertSnippetBody(input);
      expect(result).toBe('const ${1:name} = ${2:value};');
    });

    it('should handle plain text without placeholders', () => {
      const input = 'const x = 42;';
      const result = convertSnippetBody(input);
      expect(result).toBe('const x = 42;');
    });

    it('should handle empty string', () => {
      expect(convertSnippetBody('')).toBe('');
    });
  });
});
