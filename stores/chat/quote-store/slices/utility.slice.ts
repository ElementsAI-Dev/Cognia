import type { StoreApi } from 'zustand';
import type { QuoteStore, QuoteStoreActions } from '../types';

type QuoteStoreGet = StoreApi<QuoteStore>['getState'];
type UtilitySlice = Pick<QuoteStoreActions, 'getQuoteCount' | 'canAddMore'>;

export const createUtilitySlice = (get: QuoteStoreGet): UtilitySlice => ({
  getQuoteCount: () => get().quotedTexts.length,

  canAddMore: () => {
    const { quotedTexts, maxQuotes } = get();
    return quotedTexts.length < maxQuotes;
  },
});
