import { nanoid } from 'nanoid';
import type { StoreApi } from 'zustand';
import type { QuoteStore, QuoteStoreActions, QuotedText } from '../types';

type QuoteStoreSet = StoreApi<QuoteStore>['setState'];
type QuoteStoreGet = StoreApi<QuoteStore>['getState'];
type MergeExportSlice = Pick<
  QuoteStoreActions,
  'mergeQuotes' | 'mergeSelected' | 'exportQuotes' | 'exportSelected' | 'copyToClipboard'
>;

export const createMergeExportSlice = (set: QuoteStoreSet, get: QuoteStoreGet): MergeExportSlice => ({
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
    const quotesToExport = ids ? quotedTexts.filter((q) => ids.includes(q.id)) : quotedTexts;

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
});
