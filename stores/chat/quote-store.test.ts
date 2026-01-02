/**
 * Quote Store Tests
 */

import { act, renderHook } from '@testing-library/react';
import { useQuoteStore } from './quote-store';

describe('useQuoteStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useQuoteStore());
    act(() => {
      result.current.clearQuotes();
    });
  });

  describe('addQuote', () => {
    it('should add a quote to the store', () => {
      const { result } = renderHook(() => useQuoteStore());

      act(() => {
        result.current.addQuote({
          content: 'Test quote content',
          messageId: 'msg-123',
          messageRole: 'assistant',
        });
      });

      expect(result.current.quotedTexts).toHaveLength(1);
      expect(result.current.quotedTexts[0].content).toBe('Test quote content');
      expect(result.current.quotedTexts[0].messageId).toBe('msg-123');
      expect(result.current.quotedTexts[0].messageRole).toBe('assistant');
      expect(result.current.quotedTexts[0].id).toBeDefined();
      expect(result.current.quotedTexts[0].createdAt).toBeInstanceOf(Date);
    });

    it('should add multiple quotes', () => {
      const { result } = renderHook(() => useQuoteStore());

      act(() => {
        result.current.addQuote({
          content: 'First quote',
          messageId: 'msg-1',
          messageRole: 'user',
        });
        result.current.addQuote({
          content: 'Second quote',
          messageId: 'msg-2',
          messageRole: 'assistant',
        });
      });

      expect(result.current.quotedTexts).toHaveLength(2);
      expect(result.current.quotedTexts[0].content).toBe('First quote');
      expect(result.current.quotedTexts[1].content).toBe('Second quote');
    });
  });

  describe('removeQuote', () => {
    it('should remove a specific quote by id', () => {
      const { result } = renderHook(() => useQuoteStore());

      act(() => {
        result.current.addQuote({
          content: 'Quote to keep',
          messageId: 'msg-1',
          messageRole: 'user',
        });
        result.current.addQuote({
          content: 'Quote to remove',
          messageId: 'msg-2',
          messageRole: 'assistant',
        });
      });

      const idToRemove = result.current.quotedTexts[1].id;

      act(() => {
        result.current.removeQuote(idToRemove);
      });

      expect(result.current.quotedTexts).toHaveLength(1);
      expect(result.current.quotedTexts[0].content).toBe('Quote to keep');
    });

    it('should do nothing if quote id does not exist', () => {
      const { result } = renderHook(() => useQuoteStore());

      act(() => {
        result.current.addQuote({
          content: 'Test quote',
          messageId: 'msg-1',
          messageRole: 'user',
        });
      });

      act(() => {
        result.current.removeQuote('non-existent-id');
      });

      expect(result.current.quotedTexts).toHaveLength(1);
    });
  });

  describe('clearQuotes', () => {
    it('should clear all quotes', () => {
      const { result } = renderHook(() => useQuoteStore());

      act(() => {
        result.current.addQuote({
          content: 'Quote 1',
          messageId: 'msg-1',
          messageRole: 'user',
        });
        result.current.addQuote({
          content: 'Quote 2',
          messageId: 'msg-2',
          messageRole: 'assistant',
        });
      });

      expect(result.current.quotedTexts).toHaveLength(2);

      act(() => {
        result.current.clearQuotes();
      });

      expect(result.current.quotedTexts).toHaveLength(0);
    });
  });

  describe('getFormattedQuotes', () => {
    it('should return empty string when no quotes', () => {
      const { result } = renderHook(() => useQuoteStore());

      expect(result.current.getFormattedQuotes()).toBe('');
    });

    it('should format a single user quote', () => {
      const { result } = renderHook(() => useQuoteStore());

      act(() => {
        result.current.addQuote({
          content: 'User said this',
          messageId: 'msg-1',
          messageRole: 'user',
        });
      });

      expect(result.current.getFormattedQuotes()).toBe('> [You]: User said this');
    });

    it('should format a single assistant quote', () => {
      const { result } = renderHook(() => useQuoteStore());

      act(() => {
        result.current.addQuote({
          content: 'AI said this',
          messageId: 'msg-1',
          messageRole: 'assistant',
        });
      });

      expect(result.current.getFormattedQuotes()).toBe('> [Assistant]: AI said this');
    });

    it('should format multiple quotes with newlines', () => {
      const { result } = renderHook(() => useQuoteStore());

      act(() => {
        result.current.addQuote({
          content: 'First quote',
          messageId: 'msg-1',
          messageRole: 'user',
        });
        result.current.addQuote({
          content: 'Second quote',
          messageId: 'msg-2',
          messageRole: 'assistant',
        });
      });

      const formatted = result.current.getFormattedQuotes();
      expect(formatted).toBe('> [You]: First quote\n\n> [Assistant]: Second quote');
    });
  });

  describe('updateQuote', () => {
    it('should update quote content', () => {
      const { result } = renderHook(() => useQuoteStore());

      act(() => {
        result.current.addQuote({
          content: 'Original content',
          messageId: 'msg-1',
          messageRole: 'user',
        });
      });

      const quoteId = result.current.quotedTexts[0].id;

      act(() => {
        result.current.updateQuote(quoteId, 'Updated content');
      });

      expect(result.current.quotedTexts[0].content).toBe('Updated content');
    });
  });

  describe('moveQuoteUp', () => {
    it('should move quote up in the list', () => {
      const { result } = renderHook(() => useQuoteStore());

      act(() => {
        result.current.addQuote({ content: 'First', messageId: 'msg-1', messageRole: 'user' });
        result.current.addQuote({ content: 'Second', messageId: 'msg-2', messageRole: 'user' });
        result.current.addQuote({ content: 'Third', messageId: 'msg-3', messageRole: 'user' });
      });

      const secondId = result.current.quotedTexts[1].id;

      act(() => {
        result.current.moveQuoteUp(secondId);
      });

      expect(result.current.quotedTexts[0].content).toBe('Second');
      expect(result.current.quotedTexts[1].content).toBe('First');
      expect(result.current.quotedTexts[2].content).toBe('Third');
    });

    it('should not move first quote up', () => {
      const { result } = renderHook(() => useQuoteStore());

      act(() => {
        result.current.addQuote({ content: 'First', messageId: 'msg-1', messageRole: 'user' });
        result.current.addQuote({ content: 'Second', messageId: 'msg-2', messageRole: 'user' });
      });

      const firstId = result.current.quotedTexts[0].id;

      act(() => {
        result.current.moveQuoteUp(firstId);
      });

      expect(result.current.quotedTexts[0].content).toBe('First');
      expect(result.current.quotedTexts[1].content).toBe('Second');
    });
  });

  describe('moveQuoteDown', () => {
    it('should move quote down in the list', () => {
      const { result } = renderHook(() => useQuoteStore());

      act(() => {
        result.current.addQuote({ content: 'First', messageId: 'msg-1', messageRole: 'user' });
        result.current.addQuote({ content: 'Second', messageId: 'msg-2', messageRole: 'user' });
        result.current.addQuote({ content: 'Third', messageId: 'msg-3', messageRole: 'user' });
      });

      const secondId = result.current.quotedTexts[1].id;

      act(() => {
        result.current.moveQuoteDown(secondId);
      });

      expect(result.current.quotedTexts[0].content).toBe('First');
      expect(result.current.quotedTexts[1].content).toBe('Third');
      expect(result.current.quotedTexts[2].content).toBe('Second');
    });

    it('should not move last quote down', () => {
      const { result } = renderHook(() => useQuoteStore());

      act(() => {
        result.current.addQuote({ content: 'First', messageId: 'msg-1', messageRole: 'user' });
        result.current.addQuote({ content: 'Second', messageId: 'msg-2', messageRole: 'user' });
      });

      const lastId = result.current.quotedTexts[1].id;

      act(() => {
        result.current.moveQuoteDown(lastId);
      });

      expect(result.current.quotedTexts[0].content).toBe('First');
      expect(result.current.quotedTexts[1].content).toBe('Second');
    });
  });

  describe('reorderQuotes', () => {
    it('should reorder quotes by index', () => {
      const { result } = renderHook(() => useQuoteStore());

      act(() => {
        result.current.addQuote({ content: 'A', messageId: 'msg-1', messageRole: 'user' });
        result.current.addQuote({ content: 'B', messageId: 'msg-2', messageRole: 'user' });
        result.current.addQuote({ content: 'C', messageId: 'msg-3', messageRole: 'user' });
      });

      act(() => {
        result.current.reorderQuotes(0, 2);
      });

      expect(result.current.quotedTexts[0].content).toBe('B');
      expect(result.current.quotedTexts[1].content).toBe('C');
      expect(result.current.quotedTexts[2].content).toBe('A');
    });

    it('should handle invalid indices', () => {
      const { result } = renderHook(() => useQuoteStore());

      act(() => {
        result.current.addQuote({ content: 'A', messageId: 'msg-1', messageRole: 'user' });
        result.current.addQuote({ content: 'B', messageId: 'msg-2', messageRole: 'user' });
      });

      act(() => {
        result.current.reorderQuotes(-1, 5);
      });

      expect(result.current.quotedTexts[0].content).toBe('A');
      expect(result.current.quotedTexts[1].content).toBe('B');
    });
  });

  describe('toggleCollapse', () => {
    it('should toggle collapse state', () => {
      const { result } = renderHook(() => useQuoteStore());

      act(() => {
        result.current.addQuote({ content: 'Test', messageId: 'msg-1', messageRole: 'user' });
      });

      const quoteId = result.current.quotedTexts[0].id;
      expect(result.current.quotedTexts[0].isCollapsed).toBe(false);

      act(() => {
        result.current.toggleCollapse(quoteId);
      });

      expect(result.current.quotedTexts[0].isCollapsed).toBe(true);

      act(() => {
        result.current.toggleCollapse(quoteId);
      });

      expect(result.current.quotedTexts[0].isCollapsed).toBe(false);
    });
  });

  describe('collapseAll and expandAll', () => {
    it('should collapse all quotes', () => {
      const { result } = renderHook(() => useQuoteStore());

      act(() => {
        result.current.addQuote({ content: 'A', messageId: 'msg-1', messageRole: 'user' });
        result.current.addQuote({ content: 'B', messageId: 'msg-2', messageRole: 'user' });
      });

      act(() => {
        result.current.collapseAll();
      });

      expect(result.current.quotedTexts.every(q => q.isCollapsed)).toBe(true);
    });

    it('should expand all quotes', () => {
      const { result } = renderHook(() => useQuoteStore());

      act(() => {
        result.current.addQuote({ content: 'A', messageId: 'msg-1', messageRole: 'user' });
        result.current.addQuote({ content: 'B', messageId: 'msg-2', messageRole: 'user' });
        result.current.collapseAll();
      });

      act(() => {
        result.current.expandAll();
      });

      expect(result.current.quotedTexts.every(q => !q.isCollapsed)).toBe(true);
    });
  });

  describe('duplicateQuote', () => {
    it('should duplicate a quote', () => {
      const { result } = renderHook(() => useQuoteStore());

      act(() => {
        result.current.addQuote({ content: 'Original', messageId: 'msg-1', messageRole: 'user' });
      });

      const originalId = result.current.quotedTexts[0].id;

      act(() => {
        result.current.duplicateQuote(originalId);
      });

      expect(result.current.quotedTexts).toHaveLength(2);
      expect(result.current.quotedTexts[0].content).toBe('Original');
      expect(result.current.quotedTexts[1].content).toBe('Original');
      expect(result.current.quotedTexts[0].id).not.toBe(result.current.quotedTexts[1].id);
    });
  });

  describe('maxQuotes limit', () => {
    it('should not add more than maxQuotes', () => {
      const { result } = renderHook(() => useQuoteStore());

      act(() => {
        for (let i = 0; i < 12; i++) {
          result.current.addQuote({ content: `Quote ${i}`, messageId: `msg-${i}`, messageRole: 'user' });
        }
      });

      expect(result.current.quotedTexts.length).toBe(10);
    });

    it('canAddMore should return correct value', () => {
      const { result } = renderHook(() => useQuoteStore());

      expect(result.current.canAddMore()).toBe(true);

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.addQuote({ content: `Quote ${i}`, messageId: `msg-${i}`, messageRole: 'user' });
        }
      });

      expect(result.current.canAddMore()).toBe(false);
    });
  });

  describe('selection mode', () => {
    it('should toggle selection mode', () => {
      const { result } = renderHook(() => useQuoteStore());

      expect(result.current.isSelectionMode).toBe(false);

      act(() => {
        result.current.toggleSelectionMode();
      });

      expect(result.current.isSelectionMode).toBe(true);

      act(() => {
        result.current.toggleSelectionMode();
      });

      expect(result.current.isSelectionMode).toBe(false);
    });

    it('should toggle select individual quote', () => {
      const { result } = renderHook(() => useQuoteStore());

      act(() => {
        result.current.addQuote({ content: 'A', messageId: 'msg-1', messageRole: 'user' });
        result.current.addQuote({ content: 'B', messageId: 'msg-2', messageRole: 'user' });
      });

      const quoteId = result.current.quotedTexts[0].id;

      act(() => {
        result.current.toggleSelect(quoteId);
      });

      expect(result.current.selectedIds.has(quoteId)).toBe(true);

      act(() => {
        result.current.toggleSelect(quoteId);
      });

      expect(result.current.selectedIds.has(quoteId)).toBe(false);
    });

    it('should select all and deselect all', () => {
      const { result } = renderHook(() => useQuoteStore());

      act(() => {
        result.current.addQuote({ content: 'A', messageId: 'msg-1', messageRole: 'user' });
        result.current.addQuote({ content: 'B', messageId: 'msg-2', messageRole: 'user' });
      });

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.selectedIds.size).toBe(2);

      act(() => {
        result.current.deselectAll();
      });

      expect(result.current.selectedIds.size).toBe(0);
    });

    it('should remove selected quotes', () => {
      const { result } = renderHook(() => useQuoteStore());

      act(() => {
        result.current.addQuote({ content: 'A', messageId: 'msg-1', messageRole: 'user' });
        result.current.addQuote({ content: 'B', messageId: 'msg-2', messageRole: 'user' });
        result.current.addQuote({ content: 'C', messageId: 'msg-3', messageRole: 'user' });
      });

      const idToRemove = result.current.quotedTexts[1].id;

      act(() => {
        result.current.toggleSelect(idToRemove);
        result.current.removeSelected();
      });

      expect(result.current.quotedTexts).toHaveLength(2);
      expect(result.current.quotedTexts.map(q => q.content)).toEqual(['A', 'C']);
    });
  });

  describe('mergeQuotes', () => {
    it('should merge multiple quotes into one', () => {
      const { result } = renderHook(() => useQuoteStore());

      act(() => {
        result.current.addQuote({ content: 'First', messageId: 'msg-1', messageRole: 'user' });
        result.current.addQuote({ content: 'Second', messageId: 'msg-2', messageRole: 'assistant' });
        result.current.addQuote({ content: 'Third', messageId: 'msg-3', messageRole: 'user' });
      });

      const ids = result.current.quotedTexts.slice(0, 2).map(q => q.id);

      act(() => {
        result.current.mergeQuotes(ids);
      });

      expect(result.current.quotedTexts).toHaveLength(2);
      expect(result.current.quotedTexts[0].content).toBe('First\n\nSecond');
    });

    it('should not merge if less than 2 quotes', () => {
      const { result } = renderHook(() => useQuoteStore());

      act(() => {
        result.current.addQuote({ content: 'Only one', messageId: 'msg-1', messageRole: 'user' });
      });

      const ids = [result.current.quotedTexts[0].id];

      act(() => {
        result.current.mergeQuotes(ids);
      });

      expect(result.current.quotedTexts).toHaveLength(1);
      expect(result.current.quotedTexts[0].content).toBe('Only one');
    });
  });

  describe('exportQuotes', () => {
    it('should export as markdown', () => {
      const { result } = renderHook(() => useQuoteStore());

      act(() => {
        result.current.addQuote({ content: 'Test content', messageId: 'msg-1', messageRole: 'user' });
      });

      const exported = result.current.exportQuotes('markdown');

      expect(exported).toContain('### Quote 1 (You)');
      expect(exported).toContain('> Test content');
    });

    it('should export as text', () => {
      const { result } = renderHook(() => useQuoteStore());

      act(() => {
        result.current.addQuote({ content: 'Test content', messageId: 'msg-1', messageRole: 'assistant' });
      });

      const exported = result.current.exportQuotes('text');

      expect(exported).toContain('[1] Assistant:');
      expect(exported).toContain('Test content');
    });

    it('should export as JSON', () => {
      const { result } = renderHook(() => useQuoteStore());

      act(() => {
        result.current.addQuote({ content: 'Test content', messageId: 'msg-1', messageRole: 'user' });
      });

      const exported = result.current.exportQuotes('json');
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].role).toBe('user');
      expect(parsed[0].content).toBe('Test content');
    });

    it('should export only selected quotes', () => {
      const { result } = renderHook(() => useQuoteStore());

      act(() => {
        result.current.addQuote({ content: 'A', messageId: 'msg-1', messageRole: 'user' });
        result.current.addQuote({ content: 'B', messageId: 'msg-2', messageRole: 'user' });
      });

      const firstId = result.current.quotedTexts[0].id;

      act(() => {
        result.current.toggleSelect(firstId);
      });

      const exported = result.current.exportSelected('text');

      expect(exported).toContain('A');
      expect(exported).not.toContain('B');
    });
  });
});
