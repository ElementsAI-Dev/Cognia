import type { QuoteStoreState } from './types';

export const initialState: QuoteStoreState = {
  quotedTexts: [],
  maxQuotes: 10,
  selectedIds: new Set<string>(),
  isSelectionMode: false,
};
