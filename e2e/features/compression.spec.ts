import { test, expect } from '@playwright/test';

/**
 * Compression E2E Tests
 * Tests message and context compression functionality
 */
test.describe('Message Compression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should compress long messages', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface CompressionResult {
        originalLength: number;
        compressedLength: number;
        compressionRatio: number;
        strategy: string;
      }

      const compressMessage = (
        content: string,
        maxLength: number,
        strategy: 'truncate' | 'summarize' | 'smart'
      ): CompressionResult => {
        const originalLength = content.length;

        let compressed = content;
        if (content.length > maxLength) {
          switch (strategy) {
            case 'truncate':
              compressed = content.slice(0, maxLength - 3) + '...';
              break;
            case 'summarize':
              // Simulate summarization by taking key sentences
              const sentences = content.split('. ');
              const keep = Math.ceil(sentences.length * 0.3);
              compressed = sentences.slice(0, keep).join('. ') + '.';
              break;
            case 'smart':
              // Keep beginning and end
              const halfLen = Math.floor((maxLength - 20) / 2);
              compressed = content.slice(0, halfLen) + '\n...[truncated]...\n' + content.slice(-halfLen);
              break;
          }
        }

        return {
          originalLength,
          compressedLength: compressed.length,
          compressionRatio: compressed.length / originalLength,
          strategy,
        };
      };

      const longContent = 'This is a test sentence. '.repeat(100);
      
      const truncateResult = compressMessage(longContent, 200, 'truncate');
      const summarizeResult = compressMessage(longContent, 200, 'summarize');
      const smartResult = compressMessage(longContent, 200, 'smart');

      return {
        originalLength: longContent.length,
        truncateLength: truncateResult.compressedLength,
        summarizeLength: summarizeResult.compressedLength,
        smartLength: smartResult.compressedLength,
        truncateRatio: truncateResult.compressionRatio,
      };
    });

    expect(result.truncateLength).toBeLessThanOrEqual(200);
    expect(result.truncateLength).toBeLessThan(result.originalLength);
    expect(result.truncateRatio).toBeLessThan(1);
  });

  test('should detect compressible content', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ContentAnalysis {
        hasRepetition: boolean;
        hasCodeBlocks: boolean;
        hasLongParagraphs: boolean;
        suggestedStrategy: 'none' | 'truncate' | 'summarize' | 'smart';
      }

      const analyzeContent = (content: string): ContentAnalysis => {
        // Check for repetition
        const words = content.toLowerCase().split(/\s+/);
        const wordFreq: Record<string, number> = {};
        words.forEach(w => {
          wordFreq[w] = (wordFreq[w] || 0) + 1;
        });
        const maxFreq = Math.max(...Object.values(wordFreq));
        const hasRepetition = maxFreq > words.length * 0.1;

        // Check for code blocks
        const hasCodeBlocks = /```[\s\S]*?```/.test(content);

        // Check for long paragraphs
        const paragraphs = content.split('\n\n');
        const hasLongParagraphs = paragraphs.some(p => p.length > 500);

        // Suggest strategy
        let suggestedStrategy: ContentAnalysis['suggestedStrategy'] = 'none';
        if (content.length > 2000) {
          if (hasCodeBlocks) {
            suggestedStrategy = 'smart';
          } else if (hasRepetition) {
            suggestedStrategy = 'summarize';
          } else {
            suggestedStrategy = 'truncate';
          }
        }

        return {
          hasRepetition,
          hasCodeBlocks,
          hasLongParagraphs,
          suggestedStrategy,
        };
      };

      const repetitiveContent = 'Hello world. '.repeat(100);
      const codeContent = '# Intro\n\n```javascript\nconst x = 1;\n```\n\n' + 'More text. '.repeat(100);
      const normalContent = 'This is normal content with varied vocabulary and structure.';

      return {
        repetitive: analyzeContent(repetitiveContent),
        code: analyzeContent(codeContent),
        normal: analyzeContent(normalContent),
      };
    });

    expect(result.repetitive.hasRepetition).toBe(true);
    expect(result.repetitive.suggestedStrategy).toBe('summarize');
    expect(result.code.hasCodeBlocks).toBe(true);
    expect(result.code.suggestedStrategy).toBe('smart');
    expect(result.normal.suggestedStrategy).toBe('none');
  });

  test('should preserve important content during compression', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface PreservationRule {
        pattern: RegExp;
        priority: number;
        type: string;
      }

      const PRESERVATION_RULES: PreservationRule[] = [
        { pattern: /```[\s\S]*?```/g, priority: 1, type: 'code' },
        { pattern: /\*\*[^*]+\*\*/g, priority: 2, type: 'bold' },
        { pattern: /\[[^\]]+\]\([^)]+\)/g, priority: 3, type: 'link' },
        { pattern: /^#+\s+.+$/gm, priority: 4, type: 'heading' },
      ];

      const extractPreservableContent = (content: string): { type: string; content: string }[] => {
        const preserved: { type: string; content: string; priority: number }[] = [];

        for (const rule of PRESERVATION_RULES) {
          const matches = content.match(rule.pattern) || [];
          matches.forEach(match => {
            preserved.push({
              type: rule.type,
              content: match,
              priority: rule.priority,
            });
          });
        }

        return preserved.sort((a, b) => a.priority - b.priority);
      };

      const testContent = `# Important Heading

This is some text with **bold content** and more text.

\`\`\`javascript
const important = true;
\`\`\`

Check out [this link](https://example.com) for more info.
`;

      const preserved = extractPreservableContent(testContent);

      return {
        preservedCount: preserved.length,
        hasCode: preserved.some(p => p.type === 'code'),
        hasBold: preserved.some(p => p.type === 'bold'),
        hasLink: preserved.some(p => p.type === 'link'),
        hasHeading: preserved.some(p => p.type === 'heading'),
        firstType: preserved[0]?.type,
      };
    });

    expect(result.preservedCount).toBeGreaterThan(0);
    expect(result.hasCode).toBe(true);
    expect(result.hasBold).toBe(true);
    expect(result.hasLink).toBe(true);
    expect(result.hasHeading).toBe(true);
    expect(result.firstType).toBe('code');
  });
});

