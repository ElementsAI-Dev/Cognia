/**
 * Quote Store - manages quoted text for referencing in conversations
 * Supports multiple quotes with reordering, editing, and flexible operations
 */

import { create } from 'zustand';
import { nanoid } from 'nanoid';

export interface QuotedText {
  id: string;
  content: string;
  messageId: string;
  messageRole: 'user' | 'assistant';
  createdAt: Date;
  isCollapsed?: boolean;
}

export type ExportFormat = 'markdown' | 'text' | 'json';

interface QuoteState {
  quotedTexts: QuotedText[];
  maxQuotes: number;
  selectedIds: Set<string>;
  isSelectionMode: boolean;
  
  // Basic operations
  addQuote: (quote: Omit<QuotedText, 'id' | 'createdAt'>) => void;
  removeQuote: (id: string) => void;
  clearQuotes: () => void;
  getFormattedQuotes: () => string;
  
  // Enhanced operations
  updateQuote: (id: string, content: string) => void;
  moveQuoteUp: (id: string) => void;
  moveQuoteDown: (id: string) => void;
  reorderQuotes: (fromIndex: number, toIndex: number) => void;
  toggleCollapse: (id: string) => void;
  collapseAll: () => void;
  expandAll: () => void;
  duplicateQuote: (id: string) => void;
  
  // Selection operations
  toggleSelectionMode: () => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  removeSelected: () => void;
  
  // Merge & Export operations
  mergeQuotes: (ids: string[]) => void;
  mergeSelected: () => void;
  exportQuotes: (format: ExportFormat, ids?: string[]) => string;
  exportSelected: (format: ExportFormat) => string;
  copyToClipboard: (text: string) => Promise<void>;
  
  // Utility
  getQuoteCount: () => number;
  canAddMore: () => boolean;
  getSelectedCount: () => number;
}

export const useQuoteStore = create<QuoteState>((set, get) => ({
  quotedTexts: [],
  maxQuotes: 10,
  selectedIds: new Set<string>(),
  isSelectionMode: false,

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
      quotedTexts: state.quotedTexts.map((q) =>
        q.id === id ? { ...q, content } : q
      ),
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

  getQuoteCount: () => get().quotedTexts.length,
  
  canAddMore: () => {
    const { quotedTexts, maxQuotes } = get();
    return quotedTexts.length < maxQuotes;
  },

  // Selection operations
  toggleSelectionMode: () => {
    set((state) => ({
      isSelectionMode: !state.isSelectionMode,
      selectedIds: new Set<string>(),
    }));
  },

  toggleSelect: (id) => {
    set((state) => {
      const newSelectedIds = new Set(state.selectedIds);
      if (newSelectedIds.has(id)) {
        newSelectedIds.delete(id);
      } else {
        newSelectedIds.add(id);
      }
      return { selectedIds: newSelectedIds };
    });
  },

  selectAll: () => {
    set((state) => ({
      selectedIds: new Set(state.quotedTexts.map((q) => q.id)),
    }));
  },

  deselectAll: () => {
    set({ selectedIds: new Set<string>() });
  },

  removeSelected: () => {
    set((state) => ({
      quotedTexts: state.quotedTexts.filter((q) => !state.selectedIds.has(q.id)),
      selectedIds: new Set<string>(),
      isSelectionMode: false,
    }));
  },

  // Merge & Export operations
  mergeQuotes: (ids) => {
    const { quotedTexts } = get();
    if (ids.length < 2) return;

    const quotesToMerge = quotedTexts.filter((q) => ids.includes(q.id));
    if (quotesToMerge.length < 2) return;

    const mergedContent = quotesToMerge.map((q) => q.content).join('\n\n');
    const firstQuote = quotesToMerge[0];
    const firstIndex = quotedTexts.findIndex((q) => q.id === ids[0]);

    const mergedQuote: QuotedText = {
      id: nanoid(),
      content: mergedContent,
      messageId: firstQuote.messageId,
      messageRole: firstQuote.messageRole,
      createdAt: new Date(),
      isCollapsed: false,
    };

    set((state) => {
      const filteredQuotes = state.quotedTexts.filter((q) => !ids.includes(q.id));
      filteredQuotes.splice(firstIndex, 0, mergedQuote);
      return { 
        quotedTexts: filteredQuotes,
        selectedIds: new Set<string>(),
      };
    });
  },

  mergeSelected: () => {
    const { selectedIds, mergeQuotes } = get();
    const ids = Array.from(selectedIds);
    if (ids.length >= 2) {
      mergeQuotes(ids);
    }
  },

  exportQuotes: (format, ids) => {
    const { quotedTexts } = get();
    const quotesToExport = ids 
      ? quotedTexts.filter((q) => ids.includes(q.id))
      : quotedTexts;

    if (quotesToExport.length === 0) return '';

    switch (format) {
      case 'markdown':
        return quotesToExport
          .map((q, i) => {
            const roleLabel = q.messageRole === 'user' ? 'You' : 'Assistant';
            return `### Quote ${i + 1} (${roleLabel})\n\n> ${q.content.replace(/\n/g, '\n> ')}`;
          })
          .join('\n\n---\n\n');

      case 'text':
        return quotesToExport
          .map((q, i) => {
            const roleLabel = q.messageRole === 'user' ? 'You' : 'Assistant';
            return `[${i + 1}] ${roleLabel}:\n${q.content}`;
          })
          .join('\n\n');

      case 'json':
        return JSON.stringify(
          quotesToExport.map((q) => ({
            role: q.messageRole,
            content: q.content,
            timestamp: q.createdAt.toISOString(),
          })),
          null,
          2
        );

      default:
        return '';
    }
  },

  exportSelected: (format) => {
    const { selectedIds, exportQuotes } = get();
    return exportQuotes(format, Array.from(selectedIds));
  },

  copyToClipboard: async (text) => {
    await navigator.clipboard.writeText(text);
  },

  getSelectedCount: () => get().selectedIds.size,
}));

// Selectors
export const selectQuotedTexts = (state: QuoteState) => state.quotedTexts;
export const selectHasQuotes = (state: QuoteState) => state.quotedTexts.length > 0;
export const selectQuoteCount = (state: QuoteState) => state.quotedTexts.length;
export const selectCanAddMore = (state: QuoteState) => state.quotedTexts.length < state.maxQuotes;
export const selectIsSelectionMode = (state: QuoteState) => state.isSelectionMode;
export const selectSelectedIds = (state: QuoteState) => state.selectedIds;
export const selectSelectedCount = (state: QuoteState) => state.selectedIds.size;
