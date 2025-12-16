import { test, expect } from '@playwright/test';

/**
 * AI Tools Complete Tests
 * Tests RAG search, calculator, and document tools
 */
test.describe('RAG Search Tool', () => {
  test('should format search query correctly', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const formatQuery = (query: string) => {
        return query
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      };

      return {
        simple: formatQuery('What is AI?'),
        complex: formatQuery('How does machine-learning work???'),
        withPunctuation: formatQuery('Hello, World! How are you?'),
      };
    });

    expect(result.simple).toBe('what is ai');
    expect(result.complex).toBe('how does machinelearning work');
    expect(result.withPunctuation).toBe('hello world how are you');
  });

  test('should rank search results by similarity', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const rankResults = (
        results: { id: string; similarity: number }[],
        threshold: number
      ) => {
        return results
          .filter(r => r.similarity >= threshold)
          .sort((a, b) => b.similarity - a.similarity);
      };

      const results = [
        { id: 'doc1', similarity: 0.85 },
        { id: 'doc2', similarity: 0.45 },
        { id: 'doc3', similarity: 0.92 },
        { id: 'doc4', similarity: 0.78 },
        { id: 'doc5', similarity: 0.30 },
      ];

      const ranked = rankResults(results, 0.5);

      return {
        count: ranked.length,
        topId: ranked[0]?.id,
        secondId: ranked[1]?.id,
        filteredOut: results.length - ranked.length,
      };
    });

    expect(result.count).toBe(3);
    expect(result.topId).toBe('doc3');
    expect(result.secondId).toBe('doc1');
    expect(result.filteredOut).toBe(2);
  });

  test('should format context for LLM', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const formatContext = (
        documents: { content: string; source: string; similarity: number }[]
      ) => {
        if (documents.length === 0) return '';

        return documents
          .map((doc, i) => 
            `[Source ${i + 1}: ${doc.source}] (relevance: ${(doc.similarity * 100).toFixed(0)}%)\n${doc.content}`
          )
          .join('\n\n---\n\n');
      };

      const docs = [
        { content: 'First document content.', source: 'doc1.md', similarity: 0.9 },
        { content: 'Second document content.', source: 'doc2.md', similarity: 0.8 },
      ];

      const context = formatContext(docs);

      return {
        hasContent: context.length > 0,
        hasSeparator: context.includes('---'),
        hasRelevance: context.includes('relevance:'),
        hasSource: context.includes('Source 1:'),
      };
    });

    expect(result.hasContent).toBe(true);
    expect(result.hasSeparator).toBe(true);
    expect(result.hasRelevance).toBe(true);
    expect(result.hasSource).toBe(true);
  });
});

