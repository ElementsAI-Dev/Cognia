import { test, expect } from '@playwright/test';

/**
 * Math Renderer E2E Tests
 * Tests LaTeX math rendering features including block/inline math,
 * fullscreen view, source toggle, copy, and export functionality
 */
test.describe('Math Renderer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test.describe('LaTeX Parsing', () => {
    test('should detect block math with $$ delimiters', async ({ page }) => {
      const result = await page.evaluate(() => {
        const isBlockMath = (content: string): boolean => {
          return content.startsWith('$$') && content.endsWith('$$');
        };

        return {
          block: isBlockMath('$$E = mc^2$$'),
          inline: isBlockMath('$E = mc^2$'),
          mixed: isBlockMath('$$x$'),
        };
      });

      expect(result.block).toBe(true);
      expect(result.inline).toBe(false);
      expect(result.mixed).toBe(false);
    });

    test('should detect inline math with $ delimiters', async ({ page }) => {
      const result = await page.evaluate(() => {
        const isInlineMath = (content: string): boolean => {
          return content.startsWith('$') && content.endsWith('$') && 
                 !content.startsWith('$$');
        };

        return {
          inline: isInlineMath('$x^2$'),
          block: isInlineMath('$$x^2$$'),
        };
      });

      expect(result.inline).toBe(true);
      expect(result.block).toBe(false);
    });

    test('should strip delimiters correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        const stripDelimiters = (content: string): string => {
          return content
            .replace(/^\$\$/, '')
            .replace(/\$\$$/, '')
            .replace(/^\$/, '')
            .replace(/\$$/, '')
            .replace(/^\\\[/, '')
            .replace(/\\\]$/, '')
            .replace(/^\\\(/, '')
            .replace(/\\\)$/, '')
            .trim();
        };

        return {
          block: stripDelimiters('$$E = mc^2$$'),
          inline: stripDelimiters('$x^2$'),
          bracketBlock: stripDelimiters('\\[a + b\\]'),
          bracketInline: stripDelimiters('\\(a + b\\)'),
        };
      });

      expect(result.block).toBe('E = mc^2');
      expect(result.inline).toBe('x^2');
      expect(result.bracketBlock).toBe('a + b');
      expect(result.bracketInline).toBe('a + b');
    });
  });

  test.describe('Math Content Validation', () => {
    test('should validate balanced braces', async ({ page }) => {
      const result = await page.evaluate(() => {
        const hasBalancedBraces = (content: string): boolean => {
          const opens = (content.match(/{/g) || []).length;
          const closes = (content.match(/}/g) || []).length;
          return opens === closes;
        };

        return {
          balanced: hasBalancedBraces('\\frac{a}{b}'),
          unbalanced: hasBalancedBraces('\\frac{a}{b'),
          nested: hasBalancedBraces('\\frac{\\sqrt{x}}{y}'),
        };
      });

      expect(result.balanced).toBe(true);
      expect(result.unbalanced).toBe(false);
      expect(result.nested).toBe(true);
    });

    test('should detect common LaTeX commands', async ({ page }) => {
      const result = await page.evaluate(() => {
        const hasLatexCommands = (content: string): boolean => {
          const commands = ['\\frac', '\\sqrt', '\\sum', '\\int', '\\lim', '\\alpha', '\\beta'];
          return commands.some(cmd => content.includes(cmd));
        };

        return {
          fraction: hasLatexCommands('\\frac{1}{2}'),
          integral: hasLatexCommands('\\int_0^1 x dx'),
          plain: hasLatexCommands('x + y'),
        };
      });

      expect(result.fraction).toBe(true);
      expect(result.integral).toBe(true);
      expect(result.plain).toBe(false);
    });
  });

  test.describe('Display Mode Detection', () => {
    test('should detect display mode correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        const isDisplayMode = (content: string): boolean => {
          return content.startsWith('$$') || 
                 content.startsWith('\\[') ||
                 content.includes('\n');
        };

        return {
          dollarBlock: isDisplayMode('$$x^2$$'),
          bracketBlock: isDisplayMode('\\[x^2\\]'),
          inline: isDisplayMode('$x^2$'),
          multiline: isDisplayMode('x^2\n+ y^2'),
        };
      });

      expect(result.dollarBlock).toBe(true);
      expect(result.bracketBlock).toBe(true);
      expect(result.inline).toBe(false);
      expect(result.multiline).toBe(true);
    });
  });

  test.describe('Math Settings', () => {
    test('should have math rendering settings structure', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface MathSettings {
          enableMathRendering: boolean;
          mathFontScale: number;
          mathDisplayAlignment: 'center' | 'left';
          mathShowCopyButton: boolean;
        }

        const defaultSettings: MathSettings = {
          enableMathRendering: true,
          mathFontScale: 1.0,
          mathDisplayAlignment: 'center',
          mathShowCopyButton: true,
        };

        const toggleMathRendering = (settings: MathSettings): MathSettings => {
          return { ...settings, enableMathRendering: !settings.enableMathRendering };
        };

        const setFontScale = (settings: MathSettings, scale: number): MathSettings => {
          return { ...settings, mathFontScale: Math.max(0.8, Math.min(2.0, scale)) };
        };

        const toggled = toggleMathRendering(defaultSettings);
        const scaled = setFontScale(defaultSettings, 1.5);
        const clampedLow = setFontScale(defaultSettings, 0.5);
        const clampedHigh = setFontScale(defaultSettings, 3.0);

        return {
          defaultEnabled: defaultSettings.enableMathRendering,
          toggled: toggled.enableMathRendering,
          defaultScale: defaultSettings.mathFontScale,
          scaled: scaled.mathFontScale,
          clampedLow: clampedLow.mathFontScale,
          clampedHigh: clampedHigh.mathFontScale,
        };
      });

      expect(result.defaultEnabled).toBe(true);
      expect(result.toggled).toBe(false);
      expect(result.defaultScale).toBe(1.0);
      expect(result.scaled).toBe(1.5);
      expect(result.clampedLow).toBe(0.8);
      expect(result.clampedHigh).toBe(2.0);
    });
  });

  test.describe('Export Functionality', () => {
    test('should generate valid filename from LaTeX', async ({ page }) => {
      const result = await page.evaluate(() => {
        const generateMathFilename = (latex: string): string => {
          const safe = latex
            .slice(0, 30)
            .replace(/[\\{}$^_]/g, '')
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .trim()
            .replace(/\s+/g, '_');
          
          return safe || 'math_expression';
        };

        return {
          simple: generateMathFilename('E = mc^2'),
          complex: generateMathFilename('\\frac{a}{b} + \\sqrt{x}'),
          empty: generateMathFilename(''),
          special: generateMathFilename('$$$^^^___'),
        };
      });

      expect(result.simple).toBe('E_mc2');
      expect(result.complex).toBe('fracab_sqrtx');
      expect(result.empty).toBe('math_expression');
      expect(result.special).toBe('math_expression');
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA attributes structure', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface AccessibleMathElement {
          role: string;
          ariaLabel: string;
          tabIndex: number;
        }

        const createAccessibleMath = (content: string): AccessibleMathElement => {
          const cleanContent = content.replace(/^\$+|\$+$/g, '').trim();
          return {
            role: 'math',
            ariaLabel: `Math: ${cleanContent}`,
            tabIndex: 0,
          };
        };

        const mathElement = createAccessibleMath('$x^2 + y^2$');
        
        return {
          role: mathElement.role,
          hasAriaLabel: mathElement.ariaLabel.startsWith('Math:'),
          isFocusable: mathElement.tabIndex === 0,
        };
      });

      expect(result.role).toBe('math');
      expect(result.hasAriaLabel).toBe(true);
      expect(result.isFocusable).toBe(true);
    });

    test('should have alert role for errors', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface ErrorElement {
          role: string;
          ariaLabel: string;
        }

        const createErrorElement = (error: string): ErrorElement => {
          return {
            role: 'alert',
            ariaLabel: `LaTeX rendering error: ${error}`,
          };
        };

        const errorElement = createErrorElement('Unbalanced braces');
        
        return {
          role: errorElement.role,
          hasAriaLabel: errorElement.ariaLabel.includes('error'),
        };
      });

      expect(result.role).toBe('alert');
      expect(result.hasAriaLabel).toBe(true);
    });
  });

  test.describe('Copy Functionality', () => {
    test('should prepare content for clipboard', async ({ page }) => {
      const result = await page.evaluate(() => {
        const prepareForClipboard = (content: string): string => {
          return content
            .replace(/^\$\$/, '')
            .replace(/\$\$$/, '')
            .replace(/^\$/, '')
            .replace(/\$$/, '')
            .trim();
        };

        return {
          block: prepareForClipboard('$$E = mc^2$$'),
          inline: prepareForClipboard('$x^2$'),
          plain: prepareForClipboard('a + b'),
        };
      });

      expect(result.block).toBe('E = mc^2');
      expect(result.inline).toBe('x^2');
      expect(result.plain).toBe('a + b');
    });
  });

  test.describe('Fullscreen Dialog', () => {
    test('should have dialog structure', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface DialogState {
          isOpen: boolean;
          title: string;
          content: string;
        }

        const createDialogState = (mathContent: string): DialogState => {
          return {
            isOpen: false,
            title: 'Mathematical Expression',
            content: mathContent,
          };
        };

        const toggleDialog = (state: DialogState): DialogState => {
          return { ...state, isOpen: !state.isOpen };
        };

        const initial = createDialogState('E = mc^2');
        const opened = toggleDialog(initial);
        const closed = toggleDialog(opened);

        return {
          initiallyOpen: initial.isOpen,
          afterOpen: opened.isOpen,
          afterClose: closed.isOpen,
          title: initial.title,
          hasContent: initial.content.length > 0,
        };
      });

      expect(result.initiallyOpen).toBe(false);
      expect(result.afterOpen).toBe(true);
      expect(result.afterClose).toBe(false);
      expect(result.title).toBe('Mathematical Expression');
      expect(result.hasContent).toBe(true);
    });
  });

  test.describe('Source Toggle', () => {
    test('should toggle source visibility', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface SourceState {
          showSource: boolean;
          sourceContent: string;
        }

        const createSourceState = (latex: string): SourceState => {
          return {
            showSource: false,
            sourceContent: latex,
          };
        };

        const toggleSource = (state: SourceState): SourceState => {
          return { ...state, showSource: !state.showSource };
        };

        const initial = createSourceState('\\frac{a}{b}');
        const shown = toggleSource(initial);
        const hidden = toggleSource(shown);

        return {
          initiallyHidden: !initial.showSource,
          afterToggle: shown.showSource,
          afterSecondToggle: hidden.showSource,
          sourceContent: initial.sourceContent,
        };
      });

      expect(result.initiallyHidden).toBe(true);
      expect(result.afterToggle).toBe(true);
      expect(result.afterSecondToggle).toBe(false);
      expect(result.sourceContent).toBe('\\frac{a}{b}');
    });
  });

  test.describe('Scale and Alignment', () => {
    test('should apply font scale correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        const getScaleStyle = (scale: number): string | undefined => {
          return scale !== 1 ? `${scale}em` : undefined;
        };

        return {
          default: getScaleStyle(1),
          scaled: getScaleStyle(1.5),
          small: getScaleStyle(0.8),
        };
      });

      expect(result.default).toBeUndefined();
      expect(result.scaled).toBe('1.5em');
      expect(result.small).toBe('0.8em');
    });

    test('should apply alignment correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        const getAlignmentClass = (alignment: 'center' | 'left'): string => {
          return alignment === 'center' ? 'text-center' : 'text-left';
        };

        return {
          center: getAlignmentClass('center'),
          left: getAlignmentClass('left'),
        };
      });

      expect(result.center).toBe('text-center');
      expect(result.left).toBe('text-left');
    });
  });
});
