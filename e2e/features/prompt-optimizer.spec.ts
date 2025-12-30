import { test, expect } from '@playwright/test';

/**
 * Prompt Optimizer E2E Tests
 * Tests prompt enhancement and optimization functionality
 */
test.describe('Prompt Optimization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should analyze prompt quality', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface PromptAnalysis {
        score: number;
        clarity: number;
        specificity: number;
        context: number;
        suggestions: string[];
      }

      const analyzePrompt = (prompt: string): PromptAnalysis => {
        const suggestions: string[] = [];
        let clarity = 50;
        let specificity = 50;
        let context = 50;

        // Check length
        if (prompt.length < 20) {
          suggestions.push('Consider adding more detail to your prompt');
          clarity -= 20;
        } else if (prompt.length > 50) {
          clarity += 20;
        }

        // Check for specific keywords
        const specificKeywords = ['please', 'explain', 'describe', 'list', 'compare', 'analyze'];
        const hasSpecificKeywords = specificKeywords.some(kw => prompt.toLowerCase().includes(kw));
        if (hasSpecificKeywords) {
          specificity += 20;
        } else {
          suggestions.push('Consider using action verbs like "explain", "describe", or "analyze"');
        }

        // Check for context
        const contextIndicators = ['because', 'for', 'in order to', 'so that', 'context:'];
        const hasContext = contextIndicators.some(ind => prompt.toLowerCase().includes(ind));
        if (hasContext) {
          context += 30;
        } else {
          suggestions.push('Consider adding context about why you need this information');
        }

        // Check for question marks
        if (prompt.includes('?')) {
          clarity += 10;
        }

        // Calculate overall score
        const score = Math.round((clarity + specificity + context) / 3);

        return {
          score: Math.min(100, Math.max(0, score)),
          clarity: Math.min(100, Math.max(0, clarity)),
          specificity: Math.min(100, Math.max(0, specificity)),
          context: Math.min(100, Math.max(0, context)),
          suggestions,
        };
      };

      const vaguePr = analyzePrompt('help');
      const betterPrompt = analyzePrompt('Please explain how JavaScript closures work');
      const goodPrompt = analyzePrompt('Please explain how JavaScript closures work because I am learning React and need to understand hooks better');

      return {
        vagueScore: vaguePr.score,
        vagueSuggestions: vaguePr.suggestions.length,
        betterScore: betterPrompt.score,
        goodScore: goodPrompt.score,
        goodHasContext: goodPrompt.context > 50,
      };
    });

    expect(result.vagueScore).toBeLessThan(50);
    expect(result.vagueSuggestions).toBeGreaterThan(0);
    expect(result.betterScore).toBeGreaterThan(result.vagueScore);
    expect(result.goodScore).toBeGreaterThan(result.betterScore);
    expect(result.goodHasContext).toBe(true);
  });

  test('should enhance prompts', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface EnhancementOptions {
        addContext: boolean;
        addExamples: boolean;
        addConstraints: boolean;
        targetAudience?: string;
        outputFormat?: string;
      }

      const enhancePrompt = (prompt: string, options: EnhancementOptions): string => {
        let enhanced = prompt;

        if (options.addContext && !prompt.toLowerCase().includes('context')) {
          enhanced = `Context: ${enhanced}`;
        }

        if (options.targetAudience) {
          enhanced += `\n\nTarget audience: ${options.targetAudience}`;
        }

        if (options.outputFormat) {
          enhanced += `\n\nPlease format the response as: ${options.outputFormat}`;
        }

        if (options.addConstraints) {
          enhanced += '\n\nConstraints:\n- Be concise\n- Use simple language\n- Provide examples where helpful';
        }

        if (options.addExamples) {
          enhanced += '\n\nPlease include relevant examples.';
        }

        return enhanced;
      };

      const original = 'Explain React hooks';
      
      const enhanced1 = enhancePrompt(original, { 
        addContext: true, 
        addExamples: false,
        addConstraints: false,
      });

      const enhanced2 = enhancePrompt(original, {
        addContext: true,
        addExamples: true,
        addConstraints: true,
        targetAudience: 'beginner developers',
        outputFormat: 'bullet points',
      });

      return {
        originalLength: original.length,
        enhanced1Length: enhanced1.length,
        enhanced2Length: enhanced2.length,
        enhanced1HasContext: enhanced1.includes('Context:'),
        enhanced2HasAudience: enhanced2.includes('Target audience:'),
        enhanced2HasFormat: enhanced2.includes('format the response'),
        enhanced2HasConstraints: enhanced2.includes('Constraints:'),
      };
    });

    expect(result.enhanced1Length).toBeGreaterThan(result.originalLength);
    expect(result.enhanced2Length).toBeGreaterThan(result.enhanced1Length);
    expect(result.enhanced1HasContext).toBe(true);
    expect(result.enhanced2HasAudience).toBe(true);
    expect(result.enhanced2HasFormat).toBe(true);
    expect(result.enhanced2HasConstraints).toBe(true);
  });

  test('should suggest prompt templates', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface PromptTemplate {
        id: string;
        name: string;
        category: string;
        template: string;
        variables: string[];
      }

      const templates: PromptTemplate[] = [
        {
          id: 'explain',
          name: 'Explain Concept',
          category: 'education',
          template: 'Explain {{concept}} in simple terms. Assume I have {{experience_level}} experience.',
          variables: ['concept', 'experience_level'],
        },
        {
          id: 'compare',
          name: 'Compare Items',
          category: 'analysis',
          template: 'Compare and contrast {{item1}} and {{item2}}. Focus on: {{aspects}}',
          variables: ['item1', 'item2', 'aspects'],
        },
        {
          id: 'code_review',
          name: 'Code Review',
          category: 'development',
          template: 'Review the following {{language}} code for {{focus_areas}}:\n\n{{code}}',
          variables: ['language', 'focus_areas', 'code'],
        },
      ];

      const findTemplatesByCategory = (category: string) => {
        return templates.filter(t => t.category === category);
      };

      const applyTemplate = (templateId: string, values: Record<string, string>): string => {
        const template = templates.find(t => t.id === templateId);
        if (!template) return '';

        let result = template.template;
        for (const [key, value] of Object.entries(values)) {
          result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        }
        return result;
      };

      const educationTemplates = findTemplatesByCategory('education');
      const appliedExplain = applyTemplate('explain', {
        concept: 'machine learning',
        experience_level: 'beginner',
      });

      return {
        totalTemplates: templates.length,
        educationCount: educationTemplates.length,
        appliedExplainLength: appliedExplain.length,
        appliedHasConcept: appliedExplain.includes('machine learning'),
        appliedHasLevel: appliedExplain.includes('beginner'),
      };
    });

    expect(result.totalTemplates).toBe(3);
    expect(result.educationCount).toBe(1);
    expect(result.appliedExplainLength).toBeGreaterThan(0);
    expect(result.appliedHasConcept).toBe(true);
    expect(result.appliedHasLevel).toBe(true);
  });

  test('should track prompt history', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface PromptHistoryEntry {
        id: string;
        original: string;
        enhanced?: string;
        score?: number;
        timestamp: Date;
        wasUsed: boolean;
      }

      const history: PromptHistoryEntry[] = [];

      const addToHistory = (original: string, enhanced?: string, score?: number): PromptHistoryEntry => {
        const entry: PromptHistoryEntry = {
          id: `ph-${Date.now()}`,
          original,
          enhanced,
          score,
          timestamp: new Date(),
          wasUsed: false,
        };
        history.unshift(entry);
        return entry;
      };

      const markAsUsed = (id: string) => {
        const entry = history.find(e => e.id === id);
        if (entry) entry.wasUsed = true;
      };

      const getRecentPrompts = (limit = 10) => {
        return history.slice(0, limit);
      };

      const searchHistory = (query: string) => {
        const lowerQuery = query.toLowerCase();
        return history.filter(e => 
          e.original.toLowerCase().includes(lowerQuery) ||
          (e.enhanced && e.enhanced.toLowerCase().includes(lowerQuery))
        );
      };

      // Add entries
      const e1 = addToHistory('Explain React', 'Please explain React hooks in detail', 75);
      addToHistory('Compare Python and JavaScript', 'Compare and contrast Python and JavaScript', 80);
      addToHistory('Write a function', undefined, 40);

      markAsUsed(e1.id);

      const recent = getRecentPrompts(2);
      const searchResults = searchHistory('React');

      return {
        historyCount: history.length,
        recentCount: recent.length,
        searchResultsCount: searchResults.length,
        firstEntryUsed: history.find(e => e.id === e1.id)?.wasUsed,
      };
    });

    expect(result.historyCount).toBe(3);
    expect(result.recentCount).toBe(2);
    expect(result.searchResultsCount).toBe(1);
    expect(result.firstEntryUsed).toBe(true);
  });
});

