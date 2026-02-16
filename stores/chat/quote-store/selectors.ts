import type { QuoteStore } from './types';

export const selectQuotedTexts = (state: QuoteStore) => state.quotedTexts;
export const selectHasQuotes = (state: QuoteStore) => state.quotedTexts.length > 0;
export const selectQuoteCount = (state: QuoteStore) => state.quotedTexts.length;
export const selectCanAddMore = (state: QuoteStore) => state.quotedTexts.length < state.maxQuotes;
export const selectIsSelectionMode = (state: QuoteStore) => state.isSelectionMode;
export const selectSelectedIds = (state: QuoteStore) => state.selectedIds;
export const selectSelectedCount = (state: QuoteStore) => state.selectedIds.size;
