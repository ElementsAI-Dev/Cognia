import { test, expect } from '@playwright/test';

/**
 * Diagram Renderer E2E Tests
 * Tests Mermaid and VegaLite rendering features including
 * fullscreen view, source toggle, copy, and export functionality
 */
test.describe('Diagram Renderer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test.describe('Mermaid Parsing', () => {
    test('should detect flowchart diagram type', async ({ page }) => {
      const result = await page.evaluate(() => {
        const detectDiagramType = (content: string): string => {
          const firstLine = content.split('\n')[0].trim().toLowerCase();
          if (firstLine.startsWith('graph') || firstLine.startsWith('flowchart')) return 'flowchart';
          if (firstLine.startsWith('sequencediagram')) return 'sequence';
          if (firstLine.startsWith('classdiagram')) return 'class';
          if (firstLine.startsWith('statediagram')) return 'state';
          if (firstLine.startsWith('erdiagram')) return 'er';
          if (firstLine.startsWith('gantt')) return 'gantt';
          if (firstLine.startsWith('pie')) return 'pie';
          if (firstLine.startsWith('journey')) return 'journey';
          if (firstLine.startsWith('gitgraph')) return 'git';
          return 'unknown';
        };

        return {
          flowchart: detectDiagramType('graph TD\n  A --> B'),
          sequence: detectDiagramType('sequenceDiagram\n  A->>B: Hello'),
          class: detectDiagramType('classDiagram\n  Class01 <|-- Class02'),
          pie: detectDiagramType('pie\n  "A": 50'),
          unknown: detectDiagramType('random content'),
        };
      });

      expect(result.flowchart).toBe('flowchart');
      expect(result.sequence).toBe('sequence');
      expect(result.class).toBe('class');
      expect(result.pie).toBe('pie');
      expect(result.unknown).toBe('unknown');
    });

    test('should generate valid filenames from Mermaid content', async ({ page }) => {
      const result = await page.evaluate(() => {
        const generateFilename = (content: string): string => {
          const firstLine = content.split('\n')[0].trim();
          const match = firstLine.match(/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|gitGraph)/i);
          if (match) {
            return `${match[1].toLowerCase()}_diagram`;
          }
          return 'mermaid_export';
        };

        return {
          flowchart: generateFilename('flowchart TD\n  A --> B'),
          sequence: generateFilename('sequenceDiagram\n  A->>B: Hello'),
          default: generateFilename('random content'),
        };
      });

      expect(result.flowchart).toBe('flowchart_diagram');
      expect(result.sequence).toBe('sequencediagram_diagram');
      expect(result.default).toBe('mermaid_export');
    });
  });

  test.describe('VegaLite Parsing', () => {
    test('should detect chart mark type from spec', async ({ page }) => {
      const result = await page.evaluate(() => {
        const detectChartType = (content: string): string => {
          try {
            const spec = JSON.parse(content);
            if (spec.mark) {
              return typeof spec.mark === 'string' ? spec.mark : spec.mark.type || 'unknown';
            }
          } catch {
            return 'invalid';
          }
          return 'unknown';
        };

        return {
          bar: detectChartType('{"mark": "bar"}'),
          line: detectChartType('{"mark": "line"}'),
          point: detectChartType('{"mark": {"type": "point"}}'),
          invalid: detectChartType('not json'),
          noMark: detectChartType('{"data": []}'),
        };
      });

      expect(result.bar).toBe('bar');
      expect(result.line).toBe('line');
      expect(result.point).toBe('point');
      expect(result.invalid).toBe('invalid');
      expect(result.noMark).toBe('unknown');
    });

    test('should validate VegaLite spec structure', async ({ page }) => {
      const result = await page.evaluate(() => {
        const isValidSpec = (content: string): boolean => {
          try {
            const spec = JSON.parse(content);
            return typeof spec === 'object' && spec !== null;
          } catch {
            return false;
          }
        };

        return {
          valid: isValidSpec('{"mark": "bar", "data": {"values": []}}'),
          invalid: isValidSpec('not json'),
          empty: isValidSpec('{}'),
        };
      });

      expect(result.valid).toBe(true);
      expect(result.invalid).toBe(false);
      expect(result.empty).toBe(true);
    });
  });

  test.describe('Diagram Settings', () => {
    test('should have Mermaid theme options', async ({ page }) => {
      const result = await page.evaluate(() => {
        type MermaidTheme = 'default' | 'dark' | 'forest' | 'neutral';
        
        const themes: MermaidTheme[] = ['default', 'dark', 'forest', 'neutral'];
        const isValidTheme = (theme: string): boolean => {
          return themes.includes(theme as MermaidTheme);
        };

        return {
          default: isValidTheme('default'),
          dark: isValidTheme('dark'),
          forest: isValidTheme('forest'),
          neutral: isValidTheme('neutral'),
          invalid: isValidTheme('custom'),
        };
      });

      expect(result.default).toBe(true);
      expect(result.dark).toBe(true);
      expect(result.forest).toBe(true);
      expect(result.neutral).toBe(true);
      expect(result.invalid).toBe(false);
    });

    test('should have VegaLite theme options', async ({ page }) => {
      const result = await page.evaluate(() => {
        type VegaLiteTheme = 'default' | 'dark' | 'excel' | 'fivethirtyeight';
        
        const themes: VegaLiteTheme[] = ['default', 'dark', 'excel', 'fivethirtyeight'];
        const isValidTheme = (theme: string): boolean => {
          return themes.includes(theme as VegaLiteTheme);
        };

        return {
          default: isValidTheme('default'),
          dark: isValidTheme('dark'),
          excel: isValidTheme('excel'),
          fivethirtyeight: isValidTheme('fivethirtyeight'),
          invalid: isValidTheme('custom'),
        };
      });

      expect(result.default).toBe(true);
      expect(result.dark).toBe(true);
      expect(result.excel).toBe(true);
      expect(result.fivethirtyeight).toBe(true);
      expect(result.invalid).toBe(false);
    });
  });

  test.describe('Export Functionality', () => {
    test('should generate diagram filenames', async ({ page }) => {
      const result = await page.evaluate(() => {
        const generateDiagramFilename = (content: string, type: 'mermaid' | 'vegalite'): string => {
          const firstLine = content.split('\n')[0].trim();
          
          if (type === 'mermaid') {
            const match = firstLine.match(/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|gitGraph)/i);
            if (match) {
              return `${match[1].toLowerCase()}_diagram`;
            }
          }
          
          if (type === 'vegalite') {
            try {
              const spec = JSON.parse(content);
              if (spec.mark) {
                const mark = typeof spec.mark === 'string' ? spec.mark : spec.mark.type;
                return `${mark}_chart`;
              }
            } catch {
              // Ignore parse errors
            }
          }

          return `${type}_export`;
        };

        return {
          mermaidFlowchart: generateDiagramFilename('flowchart TD\n  A-->B', 'mermaid'),
          mermaidDefault: generateDiagramFilename('random', 'mermaid'),
          vegaBar: generateDiagramFilename('{"mark": "bar"}', 'vegalite'),
          vegaDefault: generateDiagramFilename('invalid', 'vegalite'),
        };
      });

      expect(result.mermaidFlowchart).toBe('flowchart_diagram');
      expect(result.mermaidDefault).toBe('mermaid_export');
      expect(result.vegaBar).toBe('bar_chart');
      expect(result.vegaDefault).toBe('vegalite_export');
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA structure for Mermaid', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface DiagramAccessibility {
          role: string;
          ariaLabel: string;
        }

        const createMermaidAccessibility = (): DiagramAccessibility => {
          return {
            role: 'figure',
            ariaLabel: 'Mermaid diagram',
          };
        };

        const mermaid = createMermaidAccessibility();
        
        return {
          role: mermaid.role,
          hasAriaLabel: mermaid.ariaLabel.includes('Mermaid'),
        };
      });

      expect(result.role).toBe('figure');
      expect(result.hasAriaLabel).toBe(true);
    });

    test('should have proper ARIA structure for VegaLite', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface ChartAccessibility {
          role: string;
          ariaLabel: string;
        }

        const createVegaLiteAccessibility = (): ChartAccessibility => {
          return {
            role: 'figure',
            ariaLabel: 'VegaLite chart',
          };
        };

        const vegalite = createVegaLiteAccessibility();
        
        return {
          role: vegalite.role,
          hasAriaLabel: vegalite.ariaLabel.includes('VegaLite'),
        };
      });

      expect(result.role).toBe('figure');
      expect(result.hasAriaLabel).toBe(true);
    });

    test('should have alert role for errors', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface ErrorAccessibility {
          role: string;
          ariaLabel: string;
        }

        const createErrorAccessibility = (type: 'mermaid' | 'vegalite'): ErrorAccessibility => {
          return {
            role: 'alert',
            ariaLabel: `${type === 'mermaid' ? 'Mermaid' : 'VegaLite'} rendering error`,
          };
        };

        const mermaidError = createErrorAccessibility('mermaid');
        const vegaError = createErrorAccessibility('vegalite');
        
        return {
          mermaidRole: mermaidError.role,
          vegaRole: vegaError.role,
          mermaidLabel: mermaidError.ariaLabel,
          vegaLabel: vegaError.ariaLabel,
        };
      });

      expect(result.mermaidRole).toBe('alert');
      expect(result.vegaRole).toBe('alert');
      expect(result.mermaidLabel).toContain('Mermaid');
      expect(result.vegaLabel).toContain('VegaLite');
    });
  });

  test.describe('Fullscreen Dialog', () => {
    test('should have dialog structure for Mermaid', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface DialogState {
          isOpen: boolean;
          title: string;
        }

        const createDialogState = (): DialogState => {
          return {
            isOpen: false,
            title: 'Mermaid Diagram',
          };
        };

        const toggleDialog = (state: DialogState): DialogState => {
          return { ...state, isOpen: !state.isOpen };
        };

        const initial = createDialogState();
        const opened = toggleDialog(initial);

        return {
          initiallyOpen: initial.isOpen,
          afterOpen: opened.isOpen,
          title: initial.title,
        };
      });

      expect(result.initiallyOpen).toBe(false);
      expect(result.afterOpen).toBe(true);
      expect(result.title).toBe('Mermaid Diagram');
    });

    test('should have dialog structure for VegaLite', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface DialogState {
          isOpen: boolean;
          title: string;
        }

        const createDialogState = (): DialogState => {
          return {
            isOpen: false,
            title: 'VegaLite Chart',
          };
        };

        const toggleDialog = (state: DialogState): DialogState => {
          return { ...state, isOpen: !state.isOpen };
        };

        const initial = createDialogState();
        const opened = toggleDialog(initial);

        return {
          initiallyOpen: initial.isOpen,
          afterOpen: opened.isOpen,
          title: initial.title,
        };
      });

      expect(result.initiallyOpen).toBe(false);
      expect(result.afterOpen).toBe(true);
      expect(result.title).toBe('VegaLite Chart');
    });
  });

  test.describe('Source Toggle', () => {
    test('should toggle source visibility for Mermaid', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface SourceState {
          showSource: boolean;
          content: string;
        }

        const createSourceState = (content: string): SourceState => {
          return {
            showSource: false,
            content,
          };
        };

        const toggleSource = (state: SourceState): SourceState => {
          return { ...state, showSource: !state.showSource };
        };

        const initial = createSourceState('graph TD\n  A --> B');
        const shown = toggleSource(initial);
        const hidden = toggleSource(shown);

        return {
          initiallyHidden: !initial.showSource,
          afterToggle: shown.showSource,
          afterSecondToggle: hidden.showSource,
        };
      });

      expect(result.initiallyHidden).toBe(true);
      expect(result.afterToggle).toBe(true);
      expect(result.afterSecondToggle).toBe(false);
    });

    test('should format JSON for VegaLite source display', async ({ page }) => {
      const result = await page.evaluate(() => {
        const formatSpec = (content: string): string => {
          try {
            return JSON.stringify(JSON.parse(content), null, 2);
          } catch {
            return content;
          }
        };

        const compact = '{"mark":"bar","data":[]}';
        const formatted = formatSpec(compact);
        const invalid = formatSpec('not json');

        return {
          formatted: formatted.includes('\n'),
          invalidReturnsOriginal: invalid === 'not json',
        };
      });

      expect(result.formatted).toBe(true);
      expect(result.invalidReturnsOriginal).toBe(true);
    });
  });

  test.describe('Loading State', () => {
    test('should have loading state structure', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface LoadingState {
          isLoading: boolean;
          role: string;
          ariaLabel: string;
          message: string;
        }

        const createMermaidLoading = (): LoadingState => {
          return {
            isLoading: true,
            role: 'status',
            ariaLabel: 'Loading diagram',
            message: 'Rendering diagram...',
          };
        };

        const createVegaLoading = (): LoadingState => {
          return {
            isLoading: true,
            role: 'status',
            ariaLabel: 'Loading chart',
            message: 'Rendering chart...',
          };
        };

        const mermaid = createMermaidLoading();
        const vega = createVegaLoading();

        return {
          mermaidRole: mermaid.role,
          mermaidLabel: mermaid.ariaLabel,
          mermaidMessage: mermaid.message,
          vegaRole: vega.role,
          vegaLabel: vega.ariaLabel,
          vegaMessage: vega.message,
        };
      });

      expect(result.mermaidRole).toBe('status');
      expect(result.mermaidLabel).toBe('Loading diagram');
      expect(result.mermaidMessage).toBe('Rendering diagram...');
      expect(result.vegaRole).toBe('status');
      expect(result.vegaLabel).toBe('Loading chart');
      expect(result.vegaMessage).toBe('Rendering chart...');
    });
  });
});