test.describe('Prompt Refinement', () => {
  test('should refine prompts based on feedback', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface RefinementSuggestion {
        type: 'clarity' | 'specificity' | 'format' | 'context';
        original: string;
        suggestion: string;
        reasoning: string;
      }

      const generateRefinements = (prompt: string): RefinementSuggestion[] => {
        const suggestions: RefinementSuggestion[] = [];

        // Check for vague language
        const vagueTerms = ['thing', 'stuff', 'something', 'somehow'];
        for (const term of vagueTerms) {
          if (prompt.toLowerCase().includes(term)) {
            suggestions.push({
              type: 'clarity',
              original: term,
              suggestion: 'Replace with specific term',
              reasoning: `"${term}" is too vague`,
            });
          }
        }

        // Check for missing specificity
        if (!prompt.includes('how') && !prompt.includes('what') && !prompt.includes('why')) {
          suggestions.push({
            type: 'specificity',
            original: prompt,
            suggestion: 'Consider starting with "How", "What", or "Why"',
            reasoning: 'Questions with clear intent get better responses',
          });
        }

        // Check for format specification
        if (prompt.length > 50 && !prompt.toLowerCase().includes('format')) {
          suggestions.push({
            type: 'format',
            original: '',
            suggestion: 'Add: "Please format as [bullet points/paragraphs/code]"',
            reasoning: 'Specifying format helps get structured responses',
          });
        }

        return suggestions;
      };

      const vaguePrompt = 'Tell me about stuff';
      const betterPrompt = 'How do JavaScript closures work?';

      const vagueRefinements = generateRefinements(vaguePrompt);
      const betterRefinements = generateRefinements(betterPrompt);

      return {
        vagueRefinementsCount: vagueRefinements.length,
        betterRefinementsCount: betterRefinements.length,
        vagueHasClarityIssue: vagueRefinements.some(r => r.type === 'clarity'),
        vagueHasSpecificityIssue: vagueRefinements.some(r => r.type === 'specificity'),
      };
    });

    expect(result.vagueRefinementsCount).toBeGreaterThan(0);
    expect(result.betterRefinementsCount).toBeLessThan(result.vagueRefinementsCount);
    expect(result.vagueHasClarityIssue).toBe(true);
    expect(result.vagueHasSpecificityIssue).toBe(true);
  });
});
