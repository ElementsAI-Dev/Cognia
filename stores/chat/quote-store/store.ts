import { create } from 'zustand';
import { initialState } from './initial-state';
import { createMergeExportSlice } from './slices/merge-export.slice';
import { createQuoteListSlice } from './slices/quote-list.slice';
import { createSelectionSlice } from './slices/selection.slice';
import { createUtilitySlice } from './slices/utility.slice';
import type { QuoteStore } from './types';

export const useQuoteStore = create<QuoteStore>((set, get) => ({
  ...initialState,
  ...createQuoteListSlice(set, get),
  ...createSelectionSlice(set, get),
  ...createMergeExportSlice(set, get),
  ...createUtilitySlice(get),
}));
