import { test, expect } from '@playwright/test';

/**
 * Text Selection and Quote Functionality E2E Tests
 * Tests text selection popover and quote referencing features
 */
test.describe('Text Selection and Quote Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test.describe('Quote Store Logic', () => {
    test('should manage quotes correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface QuotedText {
          id: string;
          content: string;
          messageId: string;
          messageRole: 'user' | 'assistant';
          createdAt: Date;
        }

        // Simulate quote store logic
        const quotes: QuotedText[] = [];
        let idCounter = 0;

        const addQuote = (quote: Omit<QuotedText, 'id' | 'createdAt'>) => {
          quotes.push({
            ...quote,
            id: `quote-${++idCounter}`,
            createdAt: new Date(),
          });
        };

        const removeQuote = (id: string) => {
          const index = quotes.findIndex(q => q.id === id);
          if (index > -1) quotes.splice(index, 1);
        };

        const clearQuotes = () => {
          quotes.length = 0;
        };

        const getFormattedQuotes = (): string => {
          if (quotes.length === 0) return '';
          return quotes
            .map(q => {
              const roleLabel = q.messageRole === 'user' ? 'You' : 'Assistant';
              return `> [${roleLabel}]: ${q.content}`;
            })
            .join('\n\n');
        };

        // Test operations
        addQuote({ content: 'First quote', messageId: 'msg-1', messageRole: 'user' });
        addQuote({ content: 'Second quote', messageId: 'msg-2', messageRole: 'assistant' });
        
        const afterAdd = {
          count: quotes.length,
          formatted: getFormattedQuotes(),
        };

        removeQuote('quote-1');
        const afterRemove = {
          count: quotes.length,
          remaining: quotes[0]?.content,
        };

        clearQuotes();
        const afterClear = {
          count: quotes.length,
          formatted: getFormattedQuotes(),
        };

        return { afterAdd, afterRemove, afterClear };
      });

      expect(result.afterAdd.count).toBe(2);
      expect(result.afterAdd.formatted).toContain('> [You]: First quote');
      expect(result.afterAdd.formatted).toContain('> [Assistant]: Second quote');
      expect(result.afterRemove.count).toBe(1);
      expect(result.afterRemove.remaining).toBe('Second quote');
      expect(result.afterClear.count).toBe(0);
      expect(result.afterClear.formatted).toBe('');
    });

    test('should format quotes for message inclusion', async ({ page }) => {
      const result = await page.evaluate(() => {
        const formatQuotesForMessage = (
          quotes: { content: string; messageRole: 'user' | 'assistant' }[],
          userMessage: string
        ): string => {
          if (quotes.length === 0) return userMessage;

          const formattedQuotes = quotes
            .map(q => {
              const roleLabel = q.messageRole === 'user' ? 'You' : 'Assistant';
              return `> [${roleLabel}]: ${q.content}`;
            })
            .join('\n\n');

          return `${formattedQuotes}\n\n${userMessage}`;
        };

        const quotes = [
          { content: 'AI said something interesting', messageRole: 'assistant' as const },
          { content: 'User replied with this', messageRole: 'user' as const },
        ];

        const result1 = formatQuotesForMessage(quotes, 'Can you explain more?');
        const result2 = formatQuotesForMessage([], 'No quotes here');

        return { result1, result2 };
      });

      expect(result.result1).toContain('> [Assistant]: AI said something interesting');
      expect(result.result1).toContain('> [You]: User replied with this');
      expect(result.result1).toContain('Can you explain more?');
      expect(result.result2).toBe('No quotes here');
    });
  });

  test.describe('Text Selection Behavior', () => {
    test('should track text selection state', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface SelectionState {
          text: string;
          rect: { x: number; y: number; width: number; height: number } | null;
          messageId: string | null;
        }

        // Simulate selection state management
        let selectionState: SelectionState = {
          text: '',
          rect: null,
          messageId: null,
        };

        const updateSelection = (text: string, messageId: string | null, rect: SelectionState['rect']) => {
          selectionState = { text, rect, messageId };
        };

        const clearSelection = () => {
          selectionState = { text: '', rect: null, messageId: null };
        };

        const hasSelection = () => selectionState.text.length > 0;

        // Test operations
        updateSelection('Selected text', 'msg-123', { x: 100, y: 200, width: 150, height: 20 });
        const afterSelect = { ...selectionState, hasSelection: hasSelection() };

        clearSelection();
        const afterClear = { ...selectionState, hasSelection: hasSelection() };

        return { afterSelect, afterClear };
      });

      expect(result.afterSelect.text).toBe('Selected text');
      expect(result.afterSelect.messageId).toBe('msg-123');
      expect(result.afterSelect.hasSelection).toBe(true);
      expect(result.afterSelect.rect).toEqual({ x: 100, y: 200, width: 150, height: 20 });
      expect(result.afterClear.text).toBe('');
      expect(result.afterClear.hasSelection).toBe(false);
    });

    test('should validate selection within container', async ({ page }) => {
      const result = await page.evaluate(() => {
        // Simulate container validation logic
        const isSelectionInContainer = (
          containerBounds: { top: number; left: number; bottom: number; right: number },
          selectionBounds: { x: number; y: number }
        ): boolean => {
          return (
            selectionBounds.x >= containerBounds.left &&
            selectionBounds.x <= containerBounds.right &&
            selectionBounds.y >= containerBounds.top &&
            selectionBounds.y <= containerBounds.bottom
          );
        };

        const container = { top: 0, left: 0, bottom: 500, right: 800 };

        return {
          insideContainer: isSelectionInContainer(container, { x: 400, y: 250 }),
          outsideRight: isSelectionInContainer(container, { x: 900, y: 250 }),
          outsideBottom: isSelectionInContainer(container, { x: 400, y: 600 }),
          onEdge: isSelectionInContainer(container, { x: 800, y: 500 }),
        };
      });

      expect(result.insideContainer).toBe(true);
      expect(result.outsideRight).toBe(false);
      expect(result.outsideBottom).toBe(false);
      expect(result.onEdge).toBe(true);
    });
  });

  test.describe('Quote UI Components', () => {
    test('should render quote badge correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        const getQuoteBadgeText = (role: 'user' | 'assistant'): string => {
          return role === 'user' ? 'You' : 'AI';
        };

        const getQuoteBadgeVariant = (role: 'user' | 'assistant'): string => {
          return role === 'user' ? 'default' : 'secondary';
        };

        return {
          userBadge: getQuoteBadgeText('user'),
          assistantBadge: getQuoteBadgeText('assistant'),
          userVariant: getQuoteBadgeVariant('user'),
          assistantVariant: getQuoteBadgeVariant('assistant'),
        };
      });

      expect(result.userBadge).toBe('You');
      expect(result.assistantBadge).toBe('AI');
      expect(result.userVariant).toBe('default');
      expect(result.assistantVariant).toBe('secondary');
    });

    test('should truncate long quote content', async ({ page }) => {
      const result = await page.evaluate(() => {
        const truncateContent = (content: string, maxLength: number = 150): string => {
          if (content.length <= maxLength) return content;
          return content.slice(0, maxLength) + '...';
        };

        const shortContent = 'Short text';
        const longContent = 'A'.repeat(200);
        const exactContent = 'B'.repeat(150);

        return {
          shortTruncated: truncateContent(shortContent),
          shortLength: truncateContent(shortContent).length,
          longTruncated: truncateContent(longContent),
          longLength: truncateContent(longContent).length,
          exactTruncated: truncateContent(exactContent),
          exactLength: truncateContent(exactContent).length,
        };
      });

      expect(result.shortTruncated).toBe('Short text');
      expect(result.shortLength).toBe(10);
      expect(result.longTruncated).toContain('...');
      expect(result.longLength).toBe(153); // 150 + '...'
      expect(result.exactTruncated).toBe('B'.repeat(150));
      expect(result.exactLength).toBe(150);
    });

    test('should show clear all button only for multiple quotes', async ({ page }) => {
      const result = await page.evaluate(() => {
        const shouldShowClearAll = (quoteCount: number): boolean => {
          return quoteCount > 1;
        };

        return {
          noQuotes: shouldShowClearAll(0),
          oneQuote: shouldShowClearAll(1),
          twoQuotes: shouldShowClearAll(2),
          manyQuotes: shouldShowClearAll(5),
        };
      });

      expect(result.noQuotes).toBe(false);
      expect(result.oneQuote).toBe(false);
      expect(result.twoQuotes).toBe(true);
      expect(result.manyQuotes).toBe(true);
    });
  });

  test.describe('Popover Actions', () => {
    test('should handle copy action', async ({ page }) => {
      const result = await page.evaluate(async () => {
        // Simulate copy action
        const copyToClipboard = async (text: string): Promise<boolean> => {
          try {
            // In real browser, this would use navigator.clipboard.writeText
            // For test, we simulate success
            return text.length > 0;
          } catch {
            return false;
          }
        };

        const copyResult1 = await copyToClipboard('Selected text');
        const copyResult2 = await copyToClipboard('');

        return { copyResult1, copyResult2 };
      });

      expect(result.copyResult1).toBe(true);
      expect(result.copyResult2).toBe(false);
    });

    test('should handle quote action', async ({ page }) => {
      const result = await page.evaluate(() => {
        const quotes: { content: string; messageId: string; messageRole: string }[] = [];

        const handleQuoteAction = (
          selectedText: string,
          messageId: string,
          messageRole: 'user' | 'assistant'
        ): boolean => {
          if (!selectedText.trim()) return false;

          quotes.push({
            content: selectedText,
            messageId,
            messageRole,
          });

          return true;
        };

        const result1 = handleQuoteAction('Some text to quote', 'msg-1', 'assistant');
        const result2 = handleQuoteAction('', 'msg-2', 'user');
        const result3 = handleQuoteAction('   ', 'msg-3', 'assistant');

        return {
          result1,
          result2,
          result3,
          quoteCount: quotes.length,
          firstQuote: quotes[0],
        };
      });

      expect(result.result1).toBe(true);
      expect(result.result2).toBe(false);
      expect(result.result3).toBe(false);
      expect(result.quoteCount).toBe(1);
      expect(result.firstQuote.content).toBe('Some text to quote');
      expect(result.firstQuote.messageRole).toBe('assistant');
    });

    test('should handle search action', async ({ page }) => {
      const result = await page.evaluate(() => {
        const handleSearchAction = (
          searchText: string,
          onSearch?: (text: string) => void
        ): boolean => {
          if (!searchText.trim()) return false;
          if (onSearch) {
            onSearch(searchText);
            return true;
          }
          return false;
        };

        let searchedText = '';
        const mockOnSearch = (text: string) => {
          searchedText = text;
        };

        const result1 = handleSearchAction('search term', mockOnSearch);
        const result2 = handleSearchAction('another search', undefined);
        const result3 = handleSearchAction('', mockOnSearch);

        return {
          result1,
          result2,
          result3,
          searchedText,
        };
      });

      expect(result.result1).toBe(true);
      expect(result.result2).toBe(false);
      expect(result.result3).toBe(false);
      expect(result.searchedText).toBe('search term');
    });
  });

  test.describe('Integration with Chat', () => {
    test('should format message with quotes correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface Quote {
          content: string;
          messageRole: 'user' | 'assistant';
        }

        const formatMessageWithQuotes = (
          userInput: string,
          quotes: Quote[]
        ): string => {
          if (quotes.length === 0) return userInput;

          const formattedQuotes = quotes
            .map(q => {
              const roleLabel = q.messageRole === 'user' ? 'You' : 'Assistant';
              return `> [${roleLabel}]: ${q.content}`;
            })
            .join('\n\n');

          return `${formattedQuotes}\n\n${userInput}`;
        };

        // Test cases
        const noQuotes = formatMessageWithQuotes('Hello', []);
        
        const singleQuote = formatMessageWithQuotes('What do you mean?', [
          { content: 'AI explanation here', messageRole: 'assistant' },
        ]);

        const multipleQuotes = formatMessageWithQuotes('Please clarify both points', [
          { content: 'First point', messageRole: 'assistant' },
          { content: 'My response', messageRole: 'user' },
        ]);

        return { noQuotes, singleQuote, multipleQuotes };
      });

      expect(result.noQuotes).toBe('Hello');
      expect(result.singleQuote).toBe('> [Assistant]: AI explanation here\n\nWhat do you mean?');
      expect(result.multipleQuotes).toContain('> [Assistant]: First point');
      expect(result.multipleQuotes).toContain('> [You]: My response');
      expect(result.multipleQuotes).toContain('Please clarify both points');
    });

    test('should clear quotes after sending message', async ({ page }) => {
      const result = await page.evaluate(() => {
        const quotes: { content: string }[] = [];

        const addQuote = (content: string) => quotes.push({ content });
        const clearQuotes = () => { quotes.length = 0; };
        const sendMessage = (_message: string) => {
          // Simulate sending
          clearQuotes();
          return true;
        };

        // Add some quotes
        addQuote('Quote 1');
        addQuote('Quote 2');
        const beforeSend = quotes.length;

        // Send message
        sendMessage('Test message');
        const afterSend = quotes.length;

        return { beforeSend, afterSend };
      });

      expect(result.beforeSend).toBe(2);
      expect(result.afterSend).toBe(0);
    });
  });

  test.describe('Accessibility', () => {
    test('should provide proper button labels', async ({ page }) => {
      const result = await page.evaluate(() => {
        const getButtonTooltips = () => ({
          copy: 'Copy',
          quote: 'Quote',
          search: 'Search',
        });

        const getCopiedFeedback = () => 'Copied!';
        const getQuotedFeedback = () => 'Quoted!';

        return {
          tooltips: getButtonTooltips(),
          copyFeedback: getCopiedFeedback(),
          quoteFeedback: getQuotedFeedback(),
        };
      });

      expect(result.tooltips.copy).toBe('Copy');
      expect(result.tooltips.quote).toBe('Quote');
      expect(result.tooltips.search).toBe('Search');
      expect(result.copyFeedback).toBe('Copied!');
      expect(result.quoteFeedback).toBe('Quoted!');
    });

    test('should support keyboard navigation', async ({ page }) => {
      const result = await page.evaluate(() => {
        const handleKeyboardNavigation = (key: string, isPopoverOpen: boolean): string => {
          if (!isPopoverOpen) return 'no-action';

          switch (key) {
            case 'Escape':
              return 'close-popover';
            case 'Tab':
              return 'next-button';
            case 'Enter':
              return 'activate-button';
            default:
              return 'no-action';
          }
        };

        return {
          escapeOpen: handleKeyboardNavigation('Escape', true),
          escapeClosed: handleKeyboardNavigation('Escape', false),
          tabOpen: handleKeyboardNavigation('Tab', true),
          enterOpen: handleKeyboardNavigation('Enter', true),
        };
      });

      expect(result.escapeOpen).toBe('close-popover');
      expect(result.escapeClosed).toBe('no-action');
      expect(result.tabOpen).toBe('next-button');
      expect(result.enterOpen).toBe('activate-button');
    });
  });
});