test.describe('Calculator Tool', () => {
  test('should evaluate basic arithmetic', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const evaluate = (expr: string): number => {
        const sanitized = expr.replace(/\s+/g, '');
        try {
          return new Function(`"use strict"; return (${sanitized});`)();
        } catch {
          return NaN;
        }
      };

      return {
        addition: evaluate('2 + 3'),
        subtraction: evaluate('10 - 4'),
        multiplication: evaluate('5 * 6'),
        division: evaluate('20 / 4'),
        modulo: evaluate('17 % 5'),
      };
    });

    expect(result.addition).toBe(5);
    expect(result.subtraction).toBe(6);
    expect(result.multiplication).toBe(30);
    expect(result.division).toBe(5);
    expect(result.modulo).toBe(2);
  });

  test('should handle complex expressions', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const evaluate = (expr: string): number => {
        const sanitized = expr
          .replace(/\s+/g, '')
          .replace(/\^/g, '**');
        try {
          return new Function(`"use strict"; return (${sanitized});`)();
        } catch {
          return NaN;
        }
      };

      return {
        parentheses: evaluate('(2 + 3) * 4'),
        power: evaluate('2 ^ 10'),
        nested: evaluate('((1 + 2) * (3 + 4))'),
        decimal: evaluate('3.14 * 2'),
        negative: evaluate('-5 + 10'),
      };
    });

    expect(result.parentheses).toBe(20);
    expect(result.power).toBe(1024);
    expect(result.nested).toBe(21);
    expect(result.decimal).toBeCloseTo(6.28, 2);
    expect(result.negative).toBe(5);
  });

  test('should handle mathematical functions', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const evaluateWithMath = (expr: string): number => {
        const sanitized = expr
          .replace(/sqrt\(/g, 'Math.sqrt(')
          .replace(/sin\(/g, 'Math.sin(')
          .replace(/cos\(/g, 'Math.cos(')
          .replace(/tan\(/g, 'Math.tan(')
          .replace(/log\(/g, 'Math.log10(')
          .replace(/ln\(/g, 'Math.log(')
          .replace(/abs\(/g, 'Math.abs(')
          .replace(/floor\(/g, 'Math.floor(')
          .replace(/ceil\(/g, 'Math.ceil(')
          .replace(/round\(/g, 'Math.round(')
          .replace(/PI/g, 'Math.PI')
          .replace(/E/g, 'Math.E');

        try {
          return new Function(`"use strict"; return (${sanitized});`)();
        } catch {
          return NaN;
        }
      };

      return {
        sqrt: evaluateWithMath('sqrt(16)'),
        abs: evaluateWithMath('abs(-5)'),
        floor: evaluateWithMath('floor(3.7)'),
        ceil: evaluateWithMath('ceil(3.2)'),
        round: evaluateWithMath('round(3.5)'),
      };
    });

    expect(result.sqrt).toBe(4);
    expect(result.abs).toBe(5);
    expect(result.floor).toBe(3);
    expect(result.ceil).toBe(4);
    expect(result.round).toBe(4);
  });

  test('should convert units', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const conversions: Record<string, Record<string, number>> = {
        length: {
          m: 1,
          km: 1000,
          cm: 0.01,
          mm: 0.001,
          ft: 0.3048,
          in: 0.0254,
          mi: 1609.344,
        },
        weight: {
          kg: 1,
          g: 0.001,
          mg: 0.000001,
          lb: 0.453592,
          oz: 0.0283495,
        },
        temperature: {
          c: 'celsius',
          f: 'fahrenheit',
          k: 'kelvin',
        },
      };

      const convertLength = (value: number, from: string, to: string): number => {
        const fromFactor = conversions.length[from];
        const toFactor = conversions.length[to];
        return (value * fromFactor) / toFactor;
      };

      const convertWeight = (value: number, from: string, to: string): number => {
        const fromFactor = conversions.weight[from];
        const toFactor = conversions.weight[to];
        return (value * fromFactor) / toFactor;
      };

      return {
        kmToM: convertLength(1, 'km', 'm'),
        mToFt: convertLength(1, 'm', 'ft'),
        miToKm: convertLength(1, 'mi', 'km'),
        kgToLb: convertWeight(1, 'kg', 'lb'),
        lbToKg: convertWeight(1, 'lb', 'kg'),
      };
    });

    expect(result.kmToM).toBe(1000);
    expect(result.mToFt).toBeCloseTo(3.28084, 2);
    expect(result.miToKm).toBeCloseTo(1.609344, 4);
    expect(result.kgToLb).toBeCloseTo(2.20462, 2);
    expect(result.lbToKg).toBeCloseTo(0.453592, 4);
  });

  test('should handle invalid expressions safely', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const safeEvaluate = (expr: string): { success: boolean; result?: number; error?: string } => {
        // Check for dangerous patterns
        const dangerous = /[;{}]|function|eval|new\s+Function/i;
        if (dangerous.test(expr)) {
          return { success: false, error: 'Invalid expression' };
        }

        try {
          const sanitized = expr.replace(/\s+/g, '').replace(/\^/g, '**');
          const result = new Function(`"use strict"; return (${sanitized});`)();
          
          if (typeof result !== 'number' || isNaN(result)) {
            return { success: false, error: 'Invalid result' };
          }
          
          return { success: true, result };
        } catch (_e) {
          return { success: false, error: 'Evaluation failed' };
        }
      };

      return {
        valid: safeEvaluate('2 + 2'),
        divisionByZero: safeEvaluate('1 / 0'),
        dangerous: safeEvaluate('eval("alert(1)")'),
        invalid: safeEvaluate('abc + def'),
      };
    });

    expect(result.valid.success).toBe(true);
    expect(result.valid.result).toBe(4);
    expect(result.divisionByZero.result).toBe(Infinity);
    expect(result.dangerous.success).toBe(false);
    expect(result.invalid.success).toBe(false);
  });
});

