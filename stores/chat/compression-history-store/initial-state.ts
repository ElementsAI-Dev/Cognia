import type { CompressionHistoryStoreState } from './types';

export const initialState: CompressionHistoryStoreState = {
  entries: [],
};

export const MAX_ENTRIES_PER_SESSION = 5;
export const MAX_TOTAL_ENTRIES = 20;
