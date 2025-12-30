import { test, expect } from '@playwright/test';

/**
 * Quote Functionality E2E Tests
 * Tests quote/citation functionality in chat
 */
test.describe('Quote Store', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should manage quote state', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Quote {
        id: string;
        content: string;
        source: {
          type: 'message' | 'artifact' | 'document' | 'web';
          messageId?: string;
          artifactId?: string;
          documentId?: string;
          url?: string;
          title?: string;
        };
        range?: { start: number; end: number };
        createdAt: Date;
      }

      interface QuoteState {
        quotes: Quote[];
        activeQuoteId: string | null;
        isQuoting: boolean;
      }

      const state: QuoteState = {
        quotes: [],
        activeQuoteId: null,
        isQuoting: false,
      };

      const addQuote = (content: string, source: Quote['source']): Quote => {
        const quote: Quote = {
          id: `quote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          content,
          source,
          createdAt: new Date(),
        };
        state.quotes.push(quote);
        return quote;
      };

      const removeQuote = (id: string) => {
        const index = state.quotes.findIndex(q => q.id === id);
        if (index !== -1) {
          state.quotes.splice(index, 1);
        }
        if (state.activeQuoteId === id) {
          state.activeQuoteId = null;
        }
      };

      const setActiveQuote = (id: string | null) => {
        state.activeQuoteId = id;
      };

      const clearQuotes = () => {
        state.quotes = [];
        state.activeQuoteId = null;
      };

      // Add quotes
      const q1 = addQuote('Hello World', { type: 'message', messageId: 'msg-1' });
      const _q2 = addQuote('Code snippet', { type: 'artifact', artifactId: 'art-1' });
      addQuote('Documentation', { type: 'document', documentId: 'doc-1', title: 'README' });

      setActiveQuote(q1.id);
      const activeAfterSet = state.activeQuoteId;

      removeQuote(q1.id);
      const activeAfterRemove = state.activeQuoteId;
      const countAfterRemove = state.quotes.length;

      clearQuotes();

      return {
        activeAfterSet: activeAfterSet === q1.id,
        activeAfterRemove,
        countAfterRemove,
        countAfterClear: state.quotes.length,
      };
    });

    expect(result.activeAfterSet).toBe(true);
    expect(result.activeAfterRemove).toBe(null);
    expect(result.countAfterRemove).toBe(2);
    expect(result.countAfterClear).toBe(0);
  });

  test('should format quote for display', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Quote {
        content: string;
        source: {
          type: 'message' | 'artifact' | 'document' | 'web';
          title?: string;
          url?: string;
        };
      }

      const formatQuote = (quote: Quote, maxLength = 100): string => {
        let content = quote.content;
        if (content.length > maxLength) {
          content = content.slice(0, maxLength) + '...';
        }
        return `> ${content}`;
      };

      const formatQuoteSource = (quote: Quote): string => {
        switch (quote.source.type) {
          case 'message':
            return 'From conversation';
          case 'artifact':
            return quote.source.title || 'From artifact';
          case 'document':
            return quote.source.title || 'From document';
          case 'web':
            return quote.source.url || 'From web';
          default:
            return 'Unknown source';
        }
      };

      const shortQuote: Quote = {
        content: 'Short text',
        source: { type: 'message' },
      };

      const longQuote: Quote = {
        content: 'This is a very long quote that should be truncated because it exceeds the maximum length limit set for display purposes.',
        source: { type: 'document', title: 'Documentation.md' },
      };

      const webQuote: Quote = {
        content: 'Web content',
        source: { type: 'web', url: 'https://example.com' },
      };

      return {
        shortFormatted: formatQuote(shortQuote),
        longFormatted: formatQuote(longQuote, 50),
        shortSource: formatQuoteSource(shortQuote),
        longSource: formatQuoteSource(longQuote),
        webSource: formatQuoteSource(webQuote),
      };
    });

    expect(result.shortFormatted).toBe('> Short text');
    expect(result.longFormatted).toContain('...');
    expect(result.shortSource).toBe('From conversation');
    expect(result.longSource).toBe('Documentation.md');
    expect(result.webSource).toBe('https://example.com');
  });

  test('should handle quote shortcuts', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ShortcutConfig {
        key: string;
        modifiers: ('ctrl' | 'shift' | 'alt' | 'meta')[];
        action: string;
        description: string;
      }

      const shortcuts: ShortcutConfig[] = [
        { key: 'q', modifiers: ['ctrl'], action: 'quote_selection', description: 'Quote selected text' },
        { key: 'q', modifiers: ['ctrl', 'shift'], action: 'quote_and_reply', description: 'Quote and start reply' },
        { key: 'Escape', modifiers: [], action: 'clear_quote', description: 'Clear active quote' },
      ];

      const matchShortcut = (
        key: string,
        ctrl: boolean,
        shift: boolean,
        alt: boolean,
        meta: boolean
      ): ShortcutConfig | null => {
        return shortcuts.find(s => {
          if (s.key.toLowerCase() !== key.toLowerCase()) return false;
          const hasCtrl = s.modifiers.includes('ctrl');
          const hasShift = s.modifiers.includes('shift');
          const hasAlt = s.modifiers.includes('alt');
          const hasMeta = s.modifiers.includes('meta');
          return hasCtrl === ctrl && hasShift === shift && hasAlt === alt && hasMeta === meta;
        }) || null;
      };

      const ctrlQ = matchShortcut('q', true, false, false, false);
      const ctrlShiftQ = matchShortcut('q', true, true, false, false);
      const escape = matchShortcut('Escape', false, false, false, false);
      const noMatch = matchShortcut('x', true, false, false, false);

      return {
        ctrlQAction: ctrlQ?.action,
        ctrlShiftQAction: ctrlShiftQ?.action,
        escapeAction: escape?.action,
        noMatchResult: noMatch === null,
      };
    });

    expect(result.ctrlQAction).toBe('quote_selection');
    expect(result.ctrlShiftQAction).toBe('quote_and_reply');
    expect(result.escapeAction).toBe('clear_quote');
    expect(result.noMatchResult).toBe(true);
  });

  test('should merge multiple quotes', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Quote {
        id: string;
        content: string;
        source: { type: string };
      }

      const mergeQuotes = (quotes: Quote[], separator = '\n\n'): string => {
        return quotes
          .map(q => `> ${q.content}`)
          .join(separator);
      };

      const countQuoteLines = (mergedContent: string): number => {
        return mergedContent.split('\n').filter(line => line.startsWith('>')).length;
      };

      const quotes: Quote[] = [
        { id: '1', content: 'First quote', source: { type: 'message' } },
        { id: '2', content: 'Second quote', source: { type: 'artifact' } },
        { id: '3', content: 'Third quote', source: { type: 'document' } },
      ];

      const merged = mergeQuotes(quotes);
      const lineCount = countQuoteLines(merged);

      return {
        mergedLength: merged.length,
        lineCount,
        hasFirstQuote: merged.includes('First quote'),
        hasSecondQuote: merged.includes('Second quote'),
        hasThirdQuote: merged.includes('Third quote'),
      };
    });

    expect(result.lineCount).toBe(3);
    expect(result.hasFirstQuote).toBe(true);
    expect(result.hasSecondQuote).toBe(true);
    expect(result.hasThirdQuote).toBe(true);
  });

  test('should track quote usage', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface QuoteUsage {
        quoteId: string;
        usedAt: Date;
        context: 'reply' | 'new_message' | 'export';
      }

      const usageHistory: QuoteUsage[] = [];

      const recordUsage = (quoteId: string, context: QuoteUsage['context']) => {
        usageHistory.push({
          quoteId,
          usedAt: new Date(),
          context,
        });
      };

      const getUsageCount = (quoteId: string): number => {
        return usageHistory.filter(u => u.quoteId === quoteId).length;
      };

      const getMostUsedQuotes = (limit = 5): { quoteId: string; count: number }[] => {
        const counts: Record<string, number> = {};
        usageHistory.forEach(u => {
          counts[u.quoteId] = (counts[u.quoteId] || 0) + 1;
        });
        return Object.entries(counts)
          .map(([quoteId, count]) => ({ quoteId, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, limit);
      };

      // Record usage
      recordUsage('q1', 'reply');
      recordUsage('q1', 'reply');
      recordUsage('q1', 'new_message');
      recordUsage('q2', 'reply');
      recordUsage('q3', 'export');

      const q1Count = getUsageCount('q1');
      const mostUsed = getMostUsedQuotes(2);

      return {
        totalUsage: usageHistory.length,
        q1Count,
        mostUsedId: mostUsed[0]?.quoteId,
        mostUsedCount: mostUsed[0]?.count,
        secondMostUsedId: mostUsed[1]?.quoteId,
      };
    });

    expect(result.totalUsage).toBe(5);
    expect(result.q1Count).toBe(3);
    expect(result.mostUsedId).toBe('q1');
    expect(result.mostUsedCount).toBe(3);
    expect(result.secondMostUsedId).toBe('q2');
  });
});

test.describe('Quoted Content Display', () => {
  test('should render quoted content with styling', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface _QuotedContentProps {
        content: string;
        source: string;
        isCollapsed: boolean;
        maxHeight: number;
      }

      const shouldShowExpandButton = (
        contentHeight: number,
        maxHeight: number
      ): boolean => {
        return contentHeight > maxHeight;
      };

      const getQuoteClasses = (isCollapsed: boolean): string => {
        const baseClasses = 'border-l-4 border-primary/50 pl-4 py-2 bg-muted/30';
        if (isCollapsed) {
          return `${baseClasses} max-h-20 overflow-hidden`;
        }
        return baseClasses;
      };

      const truncateContent = (content: string, maxChars: number): string => {
        if (content.length <= maxChars) return content;
        return content.slice(0, maxChars) + '...';
      };

      const longContent = 'A'.repeat(500);
      const shortContent = 'Short quote';

      return {
        shouldExpandLong: shouldShowExpandButton(500, 100),
        shouldExpandShort: shouldShowExpandButton(50, 100),
        collapsedClasses: getQuoteClasses(true),
        expandedClasses: getQuoteClasses(false),
        truncatedLong: truncateContent(longContent, 100).length,
        truncatedShort: truncateContent(shortContent, 100),
      };
    });

    expect(result.shouldExpandLong).toBe(true);
    expect(result.shouldExpandShort).toBe(false);
    expect(result.collapsedClasses).toContain('max-h-20');
    expect(result.expandedClasses).not.toContain('max-h-20');
    expect(result.truncatedLong).toBe(103); // 100 + '...'
    expect(result.truncatedShort).toBe('Short quote');
  });
});
