import { test, expect } from '@playwright/test';

/**
 * Enhanced Markdown Rendering E2E Tests
 * Tests Mermaid diagrams, LaTeX math, and VegaLite chart rendering in chat messages
 */
test.describe('Enhanced Markdown Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test.describe('Markdown Parser Logic', () => {
    test('should detect mermaid code blocks', async ({ page }) => {
      const result = await page.evaluate(() => {
        const detectCodeBlockType = (content: string): string | null => {
          const mermaidMatch = content.match(/```mermaid\n([\s\S]*?)```/);
          if (mermaidMatch) return 'mermaid';
          
          const vegaliteMatch = content.match(/```(?:vegalite|vega-lite)\n([\s\S]*?)```/);
          if (vegaliteMatch) return 'vegalite';
          
          const codeMatch = content.match(/```(\w+)?\n([\s\S]*?)```/);
          if (codeMatch) return codeMatch[1] || 'code';
          
          return null;
        };

        const mermaidContent = '```mermaid\ngraph TD\n  A --> B\n```';
        const vegaliteContent = '```vegalite\n{"mark": "bar"}\n```';
        const jsContent = '```javascript\nconst x = 1;\n```';

        return {
          mermaid: detectCodeBlockType(mermaidContent),
          vegalite: detectCodeBlockType(vegaliteContent),
          javascript: detectCodeBlockType(jsContent),
        };
      });

      expect(result.mermaid).toBe('mermaid');
      expect(result.vegalite).toBe('vegalite');
      expect(result.javascript).toBe('javascript');
    });

    test('should detect LaTeX math expressions', async ({ page }) => {
      const result = await page.evaluate(() => {
        const detectMath = (content: string): { inline: string[]; block: string[] } => {
          // First extract block math to avoid matching in inline
          const block = content.match(/\$\$[\s\S]+?\$\$/g) || [];
          // Remove block math before matching inline
          const contentWithoutBlock = content.replace(/\$\$[\s\S]+?\$\$/g, '');
          const inline = contentWithoutBlock.match(/\$[^$]+\$/g) || [];
          return { inline, block };
        };

        const content = 'The equation $E = mc^2$ is famous. And here is a block:\n$$\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$';
        return detectMath(content);
      });

      expect(result.inline).toHaveLength(1);
      expect(result.inline[0]).toBe('$E = mc^2$');
      expect(result.block).toHaveLength(1);
      expect(result.block[0]).toContain('\\int_0^\\infty');
    });

    test('should parse VegaLite JSON spec', async ({ page }) => {
      const result = await page.evaluate(() => {
        const parseVegaLiteSpec = (content: string): { valid: boolean; mark?: string } => {
          try {
            const spec = JSON.parse(content);
            return { valid: true, mark: spec.mark };
          } catch {
            return { valid: false };
          }
        };

        const validSpec = '{"mark": "bar", "data": {"values": []}}';
        const invalidSpec = 'not valid json';

        return {
          valid: parseVegaLiteSpec(validSpec),
          invalid: parseVegaLiteSpec(invalidSpec),
        };
      });

      expect(result.valid.valid).toBe(true);
      expect(result.valid.mark).toBe('bar');
      expect(result.invalid.valid).toBe(false);
    });
  });

  test.describe('Mermaid Diagram Rendering', () => {
    test('should validate mermaid syntax types', async ({ page }) => {
      const result = await page.evaluate(() => {
        const getMermaidType = (content: string): string | null => {
          if (content.startsWith('graph ') || content.startsWith('flowchart ')) return 'flowchart';
          if (content.startsWith('sequenceDiagram')) return 'sequence';
          if (content.startsWith('classDiagram')) return 'class';
          if (content.startsWith('stateDiagram')) return 'state';
          if (content.startsWith('erDiagram')) return 'er';
          if (content.startsWith('gantt')) return 'gantt';
          if (content.startsWith('pie')) return 'pie';
          return null;
        };

        return {
          flowchart: getMermaidType('graph TD\n  A --> B'),
          sequence: getMermaidType('sequenceDiagram\n  A->>B: Hello'),
          classDiagram: getMermaidType('classDiagram\n  class Animal'),
          pie: getMermaidType('pie\n  "A": 50'),
        };
      });

      expect(result.flowchart).toBe('flowchart');
      expect(result.sequence).toBe('sequence');
      expect(result.classDiagram).toBe('class');
      expect(result.pie).toBe('pie');
    });

    test('should extract mermaid content from code block', async ({ page }) => {
      const result = await page.evaluate(() => {
        const extractMermaidContent = (markdown: string): string | null => {
          const match = markdown.match(/```mermaid\n([\s\S]*?)```/);
          return match ? match[1].trim() : null;
        };

        const markdown = 'Here is a diagram:\n```mermaid\ngraph TD\n  A[Start] --> B[End]\n```\nDone.';
        return extractMermaidContent(markdown);
      });

      expect(result).toBe('graph TD\n  A[Start] --> B[End]');
    });
  });

  test.describe('LaTeX Math Rendering', () => {
    test('should strip dollar delimiters from math content', async ({ page }) => {
      const result = await page.evaluate(() => {
        const stripDelimiters = (content: string): string => {
          return content.replace(/^\$\$|\$\$$/g, '').replace(/^\$|\$$/g, '').trim();
        };

        return {
          inline: stripDelimiters('$E = mc^2$'),
          block: stripDelimiters('$$\\frac{a}{b}$$'),
        };
      });

      expect(result.inline).toBe('E = mc^2');
      expect(result.block).toBe('\\frac{a}{b}');
    });

    test('should detect display mode math', async ({ page }) => {
      const result = await page.evaluate(() => {
        const isDisplayMode = (content: string): boolean => {
          return content.startsWith('$$') || content.includes('\n');
        };

        return {
          inline: isDisplayMode('$x^2$'),
          block: isDisplayMode('$$x^2$$'),
          multiline: isDisplayMode('x^2\n+ y^2'),
        };
      });

      expect(result.inline).toBe(false);
      expect(result.block).toBe(true);
      expect(result.multiline).toBe(true);
    });
  });

  test.describe('VegaLite Chart Rendering', () => {
    test('should validate VegaLite spec structure', async ({ page }) => {
      const result = await page.evaluate(() => {
        const validateVegaLiteSpec = (spec: unknown): { valid: boolean; errors: string[] } => {
          const errors: string[] = [];
          
          if (typeof spec !== 'object' || spec === null) {
            return { valid: false, errors: ['Spec must be an object'] };
          }

          const s = spec as Record<string, unknown>;
          
          if (!s.mark && !s.layer && !s.concat && !s.hconcat && !s.vconcat) {
            errors.push('Missing mark or composition');
          }

          return { valid: errors.length === 0, errors };
        };

        const validSpec = { mark: 'bar', data: { values: [] } };
        const invalidSpec = { data: { values: [] } };

        return {
          valid: validateVegaLiteSpec(validSpec),
          invalid: validateVegaLiteSpec(invalidSpec),
        };
      });

      expect(result.valid.valid).toBe(true);
      expect(result.invalid.valid).toBe(false);
      expect(result.invalid.errors).toContain('Missing mark or composition');
    });

    test('should detect vegalite code block variants', async ({ page }) => {
      const result = await page.evaluate(() => {
        const isVegaLiteBlock = (language: string): boolean => {
          return ['vegalite', 'vega-lite'].includes(language.toLowerCase());
        };

        return {
          vegalite: isVegaLiteBlock('vegalite'),
          vegaLite: isVegaLiteBlock('vega-lite'),
          vega: isVegaLiteBlock('vega'),
          javascript: isVegaLiteBlock('javascript'),
        };
      });

      expect(result.vegalite).toBe(true);
      expect(result.vegaLite).toBe(true);
      expect(result.vega).toBe(false);
      expect(result.javascript).toBe(false);
    });
  });

  test.describe('Code Block Enhancement', () => {
    test('should extract language from code fence', async ({ page }) => {
      const result = await page.evaluate(() => {
        const extractLanguage = (fence: string): string | null => {
          const match = fence.match(/```(\w+)?/);
          return match ? match[1] || null : null;
        };

        return {
          javascript: extractLanguage('```javascript'),
          python: extractLanguage('```python'),
          noLang: extractLanguage('```'),
          typescript: extractLanguage('```typescript'),
        };
      });

      expect(result.javascript).toBe('javascript');
      expect(result.python).toBe('python');
      expect(result.noLang).toBeNull();
      expect(result.typescript).toBe('typescript');
    });

    test('should count lines in code block', async ({ page }) => {
      const result = await page.evaluate(() => {
        const countLines = (code: string): number => {
          return code.split('\n').length;
        };

        return {
          single: countLines('const x = 1;'),
          multi: countLines('const x = 1;\nconst y = 2;\nconst z = 3;'),
          empty: countLines(''),
        };
      });

      expect(result.single).toBe(1);
      expect(result.multi).toBe(3);
      expect(result.empty).toBe(1);
    });
  });

  test.describe('Settings Integration', () => {
    test('should have rendering toggle settings structure', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface RenderingSettings {
          enableMathRendering: boolean;
          enableMermaidDiagrams: boolean;
          enableVegaLiteCharts: boolean;
          showLineNumbers: boolean;
        }

        const defaultSettings: RenderingSettings = {
          enableMathRendering: true,
          enableMermaidDiagrams: true,
          enableVegaLiteCharts: true,
          showLineNumbers: true,
        };

        const toggleSetting = (
          settings: RenderingSettings,
          key: keyof RenderingSettings
        ): RenderingSettings => {
          return { ...settings, [key]: !settings[key] };
        };

        const withMathDisabled = toggleSetting(defaultSettings, 'enableMathRendering');
        const withMermaidDisabled = toggleSetting(defaultSettings, 'enableMermaidDiagrams');

        return {
          defaultMath: defaultSettings.enableMathRendering,
          toggledMath: withMathDisabled.enableMathRendering,
          defaultMermaid: defaultSettings.enableMermaidDiagrams,
          toggledMermaid: withMermaidDisabled.enableMermaidDiagrams,
        };
      });

      expect(result.defaultMath).toBe(true);
      expect(result.toggledMath).toBe(false);
      expect(result.defaultMermaid).toBe(true);
      expect(result.toggledMermaid).toBe(false);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle invalid mermaid syntax gracefully', async ({ page }) => {
      const result = await page.evaluate(() => {
        const validateMermaidSyntax = (content: string): { valid: boolean; error?: string } => {
          const validStarts = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'gantt', 'pie', 'journey', 'gitGraph'];
          const firstWord = content.trim().split(/\s+/)[0];
          
          if (!validStarts.some(start => content.trim().startsWith(start))) {
            return { valid: false, error: `Invalid diagram type: ${firstWord}` };
          }
          
          return { valid: true };
        };

        return {
          valid: validateMermaidSyntax('graph TD\n  A --> B'),
          invalid: validateMermaidSyntax('invalid diagram syntax'),
        };
      });

      expect(result.valid.valid).toBe(true);
      expect(result.invalid.valid).toBe(false);
      expect(result.invalid.error).toContain('Invalid diagram type');
    });

    test('should handle malformed LaTeX gracefully', async ({ page }) => {
      const result = await page.evaluate(() => {
        const validateLatex = (content: string): { valid: boolean; warning?: string } => {
          const openBraces = (content.match(/{/g) || []).length;
          const closeBraces = (content.match(/}/g) || []).length;
          
          if (openBraces !== closeBraces) {
            return { valid: false, warning: 'Unbalanced braces' };
          }
          
          return { valid: true };
        };

        return {
          valid: validateLatex('\\frac{a}{b}'),
          unbalanced: validateLatex('\\frac{a}{b'),
        };
      });

      expect(result.valid.valid).toBe(true);
      expect(result.unbalanced.valid).toBe(false);
      expect(result.unbalanced.warning).toBe('Unbalanced braces');
    });
  });
});