test.describe('Context Compression', () => {
  test('should compress conversation context', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface Message {
        role: 'user' | 'assistant';
        content: string;
        timestamp: number;
      }

      interface CompressedContext {
        summary: string;
        keyPoints: string[];
        preservedMessages: Message[];
        originalCount: number;
        compressedCount: number;
      }

      const compressContext = (
        messages: Message[],
        maxMessages: number
      ): CompressedContext => {
        if (messages.length <= maxMessages) {
          return {
            summary: '',
            keyPoints: [],
            preservedMessages: messages,
            originalCount: messages.length,
            compressedCount: messages.length,
          };
        }

        // Keep first and last N messages
        const keepCount = Math.floor(maxMessages / 2);
        const firstMessages = messages.slice(0, keepCount);
        const lastMessages = messages.slice(-keepCount);

        // Generate summary of middle messages
        const middleMessages = messages.slice(keepCount, -keepCount);
        const keyPoints = middleMessages
          .filter(m => m.role === 'user')
          .map(m => m.content.slice(0, 50) + '...');

        return {
          summary: `Compressed ${middleMessages.length} messages`,
          keyPoints: keyPoints.slice(0, 5),
          preservedMessages: [...firstMessages, ...lastMessages],
          originalCount: messages.length,
          compressedCount: keepCount * 2,
        };
      };

      const messages: Message[] = Array.from({ length: 20 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i + 1} content here.`,
        timestamp: Date.now() + i * 1000,
      }));

      const compressed = compressContext(messages, 6);

      return {
        originalCount: compressed.originalCount,
        compressedCount: compressed.compressedCount,
        keyPointsCount: compressed.keyPoints.length,
        hasSummary: compressed.summary.length > 0,
        preservedFirst: compressed.preservedMessages[0]?.content,
        preservedLast: compressed.preservedMessages[compressed.preservedMessages.length - 1]?.content,
      };
    });

    expect(result.originalCount).toBe(20);
    expect(result.compressedCount).toBe(6);
    expect(result.hasSummary).toBe(true);
    expect(result.preservedFirst).toContain('Message 1');
    expect(result.preservedLast).toContain('Message 20');
  });

  test('should estimate compression savings', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface CompressionStats {
        originalTokens: number;
        compressedTokens: number;
        savedTokens: number;
        savingsPercent: number;
        costSaved: number;
      }

      const estimateTokens = (text: string): number => {
        return Math.ceil(text.length / 4);
      };

      const calculateSavings = (
        originalContent: string,
        compressedContent: string,
        costPerToken = 0.00001
      ): CompressionStats => {
        const originalTokens = estimateTokens(originalContent);
        const compressedTokens = estimateTokens(compressedContent);
        const savedTokens = originalTokens - compressedTokens;
        const savingsPercent = (savedTokens / originalTokens) * 100;
        const costSaved = savedTokens * costPerToken;

        return {
          originalTokens,
          compressedTokens,
          savedTokens,
          savingsPercent,
          costSaved,
        };
      };

      const original = 'A'.repeat(10000);
      const compressed = 'A'.repeat(3000);

      const stats = calculateSavings(original, compressed);

      return {
        originalTokens: stats.originalTokens,
        compressedTokens: stats.compressedTokens,
        savedTokens: stats.savedTokens,
        savingsPercent: stats.savingsPercent,
        hasCostSaved: stats.costSaved > 0,
      };
    });

    expect(result.savedTokens).toBe(1750);
    expect(result.savingsPercent).toBe(70);
    expect(result.hasCostSaved).toBe(true);
  });
});

test.describe('Compression Settings', () => {
  test('should manage compression preferences', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface CompressionSettings {
        enabled: boolean;
        autoCompress: boolean;
        threshold: number;
        strategy: 'truncate' | 'summarize' | 'smart';
        preserveCode: boolean;
        preserveLinks: boolean;
        maxContextMessages: number;
      }

      const defaultSettings: CompressionSettings = {
        enabled: true,
        autoCompress: true,
        threshold: 4000,
        strategy: 'smart',
        preserveCode: true,
        preserveLinks: true,
        maxContextMessages: 20,
      };

      let settings = { ...defaultSettings };

      const updateSettings = (updates: Partial<CompressionSettings>) => {
        settings = { ...settings, ...updates };
      };

      const shouldCompress = (tokenCount: number): boolean => {
        return settings.enabled && settings.autoCompress && tokenCount > settings.threshold;
      };

      // Test default settings
      const shouldCompress3000 = shouldCompress(3000);
      const shouldCompress5000 = shouldCompress(5000);

      // Update settings
      updateSettings({ threshold: 2000 });
      const shouldCompress3000After = shouldCompress(3000);

      // Disable compression
      updateSettings({ enabled: false });
      const shouldCompress5000Disabled = shouldCompress(5000);

      return {
        shouldCompress3000,
        shouldCompress5000,
        shouldCompress3000After,
        shouldCompress5000Disabled,
        defaultStrategy: defaultSettings.strategy,
        preserveCode: defaultSettings.preserveCode,
      };
    });

    expect(result.shouldCompress3000).toBe(false);
    expect(result.shouldCompress5000).toBe(true);
    expect(result.shouldCompress3000After).toBe(true);
    expect(result.shouldCompress5000Disabled).toBe(false);
    expect(result.defaultStrategy).toBe('smart');
    expect(result.preserveCode).toBe(true);
  });
});
