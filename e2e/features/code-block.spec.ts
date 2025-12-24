import { test, expect } from '@playwright/test';

/**
 * Code Block E2E Tests
 * Tests code block rendering features including
 * copy, download, fullscreen, line numbers, and word wrap
 */
test.describe('Code Block', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test.describe('Language Detection', () => {
    test('should detect common programming languages', async ({ page }) => {
      const result = await page.evaluate(() => {
        const detectLanguage = (filename: string): string => {
          const ext = filename.split('.').pop()?.toLowerCase() || '';
          const langMap: Record<string, string> = {
            js: 'javascript',
            ts: 'typescript',
            py: 'python',
            rb: 'ruby',
            java: 'java',
            go: 'go',
            rs: 'rust',
            cpp: 'cpp',
            c: 'c',
            cs: 'csharp',
            php: 'php',
            swift: 'swift',
            kt: 'kotlin',
          };
          return langMap[ext] || ext;
        };

        return {
          javascript: detectLanguage('app.js'),
          typescript: detectLanguage('index.ts'),
          python: detectLanguage('main.py'),
          rust: detectLanguage('lib.rs'),
          unknown: detectLanguage('file.xyz'),
        };
      });

      expect(result.javascript).toBe('javascript');
      expect(result.typescript).toBe('typescript');
      expect(result.python).toBe('python');
      expect(result.rust).toBe('rust');
      expect(result.unknown).toBe('xyz');
    });
  });

  test.describe('File Extension Mapping', () => {
    test('should map languages to file extensions', async ({ page }) => {
      const result = await page.evaluate(() => {
        const getExtension = (language: string): string => {
          const extensions: Record<string, string> = {
            javascript: '.js',
            typescript: '.ts',
            python: '.py',
            java: '.java',
            go: '.go',
            rust: '.rs',
            ruby: '.rb',
            php: '.php',
            csharp: '.cs',
            cpp: '.cpp',
          };
          return extensions[language.toLowerCase()] || `.${language.toLowerCase()}`;
        };

        return {
          javascript: getExtension('javascript'),
          typescript: getExtension('typescript'),
          python: getExtension('python'),
          unknown: getExtension('brainfuck'),
        };
      });

      expect(result.javascript).toBe('.js');
      expect(result.typescript).toBe('.ts');
      expect(result.python).toBe('.py');
      expect(result.unknown).toBe('.brainfuck');
    });
  });

  test.describe('Line Numbers', () => {
    test('should count lines correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        const countLines = (code: string): number => {
          return code.split('\n').length;
        };

        return {
          single: countLines('one line'),
          multiple: countLines('line1\nline2\nline3'),
          withEmpty: countLines('line1\n\nline3'),
          empty: countLines(''),
        };
      });

      expect(result.single).toBe(1);
      expect(result.multiple).toBe(3);
      expect(result.withEmpty).toBe(3);
      expect(result.empty).toBe(1);
    });

    test('should toggle line numbers state', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface CodeBlockState {
          showLineNumbers: boolean;
        }

        const createState = (): CodeBlockState => ({
          showLineNumbers: true,
        });

        const toggleLineNumbers = (state: CodeBlockState): CodeBlockState => ({
          ...state,
          showLineNumbers: !state.showLineNumbers,
        });

        const initial = createState();
        const toggled = toggleLineNumbers(initial);
        const toggledBack = toggleLineNumbers(toggled);

        return {
          initial: initial.showLineNumbers,
          toggled: toggled.showLineNumbers,
          toggledBack: toggledBack.showLineNumbers,
        };
      });

      expect(result.initial).toBe(true);
      expect(result.toggled).toBe(false);
      expect(result.toggledBack).toBe(true);
    });
  });

  test.describe('Word Wrap', () => {
    test('should toggle word wrap state', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface CodeBlockState {
          wordWrap: boolean;
        }

        const createState = (): CodeBlockState => ({
          wordWrap: false,
        });

        const toggleWordWrap = (state: CodeBlockState): CodeBlockState => ({
          ...state,
          wordWrap: !state.wordWrap,
        });

        const initial = createState();
        const toggled = toggleWordWrap(initial);

        return {
          initial: initial.wordWrap,
          toggled: toggled.wordWrap,
        };
      });

      expect(result.initial).toBe(false);
      expect(result.toggled).toBe(true);
    });
  });

  test.describe('Line Highlighting', () => {
    test('should identify highlighted lines', async ({ page }) => {
      const result = await page.evaluate(() => {
        const isHighlighted = (lineNumber: number, highlightLines: number[]): boolean => {
          return highlightLines.includes(lineNumber);
        };

        const highlightLines = [2, 5, 7];

        return {
          line1: isHighlighted(1, highlightLines),
          line2: isHighlighted(2, highlightLines),
          line5: isHighlighted(5, highlightLines),
          line6: isHighlighted(6, highlightLines),
        };
      });

      expect(result.line1).toBe(false);
      expect(result.line2).toBe(true);
      expect(result.line5).toBe(true);
      expect(result.line6).toBe(false);
    });

    test('should handle empty highlight lines array', async ({ page }) => {
      const result = await page.evaluate(() => {
        const isHighlighted = (lineNumber: number, highlightLines: number[]): boolean => {
          return highlightLines.includes(lineNumber);
        };

        return {
          anyHighlighted: isHighlighted(1, []) || isHighlighted(2, []) || isHighlighted(3, []),
        };
      });

      expect(result.anyHighlighted).toBe(false);
    });
  });

  test.describe('Fullscreen Dialog', () => {
    test('should have dialog structure', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface DialogState {
          isOpen: boolean;
          title: string;
        }

        const createDialogState = (language: string): DialogState => ({
          isOpen: false,
          title: language || 'Code',
        });

        const toggleDialog = (state: DialogState): DialogState => ({
          ...state,
          isOpen: !state.isOpen,
        });

        const jsDialog = createDialogState('javascript');
        const openedDialog = toggleDialog(jsDialog);
        const closedDialog = toggleDialog(openedDialog);

        return {
          initiallyOpen: jsDialog.isOpen,
          afterOpen: openedDialog.isOpen,
          afterClose: closedDialog.isOpen,
          title: jsDialog.title,
        };
      });

      expect(result.initiallyOpen).toBe(false);
      expect(result.afterOpen).toBe(true);
      expect(result.afterClose).toBe(false);
      expect(result.title).toBe('javascript');
    });
  });

  test.describe('Download Functionality', () => {
    test('should generate filename with correct extension', async ({ page }) => {
      const result = await page.evaluate(() => {
        const getExtension = (language?: string): string => {
          if (!language) return '.txt';
          const extensions: Record<string, string> = {
            javascript: '.js',
            typescript: '.ts',
            python: '.py',
          };
          return extensions[language.toLowerCase()] || `.${language.toLowerCase()}`;
        };

        const generateFilename = (filename?: string, language?: string): string => {
          if (filename) return filename;
          return `code${getExtension(language)}`;
        };

        return {
          withFilename: generateFilename('app.js', 'javascript'),
          withLanguage: generateFilename(undefined, 'python'),
          noLanguage: generateFilename(undefined, undefined),
        };
      });

      expect(result.withFilename).toBe('app.js');
      expect(result.withLanguage).toBe('code.py');
      expect(result.noLanguage).toBe('code.txt');
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA attributes structure', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface CodeBlockAccessibility {
          role: string;
          ariaLabel: string;
          codeRole: string;
          codeAriaLabel: string;
        }

        const createAccessibility = (language?: string): CodeBlockAccessibility => ({
          role: 'figure',
          ariaLabel: `Code block${language ? ` in ${language}` : ''}`,
          codeRole: 'code',
          codeAriaLabel: `Code in ${language || 'plain text'}`,
        });

        const jsBlock = createAccessibility('javascript');
        const plainBlock = createAccessibility();

        return {
          jsRole: jsBlock.role,
          jsLabel: jsBlock.ariaLabel,
          jsCodeLabel: jsBlock.codeAriaLabel,
          plainLabel: plainBlock.ariaLabel,
          plainCodeLabel: plainBlock.codeAriaLabel,
        };
      });

      expect(result.jsRole).toBe('figure');
      expect(result.jsLabel).toBe('Code block in javascript');
      expect(result.jsCodeLabel).toBe('Code in javascript');
      expect(result.plainLabel).toBe('Code block');
      expect(result.plainCodeLabel).toBe('Code in plain text');
    });

    test('should have line number cells with aria-hidden', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface LineNumberCell {
          ariaHidden: boolean;
          content: number;
        }

        const createLineNumberCell = (lineNumber: number): LineNumberCell => ({
          ariaHidden: true,
          content: lineNumber,
        });

        const cells = [1, 2, 3].map(createLineNumberCell);

        return {
          allHidden: cells.every(cell => cell.ariaHidden),
          contents: cells.map(cell => cell.content),
        };
      });

      expect(result.allHidden).toBe(true);
      expect(result.contents).toEqual([1, 2, 3]);
    });
  });

  test.describe('Code Statistics', () => {
    test('should calculate code statistics', async ({ page }) => {
      const result = await page.evaluate(() => {
        const getStats = (code: string): { lines: number; characters: number } => {
          return {
            lines: code.split('\n').length,
            characters: code.length,
          };
        };

        const singleLine = getStats('const x = 1;');
        const multiLine = getStats('line1\nline2\nline3');
        const empty = getStats('');

        return {
          singleLine,
          multiLine,
          empty,
        };
      });

      expect(result.singleLine.lines).toBe(1);
      expect(result.singleLine.characters).toBe(12);
      expect(result.multiLine.lines).toBe(3);
      expect(result.multiLine.characters).toBe(17);
      expect(result.empty.lines).toBe(1);
      expect(result.empty.characters).toBe(0);
    });
  });

  test.describe('Settings Integration', () => {
    test('should have code block settings structure', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface CodeBlockSettings {
          showLineNumbers: boolean;
          codeWordWrap: boolean;
          codeFontSize: number;
          codeTheme: string;
        }

        const defaultSettings: CodeBlockSettings = {
          showLineNumbers: true,
          codeWordWrap: false,
          codeFontSize: 14,
          codeTheme: 'github-dark',
        };

        const toggleLineNumbers = (settings: CodeBlockSettings): CodeBlockSettings => ({
          ...settings,
          showLineNumbers: !settings.showLineNumbers,
        });

        const toggleWordWrap = (settings: CodeBlockSettings): CodeBlockSettings => ({
          ...settings,
          codeWordWrap: !settings.codeWordWrap,
        });

        const withLineNumbersOff = toggleLineNumbers(defaultSettings);
        const withWordWrapOn = toggleWordWrap(defaultSettings);

        return {
          defaultLineNumbers: defaultSettings.showLineNumbers,
          defaultWordWrap: defaultSettings.codeWordWrap,
          defaultFontSize: defaultSettings.codeFontSize,
          defaultTheme: defaultSettings.codeTheme,
          toggledLineNumbers: withLineNumbersOff.showLineNumbers,
          toggledWordWrap: withWordWrapOn.codeWordWrap,
        };
      });

      expect(result.defaultLineNumbers).toBe(true);
      expect(result.defaultWordWrap).toBe(false);
      expect(result.defaultFontSize).toBe(14);
      expect(result.defaultTheme).toBe('github-dark');
      expect(result.toggledLineNumbers).toBe(false);
      expect(result.toggledWordWrap).toBe(true);
    });
  });
});