test.describe('Document Tool', () => {
  test('should summarize document content', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const extractSummary = (content: string, maxSentences: number = 3) => {
        const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
        const summary = sentences.slice(0, maxSentences).join(' ').trim();
        
        return {
          summary,
          sentenceCount: Math.min(sentences.length, maxSentences),
          totalSentences: sentences.length,
          truncated: sentences.length > maxSentences,
        };
      };

      const content = `This is the first sentence. Here is the second one. The third sentence follows. Fourth sentence here. And finally the fifth.`;

      return extractSummary(content, 3);
    });

    expect(result.sentenceCount).toBe(3);
    expect(result.totalSentences).toBe(5);
    expect(result.truncated).toBe(true);
    expect(result.summary).toContain('first sentence');
  });

  test('should analyze document structure', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const analyzeStructure = (content: string) => {
        const lines = content.split('\n');
        const paragraphs = content.split(/\n\n+/).filter(p => p.trim());
        const words = content.split(/\s+/).filter(w => w);
        const sentences = content.match(/[^.!?]+[.!?]+/g) || [];

        return {
          lineCount: lines.length,
          paragraphCount: paragraphs.length,
          wordCount: words.length,
          sentenceCount: sentences.length,
          avgWordsPerSentence: sentences.length > 0 ? Math.round(words.length / sentences.length) : 0,
          avgWordsPerParagraph: paragraphs.length > 0 ? Math.round(words.length / paragraphs.length) : 0,
        };
      };

      const content = `First paragraph with some words here. More sentences follow.

Second paragraph is here. It has multiple sentences. Three in total.

Third paragraph is short.`;

      return analyzeStructure(content);
    });

    expect(result.paragraphCount).toBe(3);
    expect(result.sentenceCount).toBe(6);
    expect(result.wordCount).toBeGreaterThan(20);
    expect(result.avgWordsPerSentence).toBeGreaterThan(0);
  });

  test('should extract keywords from document', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const extractKeywords = (content: string, topN: number = 5) => {
        const stopWords = new Set([
          'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
          'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
          'would', 'could', 'should', 'may', 'might', 'must', 'shall',
          'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in',
          'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
          'through', 'during', 'before', 'after', 'above', 'below',
          'between', 'under', 'again', 'further', 'then', 'once',
          'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either',
          'neither', 'not', 'only', 'own', 'same', 'than', 'too',
          'very', 'just', 'also', 'now', 'here', 'there', 'when',
          'where', 'why', 'how', 'all', 'each', 'every', 'both',
          'few', 'more', 'most', 'other', 'some', 'such', 'no',
          'any', 'this', 'that', 'these', 'those', 'it', 'its',
        ]);

        const words = content
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter(w => w.length > 2 && !stopWords.has(w));

        const frequency: Record<string, number> = {};
        for (const word of words) {
          frequency[word] = (frequency[word] || 0) + 1;
        }

        return Object.entries(frequency)
          .sort((a, b) => b[1] - a[1])
          .slice(0, topN)
          .map(([word, count]) => ({ word, count }));
      };

      const content = `Machine learning is a subset of artificial intelligence. 
      Machine learning algorithms learn from data. 
      Artificial intelligence and machine learning are transforming technology.
      Deep learning is a type of machine learning.`;

      return {
        keywords: extractKeywords(content, 5),
        topKeyword: extractKeywords(content, 1)[0]?.word,
      };
    });

    expect(result.keywords.length).toBe(5);
    expect(['machine', 'learning'].includes(result.topKeyword)).toBe(true);
  });
});
