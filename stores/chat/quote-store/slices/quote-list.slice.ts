import { nanoid } from 'nanoid';
import type { StoreApi } from 'zustand';
import type { QuoteStore, QuoteStoreActions, QuotedText } from '../types';

type QuoteStoreSet = StoreApi<QuoteStore>['setState'];
type QuoteStoreGet = StoreApi<QuoteStore>['getState'];
type QuoteListSlice = Pick<
  QuoteStoreActions,
  | 'addQuote'
  | 'removeQuote'
  | 'clearQuotes'
  | 'getFormattedQuotes'
  | 'updateQuote'
  | 'moveQuoteUp'
  | 'moveQuoteDown'
  | 'reorderQuotes'
  | 'toggleCollapse'
  | 'collapseAll'
  | 'expandAll'
  | 'duplicateQuote'
>;

export const createQuoteListSlice = (set: QuoteStoreSet, get: QuoteStoreGet): QuoteListSlice => ({
  addQuote: (quote) => {
    const { quotedTexts, maxQuotes } = get();
    if (quotedTexts.length >= maxQuotes) return;

    const newQuote: QuotedText = {
      ...quote,
      id: nanoid(),
      createdAt: new Date(),
      isCollapsed: false,
    };
    set((state) => ({
      quotedTexts: [...state.quotedTexts, newQuote],
    }));
  },

  removeQuote: (id) => {
    set((state) => ({
      quotedTexts: state.quotedTexts.filter((q) => q.id !== id),
    }));
  },

  clearQuotes: () => {
    set({ quotedTexts: [] });
  },

  getFormattedQuotes: () => {
    const { quotedTexts } = get();
    if (quotedTexts.length === 0) return '';

    return quotedTexts
      .map((q) => {
        const roleLabel = q.messageRole === 'user' ? 'You' : 'Assistant';
        return `> [${roleLabel}]: ${q.content}`;
      })
      .join('\n\n');
  },

  updateQuote: (id, content) => {
    set((state) => ({
      quotedTexts: state.quotedTexts.map((q) => (q.id === id ? { ...q, content } : q)),
    }));
  },

  moveQuoteUp: (id) => {
    set((state) => {
      const index = state.quotedTexts.findIndex((q) => q.id === id);
      if (index <= 0) return state;

      const newQuotes = [...state.quotedTexts];
      [newQuotes[index - 1], newQuotes[index]] = [newQuotes[index], newQuotes[index - 1]];
      return { quotedTexts: newQuotes };
    });
  },

  moveQuoteDown: (id) => {
    set((state) => {
      const index = state.quotedTexts.findIndex((q) => q.id === id);
      if (index < 0 || index >= state.quotedTexts.length - 1) return state;

      const newQuotes = [...state.quotedTexts];
      [newQuotes[index], newQuotes[index + 1]] = [newQuotes[index + 1], newQuotes[index]];
      return { quotedTexts: newQuotes };
    });
  },

  reorderQuotes: (fromIndex, toIndex) => {
    set((state) => {
      if (
        fromIndex < 0 ||
        fromIndex >= state.quotedTexts.length ||
        toIndex < 0 ||
        toIndex >= state.quotedTexts.length
      ) {
        return state;
      }

      const newQuotes = [...state.quotedTexts];
      const [removed] = newQuotes.splice(fromIndex, 1);
      newQuotes.splice(toIndex, 0, removed);
      return { quotedTexts: newQuotes };
    });
  },

  toggleCollapse: (id) => {
    set((state) => ({
      quotedTexts: state.quotedTexts.map((q) =>
        q.id === id ? { ...q, isCollapsed: !q.isCollapsed } : q
      ),
    }));
  },

  collapseAll: () => {
    set((state) => ({
      quotedTexts: state.quotedTexts.map((q) => ({ ...q, isCollapsed: true })),
    }));
  },

  expandAll: () => {
    set((state) => ({
      quotedTexts: state.quotedTexts.map((q) => ({ ...q, isCollapsed: false })),
    }));
  },

  duplicateQuote: (id) => {
    const { quotedTexts, maxQuotes } = get();
    if (quotedTexts.length >= maxQuotes) return;

    const original = quotedTexts.find((q) => q.id === id);
    if (!original) return;

    const duplicate: QuotedText = {
      ...original,
      id: nanoid(),
      createdAt: new Date(),
    };

    set((state) => {
      const index = state.quotedTexts.findIndex((q) => q.id === id);
      const newQuotes = [...state.quotedTexts];
      newQuotes.splice(index + 1, 0, duplicate);
      return { quotedTexts: newQuotes };
    });
  },
});
